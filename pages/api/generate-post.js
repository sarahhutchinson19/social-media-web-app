/**
 * POST /api/generate-post
 *
 * Generates platform-specific social media posts for a single article.
 * Each platform gets a genuinely different post tailored to its audience,
 * tone, and character limits. Matches the Python script's brand voice exactly.
 *
 * Platform specs:
 *   Twitter/X   — ≤240 chars before URL (URL adds ~23 chars = 280 total). One sentence.
 *   LinkedIn    — 1-3 sentences. Professional authority voice.
 *   Facebook    — 1-2 sentences. Conversational, community feel.
 *   Instagram   — 1-2 sentences. Visual-first hook, warmer tone.
 *
 * Body: { url, displayTitle, date, boostedTopic?, anthropicKey? }
 * Returns: { title, image_url, post, post_linkedin, post_facebook, post_twitter_x, post_instagram }
 */

import Anthropic from '@anthropic-ai/sdk';

// ── Shared brand voice rules ──────────────────────────────────
const BRAND_RULES = `
VOICE: Conversational and direct, like a knowledgeable peer who has done this a thousand times. Never corporate, never fluffy. Short sentences. No jargon.

PURPOSE: Position Innago as the knowledgeable authority in the rental property industry. The voice is someone who has watched thousands of landlords navigate this and knows where the costly mistakes hide. Not a summarizer — a peer with the experience to know why this matters.

HOOK PATTERNS (use one per post, vary across platforms):
1. Tension/contrast: "Most landlords think X. The reality is Y."
2. Common mistake: "The mistake most landlords make on X costs them Y."
3. Insider knowledge: Reveal what separates experienced operators from amateurs.
4. Cost of getting it wrong: Quantify the downside of the default approach.
5. Authority + context: Give context that makes the reader realize they need to know more.

COMPLETE STORY RULE: Give the full picture in plain language. The article handles complexity.
CORRECT: "Years of depreciation deductions lower your tax bill while you own a property. When you sell, the IRS comes back for that money. Here's how it works and what you can do about it."
WRONG: "Most landlords don't realize what selling costs them. Find out why."

NEVER USE in any post:
- Rhetorical questions (no "Did you know...?", "Ever wonder...?")
- Em dashes or dashes as sentence connectors
- "Not only... but also" and variants
- "Whether you're X or Y" setups
- "From X to Y" constructions
- Paired adjective stacking ("clear, actionable")
- Words: crucial, essential, vital, navigate, landscape, leverage, streamline, dive into, delve
- Mentioning Innago by name in the post body
- Hashtags or emojis
- Exclamation points`;

// ── Multi-platform system prompt ──────────────────────────────
const SYSTEM_PROMPT = `You write platform-specific social media posts for Innago, a free property management platform for independent landlords.
${BRAND_RULES}

PLATFORM-SPECIFIC RULES:
  twitter:   HARD LIMIT — text before the URL must be 240 characters or fewer (URL takes ~23 chars for a total of 280). One sentence only. Be ruthlessly concise. Every word must earn its place.
  linkedin:  1-3 sentences before the URL. Professional authority voice. B2B landlord audience. Can include more context than other platforms.
  facebook:  1-2 sentences before the URL. Conversational and warm. Community feel. Slightly less formal than LinkedIn.
  instagram: 1-2 sentences before the URL. Visual-first hook — the opening words must grab immediately since users are scrolling fast. Warmer and more punchy than LinkedIn.

Each platform's post must be genuinely different — different hook, different angle, different length. Not the same sentence reworded.

OUTPUT FORMAT: Return ONLY valid JSON with exactly these 4 keys. No explanation, no markdown fences:
{"twitter":"<post text including bare URL at end>","linkedin":"<post text including bare URL at end>","facebook":"<post text including bare URL at end>","instagram":"<post text including bare URL at end>"}`;

// ── UTM tagging ───────────────────────────────────────────────
function tagUrl(baseUrl, platform, date) {
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}utm_medium=Organic+Social&utm_source=${platform}&utm_campaign=${date}`;
}

function injectUtm(post, originalUrl, platform, date) {
  return post.replace(originalUrl, tagUrl(originalUrl, platform, date));
}

// ── TinyURL shortener for Twitter ─────────────────────────────
async function shortenUrl(longUrl) {
  try {
    const res = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const text = await res.text();
      if (text.trim().startsWith('https://')) return text.trim();
    }
  } catch {}
  return longUrl;
}

// ── Hero image extraction ─────────────────────────────────────
function extractHeroImage(html, pageUrl) {
  const makeAbs = (u) => {
    if (!u) return '';
    if (u.startsWith('http')) return u;
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('/')) return 'https://innago.com' + u;
    return u;
  };
  const isPlaceholder = (u) => {
    if (!u) return true;
    const l = u.toLowerCase();
    return ['blog-author', '/author/', 'headshot', 'avatar', 'gravatar', '/logo.', 'favicon',
      'placeholder', 'og-default', 'data:image/'].some(p => l.includes(p)) ||
      /[-_]\d{2,3}x\d{2,3}\.(jpg|jpeg|png|webp)/i.test(l) || l.endsWith('.svg');
  };
  const resolve = (src) => {
    if (!src || !src.includes('/_next/image')) return src;
    const m = src.match(/[?&]url=([^&"'\s]+)/);
    return m ? decodeURIComponent(m[1]) : src;
  };

  const blogAlt = html.match(/alt=["']Blog post:[^"']*["'][^>]*src=["']([^"'>\s]+)["']/is) ||
                  html.match(/src=["']([^"'>\s]+)["'][^>]*alt=["']Blog post:[^"']*["']/is);
  if (blogAlt) { const a = makeAbs(resolve(blogAlt[1])); if (!isPlaceholder(a)) return a; }

  const nh = html.match(/src=["']([^"']*\/_next\/image\?[^"']*blog-heroes[^"']*)/i);
  if (nh) { const a = makeAbs(resolve(nh[1])); if (!isPlaceholder(a)) return a; }

  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
             html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og) { const a = makeAbs(og[1]); if (!isPlaceholder(a)) return a; }

  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
             html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (tw) { const a = makeAbs(tw[1]); if (!isPlaceholder(a)) return a; }

  return '';
}

// ── Article meta fetcher ──────────────────────────────────────
async function fetchArticleMeta(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const titleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const decodeEntities = (str) => str
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    const title = titleMatch
      ? decodeEntities(titleMatch[1].replace(/ [-|] Innago$/i, '').trim())
      : null;

    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const summary = descMatch ? decodeEntities(descMatch[1].trim()) : '';

    return { title, summary, image_url: extractHeroImage(html, url) };
  } catch {
    return null;
  }
}

// ── Twitter character check + retry ──────────────────────────
function twitterTextLength(post, url) {
  // Text before the URL (URL itself counts as ~23 chars on Twitter)
  const idx = post.lastIndexOf(url);
  return idx >= 0 ? post.slice(0, idx).trimEnd().length : post.length;
}

async function shortenTwitterPost(client, overPost, url, title, summary, boostedTopic) {
  const charsBefore = twitterTextLength(overPost, url);
  const prompt = `This Twitter/X post is ${charsBefore} characters before the URL but must be 240 or fewer. Rewrite it to fit.

Current post: ${overPost}

Article: ${title}
URL: ${url}

Rules: One sentence only. Keep the URL at the end. Stay under 240 chars before the URL. Keep Innago brand voice (no rhetorical questions, no em dashes, no hashtags, no exclamation points). Return ONLY the rewritten post text.`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content[0].text.trim();
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url, displayTitle, date, boostedTopic, anthropicKey } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  // Fetch article metadata
  const meta = await fetchArticleMeta(url);
  const title = meta?.title || displayTitle || url;
  const summary = meta?.summary || '';
  const image_url = meta?.image_url || '';

  const userPrompt = `Generate 4 platform-specific social media posts for this Innago article:

Title: ${title}
URL: ${url}
Summary: ${summary}

Include the URL exactly (${url}) at the end of each post.
Only reference data or stats from 2025 or 2026. Ignore older figures.
Do not write about password resets, account creation, or login pages.${boostedTopic ? `\n\nThis is part of a focused push on "${boostedTopic}" — frame each post accordingly.` : ''}

Remember: twitter must be 240 chars or fewer BEFORE the URL. Write each platform's post differently.`;

  const client = new Anthropic({ apiKey: anthropicKey || process.env.ANTHROPIC_API_KEY });

  let posts;
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = msg.content[0].text.trim()
      .replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    posts = JSON.parse(raw);
  } catch (err) {
    console.error('Claude API error:', err);
    return res.status(500).json({ error: 'Failed to generate post', detail: err.message });
  }

  // Validate Twitter length — auto-retry once if over limit
  let twitterPost = posts.twitter || '';
  if (twitterTextLength(twitterPost, url) > 240) {
    try {
      twitterPost = await shortenTwitterPost(client, twitterPost, url, title, summary, boostedTopic);
    } catch {
      // Keep original if retry fails — the char count warning in the UI will flag it
    }
  }

  // Build UTM-tagged versions
  // Twitter: replace bare URL with TinyURL-shortened UTM link
  const twitterTaggedUrl = tagUrl(url, 'twitter', date);
  const twitterShortUrl = await shortenUrl(twitterTaggedUrl);
  const post_twitter_x = twitterPost.replace(url, twitterShortUrl);

  // Other platforms: standard UTM injection
  const post_linkedin  = injectUtm(posts.linkedin  || posts.twitter || twitterPost, url, 'linkedin',  date);
  const post_facebook  = injectUtm(posts.facebook  || posts.linkedin || '', url, 'facebook',  date);
  const post_instagram = injectUtm(posts.instagram || posts.linkedin || '', url, 'instagram', date);

  // Universal fallback = LinkedIn version (most complete)
  const post = posts.linkedin || twitterPost;

  res.status(200).json({
    title,
    image_url,
    post,
    post_linkedin,
    post_facebook,
    post_twitter_x,
    post_instagram,
  });
}

export const config = { api: { bodyParser: true } };
