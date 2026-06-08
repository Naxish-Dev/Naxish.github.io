/**
 * CyberFeed - Security & Tech Intelligence Dashboard
 * Aggregates cybersecurity and tech news via a self-hosted Cloudflare Worker.
 *
 * @author Naxish
 * @version 2.0
 *
 * Architecture:
 * - All RSS fetching and parsing is handled server-side by the Cloudflare Worker.
 *   The worker deduplicates, sorts, and caches responses at the CDN edge for 15 minutes.
 *   The client makes a single request and receives a flat JSON array of up to 100 articles.
 * - Each article carries a category field ("Cybersecurity"/"Tech") set by the worker.
 *   The client maps these to internal keys ("security"/"tech") and enriches with display colors.
 * - Results are cached in localStorage for 6h 15m — 15 minutes after the Worker's 6-hour KV
 *   cron, giving the worker time to complete before the client fetches fresh data.
 * - Auto-refresh runs on the same 6h 15m interval.
 *
 * Features:
 * - Filter by category (Security / Tech / All)
 * - Full-text search across titles, snippets and sources
 * - Sort by newest or by source
 * - XSS-safe HTML rendering via escapeHtml / escapeAttr
 */

// ===== FEED SOURCES =====
// Names must match the worker's source field exactly — used for color lookup.
// Category is a local fallback only; the worker provides the authoritative category per article.
const FEEDS = [
  { name: 'The Hacker News',  category: 'security', color: '#ff4757' },
  { name: 'KrebsOnSecurity',  category: 'security', color: '#ff6b81' },
  { name: 'SecurityWeek',     category: 'security', color: '#ffa502' },
  { name: 'Dark Reading',     category: 'security', color: '#ff6348' },
  { name: 'SANS ISC',         category: 'security', color: '#eccc68' },
  { name: 'BleepingComputer', category: 'security', color: '#ff8c00' },
  { name: 'Ars Technica',     category: 'tech',     color: '#00d4ff' },
  { name: 'TechCrunch',       category: 'tech',     color: '#2ed573' },
  { name: 'Hacker News',      category: 'tech',     color: '#a78bfa' },
];

// ===== CACHE =====
const CACHE_KEY     = 'cyberfeed_cache';
const CACHE_TTL_MS  = (6 * 60 + 15) * 60 * 1000; // 6h 15m — 15-min buffer after the Worker's 6-hour KV cron to ensure fresh data

function saveCache(feeds) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), feeds })); } catch (_) {}
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, feeds } = JSON.parse(raw);
    const age = Date.now() - ts;
    if (age > CACHE_TTL_MS || !Array.isArray(feeds)) return null;
    return { feeds, ageMs: age };
  } catch (_) { return null; }
}

// ===== STATE =====
let isFetching = false; // guard against concurrent loadFeeds calls
let state = { feeds: [], filter: 'all', sort: 'date', search: '', refreshTimer: null, cacheCountdown: null };

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const els = {
  clock:         $('#clock'),
  statusDot:     $('#status-dot'),
  statusText:    $('#status-text'),
  errorScreen:   $('#error-screen'),
  errorMsg:      $('#error-msg'),
  feedGrid:      $('#feed-grid'),
  emptyScreen:   $('#empty-screen'),
  emptyMsg:      $('#empty-msg'),
  statsBar:      $('#stats-bar'),
  statTotal:     $('#stat-total'),
  statSecurity:  $('#stat-security'),
  statTech:      $('#stat-tech'),
  statSources:   $('#stat-sources'),
  sortSelect:    $('#sort-select'),
  cacheInfo:     $('#cache-info'),
  searchInput:   $('#search-input'),
  searchClear:   $('#search-clear'),
  footerSources: $('#footer-sources'),
};

// ===== SHOW / HIDE HELPERS =====
function showEl(el) { el.removeAttribute('hidden'); el.style.removeProperty('display'); }
function hideEl(el) { el.setAttribute('hidden', ''); el.style.display = 'none'; }

// ===== CLOCK =====
function updateClock() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  els.clock.textContent =
    `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
setInterval(updateClock, 1000);
updateClock();

// ===== STATUS =====
function setStatus(status, text) {
  els.statusDot.className = `status-dot ${status}`;
  els.statusText.textContent = text;
}

// ===== STRIP HTML =====
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// ===== RELATIVE DATE =====
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date)) return '';
    const now = new Date();
    const diffMin = Math.floor((now - date) / 60000);
    const diffHrs = Math.floor((now - date) / 3600000);
    const diffDay = Math.floor((now - date) / 86400000);
    if (diffMin < 1)  return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDay < 7)  return `${diffDay}d ago`;
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  } catch { return ''; }
}

// ===== UTILS =====
// AbortController-based timeout for fetch calls
function timeout(ms) {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

// ===== WORKER =====
const WORKER_URL = 'https://rss-aggreator.naxishdev.workers.dev/';

// Built once at startup: maps worker source name → { category, color }.
const FEED_META = Object.fromEntries(FEEDS.map((f) => [f.name, { category: f.category, color: f.color }]));

// Maps worker category labels to internal client keys.
// Worker outputs "Cybersecurity" and "Tech"; client uses "security" and "tech".
const CATEGORY_MAP = { Cybersecurity: 'security', Tech: 'tech' };

// Resolves display color for a source name.
// Worker source names match FEEDS names exactly, so this is normally a direct lookup.
// The slug fallback handles any future sources with minor casing differences.
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
function resolveColor(src) {
  if (FEED_META[src]) return FEED_META[src].color;
  const slug  = normalize(src);
  const entry = FEEDS.find((f) => normalize(f.name) === slug);
  return entry ? entry.color : '#888888';
}

// Resolves the clean display name for a source.
// Falls back to partial slug matching for sources like "Ars Technica - All content"
// or "SANS Internet Storm Center, InfoCON: green" where the worker name differs from FEEDS.
function resolveDisplayName(src) {
  if (FEED_META[src]) return src; // exact match — already clean
  const slug = normalize(src);
  // exact slug match (e.g. "darkreading" → "Dark Reading")
  let entry = FEEDS.find((f) => normalize(f.name) === slug);
  if (!entry) {
    // partial match: worker name starts with or contains a known FEEDS name
    entry = FEEDS.find((f) => slug.startsWith(normalize(f.name)) || slug.includes(normalize(f.name)));
  }
  return entry ? entry.name : src;
}

// Single fetch to the Worker; groups the flat article array by source name.
async function fetchFromWorker() {
  const t = timeout(20000);
  try {
    const res      = await fetch(WORKER_URL, { signal: t.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const articles = await res.json();
    if (!Array.isArray(articles) || articles.length === 0) throw new Error('Empty response');

    // Group flat articles by source; category comes directly from the worker,
    // color is resolved from local FEEDS metadata.
    const grouped = {};
    for (const article of articles) {
      const src         = article.source || 'Unknown';
      const displayName = resolveDisplayName(src);
      const category    = CATEGORY_MAP[article.category] || FEED_META[src]?.category || FEED_META[displayName]?.category || 'tech';
      const color       = resolveColor(src);
      if (!grouped[src]) grouped[src] = { source: displayName, category, color, items: [] };
      grouped[src].items.push({
        title:      article.title       || 'Untitled',
        link:       article.link        || '',
        pubDate:    article.pubDate     || null,
        snippet:    stripHtml(article.description || '').slice(0, 220),
        categories: [],
      });
    }
    return Object.values(grouped);
  } finally { t.clear(); }
}

// ===== LOAD ALL FEEDS =====
async function loadFeeds() {
  // Serve from localStorage cache if data is still fresh — prevents worker spam on page reload
  const cached = loadCache();
  if (cached) {
    const remainingSec = Math.ceil((CACHE_TTL_MS - cached.ageMs) / 1000);
    state.feeds = cached.feeds;
    hideEl(els.errorScreen);
    const loaded = cached.feeds.filter((f) => f.items.length > 0);
    setStatus('online', `CACHED — ${loaded.length} SOURCES`);
    updateStats();
    renderGrid();
    if (state.refreshTimer) clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(() => loadFeeds(), remainingSec * 1000);
    startCacheCountdown(remainingSec);
    return;
  }

  // Block concurrent fetches (e.g. double-click on a manual refresh button)
  if (isFetching) return;
  isFetching = true;

  hideEl(els.errorScreen);
  if (state.feeds.length === 0) { hideEl(els.feedGrid); hideEl(els.statsBar); }
  setStatus('loading', 'CONNECTING...');

  try {
    const feeds  = await fetchFromWorker();
    const loaded = feeds.filter((f) => f.items.length > 0);
    if (loaded.length === 0) {
      showEl(els.errorScreen);
      els.errorMsg.textContent = 'Could not load any feeds. Check your connection and try again.';
      setStatus('error', 'CONNECTION FAILED');
      return;
    }

    state.feeds = feeds;
    saveCache(feeds);
    hideEl(els.errorScreen);
    setStatus('online', `LIVE — ${loaded.length} SOURCES`);
    updateStats();
    renderGrid();

    // Refresh on the same interval as the cache TTL so the timer and cache stay in sync
    if (state.refreshTimer) clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(() => loadFeeds(), CACHE_TTL_MS);
    startCacheCountdown(CACHE_TTL_MS / 1000);
  } catch (err) {
    console.error('[CyberFeed] Worker fetch failed:', err.message);
    showEl(els.errorScreen);
    els.errorMsg.textContent = 'Could not load feeds. Check your connection and try again.';
    setStatus('error', 'CONNECTION FAILED');
  } finally {
    isFetching = false;
  }
}

// ===== BUILD CARD HTML =====
// Note: animation-delay and --source-color are injected by renderGrid after building,
// so the <a> element intentionally carries no style attribute here.
function buildCard(item, source, category, color) {
  const date    = formatDate(item.pubDate);
  const snippet = item.snippet ? `<p class="card-snippet">${escapeHtml(item.snippet)}</p>` : '';
  return `
    <a class="card" href="${escapeAttr(item.link)}" target="_blank" rel="noopener noreferrer"
       data-category="${escapeAttr(category)}" title="Go to source">
      <div class="card-accent"></div>
      <div class="card-body">
        <div class="card-meta">
          <span class="source-badge" style="color:${color};border-color:${color}40;">${escapeHtml(source)}</span>
          <span class="category-badge ${category}">${category.toUpperCase()}</span>
          ${date ? `<span class="card-date">${escapeHtml(date)}</span>` : ''}
        </div>
        <h2 class="card-title">${escapeHtml(item.title)}</h2>
        ${snippet}
      </div>
    </a>`;
}

// ===== FILTER & SORT =====
function getArticles() {
  const query = state.search.toLowerCase().trim();
  let articles = [];
  for (const feed of state.feeds) {
    if (state.filter !== 'all' && feed.category !== state.filter) continue;
    for (const item of feed.items) articles.push({ ...item, source: feed.source, category: feed.category, color: feed.color });
  }
  if (query) {
    articles = articles.filter((a) =>
      (a.title      || '').toLowerCase().includes(query) ||
      (a.snippet    || '').toLowerCase().includes(query) ||
      (a.source     || '').toLowerCase().includes(query) ||
      (a.categories || []).some((c) => c.toLowerCase().includes(query))
    );
  }
  if (state.sort === 'date') {
    articles.sort((a, b) => (b.pubDate ? new Date(b.pubDate) : 0) - (a.pubDate ? new Date(a.pubDate) : 0));
  } else {
    articles.sort((a, b) => a.source.localeCompare(b.source));
  }
  return articles;
}

// ===== RENDER GRID =====
function renderGrid() {
  const articles = getArticles();
  if (articles.length === 0) {
    hideEl(els.feedGrid);
    showEl(els.emptyScreen);
    els.emptyMsg.textContent = state.search
      ? `NO RESULTS FOR "${state.search.toUpperCase()}"`
      : 'NO ARTICLES MATCH THE CURRENT FILTER';
    return;
  }
  hideEl(els.emptyScreen);
  showEl(els.feedGrid);
  els.feedGrid.innerHTML = articles
    .map((a, i) => buildCard(a, a.source, a.category, a.color)
      .replace('<a ', `<a style="--source-color:${a.color};animation-delay:${Math.min(i*40,600)}ms;" `))
    .join('');
}

// ===== STATS =====
function updateStats() {
  let total = 0, security = 0, tech = 0, sources = 0;
  for (const feed of state.feeds) {
    const count = feed.items.length;
    if (count === 0) continue;
    sources++;
    total    += count;
    if (feed.category === 'security') security += count;
    else if (feed.category === 'tech') tech     += count;
  }
  els.statTotal.textContent    = total;
  els.statSecurity.textContent = security;
  els.statTech.textContent     = tech;
  els.statSources.textContent  = sources;
  els.footerSources.textContent = sources;
  showEl(els.statsBar);
}

// ===== CACHE COUNTDOWN =====
// Counts down to the next scheduled refresh in the status bar.
function startCacheCountdown(seconds) {
  if (state.cacheCountdown) clearInterval(state.cacheCountdown);
  let remaining = seconds;
  const update = () => {
    if (remaining <= 0) { els.cacheInfo.textContent = ''; clearInterval(state.cacheCountdown); return; }
    const min = Math.floor(remaining / 60), sec = remaining % 60;
    els.cacheInfo.textContent = `REFRESH IN ${min}:${String(sec).padStart(2,'0')}`;
    remaining--;
  };
  update();
  state.cacheCountdown = setInterval(update, 1000);
}

// ===== FILTERS =====
$$('.filter-btn').forEach((btn) => btn.addEventListener('click', () => {
  $$('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  state.filter = btn.dataset.filter;
  renderGrid();
}));

// ===== SORT =====
els.sortSelect.addEventListener('change', () => { state.sort = els.sortSelect.value; renderGrid(); });

// ===== SEARCH =====
els.searchInput.addEventListener('input', () => {
  state.search = els.searchInput.value;
  els.searchClear.hidden = !state.search;
  renderGrid();
});
els.searchClear.addEventListener('click', () => {
  els.searchInput.value = ''; state.search = '';
  els.searchClear.hidden = true;
  els.searchInput.focus();
  renderGrid();
});

// ===== SECURITY HELPERS =====
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function escapeAttr(str) {
  if (!str) return '#';
  const s = String(str).trim();
  return /^https?:\/\//i.test(s) ? s.replace(/"/g,'%22') : '#';
}

// ===== BOOT =====
loadFeeds();
