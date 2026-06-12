// Entry point: init, routing, auto-refresh

document.addEventListener('DOMContentLoaded', function () {

let games = [];
let standings = null;
let refreshTimer = null;
const REFRESH_INTERVAL = 60_000; // 60 seconds

// DOM refs
const gamesView = document.getElementById('games-view');
const standingsView = document.getElementById('standings-view');
const bracketView = document.getElementById('bracket-view');
const refreshBtn = document.getElementById('refresh-btn');
const lastUpdatedEl = document.getElementById('last-updated');

// ── Routing ──
function getView() {
  const hash = window.location.hash.replace('#', '') || 'games';
  return ['games', 'standings', 'bracket'].includes(hash) ? hash : 'games';
}

function setActiveView(view) {
  // Update nav
  document.querySelectorAll('nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + view);
  });
  // Toggle views
  gamesView.classList.toggle('active', view === 'games');
  standingsView.classList.toggle('active', view === 'standings');
  bracketView.classList.toggle('active', view === 'bracket');
}

function renderCurrentView() {
  const view = getView();
  setActiveView(view);
  if (view === 'games') renderGames(games, gamesView);
  else if (view === 'standings') renderStandings(standings, standingsView);
  else if (view === 'bracket') renderBracket(games, bracketView);
}

// ── Data Loading ──
async function loadData() {
  refreshBtn.classList.add('loading');
  try {
    // Fetch independently so one failing endpoint doesn't blank the other views
    const [gamesRes, standingsRes] = await Promise.allSettled([fetchGames(), fetchStandings()]);
    if (gamesRes.status === 'fulfilled') games = gamesRes.value;
    if (standingsRes.status === 'fulfilled') standings = standingsRes.value;
    if (gamesRes.status === 'rejected' && standingsRes.status === 'rejected') throw gamesRes.reason;
    renderCurrentView();
    lastUpdatedEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    console.error('Failed to load data:', err);
    const view = document.querySelector('.view.active');
    if (view && games.length === 0) {
      view.innerHTML = `<div class="error-msg">
        Failed to load data. <button onclick="location.reload()">Retry</button>
      </div>`;
    }
  } finally {
    refreshBtn.classList.remove('loading');
  }
}

// ── Auto-refresh ──
function startAutoRefresh() {
  stopAutoRefresh();
  const today = new Date().toISOString().slice(0, 10);
  if (today >= TOURNAMENT.startDate && today <= TOURNAMENT.endDate) {
    refreshTimer = setInterval(loadData, REFRESH_INTERVAL);
  }
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// ── Init ──
window.addEventListener('hashchange', renderCurrentView);

refreshBtn.addEventListener('click', () => {
  loadData();
  startAutoRefresh(); // reset timer
});

// Nav link clicks
document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = link.getAttribute('href');
  });
});

// ── Spoiler Toggle ──
const SPOILER_ICONS = {
  show: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  hide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
};

const spoilerBtn = document.getElementById('spoiler-btn');
let spoilersHidden = localStorage.getItem('spoilers') !== 'show';

function applySpoilerMode(hidden) {
  spoilersHidden = hidden;
  localStorage.setItem('spoilers', hidden ? 'hide' : 'show');
  document.documentElement.classList.toggle('no-spoilers', hidden);
  spoilerBtn.innerHTML = hidden ? SPOILER_ICONS.hide : SPOILER_ICONS.show;
  spoilerBtn.title = hidden ? 'Show scores' : 'Hide scores';
  spoilerBtn.setAttribute('aria-label', hidden ? 'Show scores' : 'Hide scores');
  renderCurrentView();
}

spoilerBtn.addEventListener('click', () => {
  applySpoilerMode(!spoilersHidden);
});

// Apply initial icon (class already set in inline script)
spoilerBtn.innerHTML = spoilersHidden ? SPOILER_ICONS.hide : SPOILER_ICONS.show;
spoilerBtn.title = spoilersHidden ? 'Show scores' : 'Hide scores';
spoilerBtn.setAttribute('aria-label', spoilersHidden ? 'Show scores' : 'Hide scores');

// ── Theme Switching ──
const THEME_ICONS = {
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
};
const THEME_TITLES = { auto: 'Theme: Auto', light: 'Theme: Light', dark: 'Theme: Dark' };
const THEME_CYCLE = { auto: 'light', light: 'dark', dark: 'auto' };

const themeBtn = document.getElementById('theme-btn');
let currentTheme = localStorage.getItem('theme') || 'auto';

function applyTheme(theme) {
  currentTheme = theme;
  if (theme === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  localStorage.setItem('theme', theme);
  themeBtn.innerHTML = THEME_ICONS[theme];
  themeBtn.title = THEME_TITLES[theme];
  themeBtn.setAttribute('aria-label', THEME_TITLES[theme]);
}

themeBtn.addEventListener('click', () => {
  applyTheme(THEME_CYCLE[currentTheme]);
});

applyTheme(currentTheme);

// Refresh when returning to the tab after it's been hidden
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    loadData();
    startAutoRefresh(); // reset timer so next tick is a full interval away
  } else {
    stopAutoRefresh(); // no point refreshing a hidden tab
  }
});

// Refresh when page is restored from bfcache (back-forward navigation)
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    loadData();
    startAutoRefresh();
  }
});

// Boot
loadData().then(startAutoRefresh);

}); // DOMContentLoaded
