import { useState, useRef, useEffect } from 'react';
import { CATEGORIES, ALL_ARTICLES } from '../lib/articles';

// ── Design tokens ─────────────────────────────────────────────
const BLUE = '#2676FF';
const BLUE_BG = '#EFF4FF';
const BG = '#F7F9FF';
const BORDER = '#DDE3F0';
const TEXT = '#1a2340';
const MUTED = '#6b7280';
const GREEN = '#16a34a';
const RED = '#dc2626';
const YELLOW = '#ca8a04';

const PLATFORM_LABELS = { twitter: 'Twitter/X', instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn' };
const PLATFORM_COLORS = { twitter: '#000', instagram: '#E1306C', facebook: '#1877F2', linkedin: '#0A66C2' };
const POST_FIELD = { twitter: 'post_twitter_x', instagram: 'post_instagram', facebook: 'post_facebook', linkedin: 'post_linkedin' };
const CHAR_LIMITS = { twitter: 280, instagram: 2200, facebook: 63206, linkedin: 3000, universal: null };
const PLATFORMS_LIST = ['linkedin', 'twitter', 'instagram', 'facebook'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_OPTIONS = [
  '06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30',
  '14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00',
];

function today() { return new Date().toISOString().slice(0, 10); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }

// ── Calendar helpers ──────────────────────────────────────────
function getMonthGrid(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const y = d.getFullYear(), m = d.getMonth();
  const firstWd = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = Array(firstWd).fill(null);
  for (let i = 1; i <= daysInMonth; i++)
    cells.push(`${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`);
  return cells;
}
function getWeekDates(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return Array.from({length:7}, () => { const s = d.toISOString().slice(0,10); d.setDate(d.getDate()+1); return s; });
}
function shiftMonth(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00'); d.setMonth(d.getMonth() + n); d.setDate(1);
  return d.toISOString().slice(0,10);
}
function monthLabel(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleString('default', { month:'long', year:'numeric' });
}
function weekLabel(dateStr) {
  const days = getWeekDates(dateStr);
  const s = new Date(days[0]+'T00:00:00'), e = new Date(days[6]+'T00:00:00');
  return `${s.toLocaleString('default',{month:'short',day:'numeric'})} – ${e.toLocaleString('default',{month:'short',day:'numeric',year:'numeric'})}`;
}
function dayNameFromStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][d.getDay()===0?6:d.getDay()-1];
}
function shortDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_NAMES[d.getDay()===0?6:d.getDay()-1];
}
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2,'0')} ${period}`;
}
/** Best display label for a slot — topic override > single category > first of multi > first article > fallback */
function slotLabel(slot) {
  if (slot.topicOverride) return slot.topicOverride;
  if (slot.category)      return slot.category;
  if (slot.categories && slot.categories.length > 0 && slot.categories.length < Object.keys(CATEGORIES).length)
    return slot.categories.length === 1 ? slot.categories[0] : slot.categories[0];
  if (slot.articleUrl) {
    const slug = slot.articleUrl.replace(/^https?:\/\/innago\.com\//, '').replace(/\/$/, '');
    return slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).slice(0,30);
  }
  return 'Innago Post';
}

/** ISO week key — e.g. "2026-W23" — used for per-week image assignment */
function isoWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const week = Math.floor((d - weekStart) / (7 * 864e5)) + 1;
  return `${d.getFullYear()}-W${week}`;
}
let _uid = 0;
function uid() { return `slot-${Date.now()}-${++_uid}`; }

// ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab] = useState('config');

  // ── Custom slot builder ──────────────────────
  // A slot: { id, date, time, platforms: string[], category: string, topicOverride: string, articleUrl: string }
  const [customSlots, setCustomSlots] = useState([]);
  const [slotForm, setSlotForm] = useState({
    date: today(), time: '09:00', platforms: ['linkedin'], category: '', topicOverride: '', articleUrl: '',
  });
  const [recurForm, setRecurForm] = useState({
    startDate: today(), endDate: addDays(today(), 27),
    time: '11:00', days: [0,2,3],
    platforms: ['linkedin','twitter','facebook','instagram'],
    categories: Object.keys(CATEGORIES), // all selected by default
    articleUrl: '',
  });
  // ── Slot list filters ────────────────────────
  const [slotFilterFrom, setSlotFilterFrom] = useState('');
  const [slotFilterTo, setSlotFilterTo] = useState('');
  const [openCategory, setOpenCategory] = useState(null);
  const [scheduleView, setScheduleView] = useState('calendar');
  const [clearPostsConfirm, setClearPostsConfirm] = useState(false);
  const [calendarMode, setCalendarMode] = useState('month');
  const [calendarFocus, setCalendarFocus] = useState(today);
  const [highlightedSlotId, setHighlightedSlotId] = useState(null);

  // ── Live article library ─────────────────────
  const [scrapedArticles, setScrapedArticles] = useState([]);  // from /api/scrape-articles
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scrapeSource, setScrapeSource] = useState('');        // 'rss' | 'sitemap' | 'seed'

  // ── Generated images (per slot) ─────────────
  const [generatedImages, setGeneratedImages] = useState({});  // slotId → { html, loading }

  // ── Anthropic API key (entered in UI) ────────
  // API keys — initialized empty, loaded from localStorage after mount (Next.js SSR safe)
  const [anthropicKey, setAnthropicKey] = useState('');
  const [bitlyKey, setBitlyKey] = useState('');
  const [blotatoKey, setBlotatoKey] = useState('');

  // Load all persisted data from localStorage after mount
  useEffect(() => {
    try {
      const ak   = localStorage.getItem('innago-anthropic-key');
      const bitk = localStorage.getItem('innago-bitly-key');
      const blk  = localStorage.getItem('innago-blotato-key');
      const slots    = localStorage.getItem('innago-custom-slots');
      const sched    = localStorage.getItem('innago-schedule');
      const postsStr = localStorage.getItem('innago-posts');
      const statStr  = localStorage.getItem('innago-schedule-status');
      if (ak)       setAnthropicKey(ak);
      if (bitk)     setBitlyKey(bitk);
      if (blk)      setBlotatoKey(blk);
      const acctMap = localStorage.getItem('innago-account-mapping');
      if (slots)    { try { setCustomSlots(JSON.parse(slots));         } catch {} }
      if (sched)    { try { setSchedule(JSON.parse(sched));             } catch {} }
      if (postsStr) { try { setPosts(JSON.parse(postsStr));             } catch {} }
      if (statStr)  { try { setScheduleStatus(JSON.parse(statStr));     } catch {} }
      if (acctMap)  { try { setAccountMapping(JSON.parse(acctMap));     } catch {} }
    } catch {}
  }, []);

  const saveAnthropicKey = (key) => { setAnthropicKey(key); try { localStorage.setItem('innago-anthropic-key', key); } catch {} };
  const saveBitlyKey     = (key) => { setBitlyKey(key);     try { localStorage.setItem('innago-bitly-key', key);     } catch {} };
  const saveBlotatoKey   = (key) => { setBlotatoKey(key);   try { localStorage.setItem('innago-blotato-key', key);   } catch {} };
  const [accounts, setAccounts] = useState(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState('');
  const [accountMapping, setAccountMapping] = useState({
    twitter:   { accountId: '', pageId: '' },
    instagram: { accountId: '', pageId: '' },
    facebook:  { accountId: '', pageId: '' },
    linkedin:  { accountId: '', pageId: '' },
  });
  const [autoSchedule, setAutoSchedule] = useState(false);

  // ── Generation + review state ────────────────
  const [schedule, setSchedule] = useState(null);
  const [posts, setPosts] = useState({});
  const [scheduleStatus, setScheduleStatus] = useState({});
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [activePlatform, setActivePlatform] = useState('linkedin');
  const [editingKey, setEditingKey] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const abortRef = useRef(false);

  // ── Derived ──────────────────────────────────
  const doneCount = Object.keys(posts).length;
  const scheduledCount = Object.values(scheduleStatus).filter((s) =>
    s && !s._loading && Object.keys(s).length > 0 && Object.values(s).every((v) => v?.ok)
  ).length;
  const totalSlots = schedule?.length || 0;
  const blotatoReady = accounts && hasValidMapping();

  // ── Blotato account loading ──────────────────
  const loadAccounts = async () => {
    setAccountsLoading(true);
    setAccountsError('');
    try {
      const res = await fetch('/api/blotato/accounts', {
        headers: blotatoKey ? { 'blotato-api-key': blotatoKey } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load accounts');
      setAccounts(data.accounts);
      const mapping = { ...accountMapping };
      for (const [platform, items] of Object.entries(data.accounts)) {
        if (items.length > 0) {
          mapping[platform] = { accountId: items[0].accountId, pageId: items[0].pages?.[0]?.pageId || '' };
        }
      }
      setAccountMapping(mapping);
    } catch (e) {
      setAccountsError(e.message);
    } finally {
      setAccountsLoading(false);
    }
  };

  // ── Live article refresh ─────────────────────
  const refreshArticles = async () => {
    setIsRefreshing(true);
    setScrapeSource('');
    try {
      const res = await fetch('/api/scrape-articles?max=40');
      const data = await res.json();
      if (data.articles?.length > 0) {
        setScrapedArticles(data.articles);
        setScrapeSource(data.source);
      } else {
        setScrapeSource('seed');
      }
    } catch {
      setScrapeSource('seed');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Merged article list: scraped articles first, then static seed list deduped
  const allArticles = (() => {
    const seen = new Set(scrapedArticles.map(a => a.url));
    const staticFallback = ALL_ARTICLES.filter(a => !seen.has(a.url));
    return [...scrapedArticles, ...staticFallback];
  })();

  // ── Slot management ──────────────────────────
  const addSlot = () => {
    if (!slotForm.date || !slotForm.platforms.length) return;
    setCustomSlots(p => [...p, { ...slotForm, id: uid() }]);
    setSlotForm(f => ({ ...f, topicOverride: '', articleUrl: '' }));
  };

  const removeSlot = (id) => setCustomSlots(p => p.filter(s => s.id !== id));

  const addRecurring = () => {
    const { startDate, endDate, time, days, platforms, categories, articleUrl } = recurForm;
    const category = categories.length === Object.keys(CATEGORIES).length ? '' : categories[0] || '';
    if (!startDate || !endDate || !days.length || !platforms.length) return;
    const cur = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const newSlots = [];
    let guard = 0;
    while (cur <= end && guard++ < 500) {
      const wd = cur.getDay() === 0 ? 6 : cur.getDay() - 1;
      if (days.includes(wd)) {
        newSlots.push({ id: uid(), date: cur.toISOString().slice(0,10), time, platforms: [...platforms], categories: [...categories], category, topicOverride: '', articleUrl: articleUrl||'' });
      }
      cur.setDate(cur.getDate() + 1);
    }
    setCustomSlots(p => [...p, ...newSlots]);
  };

  const toggleSlotPlatform = (setter, platforms, p) =>
    setter(f => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter(x=>x!==p) : [...f.platforms, p] }));

  // ── Generate ─────────────────────────────────
  // IDs already in the schedule (already generated or pending)
  const existingSlotIds = new Set((schedule || []).map(s => s.id));

  // Slots that haven't been generated yet
  const newCustomSlots = customSlots.filter(s => !existingSlotIds.has(s.id));

  const handleGenerate = async () => {
    if (!newCustomSlots.length) return;
    setGenerating(true);
    abortRef.current = false;
    setTab('review');

    // Sort only the NEW slots by date + time
    const sorted = [...newCustomSlots].sort((a, b) => (a.date+a.time).localeCompare(b.date+b.time));

    // No-repeat cycling: load previously used URLs from localStorage
    let prevUsed = new Set();
    try { prevUsed = new Set(JSON.parse(localStorage.getItem('innago-used-articles') || '[]')); } catch {}
    const usedThisRun = new Set();

    // ISO week tracking — seed with weeks already in the existing schedule
    const weeksSeen = new Set((schedule || []).map(s => isoWeekKey(s.date)));

    const newPlan = sorted.map((slot, i) => {
      let article;
      if (slot.articleUrl) {
        article = allArticles.find(a => a.url === slot.articleUrl) || {
          url: slot.articleUrl,
          category: slot.category || 'Custom',
          slug: slot.articleUrl.replace(/^https?:\/\/innago\.com\//, '').replace(/\/$/, ''),
          displayTitle: slot.articleUrl.replace(/^https?:\/\/innago\.com\//, '').replace(/\/$/, '').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),
        };
      } else {
        const pool = slot.categories && slot.categories.length > 0 && slot.categories.length < Object.keys(CATEGORIES).length
          ? allArticles.filter(a => slot.categories.includes(a.category))
          : slot.category && CATEGORIES[slot.category]
            ? allArticles.filter(a => a.category === slot.category)
            : allArticles;
        const fresh = pool.filter(a => !prevUsed.has(a.url) && !usedThisRun.has(a.url));
        const source = fresh.length > 0 ? fresh : pool.filter(a => !usedThisRun.has(a.url));
        const finalPool = source.length > 0 ? source : pool;
        article = finalPool[i % finalPool.length];
      }
      usedThisRun.add(article.url);

      const wk = isoWeekKey(slot.date);
      const isFirstOfWeek = !weeksSeen.has(wk);
      if (isFirstOfWeek) weeksSeen.add(wk);

      return { ...slot, day: dayNameFromStr(slot.date), article, boostedTopic: slot.topicOverride || '', isFirstOfWeek };
    });

    // Save used URLs
    try {
      const allUsed = [...new Set([...prevUsed, ...usedThisRun])];
      if (allUsed.length < allArticles.length * 0.8) {
        localStorage.setItem('innago-used-articles', JSON.stringify(allUsed));
      } else {
        localStorage.removeItem('innago-used-articles');
      }
    } catch {}

    // Merge new plan into existing schedule (sorted by date+time)
    const mergedSchedule = [...(schedule || []), ...newPlan]
      .sort((a, b) => (a.date+a.time).localeCompare(b.date+b.time));
    setSchedule(mergedSchedule);
    setProgress({ done: 0, total: newPlan.length });

    for (let i = 0; i < newPlan.length; i++) {
      if (abortRef.current) break;
      const slot = newPlan[i];
      let postData = null;
      try {
        const r = await fetch('/api/generate-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: slot.article.url, displayTitle: slot.article.displayTitle, date: slot.date, boostedTopic: slot.boostedTopic || undefined, anthropicKey: anthropicKey || undefined, bitlyKey: bitlyKey || undefined }),
        });
        postData = await r.json();
        setPosts(p => ({ ...p, [slot.id]: postData }));
      } catch {
        setPosts(p => ({ ...p, [slot.id]: { error: 'Generation failed' } }));
        setProgress({ done: i + 1, total: newPlan.length });
        continue;
      }
      if (autoSchedule && hasValidMapping() && postData && !postData.error) {
        const statusRes = await scheduleSlot(slot.id, postData, mergedSchedule);
        setScheduleStatus(p => ({ ...p, [slot.id]: statusRes }));
      }
      setProgress({ done: i + 1, total: newPlan.length });
    }
    setGenerating(false);
  };

  function hasValidMapping() {
    return Object.values(accountMapping).some((m) => m.accountId);
  }

  // ── Schedule a single slot ───────────────────
  const scheduleSlot = async (slotId, postData, planOverride) => {
    const src = planOverride || schedule;
    const slot = src?.find((s) => s.id === slotId);
    if (!slot || !postData) return {};
    try {
      const res = await fetch('/api/blotato/schedule-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blotatoApiKey: blotatoKey || undefined,
          slot: { date: slot.date, ...postData },
          accountMapping: Object.fromEntries(
            Object.entries(accountMapping).filter(([p, v]) =>
              v.accountId && (!slot.platforms || slot.platforms.includes(p))
            )
          ),
          postingTime: slot.time || '09:00',
        }),
      });
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  };

  const scheduleAll = async () => {
    if (!schedule) return;
    for (const slot of schedule) {
      const postData = posts[slot.id];
      if (!postData || postData.error) continue;
      setScheduleStatus(p => ({ ...p, [slot.id]: { _loading: true } }));
      const result = await scheduleSlot(slot.id, postData);
      setScheduleStatus(p => ({ ...p, [slot.id]: result }));
    }
  };

  // ── Unschedule a single platform post from Blotato ──
  const unschedulePost = async (slotId, platform) => {
    const platformStatus = scheduleStatus[slotId]?.[platform];
    if (!platformStatus) return;
    setScheduleStatus(p => ({ ...p, [slotId]: { ...p[slotId], [platform]: { ...platformStatus, _deleting: true } } }));
    try {
      const res = await fetch('/api/blotato/delete-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: platformStatus.postId || undefined,
          scheduledTime: platformStatus.scheduledTime || undefined,
          accountId: platformStatus.accountId || undefined,
          platform,
          blotatoApiKey: blotatoKey || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setScheduleStatus(p => ({ ...p, [slotId]: { ...p[slotId], [platform]: { ok: false, deleted: true } } }));
      } else {
        alert(`Could not remove from Blotato: ${data.error}\n\nPlease remove it manually at my.blotato.com`);
        setScheduleStatus(p => ({ ...p, [slotId]: { ...p[slotId], [platform]: { ...platformStatus, _deleting: false } } }));
      }
    } catch (e) {
      setScheduleStatus(p => ({ ...p, [slotId]: { ...p[slotId], [platform]: { ...platformStatus, _deleting: false } } }));
    }
  };

  // ── Edit ─────────────────────────────────────
  const startEdit = (slotId, field) => { setEditingKey(`${slotId}::${field}`); setEditDraft(posts[slotId]?.[field] || ''); };
  const saveEdit = (slotId, field) => { setPosts(p => ({ ...p, [slotId]: { ...p[slotId], [field]: editDraft } })); setEditingKey(null); };

  const copyPost = (slotId, field, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(`${slotId}::${field}`);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const regenerateSingle = async (slot) => {
    setRegeneratingId(slot.id);
    try {
      const r = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: slot.article.url, displayTitle: slot.article.displayTitle, date: slot.date, boostedTopic: slot.boostedTopic || undefined, anthropicKey: anthropicKey || undefined, bitlyKey: bitlyKey || undefined }),
      });
      const postData = await r.json();
      setPosts(p => ({ ...p, [slot.id]: postData }));
      setScheduleStatus(p => ({ ...p, [slot.id]: undefined }));
    } catch { /* keep existing */ } finally {
      setRegeneratingId(null);
    }
  };

  // ── AI Image generation ──────────────────────
  const generateImage = async (slot) => {
    const p = posts[slot.id];
    if (!p) return;
    setGeneratedImages(prev => ({ ...prev, [slot.id]: { html: '', loading: true } }));
    try {
      const r = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: p.title || slot.article?.displayTitle,
          summary: slot.article?.summary || '',
          content_type: slot.article?.content_type || 'blog post',
          url: slot.article?.url,
          anthropicKey: anthropicKey || undefined,
          bitlyKey: bitlyKey || undefined,
        }),
      });
      const data = await r.json();
      setGeneratedImages(prev => ({ ...prev, [slot.id]: { html: data.html || '', loading: false, template: data.template } }));
    } catch {
      setGeneratedImages(prev => ({ ...prev, [slot.id]: { html: '', loading: false, error: true } }));
    }
  };

  // ── Export CSV ───────────────────────────────
  const exportCSV = () => {
    if (!schedule) return;
    const headers = ['date','day','time','platforms','boosted_topic','category','source_title','source_url',
      'post','post_linkedin','post_facebook','post_twitter_x','post_instagram'];
    const rows = schedule.map((slot) => {
      const p = posts[slot.id] || {};
      return [
        slot.date, slot.day, slot.time||'', (slot.platforms||[]).join(';'),
        slot.boostedTopic||'', slot.article.category,
        p.title||slot.article.displayTitle, slot.article.url,
        p.post||'', p.post_linkedin||'', p.post_facebook||'', p.post_twitter_x||'', p.post_instagram||'',
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
    });
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `innago-social-${schedule[0]?.date||'export'}.csv` });
    a.click();
  };

  // ── Scroll to highlighted slot in Review tab ─
  useEffect(() => {
    if (!highlightedSlotId || tab !== 'review') return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`slot-card-${highlightedSlotId}`);
      if (el) {
        el.scrollIntoView({ behavior:'smooth', block:'center' });
        el.style.transition = 'box-shadow 0.3s';
        el.style.boxShadow = `0 0 0 3px ${BLUE}`;
        setTimeout(() => { el.style.boxShadow = ''; setHighlightedSlotId(null); }, 2000);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [highlightedSlotId, tab]);

  // ── Persist all state to localStorage ────────
  useEffect(() => {
    try { localStorage.setItem('innago-custom-slots', JSON.stringify(customSlots)); } catch {}
  }, [customSlots]);

  useEffect(() => {
    try {
      if (schedule !== null) localStorage.setItem('innago-schedule', JSON.stringify(schedule));
      localStorage.setItem('innago-posts', JSON.stringify(posts));
      localStorage.setItem('innago-schedule-status', JSON.stringify(scheduleStatus));
    } catch {}
  }, [schedule, posts, scheduleStatus]);

  useEffect(() => {
    try { localStorage.setItem('innago-account-mapping', JSON.stringify(accountMapping)); } catch {}
  }, [accountMapping]);

  // ── Calendar label — uses article category from generated schedule if available ──
  const calendarLabel = (slot) => {
    const schedSlot = schedule?.find(s => s.id === slot.id);
    if (schedSlot?.article?.category) return schedSlot.article.category;
    if (schedSlot?.boostedTopic)      return schedSlot.boostedTopic;
    return slotLabel(slot);
  };

  // ── Sorted slot list for display ─────────────
  const sortedCustomSlots = [...customSlots].sort((a, b) => (a.date+a.time).localeCompare(b.date+b.time));

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "'Inter',-apple-system,sans-serif" }}>

      {/* ── Header ─────────────────────────────── */}
      <header style={{ background:'#fff', borderBottom:`1px solid ${BORDER}`, padding:'0 28px',
        display:'flex', alignItems:'center', height:58, position:'sticky', top:0, zIndex:100, gap:12 }}>
        <Logo />
        <span style={{ fontWeight:700, fontSize:15, color:TEXT }}>Innago Social</span>

        <nav style={{ display:'flex', gap:2, marginLeft:32 }}>
          {[
            ['config', `Schedule${customSlots.length > 0 ? ` (${customSlots.length})` : ''}`],
            ['review', `Review${schedule ? ` (${doneCount}/${totalSlots})` : ''}`],
            ['blotato', 'Settings'],
          ].map(([t, label]) => (
            <TabBtn key={t} active={tab===t} onClick={() => { setTab(t); setClearPostsConfirm(false); }}>{label}</TabBtn>
          ))}
        </nav>

        <div style={{ marginLeft:'auto', display:'flex', gap:10, alignItems:'center' }}>
          {tab==='review' && doneCount > 0 && (
            <>
              <button onClick={exportCSV} style={outlineBtn}>Export CSV</button>
              {blotatoReady && !autoSchedule && (
                <button onClick={scheduleAll} style={{ ...outlineBtn, color:BLUE, borderColor:BLUE }}>
                  Schedule All to Blotato
                </button>
              )}
              {!clearPostsConfirm ? (
                <button onClick={()=>setClearPostsConfirm(true)}
                  style={{ ...outlineBtn, color:RED, borderColor:RED }}>
                  Clear Posts
                </button>
              ) : (
                <button onClick={()=>{
                  setSchedule(null); setPosts({}); setScheduleStatus({});
                  setClearPostsConfirm(false);
                  try { localStorage.removeItem('innago-schedule'); localStorage.removeItem('innago-posts'); localStorage.removeItem('innago-schedule-status'); } catch {}
                }}
                  style={{ ...primaryBtn, background:RED }}>
                  Are you sure? Click to confirm
                </button>
              )}
            </>
          )}
          {!generating ? (
            <button onClick={handleGenerate}
              disabled={newCustomSlots.length === 0}
              style={{ ...primaryBtn, opacity: newCustomSlots.length === 0 ? 0.5 : 1 }}>
              {newCustomSlots.length === 0
                ? 'All slots generated'
                : `Generate ${newCustomSlots.length} New Slot${newCustomSlots.length !== 1 ? 's' : ''}`}
            </button>
          ) : (
            <button onClick={() => { abortRef.current=true; }} style={{ ...primaryBtn, background:RED }}>Stop</button>
          )}
        </div>
      </header>

      <main style={{ maxWidth:1160, margin:'0 auto', padding:'28px 24px' }}>

        {/* ══ CONFIGURE TAB ═════════════════════ */}
        {tab==='config' && (
          <div style={{ display:'flex', flexDirection:'column', gap:22 }}>

            {/* ── Slot list / Calendar ── */}
            <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12, padding:24 }}>
              {/* Header with view toggles */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ margin:0, fontSize:15, fontWeight:600, color:TEXT }}>
                  Your Schedule {customSlots.length > 0 && `(${customSlots.length} slot${customSlots.length!==1?'s':''})`}
                </h3>
                <div style={{ display:'flex', gap:4 }}>
                  {['list','calendar'].map(v=>(
                    <button key={v} onClick={()=>setScheduleView(v)}
                      style={{ padding:'5px 12px', borderRadius:6, cursor:'pointer', fontSize:12,
                        border:`1px solid ${scheduleView===v?BLUE:BORDER}`,
                        background:scheduleView===v?BLUE_BG:'#fff',
                        color:scheduleView===v?BLUE:MUTED, fontWeight:scheduleView===v?600:400 }}>
                      {v==='list'?'List':'Calendar'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── LIST VIEW ── */}
              {scheduleView === 'list' && (
                <>
                  {customSlots.length > 0 && (
                    <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
                      <span style={{ fontSize:12, color:MUTED, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', flexShrink:0 }}>Filter:</span>
                      <input type="date" value={slotFilterFrom} onChange={e=>setSlotFilterFrom(e.target.value)}
                        style={{ ...input, fontSize:12, padding:'5px 8px' }} />
                      <span style={{ color:MUTED, fontSize:13 }}>–</span>
                      <input type="date" value={slotFilterTo} onChange={e=>setSlotFilterTo(e.target.value)}
                        style={{ ...input, fontSize:12, padding:'5px 8px' }} />
                      {(slotFilterFrom || slotFilterTo) && (
                        <button onClick={()=>{setSlotFilterFrom('');setSlotFilterTo('');}}
                          style={{ background:'none', border:'none', cursor:'pointer', color:MUTED, fontSize:18, padding:'0 2px', lineHeight:1 }}>×</button>
                      )}
                    </div>
                  )}
                  {customSlots.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'48px 0', color:MUTED }}>
                      <div style={{ fontSize:36, marginBottom:10 }}>📅</div>
                      <p style={{ fontSize:14, margin:0, lineHeight:1.6 }}>No slots yet.<br/>Use Quick Add below to build your schedule.</p>
                    </div>
                  ) : (() => {
                    const filtered = sortedCustomSlots.filter(s =>
                      (!slotFilterFrom || s.date >= slotFilterFrom) &&
                      (!slotFilterTo   || s.date <= slotFilterTo)
                    );
                    return (
                      <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:400, overflowY:'auto', paddingRight:4 }}>
                        {filtered.length === 0 && <p style={{ fontSize:13, color:MUTED, textAlign:'center', padding:'24px 0' }}>No slots match that date range.</p>}
                        {filtered.map(slot => (
                          <div key={slot.id} style={{ display:'flex', alignItems:'center', gap:8,
                            padding:'8px 10px', borderRadius:8, background:BG, fontSize:13 }}>
                            <span style={{ fontWeight:600, color:TEXT, minWidth:80 }}>{slot.date}</span>
                            <span style={{ color:MUTED, minWidth:70 }}>{formatTime(slot.time)}</span>
                            <span style={{ color:MUTED, fontSize:12, minWidth:28 }}>{shortDay(slot.date)}</span>
                            <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                              {slot.platforms.map(p=>(
                                <span key={p} title={PLATFORM_LABELS[p]}
                                  style={{ width:8, height:8, borderRadius:'50%', background:PLATFORM_COLORS[p], display:'inline-block' }} />
                              ))}
                            </div>
                            <span style={{ color:MUTED, fontSize:12, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {slot.category || <em>any</em>}
                            </span>
                            {slot.articleUrl && (
                              <span title={allArticles.find(a=>a.url===slot.articleUrl)?.displayTitle || slot.articleUrl}
                                style={{ fontSize:11, background:'#f0fdf4', color:GREEN, padding:'1px 7px', borderRadius:8, flexShrink:0, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                📄 {allArticles.find(a=>a.url===slot.articleUrl)?.displayTitle || 'Pinned'}
                              </span>
                            )}
                            {slot.topicOverride && (
                              <span style={{ fontSize:11, background:BLUE_BG, color:BLUE, padding:'1px 7px', borderRadius:8, flexShrink:0 }}>
                                {slot.topicOverride}
                              </span>
                            )}
                            <button onClick={()=>removeSlot(slot.id)}
                              style={{ background:'none', border:'none', cursor:'pointer', color:MUTED, fontSize:18, padding:'0 4px', lineHeight:1 }}>×</button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}

              {/* ── CALENDAR VIEW ── */}
              {scheduleView === 'calendar' && (
                <>
                  {/* Nav + mode toggle */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <button onClick={()=>setCalendarFocus(f => calendarMode==='month' ? shiftMonth(f,-1) : addDays(f,-7))}
                        style={{ ...outlineBtn, padding:'4px 10px', fontSize:15 }}>‹</button>
                      <span style={{ fontWeight:600, fontSize:14, minWidth:200, textAlign:'center' }}>
                        {calendarMode==='month' ? monthLabel(calendarFocus) : weekLabel(calendarFocus)}
                      </span>
                      <button onClick={()=>setCalendarFocus(f => calendarMode==='month' ? shiftMonth(f,1) : addDays(f,7))}
                        style={{ ...outlineBtn, padding:'4px 10px', fontSize:15 }}>›</button>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      {['month','week'].map(m=>(
                        <button key={m} onClick={()=>setCalendarMode(m)}
                          style={{ padding:'4px 12px', borderRadius:6, cursor:'pointer', fontSize:12,
                            border:`1px solid ${calendarMode===m?BLUE:BORDER}`,
                            background:calendarMode===m?BLUE_BG:'#fff',
                            color:calendarMode===m?BLUE:MUTED, fontWeight:calendarMode===m?600:400 }}>
                          {m==='month'?'Month':'Week'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Month grid — headers are row 1 of the same grid so they always align */}
                  {calendarMode === 'month' && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>(
                        <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:MUTED, padding:'4px 0 6px' }}>{d}</div>
                      ))}
                      {getMonthGrid(calendarFocus).map((dateStr, i) => {
                        if (!dateStr) return <div key={`e${i}`} style={{ minHeight:60 }} />;
                        const daySlots = sortedCustomSlots.filter(s => s.date === dateStr);
                        const isToday = dateStr === today();
                        const uniquePlatforms = [...new Set(daySlots.flatMap(s=>s.platforms||[]))];
                        return (
                          <div key={dateStr}
                            onClick={daySlots.length > 0 ? ()=>{
                              setHighlightedSlotId(daySlots[0].id);
                              if (schedule) setTab('review');
                            } : undefined}
                            style={{ minHeight:60, borderRadius:6, padding:'4px 6px',
                              border:`1px solid ${isToday?BLUE:daySlots.length>0?BORDER:'#f3f4f6'}`,
                              background: isToday?BLUE_BG : daySlots.length>0?'#fff':'#fafafa',
                              cursor: daySlots.length>0?'pointer':'default' }}>
                            <div style={{ fontSize:11, fontWeight:isToday?700:400, color:isToday?BLUE:'#9ca3af', textAlign:'right' }}>
                              {new Date(dateStr+'T00:00:00').getDate()}
                            </div>
                            {daySlots.map(slot => {
                              const chipColor = slot.platforms?.[0] ? PLATFORM_COLORS[slot.platforms[0]] : BLUE;
                              const label = calendarLabel(slot);
                              return (
                                <div key={slot.id} style={{ display:'flex', alignItems:'center', gap:2,
                                  marginTop:2, padding:'2px 4px', borderRadius:3,
                                  background:chipColor+'15', border:`1px solid ${chipColor}33` }}>
                                  <span style={{ fontSize:9, color:chipColor, fontWeight:600,
                                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, lineHeight:1.3 }}>
                                    {label}
                                  </span>
                                  <button onClick={e=>{e.stopPropagation(); removeSlot(slot.id);}}
                                    style={{ background:'none', border:'none', cursor:'pointer',
                                      color:chipColor, fontSize:11, padding:0, lineHeight:1, flexShrink:0, opacity:0.8 }}>
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Week grid — headers are row 1 of the same grid so they always align */}
                  {calendarMode === 'week' && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>(
                        <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:MUTED, padding:'4px 0 6px' }}>{d}</div>
                      ))}
                      {getWeekDates(calendarFocus).map(dateStr => {
                        const daySlots = sortedCustomSlots.filter(s => s.date === dateStr);
                        const isToday = dateStr === today();
                        const d = new Date(dateStr+'T00:00:00');
                        return (
                          <div key={dateStr} style={{ minHeight:110, borderRadius:8, padding:'6px 8px',
                            border:`1px solid ${isToday?BLUE:BORDER}`,
                            background: isToday?BLUE_BG:'#fafafa' }}>
                            <div style={{ fontSize:11, fontWeight:600, color:isToday?BLUE:MUTED,
                              marginBottom:6, textAlign:'center' }}>
                              {d.toLocaleString('default',{month:'short'})} {d.getDate()}
                            </div>
                            {daySlots.flatMap(slot =>
                              (slot.platforms || [PLATFORMS_LIST[0]]).map(platform => ({
                                slotId: slot.id, platform, time: slot.time,
                                label: calendarLabel(slot),
                                color: PLATFORM_COLORS[platform],
                              }))
                            ).map((item) => (
                              <div key={`${item.slotId}-${item.platform}`}
                                onClick={()=>{ setHighlightedSlotId(item.slotId); if (schedule) setTab('review'); }}
                                style={{ position:'relative', borderRadius:5, marginBottom:3, cursor:'pointer',
                                  padding:'4px 20px 4px 7px',
                                  border:`1.5px solid ${item.color}`,
                                  background: item.color + '12' }}>
                                <div style={{ fontSize:10, fontWeight:700, color:item.color,
                                  textTransform:'uppercase', letterSpacing:'0.04em', lineHeight:1.2, marginBottom:1 }}>
                                  {PLATFORM_LABELS[item.platform]}
                                </div>
                                <div style={{ fontSize:11, fontWeight:600, color:'#1a2340',
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>
                                  {item.label}
                                </div>
                                <div style={{ fontSize:10, color:MUTED }}>{formatTime(item.time)}</div>
                                <button onClick={e=>{e.stopPropagation(); removeSlot(item.slotId);}}
                                  style={{ position:'absolute', top:3, right:4, background:'none', border:'none',
                                    cursor:'pointer', color:item.color, fontSize:13, padding:0, lineHeight:1, opacity:0.8 }}>
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {customSlots.length > 0 && (
                <button onClick={()=>setCustomSlots([])}
                  style={{ ...outlineBtn, marginTop:12, width:'100%', fontSize:13, color:RED, borderColor:RED }}>
                  Clear all slots
                </button>
              )}
            </div>

            {/* ── Article library status ── */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px',
                background:'#fff', border:`1px solid ${BORDER}`, borderRadius:10 }}>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:14, fontWeight:600, color:TEXT }}>Article Library</span>
                  <span style={{ fontSize:13, color:MUTED, marginLeft:10 }}>
                    {scrapedArticles.length > 0
                      ? `${scrapedArticles.length} live articles (${scrapeSource}) + ${ALL_ARTICLES.length} seed articles`
                      : `${ALL_ARTICLES.length} seed articles — click Refresh to pull live from innago.com`}
                  </span>
                </div>
                <button onClick={refreshArticles} disabled={isRefreshing}
                  style={{ ...outlineBtn, color:BLUE, borderColor:BLUE, opacity:isRefreshing?0.6:1, fontSize:13, padding:'6px 14px' }}>
                  {isRefreshing ? 'Scraping…' : '↻ Refresh Articles'}
                </button>
                {scrapedArticles.length > 0 && (
                  <button onClick={()=>{setScrapedArticles([]);setScrapeSource('');}}
                    style={{ ...outlineBtn, fontSize:13, padding:'6px 14px' }}>
                    Clear Live
                  </button>
                )}
              </div>
            </div>

            {/* ── Quick Add Recurring ── */}
            <div>
              <Card title="Quick Add Recurring Slots">
                <p style={{ margin:'0 0 16px', fontSize:13, color:MUTED }}>
                  Add many slots at once across a date range — pick the days, time, platforms, and category.
                </p>

                {/* Date / time row */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:14 }}>
                  <Field label="Start date">
                    <input type="date" value={recurForm.startDate} onChange={e=>setRecurForm(f=>({...f,startDate:e.target.value}))} style={input} />
                  </Field>
                  <Field label="End date">
                    <input type="date" value={recurForm.endDate} onChange={e=>setRecurForm(f=>({...f,endDate:e.target.value}))} style={input} />
                  </Field>
                  <Field label="Time (ET)">
                    <input type="time" value={recurForm.time} onChange={e=>setRecurForm(f=>({...f,time:e.target.value}))} style={input} />
                  </Field>
                </div>

                {/* Categories — full width */}
                <Field label={`Content categories (${recurForm.categories.length}/${Object.keys(CATEGORIES).length} selected)`}>
                  <div style={{ display:'flex', gap:6, marginBottom:8, marginTop:4 }}>
                    <button onClick={()=>setRecurForm(f=>({...f,categories:Object.keys(CATEGORIES)}))}
                      style={{ ...outlineBtn, fontSize:11, padding:'3px 10px' }}>Select all</button>
                    <button onClick={()=>setRecurForm(f=>({...f,categories:[]}))}
                      style={{ ...outlineBtn, fontSize:11, padding:'3px 10px' }}>Clear all</button>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {Object.keys(CATEGORIES).map(cat => {
                      const on = recurForm.categories.includes(cat);
                      return (
                        <label key={cat} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer',
                          padding:'4px 10px', borderRadius:20, fontSize:12,
                          border:`1.5px solid ${on?BLUE:BORDER}`,
                          background:on?BLUE_BG:'#fff', color:on?BLUE:'#374151', fontWeight:on?600:400 }}>
                          <input type="checkbox" checked={on}
                            onChange={()=>setRecurForm(f=>({
                              ...f,
                              categories: on ? f.categories.filter(c=>c!==cat) : [...f.categories, cat],
                              articleUrl: '',
                            }))}
                            style={{ display:'none' }} />
                          {cat} <span style={{ fontSize:10, opacity:0.6 }}>({CATEGORIES[cat].length})</span>
                        </label>
                      );
                    })}
                  </div>
                </Field>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop:14 }}>
                  <Field label="Days of week">
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
                      {DAY_NAMES.map((day,i) => {
                        const on = recurForm.days.includes(i);
                        return (
                          <label key={i} style={{ display:'flex', alignItems:'center', cursor:'pointer',
                            padding:'5px 12px', borderRadius:20, fontSize:13,
                            border:`1.5px solid ${on?BLUE:BORDER}`,
                            background:on?BLUE_BG:'#fff', color:on?BLUE:'#374151', fontWeight:on?600:400 }}>
                            <input type="checkbox" checked={on}
                              onChange={()=>setRecurForm(f=>({ ...f, days: on?f.days.filter(d=>d!==i):[...f.days,i] }))}
                              style={{ display:'none' }} />
                            {day}
                          </label>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="Platforms">
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                      {PLATFORMS_LIST.map(p => {
                        const on = recurForm.platforms.includes(p);
                        return (
                          <label key={p} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer',
                            padding:'5px 12px', borderRadius:20, fontSize:13,
                            border:`1.5px solid ${on ? PLATFORM_COLORS[p] : BORDER}`,
                            background: on ? PLATFORM_COLORS[p]+'18' : '#fff',
                            color: on ? PLATFORM_COLORS[p] : '#374151', fontWeight: on ? 600 : 400 }}>
                            <input type="checkbox" checked={on}
                              onChange={()=>toggleSlotPlatform(setRecurForm, recurForm.platforms, p)}
                              style={{ display:'none' }} />
                            <span style={{ width:7, height:7, borderRadius:'50%', background:PLATFORM_COLORS[p], display:'inline-block', flexShrink:0 }} />
                            {PLATFORM_LABELS[p]}
                          </label>
                        );
                      })}
                    </div>
                  </Field>
                </div>

                <Field label="Pin a specific article to all slots (optional)">
                  <ArticlePicker
                    value={recurForm.articleUrl}
                    onChange={(url, article) => setRecurForm(f=>({ ...f, articleUrl: url, category: article?.category || f.category }))}
                    slotDate={recurForm.startDate}
                    articles={allArticles}
                  />
                </Field>

                <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:12 }}>
                  <button onClick={addRecurring}
                    disabled={!recurForm.startDate||!recurForm.endDate||!recurForm.days.length||!recurForm.platforms.length}
                    style={{ ...primaryBtn,
                      opacity:(!recurForm.startDate||!recurForm.endDate||!recurForm.days.length||!recurForm.platforms.length)?0.5:1 }}>
                    Add Recurring Slots
                  </button>
                  {recurForm.startDate && recurForm.endDate && recurForm.days.length > 0 && (() => {
                    // Count how many slots this will add
                    const cur = new Date(recurForm.startDate+'T00:00:00');
                    const end = new Date(recurForm.endDate+'T00:00:00');
                    let count = 0, guard = 0;
                    while (cur <= end && guard++ < 500) {
                      const wd = cur.getDay()===0?6:cur.getDay()-1;
                      if (recurForm.days.includes(wd)) count++;
                      cur.setDate(cur.getDate()+1);
                    }
                    return count > 0 ? <span style={{ fontSize:13, color:MUTED }}>Will add {count} slot{count!==1?'s':''}</span> : null;
                  })()}
                </div>
              </Card>
            </div>

            {/* ── Article Library ── */}
            <div>
              <Card title={`Article Library (${ALL_ARTICLES.length} articles across ${Object.keys(CATEGORIES).length} categories)`}>
                <p style={{ margin:'0 0 12px', fontSize:13, color:MUTED }}>
                  Click a category to browse its articles. Links open the article on innago.com.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {Object.entries(CATEGORIES).map(([cat, urls]) => {
                    const isOpen = openCategory === cat;
                    return (
                      <div key={cat} style={{ borderRadius:8, border:`1px solid ${BORDER}`, overflow:'hidden' }}>
                        {/* Category header */}
                        <button onClick={()=>setOpenCategory(isOpen ? null : cat)}
                          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                            padding:'9px 14px', background:isOpen?BLUE_BG:'#fff', border:'none', cursor:'pointer',
                            fontSize:13, fontWeight:isOpen?600:400, color:isOpen?BLUE:TEXT }}>
                          <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ width:7, height:7, borderRadius:'50%', background:isOpen?BLUE:MUTED, display:'inline-block', flexShrink:0 }} />
                            {cat}
                          </span>
                          <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:11, color:isOpen?BLUE:MUTED, fontWeight:400 }}>{urls.length} articles</span>
                            <span style={{ fontSize:12, color:isOpen?BLUE:MUTED }}>{isOpen ? '▲' : '▼'}</span>
                          </span>
                        </button>
                        {/* Article list */}
                        {isOpen && (
                          <div style={{ padding:'8px 14px 12px', background:BG,
                            display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px' }}>
                            {urls.map(url => {
                              const slug = url.replace(/^https?:\/\/innago\.com\//, '').replace(/\/$/, '');
                              const title = slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
                              return (
                                <a key={url} href={url} target="_blank" rel="noreferrer"
                                  style={{ fontSize:12, color:BLUE, textDecoration:'none', lineHeight:1.5,
                                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}
                                  title={title}>
                                  {title}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ══ SETTINGS TAB ════════════════════════ */}
        {tab==='blotato' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:22 }}>

            {/* Anthropic key — full width */}
            <div style={{ gridColumn:'1/-1' }}>
              <Card title="Anthropic API Key">
                <p style={{ margin:'0 0 14px', fontSize:13, color:MUTED }}>
                  Required for generating post copy. Get your key at{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color:BLUE }}>
                    console.anthropic.com
                  </a>{' '}
                  → API Keys. Make sure billing is set up or the key won't work.
                </p>
                <Field label="Anthropic API key">
                  <input
                    type="password"
                    placeholder="sk-ant-api03-..."
                    value={anthropicKey}
                    onChange={e => saveAnthropicKey(e.target.value)}
                    style={input}
                  />
                </Field>
                {anthropicKey && (
                  <div style={{ marginTop:10, padding:'8px 12px', background:'#f0fdf4',
                    border:'1px solid #bbf7d0', borderRadius:8, fontSize:13, color:GREEN }}>
                    ✓ Key saved — will be used for all post generation
                  </div>
                )}
                {!anthropicKey && (
                  <div style={{ marginTop:10, padding:'8px 12px', background:'#fef9ec',
                    border:'1px solid #fde68a', borderRadius:8, fontSize:13, color:YELLOW }}>
                    ⚠ No key entered — post generation will fail
                  </div>
                )}
              </Card>
            </div>

            <Card title="Bitly API Key">
              <p style={{ margin:'0 0 14px', fontSize:13, color:MUTED }}>
                Used to shorten article links on LinkedIn, Facebook, and Twitter/X. UTM tracking parameters are preserved inside the short link.
                Get your key at <a href="https://app.bitly.com/settings/api" target="_blank" rel="noreferrer" style={{ color:BLUE }}>app.bitly.com/settings/api</a>.
              </p>
              <Field label="Bitly access token">
                <input type="password" placeholder="Paste your Bitly access token…"
                  value={bitlyKey} onChange={e=>saveBitlyKey(e.target.value)} style={input} />
              </Field>
              {bitlyKey ? (
                <div style={{ marginTop:10, padding:'8px 12px', background:'#f0fdf4',
                  border:'1px solid #bbf7d0', borderRadius:8, fontSize:13, color:GREEN }}>
                  ✓ Key saved — links will be shortened via Bitly
                </div>
              ) : (
                <div style={{ marginTop:10, padding:'8px 12px', background:'#fef9ec',
                  border:'1px solid #fde68a', borderRadius:8, fontSize:13, color:YELLOW }}>
                  ⚠ No key entered — links will use full UTM-tagged URLs
                </div>
              )}
            </Card>

            <Card title="Blotato Connection">
              <p style={{ margin:'0 0 14px', fontSize:13, color:MUTED }}>
                Enter your Blotato API key, or set <code>BLOTATO_API_KEY</code> as a Vercel environment variable (more secure).
                Find your key at my.blotato.com → Settings → API.
              </p>
              <Field label="Blotato API key">
                <input type="password"
                  placeholder={process.env.NEXT_PUBLIC_HAS_BLOTATO_KEY==='true' ? '••••• (set via env var)' : 'paste your API key here'}
                  value={blotatoKey} onChange={e=>saveBlotatoKey(e.target.value)} style={input} />
              </Field>
              <p style={{ margin:'14px 0 0', fontSize:12, color:MUTED }}>
                Post times are set per-slot in the Schedule tab. This fallback only applies if a slot has no time set.
              </p>
              <Field label="Auto-schedule after generation">
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginTop:4 }}>
                  <input type="checkbox" checked={autoSchedule} onChange={e=>setAutoSchedule(e.target.checked)}
                    style={{ accentColor:BLUE, width:18, height:18 }} />
                  <span style={{ fontSize:14 }}>Automatically schedule each post to Blotato as it's generated</span>
                </label>
              </Field>
              <button onClick={loadAccounts} disabled={accountsLoading}
                style={{ ...primaryBtn, marginTop:16, width:'100%', opacity:accountsLoading?0.6:1 }}>
                {accountsLoading ? 'Loading accounts...' : 'Connect & Load Accounts'}
              </button>
              {accountsError && <p style={{ color:RED, fontSize:13, marginTop:8 }}>{accountsError}</p>}
            </Card>

            <Card title="Account Mapping">
              {!accounts ? (
                <p style={{ fontSize:14, color:MUTED }}>Load your accounts first →</p>
              ) : (
                <>
                  <p style={{ margin:'0 0 16px', fontSize:13, color:MUTED }}>
                    Select which account + page to post to on each platform. Only platforms enabled per-slot will be scheduled.
                  </p>
                  {PLATFORMS_LIST.map(platform => {
                    const items = accounts[platform]||[];
                    const mapping = accountMapping[platform]||{};
                    const color = PLATFORM_COLORS[platform];
                    return (
                      <div key={platform} style={{ marginBottom:18 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <PlatformDot color={color} />
                          <span style={{ fontWeight:600, fontSize:14 }}>{PLATFORM_LABELS[platform]}</span>
                          {items.length===0 && <span style={{ fontSize:12, color:MUTED }}>(not connected)</span>}
                          {mapping.accountId && <span style={{ fontSize:12, color:GREEN }}>✓ mapped</span>}
                        </div>
                        {items.length>0 && (
                          <>
                            <select value={mapping.accountId}
                              onChange={e=>{
                                const acct=items.find(a=>a.accountId===e.target.value);
                                setAccountMapping(p=>({...p,[platform]:{ accountId:e.target.value, pageId:acct?.pages?.[0]?.pageId||'' }}));
                              }}
                              style={{ ...input, marginBottom:(platform==='facebook'||platform==='linkedin')&&items.find(a=>a.accountId===mapping.accountId)?.pages?.length>0?6:0 }}>
                              <option value="">— select account —</option>
                              {items.map(a=><option key={a.accountId} value={a.accountId}>{a.fullname} (@{a.username})</option>)}
                            </select>
                            {(platform==='facebook'||platform==='linkedin') && (() => {
                              const acct=items.find(a=>a.accountId===mapping.accountId);
                              const pages=acct?.pages||[];
                              if (!pages.length) return null;
                              return (
                                <select value={mapping.pageId}
                                  onChange={e=>setAccountMapping(p=>({...p,[platform]:{...p[platform],pageId:e.target.value}}))}
                                  style={input}>
                                  <option value="">— personal profile —</option>
                                  {pages.map(pg=><option key={pg.pageId} value={pg.pageId}>{pg.name}</option>)}
                                </select>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    );
                  })}
                  {hasValidMapping() && (
                    <div style={{ padding:'10px 14px', background:'#f0fdf4', borderRadius:8,
                      border:'1px solid #bbf7d0', fontSize:13, color:GREEN, marginTop:4 }}>
                      ✓ Ready to schedule. Posts will go out at the time set on each slot.
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* ── Blotato Scheduled Posts ── */}
            {(() => {
              const scheduled = (schedule || []).flatMap(slot => {
                const stat = scheduleStatus[slot.id];
                if (!stat) return [];
                return Object.entries(stat)
                  .filter(([,r]) => r && (r.ok || r.deleted) && !r._loading)
                  .map(([plat, r]) => ({
                    slotId: slot.id,
                    platform: plat,
                    result: r,
                    date: slot.date,
                    time: slot.time,
                    day: slot.day,
                    topic: slot.article?.category || slot.boostedTopic || slotLabel(slot),
                  }));
              });
              if (!scheduled.length) return null;
              return (
                <div style={{ gridColumn:'1/-1', marginTop:8 }}>
                  <Card title={`Blotato Queue (${scheduled.filter(s=>s.result.ok).length} scheduled)`}>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {scheduled.map((item, i) => (
                        <div key={`${item.slotId}-${item.platform}-${i}`}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px',
                            borderRadius:8, background: item.result.deleted ? '#f9fafb' : BG,
                            opacity: item.result.deleted ? 0.5 : 1 }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12,
                            fontWeight:600, color: item.result.deleted ? MUTED : PLATFORM_COLORS[item.platform],
                            minWidth:90 }}>
                            <span style={{ width:7, height:7, borderRadius:'50%',
                              background: item.result.deleted ? MUTED : PLATFORM_COLORS[item.platform],
                              display:'inline-block' }} />
                            {PLATFORM_LABELS[item.platform]}
                          </span>
                          <span style={{ fontSize:13, color: item.result.deleted ? MUTED : TEXT,
                            flex:1, textDecoration: item.result.deleted ? 'line-through' : 'none' }}>
                            {item.topic}
                          </span>
                          <span style={{ fontSize:12, color:MUTED, minWidth:130 }}>
                            {item.day} {item.date} · {formatTime(item.time)}
                          </span>
                          {item.result.deleted ? (
                            <span style={{ fontSize:11, color:MUTED }}>Removed from Blotato</span>
                          ) : item.result.ok ? (
                            <a href="https://app.blotato.com" target="_blank" rel="noreferrer"
                              style={{ ...outlineBtn, fontSize:11, padding:'3px 10px', color:BLUE, borderColor:BLUE, textDecoration:'none' }}>
                              Delete on Blotato ↗
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══ REVIEW TAB ════════════════════════ */}
        {tab==='review' && (
          <>
            {!schedule && (
              <div style={{ textAlign:'center', padding:80, color:MUTED }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📅</div>
                <p style={{ fontSize:16 }}>Build your schedule and click <strong>Generate Posts</strong>.</p>
                <button onClick={()=>setTab('config')} style={{ ...primaryBtn, marginTop:16 }}>Go to Schedule</button>
              </div>
            )}

            {schedule && (
              <>
                {/* Progress bar */}
                {generating && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:MUTED, marginBottom:6 }}>
                      <span>{autoSchedule && blotatoReady ? 'Generating & scheduling...' : 'Generating posts...'} {progress.done}/{progress.total}</span>
                      <span>{totalSlots>0?Math.round(progress.done/totalSlots*100):0}%</span>
                    </div>
                    <div style={{ background:BORDER, borderRadius:4, height:6 }}>
                      <div style={{ background:BLUE, height:6, borderRadius:4,
                        width:`${totalSlots>0?Math.round(progress.done/totalSlots*100):0}%`, transition:'width 0.3s' }} />
                    </div>
                  </div>
                )}

                {/* Summary strip */}
                {!generating && doneCount>0 && (
                  <div style={{ display:'flex', gap:20, marginBottom:20, padding:'12px 18px',
                    background:'#fff', border:`1px solid ${BORDER}`, borderRadius:10, flexWrap:'wrap' }}>
                    <Stat label="Posts generated" value={doneCount} />
                    <Stat label="Scheduled to Blotato" value={scheduledCount} color={scheduledCount>0?GREEN:MUTED} />
                    <Stat label="Date range" value={`${schedule[0]?.date} – ${schedule[schedule.length-1]?.date}`} />
                    {!blotatoReady && doneCount>0 && (
                      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center' }}>
                        <button onClick={()=>setTab('blotato')} style={{ ...outlineBtn, color:BLUE, borderColor:BLUE }}>
                          Set up Blotato →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Platform tabs */}
                <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
                  {PLATFORMS_LIST.map(p=>(
                    <button key={p} onClick={()=>setActivePlatform(p)} style={{
                      padding:'6px 16px', borderRadius:20, cursor:'pointer', fontSize:13,
                      border:`1.5px solid ${activePlatform===p?PLATFORM_COLORS[p]:BORDER}`,
                      background:activePlatform===p?PLATFORM_COLORS[p]:'#fff',
                      color:activePlatform===p?'#fff':'#374151', fontWeight:activePlatform===p?600:400,
                    }}>
                      {PLATFORM_LABELS[p]}
                    </button>
                  ))}
                  <button onClick={()=>setActivePlatform('universal')} style={{
                    padding:'6px 16px', borderRadius:20, cursor:'pointer', fontSize:13,
                    border:`1.5px solid ${activePlatform==='universal'?BLUE:BORDER}`,
                    background:activePlatform==='universal'?BLUE:'#fff',
                    color:activePlatform==='universal'?'#fff':'#374151',
                    fontWeight:activePlatform==='universal'?600:400,
                  }}>Universal</button>
                </div>

                {/* Post cards */}
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {schedule.map(slot=>{
                    const p=posts[slot.id];
                    const field=activePlatform==='universal'?'post':POST_FIELD[activePlatform]||'post_linkedin';
                    const ek=`${slot.id}::${field}`;
                    const isEditing=editingKey===ek;
                    const isLoading=(!p && generating) || regeneratingId===slot.id;
                    const slotStatus=scheduleStatus[slot.id];
                    const postText=p?.[field]||p?.post||'';
                    const charLimit=CHAR_LIMITS[activePlatform];
                    const charCount=postText.length;
                    const overLimit=charLimit&&charCount>charLimit;
                    const nearLimit=charLimit&&charCount>charLimit*0.9&&!overLimit;
                    const isCopied=copiedKey===ek;
                    const platformIncluded = activePlatform==='universal' || !slot.platforms || slot.platforms.includes(activePlatform);

                    // Image logic per Python script:
                    //   Instagram: always show
                    //   LinkedIn/Facebook: first post of ISO week only
                    //   Twitter: never
                    //   Universal: show if available
                    const heroUrl = p?.image_url || '';
                    const imgEntry = generatedImages[slot.id];
                    const hasAiImage = !!imgEntry?.html;
                    // Hide scraped hero if AI image has been generated
                    const showImage =
                      heroUrl && !hasAiImage && (
                        activePlatform === 'instagram' ||
                        activePlatform === 'universal' ||
                        (['linkedin','facebook'].includes(activePlatform) && slot.isFirstOfWeek)
                      );
                    const showAiImage = hasAiImage && activePlatform !== 'twitter';

                    return (
                      <div key={slot.id} style={{
                        id:`slot-card-${slot.id}`,
                        background:'#fff', border:`1px solid ${overLimit?RED:BORDER}`, borderRadius:10, padding:'16px 20px',
                        borderLeft:`4px solid ${slot.boostedTopic?BLUE:overLimit?RED:BORDER}`,
                        opacity: !platformIncluded ? 0.55 : 1,
                      }}>
                        {/* Header row */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                          <div>
                            <span style={{ fontWeight:600, fontSize:15, color:TEXT }}>
                              {slot.date} · {slot.day}
                            </span>
                            <span style={{ marginLeft:10, fontSize:12, color:MUTED }}>{slot.time} ET</span>
                            {slot.boostedTopic && (
                              <span style={{ marginLeft:8, fontSize:11, background:BLUE_BG,
                                color:BLUE, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>
                                {slot.boostedTopic}
                              </span>
                            )}
                            <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:5 }}>
                              {/* Platform badges for this slot */}
                              {(slot.platforms||PLATFORMS_LIST).map(pl=>(
                                <span key={pl} style={{ display:'inline-flex', alignItems:'center', gap:4,
                                  fontSize:11, padding:'2px 7px', borderRadius:8,
                                  background: PLATFORM_COLORS[pl]+'18', color:PLATFORM_COLORS[pl], fontWeight:600 }}>
                                  <span style={{ width:6, height:6, borderRadius:'50%', background:PLATFORM_COLORS[pl], display:'inline-block' }} />
                                  {PLATFORM_LABELS[pl]}
                                </span>
                              ))}
                              <span style={{ fontSize:12, color:MUTED }}>·</span>
                              <span style={{ fontSize:12, color:MUTED }}>{slot.article?.category}</span>
                              <span style={{ fontSize:12, color:MUTED }}>·</span>
                              <a href={slot.article?.url} target="_blank" rel="noreferrer"
                                style={{ fontSize:12, color:BLUE, textDecoration:'none' }}>
                                {p?.title || slot.article?.displayTitle}
                              </a>
                            </div>
                          </div>

                          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end' }}>
                            {slotStatus && !slotStatus._loading && (
                              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                                {Object.entries(slotStatus).map(([plat,r])=>(
                                  <StatusChip key={plat} platform={plat} result={r}
                                    onUnschedule={r?.ok ? ()=>unschedulePost(slot.id, plat) : null} />
                                ))}
                              </div>
                            )}
                            {slotStatus?._loading && <span style={{ fontSize:12, color:MUTED }}>Scheduling…</span>}


                            {p && !p.error && !isLoading && (
                              <button onClick={()=>generateImage(slot)}
                                disabled={!!imgEntry?.loading}
                                title="Generate AI branded image"
                                style={{ ...outlineBtn, fontSize:12, padding:'5px 10px',
                                  color:'#8A47DF', borderColor:'#8A47DF', opacity:imgEntry?.loading?0.6:1 }}>
                                {imgEntry?.loading ? 'Generating…' : hasAiImage ? '🖼 Regenerate Image' : '🖼 Generate Image'}
                              </button>
                            )}

                            {p && !p.error && !isLoading && platformIncluded && (
                              <>
                                <button onClick={()=>copyPost(slot.id,field,postText)}
                                  style={{ ...outlineBtn, fontSize:12, padding:'5px 10px',
                                    color:isCopied?GREEN:undefined, borderColor:isCopied?GREEN:undefined }}>
                                  {isCopied?'Copied':'Copy'}
                                </button>
                                <button onClick={()=>regenerateSingle(slot)} disabled={!!generating}
                                  style={{ ...outlineBtn, fontSize:12, padding:'5px 10px', opacity:generating?0.5:1 }}>
                                  Regenerate
                                </button>
                                {blotatoReady && !slotStatus?._loading && (
                                  <button onClick={async()=>{
                                    setScheduleStatus(prev=>({...prev,[slot.id]:{_loading:true}}));
                                    const r=await scheduleSlot(slot.id,p);
                                    setScheduleStatus(prev=>({...prev,[slot.id]:r}));
                                  }} style={{ ...outlineBtn, fontSize:12, padding:'5px 10px', color:BLUE, borderColor:BLUE }}>
                                    {slotStatus ? 'Reschedule' : 'Schedule to Blotato'}
                                  </button>
                                )}
                                <button onClick={()=>isEditing?saveEdit(slot.id,field):startEdit(slot.id,field)}
                                  style={{ ...outlineBtn, fontSize:12, padding:'5px 10px',
                                    ...(isEditing?{color:BLUE,borderColor:BLUE}:{}) }}>
                                  {isEditing?'Save':'Edit'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Not on this platform */}
                        {!platformIncluded && (
                          <div style={{ color:MUTED, fontSize:13, fontStyle:'italic', paddingTop:4 }}>
                            Not scheduled for {PLATFORM_LABELS[activePlatform]}
                          </div>
                        )}

                        {/* Post body */}
                        {platformIncluded && isLoading && (
                          <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:4 }}>
                            <div style={{ height:14, background:'#f3f4f6', borderRadius:4, width:'85%', animation:'pulse 1.5s ease-in-out infinite' }} />
                            <div style={{ height:14, background:'#f3f4f6', borderRadius:4, width:'70%', animation:'pulse 1.5s ease-in-out infinite' }} />
                            <div style={{ height:14, background:'#f3f4f6', borderRadius:4, width:'45%', animation:'pulse 1.5s ease-in-out infinite' }} />
                            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
                          </div>
                        )}
                        {platformIncluded && !isLoading && !p && <div style={{ color:'#d1d5db', fontSize:14 }}>Pending</div>}
                        {platformIncluded && p?.error && (
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <span style={{ color:RED, fontSize:14 }}>{p.error}</span>
                            <button onClick={()=>regenerateSingle(slot)}
                              style={{ ...outlineBtn, fontSize:12, padding:'5px 10px', color:RED, borderColor:RED }}>
                              Retry
                            </button>
                          </div>
                        )}
                        {/* Hero image (scraped) */}
                        {platformIncluded && showImage && (
                          <div style={{ marginBottom:12 }}>
                            <img src={heroUrl} alt="Article hero"
                              style={{ width:'100%', maxHeight:220, objectFit:'cover', borderRadius:8, display:'block' }}
                              onError={e=>{e.target.style.display='none';}} />
                            <div style={{ fontSize:11, color:MUTED, marginTop:4 }}>
                              Scraped hero image
                              {['linkedin','facebook'].includes(activePlatform) && !slot.isFirstOfWeek && (
                                <span style={{ marginLeft:8, color:YELLOW }}>
                                  (only on first post of each week for {PLATFORM_LABELS[activePlatform]})
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* AI-generated image preview */}
                        {platformIncluded && showAiImage && (
                          <div style={{ marginBottom:12 }}>
                            <div style={{ width:280, height:280, overflow:'hidden', borderRadius:8, flexShrink:0 }}>
                              <iframe
                                srcDoc={imgEntry.html}
                                sandbox="allow-same-origin"
                                style={{
                                  width:1080, height:1080,
                                  transform:'scale(0.259)',
                                  transformOrigin:'top left',
                                  border:'none',
                                  display:'block',
                                  pointerEvents:'none',
                                }}
                                title="AI generated image preview"
                              />
                            </div>
                            <div style={{ fontSize:11, color:MUTED, marginTop:6 }}>
                              AI-generated image · Template {imgEntry.template}
                            </div>
                          </div>
                        )}

                        {/* Universal view — stacked per-platform posts with per-platform editing */}
                        {activePlatform === 'universal' && p && !p.error && !isLoading && (
                          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                            {PLATFORMS_LIST.filter(pl => !slot.platforms || slot.platforms.includes(pl)).map(pl => {
                              const plField = POST_FIELD[pl];
                              const plText = p[plField] || p.post || '';
                              const plLimit = CHAR_LIMITS[pl];
                              const plCount = plText.length;
                              const plOver = plLimit && plCount > plLimit;
                              const plNear = plLimit && plCount > plLimit * 0.9 && !plOver;
                              const plCopyKey = `${slot.id}::${plField}`;
                              const plCopied = copiedKey === plCopyKey;
                              const plEditKey = `${slot.id}::${plField}`;
                              const plEditing = editingKey === plEditKey;
                              return (
                                <div key={pl} style={{ borderRadius:8, border:`1px solid ${plOver?RED:BORDER}`,
                                  borderLeft:`3px solid ${PLATFORM_COLORS[pl]}`, padding:'10px 14px', background:BG }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                                    <span style={{ display:'inline-flex', alignItems:'center', gap:5,
                                      fontSize:12, fontWeight:700, color:PLATFORM_COLORS[pl] }}>
                                      <span style={{ width:7, height:7, borderRadius:'50%', background:PLATFORM_COLORS[pl], display:'inline-block' }} />
                                      {PLATFORM_LABELS[pl]}
                                    </span>
                                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                      {plLimit && plCount > 0 && (
                                        <span style={{ fontSize:11, fontWeight:500,
                                          color: plOver?RED : plNear?YELLOW : MUTED }}>
                                          {plCount}/{plLimit}{plOver && ` (+${plCount-plLimit} over)`}
                                        </span>
                                      )}
                                      <button onClick={()=>copyPost(slot.id, plField, plText)}
                                        style={{ background:'none', border:'none', cursor:'pointer',
                                          fontSize:12, color:plCopied?GREEN:MUTED, padding:'2px 6px' }}>
                                        {plCopied ? '✓ Copied' : 'Copy'}
                                      </button>
                                      <button onClick={()=>plEditing ? saveEdit(slot.id, plField) : startEdit(slot.id, plField)}
                                        style={{ background:'none', border:'none', cursor:'pointer',
                                          fontSize:12, color:plEditing?BLUE:MUTED, padding:'2px 6px', fontWeight:plEditing?600:400 }}>
                                        {plEditing ? 'Save' : 'Edit'}
                                      </button>
                                    </div>
                                  </div>
                                  {plEditing ? (
                                    <textarea value={editDraft} onChange={e=>setEditDraft(e.target.value)}
                                      style={{ width:'100%', minHeight:90, padding:8, borderRadius:6,
                                        border:`1.5px solid ${PLATFORM_COLORS[pl]}`, fontSize:13, lineHeight:1.6,
                                        fontFamily:'inherit', resize:'vertical', boxSizing:'border-box', outline:'none' }}
                                      autoFocus />
                                  ) : (
                                    <p style={{ margin:0, fontSize:13, lineHeight:1.6, color:'#374151', whiteSpace:'pre-wrap' }}>
                                      {plText}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Single-platform view */}
                        {activePlatform !== 'universal' && platformIncluded && p && !p.error && !isLoading && (
                          <>
                            {isEditing ? (
                              <textarea value={editDraft} onChange={e=>setEditDraft(e.target.value)}
                                style={{ width:'100%', minHeight:100, padding:10, borderRadius:6,
                                  border:`1.5px solid ${BLUE}`, fontSize:14, lineHeight:1.6,
                                  fontFamily:'inherit', resize:'vertical', boxSizing:'border-box', outline:'none' }}
                                autoFocus />
                            ) : (
                              <p style={{ margin:0, fontSize:14, lineHeight:1.65, color:'#374151', whiteSpace:'pre-wrap' }}>
                                {postText}
                              </p>
                            )}
                            {charLimit && charCount > 0 && (
                              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
                                <span style={{ fontSize:12, fontWeight:500,
                                  color: overLimit?RED : nearLimit?YELLOW : MUTED }}>
                                  {charCount}/{charLimit}{overLimit && ` (+${charCount-charLimit} over)`}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        {/* Delete slot — bottom of card, clearly labelled */}
                        {!generating && (
                          <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${BORDER}`, display:'flex', justifyContent:'flex-end' }}>
                            <button
                              onClick={()=>{
                                setSchedule(s=>s.filter(x=>x.id!==slot.id));
                                setPosts(p=>{ const n={...p}; delete n[slot.id]; return n; });
                                setScheduleStatus(s=>{ const n={...s}; delete n[slot.id]; return n; });
                              }}
                              style={{ ...outlineBtn, fontSize:12, padding:'5px 12px', color:RED, borderColor:RED }}>
                              Delete Slot
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Logo() {
  return (
    <div style={{ width:32, height:32, background:BLUE, borderRadius:8,
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>I</span>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding:'6px 16px', borderRadius:6, border:'none',
      cursor:'pointer', fontWeight:active?600:400, fontSize:14,
      background:active?BG:'transparent', color:active?BLUE:MUTED }}>
      {children}
    </button>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12, padding:24 }}>
      <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:600, color:TEXT }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginTop:14 }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, color=TEXT }) {
  return (
    <div>
      <div style={{ fontSize:20, fontWeight:700, color }}>{value}</div>
      <div style={{ fontSize:12, color:MUTED }}>{label}</div>
    </div>
  );
}

function PlatformDot({ color }) {
  return <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }} />;
}

function StatusChip({ platform, result, onUnschedule }) {
  if (!result) return null;
  if (result.deleted) {
    return (
      <span style={{ fontSize:11, padding:'2px 7px', borderRadius:10, border:'1px solid #e5e7eb',
        background:'#f9fafb', color:'#9ca3af', fontWeight:600, textDecoration:'line-through' }}>
        {PLATFORM_LABELS[platform] || platform}
      </span>
    );
  }
  if (result._deleting) {
    return (
      <span style={{ fontSize:11, padding:'2px 7px', borderRadius:10, border:'1px solid #fecaca',
        background:'#fef2f2', color:RED, fontWeight:600 }}>
        Removing…
      </span>
    );
  }
  const ok = result.ok;
  const color = ok ? PLATFORM_COLORS[platform] : RED;
  const bg = ok ? '#f0fdf4' : '#fef2f2';
  const border = ok ? '#bbf7d0' : '#fecaca';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, padding:'2px 7px',
      borderRadius:10, border:`1px solid ${border}`, background:bg, color, fontWeight:600 }}>
      {ok ? '✓' : '✗'} {PLATFORM_LABELS[platform] || platform}
      {ok && (
        <a href="https://app.blotato.com" target="_blank" rel="noreferrer"
          title="Delete from Blotato manually"
          style={{ color, fontSize:10, marginLeft:2, opacity:0.7, textDecoration:'none' }}>
          ↗
        </a>
      )}
    </span>
  );
}

// ── ArticlePicker ─────────────────────────────────────────────
// Search by topic keyword OR filter to articles relevant to a slot date.
// "By date" = shows articles whose category keywords match the season/month of slotDate.
const MONTH_HINTS = {
  1:  ['tax','1099','depreciation'],      // Jan
  2:  ['tax','1099','depreciation'],      // Feb
  3:  ['tax','deduction'],                // Mar
  4:  ['spring','turnover','vacancy'],    // Apr
  5:  ['spring','turnover','listing'],    // May
  6:  ['screening','leasing','lease'],    // Jun
  7:  ['maintenance','inspection'],       // Jul
  8:  ['maintenance','inspection'],       // Aug
  9:  ['eviction','lease','renewal'],     // Sep
  10: ['year-end','winter','heating'],    // Oct
  11: ['winter','heating','year-end'],    // Nov
  12: ['year-end','tax','depreciation'],  // Dec
};

function articleMatchesDate(article, dateStr) {
  if (!dateStr) return true;
  const month = new Date(dateStr+'T00:00:00').getMonth() + 1;
  const hints = MONTH_HINTS[month] || [];
  if (!hints.length) return true;
  const text = (article.displayTitle + ' ' + article.category + ' ' + article.url).toLowerCase();
  return hints.some(h => text.includes(h));
}

function ArticlePicker({ value, onChange, slotDate, articles }) {
  const pool = articles || ALL_ARTICLES;
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selectedArticle = value ? pool.find(a => a.url === value) : null;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = pool.filter(a => {
    const matchesQuery = !query || (a.displayTitle + ' ' + a.category).toLowerCase().includes(query.toLowerCase());
    const matchesDate = !dateFilter || articleMatchesDate(a, slotDate);
    return matchesQuery && matchesDate;
  });

  // Group filtered results by category
  const grouped = {};
  for (const a of filtered) {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      {/* Selected state */}
      {selectedArticle && !open ? (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
          borderRadius:8, border:`1.5px solid ${GREEN}`, background:'#f0fdf4', fontSize:13 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:GREEN, flexShrink:0 }} />
          <span style={{ flex:1, color:TEXT, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {selectedArticle.displayTitle}
          </span>
          <span style={{ fontSize:11, color:MUTED, flexShrink:0 }}>{selectedArticle.category}</span>
          <button onClick={()=>{ onChange('', null); setQuery(''); }}
            style={{ background:'none', border:'none', cursor:'pointer', color:MUTED, fontSize:16, padding:'0 2px', lineHeight:1, flexShrink:0 }}>×</button>
        </div>
      ) : (
        <input
          value={query}
          onChange={e=>{ setQuery(e.target.value); setOpen(true); }}
          onFocus={()=>setOpen(true)}
          placeholder="Search articles by title or category…"
          style={{ ...input, borderColor: open ? BLUE : BORDER }}
        />
      )}

      {/* Search filters row */}
      {(open || !selectedArticle) && (
        <div style={{ display:'flex', gap:8, marginTop:6, alignItems:'center' }}>
          <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, color:MUTED }}>
            <input type="checkbox" checked={dateFilter} onChange={e=>{ setDateFilter(e.target.checked); setOpen(true); }}
              style={{ accentColor:BLUE }} />
            Suggest by posting date
            {dateFilter && slotDate && (
              <span style={{ color:BLUE }}>({new Date(slotDate+'T00:00:00').toLocaleString('default',{month:'short'})})</span>
            )}
          </label>
          <span style={{ color:MUTED, fontSize:12 }}>{filtered.length} article{filtered.length!==1?'s':''}</span>
        </div>
      )}

      {/* Dropdown results */}
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200, marginTop:4,
          background:'#fff', border:`1px solid ${BORDER}`, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
          maxHeight:280, overflowY:'auto' }}>
          {Object.keys(grouped).length === 0 && (
            <div style={{ padding:'16px', fontSize:13, color:MUTED, textAlign:'center' }}>No articles match.</div>
          )}
          {Object.entries(grouped).map(([cat, articles]) => (
            <div key={cat}>
              <div style={{ padding:'8px 12px 4px', fontSize:11, fontWeight:700, color:MUTED,
                textTransform:'uppercase', letterSpacing:'0.06em', background:BG, position:'sticky', top:0 }}>
                {cat}
              </div>
              {articles.map(a => (
                <button key={a.url} onClick={()=>{ onChange(a.url, a); setQuery(''); setOpen(false); }}
                  style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 14px',
                    background: value===a.url ? BLUE_BG : 'transparent',
                    border:'none', cursor:'pointer', fontSize:13,
                    color: value===a.url ? BLUE : TEXT, fontWeight: value===a.url ? 600 : 400,
                    borderBottom:`1px solid ${BORDER}` }}>
                  {a.displayTitle}
                  {value===a.url && <span style={{ marginLeft:8, fontSize:11 }}>✓</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────
const labelStyle = { fontSize:12, fontWeight:600, color:MUTED, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 };
const input = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${BORDER}`, fontSize:14, boxSizing:'border-box', color:'#374151', background:'#fff', outline:'none', fontFamily:'inherit' };
const primaryBtn = { padding:'9px 20px', borderRadius:8, border:'none', background:BLUE, color:'#fff', fontWeight:600, fontSize:14, cursor:'pointer' };
const outlineBtn = { padding:'7px 16px', borderRadius:8, border:`1.5px solid ${BORDER}`, background:'#fff', color:'#374151', fontWeight:500, fontSize:14, cursor:'pointer' };
