// Pure helpers shared across views — no app state in here.

import { CLUBS, BROADCAST, RIVALS, BIG_OPPONENTS } from "./data/data.js";

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const clubById = id => CLUBS.find(c => c.id === id);

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
  return BROADCAST[comp] || [{ svc: "Check listings", have: false }];
}

function matchesAny(name, list) {
  const n = name.toLowerCase();
  return (list || []).some(x => n.includes(x.toLowerCase()));
}

export function fixtureReasons(f) {
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

export function fixtureScore(f) {
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

// Detect whether a typed opponent is one of the tracked clubs.
export function detectOpponentId(clubId, opponentName) {
  const n = opponentName.toLowerCase();
  const hit = CLUBS.find(c => c.id !== clubId &&
    (n.includes(c.short.toLowerCase()) || n.includes(c.name.toLowerCase())));
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
