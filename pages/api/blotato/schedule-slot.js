/**
 * POST /api/blotato/schedule-slot
 *
 * Schedules one post slot to all 4 platforms via Blotato.
 *
 * Body: {
 *   blotatoApiKey?: string,       // if not set as BLOTATO_API_KEY env var
 *   slot: {
 *     date: "YYYY-MM-DD",
 *     post_twitter_x: string,
 *     post_instagram: string,
 *     post_facebook: string,
 *     post_linkedin: string,
 *   },
 *   accountMapping: {
 *     twitter:   { accountId: string },
 *     instagram: { accountId: string },
 *     facebook:  { accountId: string, pageId: string },
 *     linkedin:  { accountId: string, pageId: string },
 *   },
 *   postingTime: "HH:MM",         // time in ET, e.g. "09:00"
 * }
 *
 * Returns: {
 *   twitter:   { ok: boolean, postId?: string, error?: string },
 *   instagram: { ... },
 *   facebook:  { ... },
 *   linkedin:  { ... },
 * }
 */

import { buildScheduledTime, buildPostPayload, publishPost } from '../../../lib/blotato';

// Map our platform keys to Blotato platform slugs
const PLATFORM_SLUG = {
  twitter: 'twitter',
  instagram: 'instagram',
  facebook: 'facebook',
  linkedin: 'linkedin',
};

// Map our platform keys to the post text column
const POST_FIELD = {
  twitter: 'post_twitter_x',
  instagram: 'post_instagram',
  facebook: 'post_facebook',
  linkedin: 'post_linkedin',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { blotatoApiKey, slot, accountMapping, postingTime = '09:00' } = req.body;
  const apiKey = blotatoApiKey || process.env.BLOTATO_API_KEY;

  if (!apiKey) return res.status(401).json({ error: 'No Blotato API key' });
  if (!slot || !accountMapping) return res.status(400).json({ error: 'Missing slot or accountMapping' });

  const scheduledTime = buildScheduledTime(slot.date, postingTime);
  const results = {};
  const imageUrl = slot.image_url || '';

  const platforms = Object.keys(accountMapping).filter(
    (p) => accountMapping[p]?.accountId
  );

  await Promise.all(
    platforms.map(async (platform) => {
      const { accountId, pageId } = accountMapping[platform];
      const postField = POST_FIELD[platform];
      const text = slot[postField];

      if (!text) {
        results[platform] = { ok: false, error: 'No post text' };
        return;
      }

      // Image strategy per platform:
      //   Instagram → always include image (required for posts)
      //   LinkedIn  → include image when available
      //   Facebook  → include image when available
      //   Twitter   → never include image
      const shouldIncludeImage = imageUrl && platform !== 'twitter';
      const mediaUrls = shouldIncludeImage ? [imageUrl] : [];

      const payload = buildPostPayload({
        accountId,
        pageId: pageId || null,
        platform: PLATFORM_SLUG[platform],
        text,
        scheduledTime,
        mediaUrls,
      });

      results[platform] = await publishPost(apiKey, payload);
    })
  );

  res.status(200).json(results);
}
