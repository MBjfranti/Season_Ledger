<script setup>
import { computed } from "vue";
import { CLUBS, LEAGUES, CLUB_IMAGES } from "../data/data.js";
import { state, recordFor } from "../store.js";
import { fmtDate, fmtDayHead, timeSortKey, weekStart, todayISO, resultLetter,
         fixtureScore, matchupLabel, getOrdinal } from "../utils.js";
import BcChip from "../components/BcChip.vue";
import FormChips from "../components/FormChips.vue";

const clubs = computed(() => CLUBS.map(c => ({
  ...c,
  leagueName: LEAGUES[c.league].name,
  images: CLUB_IMAGES[c.id],
  record: recordFor(c.id),
  pos: state.positions[c.id],
})));

const agg = computed(() => {
  const a = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  for (const c of clubs.value) {
    const r = c.record;
    a.p += r.p; a.w += r.w; a.d += r.d; a.l += r.l; a.gf += r.gf; a.ga += r.ga;
  }
  return a;
});

// Watch-next callout: best pick among upcoming fixtures.
const watchNext = computed(() => {
  const upcoming = state.fixtures
    .filter(f => f.date && f.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!upcoming.length) return null;
  const firstWeek = weekStart(upcoming[0].date);
  const week = upcoming.filter(f => weekStart(f.date) === firstWeek)
    .sort((a, b) => fixtureScore(b) - fixtureScore(a));
  return week[0];
});

// The week ahead — every fixture across all clubs in the next 7 days, by day.
const weekAhead = computed(() => {
  const today = todayISO();
  const horizonDate = new Date(today + "T12:00:00");
  horizonDate.setDate(horizonDate.getDate() + 7);
  const horizon = horizonDate.toISOString().slice(0, 10);
  const ahead = state.fixtures
    .filter(f => f.date && f.date >= today && f.date <= horizon)
    .sort((a, b) => a.date.localeCompare(b.date) || timeSortKey(a.time) - timeSortKey(b.time));
  const byDay = new Map();
  for (const f of ahead) {
    if (!byDay.has(f.date)) byDay.set(f.date, []);
    byDay.get(f.date).push(f);
  }
  const next = ahead.length ? null : state.fixtures
    .filter(f => f.date && f.date > horizon)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return { days: [...byDay.entries()], next };
});

// Latest results — most recent logged matches across all clubs.
const latestResults = computed(() => {
  const all = [];
  for (const c of CLUBS) {
    for (const m of (state.matches[c.id] || [])) all.push({ club: c, m });
  }
  all.sort((a, b) => b.m.date.localeCompare(a.m.date));
  return all.slice(0, 10);
});

// Starred watchlist — upcoming must-watch fixtures.
const starred = computed(() => state.fixtures
  .filter(f => f.mustWatch && f.date && f.date >= todayISO())
  .sort((a, b) => a.date.localeCompare(b.date))
  .slice(0, 6));
</script>

<template>
  <div class="section-label">Season to date — all clubs, all competitions</div>
  <div class="aggregate">
    <div class="cell"><div class="num">{{ agg.p }}</div><div class="lbl">Played</div></div>
    <div class="cell"><div class="num">{{ agg.w }}</div><div class="lbl">Won</div></div>
    <div class="cell"><div class="num">{{ agg.d }}</div><div class="lbl">Drawn</div></div>
    <div class="cell"><div class="num">{{ agg.l }}</div><div class="lbl">Lost</div></div>
    <div class="cell"><div class="num">{{ agg.gf }}:{{ agg.ga }}</div><div class="lbl">Goals</div></div>
  </div>

  <div v-if="watchNext" class="watch-next">
    <span class="tag watch">Watch next</span>
    <strong>{{ matchupLabel(watchNext) }}</strong>
    <span class="wn-meta">{{ fmtDate(watchNext.date) }}<template v-if="watchNext.time"> · {{ watchNext.time }}</template> · {{ watchNext.comp }}</span>
    <BcChip :comp="watchNext.comp" />
    <router-link to="/calendar" class="wn-link">Full calendar →</router-link>
  </div>

  <div class="section-label">The week ahead</div>
  <template v-if="weekAhead.days.length">
    <div v-for="[day, dfs] in weekAhead.days" :key="day" class="mini-day">
      <div class="mini-day-head">{{ fmtDayHead(day) }}</div>
      <div v-for="f in dfs" :key="f.id" class="mini-fx">
        <span class="mini-time">{{ f.time || "TBD" }}</span>
        <span class="mini-match">{{ matchupLabel(f) }}</span>
        <span class="fx-comp">{{ f.comp }}</span>
        <BcChip :comp="f.comp" />
        <span v-if="f.mustWatch" class="star-mark" title="Must-watch">★</span>
      </div>
    </div>
  </template>
  <div v-else class="empty">Nothing in the next seven days.<template v-if="weekAhead.next">
    Next up: {{ matchupLabel(weekAhead.next) }} on {{ fmtDate(weekAhead.next.date) }}.</template>
  </div>

  <div class="section-label">The eight</div>
  <div class="grid">
    <router-link v-for="c in clubs" :key="c.id" class="card" :to="`/club/${c.id}`">
      <div class="kit" :class="`kit-${c.id}`"></div>
      <img class="crest" :src="c.images.crest" alt="" @error="e => e.target.remove()">
      <div class="body">
        <h3>{{ c.name }}</h3>
        <div class="meta">{{ c.leagueName }} · {{ c.manager }}</div>
        <div class="statline">
          <span v-if="c.record.p" class="record">{{ c.record.p }}P · {{ c.record.w }}-{{ c.record.d }}-{{ c.record.l }} · {{ c.record.gf }}:{{ c.record.ga }}</span>
          <span v-else class="record"><span class="none">no matches logged</span></span>
          <FormChips v-if="c.record.p" :form="c.record.form" />
        </div>
        <div class="foot">
          <span>Forecast {{ c.forecast.low }}–{{ c.forecast.high }}</span>
          <span class="pos">{{ c.pos ? "Currently " + c.pos + getOrdinal(c.pos) : "Position not set" }}</span>
        </div>
      </div>
    </router-link>
  </div>

  <div class="section-label">Latest results</div>
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
    <div class="section-label">Your starred watchlist</div>
    <ul class="fixtures">
      <li v-for="f in starred" :key="f.id">
        <span class="when">{{ fmtDate(f.date) }}<template v-if="f.time"> · {{ f.time }}</template></span>
        <span>{{ matchupLabel(f) }} · {{ f.comp }}</span> <BcChip :comp="f.comp" />
      </li>
    </ul>
  </template>
</template>
