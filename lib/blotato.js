/**
 * Blotato API helpers
 * Base URL: https://backend.blotato.com/v2
 * Auth header: blotato-api-key: YOUR_KEY
 */

export const BLOTATO_BASE = 'https://backend.blotato.com/v2';

export const PLATFORMS = ['twitter', 'instagram', 'facebook', 'linkedin'];

/** Build auth headers */
export function blotatoHeaders(apiKey) {
  return {
    'blotato-api-key': apiKey,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch all connected accounts for a platform.
 * Returns items array or throws.
 */
export async function fetchAccounts(apiKey, platform = null) {
  const url = platform
    ? `${BLOTATO_BASE}/users/me/accounts?platform=${platform}`
    : `${BLOTATO_BASE}/users/me/accounts`;
  const res = await fetch(url, { headers: blotatoHeaders(apiKey) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Blotato accounts error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.items || [];
}

/**
 * Fetch subaccounts (pages) for an account.
 * Used for Facebook Pages and LinkedIn Company Pages.
 */
export async function fetchSubaccounts(apiKey, accountId) {
  const url = `${BLOTATO_BASE}/users/me/accounts/${accountId}/subaccounts`;
  const res = await fetch(url, { headers: blotatoHeaders(apiKey) });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

/**
 * Build scheduledTime ISO string from a date (YYYY-MM-DD) and
 * time-of-day (HH:MM, assumed ET — converted to UTC).
 *
 * Approximation: ET is UTC-5 (EST) Nov-Mar, UTC-4 (EDT) Mar-Nov.
 * We use UTC-5 as a safe default (posts go out a little later if EDT).
 */
export function buildScheduledTime(dateStr, timeStr, utcOffsetHours = -5) {
  const [h, m] = timeStr.split(':').map(Number);
  const utcH = h - utcOffsetHours; // ET → UTC
  const utcHClamped = ((utcH % 24) + 24) % 24;
  const carry = utcH >= 24 ? 1 : utcH < 0 ? -1 : 0;

  const base = new Date(dateStr + 'T00:00:00Z');
  base.setUTCDate(base.getUTCDate() + carry);
  base.setUTCHours(utcHClamped, m, 0, 0);
  return base.toISOString();
}

/**
 * Build a Blotato post payload for one platform.
 */
export function buildPostPayload({ accountId, pageId, platform, text, scheduledTime, mediaUrls = [] }) {
  const target = { targetType: platform };
  if (pageId) target.pageId = String(pageId);

  // Filter out empty/falsy URLs
  const cleanMediaUrls = mediaUrls.filter(Boolean);

  const payload = {
    post: {
      accountId: String(accountId),
      content: {
        text,
        mediaUrls: cleanMediaUrls,
        platform,
      },
      target,
    },
  };

  if (scheduledTime) payload.scheduledTime = scheduledTime;

  return payload;
}

/**
 * Delete a scheduled post from Blotato. Returns { ok, error? }.
 */
export async function deletePost(apiKey, postId) {
  try {
    // Blotato uses postSubmissionId — try both /posts/{id} and /post-submissions/{id}
    // DELETE requests must not include Content-Type header (no body)
    const deleteHeaders = { 'blotato-api-key': apiKey };
    const urls = [
      `${BLOTATO_BASE}/posts/${postId}`,
      `${BLOTATO_BASE}/post-submissions/${postId}`,
      `${BLOTATO_BASE}/posts/submissions/${postId}`,
      `${BLOTATO_BASE}/submissions/${postId}`,
    ];
    for (const url of urls) {
      const res = await fetch(url, { method: 'DELETE', headers: deleteHeaders });
      const body = await res.json().catch(() => ({}));
      console.log(`DELETE ${url} → ${res.status}`, JSON.stringify(body).slice(0, 200));
      if (res.ok || res.status === 204) return { ok: true };
      if (res.status === 404 || res.status === 405) continue;
      return { ok: false, error: body?.message || body?.error || `HTTP ${res.status}` };
    }
    return { ok: false, error: 'Post not found on Blotato (may already be deleted)' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Publish one post to Blotato. Returns { ok, postId?, error? }.
 */
export async function publishPost(apiKey, payload) {
  try {
    const res = await fetch(`${BLOTATO_BASE}/posts`, {
      method: 'POST',
      headers: blotatoHeaders(apiKey),
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: body?.message || body?.error || `HTTP ${res.status}` };
    }
    // Blotato returns { postSubmissionId: "..." }
    const postId = body?.postSubmissionId ?? body?.post?.id ?? body?.id ?? body?.data?.id ?? null;
    return { ok: true, postId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
