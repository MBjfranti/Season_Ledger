<script setup>
import { computed } from "vue";
import { compBySlug } from "../data/competitions.js";
import { CLUB_COLORS, CLUB_IMAGES } from "../data/data.js";
import { state, activeClubs, activeFixtures } from "../store.js";
import { fmtDate, todayISO, timeSortKey, matchupLabel, broadcastFor,
         resultLetter, watchRating } from "../utils.js";
import BcChip from "../components/BcChip.vue";

const props = defineProps({ slug: { type: String, required: true } });

const entry = computed(() => compBySlug(props.slug));
const name = computed(() => entry.value?.[0] || null);
const comp = computed(() => entry.value?.[1] || null);

// Followed clubs that actually contest this competition.
const clubs = computed(() =>
  !name.value ? [] : activeClubs.value.filter(c => c.comps.includes(name.value)));

const fixtures = computed(() => !name.value ? [] : activeFixtures.value
  .filter(f => f.comp === name.value && f.date)
  .sort((a, b) => a.date.localeCompare(b.date) || timeSortKey(a.time) - timeSortKey(b.time)));

const upcoming = computed(() => fixtures.value.filter(f => f.date >= todayISO()));

// Results already logged in this competition, newest first.
const results = computed(() => {
  if (!name.value) return [];
  const rows = [];
  for (const c of clubs.value) {
    for (const m of (state.matches[c.id] || [])) {
      if (m.comp === name.value) rows.push({ club: c, m });
    }
  }
  return rows.sort((a, b) => b.m.date.localeCompare(a.m.date));
});

// The pick of what is still to come, by the same rating the calendar ranks with.
const headline = computed(() => {
  if (!upcoming.value.length) return null;
  return [...upcoming.value].sort((a, b) => watchRating(b) - watchRating(a))[0];
});

const broadcasts = computed(() => name.value ? broadcastFor(name.value) : []);
const haveIt = computed(() => broadcasts.value.some(b => b.have));
</script>

<template>
  <div class="sheet">
    <div v-if="!comp" class="empty">Unknown competition.</div>
    <template v-else>
      <router-link class="back" to="/calendar">← Calendar</router-link>

      <header class="comp-hero">
        <div class="comp-hero-copy">
          <div class="comp-eyebrow">{{ comp.country }} · {{ comp.tier }}</div>
          <h2>{{ name }}</h2>
          <div class="comp-format">{{ comp.format }}</div>
        </div>
        <div class="comp-hero-side">
          <div class="comp-bc"><BcChip :comp="name" /></div>
          <div class="comp-bc-note">
            {{ haveIt ? "Covered by a service you have" : "Not on a service you have" }}
          </div>
        </div>
      </header>

      <div class="comp-cols">
        <div>
          <h2 class="section-label">About</h2>
          <div class="prose comp-prose">
            <p v-for="(p, i) in comp.blurb" :key="i">{{ p }}</p>
          </div>

          <h2 class="section-label">Upcoming</h2>
          <div v-if="!upcoming.length" class="empty">
            Nothing scheduled — fixtures arrive with the draw.
          </div>
          <ul v-else class="comp-list">
            <li v-for="f in upcoming.slice(0, 12)" :key="f.id">
              <span class="cl-date">{{ fmtDate(f.date) }}</span>
              <span class="cl-match">{{ matchupLabel(f) }}</span>
              <span class="cl-time">{{ f.time || "TBD" }}</span>
            </li>
          </ul>

          <template v-if="results.length">
            <h2 class="section-label">Results so far</h2>
            <ul class="comp-list">
              <li v-for="(r, i) in results.slice(0, 12)" :key="i">
                <span class="cl-date">{{ fmtDate(r.m.date) }}</span>
                <span class="cl-match">{{ r.club.short }} v {{ r.m.opponent }}</span>
                <span class="cl-score" :class="`res-${resultLetter(r.m.gf, r.m.ga)}`">
                  {{ resultLetter(r.m.gf, r.m.ga) }} {{ r.m.gf }}–{{ r.m.ga }}
                </span>
              </li>
            </ul>
          </template>
        </div>

        <div>
          <div v-if="headline" class="comp-pick">
            <div class="cp-eyebrow">Pick of what's left</div>
            <div class="cp-match">{{ matchupLabel(headline) }}</div>
            <div class="cp-when">
              {{ fmtDate(headline.date) }}<template v-if="headline.time"> · {{ headline.time }}</template>
            </div>
            <div class="cp-rating">Watch rating {{ watchRating(headline) }}</div>
          </div>

          <h2 class="section-label">At a glance</h2>
          <div class="comp-facts">
            <div><span>Teams</span><span>{{ comp.teams }}</span></div>
            <div><span>Country</span><span>{{ comp.country }}</span></div>
            <div><span>Level</span><span>{{ comp.tier }}</span></div>
          </div>

          <h2 class="section-label">Your clubs here</h2>
          <div v-if="!clubs.length" class="empty">None of your clubs are in this one.</div>
          <ul v-else class="comp-clubs">
            <li v-for="c in clubs" :key="c.id">
              <router-link :to="`/club/${c.id}`" :style="{ '--club': CLUB_COLORS[c.id] }">
                <img v-if="CLUB_IMAGES[c.id] && CLUB_IMAGES[c.id].crest"
                     :src="CLUB_IMAGES[c.id].crest" alt="" @error="e => e.target.remove()">
                <span class="kit" :class="`kit-${c.id}`"></span>
                <span>{{ c.short }}</span>
              </router-link>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>
