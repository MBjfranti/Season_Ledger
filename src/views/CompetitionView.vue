<script setup>
import { computed } from "vue";
import { compBySlug } from "../data/competitions.js";
import { CLUB_COLORS, CLUB_IMAGES } from "../data/data.js";
import { activeClubs, activeFixtures, playedFixtures } from "../store.js";
import { fmtDate, todayISO, timeSortKey, matchupLabel, broadcastFor,
         resultLetter, watchRating } from "../utils.js";
import BcChip from "../components/BcChip.vue";
import CompStrip from "../components/CompStrip.vue";

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

// Today's fixture stays on the calendar after the score lands, so a played
// entry has to be kept out of Upcoming — it belongs under Results.
const upcoming = computed(() =>
  fixtures.value.filter(f => f.date >= todayISO() && !f.played));

// Results already logged in this competition, newest first. Taken from
// playedFixtures because a tie between two followed clubs is logged under both
// of them, and that list has already collapsed each one to a single entry.
const results = computed(() => !name.value ? [] : playedFixtures.value
  .filter(f => f.comp === name.value)
  .sort((a, b) => b.date.localeCompare(a.date) || timeSortKey(a.time) - timeSortKey(b.time)));

// The pick of what is still to come, by the same rating the calendar ranks with.
const headline = computed(() => {
  if (!upcoming.value.length) return null;
  return [...upcoming.value].sort((a, b) => watchRating(b) - watchRating(a))[0];
});

const broadcasts = computed(() => name.value ? broadcastFor(name.value) : []);
</script>

<template>
  <div class="sheet">
    <CompStrip :active-slug="slug" />
    <router-link class="backlink" to="/competitions">← All competitions</router-link>

    <div v-if="!comp" class="empty">Unknown competition.</div>
    <template v-else>

      <header class="comp-hero">
        <div class="comp-hero-copy">
          <div class="comp-eyebrow">{{ comp.country }} · {{ comp.tier }}</div>
          <h2>{{ name }}</h2>
          <div class="comp-format">{{ comp.format }}</div>
        </div>
        <div class="comp-hero-side">
          <div class="comp-bc"><BcChip :comp="name" /></div>
        </div>
      </header>

      <!-- Every block sits on its own panel: this page is read on the pitch,
           and body copy in ink colours needs cream underneath it. -->
      <div class="comp-cols">
        <div>
          <section class="band-wrap comp-block">
            <h2 class="section-label">About</h2>
            <div class="prose comp-prose">
              <p v-for="(p, i) in comp.blurb" :key="i">{{ p }}</p>
            </div>
          </section>

          <section class="band-wrap comp-block">
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
          </section>

          <section v-if="results.length" class="band-wrap comp-block">
            <h2 class="section-label">Results so far</h2>
            <ul class="comp-list">
              <li v-for="r in results.slice(0, 12)" :key="r.id">
                <span class="cl-date">{{ fmtDate(r.date) }}</span>
                <span class="cl-match">{{ matchupLabel(r) }}</span>
                <span class="cl-score" :class="`res-${resultLetter(r.gf, r.ga)}`">
                  {{ resultLetter(r.gf, r.ga) }} {{ r.gf }}–{{ r.ga }}
                </span>
              </li>
            </ul>
          </section>
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

          <section class="band-wrap comp-block">
            <h2 class="section-label">At a glance</h2>
            <div class="comp-facts">
              <div><span>Teams</span><span>{{ comp.teams }}</span></div>
              <div><span>Country</span><span>{{ comp.country }}</span></div>
              <div><span>Level</span><span>{{ comp.tier }}</span></div>
            </div>
          </section>

          <section class="band-wrap comp-block">
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
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
