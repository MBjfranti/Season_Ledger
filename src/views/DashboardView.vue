<script setup>
import { computed } from "vue";
import { CLUBS, LEAGUES, CLUB_IMAGES } from "../data/data.js";
import { state, recordFor } from "../store.js";
import { fmtDate, fmtDayHead, timeSortKey, weekStart, todayISO, addDaysISO,
         resultLetter, fixtureScore, fixtureReasons, matchupLabel, getOrdinal } from "../utils.js";
import BcChip from "../components/BcChip.vue";
import FormChips from "../components/FormChips.vue";

const upcoming = computed(() => state.fixtures
  .filter(f => f.date && f.date >= todayISO())
  .sort((a, b) => a.date.localeCompare(b.date)));

function openerFor(clubId) {
  const f = upcoming.value.find(x => x.clubId === clubId || x.opponentId === clubId);
  if (!f) return null;
  const opp = f.clubId === clubId ? f.opponent
    : CLUBS.find(c => c.id === f.clubId)?.short || f.opponent;
  return { date: f.date, opp };
}

const clubs = computed(() => CLUBS.map(c => ({
  ...c,
  leagueName: LEAGUES[c.league].name,
  images: CLUB_IMAGES[c.id],
  record: recordFor(c.id),
  pos: state.positions[c.id],
  opener: openerFor(c.id),
})));

const agg = computed(() => {
  const a = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  for (const c of clubs.value) {
    const r = c.record;
    a.p += r.p; a.w += r.w; a.d += r.d; a.l += r.l; a.gf += r.gf; a.ga += r.ga;
  }
  return a;
});

// The watch plan: the first week with upcoming fixtures, ranked the same way
// the calendar ranks it — one Watch pick, up to two Backups.
const plan = computed(() => {
  if (!upcoming.value.length) return null;
  const wk = weekStart(upcoming.value[0].date);
  const week = upcoming.value.filter(f => weekStart(f.date) === wk)
    .sort((a, b) => fixtureScore(b) - fixtureScore(a) || a.date.localeCompare(b.date));
  const watch = week[0];
  const backups = (week.length > 1 || fixtureScore(watch) > 30) ? week.slice(1, 3) : [];
  const isCurrentWeek = wk === weekStart(todayISO());
  return { watch, backups, isCurrentWeek, wk };
});

const daysToKickoff = computed(() => {
  if (!upcoming.value.length) return null;
  const first = upcoming.value[0].date;
  const ms = new Date(first + "T12:00:00") - new Date(todayISO() + "T12:00:00");
  return Math.round(ms / 86400e3);
});

// Every fixture across all clubs in the next 7 days, grouped by day.
const weekAhead = computed(() => {
  const today = todayISO();
  const horizon = addDaysISO(today, 7);
  const ahead = state.fixtures
    .filter(f => f.date && f.date >= today && f.date <= horizon)
    .sort((a, b) => a.date.localeCompare(b.date) || timeSortKey(a.time) - timeSortKey(b.time));
  const byDay = new Map();
  for (const f of ahead) {
    if (!byDay.has(f.date)) byDay.set(f.date, []);
    byDay.get(f.date).push(f);
  }
  return [...byDay.entries()];
});

// Pre-season / quiet spells: the next handful of fixtures beyond the horizon.
const openers = computed(() => upcoming.value.slice(0, 5));

const latestResults = computed(() => {
  const all = [];
  for (const c of CLUBS) {
    for (const m of (state.matches[c.id] || [])) all.push({ club: c, m });
  }
  all.sort((a, b) => b.m.date.localeCompare(a.m.date));
  return all.slice(0, 10);
});

const starred = computed(() => state.fixtures
  .filter(f => f.mustWatch && f.date && f.date >= todayISO())
  .sort((a, b) => a.date.localeCompare(b.date))
  .slice(0, 6));
</script>

<template>
  <template v-if="plan">
    <h2 class="section-label">{{ plan.isCurrentWeek ? "This week's watch plan" : `Next up — week of ${fmtDate(plan.wk)}` }}</h2>
    <div class="watch-hero">
      <div class="wh-main">
        <span class="tag watch">Watch</span>
        <strong>{{ matchupLabel(plan.watch) }}</strong>
        <span class="wn-meta">{{ fmtDate(plan.watch.date) }}<template v-if="plan.watch.time"> · {{ plan.watch.time }}</template> · {{ plan.watch.comp }}</span>
        <span class="fx-line"><BcChip :comp="plan.watch.comp" /></span>
        <div v-if="fixtureReasons(plan.watch).length" class="reasons">{{ fixtureReasons(plan.watch).join(" · ") }}</div>
      </div>
      <div v-if="plan.backups.length" class="wh-backups">
        <div v-for="b in plan.backups" :key="b.id" class="wh-backup">
          <span class="tag backup">Backup</span>
          <span class="wh-b-match">{{ matchupLabel(b) }}</span>
          <span class="wn-meta">{{ fmtDate(b.date) }}<template v-if="b.time"> · {{ b.time }}</template> · {{ b.comp }}</span>
          <BcChip :comp="b.comp" />
        </div>
      </div>
      <router-link to="/calendar" class="wn-link">Full calendar →</router-link>
    </div>
    <div v-if="!plan.isCurrentWeek && daysToKickoff !== null" class="kickoff-note">
      Season starts in {{ daysToKickoff }} day{{ daysToKickoff === 1 ? "" : "s" }}.
    </div>
  </template>

  <template v-if="weekAhead.length">
    <h2 class="section-label">The week ahead</h2>
    <div v-for="[day, dfs] in weekAhead" :key="day" class="mini-day">
      <h3 class="mini-day-head">{{ fmtDayHead(day) }}</h3>
      <div v-for="f in dfs" :key="f.id" class="mini-fx">
        <span class="mini-time">{{ f.time || "TBD" }}</span>
        <span class="mini-match">{{ matchupLabel(f) }}</span>
        <span class="fx-comp">{{ f.comp }}</span>
        <BcChip :comp="f.comp" />
        <span v-if="f.mustWatch" class="star-mark" title="Must-watch">★</span>
      </div>
    </div>
  </template>
  <template v-else-if="openers.length">
    <h2 class="section-label">Opening fixtures</h2>
    <ul class="fixtures">
      <li v-for="f in openers" :key="f.id">
        <span class="when">{{ fmtDate(f.date) }}<template v-if="f.time"> · {{ f.time }}</template></span>
        <span class="fx-line">{{ matchupLabel(f) }} · {{ f.comp }} <BcChip :comp="f.comp" /></span>
      </li>
    </ul>
  </template>

  <h2 class="section-label">The eight</h2>
  <div class="grid">
    <router-link v-for="c in clubs" :key="c.id" class="card" :to="`/club/${c.id}`">
      <div class="kit" :class="`kit-${c.id}`"></div>
      <img class="crest" :src="c.images.crest" alt="" @error="e => e.target.remove()">
      <div class="body">
        <h3>{{ c.name }}</h3>
        <div class="meta">{{ c.leagueName }} · {{ c.manager }}</div>
        <div class="statline">
          <span v-if="c.record.p" class="record">{{ c.record.p }}P · {{ c.record.w }}-{{ c.record.d }}-{{ c.record.l }} · {{ c.record.gf }}:{{ c.record.ga }}</span>
          <span v-else-if="c.opener" class="record"><span class="none">Opens {{ fmtDate(c.opener.date) }} v {{ c.opener.opp }}</span></span>
          <span v-else class="record"><span class="none">no matches logged</span></span>
          <FormChips v-if="c.record.p" :form="c.record.form" />
        </div>
        <div class="foot">
          <span>Forecast {{ c.forecast.low }}–{{ c.forecast.high }}</span>
          <span v-if="c.pos" class="pos">Currently {{ c.pos }}{{ getOrdinal(c.pos) }}</span>
          <span v-else-if="c.record.p" class="pos">Position not set</span>
        </div>
      </div>
    </router-link>
  </div>

  <template v-if="agg.p">
    <h2 class="section-label">Season to date — all clubs, all competitions</h2>
    <div class="aggregate">
      <div class="cell"><div class="num">{{ agg.p }}</div><div class="lbl">Played</div></div>
      <div class="cell"><div class="num">{{ agg.w }}</div><div class="lbl">Won</div></div>
      <div class="cell"><div class="num">{{ agg.d }}</div><div class="lbl">Drawn</div></div>
      <div class="cell"><div class="num">{{ agg.l }}</div><div class="lbl">Lost</div></div>
      <div class="cell"><div class="num">{{ agg.gf }}:{{ agg.ga }}</div><div class="lbl">Goals</div></div>
    </div>
  </template>

  <h2 class="section-label">Latest results</h2>
  <ul v-if="latestResults.length" class="fixtures">
    <li v-for="{ club, m } in latestResults" :key="m.id">
      <span class="when">{{ fmtDate(m.date) }}</span>
      <span class="club-tag"><router-link :to="`/club/${club.id}`">{{ club.short }}</router-link></span>
      <span class="chip" :class="resultLetter(m.gf, m.ga)">{{ resultLetter(m.gf, m.ga) }}</span>
      <span class="mini-score">{{ m.gf }}–{{ m.ga }}</span>
      <span>v {{ m.opponent }} ({{ m.venue }}) · {{ m.comp }}</span>
      <span v-if="m.watched" class="watched-mark">watched</span>
    </li>
  </ul>
  <div v-else class="empty">Results land here with each pull once the season kicks off.</div>

  <template v-if="starred.length">
    <h2 class="section-label">Your starred watchlist</h2>
    <ul class="fixtures">
      <li v-for="f in starred" :key="f.id">
        <span class="when">{{ fmtDate(f.date) }}<template v-if="f.time"> · {{ f.time }}</template></span>
        <span class="fx-line">{{ matchupLabel(f) }} · {{ f.comp }} <BcChip :comp="f.comp" /></span>
      </li>
    </ul>
  </template>
</template>
