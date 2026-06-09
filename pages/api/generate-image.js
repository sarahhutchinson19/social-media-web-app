/**
 * POST /api/generate-image
 *
 * Generates a branded 1080×1080 social media image for an article using Claude.
 * Returns HTML that the browser renders as a live preview.
 * Matches the IMAGE_SYSTEM_PROMPT and brand spec from innago_direct_social_post_with_images.py
 *
 * Body: { title, summary, content_type, url }
 * Returns: { html: string, template: string }
 */

import Anthropic from '@anthropic-ai/sdk';

const INNAGO_LOGO_URL =
  'https://res.cloudinary.com/dam3qptkg/image/upload/v1773275475/Innago_White_transparent_2_ww7aro.png';

const IMAGE_SYSTEM_PROMPT = `You write a complete 1080×1080px HTML social media graphic for Innago, a free property management platform.
Return ONLY the raw HTML — a single <div> containing all elements. No DOCTYPE, no <html>, no <head>, no <style> blocks, no markdown fences, no explanations. Inline styles only.

━━━━━━━━━━━  BRAND COLORS  ━━━━━━━━━━━
Primary:   #2676FF  blue  |  #2E3B47  dark navy  |  #ffffff  white
Accents:   #8A47DF  purple  |  #44D7B6  teal  |  #DDF247  lime  |  #F6B42A  amber  |  #FF6D5A  coral
Text:      rgba(255,255,255,0.85) body on dark  |  rgba(255,255,255,0.45) captions
Gradients: linear-gradient(135deg,#2676FF,#8A47DF) — blue-purple hero
           linear-gradient(160deg,#2E3B47 0%,#1a2535 100%) — deep dark

FONT: font-family:'Poppins',sans-serif — weights 300/400/600/700
LOGO: <img src="INNAGO_LOGO" style="height:44px;display:block;" alt="innago"> — top-left or bottom-left always

━━━━━━━━━━━  CANVAS RULES  ━━━━━━━━━━━
- Outer wrapper: width:1080px; height:1080px; position:relative; overflow:hidden
- position:absolute for ALL child elements
- Minimum 72px padding from edges for text
- Headline minimum 72px, maximum 108px. Wrap to 2–3 lines. Fill the card — no dead space.
- Logo and "innago.com" watermark must always appear

━━━━━━━━━━━  SEVEN LAYOUT TEMPLATES — PICK THE BEST ONE  ━━━━━━━━━━━

TEMPLATE A — BOLD GRADIENT HERO (blog posts, general tips)
  Background: linear-gradient(135deg,#2676FF 0%,#8A47DF 100%)
  Top-left: logo
  Center: giant headline Poppins 700 88–108px white, line-height:1.05, 2–3 lines
  One or two accent words in #DDF247 (lime) for visual punch
  Decorative: 2–3 overlapping circles (300–500px) in white opacity 0.06–0.12, positioned off-edges
  Bottom stripe: 6px tall #44D7B6 horizontal bar at very bottom
  Bottom-right: "innago.com" Poppins 300 16px rgba(255,255,255,0.40)

TEMPLATE B — DARK CARD WITH PILL LABEL (definitions, feature posts)
  Background: linear-gradient(160deg,#2E3B47,#1a2535)
  Top-left: logo
  Top-left below logo: pill — background:#8A47DF, Poppins 600 20px white, padding:10px 24px, border-radius:100px
  Headline below pill: Poppins 700 80–96px white, line-height:1.1
  Bottom accent: 4px #44D7B6 horizontal line spanning card width minus 144px margins
  Large decorative circle top-right: #8A47DF 500px opacity 0.15
  Bottom-right: "innago.com" caption

TEMPLATE C — STAT CALLOUT (articles with a key number or percentage)
  Background: #2676FF
  Top-left: logo
  Center: giant stat Poppins 700 160px #DDF247 — THE visual hero, centered at top:240px
  Below stat: 2-line label Poppins 600 30px white
  Below that: one sentence Poppins 400 24px rgba(255,255,255,0.75), max 12 words
  Accent: large circle #8A47DF 650px centered behind stat, opacity 0.15
  Bottom: #44D7B6 6px stripe + "innago.com" caption

TEMPLATE D — QUOTE / TESTIMONIAL CARD (case studies, landlord tips)
  Background: solid #8A47DF
  Top-left: logo
  Giant " mark: Poppins 700 260px #2676FF opacity 0.30, top-right corner, position:absolute
  Quote text: Poppins 400 italic 44–52px white, line-height:1.4, centered horizontally, top:~300px
  Attribution: Poppins 600 22px rgba(255,255,255,0.75), e.g. "— Property Management Tip"
  Two CSS clip-path triangles in #2676FF opacity 0.18 — bottom corners for visual texture
  Bottom-right: "innago.com" caption

TEMPLATE E — SPLIT COLOR BLOCK WITH BULLETS (how-to, numbered lists)
  Top 52%: #2676FF  |  Bottom 48%: #2E3B47
  Logo: top-left in blue zone
  Headline: Poppins 700 80px white, spans the color break, top:~180px, left:72px
  In dark zone: 2–3 short bullets, Poppins 500 26px rgba(255,255,255,0.88), prefixed with #44D7B6 "▸ "
  Right side of dark zone: large abstract circle #8A47DF 380px opacity 0.20
  Bottom-right: "innago.com" caption

TEMPLATE F — GEOMETRIC FEATURE CARD (property management software, tools)
  Background: white (#ffffff)
  Large blue filled rectangle left 60% of card, full height — like a sidebar hero
  Right 40%: white, contains logo (blue version), headline Poppins 700 52px #2E3B47, 3–4 lines
  On the blue zone: giant icon-style shape (house outline or key shape) in white opacity 0.12, ~400px
  Headline in blue zone: Poppins 700 72px white, centered vertically
  Bottom of white zone: "innago.com" Poppins 300 14px #69727A
  Thin #44D7B6 accent line at very bottom full width

TEMPLATE G — BOLD DARK WITH ACCENT WORD (high-energy, eviction/legal topics)
  Background: #2E3B47 with subtle diagonal stripe pattern (repeating linear-gradient 45deg white 1px, transparent 1px, transparent 40px — background-size:56px 56px, opacity:0.04 overlay div)
  Top-left: logo (white version)
  Headline: Poppins 700 88px white, left-aligned, top:180px — 2 lines max
  One key word or phrase on its own line in #DDF247 (lime), same size — creates bold contrast
  Right side: large rounded rectangle shape (border-radius:40px) in #2676FF opacity 0.25, 420×520px, right:-60px, top:80px
  Inside that shape: Poppins 300 22px rgba(255,255,255,0.50) — 3–4 word category label, centered
  Bottom: #F6B42A 6px stripe + "innago.com" caption

━━━━━━━━━━━  TEMPLATE SELECTION  ━━━━━━━━━━━
C → article has a clear stat/number
D → case study or summary has a quote
B → definition or clear single-category topic
E → list / how-to (title has numbers or "tips")
F → property management software / tools topic
G → eviction, legal, or high-stakes topic
A → default for general blog posts

━━━━━━━━━━━  QUALITY RULES  ━━━━━━━━━━━
1. Headline minimum 72px. Fill the card — no large empty zones.
2. Sentence case only (no ALL CAPS headlines).
3. Rewrite the title for visual punch — don't just copy it.
4. Max 6 words per headline line. Break at natural phrase boundaries.
5. Logo (INNAGO_LOGO) must always appear.
6. "innago.com" watermark always in bottom area, small, low opacity.
7. Use decorative shapes — circles, rectangles, triangles — to add visual depth. Not word-only.
8. No external images except the logo.`;

function extractStat(title, summary) {
  const text = `${title} ${summary}`;
  const m = text.match(
    /(\$[\d,]+\+?|[\d,]+\+?\s*(?:units?|properties|landlords?|hours?|days?|months?)|[\d]+\.?[\d]*\s*(?:x|%)|[\d,]+%)/i
  );
  return m ? m[0] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { title, summary = '', content_type = 'blog post', url = '', anthropicKey } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  // Choose template hint
  const stat = extractStat(title, summary);
  let templateHint = '';
  if (stat) {
    templateHint = `Prefer TEMPLATE C. Stat to feature: ${stat}`;
  } else if (content_type === 'case study') {
    templateHint = 'Prefer TEMPLATE D. Use summary for a quote if available.';
  } else if (content_type === 'definition') {
    templateHint = 'Prefer TEMPLATE B.';
  } else if (/\b(tips?|steps?|ways?|mistakes?|\d+\s)/i.test(title)) {
    templateHint = 'Prefer TEMPLATE E.';
  } else if (/software|tool|platform|app|feature|checklist/i.test(title)) {
    templateHint = 'Prefer TEMPLATE F.';
  } else if (/evict|legal|notice|court|squatter|law|rights/i.test(title)) {
    templateHint = 'Prefer TEMPLATE G.';
  } else {
    templateHint = 'Prefer TEMPLATE A.';
  }

  const userPrompt = `Article title: ${title}
Content type: ${content_type}
Summary: ${summary.slice(0, 400)}

${templateHint}

The logo src attribute must be exactly: INNAGO_LOGO
Render it as: <img src="INNAGO_LOGO" style="height:44px;display:block;" alt="innago">

Return ONLY the raw HTML <div>. No DOCTYPE, no <html>, no <head>, no fences.`;

  try {
    const client = new Anthropic({ apiKey: anthropicKey || process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      system: IMAGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let html = msg.content[0].text.trim();
    // Strip any accidental markdown fences
    html = html.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    // Inject actual logo URL
    html = html.replace(/INNAGO_LOGO/g, INNAGO_LOGO_URL);

    // Wrap in a full HTML document for iframe rendering
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{width:1080px;height:1080px;overflow:hidden;font-family:'Poppins',sans-serif;-webkit-font-smoothing:antialiased;}
</style>
</head>
<body>${html}</body>
</html>`;

    // Detect which template was used
    const templateMatch = html.match(/TEMPLATE\s+([A-E])/i);
    const template = templateMatch ? templateMatch[1].toUpperCase() : 'A';

    res.status(200).json({ html: fullHtml, template });
  } catch (err) {
    console.error('Image generation error:', err);
    res.status(500).json({ error: 'Failed to generate image', detail: err.message });
  }
}

export const config = { api: { bodyParser: true } };
