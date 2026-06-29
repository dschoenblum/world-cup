// Exact group-stage clinch / elimination math.
//
// ESPN's standings `note` field only labels each team by its CURRENT position
// zone (rank 1–2 "Advance", rank 3 "Best 8 advance", rank 4 "Eliminated") — the
// same pattern in every group regardless of games played — so it cannot tell a
// team that has mathematically locked a spot from one that merely sits there
// today. We compute the real thing from the fixtures instead.
//
// 2026 tiebreaker order (FIFA changed this for this tournament — head-to-head is
// now applied BEFORE overall goal difference):
//   1. points
//   2. head-to-head points (among the tied teams)
//   3. head-to-head goal difference
//   4. head-to-head goals scored
//   5. overall goal difference
//   6. overall goals scored
//   (then fair-play / drawing of lots — treated as undetermined here)
//
// Method: only COMPLETED matches are treated as known; every live or upcoming
// group match is an unknown whose win/draw/loss is enumerated (3^k per group,
// k ≤ 6 → ≤ 729 cheap scenarios). Goal margins are unbounded and mostly free, so
// any criterion that would depend on a not-yet-played margin is treated as
// "undetermined" and the affected teams form a residual tie whose internal order
// could go either way. We then take, per team across all scenarios:
//   worst finishing rank (best case for rivals) → drives clinching
//   best  finishing rank (best case for the team) → drives elimination
// This never produces a false "clinched"/"eliminated" label: a residual tie is
// resolved against the team for clinching and in its favour for elimination, so
// a label only appears when it holds for every reachable outcome and every legal
// set of scorelines.

/**
 * @param {Array} games normalized games (see api.js)
 * @returns {Map<number, {clinchFirst:boolean, clinchKnockout:boolean, eliminated:boolean}>}
 */
function computeClinchStatus(games) {
  const result = new Map();
  if (!games || typeof GROUPS === 'undefined') return result;

  const groupGamesAll = games.filter(
    g => g.stage === 'group-stage' && g.home && g.away &&
         g.home.id != null && g.away.id != null
  );

  for (const letter of Object.keys(GROUPS)) {
    const teamIds = GROUPS[letter];
    const idset = new Set(teamIds);
    const groupGames = groupGamesAll.filter(g => idset.has(g.home.id) && idset.has(g.away.id));
    // Only completed matches are settled; live + upcoming are unknowns.
    const played = groupGames.filter(g => g.state === 'Final');
    const remaining = groupGames.filter(g => g.state !== 'Final');

    const worstMax = new Map(teamIds.map(id => [id, 0]));   // worst rank seen
    const bestMin = new Map(teamIds.map(id => [id, 99]));   // best rank seen

    const k = remaining.length;
    const total = 3 ** k;
    for (let mask = 0; mask < total; mask++) {
      const outcomes = [];
      let m = mask;
      for (let i = 0; i < k; i++) { outcomes.push(m % 3); m = Math.floor(m / 3); }

      const blocks = rankScenario(teamIds, played, remaining, outcomes);
      let above = 0;
      for (const block of blocks) {
        const best = above + 1;
        const worst = above + block.length;
        for (const id of block) {
          if (worst > worstMax.get(id)) worstMax.set(id, worst);
          if (best < bestMin.get(id)) bestMin.set(id, best);
        }
        above += block.length;
      }
    }

    for (const id of teamIds) {
      const wMax = worstMax.get(id);
      const bMin = bestMin.get(id);
      result.set(id, {
        clinchFirst: wMax === 1,        // 1st in every scenario
        clinchKnockout: wMax <= 2,      // top 2 in every scenario
        eliminated: bMin >= 4,          // never reaches the top 3 → cannot advance
      });
    }
  }
  return result;
}

/**
 * Rank a group for one scenario. Returns an ordered list of "blocks"; a block of
 * one is a settled position, a block of several is a residual tie whose order is
 * not yet determinable (margins / lower criteria still in play).
 */
function rankScenario(teamIds, played, remaining, outcomes) {
  // res: 'A' home win, 'B' away win, 'D' draw. Goals known only for played games.
  const results = [];
  for (const g of played) {
    const as = g.home.score ?? 0, bs = g.away.score ?? 0;
    results.push({ a: g.home.id, b: g.away.id, res: as > bs ? 'A' : as < bs ? 'B' : 'D',
                   ag: as, bg: bs, played: true });
  }
  remaining.forEach((g, i) => {
    const o = outcomes[i];
    results.push({ a: g.home.id, b: g.away.id, res: o === 0 ? 'A' : o === 2 ? 'B' : 'D',
                   played: false });
  });

  const pts = new Map(teamIds.map(id => [id, 0]));
  const hasRemaining = new Map(teamIds.map(id => [id, false]));
  for (const r of results) {
    if (r.res === 'A') pts.set(r.a, pts.get(r.a) + 3);
    else if (r.res === 'B') pts.set(r.b, pts.get(r.b) + 3);
    else { pts.set(r.a, pts.get(r.a) + 1); pts.set(r.b, pts.get(r.b) + 1); }
    if (!r.played) { hasRemaining.set(r.a, true); hasRemaining.set(r.b, true); }
  }

  const within = (block) => {
    const set = new Set(block);
    return results.filter(r => set.has(r.a) && set.has(r.b));
  };
  const h2hPts = (block) => {
    const mp = new Map(block.map(id => [id, 0]));
    for (const r of within(block)) {
      if (r.res === 'A') mp.set(r.a, mp.get(r.a) + 3);
      else if (r.res === 'B') mp.set(r.b, mp.get(r.b) + 3);
      else { mp.set(r.a, mp.get(r.a) + 1); mp.set(r.b, mp.get(r.b) + 1); }
    }
    return mp;
  };
  const h2hCertain = (block) => within(block).every(r => r.played);
  const h2hGoals = (block, diff) => {
    const mp = new Map(block.map(id => [id, 0]));
    for (const r of within(block)) {
      mp.set(r.a, mp.get(r.a) + (diff ? r.ag - r.bg : r.ag));
      mp.set(r.b, mp.get(r.b) + (diff ? r.bg - r.ag : r.bg));
    }
    return mp;
  };
  const overallCertain = (block) => block.every(id => !hasRemaining.get(id));
  const overall = (diff) => {
    const mp = new Map(teamIds.map(id => [id, 0]));
    for (const r of results) {
      if (!r.played) continue;
      mp.set(r.a, mp.get(r.a) + (diff ? r.ag - r.bg : r.ag));
      mp.set(r.b, mp.get(r.b) + (diff ? r.bg - r.ag : r.bg));
    }
    return mp;
  };

  function refine(block) {
    if (block.length <= 1) return [block];
    const criteria = [
      { certain: true,                  map: () => new Map(block.map(id => [id, pts.get(id)])) },
      { certain: true,                  map: () => h2hPts(block) },
      { certain: h2hCertain(block),     map: () => h2hGoals(block, true) },
      { certain: h2hCertain(block),     map: () => h2hGoals(block, false) },
      { certain: overallCertain(block), map: () => overall(true) },
      { certain: overallCertain(block), map: () => overall(false) },
    ];
    for (const c of criteria) {
      if (!c.certain) return [block];            // order undetermined → residual tie
      const vmap = c.map();
      const values = [...new Set(block.map(id => vmap.get(id)))].sort((x, y) => y - x);
      if (values.length > 1) {
        const out = [];
        for (const v of values) {
          for (const sub of refine(block.filter(id => vmap.get(id) === v))) out.push(sub);
        }
        return out;
      }
    }
    return [block];                              // exhausted criteria → residual tie
  }

  return refine(teamIds.slice());
}

// ── Live-table ranking ──────────────────────────────────────────────────────
// Deterministic 2026 ranking for a group whose results are all concrete
// (completed + live matches folded in as if final). Used to re-sort a group
// while a match is in progress. Unlike the clinch enumerator above there are no
// unknowns, so the full tiebreaker chain — including head-to-head, which for
// 2026 ranks ABOVE overall goal difference — is applied with real numbers.
//
// @param rows       adjusted standings rows ({ id, pts, gf, ga, ... })
// @param groupGames effective results among the group's teams: [{a,b,ag,bg}]
// @returns the rows reordered (1st → 4th)
function rankGroupRows(rows, groupGames) {
  const base = new Map(rows.map(r => [r.id, r]));

  // Head-to-head points / goal diff / goals scored among a subset of teams,
  // counting only the matches played between them (FIFA "restart" semantics:
  // recomputed fresh for each still-tied subset).
  const h2hStats = (subset) => {
    const set = new Set(subset);
    const m = new Map(subset.map(id => [id, { pts: 0, gd: 0, gf: 0 }]));
    for (const g of groupGames) {
      if (!set.has(g.a) || !set.has(g.b)) continue;
      const A = m.get(g.a), B = m.get(g.b);
      A.gf += g.ag; B.gf += g.bg;
      A.gd += g.ag - g.bg; B.gd += g.bg - g.ag;
      if (g.ag > g.bg) A.pts += 3; else if (g.ag < g.bg) B.pts += 3; else { A.pts++; B.pts++; }
    }
    return m;
  };

  // Split ids into groups sharing a key value, ordered by that value descending.
  const splitBy = (ids, keyFn) => {
    const map = new Map();
    for (const id of ids) {
      const k = keyFn(id);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(id);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]).map(e => e[1]);
  };

  // Order a set already tied on every higher criterion. Applies, in turn:
  // overall points, head-to-head (pts, gd, gf among the set), overall gd, gf.
  const order = (ids) => {
    if (ids.length <= 1) return ids.slice();
    let groups = splitBy(ids, id => base.get(id).pts);
    if (groups.length === 1) {
      const h = h2hStats(ids);
      for (const key of ['pts', 'gd', 'gf']) {
        groups = splitBy(ids, id => h.get(id)[key]);
        if (groups.length > 1) break;
      }
    }
    if (groups.length === 1) groups = splitBy(ids, id => base.get(id).gf - base.get(id).ga);
    if (groups.length === 1) groups = splitBy(ids, id => base.get(id).gf);
    if (groups.length === 1) return ids.slice(); // genuinely level — keep order
    return groups.flatMap(g => order(g));
  };

  return order(rows.map(r => r.id)).map(id => base.get(id));
}
