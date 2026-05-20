/**
 * CyberFeed - Security & Tech Intelligence Dashboard
 * Live RSS aggregator fetching from cybersecurity and tech news sources.
 * Designed for static hosting (GitHub Pages) — no server required.
 *
 * @author Naxish
 * @version 1.0
 *
 * Features:
 * - Fetches RSS via codetabs (primary), corsproxy.io (fallback), rss2json (last resort)
 * - Filter by category (Security / Tech / All)
 * - Full-text search across titles, snippets and sources
 * - Sort by newest or by source
 * - Auto-refresh every 10 minutes with countdown
 * - XSS-safe HTML rendering via escapeHtml / escapeAttr
 */

const RSS2JSON = 'https://api.rss2json.com/v1/api.json';

// ===== FEED SOURCES =====
const FEEDS = [
  { name: 'The Hacker News',   url: 'https://feeds.feedburner.com/TheHackersNews',      category: 'security', color: '#ff4757' },
  { name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/',                category: 'security', color: '#ff6b81' },
  { name: 'SecurityWeek',      url: 'https://feeds.feedburner.com/securityweek',        category: 'security', color: '#ffa502' }, // Bleeping Computer blocked by rss2json (422)
  { name: 'Dark Reading',      url: 'https://www.darkreading.com/rss.xml',              category: 'security', color: '#ff6348' },
  { name: 'SANS ISC',          url: 'https://isc.sans.edu/rssfeed.xml',                 category: 'security', color: '#eccc68' }, // rssfeed_full.xml too large, causes proxy timeouts
  { name: 'Ars Technica',      url: 'https://feeds.arstechnica.com/arstechnica/index',  category: 'tech',     color: '#00d4ff' },
  { name: 'TechCrunch',        url: 'https://techcrunch.com/feed/',                     category: 'tech',     color: '#2ed573' },
  { name: 'Hacker News',       url: 'https://news.ycombinator.com/rss',                category: 'tech',     color: '#a78bfa' }, // Wired blocked by codetabs (empty response)
];

// ===== STATE =====
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
  refreshBtn:    $('#refresh-btn'),
  refreshIcon:   $('#refresh-icon'),
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

// ===== FETCH HELPERS =====
function timeout(ms) {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

// Shared: parse raw RSS/Atom XML string into items array
function parseXml(xml, feed) {
  const doc    = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML parse error');
  const isAtom = !!doc.querySelector('feed');
  const nodes  = Array.from(doc.querySelectorAll(isAtom ? 'entry' : 'item')).slice(0, 12);
  const get    = (el, sel) => el.querySelector(sel)?.textContent?.trim() || '';
  const items  = nodes.map((el) => {
    const title   = get(el, 'title');
    const pubDate = isAtom ? (get(el, 'updated') || get(el, 'published')) : (get(el, 'pubDate') || get(el, 'dc\\:date'));
    const desc    = isAtom ? (get(el, 'summary') || get(el, 'content'))   : (get(el, 'description') || get(el, 'content\\:encoded'));
    const link    = isAtom
      ? (el.querySelector('link[rel="alternate"]')?.getAttribute('href') || el.querySelector('link')?.getAttribute('href') || '')
      : (get(el, 'link') || el.querySelector('link')?.nextSibling?.nodeValue?.trim() || '');
    const cats = Array.from(el.querySelectorAll('category'))
      .map((c) => c.textContent.trim() || c.getAttribute('term') || '').filter(Boolean).slice(0, 3);
    return { title: title || 'Untitled', link: link || '#', pubDate: pubDate || null,
             snippet: stripHtml(desc).slice(0, 220), categories: cats };
  });
  return { source: feed.name, category: feed.category, color: feed.color, items };
}

// Strategy 1: codetabs.com — primary CORS proxy (most reliable from GitHub Pages)
async function fetchViaCodetabs(feed) {
  const t   = timeout(12000);
  const url = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feed.url)}`;
  try {
    const res = await fetch(url, { signal: t.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!xml || xml.trim().length < 50) throw new Error('Empty response');
    return parseXml(xml, feed);
  } finally { t.clear(); }
}

// Strategy 2: corsproxy.io — secondary fallback
async function fetchViaCorsproxy(feed) {
  const t   = timeout(12000);
  const url = `https://corsproxy.io/?url=${encodeURIComponent(feed.url)}`;
  try {
    const res = await fetch(url, { signal: t.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!xml || xml.trim().length < 50) throw new Error('Empty response');
    return parseXml(xml, feed);
  } finally { t.clear(); }
}

// Strategy 3: rss2json.com — last resort (rate-limited on free tier; works for FeedBurner feeds)
async function fetchViaRss2Json(feed) {
  const t   = timeout(8000);
  const url = `${RSS2JSON}?rss_url=${encodeURIComponent(feed.url)}&count=12`;
  try {
    const res  = await fetch(url, { signal: t.signal });
    t.clear();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== 'ok') throw new Error(json.message || 'rss2json error');
    return {
      source: feed.name, category: feed.category, color: feed.color,
      items: json.items.map((item) => ({
        title:      item.title || 'Untitled',
        link:       item.link  || '#',
        pubDate:    item.pubDate || null,
        snippet:    stripHtml(item.description || item.content || '').slice(0, 220),
        categories: Array.isArray(item.categories) ? item.categories.slice(0, 3) : [],
      })),
    };
  } finally { t.clear(); }
}

// Try all three strategies in sequence
async function fetchFeed(feed) {
  try { return await fetchViaCodetabs(feed); }
  catch (e1) { console.warn(`[codetabs]   ${feed.name}: ${e1.message}`); }
  try { return await fetchViaCorsproxy(feed); }
  catch (e2) { console.warn(`[corsproxy]  ${feed.name}: ${e2.message}`); }
  return await fetchViaRss2Json(feed); // throws if this also fails
}

// ===== LOAD ALL FEEDS =====
async function loadFeeds() {
  hideEl(els.errorScreen);
  if (state.feeds.length === 0) { hideEl(els.feedGrid); hideEl(els.statsBar); }
  setStatus('loading', 'CONNECTING...');

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const feeds   = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    console.warn(`[CyberFeed] ${FEEDS[i].name}: ${r.reason?.message}`);
    return { source: FEEDS[i].name, category: FEEDS[i].category, color: FEEDS[i].color, items: [], error: true };
  });

  const loaded = feeds.filter((f) => f.items.length > 0);
  if (loaded.length === 0) {
    showEl(els.errorScreen);
    els.errorMsg.textContent = 'Could not load any feeds. Check your connection and try again.';
    setStatus('error', 'CONNECTION FAILED');
    setRefreshBtnState(false);
    return;
  }

  state.feeds = feeds;
  hideEl(els.errorScreen);
  setStatus('online', `LIVE — ${loaded.length} SOURCES`);
  updateStats();
  renderGrid();

  // Auto-refresh every 30 min — feeds update at most hourly, and more frequent polling
  // puts unnecessary load on the free CORS proxy services being used as intermediaries
  if (state.refreshTimer) clearTimeout(state.refreshTimer);
  state.refreshTimer = setTimeout(() => loadFeeds(), 30 * 60 * 1000);
  startCacheCountdown(30 * 60);
  setRefreshBtnState(false);
}

// ===== BUILD CARD HTML =====
function buildCard(item, source, category, color) {
  const date    = formatDate(item.pubDate);
  const snippet = item.snippet ? `<p class="card-snippet">${escapeHtml(item.snippet)}</p>` : '';
  const tags    = item.categories && item.categories.length > 0
    ? `<div class="card-tags">${item.categories.map((c) =>
        `<span class="tag">#${escapeHtml(c.toLowerCase().replace(/\s+/g,'-'))}</span>`).join('')}</div>`
    : '';
  return `
    <a class="card" href="${escapeAttr(item.link)}" target="_blank" rel="noopener noreferrer"
       data-category="${escapeAttr(category)}" style="--source-color:${color};" title="${escapeAttr(item.title)}">
      <div class="card-accent"></div>
      <div class="card-body">
        <div class="card-meta">
          <span class="source-badge" style="color:${color};border-color:${color}40;">${escapeHtml(source)}</span>
          <span class="category-badge ${category}">${category.toUpperCase()}</span>
          ${date ? `<span class="card-date">${escapeHtml(date)}</span>` : ''}
        </div>
        <h2 class="card-title">${escapeHtml(item.title)}</h2>
        ${snippet}${tags}
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
    if (feed.items.length > 0) sources++;
    for (const _ of feed.items) {
      total++;
      if (feed.category === 'security') security++;
      if (feed.category === 'tech')     tech++;
    }
  }
  els.statTotal.textContent    = total;
  els.statSecurity.textContent = security;
  els.statTech.textContent     = tech;
  els.statSources.textContent  = sources;
  els.footerSources.textContent = sources;
  showEl(els.statsBar);
}

// ===== CACHE COUNTDOWN =====
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

// ===== REFRESH BUTTON =====
function setRefreshBtnState(loading) {
  els.refreshIcon.classList.toggle('spinning', loading);
  els.refreshBtn.disabled = loading;
}
els.refreshBtn.addEventListener('click', () => { setRefreshBtnState(true); loadFeeds(); });

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
