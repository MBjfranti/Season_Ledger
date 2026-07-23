"use strict";

/* ── State ─────────────────────────────────────────────── */

const LS_KEY = "uefa-2627-ledger-v1";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultState() {
  return {
    matches: {},    // clubId -> [{id, date, comp, opponent, venue, gf, ga, notes, watched}]
    positions: {},  // clubId -> current league position
    fixtures: [],   // filled from SEED_FIXTURES by mergeSeedFixtures()
    removed: [],    // "clubId|date" keys of fixtures removed in older versions
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (!s.matches) s.matches = {};
    if (!s.positions) s.positions = {};
    if (!s.fixtures) s.fixtures = [];
    if (!s.removed) s.removed = [];
    return s;
  } catch (e) {
    return defaultState();
  }
}

let state = loadState();
let openNotesFor = null; // fixture id with the inline notes form expanded

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

// Fold any fixtures from fixtures.js into saved state. A club plays at most one
// match per day, so clubId+date identifies a fixture. Skips dates already
// covered by a stored fixture or a logged match.
function mergeSeedFixtures() {
  let added = 0;
  // Drop stored fixtures whose date has officially moved; the new date merges below.
  if (typeof MOVED_FIXTURES !== "undefined") {
    for (const mv of MOVED_FIXTURES) {
      const before = state.fixtures.length;
      state.fixtures = state.fixtures.filter(f =>
        !(f.date === mv.from && (f.clubId === mv.clubId || f.opponentId === mv.clubId)));
      added += before - state.fixtures.length;
    }
  }
  const taken = new Set(state.removed);
  const mark = (cid, date) => taken.add(cid + "|" + date);
  for (const f of state.fixtures) {
    mark(f.clubId, f.date);
    if (f.opponentId) mark(f.opponentId, f.date);
  }
  for (const [cid, ms] of Object.entries(state.matches)) {
    for (const m of ms) mark(cid, m.date);
  }
  for (const sf of SEED_FIXTURES) {
    if (taken.has(sf.clubId + "|" + sf.date)) continue;
    if (sf.opponentId && taken.has(sf.opponentId + "|" + sf.date)) continue;
    state.fixtures.push({ mustWatch: false, watched: false, notes: "", ...sf, id: uid() });
    mark(sf.clubId, sf.date);
    if (sf.opponentId) mark(sf.opponentId, sf.date);
    added++;
  }
  // Backfill venues and kickoff times on stored entries that predate the data.
  for (const sf of SEED_FIXTURES) {
    const ex = state.fixtures.find(f => f.clubId === sf.clubId && f.date === sf.date);
    const mirror = state.fixtures.find(f => f.opponentId === sf.clubId && f.date === sf.date);
    if (sf.venue) {
      if (ex && !ex.venue) { ex.venue = sf.venue; added++; }
      if (mirror && !mirror.venue) {
        mirror.venue = sf.venue === "H" ? "A" : sf.venue === "A" ? "H" : sf.venue;
        added++;
      }
    }
    if (sf.time) {
      const stale = t => !t || / ET$/.test(t); // empty, or from before the CT switch
      if (ex && stale(ex.time) && ex.time !== sf.time) { ex.time = sf.time; added++; }
      if (mirror && stale(mirror.time) && mirror.time !== sf.time) { mirror.time = sf.time; added++; }
    }
  }
  if (added) save();
}
mergeSeedFixtures();

// Fold results.js drops into the log: a result turns its fixture into a logged
// match (keeping watched flag and notes); already-logged dates are skipped.
function mergeResults() {
  let changed = false;
  for (const r of RESULTS) {
    if ((state.matches[r.clubId] || []).some(m => m.date === r.date)) continue;
    const f = state.fixtures.find(x => x.date === r.date &&
      (x.clubId === r.clubId || x.opponentId === r.clubId));
    if (f) {
      if (f.clubId === r.clubId) applyFixtureResult(f, r.gf, r.ga);
      else applyFixtureResult(f, r.ga, r.gf);
      changed = true;
    } else if (r.opponent) {
      if (!state.matches[r.clubId]) state.matches[r.clubId] = [];
      state.matches[r.clubId].push({
        id: uid(), date: r.date, comp: r.comp || clubById(r.clubId).leagueComp,
        opponent: r.opponent, venue: r.venue || "N", gf: r.gf, ga: r.ga,
        notes: "", watched: false,
      });
      changed = true;
    }
  }
  if (changed) save();
}
mergeResults();

/* ── Helpers ───────────────────────────────────────────── */

const clubById = id => CLUBS.find(c => c.id === id);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function fmtDate(iso) {
  if (!iso) return "TBD";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function fmtDayHead(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

// Sortable minutes-since-midnight for times like "8:30 AM CT"; unknown sorts last.
function timeSortKey(t) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t || "");
  if (!m) return 24 * 60;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
}

function weekStart(iso) {
  const d = new Date(iso + "T12:00:00");
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function resultLetter(gf, ga) {
  return gf > ga ? "W" : gf < ga ? "L" : "D";
}

function recordFor(clubId) {
  const club = clubById(clubId);
  const ms = [...(state.matches[clubId] || [])].sort((a, b) => a.date.localeCompare(b.date));
  const rec = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, leagueP: 0, form: [] };
  for (const m of ms) {
    const r = resultLetter(m.gf, m.ga);
    rec.p++; rec.gf += m.gf; rec.ga += m.ga;
    if (r === "W") rec.w++; else if (r === "D") rec.d++; else rec.l++;
    if (m.comp === club.leagueComp) {
      rec.leagueP++;
      rec.pts += r === "W" ? 3 : r === "D" ? 1 : 0;
    }
    rec.form.push(r);
  }
  rec.form = rec.form.slice(-5);
  return rec;
}

function broadcastFor(comp) {
  return BROADCAST[comp] || { svc: "Check listings", have: false };
}

function matchesAny(name, list) {
  const n = name.toLowerCase();
  return (list || []).some(x => n.includes(x.toLowerCase()));
}

function fixtureReasons(f) {
  const club = clubById(f.clubId);
  const reasons = [];
  if (f.opponentId) reasons.push("Both your clubs");
  if (f.derby || matchesAny(f.opponent, RIVALS[f.clubId])) reasons.push("Derby");
  if (matchesAny(f.opponent, BIG_OPPONENTS[club.league])) reasons.push("Big opponent");
  if (/UEFA/.test(f.comp)) reasons.push("European night");
  else if (f.comp !== club.leagueComp) reasons.push("Cup tie");
  if (f.mustWatch) reasons.push("Marked must-watch");
  return reasons;
}

function fixtureScore(f) {
  let s = 10;
  const reasons = fixtureReasons(f);
  if (reasons.includes("Both your clubs")) s += 120;
  if (reasons.includes("Derby")) s += 100;
  if (reasons.includes("Big opponent")) s += 60;
  if (reasons.includes("European night")) s += 40;
  if (reasons.includes("Cup tie")) s += 20;
  if (reasons.includes("Marked must-watch")) s += 80;
  return s;
}

function applyFixtureResult(f, gf, ga) {
  const club = clubById(f.clubId);
  if (!state.matches[f.clubId]) state.matches[f.clubId] = [];
  state.matches[f.clubId].push({
    id: uid(), date: f.date, comp: f.comp,
    opponent: f.opponent, venue: f.venue || "N", gf, ga,
    notes: f.notes || "", watched: !!f.watched,
  });
  if (f.opponentId) {
    const oppVenue = f.venue === "H" ? "A" : f.venue === "A" ? "H" : (f.venue || "N");
    if (!state.matches[f.opponentId]) state.matches[f.opponentId] = [];
    state.matches[f.opponentId].push({
      id: uid(), date: f.date, comp: f.comp,
      opponent: club.name, venue: oppVenue, gf: ga, ga: gf,
      notes: f.notes || "", watched: !!f.watched,
    });
  }
  state.fixtures = state.fixtures.filter(x => x.id !== f.id);
}

// Detect whether a typed opponent is one of the tracked clubs.
function detectOpponentId(clubId, opponentName) {
  const n = opponentName.toLowerCase();
  const hit = CLUBS.find(c => c.id !== clubId &&
    (n.includes(c.short.toLowerCase()) || n.includes(c.name.toLowerCase())));
  return hit ? hit.id : undefined;
}

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/* ── Shared HTML bits ──────────────────────────────────── */

function formHTML(form) {
  if (!form.length) return '<span class="none">no matches yet</span>';
  return '<span class="form">' + form.map(r => `<span class="chip ${r}">${r}</span>`).join("") + "</span>";
}

function bcChip(comp) {
  const b = broadcastFor(comp);
  const cls = b.have ? "bc have" : "bc need";
  const note = b.note ? ` (${b.note})` : "";
  return `<span class="${cls}">${esc(b.svc)}${note}</span>`;
}

function matchupLabel(f) {
  const club = clubById(f.clubId);
  const opp = esc(f.opponent);
  if (f.venue === "A") return `${opp} v ${esc(club.short)}`;
  return `${esc(club.short)} v ${opp}`;
}

function clubStrip(activeId) {
  return `<nav class="club-strip">` + CLUBS.map(c => `
    <a href="#/club/${c.id}" class="${c.id === activeId ? "active" : ""}">
      <span class="kit kit-${c.id}"></span><span>${esc(c.short)}</span>
    </a>`).join("") + `</nav>`;
}

/* ── Dashboard ─────────────────────────────────────────── */

function renderDashboard() {
  const agg = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  for (const c of CLUBS) {
    const r = recordFor(c.id);
    agg.p += r.p; agg.w += r.w; agg.d += r.d; agg.l += r.l; agg.gf += r.gf; agg.ga += r.ga;
  }

  const cards = CLUBS.map(c => {
    const r = recordFor(c.id);
    const league = LEAGUES[c.league];
    const pos = state.positions[c.id];
    const recordStr = r.p
      ? `${r.p}P · ${r.w}-${r.d}-${r.l} · ${r.gf}:${r.ga}`
      : `<span class="none">no matches logged</span>`;
    return `
      <a class="card" href="#/club/${c.id}">
        <div class="kit kit-${c.id}"></div>
        <img class="crest" src="${CLUB_IMAGES[c.id].crest}" alt="" onerror="this.remove()">
        <div class="body">
          <h3>${esc(c.name)}</h3>
          <div class="meta">${esc(league.name)} · ${esc(c.manager)}</div>
          <div class="statline">
            <span class="record">${recordStr}</span>
            ${r.p ? formHTML(r.form) : ""}
          </div>
          <div class="foot">
            <span>Forecast ${c.forecast.low}–${c.forecast.high}</span>
            <span class="pos">${pos ? "Currently " + pos + getOrdinal(pos) : "Position not set"}</span>
          </div>
        </div>
      </a>`;
  }).join("");

  // Watch-next callout: best pick among upcoming fixtures.
  const upcoming = state.fixtures
    .filter(f => f.date && f.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date));
  let watchNext = "";
  if (upcoming.length) {
    const firstWeek = weekStart(upcoming[0].date);
    const week = upcoming.filter(f => weekStart(f.date) === firstWeek)
      .sort((a, b) => fixtureScore(b) - fixtureScore(a));
    const top = week[0];
    watchNext = `
      <div class="watch-next">
        <span class="tag watch">Watch next</span>
        <strong>${matchupLabel(top)}</strong>
        <span class="wn-meta">${fmtDate(top.date)}${top.time ? " · " + esc(top.time) : ""} · ${esc(top.comp)}</span>
        ${bcChip(top.comp)}
        <a href="#/calendar" class="wn-link">Full calendar →</a>
      </div>`;
  }

  // The week ahead — every fixture across all clubs in the next 7 days.
  const today = todayISO();
  const horizonDate = new Date(today + "T12:00:00");
  horizonDate.setDate(horizonDate.getDate() + 7);
  const horizon = horizonDate.toISOString().slice(0, 10);
  const ahead = state.fixtures
    .filter(f => f.date && f.date >= today && f.date <= horizon)
    .sort((a, b) => a.date.localeCompare(b.date) || timeSortKey(a.time) - timeSortKey(b.time));
  let aheadHTML;
  if (ahead.length) {
    const byDay = new Map();
    for (const f of ahead) {
      if (!byDay.has(f.date)) byDay.set(f.date, []);
      byDay.get(f.date).push(f);
    }
    aheadHTML = [...byDay.entries()].map(([day, dfs]) => `
      <div class="mini-day">
        <div class="mini-day-head">${fmtDayHead(day)}</div>
        ${dfs.map(f => `
          <div class="mini-fx">
            <span class="mini-time">${f.time ? esc(f.time) : "TBD"}</span>
            <span class="mini-match">${matchupLabel(f)}</span>
            <span class="fx-comp">${esc(f.comp)}</span>
            ${bcChip(f.comp)}
            ${f.mustWatch ? '<span class="star-mark" title="Must-watch">★</span>' : ""}
          </div>`).join("")}
      </div>`).join("");
  } else {
    const next = state.fixtures
      .filter(f => f.date && f.date > horizon)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    aheadHTML = `<div class="empty">Nothing in the next seven days.${next
      ? ` Next up: ${matchupLabel(next)} on ${fmtDate(next.date)}.` : ""}</div>`;
  }

  // Latest results — most recent logged matches across all clubs.
  const allResults = [];
  for (const c of CLUBS) {
    for (const m of (state.matches[c.id] || [])) allResults.push({ club: c, m });
  }
  allResults.sort((a, b) => b.m.date.localeCompare(a.m.date));
  const latest = allResults.slice(0, 10);
  const resultsHTML = latest.length
    ? `<ul class="fixtures">` + latest.map(({ club, m }) => {
        const res = resultLetter(m.gf, m.ga);
        return `<li>
          <span class="when">${fmtDate(m.date)}</span>
          <span class="club-tag"><a href="#/club/${club.id}">${esc(club.short)}</a></span>
          <span class="chip ${res}">${res}</span>
          <span class="mini-score">${m.gf}–${m.ga}</span>
          <span>v ${esc(m.opponent)} (${esc(m.venue)}) · ${esc(m.comp)}</span>
          ${m.watched ? '<span class="watched-mark">watched</span>' : ""}
        </li>`;
      }).join("") + `</ul>`
    : `<div class="empty">Results land here with each pull once the season kicks off.</div>`;

  // Starred watchlist — upcoming must-watch fixtures.
  const starred = state.fixtures
    .filter(f => f.mustWatch && f.date && f.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const starredHTML = starred.length
    ? `<div class="section-label">Your starred watchlist</div>
       <ul class="fixtures">` + starred.map(f => `
         <li><span class="when">${fmtDate(f.date)}${f.time ? " · " + esc(f.time) : ""}</span>
         <span>${matchupLabel(f)} · ${esc(f.comp)}</span> ${bcChip(f.comp)}</li>`).join("") + `</ul>`
    : "";

  return `
    <div class="section-label">Season to date — all clubs, all competitions</div>
    <div class="aggregate">
      <div class="cell"><div class="num">${agg.p}</div><div class="lbl">Played</div></div>
      <div class="cell"><div class="num">${agg.w}</div><div class="lbl">Won</div></div>
      <div class="cell"><div class="num">${agg.d}</div><div class="lbl">Drawn</div></div>
      <div class="cell"><div class="num">${agg.l}</div><div class="lbl">Lost</div></div>
      <div class="cell"><div class="num">${agg.gf}:${agg.ga}</div><div class="lbl">Goals</div></div>
    </div>
    ${watchNext}
    <div class="section-label">The week ahead</div>
    ${aheadHTML}
    <div class="section-label">The eight</div>
    <div class="grid">${cards}</div>
    <div class="section-label">Latest results</div>
    ${resultsHTML}
    ${starredHTML}`;
}

/* ── Calendar ──────────────────────────────────────────── */

function renderCalendar() {
  const dated = state.fixtures.filter(f => f.date).sort((a, b) => a.date.localeCompare(b.date));
  const weeks = new Map();
  for (const f of dated) {
    const wk = weekStart(f.date);
    if (!weeks.has(wk)) weeks.set(wk, []);
    weeks.get(wk).push(f);
  }

  // Month jump bar + upcoming anchor.
  const months = [];
  let upcomingWk = null;
  for (const wk of weeks.keys()) {
    const m = wk.slice(0, 7);
    if (!months.some(x => x.key === m)) {
      const d = new Date(wk + "T12:00:00");
      months.push({ key: m, wk, label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }) });
    }
    if (!upcomingWk && wk >= weekStart(todayISO())) upcomingWk = wk;
  }
  const monthNav = `
    <div class="month-nav">
      <span class="lbl">Jump to</span>
      ${upcomingWk ? `<button class="btn" data-action="jump" data-target="wk-${upcomingWk}">Upcoming</button>` : ""}
      ${months.map(m => `<button class="btn" data-action="jump" data-target="wk-${m.wk}">${esc(m.label)}</button>`).join("")}
    </div>`;

  let weeksHTML = "";
  for (const [wk, fs] of weeks) {
    const ranked = [...fs].sort((a, b) => fixtureScore(b) - fixtureScore(a) || a.date.localeCompare(b.date));
    const past = wk < weekStart(todayISO());
    const cardFor = f => {
      const rank = ranked.indexOf(f);
      const isPast = f.date < todayISO();
      let tag = "";
      if (isPast) {
        tag = '<span class="tag awaiting">Awaiting result</span>';
      } else if (fs.length > 1 || fixtureScore(f) > 30) {
        if (rank === 0) tag = '<span class="tag watch">Watch</span>';
        else if (rank <= 2) tag = '<span class="tag backup">Backup</span>';
      }
      const reasons = fixtureReasons(f).filter(r => r !== "Marked must-watch");
      const reasonStr = reasons.length ? `<div class="reasons">${reasons.join(" · ")}</div>` : "";
      const noteStr = f.notes ? `<div class="fx-note">“${esc(f.notes)}”</div>` : "";
      const kits = f.opponentId
        ? `<div class="kit-pair"><span class="kit kit-${f.clubId}"></span><span class="kit kit-${f.opponentId}"></span></div>`
        : `<div class="kit kit-${f.clubId}"></div>`;
      const notesForm = openNotesFor === f.id ? `
        <form class="notes-form" data-fixture="${f.id}">
          <input name="notes" value="${esc(f.notes || "")}" placeholder="Your notes on this one">
          <button class="btn primary" type="submit">Save note</button>
          <button class="btn" type="button" data-action="cancel-notes">Cancel</button>
        </form>` : "";
      return `
        <div class="fx-card ${tag.includes("tag watch") ? "is-watch" : ""} ${f.watched ? "is-watched" : ""}">
          ${kits}
          <div class="fx-body">
            <div class="fx-top">
              ${tag}
              <span class="fx-time">${f.time ? esc(f.time) : "Time TBD"}</span>
            </div>
            <div class="fx-match">${matchupLabel(f)}</div>
            <div class="fx-meta"><span class="fx-comp">${esc(f.comp)}</span> ${bcChip(f.comp)}</div>
            ${reasonStr}
            ${noteStr}
            <div class="fx-actions">
              <button class="btn star ${f.mustWatch ? "on" : ""}" data-action="toggle-star" data-id="${f.id}" title="Toggle must-watch">${f.mustWatch ? "★" : "☆"}</button>
              <button class="btn check ${f.watched ? "on" : ""}" data-action="toggle-watched" data-id="${f.id}" title="Did you watch it?">${f.watched ? "☑" : "☐"} Watched</button>
              <button class="btn" data-action="open-notes" data-id="${f.id}" title="Add a note">✎ Note</button>
            </div>
            ${notesForm}
          </div>
        </div>`;
    };
    // Group the week's fixtures by day, order cards within a day by kickoff.
    const days = new Map();
    for (const f of fs) {
      if (!days.has(f.date)) days.set(f.date, []);
      days.get(f.date).push(f);
    }
    let dayBlocks = "";
    for (const [day, dfs] of [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      dfs.sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time) || fixtureScore(b) - fixtureScore(a));
      dayBlocks += `
        <div class="day-block">
          <div class="day-head">${fmtDayHead(day)}</div>
          <div class="day-cards">${dfs.map(cardFor).join("")}</div>
        </div>`;
    }
    weeksHTML += `
      <div class="week ${past ? "past" : ""}" id="wk-${wk}">
        <div class="week-head">Week of ${fmtDate(wk)}</div>
        ${dayBlocks}
      </div>`;
  }
  if (!weeksHTML) {
    weeksHTML = `<div class="empty">No fixtures yet. Add the ones you care about below.</div>`;
  }

  const clubOptions = CLUBS.map(c => `<option value="${c.id}">${esc(c.short)}</option>`).join("");
  const compOptions = CLUBS[0].comps.map(c => `<option>${esc(c)}</option>`).join("");

  return `
    ${clubStrip()}
    ${monthNav}
    <p class="explain" style="margin-top:12px">Each week gets one <span class="tag watch">Watch</span> pick and up to two
      <span class="tag backup">Backup</span>s — ranked by matchups between your own clubs, derbies,
      big-name opponents, European nights and cup ties. Star (★) a fixture to force it up the order.
      Broadcast chips: <span class="bc have">green</span> is a service you have,
      <span class="bc need">amber</span> one you don't (yet). Mark what you saw with ☑ Watched and jot
      notes (✎); scores arrive in periodic result pulls, so past fixtures read
      <span class="tag awaiting">Awaiting result</span> until then. Times are US Central.</p>

    ${weeksHTML}

    <div class="section-label">Add a fixture</div>
    <form class="add-form" id="addFixtureForm">
      <div class="field"><label for="fxClub">Club</label>
        <select id="fxClub" name="clubId">${clubOptions}</select></div>
      <div class="field"><label for="fxOpp">Opponent</label>
        <input id="fxOpp" name="opponent" required placeholder="e.g. Aston Villa"></div>
      <div class="field"><label for="fxVenue">Venue</label>
        <select id="fxVenue" name="venue"><option value="H">Home</option><option value="A">Away</option><option value="N">Neutral</option></select></div>
      <div class="field"><label for="fxComp">Competition</label>
        <select id="fxComp" name="comp">${compOptions}</select></div>
      <div class="field"><label for="fxDate">Date</label>
        <input id="fxDate" name="date" type="date" required></div>
      <div class="field"><label for="fxTime">Kickoff (Central Time, optional)</label>
        <input id="fxTime" name="time" placeholder="e.g. 9:00 AM CT"></div>
      <div class="field"><label for="fxStar">Must-watch</label>
        <select id="fxStar" name="mustWatch"><option value="">No</option><option value="1">Yes ★</option></select></div>
      <div class="field"><button class="btn primary" type="submit">Add fixture</button></div>
    </form>`;
}

/* ── Club page ─────────────────────────────────────────── */

function bandHTML(club) {
  const size = LEAGUES[club.league].size;
  const pos = state.positions[club.id];
  let segs = "";
  for (let i = 1; i <= size; i++) {
    const cls = [
      "band-seg",
      i >= club.forecast.low && i <= club.forecast.high ? "in-band" : "",
      i === pos ? "current" : "",
    ].join(" ");
    segs += `<div class="${cls}" title="${i}${getOrdinal(i)}"></div>`;
  }
  return `
    <div class="band-wrap">
      <div class="section-label" style="margin:0 0 4px">Forecast: ${club.forecast.low}${getOrdinal(club.forecast.low)}–${club.forecast.high}${getOrdinal(club.forecast.high)}</div>
      <div class="band-row">${segs}</div>
      <div class="band-legend"><span>1st</span><span>${size}${getOrdinal(size)}</span></div>
      <div class="pos-controls">
        <label for="posInput">Current position</label>
        <input id="posInput" type="number" min="1" max="${size}" value="${pos || ""}" placeholder="—">
      </div>
      <div class="band-note">${esc(club.forecast.extra)}</div>
    </div>`;
}

function renderClub(clubId) {
  const club = clubById(clubId);
  if (!club) return `<div class="empty">Unknown club.</div>`;
  const league = LEAGUES[club.league];
  const r = recordFor(clubId);

  const ms = [...(state.matches[clubId] || [])].sort((a, b) => b.date.localeCompare(a.date));
  const logRows = ms.map(m => {
    const res = resultLetter(m.gf, m.ga);
    return `
      <tr>
        <td>${fmtDate(m.date)}</td>
        <td>${esc(m.comp)}</td>
        <td>${esc(m.opponent)} (${esc(m.venue)})</td>
        <td class="score res-${res}">${res} ${m.gf}–${m.ga}</td>
        <td class="notes">${m.watched ? '<span class="watched-mark">watched</span> ' : ""}${esc(m.notes || "")}</td>
      </tr>`;
  }).join("");

  const logHTML = ms.length
    ? `<div class="log-scroll"><table class="log-table">
        <thead><tr><th>Date</th><th>Comp</th><th>Opponent</th><th>Result</th><th>Notes</th></tr></thead>
        <tbody>${logRows}</tbody></table></div>`
    : `<div class="empty">No results yet — they arrive with the periodic result pulls once the season starts.</div>`;

  const clubFixtures = state.fixtures
    .filter(f => f.clubId === clubId || f.opponentId === clubId)
    .filter(f => f.date && f.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date));
  const upHTML = clubFixtures.length
    ? `<ul class="fixtures">` + clubFixtures.slice(0, 8).map(f => `
        <li><span class="when">${fmtDate(f.date)}${f.time ? " · " + esc(f.time) : ""}</span>
        <span>${matchupLabel(f)} · ${esc(f.comp)}</span> ${bcChip(f.comp)}</li>`).join("") + `</ul>`
    : `<div class="empty">No upcoming fixtures on the <a href="#/calendar">calendar</a>.</div>`;

  const preview = club.preview.map(p => `<p>${esc(p)}</p>`).join("");

  return `
    ${clubStrip(clubId)}
    <a class="backlink" href="#/">← All clubs</a>
    <div class="club-hero">
      <div class="kit kit-${club.id}"></div>
      <div class="hero-body has-photo"
           style="background-image: linear-gradient(180deg, rgba(18,24,31,0.25) 0%, rgba(18,24,31,0.55) 55%, rgba(18,24,31,0.9) 100%), url('${CLUB_IMAGES[club.id].hero}'); background-position: ${CLUB_IMAGES[club.id].heroPos || "center 35%"}">
        <div class="hero-title">
          <img class="hero-crest" src="${CLUB_IMAGES[club.id].crest}" alt="" onerror="this.remove()">
          <div>
            <h2>${esc(club.name)}</h2>
            <div class="sub">${esc(league.name)} · ${esc(league.country)} · ${esc(club.manager)}</div>
            <div class="sub stadium-line">${esc(STADIUMS[club.id].name)} · ${STADIUMS[club.id].capacity.toLocaleString()} capacity${STADIUMS[club.id].note ? " (" + esc(STADIUMS[club.id].note) + ")" : ""}</div>
            <a class="site-link" href="${esc(CLUB_SITES[club.id])}" target="_blank" rel="noopener">Official site ↗</a>
          </div>
        </div>
        <div class="bigrecord">
          <div class="r">${r.w}-${r.d}-${r.l}</div>
          <div class="l">${r.p} played · ${r.pts} league pts</div>
        </div>
      </div>
    </div>

    <div class="two-col">
      <div>
        <div class="stat-grid">
          <div class="stat"><div class="num">${r.p}</div><div class="lbl">Played</div></div>
          <div class="stat"><div class="num">${r.gf}:${r.ga}</div><div class="lbl">Goals</div></div>
          <div class="stat"><div class="num">${formHTML(r.form)}</div><div class="lbl">Form (last 5)</div></div>
        </div>

        <div class="section-label">Season preview</div>
        <details class="preview">
          <summary>Read the full preview</summary>
          <div class="prose">${preview}</div>
        </details>

        <div class="section-label">Results</div>
        ${logHTML}
      </div>

      <div>
        ${bandHTML(club)}
        <div class="section-label">Next up</div>
        ${upHTML}
        <div class="section-label">Key dates</div>
        <ul class="fixtures">
          ${club.keyFixtures.map(k => `<li><span class="when">${esc(k.when)}</span><span>${esc(k.label)}</span></li>`).join("")}
        </ul>
      </div>
    </div>`;
}

/* ── Actions ───────────────────────────────────────────── */

function handleClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === "toggle-star") {
    const f = state.fixtures.find(x => x.id === id);
    if (f) { f.mustWatch = !f.mustWatch; save(); render(); }
  } else if (action === "toggle-watched") {
    const f = state.fixtures.find(x => x.id === id);
    if (f) { f.watched = !f.watched; save(); render(); }
  } else if (action === "open-notes") {
    openNotesFor = openNotesFor === id ? null : id;
    render();
    document.querySelector(".notes-form input")?.focus();
  } else if (action === "cancel-notes") {
    openNotesFor = null;
    render();
  } else if (action === "jump") {
    document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function handleSubmit(e) {
  const form = e.target;

  if (form.id === "addFixtureForm") {
    e.preventDefault();
    const data = new FormData(form);
    const clubId = data.get("clubId");
    const opponent = data.get("opponent").trim();
    if (!opponent) return;
    state.fixtures.push({
      id: uid(),
      clubId,
      opponent,
      opponentId: detectOpponentId(clubId, opponent),
      venue: data.get("venue"),
      comp: data.get("comp"),
      date: data.get("date"),
      time: data.get("time").trim(),
      mustWatch: !!data.get("mustWatch"),
      watched: false,
      notes: "",
    });
    save(); render();
  } else if (form.classList.contains("notes-form")) {
    e.preventDefault();
    const f = state.fixtures.find(x => x.id === form.dataset.fixture);
    if (!f) return;
    f.notes = new FormData(form).get("notes").trim();
    openNotesFor = null;
    save(); render();
  }
}

function handleChange(e) {
  if (e.target.id === "posInput") {
    const clubId = location.hash.split("/")[2];
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 1) state.positions[clubId] = v;
    else delete state.positions[clubId];
    save(); render();
  } else if (e.target.id === "fxClub") {
    // Repopulate the competition dropdown for the selected club.
    const club = clubById(e.target.value);
    const compSel = document.getElementById("fxComp");
    if (club && compSel) {
      compSel.innerHTML = club.comps.map(c => `<option>${esc(c)}</option>`).join("");
    }
  }
}

/* ── Export / import ───────────────────────────────────── */

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "season-ledger-2026-27.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const s = JSON.parse(reader.result);
      if (typeof s !== "object" || !s) throw new Error("bad file");
      state = {
        matches: s.matches || {}, positions: s.positions || {},
        fixtures: s.fixtures || [], removed: s.removed || [],
      };
      save(); render();
    } catch (err) {
      alert("That file could not be read as a Season Ledger export.");
    }
  };
  reader.readAsText(file);
}

/* ── Router ────────────────────────────────────────────── */

function render() {
  const app = document.getElementById("app");
  const hash = location.hash || "#/";
  if (hash.startsWith("#/club/")) {
    app.innerHTML = renderClub(hash.split("/")[2]);
  } else if (hash.startsWith("#/calendar")) {
    app.innerHTML = renderCalendar();
  } else {
    app.innerHTML = renderDashboard();
  }
}

document.getElementById("app").addEventListener("click", handleClick);
document.getElementById("app").addEventListener("submit", handleSubmit);
document.getElementById("app").addEventListener("change", handleChange);
document.getElementById("exportBtn").addEventListener("click", exportData);
document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change", e => {
  if (e.target.files[0]) importData(e.target.files[0]);
  e.target.value = "";
});
window.addEventListener("hashchange", () => { openNotesFor = null; render(); });

render();
