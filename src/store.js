// App state: loaded from localStorage, merged with seed fixtures and result
// drops on startup, persisted automatically on any change.

import { reactive, watch, computed } from "vue";
import { CLUBS } from "./data/data.js";
import { SEED_FIXTURES, MOVED_FIXTURES } from "./data/fixtures.js";
import { RESULTS } from "./data/results.js";
import { uid, clubById, detectOpponentId, setFollowedCheck } from "./utils.js";
import { fetchSeason } from "./data/espn.js";

// The 2026–27 window the API is queried over.
const SEASON_FROM = "2026-07-01";
const SEASON_TO = "2027-07-01";

const LS_KEY = "uefa-2627-ledger-v1";

function defaultState() {
  return {
    matches: {},    // clubId -> [{id, date, comp, opponent, venue, gf, ga, notes, watched}]
    positions: {},  // clubId -> current league position
    fixtures: [],   // filled from SEED_FIXTURES by mergeSeedFixtures()
    removed: [],    // "clubId|date" keys of fixtures removed in older versions
    clubPrefs: {},  // clubId -> true/false, only for clubs explicitly toggled
    apiSyncedAt: null, // ISO timestamp of the last successful ESPN sync
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

/* ── Follow-by-URL ─────────────────────────────────────── */

// ?f=bar or ?f=bar,wre narrows the slate to EXACTLY those clubs — useful for
// sharing a link to one club's season. A code is any unambiguous prefix of a
// club's id, short name or alias, so "bar", "barca" and "barcelona" all reach
// Barcelona and "par" reaches Paris. Ambiguous codes ("b" hits Brighton, Bremen
// and Barcelona) and unknown ones are ignored rather than guessed at.
const normalize = s => s.toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Barça -> barca, Dépor -> depor
  .replace(/[^a-z0-9]/g, "");

const codeKeys = c => [...new Set(
  [c.id, c.short, c.name, ...(c.aliases || []), ...(c.matchAs || [])].map(normalize))];

function clubsForCode(code) {
  const c = normalize(code);
  if (!c) return [];
  const exact = CLUBS.filter(x => codeKeys(x).includes(c));
  if (exact.length) return exact;
  return CLUBS.filter(x => codeKeys(x).some(k => k.startsWith(c)));
}

function applyFollowParam() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  // vue-router is on hash history, so the query can sit before the hash
  // (?f=bar) or inside it (#/calendar?f=bar). Accept either.
  const hashQ = url.hash.includes("?") ? url.hash.slice(url.hash.indexOf("?") + 1) : "";
  const raw = url.searchParams.get("f") ?? new URLSearchParams(hashQ).get("f");
  if (raw === null) return;

  const ids = [];
  for (const code of raw.split(",")) {
    const hits = clubsForCode(code);
    if (hits.length === 1 && !ids.includes(hits[0].id)) ids.push(hits[0].id);
  }

  // A parameter that resolves to nothing leaves the slate alone: blanking every
  // club would strand the user on an empty ledger. Either way the parameter is
  // consumed, so switching clubs in the settings menu afterwards is not silently
  // undone by a refresh, and a junk code does not linger in the address bar.
  if (ids.length) {
    const prefs = {};
    for (const c of CLUBS) prefs[c.id] = ids.includes(c.id);
    state.clubPrefs = prefs;
  }

  url.searchParams.delete("f");
  if (hashQ) {
    const hp = new URLSearchParams(hashQ);
    hp.delete("f");
    const base = url.hash.slice(0, url.hash.indexOf("?"));
    url.hash = hp.toString() ? `${base}?${hp}` : base;
  }
  window.history.replaceState(null, "", url);
}

applyFollowParam();

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
        id: uid(), date: r.date, time: r.time || "",
        comp: r.comp || clubById(r.clubId).leagueComp,
        opponent: r.opponent, venue: r.venue || "N", gf: r.gf, ga: r.ga,
        notes: "", watched: false, mustWatch: false,
      });
    }
  }
}

function applyFixtureResult(f, gf, ga) {
  const club = clubById(f.clubId);
  if (!state.matches[f.clubId]) state.matches[f.clubId] = [];
  state.matches[f.clubId].push({
    id: uid(), date: f.date, time: f.time || "", comp: f.comp,
    opponent: f.opponent, venue: f.venue || "N", gf, ga,
    notes: f.notes || "", watched: !!f.watched, mustWatch: !!f.mustWatch,
  });
  if (f.opponentId) {
    const oppVenue = f.venue === "H" ? "A" : f.venue === "A" ? "H" : (f.venue || "N");
    if (!state.matches[f.opponentId]) state.matches[f.opponentId] = [];
    state.matches[f.opponentId].push({
      id: uid(), date: f.date, time: f.time || "", comp: f.comp,
      opponent: club.name, venue: oppVenue, gf: ga, ga: gf,
      notes: f.notes || "", watched: !!f.watched, mustWatch: !!f.mustWatch,
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

// One logged match, shaped like a fixture. The clubId is which side you are
// looking from: a club page wants its own view of a tie, scores and venue and
// all, not whichever side the calendar happened to keep.
export function matchAsFixture(clubId, m) {
  return {
    id: `m:${clubId}:${m.id}`, matchId: m.id, played: true,
    clubId, opponent: m.opponent, opponentId: detectOpponentId(clubId, m.opponent),
    venue: m.venue, comp: m.comp, date: m.date, time: m.time || "",
    gf: m.gf, ga: m.ga,
    mustWatch: !!m.mustWatch, watched: !!m.watched, notes: m.notes || "",
  };
}

// Played matches, shaped like fixtures so the calendar can keep showing the day
// after the score lands. A result moves the entry out of state.fixtures and into
// state.matches; without this the day would simply empty itself and take its
// notes and watched mark out of reach on the way out.
export const playedFixtures = computed(() => {
  const rows = [];
  for (const [clubId, ms] of Object.entries(state.matches)) {
    if (!isFollowed(clubId)) continue;
    for (const m of ms) {
      if (!m.date) continue;
      rows.push(matchAsFixture(clubId, m));
    }
  }
  // A tie between two followed clubs is logged under both of them. Keep one
  // copy — the home side's, to match how a fixture is stored — so the calendar
  // doesn't show the same game twice from either end.
  const kept = new Map();
  for (const r of rows) {
    if (!(r.opponentId && isFollowed(r.opponentId))) { kept.set(r.id, r); continue; }
    const key = [r.clubId, r.opponentId].sort().join("~") + "|" + r.date;
    const prev = kept.get(key);
    if (!prev || (r.venue === "H" && prev.venue !== "H")) kept.set(key, r);
  }
  return [...kept.values()];
});

/* ── Live sync from the API ────────────────────────────── */

const DAY = 86400e3;
const pairKey = (a, b) => [a, b].filter(Boolean).sort().join("~");

// Opponent names come from two hands: ours in fixtures.js and ESPN's in the API,
// and they rarely agree exactly ("Stade Rennais" / "Rennes", "AJ Auxerre" /
// "Auxerre"). Strip the decoration and see whether one still contains the other.
const NOISE = /\b(fc|cf|ac|as|sc|sv|rc|afc|club|de|la|el|los|the|united|city|calcio)\b/g;
const normName = s => (s || "").toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // Barca, Depor
  .replace(/[^a-z ]/g, " ").replace(NOISE, " ").replace(/\s+/g, " ").trim();

// Is this record even about the stored fixture's club? A tracked-club matchup is
// stored once under whichever side is home, so compare the unordered pair — but
// accept a half match too, since only one of the two entries knows about the
// other when a club is unfollowed and so absent from the sync.
function samePairing(f, rec) {
  if (pairKey(f.clubId, f.opponentId) === pairKey(rec.clubId, rec.opponentId)) return true;
  return f.clubId === rec.clubId || f.opponentId === rec.clubId;
}

// …and does the opponent agree, so a moved date is still recognisably this match?
function sameOpponent(f, rec) {
  if (f.opponentId && rec.opponentId) {
    return pairKey(f.clubId, f.opponentId) === pairKey(rec.clubId, rec.opponentId);
  }
  const a = normName(f.opponent), b = normName(rec.opponent);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// Find the stored fixture an API record refers to. Matching by ESPN event id is
// exact; the fallbacks exist so the FIRST sync adopts the hand-seeded fixtures
// (which carry no event id) instead of duplicating every one of them — including
// the case where a TV pick has since moved the date out from under them.
//
// The wide date window is only safe once the opponent agrees as well. Clubs play
// weekly in a league, so club+comp alone used to be enough; in a friendly they
// play every third day, and club+comp within ten days handed Brighton's August 8
// score to their August 15 fixture. A record whose opponent does not match can
// still adopt a fixture on the same day — that is a spelling difference, not a
// different match — but nothing further out.
function findStored(rec, claimed) {
  if (rec.eid) {
    const byId = state.fixtures.find(f => f.eid === rec.eid);
    if (byId) return byId;
  }
  const gap = f => Math.abs(new Date(f.date) - new Date(rec.date));
  const candidates = state.fixtures.filter(f =>
    !f.eid && !claimed.has(f.id) && f.comp === rec.comp && samePairing(f, rec) &&
    gap(f) <= (sameOpponent(f, rec) ? 10 * DAY : DAY));
  return candidates.sort((a, b) => gap(a) - gap(b))[0];
}

// An API record describes the match from the side ESPN's event matched on. A
// tracked-club matchup is stored ONCE, under whichever side owns the entry, and
// that need not be the same side — findStored deliberately matches the pair in
// either order. Copying the record across unflipped is what produced fixtures
// like "Rennes v Stade Rennais": Rennes' entry wearing PSG's description of the
// game, opponent and venue and all.
function toPerspective(rec, clubId) {
  if (rec.clubId === clubId) return rec;
  const club = clubById(rec.clubId);
  return {
    ...rec,
    clubId,
    opponentId: rec.clubId,
    opponent: club ? club.name : rec.opponent,
    venue: rec.venue === "H" ? "A" : rec.venue === "A" ? "H" : rec.venue,
    gf: rec.ga,
    ga: rec.gf,
  };
}

function logResultDirect(rec) {
  const club = clubById(rec.clubId);
  if (!state.matches[rec.clubId]) state.matches[rec.clubId] = [];
  state.matches[rec.clubId].push({
    id: uid(), date: rec.date, time: rec.time || "", comp: rec.comp, opponent: rec.opponent,
    venue: rec.venue || "N", gf: rec.gf, ga: rec.ga,
    notes: "", watched: false, mustWatch: false,
  });
  if (rec.opponentId) {
    const flip = rec.venue === "H" ? "A" : rec.venue === "A" ? "H" : rec.venue;
    if (!state.matches[rec.opponentId]) state.matches[rec.opponentId] = [];
    state.matches[rec.opponentId].push({
      id: uid(), date: rec.date, time: rec.time || "", comp: rec.comp,
      opponent: club ? club.name : rec.clubId,
      venue: flip || "N", gf: rec.ga, ga: rec.gf,
      notes: "", watched: false, mustWatch: false,
    });
  }
}

// Fold API records into saved state. User annotations — watched, notes, stars —
// are never touched: a record only ever rewrites the scheduling fields.
export function applyApiRecords(records) {
  const logged = new Set();
  for (const [cid, ms] of Object.entries(state.matches)) {
    for (const m of ms) logged.add(cid + "|" + m.date);
  }
  const claimed = new Set();
  const stats = { added: 0, updated: 0, results: 0, skipped: 0 };

  for (const rec of records) {
    const existing = findStored(rec, claimed);
    if (existing) claimed.add(existing.id);
    // Say it the way the stored fixture's owner would; scores flip with it.
    const view = existing ? toPerspective(rec, existing.clubId) : rec;

    if (rec.completed) {
      if (logged.has(rec.clubId + "|" + rec.date)) { stats.skipped++; continue; }
      if (existing) applyFixtureResult(existing, view.gf, view.ga);
      else logResultDirect(rec);
      logged.add(rec.clubId + "|" + rec.date);
      if (rec.opponentId) logged.add(rec.opponentId + "|" + rec.date);
      stats.results++;
      continue;
    }

    if (existing) {
      existing.eid = view.eid;
      existing.date = view.date;
      existing.comp = view.comp;
      existing.opponent = view.opponent;
      existing.venue = view.venue;
      existing.opponentId = view.opponentId;
      if (view.time) existing.time = view.time;
      stats.updated++;
    } else {
      state.fixtures.push({
        id: uid(), mustWatch: false, watched: false, notes: "", ...rec,
      });
      stats.added++;
    }
  }

  state.apiSyncedAt = new Date().toISOString();
  return stats;
}

export const syncState = reactive({ running: false, message: "", error: "", auto: false });

export async function syncFromApi({ from, to } = {}) {
  if (syncState.running) return null;
  syncState.running = true;
  syncState.error = "";
  syncState.message = "Contacting ESPN…";
  try {
    const clubs = activeClubs.value.filter(c => c.espnId);
    if (!clubs.length) throw new Error("No followed club has an ESPN id.");
    const { records, errors, comps } = await fetchSeason(clubs, {
      from: from || SEASON_FROM,
      to: to || SEASON_TO,
      onProgress: ({ done, total, comp }) => {
        syncState.message = `${comp} (${done}/${total})`;
      },
    });
    const stats = applyApiRecords(records);
    syncState.message =
      `${records.length} matches across ${comps} competitions · ` +
      `${stats.added} new, ${stats.updated} updated, ${stats.results} results`;
    if (errors.length) syncState.error = errors.join("; ");
    return stats;
  } catch (e) {
    syncState.error = e.message || String(e);
    syncState.message = "";
    return null;
  } finally {
    syncState.running = false;
  }
}

/* ── Automatic sync ────────────────────────────────────────
   The schedule goes stale on its own — kickoff times move, scores land — so
   a sync runs by itself once the last one is more than 15 minutes old, and
   the button becomes something you press only when you are impatient. */

const SYNC_MAX_AGE = 15 * 60 * 1000;
const SYNC_POLL = 60 * 1000;

// A failed sync leaves apiSyncedAt untouched, so age alone would put us back
// over the threshold on the very next tick and retry against a dead network
// every minute. Attempts are tracked separately and get the same cooldown.
let lastAttempt = 0;

export function syncAge() {
  if (!state.apiSyncedAt) return Infinity;
  return Date.now() - new Date(state.apiSyncedAt).getTime();
}

export function autoSyncTick() {
  if (syncState.running) return false;
  if (typeof document !== "undefined" && document.hidden) return false;
  if (syncAge() < SYNC_MAX_AGE) return false;
  if (Date.now() - lastAttempt < SYNC_MAX_AGE) return false;
  // Nothing to ask ESPN about; syncFromApi would only throw and light up the
  // error line under the button.
  if (!activeClubs.value.some(c => c.espnId)) return false;

  lastAttempt = Date.now();
  syncState.auto = true;
  syncFromApi().finally(() => { syncState.auto = false; });
  return true;
}

export function startAutoSync() {
  // Let the first paint through before touching the network.
  setTimeout(autoSyncTick, 1500);
  setInterval(autoSyncTick, SYNC_POLL);
  // Coming back to a tab left open overnight should not wait for the next tick.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) autoSyncTick();
  });
}

/* ── Derived data ──────────────────────────────────────── */

export function recordFor(clubId) {
  const club = clubById(clubId);
  const ms = [...(state.matches[clubId] || [])].sort((a, b) => a.date.localeCompare(b.date));
  const rec = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, leagueP: 0, form: [] };
  for (const m of ms) {
    // Friendlies are logged and shown like any other match, but a pre-season
    // 4–3 against a touring side is not part of anyone's season record.
    if (m.comp === "Friendly") continue;
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

/* Annotations on a match that has already been played. A two-club tie is logged
   under both clubs, so every write lands on both copies — otherwise the note you
   leave on the calendar is missing from one of the two club pages. */

function eachMatchCopy(clubId, matchId, fn) {
  const m = (state.matches[clubId] || []).find(x => x.id === matchId);
  if (!m) return;
  fn(m);
  const oppId = detectOpponentId(clubId, m.opponent);
  const mirror = oppId && (state.matches[oppId] || []).find(x => x.date === m.date);
  if (mirror) fn(mirror);
}

// Both copies are set to one computed value rather than flipped independently,
// so a pair that has drifted apart comes back into agreement instead of staying
// inverted forever.
export function toggleMatchStar(clubId, matchId) {
  const m = (state.matches[clubId] || []).find(x => x.id === matchId);
  if (!m) return;
  const v = !m.mustWatch;
  eachMatchCopy(clubId, matchId, x => { x.mustWatch = v; });
}

export function toggleMatchWatched(clubId, matchId) {
  const m = (state.matches[clubId] || []).find(x => x.id === matchId);
  if (!m) return;
  const v = !m.watched;
  eachMatchCopy(clubId, matchId, x => { x.watched = v; });
}

export function setMatchNotes(clubId, matchId, notes) {
  eachMatchCopy(clubId, matchId, x => { x.notes = notes.trim(); });
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
