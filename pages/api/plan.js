/**
 * POST /api/plan
 *
 * Generates a posting schedule (dates + assigned articles) without generating
 * post copy. The frontend then calls /api/generate-post for each slot.
 *
 * Body: {
 *   startDate: "YYYY-MM-DD",
 *   endDate:   "YYYY-MM-DD",
 *   postsPerWeek: 3 | 4,
 *   selectedCategories: string[] | null,
 *   boosts: [{ label, keywords, startDate?, endDate? }]
 * }
 *
 * Returns: [{ id, date, day, article: { url, category, displayTitle, slug }, boostedTopic }]
 */

import { ALL_ARTICLES, CATEGORIES, pickArticlesForSchedule } from '../../lib/articles';

// Mon=0 Tue=1 Wed=2 Thu=3 Fri=4 Sat=5 Sun=6
const WEEKDAY_MAP = {
  3: [0, 2, 3],       // Mon, Wed, Thu
  4: [0, 1, 2, 3],    // Mon, Tue, Wed, Thu
};

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function dayName(d) {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d.getDay() === 0 ? 6 : d.getDay() - 1];
}

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { startDate, endDate, postsPerWeek = 4, selectedCategories = null, boosts = [] } = req.body;

  const allowedWeekdays = WEEKDAY_MAP[postsPerWeek] || WEEKDAY_MAP[4];

  // Build list of posting dates
  const slots = [];
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const cur = new Date(start);

  while (cur <= end) {
    // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
    // Convert to Mon=0...Sun=6
    const wd = cur.getDay() === 0 ? 6 : cur.getDay() - 1;
    if (allowedWeekdays.includes(wd)) {
      const ds = dateStr(cur);
      // Check if a boost is active
      let boostedTopic = '';
      for (const boost of boosts) {
        const bStart = boost.startDate ? parseDate(boost.startDate) : null;
        const bEnd = boost.endDate ? parseDate(boost.endDate) : null;
        const active =
          (!bStart && !bEnd) ||
          (bStart && bEnd && cur >= bStart && cur <= bEnd);
        if (active) {
          boostedTopic = boost.label;
          break;
        }
      }
      slots.push({ date: ds, day: dayName(cur), boostedTopic });
    }
    cur.setDate(cur.getDate() + 1);
  }

  // Build article pool — for boost slots, prefer matching articles
  const pool = selectedCategories
    ? ALL_ARTICLES.filter((a) => selectedCategories.includes(a.category))
    : ALL_ARTICLES;

  const finalPool = pool.length > 0 ? pool : ALL_ARTICLES;

  // Shuffle pool with a date-seeded hash so the schedule is reproducible
  const seed = startDate + postsPerWeek;
  const shuffled = [...finalPool].sort((a, b) => hashCode(a.url + seed) - hashCode(b.url + seed));

  // Assign articles to slots
  let regularIdx = 0;
  const boostPools = {};

  const schedule = slots.map((slot, i) => {
    let article;

    if (slot.boostedTopic) {
      // Find matching boost config
      const boost = boosts.find((b) => b.label === slot.boostedTopic);
      if (boost && boost.keywords?.length) {
        if (!boostPools[slot.boostedTopic]) {
          boostPools[slot.boostedTopic] = finalPool.filter((a) =>
            boost.keywords.some((kw) =>
              (a.url + ' ' + a.category + ' ' + a.displayTitle).toLowerCase().includes(kw.toLowerCase())
            )
          );
        }
        const bPool = boostPools[slot.boostedTopic];
        if (bPool.length > 0) {
          const bIdx = (boostPools[slot.boostedTopic + '__idx'] || 0) % bPool.length;
          boostPools[slot.boostedTopic + '__idx'] = bIdx + 1;
          article = bPool[bIdx];
        }
      }
    }

    if (!article) {
      article = shuffled[regularIdx % shuffled.length];
      regularIdx++;
    }

    return {
      id: `slot-${i}`,
      ...slot,
      article,
    };
  });

  res.status(200).json(schedule);
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
