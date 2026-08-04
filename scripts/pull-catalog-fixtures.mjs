// Generate LEAGUE_FIXTURES tuples for catalog clubs from ESPN's public API.
//
//   node scripts/pull-catalog-fixtures.mjs [clubId ...]
//
// The nine original clubs' fixture lists were gathered by hand and carry TV-move
// history in MOVED_FIXTURES; this script is for the catalog clubs added later,
// whose lists come from the API instead. It PRINTS a block to paste into
// LEAGUE_FIXTURES in src/data/fixtures.js — it does not edit the file, so a
// re-run can never quietly rewrite fixtures you have already reconciled.
//
// Only domestic-league fixtures are emitted. Cup and European ties come from
// draws that have not happened yet and belong in CUP_FIXTURES by hand.

import { CLUBS } from "../src/data/data.js";

// Which ESPN league scoreboard to read each club's season from.
const LEAGUE_SLUG = {
  laLiga: "esp.1", ligue1: "fra.1", premierLeague: "eng.1",
  championship: "eng.2", serieA: "ita.1", bundesliga: "ger.1",
};

const SEASON_FROM = "20260701";
const SEASON_TO = "20270701";

const fmtCT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago", hour: "numeric", minute: "2-digit",
});
// ESPN reports a UTC instant; the app stores the LOCAL match date, which for
// European evening kickoffs is the same calendar day either way.
const dateCT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
});

async function scoreboard(slug) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}` +
    `/scoreboard?dates=${SEASON_FROM}-${SEASON_TO}&limit=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  return (await res.json()).events || [];
}

const wanted = process.argv.slice(2);
const targets = CLUBS.filter(c => c.espnId &&
  (wanted.length ? wanted.includes(c.id) : c.seeded === false));

if (!targets.length) {
  console.log("No catalog clubs with an espnId to pull. Pass club ids explicitly to override.");
  process.exit(0);
}

// ESPN's own spelling of a tracked club ("Deportivo La Coruña", "Stade Rennais")
// does not always contain that club's short or full name, which is what
// findOpp() matches on — so a mismatch would store the same match twice, once
// from each side. Emitting the app's canonical name keeps matchups deduped.
const BY_ESPN_ID = new Map(CLUBS.filter(c => c.espnId).map(c => [c.espnId, c]));
const canonical = team => BY_ESPN_ID.get(team.id)?.name || team.displayName;

const cache = new Map();
for (const club of targets) {
  const slug = LEAGUE_SLUG[club.league];
  if (!slug) { console.warn(`! ${club.id}: no league slug for ${club.league}`); continue; }
  if (!cache.has(slug)) cache.set(slug, await scoreboard(slug));

  const rows = [];
  for (const ev of cache.get(slug)) {
    const c = ev.competitions?.[0];
    const home = c?.competitors.find(x => x.homeAway === "home");
    const away = c?.competitors.find(x => x.homeAway === "away");
    if (!home || !away) continue;
    const isHome = home.team.id === club.espnId;
    const isAway = away.team.id === club.espnId;
    if (!isHome && !isAway) continue;
    const them = isHome ? away : home;
    const kickoff = new Date(ev.date);
    rows.push({
      date: dateCT.format(kickoff),
      opponent: canonical(them.team),
      venue: isHome ? "H" : "A",
      time: c.timeValid !== false ? fmtCT.format(kickoff) : null,
    });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`\n  ${club.id}: { comp: ${JSON.stringify(club.leagueComp)}, games: [`);
  for (const r of rows) {
    const t = r.time ? `,"${r.time}"` : "";
    console.log(`    ["${r.date}","${r.opponent}","${r.venue}"${t}],`);
  }
  console.log(`  ]},   // ${rows.length} fixtures, pulled from ESPN`);
}
