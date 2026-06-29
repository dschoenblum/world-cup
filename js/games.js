// Games list view — renders match cards grouped by date

let stageFilter = 'all'; // 'all' | 'group' | 'knockout'
let groupFilter = 'all'; // 'all' | group letter
let scrolledToToday = false;

function renderGames(games, container) {
  container.innerHTML = '';

  // Lets knockout previews resolve a placeholder opponent ("Round of 32 3
  // Winner") to the two teams that could fill it (see buildGameCard).
  const knockoutIndex = buildKnockoutIndex(games);

  container.appendChild(buildFilterBar(games, container));

  let filtered = games;
  if (stageFilter === 'group') filtered = filtered.filter(g => g.stage === 'group-stage');
  else if (stageFilter === 'knockout') filtered = filtered.filter(g => g.stage !== 'group-stage');
  if (stageFilter !== 'knockout' && groupFilter !== 'all') {
    filtered = filtered.filter(g => g.group === groupFilter);
  }

  if (filtered.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'loading-msg';
    msg.textContent = 'No matches to show.';
    container.appendChild(msg);
    return;
  }

  // Group by local date (derived from gameDate UTC string in user's timezone)
  const groups = new Map();
  for (const g of filtered) {
    const localDate = localDateStr(g.gameDate);
    if (!groups.has(localDate)) groups.set(localDate, []);
    groups.get(localDate).push(g);
  }

  const today = localDateStr(new Date().toISOString());
  let todayHeader = null;

  for (const [date, dateGames] of groups) {
    const header = document.createElement('div');
    header.className = 'date-header';
    header.textContent = formatDateHeader(date);
    if (date === today) todayHeader = header;
    container.appendChild(header);

    for (const g of dateGames) {
      container.appendChild(buildGameCard(g, knockoutIndex));
    }
  }

  // With 39 days of matches, jump to today on first load.
  // Offset by the sticky header's real height so the first match isn't clipped
  // underneath it — the header wraps taller in mobile portrait than landscape.
  if (todayHeader && !scrolledToToday) {
    scrolledToToday = true;
    const header = document.querySelector('header');
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const top = todayHeader.getBoundingClientRect().top + window.scrollY - headerH - 12;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'auto' });
  }
}

function buildFilterBar(games, container) {
  const bar = document.createElement('div');
  bar.className = 'filter-bar';

  const chips = document.createElement('div');
  chips.className = 'filter-chips';
  const stages = [['all', 'All'], ['group', 'Group Stage'], ['knockout', 'Knockout']];
  for (const [value, label] of stages) {
    const btn = document.createElement('button');
    btn.className = 'filter-chip' + (stageFilter === value ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      stageFilter = value;
      renderGames(games, container);
    });
    chips.appendChild(btn);
  }
  bar.appendChild(chips);

  const select = document.createElement('select');
  select.className = 'group-select';
  select.disabled = stageFilter === 'knockout';
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All groups';
  select.appendChild(allOpt);
  for (const letter of Object.keys(GROUPS).sort()) {
    const opt = document.createElement('option');
    opt.value = letter;
    const flags = GROUPS[letter].map(id => TEAMS[id].flag).join('');
    opt.textContent = `Group ${letter}  ${flags}`;
    select.appendChild(opt);
  }
  select.value = groupFilter;
  select.addEventListener('change', () => {
    groupFilter = select.value;
    renderGames(games, container);
  });
  bar.appendChild(select);

  return bar;
}

function buildGameCard(g, knockoutIndex) {
  const card = document.createElement('div');
  card.className = 'game-card' + (g.state === 'Live' ? ' live' : '');

  const isFinished = g.state === 'Final';
  const isLive = g.state === 'Live';
  const hasScore = g.home.score != null && g.away.score != null;
  const hideSpoilers = document.documentElement.classList.contains('no-spoilers');
  const showResult = hasScore && !hideSpoilers;

  // For a knockout slot whose opponent is still a placeholder ("Round of 32 3
  // Winner"), show the two teams that could fill it — e.g. "USA / Bosnia".
  const homeDual = g.home.placeholder ? resolveDualOpponent(g.home.name, knockoutIndex) : null;
  const awayDual = g.away.placeholder ? resolveDualOpponent(g.away.name, knockoutIndex) : null;

  // Home team (left, soccer convention)
  const homeRow = document.createElement('div');
  homeRow.className = 'team-row home' + (showResult && g.homeWinner ? ' winner' : '');
  homeRow.innerHTML = teamSideHTML(g.home, 'home', homeDual);

  // Score column
  const scoreCol = document.createElement('div');
  scoreCol.className = 'score-col';

  if (showResult) {
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score';
    const homeSpan = g.homeWinner ? `<span class="winner-score">${g.home.score}</span>` : `${g.home.score}`;
    const awaySpan = g.awayWinner ? `<span class="winner-score">${g.away.score}</span>` : `${g.away.score}`;
    scoreDiv.innerHTML = `${homeSpan}<span class="sep">–</span>${awaySpan}`;
    scoreCol.appendChild(scoreDiv);
    if (g.home.shootout != null && g.away.shootout != null) {
      const pens = document.createElement('div');
      pens.className = 'pens';
      pens.textContent = `${g.home.shootout}–${g.away.shootout} pens`;
      scoreCol.appendChild(pens);
    }
  }

  const badge = document.createElement('div');
  if (isFinished) {
    badge.className = 'status-badge final';
    badge.textContent = hideSpoilers && hasScore ? '✓ Complete' : (g.statusDetail || 'FT');
  } else if (isLive) {
    badge.className = 'status-badge live';
    badge.textContent = hideSpoilers ? '● Live' : `● ${g.statusDetail === 'HT' ? 'HT' : (g.displayClock || 'Live')}`;
  } else {
    badge.className = 'status-badge upcoming';
    badge.textContent = formatGameTime(g.gameDate);
  }
  scoreCol.appendChild(badge);

  // Away team (right)
  const awayRow = document.createElement('div');
  awayRow.className = 'team-row away' + (showResult && g.awayWinner ? ' winner' : '');
  awayRow.innerHTML = teamSideHTML(g.away, 'away', awayDual);

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'game-meta';
  const stageLabel = g.group ? `Group ${g.group}` : g.stageLabel;
  meta.innerHTML = `<span class="pool-badge">${esc(stageLabel)} · ${esc(g.venue)}</span>` +
    `<a href="https://www.espn.com/soccer/match/_/gameId/${g.id}" target="_blank" rel="noopener">Match →</a>`;

  card.append(homeRow, scoreCol, awayRow, meta);
  return card;
}

/** Render a team-row's contents: a single team, or — when `dual` is set — the
 *  two teams that could fill a not-yet-decided knockout slot ("USA / Bosnia").
 *  Home rows read name→flag (right-aligned); away rows read flag→name. */
function teamSideHTML(t, side, dual) {
  const unit = (x) => side === 'home'
    ? `<span>${esc(x.name)}</span><span class="flag" title="${esc(x.name)}">${x.flag}</span>`
    : `<span class="flag" title="${esc(x.name)}">${x.flag}</span><span>${esc(x.name)}</span>`;
  if (!dual) return unit(t);
  const [a, b] = side === 'home' ? [dual[1], dual[0]] : dual;
  return `<span class="dual-team">${unit(a)}</span>` +
    `<span class="dual-sep">/</span>` +
    `<span class="dual-team">${unit(b)}</span>`;
}

// ESPN placeholder text for a knockout slot fed by a single scheduled match,
// e.g. "Round of 32 3 Winner". Group-position placeholders ("Group A 2nd
// Place") name one of four teams, not two, so they are intentionally excluded.
const DUAL_OPPONENT_PATTERNS = [
  [/^Round of 32 (\d+) Winner$/, 'round-of-32'],
  [/^Round of 16 (\d+) Winner$/, 'round-of-16'],
  [/^Quarterfinal (\d+) Winner$/, 'quarterfinals'],
  [/^Semifinal (\d+) (?:Winner|Loser)$/, 'semifinals'],
];

/** Group knockout games by stage, each list ordered by kickoff time. ESPN
 *  numbers placeholder matches ("Round of 32 N") in that order. */
function buildKnockoutIndex(games) {
  const byStage = {};
  for (const g of games) {
    if (g.stage === 'group-stage') continue;
    (byStage[g.stage] ||= []).push(g);
  }
  for (const list of Object.values(byStage)) {
    list.sort((a, b) => a.gameDate.localeCompare(b.gameDate));
  }
  return byStage;
}

/** Resolve a placeholder opponent name to the two teams of its feeder match,
 *  or null if it can't be narrowed to two known teams yet. */
function resolveDualOpponent(placeholderName, knockoutIndex) {
  for (const [re, stage] of DUAL_OPPONENT_PATTERNS) {
    const m = placeholderName.match(re);
    if (!m) continue;
    const feeder = (knockoutIndex[stage] || [])[Number(m[1]) - 1];
    if (!feeder || feeder.home.placeholder || feeder.away.placeholder) return null;
    return [feeder.home, feeder.away];
  }
  return null;
}

function formatDateHeader(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatGameTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Convert an ISO UTC datetime string to a YYYY-MM-DD string in the user's local timezone */
function localDateStr(isoStr) {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
