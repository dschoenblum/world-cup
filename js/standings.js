// Group standings rendering — rows arrive sorted by ESPN's rank stat (see
// fetchStandings) with official FIFA tiebreakers and advancement notes applied.
// Live group-stage matches are folded in as if final (soccer "live table"
// convention), flagged with a colored dot per team, and — while any match is
// live — the qualifying-position highlighting is recomputed from the live table
// rather than ESPN's clinch-based notes.

function renderStandings(standings, container, games) {
  container.innerHTML = '';
  const hideSpoilers = document.documentElement.classList.contains('no-spoilers');

  if (!standings || standings.length === 0) {
    container.innerHTML = `<div class="error-msg">
      Standings unavailable. <button onclick="location.reload()">Retry</button>
    </div>`;
    return;
  }

  // Per-team live state from in-progress group-stage matches
  const liveByTeam = buildLiveMap(games);
  const anyLive = liveByTeam.size > 0;

  // Fold live results into every group up front so best-third selection (a
  // cross-group comparison) can see all 12 groups' provisional stats at once.
  const adjustedGroups = hideSpoilers
    ? null
    : standings.map(g => ({ group: g.group, rows: applyLiveResults(g.rows, liveByTeam, games) }));

  // While any match is live, color qualifying positions from the live table so
  // green/amber react to live results. With no live match we defer to ESPN's
  // notes, which simply color each row by its current position zone.
  const liveQual = (anyLive && !hideSpoilers) ? computeLiveQualification(adjustedGroups) : null;

  // Mathematically locked / eliminated status, computed from the fixtures (see
  // clinch.js). Independent of the live/position coloring above: a badge only
  // appears once an outcome is guaranteed, no matter the in-progress scores.
  const clinch = hideSpoilers ? null : computeClinchStatus(games);

  standings.forEach((groupData, gi) => {
    const section = document.createElement('div');
    section.className = 'pool-section';

    const title = document.createElement('div');
    title.className = 'pool-title';
    title.textContent = groupData.group;
    section.appendChild(title);

    const table = document.createElement('table');
    table.innerHTML = hideSpoilers
      ? `<thead><tr><th>Team</th></tr></thead>`
      : `<thead><tr>
      <th>Team</th><th>GP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');

    if (hideSpoilers) {
      // ESPN's row order itself reveals results — show static alphabetical order.
      // A neutral (uncolored) dot marks teams in a live match without spoiling it.
      const letter = groupData.group.slice(-1);
      for (const id of GROUPS[letter] || []) {
        const t = TEAMS[id];
        const dot = liveByTeam.has(id) ? liveDot('neutral', 'In a live match') : '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><div class="team-cell">
            <span class="flag" title="${esc(t.name)}">${t.flag}</span> <span class="team-name">${esc(t.name)}</span>${dot}
          </div></td>`;
        tbody.appendChild(tr);
      }
    } else {
      adjustedGroups[gi].rows.forEach(row => {
        const tr = document.createElement('tr');
        const ci = clinch.get(row.id);
        const cls = rowClass(row, liveQual);
        if (cls) tr.className = cls;
        const dot = row.live ? liveDot(row.liveResult, LIVE_TITLES[row.liveResult]) : '';
        const nameCls = clinchNameClass(ci);
        const nameTitle = clinchNameTitle(ci);
        const titleAttr = nameTitle ? ` title="${esc(nameTitle)}"` : '';
        tr.innerHTML = `
          <td><div class="team-cell">
            <span class="rank">${row.rank}</span>
            <span class="flag" title="${esc(row.name)}">${row.flag}</span> <span class="team-name${nameCls}"${titleAttr}>${esc(row.name)}</span>${dot}
          </div></td>
          <td>${row.gp}</td><td>${row.w}</td><td>${row.d}</td><td>${row.l}</td>
          <td>${row.gf}</td><td>${row.ga}</td><td>${esc(String(row.gd))}</td><td>${row.pts}</td>`;
        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
  });

  if (!hideSpoilers) {
    const legend = document.createElement('div');
    legend.className = 'standings-legend';
    legend.innerHTML = 'Green: advancing to the Round of 32 · Amber: in best-third position. Top 2 in each group and the 8 best third-place teams advance.' +
      '<br>Team names (mathematically locked): <span class="team-name clinch-first">bold + underlined</span> clinched the group · ' +
      '<span class="team-name clinch-ko">bold</span> clinched a Round of 32 spot · ' +
      '<span class="team-name eliminated">struck through</span> eliminated.';
    if (anyLive) {
      legend.innerHTML += '<br>Live matches are counted as if final, so positions and highlighting are provisional. Dot: ' +
        '<span class="live-dot winning"></span> winning · ' +
        '<span class="live-dot drawing"></span> drawing · ' +
        '<span class="live-dot losing"></span> losing.';
    }
    container.appendChild(legend);
  }
}

const LIVE_TITLES = {
  winning: 'Live — winning',
  drawing: 'Live — drawing',
  losing: 'Live — losing',
};

function liveDot(kind, title) {
  return ` <span class="live-dot ${kind}" title="${esc(title)}" aria-label="${esc(title)}"></span>`;
}

/**
 * Pick the row CSS class — the green/amber qualifying-zone background. Comes
 * from the current live table (liveQual) when a match is in progress, otherwise
 * from ESPN's position-zone notes. Clinch/elimination is shown on the team name
 * instead (see clinchNameClass).
 */
function rowClass(row, liveQual) {
  if (liveQual) {
    const q = liveQual.get(row.id);
    return q || ''; // 'qualified' | 'qualified-third'
  }
  // Note descriptions seen: "Advance to Round of 32", "Best 8 advance", "Eliminated"
  const desc = (row.note?.description || '').toLowerCase();
  if (desc.includes('best 8')) return 'qualified-third';
  if (desc.includes('advance')) return 'qualified';
  return '';
}

/**
 * Typographic marker for a mathematically locked outcome, applied to the team
 * name. Strongest first: guaranteed group win (bold + underline), guaranteed
 * Round of 32 spot (bold), elimination (struck through). Title text gives the
 * meaning on hover; '' when nothing is decided yet (the common mid-group case).
 */
function clinchNameClass(ci) {
  if (!ci) return '';
  if (ci.clinchFirst) return ' clinch-first';
  if (ci.clinchKnockout) return ' clinch-ko';
  if (ci.eliminated) return ' eliminated';
  return '';
}

function clinchNameTitle(ci) {
  if (!ci) return '';
  if (ci.clinchFirst) return 'Clinched 1st place — guaranteed to win the group';
  if (ci.clinchKnockout) return 'Clinched a spot in the Round of 32';
  if (ci.eliminated) return 'Eliminated — cannot finish in the top 3 of the group';
  return '';
}

/**
 * Derive qualifying positions from the (live-adjusted, sorted) groups:
 * top 2 of each group plus the 8 best third-place teams across all groups.
 * Third-place teams are ranked by points / goal difference / goals for — FIFA's
 * primary best-third tiebreakers. Returns Map<teamId, 'qualified'|'qualified-third'>.
 */
function computeLiveQualification(adjustedGroups) {
  const status = new Map();
  const thirds = [];
  for (const g of adjustedGroups) {
    g.rows.forEach((row, i) => {
      if (i < 2) status.set(row.id, 'qualified');
      else if (i === 2) thirds.push(row);
    });
  }
  thirds.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  thirds.slice(0, 8).forEach(row => status.set(row.id, 'qualified-third'));
  return status;
}

/**
 * Map each team currently in a live group-stage match to its provisional
 * contribution: goals for/against and result (winning/drawing/losing).
 * Returns Map<teamId, { gf, ga, result }>.
 */
function buildLiveMap(games) {
  const map = new Map();
  for (const g of games || []) {
    if (g.state !== 'Live' || g.stage !== 'group-stage') continue;
    const hs = g.home.score, as = g.away.score;
    if (hs == null || as == null) continue;
    map.set(g.home.id, { gf: hs, ga: as, result: cmpResult(hs, as) });
    map.set(g.away.id, { gf: as, ga: hs, result: cmpResult(as, hs) });
  }
  return map;
}

function cmpResult(forGoals, againstGoals) {
  if (forGoals > againstGoals) return 'winning';
  if (forGoals < againstGoals) return 'losing';
  return 'drawing';
}

/**
 * Fold live results into the (final-only) standings rows as if they were
 * complete, then re-sort the group with the full 2026 tiebreaker chain — points,
 * then head-to-head (which now outranks overall goal difference), then overall
 * GD / goals (see rankGroupRows). We only re-rank when a group has a live match;
 * otherwise ESPN's official ordering is left untouched.
 */
function applyLiveResults(rows, liveByTeam, games) {
  let anyLive = false;
  const adjusted = rows.map(row => {
    const live = liveByTeam.get(row.id);
    if (!live) return { ...row, live: false };
    anyLive = true;
    const win = live.result === 'winning';
    const draw = live.result === 'drawing';
    const gf = row.gf + live.gf;
    const ga = row.ga + live.ga;
    return {
      ...row,
      gp: row.gp + 1,
      w: row.w + (win ? 1 : 0),
      d: row.d + (draw ? 1 : 0),
      l: row.l + (!win && !draw ? 1 : 0),
      gf,
      ga,
      gd: fmtGd(gf - ga),
      pts: row.pts + (win ? 3 : draw ? 1 : 0),
      live: true,
      liveResult: live.result,
    };
  });

  if (anyLive) {
    const ids = new Set(adjusted.map(r => r.id));
    const ranked = rankGroupRows(adjusted, effectiveGroupResults(games, ids));
    ranked.forEach((r, i) => { r.rank = i + 1; });
    return ranked;
  }
  return adjusted;
}

/**
 * Effective head-to-head results among a group's teams for the live table:
 * completed matches at their final score plus in-progress matches at their
 * current score. Upcoming matches are excluded. Returns [{a, b, ag, bg}].
 */
function effectiveGroupResults(games, idSet) {
  const out = [];
  for (const g of games || []) {
    if (g.stage !== 'group-stage' || !g.home || !g.away) continue;
    if (!idSet.has(g.home.id) || !idSet.has(g.away.id)) continue;
    if (g.state !== 'Final' && g.state !== 'Live') continue;
    if (g.home.score == null || g.away.score == null) continue;
    out.push({ a: g.home.id, b: g.away.id, ag: g.home.score, bg: g.away.score });
  }
  return out;
}

function fmtGd(n) {
  return n > 0 ? `+${n}` : String(n);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
