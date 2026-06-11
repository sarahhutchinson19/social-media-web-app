/**
 * POST /api/blotato/delete-post
 * Deletes a scheduled post from Blotato so it won't publish.
 *
 * Body: { postId: string, blotatoApiKey?: string }
 * Returns: { ok: boolean, error?: string }
 */
import { deletePost } from '../../../lib/blotato';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { postId, blotatoApiKey } = req.body;
  const apiKey = blotatoApiKey || process.env.BLOTATO_API_KEY;

  if (!apiKey) return res.status(401).json({ ok: false, error: 'No Blotato API key' });
  if (!postId) return res.status(400).json({ ok: false, error: 'postId is required' });

  const result = await deletePost(apiKey, postId);
  res.status(200).json(result);
}
