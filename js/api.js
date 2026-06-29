// ESPN API fetching and data normalization

const SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200';
const STANDINGS_URL =
  'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026';

/**
 * Fetch all World Cup matches from the ESPN API.
 * Returns an array of normalized game objects sorted by date/time.
 */
async function fetchGames() {
  const res = await fetch(SCOREBOARD_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  const games = (data.events || []).map(normalizeGame);
  games.sort((a, b) => a.gameDate.localeCompare(b.gameDate));
  return games;
}

function normalizeGame(e) {
  const comp = e.competitions[0];
  const homeC = comp.competitors.find(c => c.homeAway === 'home');
  const awayC = comp.competitors.find(c => c.homeAway === 'away');
  const status = comp.status || {};
  const stype = status.type || {};
  const state = { pre: 'Preview', in: 'Live', post: 'Final' }[stype.state] || 'Preview';
  const completed = !!stype.completed;
  const stage = e.season?.slug || 'group-stage';
  const venueParts = [comp.venue?.fullName, comp.venue?.address?.city].filter(Boolean);

  const side = (c) => ({
    ...getTeam(Number(c.team.id), c.team.displayName),
    id: Number(c.team.id),
    placeholder: !TEAMS[c.team.id],
    score: state === 'Preview' ? null : Number(c.score ?? 0),
    // shootoutScore shape unverified for AET/penalty matches; field absent on FT wins (event 760486)
    shootout: c.shootoutScore != null ? Number(c.shootoutScore) : null,
  });

  const home = side(homeC);
  const away = side(awayC);

  return {
    id: e.id,
    gameDate: e.date, // ISO UTC string
    stage,
    stageLabel: STAGES[stage] || stage,
    group: stage === 'group-stage' ? (home.group || away.group) : null, // letter, e.g. 'A'
    state, // Preview, Live, Final
    statusDetail: stype.shortDetail || stype.detail || '', // "FT", "HT", "AET"
    displayClock: status.displayClock || '', // "67'", "90'+8'"
    venue: venueParts.join(', '),
    home,
    away,
    homeWinner: completed && !!homeC.winner,
    awayWinner: completed && !!awayC.winner,
    draw: completed && !homeC.winner && !awayC.winner,
  };
}

/**
 * Fetch group standings from the ESPN API. ESPN applies official FIFA
 * tiebreakers and best-third advancement notes, but the entries array is NOT
 * ordered by position — the position lives in each entry's `rank` stat, so we
 * sort by it ourselves.
 * Returns [{ group: 'Group A', rows: [{ id, name, flag, rank, gp, w, d, l, gf, ga, gd, pts, note }] }]
 */
async function fetchStandings() {
  const res = await fetch(STANDINGS_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return (data.children || []).map(child => {
    const rows = (child.standings?.entries || []).map((entry, i) => {
      const team = getTeam(Number(entry.team.id), entry.team.displayName);
      const stat = (name) => (entry.stats || []).find(s => s.name === name);
      const val = (name) => stat(name)?.value ?? 0;
      return {
        id: Number(entry.team.id),
        name: team.name,
        flag: team.flag,
        rank: val('rank') || i + 1,
        gp: val('gamesPlayed'),
        w: val('wins'),
        d: val('ties'),
        l: val('losses'),
        gf: val('pointsFor'),
        ga: val('pointsAgainst'),
        gd: stat('pointDifferential')?.displayValue ?? '0',
        pts: val('points'),
        note: entry.note || null,
      };
    });
    rows.sort((a, b) => a.rank - b.rank);
    return { group: child.name, rows };
  });
}
