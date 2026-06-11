/**
 * POST /api/blotato/delete-post
 *
 * Deletes a scheduled post from Blotato so it won't publish.
 * Strategy:
 *   1. If postId is known → DELETE /v2/posts/{postId} directly
 *   2. If no postId → GET /v2/posts (scheduled), match by scheduledTime + accountId, then delete
 *
 * Body: { postId?, blotatoApiKey?, scheduledTime?, accountId?, platform? }
 * Returns: { ok: boolean, error?: string, deletedId?: string }
 */

import { BLOTATO_BASE, blotatoHeaders, deletePost } from '../../../lib/blotato';

async function fetchScheduledPosts(apiKey) {
  try {
    // Try common Blotato list endpoints
    const endpoints = [
      `${BLOTATO_BASE}/posts?status=scheduled`,
      `${BLOTATO_BASE}/posts?status=pending`,
      `${BLOTATO_BASE}/posts`,
      `${BLOTATO_BASE}/scheduled-posts`,
    ];
    for (const url of endpoints) {
      const res = await fetch(url, { headers: blotatoHeaders(apiKey), signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const items = data?.items || data?.posts || data?.data || (Array.isArray(data) ? data : null);
        if (items) {
          console.log(`Blotato posts from ${url}:`, JSON.stringify(items).slice(0, 400));
          return items;
        }
      }
    }
  } catch (e) {
    console.error('fetchScheduledPosts error:', e.message);
  }
  return [];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { postId, blotatoApiKey, scheduledTime, accountId, platform } = req.body;
  const apiKey = blotatoApiKey || process.env.BLOTATO_API_KEY;

  if (!apiKey) return res.status(401).json({ ok: false, error: 'No Blotato API key' });

  // Strategy 1: direct delete by postId
  if (postId) {
    const result = await deletePost(apiKey, postId);
    return res.status(200).json({ ...result, deletedId: postId });
  }

  // Strategy 2: find post by matching scheduledTime + accountId, then delete
  if (scheduledTime) {
    const posts = await fetchScheduledPosts(apiKey);
    // Match within 5 minutes of the scheduled time, on the right account
    const targetMs = new Date(scheduledTime).getTime();
    const match = posts.find(p => {
      const pTime = p.scheduledTime || p.scheduled_time || p.scheduledAt || p.post?.scheduledTime;
      const pAcct = p.accountId || p.account_id || p.post?.accountId;
      if (!pTime) return false;
      const diff = Math.abs(new Date(pTime).getTime() - targetMs);
      const timeMatch = diff < 5 * 60 * 1000; // within 5 min
      const acctMatch = !accountId || pAcct === accountId || String(pAcct) === String(accountId);
      return timeMatch && acctMatch;
    });

    if (match) {
      const matchId = match.id || match.postId || match.post?.id;
      if (matchId) {
        const result = await deletePost(apiKey, matchId);
        return res.status(200).json({ ...result, deletedId: matchId });
      }
    }

    // Log what we found so we can debug
    console.log('Could not match post. scheduledTime:', scheduledTime, 'accountId:', accountId,
      'posts found:', posts.length, 'sample:', JSON.stringify(posts[0] || {}).slice(0, 300));
    return res.status(200).json({ ok: false, error: 'Could not find matching post in Blotato. It may have already been deleted or the scheduled time did not match.' });
  }

  return res.status(400).json({ ok: false, error: 'postId or scheduledTime required' });
}
