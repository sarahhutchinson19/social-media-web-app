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

const IMAGE_SYSTEM_PROMPT = `You write a complete 1080×1080px HTML social media graphic for Innago.
Return ONLY the raw HTML — a single <div> containing all elements. No DOCTYPE, no <html>,
no <head>, no <style> blocks, no markdown fences, no explanations. Inline styles only.

━━━━━━━━━━━  BRAND TOKENS  ━━━━━━━━━━━
COLORS (use ONLY these):
  #2676FF  Primary blue        — hero backgrounds, CTAs, stat numbers
  #8A47DF  Purple              — accent blobs, pill labels, quote marks
  #2E3B47  Dark navy           — dark backgrounds, text on light
  #44D7B6  Teal / mint         — highlight pills, secondary accents
  #DDF247  Lime yellow         — bold accent words on dark backgrounds
  #F6B42A  Amber               — star ratings, warm highlights
  #ffffff  White               — all body text, logo tint
  rgba(255,255,255,0.70)  — secondary body text
  rgba(255,255,255,0.40)  — captions, watermarks

FONT: font-family:'Poppins',sans-serif  (already embedded — always use this exactly)
  font-weight:700  Headlines, stat numbers, bold words
  font-weight:600  Subheadings, pill labels, CTA text
  font-weight:400  Body text, quotes
  font-weight:300  Captions, footnotes

LOGO: always render as:
  <img src="INNAGO_LOGO" style="height:44px;display:block;" alt="innago">
  Place at top-left OR bottom-left. Never stretch or recolor.

━━━━━━━━━━━  CANVAS RULES  ━━━━━━━━━━━
- Outer wrapper: width:1080px; height:1080px; position:relative; overflow:hidden
- Use position:absolute for ALL child elements. No flexbox/grid on the root.
- Padding from edges: minimum 72px on all sides for text content
- TEXT MUST FILL THE CARD: headline font-size minimum 72px, maximum 108px.
  Use line-height:1.1. Wrap to 2–3 lines. Never let large whitespace dominate.
- No external images except the logo.

━━━━━━━━━━━  FIVE LAYOUT TEMPLATES — PICK ONE  ━━━━━━━━━━━

TEMPLATE A — BOLD FULL-BLEED TEXT (best for blog/tips)
  Background: solid #2676FF
  Top-left: logo (height 44px)
  Center: giant headline, Poppins 700, 88–108px, white, line-height:1.05
          takes up ~70% of card height — text IS the visual
  Bottom-right: "innago.com" Poppins 300 18px rgba(255,255,255,0.40)
  Accents: one #8A47DF circle blob top-right (400px, opacity:0.25, position:absolute)
           one smaller #8A47DF circle bottom-left (200px, opacity:0.15)

TEMPLATE B — PILL LABEL + HEADLINE (best for feature/definition posts)
  Background: solid #2E3B47
  Top-left: logo
  Below logo (top:140px): pill label — rounded rectangle, background:#8A47DF,
    Poppins 600 22px white, padding:12px 28px, border-radius:100px
    Text = article category / topic keyword (1–3 words)
  Below pill: headline Poppins 700 80–96px white, line-height:1.1, 2–3 lines
  Bottom: thin #44D7B6 horizontal line (4px tall, left:72px, right:72px)
  Bottom-right: "innago.com" caption
  Accent: #8A47DF blob top-right, opacity 0.20

TEMPLATE C — STAT CALLOUT (use when article has a percentage or number)
  Background: solid #2676FF
  Top-left: logo
  Giant stat: Poppins 700 160px #DDF247 (lime), centered, top:260px — this is THE hero
  Below stat: short label Poppins 600 32px white
  Below label: one sentence context Poppins 400 26px rgba(255,255,255,0.75), max 10 words
  Bottom-right: "innago.com" caption
  Accent: large #8A47DF circle centered behind stat (600px, opacity:0.18)

TEMPLATE D — QUOTE CARD (best for testimonials / case studies)
  Background: solid #8A47DF  (purple is the hero color here)
  Top-left: logo
  Top-right area: giant quotation mark " " — Poppins 700 220px #2676FF, opacity:0.35
  Center: quote text Poppins 400 italic 44–52px white, line-height:1.35, max 3 lines
           Use real excerpt from summary if available; else derive from title
  Below quote: attribution — Poppins 600 24px rgba(255,255,255,0.80), e.g. "— LANDLORD TIP"
  Bottom-right: "innago.com" caption

TEMPLATE E — SPLIT COLOR BLOCK (best for how-to / list articles)
  Background: top 55% = #2676FF, bottom 45% = #2E3B47 (two stacked divs)
  Logo: top-left on blue section
  Headline: Poppins 700 80px white, positioned to span across the color break, top:~200px
  Bottom section: 2–3 short bullet points, Poppins 500 28px rgba(255,255,255,0.85), #44D7B6 "• " prefix
  Bottom-right: "innago.com" caption

━━━━━━━━━━━  SELECTION RULES  ━━━━━━━━━━━
- TEMPLATE C if the article has a clear stat/percentage
- TEMPLATE D if content_type is "case study" or summary contains a quote
- TEMPLATE B if content_type is "definition" or has a clear category keyword
- TEMPLATE E if article is a list / how-to (title contains numbers or "tips")
- TEMPLATE A as default for all other blog posts

━━━━━━━━━━━  CRITICAL QUALITY RULES  ━━━━━━━━━━━
1. HEADLINE TEXT MUST BE LARGE. Minimum 72px. If the text looks small, make it bigger.
2. Text must fill the card. No large empty areas.
3. Never use ALL CAPS — sentence case only.
4. Headline is a rewrite of the title for visual punch — not a copy of the title.
5. Headline max 6 words per line. Break into 2–3 lines.
6. The logo must always be present at src="INNAGO_LOGO". Never omit it.
7. "innago.com" watermark always present, bottom area, small, low opacity.
8. No external images other than the logo.`;

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
