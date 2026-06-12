// Bracket rendering — Round of 32 → Round of 16 → QF → SF → Final.
// Knockout fixtures pre-exist in the API keyed by event ID (see BRACKET_COLUMNS
// in data.js); ESPN swaps placeholder teams for real ones as rounds complete,
// so no winner-resolution logic is needed here.

function renderBracket(games, container) {
  container.innerHTML = '';
  const hideSpoilers = document.documentElement.classList.contains('no-spoilers');
  const byId = new Map(games.map(g => [String(g.id), g]));

  const bracketContainer = document.createElement('div');
  bracketContainer.className = 'bracket-container';

  const bracket = document.createElement('div');
  bracket.className = 'bracket';

  BRACKET_COLUMNS.forEach((col, colIndex) => {
    const round = document.createElement('div');
    round.className = 'bracket-round';
    const h3 = document.createElement('h3');
    h3.textContent = col.title;
    round.appendChild(h3);

    const slots = document.createElement('div');
    slots.className = 'slots';
    for (const id of col.ids) {
      const slot = document.createElement('div');
      slot.className = 'bracket-slot';
      slot.appendChild(buildMatchCard(byId.get(id), hideSpoilers, colIndex === 0));
      slots.appendChild(slot);
    }
    round.appendChild(slots);

    if (col.title === 'Final') {
      const thirdTitle = document.createElement('h3');
      thirdTitle.textContent = 'Third Place';
      round.appendChild(thirdTitle);
      round.appendChild(buildMatchCard(byId.get(THIRD_PLACE_ID), hideSpoilers, false));
    }

    bracket.appendChild(round);
  });

  bracketContainer.appendChild(bracket);

  const hint = document.createElement('div');
  hint.className = 'bracket-hint';
  hint.textContent = 'Scroll →';
  container.appendChild(hint);
  container.appendChild(bracketContainer);

  // Champion badge (only when spoilers visible)
  if (!hideSpoilers) {
    const final = byId.get('760517');
    if (final && final.state === 'Final') {
      const winner = final.homeWinner ? final.home : final.awayWinner ? final.away : null;
      if (winner && !winner.placeholder) {
        const badge = document.createElement('div');
        badge.className = 'champion-badge';
        badge.innerHTML = `<div class="trophy">🏆</div>
          <div class="champ-name"><span class="flag" title="${esc(winner.name)}">${winner.flag}</span> ${esc(winner.name)}</div>
          <div class="label">2026 FIFA World Cup Champion</div>`;
        container.appendChild(badge);
      }
    }
  }
}

function buildMatchCard(g, hideSpoilers, isFirstRound) {
  const matchup = document.createElement('div');
  matchup.className = 'bracket-matchup';
  if (!g) {
    matchup.innerHTML = `<div class="bracket-team tbd"><span>TBD</span></div>
      <div class="bracket-team tbd"><span>TBD</span></div>`;
    return matchup;
  }

  const showScores = !hideSpoilers && g.state !== 'Preview';

  for (const side of ['home', 'away']) {
    const t = g[side];
    const div = document.createElement('div');
    // In spoiler mode, who reached each round past the R32 is itself a spoiler
    const spoilerHidden = hideSpoilers && !isFirstRound && !t.placeholder;
    if (t.placeholder || spoilerHidden) {
      div.className = 'bracket-team tbd';
      div.innerHTML = `<span>${esc(spoilerHidden ? 'TBD' : placeholderLabel(t.name))}</span>`;
    } else {
      const isWinner = !hideSpoilers && (side === 'home' ? g.homeWinner : g.awayWinner);
      div.className = 'bracket-team' + (isWinner ? ' winner' : '');
      const pens = showScores && t.shootout != null ? ` <span class="seed">(${t.shootout})</span>` : '';
      const scoreSpan = showScores && t.score != null
        ? `<span class="bracket-score">${t.score}${pens}</span>` : '';
      div.innerHTML = `<span><span class="flag" title="${esc(t.name)}">${t.flag}</span> ${esc(t.name)}</span>${scoreSpan}`;
    }
    matchup.appendChild(div);
  }

  const label = document.createElement('div');
  label.className = 'bracket-label';
  const date = new Date(g.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const venueShort = (g.venue || '').split(',')[0];
  label.textContent = `${date} · ${venueShort}`;
  matchup.appendChild(label);

  return matchup;
}

/** Compress ESPN placeholder team names to fit bracket slots */
function placeholderLabel(name) {
  return name
    .replace(/^Group ([A-L]) Winner$/, '1st · Group $1')
    .replace(/^Group ([A-L]) 2nd Place$/, '2nd · Group $1')
    .replace(/^Third Place Group ([A-Z/]+)$/, '3rd · $1')
    .replace(/^Round of 32 (\d+) Winner$/, 'Winner · R32-$1')
    .replace(/^Round of 16 (\d+) Winner$/, 'Winner · R16-$1')
    .replace(/^Quarterfinal (\d+) Winner$/, 'Winner · QF$1')
    .replace(/^Semifinal (\d+) (Winner|Loser)$/, '$2 · SF$1');
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
