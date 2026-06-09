/**
 * GET /api/blotato/accounts
 *
 * Fetches all connected Blotato accounts + subaccounts for
 * Facebook and LinkedIn (to get pageIds).
 *
 * Auth: Pass blotato-api-key in request header, OR set BLOTATO_API_KEY env var.
 *
 * Returns: {
 *   accounts: {
 *     twitter:   [{ accountId, username, fullname }],
 *     instagram: [{ accountId, username, fullname }],
 *     facebook:  [{ accountId, username, fullname, pages: [{ pageId, name }] }],
 *     linkedin:  [{ accountId, username, fullname, pages: [{ pageId, name }] }],
 *   }
 * }
 */

import { fetchAccounts, fetchSubaccounts, PLATFORMS } from '../../../lib/blotato';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const apiKey = req.headers['blotato-api-key'] || process.env.BLOTATO_API_KEY;
  if (!apiKey) return res.status(401).json({ error: 'No Blotato API key provided' });

  const result = { twitter: [], instagram: [], facebook: [], linkedin: [] };

  for (const platform of PLATFORMS) {
    try {
      const items = await fetchAccounts(apiKey, platform);

      for (const item of items) {
        const acct = {
          accountId: item.id,
          username: item.username,
          fullname: item.fullname,
          pages: [],
        };

        // Facebook + LinkedIn need subaccounts for pageId
        if (platform === 'facebook' || platform === 'linkedin') {
          const subs = await fetchSubaccounts(apiKey, item.id);
          acct.pages = subs.map((s) => ({ pageId: s.id, name: s.name }));
        }

        result[platform].push(acct);
      }
    } catch (err) {
      console.error(`Error fetching ${platform} accounts:`, err.message);
      // Continue — one platform error shouldn't block others
    }
  }

  res.status(200).json({ accounts: result });
}
