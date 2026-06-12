// Group standings rendering — rows arrive sorted by ESPN's rank stat (see
// fetchStandings) with official FIFA tiebreakers and advancement notes applied.

function renderStandings(standings, container) {
  container.innerHTML = '';
  const hideSpoilers = document.documentElement.classList.contains('no-spoilers');

  if (!standings || standings.length === 0) {
    container.innerHTML = `<div class="error-msg">
      Standings unavailable. <button onclick="location.reload()">Retry</button>
    </div>`;
    return;
  }

  for (const groupData of standings) {
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
      // ESPN's row order itself reveals results — show static alphabetical order
      const letter = groupData.group.slice(-1);
      for (const id of GROUPS[letter] || []) {
        const t = TEAMS[id];
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><div class="team-cell">
            <span class="flag" title="${esc(t.name)}">${t.flag}</span> <span class="team-name">${esc(t.name)}</span>
          </div></td>`;
        tbody.appendChild(tr);
      }
    } else {
      groupData.rows.forEach(row => {
        const tr = document.createElement('tr');
        // Note descriptions seen so far: "Advance to Round of 32",
        // "Best 8 advance" (third place), "Eliminated"
        const desc = (row.note?.description || '').toLowerCase();
        if (desc.includes('best 8')) tr.className = 'qualified-third';
        else if (desc.includes('advance')) tr.className = 'qualified';
        else if (desc.includes('eliminat')) tr.className = 'eliminated-row';
        tr.innerHTML = `
          <td><div class="team-cell">
            <span class="rank">${row.rank}</span>
            <span class="flag" title="${esc(row.name)}">${row.flag}</span> <span class="team-name">${esc(row.name)}</span>
          </div></td>
          <td>${row.gp}</td><td>${row.w}</td><td>${row.d}</td><td>${row.l}</td>
          <td>${row.gf}</td><td>${row.ga}</td><td>${esc(String(row.gd))}</td><td>${row.pts}</td>`;
        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
  }

  if (!hideSpoilers) {
    const legend = document.createElement('div');
    legend.className = 'standings-legend';
    legend.textContent = 'Green: advancing to the Round of 32 · Amber: in best-third position. Top 2 in each group and the 8 best third-place teams advance.';
    container.appendChild(legend);
  }
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
