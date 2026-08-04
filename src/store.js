// App state: loaded from localStorage, merged with seed fixtures and result
// drops on startup, persisted automatically on any change.

import { reactive, watch, computed } from "vue";
import { CLUBS } from "./data/data.js";
import { SEED_FIXTURES, MOVED_FIXTURES } from "./data/fixtures.js";
import { RESULTS } from "./data/results.js";
import { uid, clubById, detectOpponentId, setFollowedCheck } from "./utils.js";

const LS_KEY = "uefa-2627-ledger-v1";

function defaultState() {
  return {
    matches: {},    // clubId -> [{id, date, comp, opponent, venue, gf, ga, notes, watched}]
    positions: {},  // clubId -> current league position
    fixtures: [],   // filled from SEED_FIXTURES by mergeSeedFixtures()
    removed: [],    // "clubId|date" keys of fixtures removed in older versions
    clubPrefs: {},  // clubId -> true/false, only for clubs explicitly toggled
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
    if (!s.clubPrefs) s.clubPrefs = {};
    return s;
  } catch (e) {
    return defaultState();
  }
}

export const state = reactive(loadState());

watch(state, () => {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}, { deep: true });

// Fold any fixtures from fixtures.js into saved state. A club plays at most one
// match per day, so clubId+date identifies a fixture. Skips dates already
// covered by a stored fixture or a logged match.
function mergeSeedFixtures() {
  // Drop stored fixtures whose date has officially moved; the new date merges below.
  for (const mv of MOVED_FIXTURES) {
    state.fixtures = state.fixtures.filter(f =>
      !(f.date === mv.from && (f.clubId === mv.clubId || f.opponentId === mv.clubId)));
  }
  // Backfill opponentId on stored fixtures whose opponent has since become a
  // tracked club (e.g. West Brom joining the slate turns existing Wrexham and
  // Lincoln entries into two-club matchups).
  for (const f of state.fixtures) {
    if (!f.opponentId) {
      const oid = detectOpponentId(f.clubId, f.opponent);
      if (oid) f.opponentId = oid;
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
  }
  // Backfill venues and kickoff times on stored entries that predate the data.
  for (const sf of SEED_FIXTURES) {
    const ex = state.fixtures.find(f => f.clubId === sf.clubId && f.date === sf.date);
    const mirror = state.fixtures.find(f => f.opponentId === sf.clubId && f.date === sf.date);
    if (sf.venue) {
      if (ex && !ex.venue) ex.venue = sf.venue;
      if (mirror && !mirror.venue) {
        mirror.venue = sf.venue === "H" ? "A" : sf.venue === "A" ? "H" : sf.venue;
      }
    }
    if (sf.time) {
      const stale = t => !t || / ET$/.test(t); // empty, or from before the CT switch
      if (ex && stale(ex.time) && ex.time !== sf.time) ex.time = sf.time;
      if (mirror && stale(mirror.time) && mirror.time !== sf.time) mirror.time = sf.time;
    }
  }
}

// Fold results.js drops into the log: a result turns its fixture into a logged
// match (keeping watched flag and notes); already-logged dates are skipped.
function mergeResults() {
  for (const r of RESULTS) {
    if ((state.matches[r.clubId] || []).some(m => m.date === r.date)) continue;
    const f = state.fixtures.find(x => x.date === r.date &&
      (x.clubId === r.clubId || x.opponentId === r.clubId));
    if (f) {
      if (f.clubId === r.clubId) applyFixtureResult(f, r.gf, r.ga);
      else applyFixtureResult(f, r.ga, r.gf);
    } else if (r.opponent) {
      if (!state.matches[r.clubId]) state.matches[r.clubId] = [];
      state.matches[r.clubId].push({
        id: uid(), date: r.date, comp: r.comp || clubById(r.clubId).leagueComp,
        opponent: r.opponent, venue: r.venue || "N", gf: r.gf, ga: r.ga,
        notes: "", watched: false,
      });
    }
  }
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

mergeSeedFixtures();
mergeResults();

/* ── Followed clubs ────────────────────────────────────── */

// Only clubs the user has explicitly switched are recorded in clubPrefs; every
// other club falls back to its catalog default. Storing the exceptions rather
// than the full follow-list means a club added to the catalog later still shows
// up for existing users (the way West Brom did) instead of being invisible
// behind a saved list written before it existed.
export function isFollowed(clubId) {
  const pref = state.clubPrefs[clubId];
  if (typeof pref === "boolean") return pref;
  const club = clubById(clubId);
  return !!club && club.followByDefault !== false;
}

export function toggleClub(clubId) {
  state.clubPrefs[clubId] = !isFollowed(clubId);
}

// Let the pure helpers score "both your clubs" against real follow state.
setFollowedCheck(isFollowed);

export const activeClubs = computed(() => CLUBS.filter(c => isFollowed(c.id)));

// Fixtures belonging to a followed club. A two-club matchup is stored once under
// the home club, so it survives as long as either side is still followed.
export const activeFixtures = computed(() => state.fixtures.filter(f =>
  isFollowed(f.clubId) || (f.opponentId && isFollowed(f.opponentId))));

/* ── Derived data ──────────────────────────────────────── */

export function recordFor(clubId) {
  const club = clubById(clubId);
  const ms = [...(state.matches[clubId] || [])].sort((a, b) => a.date.localeCompare(b.date));
  const rec = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, leagueP: 0, form: [] };
  for (const m of ms) {
    const r = m.gf > m.ga ? "W" : m.gf < m.ga ? "L" : "D";
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

/* ── Mutations ─────────────────────────────────────────── */

export function toggleStar(id) {
  const f = state.fixtures.find(x => x.id === id);
  if (f) f.mustWatch = !f.mustWatch;
}

export function toggleWatched(id) {
  const f = state.fixtures.find(x => x.id === id);
  if (f) f.watched = !f.watched;
}

export function setFixtureNotes(id, notes) {
  const f = state.fixtures.find(x => x.id === id);
  if (f) f.notes = notes.trim();
}

export function addFixture({ clubId, opponent, venue, comp, date, time, mustWatch }) {
  state.fixtures.push({
    id: uid(),
    clubId,
    opponent,
    opponentId: detectOpponentId(clubId, opponent),
    venue,
    comp,
    date,
    time: (time || "").trim(),
    mustWatch: !!mustWatch,
    watched: false,
    notes: "",
  });
}

export function setPosition(clubId, value) {
  const v = parseInt(value, 10);
  if (!isNaN(v) && v >= 1) state.positions[clubId] = v;
  else delete state.positions[clubId];
}

/* ── Export / import ───────────────────────────────────── */

export function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "season-ledger-2026-27.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const s = JSON.parse(reader.result);
      if (typeof s !== "object" || !s) throw new Error("bad file");
      if (!confirm("Importing replaces ALL current ledger data — logged matches, fixtures, stars, watched marks and notes. Continue?")) return;
      state.matches = s.matches || {};
      state.positions = s.positions || {};
      state.fixtures = s.fixtures || [];
      state.removed = s.removed || [];
      state.clubPrefs = s.clubPrefs || {};
    } catch (err) {
      alert("That file could not be read as a Season Ledger export.");
    }
  };
  reader.readAsText(file);
}
