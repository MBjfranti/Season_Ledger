// Seed data: the eight clubs, their leagues, forecasts, key fixtures and season previews.
// Narratives are the owner's own 2026-27 previews, stored verbatim.

export const LEAGUES = {
  premierLeague: { name: "Premier League", country: "England", size: 20 },
  championship:  { name: "EFL Championship", country: "England/Wales", size: 24 },
  ligue1:        { name: "Ligue 1", country: "France", size: 18 },
  laLiga:        { name: "La Liga", country: "Spain", size: 20 },
  serieA:        { name: "Serie A", country: "Italy", size: 20 },
  bundesliga:    { name: "Bundesliga", country: "Germany", size: 18 },
};

// US broadcast rights mapped to the owner's services. Each competition lists
// every relevant service; each renders as its own chip. Spanish-language feeds
// (the owner often prefers them) get their own chip with note "Esp.".
// have: true = already subscribed (ESPN+, Peacock, Paramount+) or free (Fandango); false = not yet.
export const BROADCAST = {
  "Premier League":          [{ svc: "Peacock · Esp.", have: true }],
  "EFL Championship":        [{ svc: "Paramount+", have: true }],
  "EFL Cup":                 [{ svc: "Paramount+", have: true }],
  "FA Cup":                  [{ svc: "ESPN+", have: true }],
  "Ligue 1":                 [{ svc: "beIN Sports · Esp.", have: false, note: "planned" }],
  "Coupe de France":         [{ svc: "Check listings", have: false }],
  "La Liga":                 [{ svc: "ESPN+ · Esp.", have: true }],
  "Copa del Rey":            [{ svc: "ESPN+", have: true }],
  "Serie A":                 [{ svc: "Paramount+", have: true }],
  "Coppa Italia":            [{ svc: "Paramount+", have: true }],
  "Bundesliga":              [{ svc: "Fandango", have: true, note: "free" },
                              { svc: "USA Network", have: false },
                              { svc: "Peacock", have: true, note: "Esp." }],
  "DFB-Pokal":               [{ svc: "Check listings", have: false, note: "US rights TBD post-ESPN" }],
  "UEFA Conference League":  [{ svc: "Paramount+", have: true }],
  "UEFA Europa League":      [{ svc: "Paramount+", have: true }],
  "UEFA Champions League":   [{ svc: "Paramount+", have: true },
                              { svc: "TUDN", have: false, note: "Esp." }],
};

// Derby / rivalry opponents per club (matched by substring, case-insensitive).
export const RIVALS = {
  brighton:  ["Crystal Palace"],
  wrexham:   ["Cardiff", "Chester", "Shrewsbury"],
  westbrom:  ["Wolverhampton", "Wolves", "Aston Villa", "Birmingham"],
  lincoln:   ["Grimsby", "Scunthorpe"],
  rennes:    ["Lorient", "Nantes", "Guingamp"],
  lorient:   ["Rennes", "Nantes", "Brest", "Guingamp"],
  deportivo: ["Celta"],
  milan:     ["Inter", "Juventus", "Genoa"],
  bremen:    ["Hamburg", "HSV"],
  barcelona: ["Real Madrid", "Espanyol"],
  realmadrid: ["Barcelona", "Atlético", "Atletico"],
  psg:       ["Marseille", "Lyon"],
};

// Marquee opponents per league — a match against these is worth watching.
export const BIG_OPPONENTS = {
  premierLeague: ["Arsenal", "Liverpool", "Manchester City", "Man City", "Manchester United", "Man United", "Man Utd", "Chelsea", "Tottenham", "Spurs", "Newcastle", "Aston Villa"],
  championship:  ["Leeds", "Sunderland", "Leicester", "Southampton", "Norwich", "Middlesbrough", "Sheffield United", "Sheffield Wednesday", "Ipswich", "Wolverhampton", "West Ham", "Burnley"],
  ligue1:        ["PSG", "Paris Saint-Germain", "Marseille", "Lyon", "Monaco", "Lille", "Nice", "Lens"],
  laLiga:        ["Real Madrid", "Barcelona", "Atlético", "Atletico", "Athletic", "Sevilla", "Villarreal", "Real Sociedad", "Betis"],
  serieA:        ["Inter", "Juventus", "Napoli", "Roma", "Lazio", "Atalanta", "Fiorentina", "Bologna"],
  bundesliga:    ["Bayern", "Dortmund", "Leverkusen", "RB Leipzig", "Leipzig", "Frankfurt", "Stuttgart"],
};

// Local image assets (downloaded from Wikimedia Commons; see img/CREDITS.txt).
// The app degrades gracefully if a file is missing.
// Official club websites, linked from each club page banner.
export const CLUB_SITES = {
  brighton:  "https://www.brightonandhovealbion.com",
  wrexham:   "https://www.wrexhamafc.co.uk",
  westbrom:  "https://www.wba.co.uk",
  lincoln:   "https://www.weareimps.com",
  rennes:    "https://www.srfc.bzh",
  lorient:   "https://www.fclorient.bzh",
  deportivo: "https://www.rcdeportivo.es",
  milan:     "https://www.acmilan.com",
  bremen:    "https://www.werder.de",
  barcelona: "https://www.fcbarcelona.com",
  realmadrid: "https://www.realmadrid.com",
  psg:       "https://www.psg.fr",
};

// Stadium name + capacity shown on club banners (verified July 2026).
export const STADIUMS = {
  brighton:  { name: "American Express Stadium (The Amex)", capacity: 31876 },
  wrexham:   { name: "STōK Cae Ras (Racecourse Ground)", capacity: 10771, note: "new Kop opens during 2026–27, rising to ~18,000" },
  westbrom:  { name: "The Hawthorns", capacity: 26850 },
  lincoln:   { name: "LNER Stadium (Sincil Bank)", capacity: 10669 },
  rennes:    { name: "Roazhon Park", capacity: 29778 },
  lorient:   { name: "Stade du Moustoir", capacity: 18110 },
  deportivo: { name: "Estadio Abanca-Riazor", capacity: 32490 },
  milan:     { name: "San Siro (Stadio Giuseppe Meazza)", capacity: 75817 },
  bremen:    { name: "Weserstadion", capacity: 42100 },
  barcelona: { name: "Spotify Camp Nou", capacity: 62652, note: "phased reopening; ~105,000 when the rebuild completes in 2027" },
  realmadrid: { name: "Santiago Bernabéu", capacity: 78297 },
  psg:       { name: "Parc des Princes", capacity: 47929 },
};

// heroPos: optional CSS background-position to control the hero crop (default "center 35%").
export const CLUB_IMAGES = {
  brighton:  { hero: "img/hero-brighton.jpg",  crest: "img/crest-brighton.png", heroPos: "center 72%", action: "img/brighton-action.webp", actionPos: "center 30%" },
  wrexham:   { hero: "img/hero-wrexham.jpg",   crest: "img/crest-wrexham.png", heroPos: "center 55%", action: "img/wrexham-action.webp", actionPos: "center 22%" },
  westbrom:  { hero: "img/hero-westbrom.jpg",  crest: "img/crest-westbrom.png", heroPos: "center 45%", action: "img/westbrom-action.webp", actionPos: "center 28%" },
  lincoln:   { hero: "img/hero-lincoln.jpg",   crest: "img/crest-lincoln.png", heroPos: "center 50%", action: "img/lincoln-action.webp", actionPos: "center 25%" },
  rennes:    { hero: "img/hero-rennes.jpg",    crest: "img/crest-rennes.png", heroPos: "center 55%", action: "img/rennes-action.webp", actionPos: "center 20%" },
  lorient:   { hero: "img/hero-lorient.jpg",   crest: "img/crest-lorient.png", heroPos: "center", action: "img/lorient-action.webp", actionPos: "center 22%" },
  deportivo: { hero: "img/hero-deportivo.jpg", crest: "img/crest-deportivo.png", heroPos: "center 12%", action: "img/deportivo-action.webp", actionPos: "center 22%" },
  milan:     { hero: "img/hero-milan.jpg",     crest: "img/crest-milan.png", heroPos: "center 60%", action: "img/milan-action.webp", actionPos: "center 28%" },
  bremen:    { hero: "img/hero-bremen.jpg",    crest: "img/crest-bremen.png", heroPos: "center 50%", action: "img/bremen-action.webp", actionPos: "center 22%" },
  barcelona:  { hero: "img/hero-barcelona.jpg",  crest: "img/crest-barcelona.png", heroPos: "center 45%", action: "img/barcelona-action.webp", actionPos: "center 25%" },
  realmadrid: { hero: "img/hero-realmadrid.jpg", crest: "img/crest-realmadrid.png", heroPos: "center 50%", action: "img/real-madrid-action.webp", actionPos: "center 25%" },
  psg:        { hero: "img/hero-psg.jpg",        crest: "img/crest-psg.png", heroPos: "center 45%", action: "img/psg-action.webp", actionPos: "center 25%" },
};

// Each club's dominant kit colour — feeds the glass tile glow on the dashboard.
export const CLUB_COLORS = {
  brighton: "#0057b8", wrexham: "#d2242a", lincoln: "#d0021b", westbrom: "#1e3f86",
  rennes: "#e13327", lorient: "#ff7f27", deportivo: "#0d5eaf", milan: "#d40000", bremen: "#169152",
  // Madrid play in white; the gold is trim only, and using it here turned the
  // whole pitch olive. White mixes to a shaded neutral field instead.
  barcelona: "#a50044", realmadrid: "#ffffff", psg: "#004170",
};

// Full fixture lists live in fixtures.js (SEED_FIXTURES); results drops in results.js.

// CLUBS is the *catalog*, not the followed slate. Two optional flags:
//   followByDefault: false — present in the catalog but off until switched on.
//   seeded: false          — no hand-gathered fixture list in fixtures.js, so
//                            fixtures must come from the API. Unseeded clubs are
//                            also skipped by opponent auto-matching: otherwise a
//                            tracked club's away trip to them would be dropped
//                            from the seed on the assumption they carry it.
// Clubs without a `forecast`/`preview` are catalog entries carrying no personal
// prediction; the club page hides those sections rather than inventing one.
export const CLUBS = [
  {
    id: "brighton",
    espnId: "331",
    name: "Brighton & Hove Albion",
    short: "Brighton",
    league: "premierLeague",
    leagueComp: "Premier League",
    comps: ["Premier League", "FA Cup", "EFL Cup", "UEFA Conference League"],
    manager: "Fabian Hürzeler",
    forecast: { low: 8, high: 11, extra: "At least a Conference League quarterfinal." },
    keyFixtures: [
      { label: "Conference League play-off, 1st leg (A)", when: "Aug 20, 2026", date: "2026-08-20" },
      { label: "Aston Villa (H) — opening home match", when: "Aug 23, 2026", date: "2026-08-23" },
      { label: "Conference League play-off, 2nd leg (H)", when: "Aug 27, 2026", date: "2026-08-27" },
      { label: "Conference League league phase draw", when: "Aug 28, 2026" },
    ],
    preview: [
      "Brighton enter 2026–27 having crossed another important threshold. An eighth-place finish and 53 points secured Conference League football, transforming them from an admired domestic outsider into a club expected to compete on several fronts. Fabian Hürzeler's team finished last season strongly, while Danny Welbeck scored 13 league goals—matching Brighton's Premier League-era single-season record. The challenge now is sustaining that progress while playing Thursday-night European matches.",
      "The most significant question concerns the defense. Jan Paul van Hecke and Joel Veltman have departed, removing two experienced players from the back line. Brighton have responded by signing teenage Croatian center back Luka Vušković, Austrian defender Michael Svoboda and Portuguese right back Costinha. The recruitment fits Brighton's usual philosophy: identify players before their value peaks, trust development and accept occasional mistakes as part of the process. Vušković could eventually be exceptional, but Brighton may initially lack the defensive continuity normally required for a European campaign.",
      "Hürzeler should continue asking Brighton to play aggressively, press high and create overloads rather than retreat against richer opponents. The European schedule will require greater rotation, particularly among young attacking players accustomed to rhythm and regular minutes. Brighton's season could therefore fluctuate: exhilarating wins, frustrating defensive errors and occasional flat performances after continental travel.",
      "The opening home match against Aston Villa provides an immediate test against another ambitious club operating below the traditional giants. Brighton should regard the Conference League as a competition they can genuinely win, although doing so without sacrificing league position will be difficult.",
      "My forecast: 8th–11th in the Premier League, with at least a Conference League quarterfinal. This should be an entertaining season rather than a smooth one—and an excellent moment to make Brighton your English top-flight club.",
    ],
  },
  {
    id: "wrexham",
    espnId: "352",
    name: "Wrexham",
    short: "Wrexham",
    league: "championship",
    leagueComp: "EFL Championship",
    comps: ["EFL Championship", "FA Cup", "EFL Cup"],
    manager: "Phil Parkinson",
    forecast: { low: 5, high: 9, extra: "Playoff qualification entirely realistic." },
    keyFixtures: [
      { label: "Cardiff City (A) — opening trip, all-Welsh clash", when: "Opening weekend, Aug 2026" },
    ],
    preview: [
      "Wrexham's romantic ascent has now reached its most demanding stage. Their first Championship campaign ended with a seventh-place finish, 71 points and 69 goals scored—only two points outside the playoffs. That result demonstrated that Wrexham are no longer simply a well-funded lower-league phenomenon. They are a legitimate upper-Championship club with a realistic chance of reaching the Premier League. It also changes expectations: another charming season of consolidation will no longer feel sufficient.",
      "Phil Parkinson has an unusually experienced squad for this level. Conor Coady, Dominic Hyam, Ben Sheaf, Lewis O'Brien, Josh Windass, Kieffer Moore and Nathan Broadhead provide considerable second-tier and international experience. Captain Hyam made 43 appearances last season, while Arthur Okonkwo gives the club a goalkeeper capable of remaining with the project through another promotion. The roster is deep, physical and prepared for the Championship's relentless schedule.",
      "The concern is defensive control. Wrexham conceded 65 league goals last season, considerably more than a typical promotion side. Parkinson's teams are usually associated with organization, set pieces and physical authority, but Wrexham occasionally became stretched when chasing matches. Turning several chaotic draws or defeats into narrow victories may be the difference between seventh and the top six.",
      "The club has released several peripheral veterans, suggesting a transition away from players associated with the earlier promotion climb and toward a more polished Championship group. That evolution must be handled carefully: Wrexham's competitive spirit has come partly from players who experienced the entire journey.",
      "An opening trip to Cardiff immediately emphasizes the Welsh dimension of the season and should produce an intense atmosphere. Wrexham will now be judged less by celebrity ownership and more by whether they can defeat clubs with comparable budgets and deeper second-tier experience.",
      "My forecast: 5th–9th, with playoff qualification entirely realistic. Promotion would be remarkable, but no longer unbelievable.",
    ],
  },
  {
    id: "lincoln",
    espnId: "314",
    name: "Lincoln City",
    short: "Lincoln",
    league: "championship",
    leagueComp: "EFL Championship",
    comps: ["EFL Championship", "FA Cup", "EFL Cup"],
    manager: "Chris Cohen & Tom Shaw",
    forecast: { low: 18, high: 22, extra: "Survival by any margin is a successful season." },
    keyFixtures: [
      { label: "Middlesbrough (A) — opening trip", when: "Opening weekend, Aug 2026" },
      { label: "Portsmouth (H) — first home match", when: "Aug 2026" },
    ],
    preview: [
      "Lincoln City begin one of the most consequential seasons in their modern history. The Imps won League One with more than 100 points and return to England's second tier for the first time in 65 years. That achievement creates both momentum and danger: Lincoln were extraordinarily good at one level, but the Championship contains relegated Premier League clubs, expensive squads and relentless midweek fixtures. The objective must be survival, regardless of how impressive last season looked.",
      "The most unusual development is the coaching structure. Michael Skubala has departed, with former assistants Chris Cohen and Tom Shaw installed as co-head coaches. Promoting from within preserves tactical continuity and dressing-room relationships, but shared leadership will receive immediate scrutiny whenever results deteriorate. Lincoln cannot afford a long adjustment period while the new arrangement establishes authority.",
      "The squad retains a recognizable and experienced spine. Tendayi Darikwa provides leadership, with Sonny Bradley and Adam Jackson offering defensive experience. George Wickens remains an important young goalkeeper, while Tom Bayliss, Conor McGrandles and Jack Moylan supply midfield quality. Ben House, Freddie Draper, Rob Street and veteran James Collins give Lincoln several different forward profiles without an obvious guaranteed Championship-level scorer.",
      "Lincoln's best chance lies in making home matches uncomfortable. They must preserve the energy, directness and collective discipline of the promotion side rather than attempting to imitate wealthier possession teams. Set pieces, second balls and late goals may matter more than aesthetic consistency. Away from home, accepting draws and avoiding heavy defeats will be crucial.",
      "The opening trip to Middlesbrough is a harsh introduction, followed by a home match against Portsmouth. Those fixtures should quickly reveal whether Lincoln's defensive structure can survive the jump in attacking quality.",
      "My forecast: 18th–22nd. Survival by any margin would constitute a successful season. Of all your selected clubs, Lincoln should produce the most intense weekly emotional investment.",
    ],
  },
  {
    id: "westbrom",
    espnId: "383",
    name: "West Bromwich Albion",
    short: "West Brom",
    league: "championship",
    leagueComp: "EFL Championship",
    comps: ["EFL Championship", "FA Cup", "EFL Cup"],
    manager: "James Morrison",
    forecast: { low: 8, high: 13, extra: "A playoff push if the Morrison bounce survives a full season." },
    keyFixtures: [
      { label: "Rotherham United (A) — EFL Cup R1", when: "Aug 8, 2026", date: "2026-08-08" },
      { label: "Norwich City (A) — opening trip", when: "Aug 15, 2026", date: "2026-08-15" },
      { label: "Burnley (H) — first home match", when: "Aug 23, 2026", date: "2026-08-23" },
      { label: "Wolves (A) — Black Country derby", when: "Sep 20, 2026", date: "2026-09-20" },
      { label: "Wrexham (A)", when: "Oct 13, 2026", date: "2026-10-13" },
      { label: "Lincoln City (A) — Boxing Day", when: "Dec 26, 2026", date: "2026-12-26" },
    ],
    preview: [
      "West Brom arrive in 2026–27 as a club that has just survived itself. Last season contained four separate managerial spells—Ryan Mason sacked in January, Eric Ramsay hired from Minnesota United and dismissed nine winless games later, and James Morrison twice stepping up from the coaching staff—plus a two-point deduction for a Profit and Sustainability breach that was among the smallest in EFL history. The result was 21st place, four points above the drop, rescued almost entirely by Morrison's late run: one defeat in the final fourteen matches.",
      "That run earned the 39-year-old club legend the permanent job through 2028, and it is the season's central bet. Morrison made over 350 appearances for Albion, galvanized a fractured dressing room as caretaker, and prefers a straightforward 4-4-2. But interim bounces are notoriously loud and short, and this will be his first full season managing anywhere. The captaincy was still unsettled in pre-season—Jed Wallace has been released, with Alex Mowatt and Jayson Molumby the likeliest candidates.",
      "The squad is better than last season's finish suggests. Isaac Price, still only 22, scored nine league goals from midfield and is the roster's most valuable asset; Aune Heggebø matched those nine up front. Chris Mepham, Nat Phillips and Krystian Bielik give Morrison an experienced center-back group. The summer has been young and modest: £4m striker Jimmy-Jay Morgan from Chelsea, Falkirk's Barney Stewart, and depth signings in goal and defense. The obvious hole is width—Morrison has said publicly that the squad lacks senior wingers, and until that is fixed the 4-4-2 risks becoming narrow and predictable.",
      "Off the field, Shilen Patel's ownership is still cleaning up inherited finances—the PSR breach was a legacy issue the club chose not to appeal—and claims Albion enter this season in a healthier position with room to invest. They will need it: West Ham, Wolves and Burnley all came down from the Premier League, making this one of the strongest second tiers in years. Bookmakers price Albion mid-pack, around 17/2 for promotion. The Black Country derby returns to the league calendar on September 20 at Molineux, with the reverse at The Hawthorns in February.",
      "For your slate, Albion thread directly through your other English clubs: away at Wrexham on October 13, hosting them on February 16, and a Boxing Day trip to Lincoln with the return in March—four league dates where two of your clubs collide.",
      "My forecast: 8th–13th. If Morrison's galvanizing effect is real and a winger or two arrives, the playoffs are reachable; if it was an interim illusion, mid-table anonymity beckons. Either way, this is a big club at a genuinely uncertain hinge point—exactly the kind of season worth documenting.",
    ],
  },
  {
    id: "rennes",
    espnId: "169",
    name: "Stade Rennais",
    short: "Rennes",
    league: "ligue1",
    leagueComp: "Ligue 1",
    comps: ["Ligue 1", "Coupe de France", "UEFA Europa League"],
    manager: "Franck Haise",
    forecast: { low: 4, high: 7, extra: "Progression from the Europa League's opening phase." },
    keyFixtures: [
      { label: "PSG (A) — opening match", when: "Opening weekend, Aug 2026" },
      { label: "Le Mans (H) — first home match", when: "Aug 2026" },
      { label: "Lorient (Derby Breton)", when: "Nov 21, 2026", date: "2026-11-21" },
      { label: "Lorient (Derby Breton, return)", when: "Jan 30, 2027", date: "2027-01-30" },
    ],
    preview: [
      "Rennes enter 2026–27 with the strongest competitive outlook among your French clubs. Last season ended with Europa League qualification, completing an impressive recovery after the club had finished twelfth the previous year and substantially rebuilt its squad. Rennes now have enough attacking talent and financial strength to challenge for the Champions League places, but European participation will test whether the reconstruction has genuine depth.",
      "Franck Haise begins his first full season after taking charge in February. His reputation was built through structured, intense teams capable of competing against richer opponents, and Rennes possess players suited to his preference for energetic wing play and coordinated pressing. Haise also has an earlier connection to the Rennes academy, making this more than a purely opportunistic appointment.",
      "Estéban Lepaul is the central attacking figure and has renewed his contract through 2030. Around him, Breel Embolo, Mousa Al-Tamari and Ludovic Blas give Rennes several routes to goal. American international Bryan Reynolds adds pace and attacking ambition on the right. The squad's ceiling is high, although Haise must prevent the team from becoming too open when its wingbacks advance simultaneously.",
      "Rennes begin with the hardest possible league assignment, away to PSG, before hosting promoted Le Mans. That contrast should offer an immediate measure of both Rennes's ceiling and its ability to dominate opponents it is expected to beat. The Breton meetings with Lorient arrive on November 21 and January 30, giving your French season two natural centerpiece fixtures.",
      "The Europa League is a meaningful opportunity rather than an inconvenience, but Rennes cannot allow continental travel to produce another inconsistent domestic campaign.",
      "My forecast: 4th–7th in Ligue 1, with progression from the Europa League's opening phase. Rennes should be your French club for ambitious, high-level football—the side capable of troubling PSG and reaching Europe regularly.",
    ],
  },
  {
    id: "lorient",
    espnId: "273",
    name: "FC Lorient",
    short: "Lorient",
    league: "ligue1",
    leagueComp: "Ligue 1",
    comps: ["Ligue 1", "Coupe de France"],
    manager: "Alexandre Dujeux",
    forecast: { low: 11, high: 15, extra: "Survival expected; thin squad is the risk." },
    keyFixtures: [
      { label: "Nice (A) — opening trip", when: "Opening weekend, Aug 2026" },
      { label: "Troyes (H) — must-win home opener", when: "Aug 2026" },
      { label: "Rennes (Derby Breton)", when: "Nov 21, 2026", date: "2026-11-21" },
      { label: "Rennes (Derby Breton, return)", when: "Jan 30, 2027", date: "2027-01-30" },
    ],
    preview: [
      "Lorient offer a different Breton experience: smaller, more maritime and less predictable. The Merlus enter their centenary year with a new coach, a changing squad and new ownership firmly in control. Alexandre Dujeux has signed for two seasons, with an additional option, after guiding Angers to promotion and then maintaining its top-flight status. His appointment suggests Lorient are prioritizing practicality and stability rather than an experimental tactical revolution.",
      "The current squad remains relatively lean. Yvon Mvogo provides experience in goal, while Montassar Talbi, Nathaniel Adjei, Isaak Touré and Formose Mendy form a physically imposing defensive group. Théo Le Bris is one of the players most strongly associated with Lorient's modern identity, while Mohamed Bamba and Aiyegun Tosin carry much of the attacking burden. Alec Georgen and Gabin Bernardeau are among the summer additions, but further recruitment appears necessary—especially in midfield and across the forward line.",
      "Dujeux's first responsibility will be making Lorient difficult to defeat. The Moustoir can create an intimate, unusual home environment, and Lorient should aim to accumulate points there before confronting the division's deeper squads. An opening trip to Nice is difficult, but the following home game against newly promoted Troyes is exactly the type Lorient must win if they want a calm season.",
      "The unavoidable caveat is institutional. Black Knight Football Club became Lorient's sole shareholder in January, placing the club completely inside Bill Foley's multi-club network. That does not determine what occurs on the pitch, but it means Lorient's strong local identity now sits within an increasingly international ownership structure.",
      "My forecast: 11th–15th. Lorient should survive, although a thin squad leaves limited protection against injuries. They remain perhaps your most aesthetically natural French choice: orange and black, a fish badge, a compact port city and football beside the Breton coast.",
    ],
  },
  {
    id: "deportivo",
    espnId: "90",
    name: "Deportivo de La Coruña",
    short: "Dépor",
    league: "laLiga",
    leagueComp: "La Liga",
    comps: ["La Liga", "Copa del Rey"],
    manager: "Antonio Hidalgo",
    forecast: { low: 14, high: 18, extra: "Narrowly surviving." },
    keyFixtures: [
      { label: "Elche (H) — opener at Riazor", when: "Opening weekend, Aug 2026" },
      { label: "Málaga (A)", when: "Aug 2026" },
      { label: "Valencia (H)", when: "Aug/Sep 2026" },
      { label: "Celta Vigo (A) — Galician derby", when: "Jan 3, 2027", date: "2027-01-03" },
      { label: "Celta Vigo (H) — Galician derby at Riazor", when: "Apr 18, 2027", date: "2027-04-18" },
    ],
    preview: [
      "Deportivo return to La Liga carrying one of the season's strongest narratives. After years of financial crisis, relegations and time in the third tier, Dépor are again playing in Spain's first division. The immediate objective is survival, but the summer recruitment indicates that the club does not intend merely to enjoy the occasion. Riazor should become one of La Liga's most emotionally charged grounds, particularly during the opening months.",
      "The headline arrival is Pierre-Emerick Aubameyang, signed through 2028 after leaving Marseille. He brings elite movement, finishing and global recognition to a promoted team, although his age means Deportivo must manage his minutes carefully. Lorenzo Amatucci, Jonathan Asp Jensen and Teun Gijselhart represent a different recruitment track: young players signed to long-term contracts who could appreciate substantially in value.",
      "Antonio Hidalgo still has the creative core that earned promotion. Yeremay Hernández recorded 11 goals and 10 assists last season, Zakaria Eddahchouri scored 13, Luismi Cruz supplied 11 assists and Mario Soriano contributed across midfield. The central tactical question is how Hidalgo combines those mobile attackers with Aubameyang without making Deportivo too vulnerable when possession is lost.",
      "The schedule offers a manageable opening: Elche at Riazor, followed by Málaga away and Valencia at home. Deportivo need early points before pressure builds. The two Galician derbies against Celta—January 3 in Vigo and April 18 at Riazor—will carry significance far beyond league position.",
      "Deportivo's survival prospects depend on home form, defensive organization and whether Aubameyang remains healthy. There is enough attacking quality to trouble mid-table opponents, but newly promoted teams are often punished for mistakes that passed unnoticed in the second division.",
      "My forecast: 14th–18th, narrowly surviving. Deportivo should become one of your most rewarding teams: Atlantic, blue-and-white, regionally distinctive and fighting to reclaim a place it once considered normal.",
    ],
  },
  {
    id: "milan",
    espnId: "103",
    name: "AC Milan",
    short: "Milan",
    league: "serieA",
    leagueComp: "Serie A",
    comps: ["Serie A", "Coppa Italia", "UEFA Europa League"],
    manager: "Rúben Amorim",
    forecast: { low: 2, high: 5, extra: "Champions League qualification likely; year one of a serious rebuild." },
    keyFixtures: [
      { label: "Torino (A) — opening match", when: "Opening weekend, Aug 2026" },
      { label: "Venezia (H) — first home match", when: "Aug 2026" },
      { label: "Inter (Derby della Madonnina, H)", when: "Oct 31, 2026", date: "2026-10-31" },
      { label: "Inter (Derby della Madonnina, A)", when: "Feb 13, 2027", date: "2027-02-13" },
    ],
    preview: [
      "Milan begin 2026–27 under considerable pressure. Last season's fifth-place finish produced 70 points but left the Rossoneri outside the Champions League positions, seventeen points behind champions Inter. For a club of Milan's resources and historical expectations, returning to the top four is the minimum requirement. The appointment of Rúben Amorim indicates that the administration wants a recognizable new footballing identity rather than another incremental adjustment.",
      "Amorim has spoken about dominant football, aggressive individual duels and building strong relationships with players. His preferred structure is likely to involve three central defenders, ambitious wingbacks and two attacking players operating behind a striker. Milan's squad is intriguing for that approach. Rafael Leão, Christian Pulisic, Christopher Nkunku and Alexis Saelemaekers can occupy the spaces behind or around the center forward, while Gonçalo Ramos and Santiago Giménez provide penalty-area presence.",
      "Ramos is the defining summer arrival so far. He gives Milan an energetic, complete striker capable of pressing and attacking crosses—potentially a better structural fit than simply adding another creative forward. Mario Gila strengthens a defense already containing Fikayo Tomori, Strahinja Pavlović, Koni De Winter and Matteo Gabbia. In midfield, Luka Modrić remains an extraordinary technical resource, although Amorim must balance his intelligence against the physical demands of an aggressive system.",
      "The danger is excess choice without balance. Leão, Pulisic and Nkunku are all most dangerous in advanced areas, and Amorim must define roles clearly rather than merely placing famous attackers on the field. Wide defensive coverage may determine whether Milan challenge Inter or simply participate in another congested top-four race.",
      "Milan open away to Torino before hosting Venezia. A fast start is important because tactical overhauls become much harder once public anxiety takes hold.",
      "My forecast: 2nd–5th, with Champions League qualification likely. A title challenge is possible if Amorim solves the defensive spacing quickly, but this should primarily be viewed as the first year of a serious rebuild.",
    ],
  },
  {
    id: "bremen",
    espnId: "137",
    name: "Werder Bremen",
    short: "Werder",
    league: "bundesliga",
    leagueComp: "Bundesliga",
    comps: ["Bundesliga", "DFB-Pokal"],
    manager: "Daniel Thioune",
    forecast: { low: 9, high: 13, extra: "Stable top-half chase and two fierce northern derbies." },
    keyFixtures: [
      { label: "Freiburg (A) — opening match", when: "Opening weekend, Aug 2026" },
      { label: "RB Leipzig (H) — first home match", when: "Aug 2026" },
      { label: "Hamburg (Nordderby, H)", when: "Nov 21, 2026", date: "2026-11-21" },
      { label: "Hamburg (Nordderby, A)", when: "Mar 20, 2027", date: "2027-03-20" },
    ],
    preview: [
      "Werder Bremen enter 2026–27 as a club in transition rather than crisis. Daniel Thioune leads a young, technically interesting squad that should have enough quality to remain comfortably in the Bundesliga but still contains obvious vulnerabilities. For you, Werder completes the geographical pattern of the slate: a green-and-white club from a Hanseatic port city, connected to the North Sea through the Weser and defined by a strong regional identity.",
      "Romano Schmid is the player around whom the attack should revolve. The Austrian international wears number ten and offers creativity between midfield and the forwards. Jens Stage and Senne Lynen provide work and structure, while Samuel Mbangula, Marco Grüll and Justin Njinmah offer direct running. New arrivals Chuki and Dariusz Stalmach add youth to midfield, and Alexander Schlager has joined the goalkeeping group after leaving Salzburg.",
      "The attack remains the uncertainty. Cedric Itten gives Werder a conventional central striker, while Dawid Kownacki and young Kenny Quetant provide alternatives. Keke Topp's serious knee injury removes an important developmental option, and Njinmah has also experienced fitness trouble. Werder may create attractive passages of football without consistently converting possession into goals.",
      "Defensively, captain Marco Friedl, Niklas Stark and Amos Pieper provide experience, with Polish newcomer Oskar Wójcik adding another young option. Mitchell Weiser's recovery is particularly important because he supplies creativity and width from the right. Julián Malatini is also returning from injury, meaning Thioune may begin preseason without his ideal defensive unit fully available.",
      "Werder open away to Freiburg before hosting RB Leipzig—a demanding start that should test their organization. The emotional centerpiece is the Nordderby against Hamburg in November, with the return meeting scheduled for March.",
      "My forecast: 9th–13th. Werder are unlikely to threaten Bayern or Dortmund, but a stable top-half chase, youth development and two fierce northern derbies should make them an excellent Bundesliga club to follow.",
    ],
  },
  {
    id: "barcelona",
    name: "FC Barcelona",
    short: "Barça",
    // Opponent matching tests short and name as substrings; neither "Barça" nor
    // "FC Barcelona" appears in the bare "Barcelona" that Dépor's list uses, so
    // without this alias that matchup would be stored twice.
    aliases: ["Barcelona"],
    league: "laLiga",
    leagueComp: "La Liga",
    comps: ["La Liga", "Copa del Rey", "UEFA Champions League"],
    manager: "Hansi Flick",
    espnId: "83",
    followByDefault: false,
    keyFixtures: [],
    preview: [],
  },
  {
    id: "realmadrid",
    name: "Real Madrid",
    short: "Real Madrid",
    league: "laLiga",
    leagueComp: "La Liga",
    comps: ["La Liga", "Copa del Rey", "UEFA Champions League"],
    manager: "José Mourinho",
    espnId: "86",
    followByDefault: false,
    keyFixtures: [],
    preview: [],
  },
  {
    id: "psg",
    name: "Paris Saint-Germain",
    short: "PSG",
    league: "ligue1",
    leagueComp: "Ligue 1",
    comps: ["Ligue 1", "Coupe de France", "UEFA Champions League"],
    manager: "Luis Enrique",
    espnId: "160",
    followByDefault: false,
    keyFixtures: [],
    preview: [],
  },
];
