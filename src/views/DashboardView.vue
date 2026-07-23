<script setup>
import { computed } from "vue";
import { CLUBS, LEAGUES, CLUB_IMAGES, CLUB_COLORS } from "../data/data.js";
import { state, recordFor } from "../store.js";
import { fmtDate, timeSortKey, todayISO, addDaysISO,
         resultLetter, fixtureScore, fixtureReasons, matchupLabel } from "../utils.js";
import BcChip from "../components/BcChip.vue";

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

// The watch plan: the next DAY that has fixtures, ranked the way the calendar
// ranks it — that day's top pick as Watch, up to two same-day Backups.
const plan = computed(() => {
  if (!upcoming.value.length) return null;
  const date = upcoming.value[0].date;
  const day = upcoming.value.filter(f => f.date === date)
    .sort((a, b) => fixtureScore(b) - fixtureScore(a) || timeSortKey(a.time) - timeSortKey(b.time));
  const watch = day[0];
  const backups = day.slice(1, 3);
  const isToday = date === todayISO();
  return { watch, backups, isToday, date };
});

// Art for the Watch match's club, shown filling the empty lower area of the
// NEXT UP card. Falls back to a faded crest until an action photo is added.
const watchArt = computed(() => {
  const id = plan.value?.watch.clubId;
  const im = id ? (CLUB_IMAGES[id] || {}) : {};
  return { action: im.action, actionPos: im.actionPos || "center 25%", crest: im.crest };
});

const daysToKickoff = computed(() => {
  if (!upcoming.value.length) return null;
  const first = upcoming.value[0].date;
  const ms = new Date(first + "T12:00:00") - new Date(todayISO() + "T12:00:00");
  return Math.round(ms / 86400e3);
});

// Every fixture across all clubs in the next 7 days.
const weekAhead = computed(() => {
  const today = todayISO();
  const horizon = addDaysISO(today, 7);
  return state.fixtures
    .filter(f => f.date && f.date >= today && f.date <= horizon)
    .sort((a, b) => a.date.localeCompare(b.date) || timeSortKey(a.time) - timeSortKey(b.time));
});

const openers = computed(() => upcoming.value.slice(0, 6));

const latestResults = computed(() => {
  const all = [];
  for (const c of CLUBS) {
    for (const m of (state.matches[c.id] || [])) all.push({ club: c, m });
  }
  all.sort((a, b) => b.m.date.localeCompare(a.m.date));
  return all.slice(0, 6);
});

// The ticker prefers real results; before kickoff it shows the next fixtures.
const tickerFixtures = computed(() => (weekAhead.value.length ? weekAhead.value : openers.value).slice(0, 6));
</script>

<template>
  <div class="board">
    <section class="watch-area">
      <div v-if="plan" class="watch-panel" :class="{ 'has-art': watchArt.action }">
        <div class="wp-photo" :class="{ 'has-art': watchArt.action }"
          :style="watchArt.action ? {
            backgroundImage: `linear-gradient(178deg, rgba(9,13,11,0.94) 0%, rgba(9,13,11,0.86) 26%, rgba(9,13,11,0.62) 42%, rgba(9,13,11,0.24) 56%, rgba(9,13,11,0) 72%), url('${watchArt.action}')`,
            backgroundPosition: `50% 0%, ${watchArt.actionPos}` } : null">
          <span v-if="!watchArt.action" class="wp-photo-fallback">
            <img v-if="watchArt.crest" :src="watchArt.crest" alt="" class="wp-crest">
          </span>
        </div>
        <div class="wp-eyebrow">{{ plan.isToday ? "Today · watch" : `Next up · ${fmtDate(plan.date)}` }}</div>
        <div class="wp-tag"><span class="tag watch">Watch</span></div>
        <router-link class="wp-match" :to="`/club/${plan.watch.clubId}`">{{ matchupLabel(plan.watch) }}</router-link>
        <div class="wp-meta">{{ fmtDate(plan.watch.date) }}<template v-if="plan.watch.time"> · {{ plan.watch.time }}</template> · {{ plan.watch.comp }}</div>
        <div class="wp-bc"><BcChip :comp="plan.watch.comp" /></div>
        <div v-if="fixtureReasons(plan.watch).length" class="reasons">{{ fixtureReasons(plan.watch).join(" · ") }}</div>

        <div v-if="plan.backups.length" class="wp-backups">
          <div v-for="b in plan.backups" :key="b.id" class="wp-backup">
            <span class="tag backup">Backup</span>
            <span class="wp-b-match">{{ matchupLabel(b) }}</span>
            <span class="wp-b-meta">{{ fmtDate(b.date) }}<template v-if="b.time"> · {{ b.time }}</template></span>
            <BcChip :comp="b.comp" />
          </div>
        </div>

        <div class="wp-foot">
          <span v-if="!plan.isToday && daysToKickoff !== null" class="wp-kick">Season starts in {{ daysToKickoff }} day{{ daysToKickoff === 1 ? "" : "s" }}</span>
          <router-link to="/calendar" class="wn-link">Open the calendar →</router-link>
        </div>
      </div>
      <div v-else class="watch-panel empty-panel">No fixtures on the calendar yet.</div>
    </section>

    <section class="nine-area">
      <div class="nine-grid">
        <router-link v-for="c in clubs" :key="c.id" class="door" :to="`/club/${c.id}`"
                     :style="{ '--club': CLUB_COLORS[c.id] }">
          <div class="kit" :class="`kit-${c.id}`"></div>
          <img class="door-crest" :src="c.images.crest" alt="" @error="e => e.target.remove()">
          <div class="door-body">
            <h3>{{ c.short }}</h3>
            <div class="door-league">{{ c.leagueName }}</div>
            <div class="door-next">
              <template v-if="c.record.p">{{ c.record.w }}-{{ c.record.d }}-{{ c.record.l }} · {{ c.record.gf }}:{{ c.record.ga }}<template v-if="c.pos"> · {{ c.pos }}th</template></template>
              <template v-else-if="c.opener">Opens {{ fmtDate(c.opener.date) }} v {{ c.opener.opp }}</template>
              <template v-else>—</template>
            </div>
          </div>
        </router-link>
      </div>
    </section>

    <section class="ticker-area">
      <template v-if="latestResults.length">
        <span class="ticker-label">Latest</span>
        <div class="ticker-row">
          <span v-for="{ club, m } in latestResults" :key="m.id" class="ticker-item">
            <span class="chip" :class="resultLetter(m.gf, m.ga)">{{ resultLetter(m.gf, m.ga) }}</span>
            {{ club.short }} {{ m.gf }}–{{ m.ga }} <span class="ti-comp">{{ m.comp }}</span>
          </span>
        </div>
      </template>
      <template v-else>
        <span class="ticker-label">Next up</span>
        <div class="ticker-row">
          <span v-for="f in tickerFixtures" :key="f.id" class="ticker-item">
            <span class="ti-when">{{ fmtDate(f.date) }}<template v-if="f.time"> · {{ f.time }}</template></span>
            {{ matchupLabel(f) }} <span class="ti-comp">{{ f.comp }}</span>
          </span>
        </div>
      </template>
    </section>
  </div>
</template>
