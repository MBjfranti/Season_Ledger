// Live fixture/result source: ESPN's public JSON API (site.api.espn.com).
//
// This is what lets the app run without the hand-gathered lists in fixtures.js.
// Those remain as the offline seed — first paint, and a fallback when the API is
// unreachable — but once a sync has run the API is authoritative.
//
// Endpoint notes, verified 2026-08-04:
//   * The scoreboard endpoint sends `Access-Control-Allow-Origin: *`, so the
//     browser can call it directly. No key, no proxy. (The bare /teams listing
//     does NOT send CORS headers — do not build on that one.)
//   * One request per competition returns a whole season: `dates=YYYYMMDD-YYYYMMDD`
//     with limit=1000 gives all 380 Premier League matches in ~2.2 MB.
//   * Every event carries a stable numeric id. Keying fixtures on that id is what
//     makes a TV date change a harmless in-place update rather than a duplicate.
//
// Raw payloads are far too big for localStorage (~5 MB per origin); only the
// normalized records below are ever persisted.

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

// App competition name -> ESPN league slug.
export const COMP_SLUGS = {
  "Premier League": "eng.1",
  "EFL Championship": "eng.2",
  "FA Cup": "eng.fa",
  "EFL Cup": "eng.league_cup",
  "Ligue 1": "fra.1",
  "Coupe de France": "fra.coupe_de_france",
  "La Liga": "esp.1",
  "Copa del Rey": "esp.copa_del_rey",
  "Serie A": "ita.1",
  "Coppa Italia": "ita.coppa_italia",
  "Bundesliga": "ger.1",
  "DFB-Pokal": "ger.dfb_pokal",
  "UEFA Champions League": "uefa.champions",
  "UEFA Europa League": "uefa.europa",
  "UEFA Conference League": "uefa.europa.conf",
  // Super cups live on their own slugs — a club's league/European slugs do NOT
  // carry them, which is why PSG's Aug 12 and Aug 16 finals were missing.
  "UEFA Super Cup": "uefa.super_cup",
  "Trophée des Champions": "fra.super_cup",
  // Pre-season and mid-season friendlies. Every club plays them, so "Friendly"
  // is on every club's comps list; they carry a low weight and are kept out of
  // the W-D-L record (see recordFor in store.js).
  "Friendly": "club.friendly",
};

const SLUG_COMPS = Object.fromEntries(
  Object.entries(COMP_SLUGS).map(([name, slug]) => [slug, name]));

// Kickoffs are shown in US Central throughout the app.
const fmtTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago", hour: "numeric", minute: "2-digit",
});
const fmtDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
});

// Competitions played at a neutral ground by definition. ESPN files the Super
// Cup with a nominal home side and no neutralSite flag, which would otherwise
// have PSG "hosting" Aston Villa in Salzburg.
const NEUTRAL_COMPS = new Set(["UEFA Super Cup"]);

const compact = d => d.replaceAll("-", "");
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Every competition slug the given clubs actually contest. */
export function slugsForClubs(clubs) {
  const out = new Set();
  for (const c of clubs) {
    for (const comp of c.comps || []) {
      const slug = COMP_SLUGS[comp];
      if (slug) out.add(slug);
    }
  }
  return [...out];
}

async function fetchComp(slug, from, to) {
  const url = `${BASE}/${slug}/scoreboard?dates=${compact(from)}-${compact(to)}&limit=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  return (await res.json()).events || [];
}

/**
 * Turn one ESPN event into at most one app record. A match between two tracked
 * clubs is stored ONCE under the home club with opponentId set — the same
 * invariant the seed data uses, so both sources merge without duplicating.
 */
function normalize(ev, comp, byEspnId) {
  const c = ev.competitions?.[0];
  if (!c) return null;
  const home = c.competitors?.find(x => x.homeAway === "home");
  const away = c.competitors?.find(x => x.homeAway === "away");
  if (!home || !away) return null;

  const homeClub = byEspnId.get(home.team.id);
  const awayClub = byEspnId.get(away.team.id);
  if (!homeClub && !awayClub) return null;

  const mineIsHome = !!homeClub;
  const mine = mineIsHome ? home : away;
  const theirs = mineIsHome ? away : home;
  const club = mineIsHome ? homeClub : awayClub;
  const other = mineIsHome ? awayClub : homeClub;

  const kickoff = new Date(ev.date);
  const completed = !!ev.status?.type?.completed;
  const gf = parseInt(mine.score, 10);
  const ga = parseInt(theirs.score, 10);

  return {
    eid: String(ev.id),
    clubId: club.id,
    opponentId: other ? other.id : undefined,
    // Use the tracked club's own name for a tracked opponent: ESPN's spelling
    // ("Deportivo La Coruña") does not always match what the app calls them.
    opponent: other ? other.name : theirs.team.displayName,
    venue: (c.neutralSite || NEUTRAL_COMPS.has(comp)) ? "N" : (mineIsHome ? "H" : "A"),
    comp,
    date: fmtDate.format(kickoff),
    time: c.timeValid !== false ? `${fmtTime.format(kickoff)} CT` : "",
    completed,
    gf: completed && !isNaN(gf) ? gf : undefined,
    ga: completed && !isNaN(ga) ? ga : undefined,
  };
}

/**
 * Fetch a season's worth of fixtures and results for the given clubs.
 * onProgress({done, total, comp}) fires per competition so the UI can report.
 */
export async function fetchSeason(clubs, { from, to, onProgress } = {}) {
  const tracked = clubs.filter(c => c.espnId);
  const byEspnId = new Map(tracked.map(c => [String(c.espnId), c]));
  const slugs = slugsForClubs(tracked);

  const records = [];
  const errors = [];
  let done = 0;

  for (const slug of slugs) {
    const comp = SLUG_COMPS[slug];
    try {
      const events = await fetchComp(slug, from, to);
      for (const ev of events) {
        const rec = normalize(ev, comp, byEspnId);
        if (rec) records.push(rec);
      }
    } catch (e) {
      // One competition failing must not lose the rest of the sync.
      errors.push(`${comp}: ${e.message}`);
    }
    done++;
    onProgress?.({ done, total: slugs.length, comp });
    await sleep(200); // be polite to an API that is not officially ours
  }

  // Two tracked clubs meeting produce one record from each side of the loop
  // only if both are home somewhere; dedupe defensively on event id.
  const seen = new Set();
  const deduped = records.filter(r => !seen.has(r.eid) && seen.add(r.eid));
  deduped.sort((a, b) => a.date.localeCompare(b.date));

  return { records: deduped, errors, comps: slugs.length };
}
