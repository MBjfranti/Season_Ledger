// The competitions the tracked clubs play in.
//
// `abbr` is the compact label the calendar cells use, where a full name like
// "EFL Championship" will not fit. `slug` keys the /competition/:slug page.
// Blurbs are written for this app — unlike the club previews in data.js, which
// are the owner's own words — so keep the two clearly separated.

export const COMPETITIONS = {
  "Premier League": {
    slug: "premier-league", abbr: "PL", country: "England", tier: "First tier",
    teams: 20, format: "Double round robin, 38 matches",
    blurb: [
      "England's top division and the richest league in the sport. Twenty clubs play everyone home and away; the champion is whoever leads after 38 matches, with no playoff. The bottom three drop into the Championship.",
      "The money is what makes it distinctive. Broadcast income is shared far more evenly than in Spain or Italy, which is why promoted clubs can occasionally buy their way to safety and why mid-table sides can hold on to good players. It also makes the league relentless — there are few easy afternoons.",
      "The top five now qualify for the Champions League in most seasons, thanks to UEFA's coefficient-based extra place, which has turned the race for fourth and fifth into the league's real drama.",
    ],
  },
  "EFL Championship": {
    slug: "efl-championship", abbr: "Champ", country: "England & Wales", tier: "Second tier",
    teams: 24, format: "Double round robin, 46 matches, plus promotion playoffs",
    blurb: [
      "Twenty-four clubs, forty-six matches, and the most punishing schedule in English football. The top two go up automatically; the sides finishing third to sixth contest a playoff whose final at Wembley is routinely called the richest match in world football.",
      "What makes the Championship unusual is its compression. Relegated Premier League clubs arrive with parachute payments and expensive squads, while long-established second-tier sides operate on a fraction of that. The result is a league where form matters more than wages over a full season, and where almost nobody is truly safe until spring.",
      "Midweek fixtures are constant, squads get stretched thin, and the table can swing wildly in a fortnight. It rewards depth and stubbornness more than flair.",
    ],
  },
  "EFL Cup": {
    slug: "efl-cup", abbr: "EFL Cup", country: "England & Wales", tier: "Knockout cup",
    teams: "All 92 Premier League and EFL clubs", format: "Single-leg knockout, semi-finals over two legs",
    blurb: [
      "Known by its sponsor's name in England, the League Cup is the season's early knockout. It starts in August, before most clubs have settled, and finishes at Wembley in the spring.",
      "Bigger clubs traditionally treat the early rounds as a chance to rotate, which is precisely what makes it worth watching for anyone following a smaller side — the gap between divisions is never narrower than in a one-off tie against a second-string XI. Clubs in Europe enter later, at the third round.",
      "The winner qualifies for the Conference League play-off round, which gives it genuine stakes for a mid-table top-flight club.",
    ],
  },
  "FA Cup": {
    slug: "fa-cup", abbr: "FA Cup", country: "England & Wales", tier: "Knockout cup",
    teams: "Open to hundreds of clubs across the pyramid", format: "Single-leg knockout with replays largely abolished",
    blurb: [
      "The oldest football competition in the world, first played in 1871–72. Its qualifying rounds begin in August among non-league clubs; the Premier League and Championship sides enter at the third round in January.",
      "That third-round weekend is the point of the whole thing — the draw is unseeded and regionless, so a part-time club can be handed a tie against a European champion. Replays have been steadily stripped away in recent years to ease fixture congestion, which has reduced the financial windfall a giant-killing used to bring.",
      "The winner takes a Europa League place, and the final remains the most watched domestic club match in the English calendar.",
    ],
  },
  "Ligue 1": {
    slug: "ligue-1", abbr: "Ligue 1", country: "France", tier: "First tier",
    teams: 18, format: "Double round robin, 34 matches",
    blurb: [
      "France's top division, reduced from twenty clubs to eighteen in 2023 to cut fixtures and raise quality. Thirty-four matches, with the bottom two relegated and the sixteenth-placed club facing a playoff.",
      "Its reputation as a one-club league is not entirely unearned, but it undersells the rest. Ligue 1 is the most reliable producer of young talent in Europe, and clubs like Lille, Monaco and Lens have all broken the pattern in recent seasons. The domestic broadcast market has been turbulent, which has forced even well-run clubs to sell early and often.",
      "For a neutral it is the league where you are most likely to watch a nineteen-year-old you will be reading about for the next decade.",
    ],
  },
  "Coupe de France": {
    slug: "coupe-de-france", abbr: "Coupe", country: "France", tier: "Knockout cup",
    teams: "Open to clubs from every French tier, including overseas territories",
    format: "Single-leg knockout, lower-ranked club hosts",
    blurb: [
      "France's national cup, and the most democratic of the major European cups. Clubs from the overseas territories take part, and the rule that the lower-ranked side hosts means top-flight teams regularly play on small, difficult grounds in midwinter.",
      "That single rule produces most of the competition's upsets. A Ligue 1 club can find itself on a poor pitch in front of a few thousand people with no second leg to recover in.",
      "The winner enters the Europa League league phase.",
    ],
  },
  "La Liga": {
    slug: "la-liga", abbr: "La Liga", country: "Spain", tier: "First tier",
    teams: 20, format: "Double round robin, 38 matches",
    blurb: [
      "Spain's first division, historically the most technically refined league in Europe and still the one that produces the cleanest football to watch.",
      "Its economics are unusual: clubs operate under a salary-cap system enforced by the league itself, which has forced even the largest sides into genuine austerity and has made the middle of the table unusually competitive. Individual broadcast deals were pooled in 2015, narrowing the gap that once made the top two untouchable.",
      "The title has still rarely left Madrid or Barcelona, but the fight for European places now runs eight or nine clubs deep, and the standard of coaching outside the top three is arguably the best anywhere.",
    ],
  },
  "Copa del Rey": {
    slug: "copa-del-rey", abbr: "Copa", country: "Spain", tier: "Knockout cup",
    teams: "Clubs from the top four tiers", format: "Single-leg knockout until the semi-finals",
    blurb: [
      "Spain's cup, restructured in 2019 into a format designed to favour the underdog: single-leg ties hosted by the lower-ranked club, right through to the semi-finals.",
      "The change worked. Third and fourth-tier clubs have knocked out Champions League sides with some regularity, and the early rounds now draw crowds that dwarf a normal league night for those teams.",
      "The winner qualifies for the Europa League.",
    ],
  },
  "Serie A": {
    slug: "serie-a", abbr: "Serie A", country: "Italy", tier: "First tier",
    teams: 20, format: "Double round robin, 38 matches",
    blurb: [
      "Italy's top division, and the most tactically deliberate of the major leagues. Twenty clubs, thirty-eight matches, three relegated.",
      "Serie A spent the 2010s in relative decline and has spent the 2020s recovering. Stadium infrastructure remains its structural weakness — many clubs still play in council-owned grounds built for the 1990 World Cup — but the coaching culture is exceptional, and the league consistently sends clubs deep into Europe.",
      "It rewards patient viewing. Games are frequently decided by a single tactical adjustment rather than raw quality, and the defending is still the best you will see.",
    ],
  },
  "Coppa Italia": {
    slug: "coppa-italia", abbr: "Coppa", country: "Italy", tier: "Knockout cup",
    teams: "Serie A, Serie B and a handful from Serie C",
    format: "Single-leg knockout, seeded so the higher-ranked club hosts",
    blurb: [
      "Italy's cup, and the most top-heavy of the major domestic cups. The bracket is seeded from the start and the higher-ranked side hosts every round, so the big clubs enter late and play at home until the final.",
      "That makes genuine upsets rarer than in England or Spain, but it also means the later rounds are consistently high quality — quarter-finals are usually Serie A against Serie A.",
      "The winner takes a Europa League place, and the final is played at the Stadio Olimpico in Rome.",
    ],
  },
  "Bundesliga": {
    slug: "bundesliga", abbr: "Bundesliga", country: "Germany", tier: "First tier",
    teams: 18, format: "Double round robin, 34 matches, plus a relegation playoff",
    blurb: [
      "Germany's top division: eighteen clubs, thirty-four matches, and the best-attended league in the world by average crowd.",
      "The 50+1 ownership rule keeps majority control of clubs with their members rather than outside investors, which has kept ticket prices low and atmospheres extraordinary while limiting how much money can be poured in from outside. The trade-off is a league that has been dominated by one club for long stretches.",
      "Sixteenth place goes into a two-legged playoff against the third-placed club from the second division — a fixture that regularly produces the most tense football of the German season.",
    ],
  },
  "DFB-Pokal": {
    slug: "dfb-pokal", abbr: "Pokal", country: "Germany", tier: "Knockout cup",
    teams: 64, format: "Single-leg knockout, amateur clubs host the first round",
    blurb: [
      "Germany's cup. Sixty-four clubs, single-leg ties, and a first round that deliberately sends the giants to amateur grounds — regional cup winners are guaranteed home advantage.",
      "Those first-round trips are a genuine hazard rather than a formality, and they are among the most enjoyable fixtures of the German season for anyone following a bigger club.",
      "The final is played at the Olympiastadion in Berlin, and the winner qualifies for the Europa League.",
    ],
  },
  "UEFA Champions League": {
    slug: "champions-league", abbr: "UCL", country: "Europe", tier: "Continental",
    teams: 36, format: "36-team league phase, eight matches each, then knockouts",
    blurb: [
      "Europe's principal club competition. Since 2024 it has run on a single league table of thirty-six clubs rather than groups: each plays eight different opponents, four home and four away, seeded into pots.",
      "The top eight go straight to the round of sixteen. Clubs finishing ninth to twenty-fourth contest a two-legged knockout playoff for the remaining places; the bottom twelve are eliminated outright with no drop into the Europa League.",
      "The format guarantees more matches between strong clubs in the autumn, at the cost of a group stage that used to be easy to follow. The final is a single match at a neutral venue.",
    ],
  },
  "UEFA Europa League": {
    slug: "europa-league", abbr: "UEL", country: "Europe", tier: "Continental",
    teams: 36, format: "36-team league phase, eight matches each, then knockouts",
    blurb: [
      "Europe's second competition, on the same league-phase format as the Champions League: thirty-six clubs, eight matches each, top eight straight through and ninth to twenty-fourth into a knockout playoff.",
      "Its status changed sharply in 2015, when UEFA gave the winner a Champions League place. That turned it from a consolation into a genuine route into the elite competition, and several clubs now prioritise it over a domestic top-four finish.",
      "Thursday nights, long away trips to unfamiliar cities, and a final that has produced some of the most chaotic football in Europe.",
    ],
  },
  "UEFA Conference League": {
    slug: "conference-league", abbr: "UECL", country: "Europe", tier: "Continental",
    teams: 36, format: "36-team league phase, six matches each, then knockouts",
    blurb: [
      "UEFA's third competition, launched in 2021 to give clubs from smaller associations a realistic route into European football. The league phase runs to thirty-six clubs playing six matches each — two fewer than the Champions League and Europa League.",
      "It has been quietly successful. Clubs that would never have survived a Europa League group have reached finals, and for a mid-table side from one of the big five leagues it is the most winnable trophy available.",
      "The winner qualifies for the following season's Europa League. Entry for most qualified clubs is through a two-legged play-off round in late August.",
    ],
  },
  "UEFA Super Cup": {
    slug: "uefa-super-cup", abbr: "Super Cup", country: "Europe", tier: "Continental",
    teams: 2, format: "Single match at a neutral venue; level after 90 minutes goes straight to penalties",
    blurb: [
      "One match between the reigning Champions League and Europa League holders, played in mid-August at a neutral ground chosen years in advance. The 2026 edition is at Stadion Salzburg.",
      "It is the season's first real trophy and its least representative fixture: both sides are usually a fortnight into pre-season, often mid-rebuild, and the format offers no way back — a draw after ninety minutes goes directly to penalties with no extra time.",
      "Nobody would call it a major honour, but it is a competitive European final in the second week of August, which makes it the best football available on the day it is played.",
    ],
  },
  "Trophée des Champions": {
    slug: "trophee-des-champions", abbr: "TdC", country: "France", tier: "Domestic super cup",
    teams: 2, format: "Single match; penalties if level after 90 minutes",
    blurb: [
      "France's season curtain-raiser, between the Ligue 1 champions and the Coupe de France winners. When one club wins both, the league runner-up takes the second place.",
      "The LFP spent much of the last decade selling the match abroad — Tel Aviv, Beijing, Doha, Kuwait — before recent editions came home. The 2026 final is at Lens' Stade Bollaert-Delelis, one of the loudest grounds in the country, with Lens hosting as Coupe de France holders.",
      "PSG have won it so often that its competitive value is mostly symbolic, but it is the only chance all season to see the champions in a one-off final on someone else's pitch.",
    ],
  },
};

export const compBySlug = slug =>
  Object.entries(COMPETITIONS).find(([, c]) => c.slug === slug);

export const compAbbr = name => COMPETITIONS[name]?.abbr || name;
export const compSlug = name => COMPETITIONS[name]?.slug || null;
