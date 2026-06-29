// Static tournament data for the 2026 FIFA World Cup

const TOURNAMENT = {
  startDate: '2026-06-11',
  endDate: '2026-07-19',
};

const STAGES = {
  'group-stage': 'Group Stage',
  'round-of-32': 'Round of 32',
  'round-of-16': 'Round of 16',
  'quarterfinals': 'Quarterfinals',
  'semifinals': 'Semifinals',
  '3rd-place-match': 'Third Place',
  'final': 'Final',
};

// ESPN team ID → display info
const TEAMS = {
  // Group A
  203: { name: 'Mexico', code: 'MEX', flag: '🇲🇽', group: 'A' },
  450: { name: 'Czechia', code: 'CZE', flag: '🇨🇿', group: 'A' },
  451: { name: 'South Korea', code: 'KOR', flag: '🇰🇷', group: 'A' },
  467: { name: 'South Africa', code: 'RSA', flag: '🇿🇦', group: 'A' },
  // Group B
  206: { name: 'Canada', code: 'CAN', flag: '🇨🇦', group: 'B' },
  452: { name: 'Bosnia-Herzegovina', code: 'BIH', flag: '🇧🇦', group: 'B' },
  475: { name: 'Switzerland', code: 'SUI', flag: '🇨🇭', group: 'B' },
  4398: { name: 'Qatar', code: 'QAT', flag: '🇶🇦', group: 'B' },
  // Group C
  205: { name: 'Brazil', code: 'BRA', flag: '🇧🇷', group: 'C' },
  580: { name: 'Scotland', code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C' },
  2654: { name: 'Haiti', code: 'HAI', flag: '🇭🇹', group: 'C' },
  2869: { name: 'Morocco', code: 'MAR', flag: '🇲🇦', group: 'C' },
  // Group D
  210: { name: 'Paraguay', code: 'PAR', flag: '🇵🇾', group: 'D' },
  465: { name: 'Türkiye', code: 'TUR', flag: '🇹🇷', group: 'D' },
  628: { name: 'Australia', code: 'AUS', flag: '🇦🇺', group: 'D' },
  660: { name: 'United States', code: 'USA', flag: '🇺🇸', group: 'D' },
  // Group E
  209: { name: 'Ecuador', code: 'ECU', flag: '🇪🇨', group: 'E' },
  481: { name: 'Germany', code: 'GER', flag: '🇩🇪', group: 'E' },
  4789: { name: 'Ivory Coast', code: 'CIV', flag: '🇨🇮', group: 'E' },
  11678: { name: 'Curaçao', code: 'CUW', flag: '🇨🇼', group: 'E' },
  // Group F
  449: { name: 'Netherlands', code: 'NED', flag: '🇳🇱', group: 'F' },
  466: { name: 'Sweden', code: 'SWE', flag: '🇸🇪', group: 'F' },
  627: { name: 'Japan', code: 'JPN', flag: '🇯🇵', group: 'F' },
  659: { name: 'Tunisia', code: 'TUN', flag: '🇹🇳', group: 'F' },
  // Group G
  459: { name: 'Belgium', code: 'BEL', flag: '🇧🇪', group: 'G' },
  469: { name: 'Iran', code: 'IRN', flag: '🇮🇷', group: 'G' },
  2620: { name: 'Egypt', code: 'EGY', flag: '🇪🇬', group: 'G' },
  2666: { name: 'New Zealand', code: 'NZL', flag: '🇳🇿', group: 'G' },
  // Group H
  164: { name: 'Spain', code: 'ESP', flag: '🇪🇸', group: 'H' },
  212: { name: 'Uruguay', code: 'URU', flag: '🇺🇾', group: 'H' },
  655: { name: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦', group: 'H' },
  2597: { name: 'Cape Verde', code: 'CPV', flag: '🇨🇻', group: 'H' },
  // Group I
  464: { name: 'Norway', code: 'NOR', flag: '🇳🇴', group: 'I' },
  478: { name: 'France', code: 'FRA', flag: '🇫🇷', group: 'I' },
  654: { name: 'Senegal', code: 'SEN', flag: '🇸🇳', group: 'I' },
  4375: { name: 'Iraq', code: 'IRQ', flag: '🇮🇶', group: 'I' },
  // Group J
  202: { name: 'Argentina', code: 'ARG', flag: '🇦🇷', group: 'J' },
  474: { name: 'Austria', code: 'AUT', flag: '🇦🇹', group: 'J' },
  624: { name: 'Algeria', code: 'ALG', flag: '🇩🇿', group: 'J' },
  2917: { name: 'Jordan', code: 'JOR', flag: '🇯🇴', group: 'J' },
  // Group K
  208: { name: 'Colombia', code: 'COL', flag: '🇨🇴', group: 'K' },
  482: { name: 'Portugal', code: 'POR', flag: '🇵🇹', group: 'K' },
  2570: { name: 'Uzbekistan', code: 'UZB', flag: '🇺🇿', group: 'K' },
  2850: { name: 'Congo DR', code: 'COD', flag: '🇨🇩', group: 'K' },
  // Group L
  448: { name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L' },
  477: { name: 'Croatia', code: 'CRO', flag: '🇭🇷', group: 'L' },
  2659: { name: 'Panama', code: 'PAN', flag: '🇵🇦', group: 'L' },
  4469: { name: 'Ghana', code: 'GHA', flag: '🇬🇭', group: 'L' },
};

// Group letter → team IDs (alphabetical by team name, for spoiler-safe display order)
const GROUPS = {};
for (const [id, t] of Object.entries(TEAMS)) {
  if (!GROUPS[t.group]) GROUPS[t.group] = [];
  GROUPS[t.group].push(Number(id));
}
for (const ids of Object.values(GROUPS)) {
  ids.sort((a, b) => TEAMS[a].name.localeCompare(TEAMS[b].name));
}

// Bracket layout keyed by ESPN event ID. Knockout fixtures pre-exist in the API
// with placeholder teams, so no seed resolution is needed — ESPN fills in real
// teams as rounds complete. Column order is arranged so the pair of matches at
// indices 2k and 2k+1 feeds the match at index k in the next column ("Round of
// 32 N" placeholders are numbered in kickoff order, matching FIFA match order).
const BRACKET_COLUMNS = [
  {
    title: 'Round of 32',
    ids: ['760486', '760489', '760487', '760490', '760497', '760496', '760493', '760494',
          '760488', '760492', '760491', '760495', '760498', '760500', '760499', '760501'],
  },
  {
    title: 'Round of 16',
    ids: ['760502', '760503', '760506', '760507', '760504', '760505', '760508', '760509'],
  },
  { title: 'Quarterfinals', ids: ['760510', '760511', '760512', '760513'] },
  { title: 'Semifinals', ids: ['760514', '760515'] },
  { title: 'Final', ids: ['760517'] },
];

const THIRD_PLACE_ID = '760516';

// Get team display info, with fallback for knockout placeholders ("Group A 2nd Place")
function getTeam(teamId, apiName) {
  if (TEAMS[teamId]) return TEAMS[teamId];
  return { name: apiName || `Team ${teamId}`, code: '', flag: '⚽', group: null };
}
