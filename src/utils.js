// Pure helpers shared across views — no app state in here.

import { CLUBS, BROADCAST, RIVALS, BIG_OPPONENTS } from "./data/data.js";
import { statureFor, COMP_WEIGHT, DERBY_LIFT,
         BOTH_CLUBS_BONUS, MUST_WATCH_BONUS } from "./data/stature.js";

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const clubById = id => CLUBS.find(c => c.id === id);

// Every string that should identify a club inside an opponent name. Clubs whose
// display short is a nickname ("Barça") carry aliases so the plain form still
// matches — otherwise the matchup is stored once per side instead of shared.
// matchAs overrides the lot, for shorts that would false-positive against
// another club ("Paris" inside "Paris FC").
export const clubNameForms = c =>
  (c.matchAs || [c.short, c.name, ...(c.aliases || [])]).map(s => s.toLowerCase());

export function fmtDate(iso) {
  if (!iso) return "TBD";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function fmtDayHead(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

// Sortable minutes-since-midnight for times like "8:30 AM CT"; unknown sorts last.
export function timeSortKey(t) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t || "");
  if (!m) return 24 * 60;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
}

// Local-time ISO date. Never toISOString() for "today": that is UTC, which
// flips to tomorrow around 6-7 PM Central and hides same-evening fixtures.
const pad2 = n => String(n).padStart(2, "0");
export function toLocalISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function weekStart(iso) {
  const d = new Date(iso + "T12:00:00");
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return toLocalISO(d);
}

export function addDaysISO(iso, days) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}

export function todayISO() {
  return toLocalISO(new Date());
}

export function resultLetter(gf, ga) {
  return gf > ga ? "W" : gf < ga ? "L" : "D";
}

export function broadcastFor(comp) {
  return BROADCAST[comp] || [{ svc: "Check listings", brand: "tbd" }];
}

function matchesAny(name, list) {
  const n = name.toLowerCase();
  return (list || []).some(x => n.includes(x.toLowerCase()));
}

// store.js registers the real follow check here. A plain import would be a
// cycle (store already imports this module), and defaulting to "followed" keeps
// these helpers usable standalone in scripts and tests.
let isFollowedCheck = () => true;
export function setFollowedCheck(fn) { isFollowedCheck = fn; }

export function fixtureReasons(f) {
  const club = clubById(f.clubId);
  const reasons = [];
  // Two catalog clubs meeting is not "both your clubs" unless you actually
  // follow them — otherwise an unfollowed Clásico collects the personal bonus.
  if (f.opponentId && isFollowedCheck(f.clubId) && isFollowedCheck(f.opponentId)) {
    reasons.push("Both your clubs");
  }
  if (f.derby || matchesAny(f.opponent, RIVALS[f.clubId])) reasons.push("Derby");
  if (matchesAny(f.opponent, BIG_OPPONENTS[club.league])) reasons.push("Big opponent");
  if (/UEFA/.test(f.comp)) reasons.push("European night");
  else if (f.comp !== club.leagueComp) reasons.push("Cup tie");
  if (f.mustWatch) reasons.push("Marked must-watch");
  return reasons;
}

// A 0–100 rating for how worth watching a fixture is. Both clubs' stature is
// multiplied rather than averaged, so a match is only as good as its weaker
// side: two giants meeting scores in the nineties, a mid-table pairing in the
// teens. Competition weight, derby lift and personal pull are layered on top.
export function watchRating(f) {
  const club = clubById(f.clubId);
  const mine = statureFor(club ? club.short : f.clubId, f.comp);
  const theirs = f.opponentId
    ? statureFor(clubById(f.opponentId)?.short || f.opponent, f.comp)
    : statureFor(f.opponent, f.comp);

  let r = (mine * theirs) / 100;
  r *= COMP_WEIGHT[f.comp] ?? 1;

  const reasons = fixtureReasons(f);
  if (reasons.includes("Derby")) r += (100 - r) * DERBY_LIFT;
  if (reasons.includes("Both your clubs")) r += BOTH_CLUBS_BONUS;
  if (reasons.includes("Marked must-watch")) r += MUST_WATCH_BONUS;

  return Math.max(1, Math.min(100, Math.round(r)));
}

// Kept as the calendar/dashboard sort key so ranking and the displayed rating
// can never drift apart.
export const fixtureScore = watchRating;

// Detect whether a typed opponent is one of the tracked clubs.
export function detectOpponentId(clubId, opponentName) {
  const n = opponentName.toLowerCase();
  // Unseeded catalog clubs are excluded: pairing a fixture to one would store it
  // once as a two-club matchup that the catalog club has no fixture list to hold.
  const hit = CLUBS.find(c => c.id !== clubId && c.seeded !== false &&
    clubNameForms(c).some(f => n.includes(f)));
  return hit ? hit.id : undefined;
}

export function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function matchupLabel(f) {
  const club = clubById(f.clubId);
  if (f.venue === "A") return `${f.opponent} v ${club.short}`;
  return `${club.short} v ${f.opponent}`;
}
