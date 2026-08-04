// How much of a spectacle each club brings to a match, 0–100.
//
// This is the input to watchRating() in utils.js. It is deliberately about the
// MATCH, not about loyalty: a big away day at Anfield rates higher than a home
// game with a promoted side, whichever club you follow. Personal pull (both your
// clubs, must-watch) is added separately on top by the rating function.
//
// The scale is anchored at two points the ratings were calibrated against:
//   Real Madrid v Barcelona  -> 90   (92 x 92 / 100, plus the derby lift)
//   Brighton v Leeds         -> 15   (48 x 31 / 100)
// Because the two statures are multiplied, a match is only as good as its weaker
// side — which is why a mid-table Premier League fixture lands in the teens while
// two giants meeting lands in the nineties.
//
// Keys are matched as case-insensitive substrings of the opponent name, longest
// key first, so "Olympique Lyonnais", "Lyon" and "Lyon" in any spelling all hit
// the same entry. Every opponent currently in fixtures.js resolves to an entry;
// anything unmatched falls back to LEAGUE_FALLBACK for its competition.

export const STATURE = {
  // ── Elite ────────────────────────────────────────────────
  "real madrid": 92, "barcelona": 92, "bayern": 90, "manchester city": 89,
  "liverpool": 89, "paris saint-germain": 87, "arsenal": 86, "inter": 86,

  // ── Very strong ──────────────────────────────────────────
  "atletico madrid": 82, "atlético madrid": 82, "juventus": 82, "chelsea": 82,
  "manchester united": 82, "borussia dortmund": 82, "napoli": 80, "milan": 80,
  "roma": 76, "tottenham": 76, "leverkusen": 75, "marseille": 74,
  "rb leipzig": 72, "lazio": 71, "newcastle": 70, "atalanta": 70,

  // ── Strong ───────────────────────────────────────────────
  "aston villa": 66, "athletic club": 66, "eintracht frankfurt": 65, "sevilla": 65,
  "olympique lyonnais": 64, "lyon": 64, "real sociedad": 63, "villarreal": 63,
  "real betis": 63, "fiorentina": 62, "monaco": 62, "stuttgart": 61,
  "valencia": 60, "lille": 60, "lens": 58, "west ham": 57, "bologna": 56,
  "celta": 55, "torino": 54, "genoa": 52, "nice": 52,

  // ── Premier League mid / lower ───────────────────────────
  "everton": 52, "crystal palace": 51, "nottingham forest": 50, "brighton": 48,
  "fulham": 47, "brentford": 46, "wolverhampton": 45, "bournemouth": 44,
  "sunderland": 42, "espanyol": 42, "osasuna": 41, "rayo vallecano": 41,
  "getafe": 40, "alaves": 39, "alavés": 39, "mainz": 45, "hoffenheim": 44,
  "monchengladbach": 52, "mönchengladbach": 52, "union berlin": 46,
  "freiburg": 48, "hamburger": 50, "schalke": 48, "augsburg": 40,
  "werder": 47, "koln": 47, "köln": 47, "paderborn": 26, "elversberg": 22,

  // ── Serie A mid / lower ──────────────────────────────────
  "udinese": 42, "como": 42, "sassuolo": 38, "parma": 38, "cagliari": 36,
  "lecce": 34, "monza": 34, "venezia": 33, "frosinone": 31,

  // ── La Liga mid / lower ──────────────────────────────────
  "levante": 36, "elche": 34, "deportivo": 40, "racing santander": 32,
  "malaga": 34, "málaga": 34,

  // ── Ligue 1 mid / lower ──────────────────────────────────
  "strasbourg": 48, "brest": 45, "rennes": 52, "toulouse": 43, "auxerre": 38,
  "angers": 35, "le havre": 34, "paris fc": 38, "lorient": 36,
  "le mans": 30, "troyes": 32,

  // ── Premier League promoted / Championship ───────────────
  "leeds": 31, "ipswich": 33, "coventry": 30, "hull": 29,
  "southampton": 36, "burnley": 34, "norwich": 32, "middlesbrough": 32,
  "sheffield united": 32, "west bromwich": 31, "birmingham": 30, "stoke": 29,
  "derby county": 28, "cardiff": 28, "swansea": 28, "watford": 28,
  "portsmouth": 27, "wrexham": 30, "blackburn": 26, "bristol city": 26,
  "queens park rangers": 26, "preston": 24, "millwall": 24, "charlton": 24,
  "bolton": 24, "lincoln": 21, "rotherham": 18,

  // ── Lower-division cup opposition ────────────────────────
  "luneburger": 12, "lüneburger": 12, "cfr cluj": 26, "tromso": 24, "tromsø": 24,
};

// Used when an opponent name matches nothing above — mostly unseeded European
// ties whose participants are not known until the draw.
export const LEAGUE_FALLBACK = {
  "Premier League": 45, "EFL Championship": 27, "La Liga": 42, "Serie A": 44,
  "Bundesliga": 42, "Ligue 1": 40, "EFL Cup": 26, "FA Cup": 26,
  "Copa del Rey": 28, "Coppa Italia": 28, "DFB-Pokal": 26, "Coupe de France": 26,
  "UEFA Champions League": 70, "UEFA Europa League": 48, "UEFA Conference League": 34,
};

// Competition weighting applied to the stature product. European nights and
// derbies carry an occasion the raw club ratings miss; early domestic cup rounds
// against lower-division sides carry less than the same clubs in the league.
export const COMP_WEIGHT = {
  "UEFA Champions League": 1.15,
  "UEFA Europa League": 1.08,
  "UEFA Conference League": 1.05,
  "EFL Cup": 0.85, "FA Cup": 0.9, "DFB-Pokal": 0.85,
  "Coppa Italia": 0.85, "Copa del Rey": 0.85, "Coupe de France": 0.85,
};

// A derby is worth watching even when neither side is fashionable, so rivalry
// closes part of the gap to 100 rather than adding a flat number. Proportional
// lift keeps a small local derby respectable (Wrexham–Cardiff ≈ 41) without
// letting it outrank a genuine heavyweight tie, which a flat floor did.
export const DERBY_LIFT = 0.35;

// Personal pull, added after the spectacle score.
export const BOTH_CLUBS_BONUS = 10;
export const MUST_WATCH_BONUS = 12;

const KEYS = Object.keys(STATURE).sort((a, b) => b.length - a.length);

export function statureFor(name, comp) {
  const n = (name || "").toLowerCase();
  for (const k of KEYS) if (n.includes(k)) return STATURE[k];
  return LEAGUE_FALLBACK[comp] ?? 35;
}
