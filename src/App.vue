<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { startClock, stopClock } from "./atmosphere.js";
import { LEAGUES, CLUBS } from "./data/data.js";
import { isFollowed, toggleClub, activeClubs } from "./store.js";

const showSettings = ref(false);

// Catalog grouped by league, so the picker reads as leagues rather than a
// flat list of eleven names.
const groups = computed(() => {
  const out = [];
  for (const [key, league] of Object.entries(LEAGUES)) {
    const clubs = CLUBS.filter(c => c.league === key);
    if (clubs.length) out.push({ key, name: league.name, clubs });
  }
  return out;
});

const followedCount = computed(() => activeClubs.value.length);
const leagueCount = computed(() => new Set(activeClubs.value.map(c => c.league)).size);

const NUM = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
             "Eight", "Nine", "Ten", "Eleven", "Twelve"];
const spell = n => NUM[n] || String(n);

const subtitle = computed(() =>
  `2026–27 · ${spell(followedCount.value)} club${followedCount.value === 1 ? "" : "s"} · ` +
  `${spell(leagueCount.value).toLowerCase()} league${leagueCount.value === 1 ? "" : "s"}`);

// The atmosphere clock still drives the palette; only its scrub control is gone.
onMounted(startClock);
onUnmounted(stopClock);
</script>

<template>
  <div class="app">
    <div class="light-cast" aria-hidden="true"></div>
    <header class="masthead">
      <router-link class="brand" to="/">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-copy">
          <h1 class="wordmark">The Season <span class="wm-accent">Ledger</span></h1>
          <span class="season">{{ subtitle }}</span>
        </span>
      </router-link>
      <nav class="tools">
        <div class="seg">
          <router-link class="seg-item" to="/">Ledger</router-link>
          <router-link class="seg-item" to="/calendar">Calendar</router-link>
        </div>
        <div class="atmos">
          <button class="btn atmos-btn" type="button" :aria-expanded="showSettings"
                  title="Choose clubs" @click="showSettings = !showSettings">⚙</button>
          <div v-if="showSettings" class="atmos-pop settings-pop">
            <div class="atmos-clock">Clubs you follow</div>
            <div v-for="g in groups" :key="g.key" class="set-group">
              <div class="set-league">{{ g.name }}</div>
              <label v-for="c in g.clubs" :key="c.id" class="set-row">
                <input type="checkbox" :checked="isFollowed(c.id)" @change="toggleClub(c.id)">
                <span class="kit" :class="`kit-${c.id}`"></span>
                <span class="set-name">{{ c.short }}</span>
                <span v-if="c.seeded === false" class="set-tag" title="No fixture list yet">no fixtures</span>
              </label>
            </div>
            <div class="atmos-hint">Saved on this device. Unfollowing keeps a club's
              logged matches — switch it back on and they return.</div>
          </div>
        </div>
      </nav>
    </header>
    <main class="room"><router-view :key="$route.fullPath" /></main>
  </div>
</template>
