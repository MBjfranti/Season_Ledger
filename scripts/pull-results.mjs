// Results pull via ESPN's public JSON API (site.api.espn.com).
//
//   node scripts/pull-results.mjs [--since YYYY-MM-DD] [--until YYYY-MM-DD]
//                                 [--dry-run] [--check-upcoming [DAYS]]
//
// Finds finished matches for the eight tracked clubs across all competitions
// and appends any not yet logged to src/data/results.js (the app merges them
// on next load; already-logged dates are skipped there too, so re-running is
// safe). --dry-run prints what would be appended without writing.
//
// --check-upcoming prints the next DAYS (default 45) of ESPN fixtures with
// kickoff times in US Central and US broadcasters, flagging date/time
// mismatches against SEED_FIXTURES — a report to guide manual fixtures.js
// edits (per MOVED_FIXTURES rules), not an auto-editor.
//
// ESPN's API is unofficial: if it breaks, fall back to the manual results
// paste-in workflow this script replaces.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RESULTS } from "../src/data/results.js";
import { SEED_FIXTURES } from "../src/data/fixtures.js";
import { CLUBS } from "../src/data/data.js";

const RESULTS_PATH = fileURLToPath(new URL("../src/data/results.js", import.meta.url));

// ESPN soccer team ids are global across competitions (verified 2026-07-23).
const TEAM_IDS = {
  brighton: "331", wrexham: "352", lincoln: "314", rennes: "169",
  lorient: "273", deportivo: "90", milan: "103", bremen: "137",
};
const CLUB_BY_TEAM_ID = Object.fromEntries(Object.entries(TEAM_IDS).map(([c, t]) => [t, c]));

// ESPN league slug -> competition name as used in the app's data.
const COMPS = {
  "eng.1": "Premier League",
  "eng.2": "EFL Championship",
  "eng.fa": "FA Cup",
  "eng.league_cup": "EFL Cup",
  "fra.1": "Ligue 1",
  "fra.coupe_de_france": "Coupe de France",
  "esp.1": "La Liga",
  "esp.copa_del_rey": "Copa del Rey",
  "ita.1": "Serie A",
  "ita.coppa_italia": "Coppa Italia",
  "ger.1": "Bundesliga",
  "ger.dfb_pokal": "DFB-Pokal",
  "uefa.europa": "UEFA Europa League",
  "uefa.europa.conf": "UEFA Conference League",
};

/* ── CLI args ──────────────────────────────────────────── */

const args = process.argv.slice(2);
const flag = name => args.includes("--" + name);
function opt(name, fallback) {
  const i = args.indexOf("--" + name);
  if (i === -1) return fallback;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : fallback;
}

const todayISO = new Date().toISOString().slice(0, 10);
const since = opt("since", "2026-08-01");
const until = opt("until", todayISO);
const dryRun = flag("dry-run");
const checkUpcoming = flag("check-upcoming");
const upcomingDays = parseInt(opt("check-upcoming", "45"), 10) || 45;

/* ── ESPN fetch helpers ────────────────────────────────── */

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function scoreboard(slug, fromISO, toISO) {
  const range = fromISO.replaceAll("-", "") + "-" + toISO.replaceAll("-", "");
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${range}&limit=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  return (await res.json()).events || [];
}

// Extract the tracked-club view(s) of one ESPN event, or null if untracked.
function parseEvent(ev, comp) {
  const c = ev.competitions?.[0];
  if (!c) return null;
  const home = c.competitors.find(x => x.homeAway === "home");
  const away = c.competitors.find(x => x.homeAway === "away");
  if (!home || !away) return null;
  const homeClub = CLUB_BY_TEAM_ID[home.team.id];
  const awayClub = CLUB_BY_TEAM_ID[away.team.id];
  if (!homeClub && !awayClub) return null;
  // Two tracked clubs: one entry under the home club (the app mirrors it).
  const mine = homeClub ? home : away;
  const theirs = homeClub ? away : home;
  return {
    clubId: homeClub || awayClub,
    bothTracked: !!(homeClub && awayClub),
    date: ev.date.slice(0, 10), // UTC date == European match date for these kickoffs
    kickoffUTC: ev.date,
    timeValid: c.timeValid !== false,
    completed: !!ev.status?.type?.completed,
    venue: homeClub ? "H" : "A",
    opponent: theirs.team.displayName,
    gf: parseInt(mine.score, 10),
    ga: parseInt(theirs.score, 10),
    comp,
    broadcasts: (c.geoBroadcasts || [])
      .filter(b => (b.market?.type === "National" || b.region === "us"))
      .map(b => b.media?.shortName)
      .filter(Boolean),
  };
}

/* ── Results pull ──────────────────────────────────────── */

const fmtCT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago", hour: "numeric", minute: "2-digit",
});

function appendResults(entries) {
  let src = readFileSync(RESULTS_PATH, "utf8");
  const lines = entries.map(e => {
    const extra = ` opponent: ${JSON.stringify(e.opponent)}, comp: ${JSON.stringify(e.comp)}, venue: ${JSON.stringify(e.venue)},`;
    return `  { clubId: ${JSON.stringify(e.clubId)}, date: ${JSON.stringify(e.date)}, gf: ${e.gf}, ga: ${e.ga},${extra} },`;
  });
  const block = `  // Pulled ${todayISO} (ESPN)\n${lines.join("\n")}\n`;
  if (/export const RESULTS = \[\];/.test(src)) {
    src = src.replace("export const RESULTS = [];", `export const RESULTS = [\n${block}];`);
  } else {
    const close = src.lastIndexOf("];");
    if (close === -1) throw new Error("could not find RESULTS array close in results.js");
    src = src.slice(0, close) + block + src.slice(close);
  }
  writeFileSync(RESULTS_PATH, src);
}

async function pullResults() {
  if (since > until) {
    console.log(`Nothing to pull: window ${since} → ${until} is empty (season not started?).`);
    return;
  }
  const logged = new Set(RESULTS.map(r => r.clubId + "|" + r.date));
  const fresh = [];
  console.log(`Pulling finished matches ${since} → ${until} ...`);
  for (const [slug, comp] of Object.entries(COMPS)) {
    let events;
    try {
      events = await scoreboard(slug, since, until);
    } catch (e) {
      console.warn(`  ! ${comp}: ${e.message} (skipped)`);
      continue;
    }
    for (const ev of events) {
      const m = parseEvent(ev, comp);
      if (!m || !m.completed || isNaN(m.gf) || isNaN(m.ga)) continue;
      if (logged.has(m.clubId + "|" + m.date)) continue;
      logged.add(m.clubId + "|" + m.date);
      fresh.push(m);
    }
    await sleep(250);
  }
  fresh.sort((a, b) => a.date.localeCompare(b.date) || a.clubId.localeCompare(b.clubId));
  if (!fresh.length) {
    console.log("No new finished matches.");
    return;
  }
  for (const m of fresh) {
    const pair = m.bothTracked ? " [both tracked — single entry]" : "";
    console.log(`  ${m.date}  ${m.clubId.padEnd(9)} ${m.gf}–${m.ga} v ${m.opponent} (${m.venue}) · ${m.comp}${pair}`);
  }
  if (dryRun) {
    console.log(`Dry run: ${fresh.length} entr${fresh.length === 1 ? "y" : "ies"} NOT written.`);
  } else {
    appendResults(fresh);
    console.log(`Appended ${fresh.length} entr${fresh.length === 1 ? "y" : "ies"} to src/data/results.js.`);
  }
}

/* ── Upcoming check (report only) ──────────────────────── */

function seedFor(clubId, date) {
  return SEED_FIXTURES.find(f => f.date === date &&
    (f.clubId === clubId || (f.opponentId === clubId)));
}

async function reportUpcoming() {
  const from = todayISO;
  const to = new Date(Date.now() + upcomingDays * 86400e3).toISOString().slice(0, 10);
  console.log(`\nUpcoming fixtures ${from} → ${to} (ESPN vs seed data; times US Central):`);
  const rows = [];
  for (const [slug, comp] of Object.entries(COMPS)) {
    let events;
    try {
      events = await scoreboard(slug, from, to);
    } catch (e) {
      console.warn(`  ! ${comp}: ${e.message} (skipped)`);
      continue;
    }
    for (const ev of events) {
      const m = parseEvent(ev, comp);
      if (!m || m.completed) continue;
      if (m.bothTracked) m.pair = true;
      rows.push(m);
    }
    await sleep(250);
  }
  rows.sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC));
  const seenPair = new Set();
  for (const m of rows) {
    const key = m.clubId + "|" + m.date;
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    const time = m.timeValid ? fmtCT.format(new Date(m.kickoffUTC)) + " CT" : "TBD";
    const bc = m.broadcasts.length ? `  [${m.broadcasts.join(", ")}]` : "";
    const seed = seedFor(m.clubId, m.date);
    let note = "";
    if (!seed) {
      const near = SEED_FIXTURES.find(f =>
        (f.clubId === m.clubId || f.opponentId === m.clubId) &&
        f.comp === m.comp &&
        Math.abs(new Date(f.date) - new Date(m.date)) <= 7 * 86400e3);
      note = near
        ? `  << DATE CHANGE? seed has ${near.date} (${near.opponent})`
        : "  << NOT IN SEED (new fixture — cup draw?)";
    } else if (seed.time && m.timeValid) {
      const seedTime = seed.time.replace(/ CT$/, "");
      const espnTime = fmtCT.format(new Date(m.kickoffUTC));
      if (seedTime !== espnTime) note = `  << TIME CHANGE? seed says ${seed.time}`;
    } else if (!seed.time && m.timeValid) {
      note = "  << time newly known (seed has none)";
    }
    console.log(`  ${m.date}  ${time.padEnd(11)} ${m.clubId.padEnd(9)} v ${m.opponent} (${m.venue}) · ${m.comp}${bc}${note}`);
  }
  if (!rows.length) console.log("  (nothing found)");
}

/* ── Main ──────────────────────────────────────────────── */

await pullResults();
if (checkUpcoming) await reportUpcoming();
