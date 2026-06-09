/**
 * GET /api/scrape-articles
 *
 * Scrapes fresh articles from innago.com.
 * Strategy (matches Python script):
 *   1. RSS feed  →  enrich each article with hero image
 *   2. Sitemap   →  enrich
 *   3. Empty []  →  client falls back to static seed list
 *
 * Returns: { articles: [...], source: 'rss' | 'sitemap' | 'failed' }
 */

import { parseRSSFeed, extractHeroImage, extractTitle, extractSummary } from '../../lib/scraper';

const RSS_URL      = 'https://innago.com/feed/';
const SITEMAP_URL  = 'https://innago.com/post-sitemap.xml';

const EXCLUDE = [
  '/privacy', '/terms', '/legal', '/login', '/logout', '/signup',
  '/password', '/cookie', '/sitemap', '/tag/', '/author/', '/page/',
  '/category/', '/definitions', '/features', '/pricing', '/support',
];

function isValidUrl(url) {
  const low = url.toLowerCase();
  if (!low.includes('innago.com')) return false;
  if (EXCLUDE.some(f => low.includes(f))) return false;
  // Must be a single-segment slug at innago.com/{slug}/
  try {
    const path = new URL(url).pathname.replace(/\/$/, '');
    if (path.split('/').filter(Boolean).length !== 1) return false;
  } catch { return false; }
  return true;
}

async function safeFetch(url, timeout = 8000) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return null;
    return res.text();
  } catch { return null; }
}

async function enrichArticle(article) {
  const html = await safeFetch(article.url, 6000);
  if (!html) return article;
  return {
    ...article,
    title:     extractTitle(html)   || article.title,
    summary:   extractSummary(html) || article.summary,
    image_url: extractHeroImage(html, article.url),
  };
}

async function enrichBatch(articles, batchSize = 5) {
  const out = [];
  for (let i = 0; i < articles.length; i += batchSize) {
    const results = await Promise.all(articles.slice(i, i + batchSize).map(enrichArticle));
    out.push(...results);
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const max = Math.min(parseInt(req.query.max || '40'), 80);

  // ── Strategy 1: RSS feed ────────────────────────────────────
  const rssXml = await safeFetch(RSS_URL, 12000);
  if (rssXml) {
    const parsed = parseRSSFeed(rssXml)
      .filter(a => isValidUrl(a.url))
      .slice(0, max);
    if (parsed.length > 0) {
      const enriched = await enrichBatch(parsed);
      return res.status(200).json({ articles: enriched, source: 'rss', count: enriched.length });
    }
  }

  // ── Strategy 2: post sitemap ────────────────────────────────
  const sitemapXml = await safeFetch(SITEMAP_URL, 12000);
  if (sitemapXml) {
    const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
      .map(m => m[1].trim())
      .filter(isValidUrl)
      .slice(0, max);
    if (urls.length > 0) {
      const stubs = urls.map(url => ({
        url, title: '', summary: '', published: 'Unknown',
        content_type: 'blog post', image_url: '',
      }));
      const enriched = await enrichBatch(stubs);
      return res.status(200).json({ articles: enriched, source: 'sitemap', count: enriched.length });
    }
  }

  // ── Fallback: tell client to use static seed list ────────────
  return res.status(200).json({ articles: [], source: 'failed', count: 0 });
}
