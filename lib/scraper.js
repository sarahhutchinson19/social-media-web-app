/**
 * Shared article scraping utilities.
 * Mirrors the hero-image extraction logic from innago_direct_social_post_with_images.py
 */

const PLACEHOLDER_PATTERNS = [
  'blog-author', 'blog-authors', '/author/', '/team/', 'headshot',
  'avatar.', 'gravatar', '/logo.', 'logo/', 'favicon', 'placeholder',
  'og-default', 'share-image', 'data:image/', '/icon-', '/icons/',
];

export function isPlaceholderImage(src) {
  if (!src) return true;
  const low = src.toLowerCase();
  if (PLACEHOLDER_PATTERNS.some(p => low.includes(p))) return true;
  if (/[-_]\d{2,3}x\d{2,3}\.(jpg|jpeg|png|webp)/i.test(low)) return true;
  if (low.endsWith('.svg')) return true;
  return false;
}

export function makeAbsolute(url, base = 'https://innago.com') {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://innago.com' + url;
  return url;
}

export function resolveNextJsImage(src) {
  if (!src || !src.includes('/_next/image')) return src;
  const m = src.match(/[?&]url=([^&"'\s]+)/);
  return m ? decodeURIComponent(m[1]) : src;
}

/**
 * Extract the hero image URL from raw HTML.
 * Priority order matches the Python script:
 *   1. Next.js alt="Blog post: …" pattern (most reliable for Innago)
 *   2. /_next/image with /blog-heroes/ in path
 *   3. og:image meta tag
 *   4. twitter:image meta tag
 */
export function extractHeroImage(html, pageUrl) {
  // 1. Next.js blog post alt pattern
  const blogAlt =
    html.match(/alt=["']Blog post:[^"']*["'][^>]*src=["']([^"'>\s]+)["']/is) ||
    html.match(/src=["']([^"'>\s]+)["'][^>]*alt=["']Blog post:[^"']*["']/is);
  if (blogAlt) {
    const abs = makeAbsolute(resolveNextJsImage(blogAlt[1]), pageUrl);
    if (!isPlaceholderImage(abs)) return abs;
  }

  // 2. /_next/image with blog-heroes
  const nextHero = html.match(/src=["']([^"']*\/_next\/image\?[^"']*blog-heroes[^"']*)/i);
  if (nextHero) {
    const abs = makeAbsolute(resolveNextJsImage(nextHero[1]), pageUrl);
    if (!isPlaceholderImage(abs)) return abs;
  }

  // 3. og:image
  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og) {
    const abs = makeAbsolute(og[1], pageUrl);
    if (!isPlaceholderImage(abs)) return abs;
  }

  // 4. twitter:image
  const tw =
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (tw) {
    const abs = makeAbsolute(tw[1], pageUrl);
    if (!isPlaceholderImage(abs)) return abs;
  }

  return '';
}

export function extractTitle(html) {
  const m =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
    html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m
    ? m[1].replace(/ [-|] Innago$/i, '').replace(/&amp;/g, '&').replace(/&#\d+;/g, ' ').trim()
    : '';
}

export function extractSummary(html) {
  const m =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{20,})["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']{20,})["'][^>]+name=["']description["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{20,})["']/i);
  return m ? m[1].replace(/&[^;]+;/g, ' ').trim().slice(0, 500) : '';
}

/** Parse RSS 2.0 XML without external deps */
export function parseRSSFeed(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag) => {
      const r = block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
      return r ? r[1].trim() : '';
    };
    const title = get('title')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"').replace(/&#\d+;/g, ' ').replace(/<[^>]+>/g, '').trim();
    const link = get('link') ||
      (block.match(/<guid[^>]*isPermaLink="true"[^>]*>([\s\S]*?)<\/guid>/i) || [])[1]?.trim() || '';
    const pubDate = get('pubDate');
    const desc = get('description').replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);

    let published = 'Unknown';
    if (pubDate) {
      try {
        const d = new Date(pubDate);
        if (!isNaN(d.getTime())) published = d.toISOString().slice(0, 10);
      } catch {}
    }

    if (link && title && link.includes('innago.com')) {
      items.push({ url: link, title, summary: desc, published, content_type: 'blog post', image_url: '' });
    }
  }
  return items;
}
