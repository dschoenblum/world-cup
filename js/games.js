// Games list view — renders match cards grouped by date

let stageFilter = 'all'; // 'all' | 'group' | 'knockout'
let groupFilter = 'all'; // 'all' | group letter
let scrolledToToday = false;

function renderGames(games, container) {
  container.innerHTML = '';

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
      container.appendChild(buildGameCard(g));
    }
  }

  // With 39 days of matches, jump to today on first load
  if (todayHeader && !scrolledToToday) {
    scrolledToToday = true;
    todayHeader.scrollIntoView({ block: 'start' });
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

function buildGameCard(g) {
  const card = document.createElement('div');
  card.className = 'game-card' + (g.state === 'Live' ? ' live' : '');

  const isFinished = g.state === 'Final';
  const isLive = g.state === 'Live';
  const hasScore = g.home.score != null && g.away.score != null;
  const hideSpoilers = document.documentElement.classList.contains('no-spoilers');
  const showResult = hasScore && !hideSpoilers;

  // Home team (left, soccer convention)
  const homeRow = document.createElement('div');
  homeRow.className = 'team-row home' + (showResult && g.homeWinner ? ' winner' : '');
  homeRow.innerHTML = `<span>${esc(g.home.name)}</span><span class="flag" title="${esc(g.home.name)}">${g.home.flag}</span>`;

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
  awayRow.innerHTML = `<span class="flag" title="${esc(g.away.name)}">${g.away.flag}</span><span>${esc(g.away.name)}</span>`;

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'game-meta';
  const stageLabel = g.group ? `Group ${g.group}` : g.stageLabel;
  meta.innerHTML = `<span class="pool-badge">${esc(stageLabel)} · ${esc(g.venue)}</span>` +
    `<a href="https://www.espn.com/soccer/match/_/gameId/${g.id}" target="_blank" rel="noopener">Match →</a>`;

  card.append(homeRow, scoreCol, awayRow, meta);
  return card;
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
