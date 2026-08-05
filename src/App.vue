<script setup>
import { ref, computed } from "vue";
import { LEAGUES, CLUBS } from "./data/data.js";
import { isFollowed, toggleClub, activeClubs, state, syncFromApi, syncState } from "./store.js";

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

const lastSync = computed(() => {
  if (!state.apiSyncedAt) return "never";
  const d = new Date(state.apiSyncedAt);
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
});
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

            <div class="sync-box">
              <div class="set-league">Fixtures &amp; results</div>
              <button class="btn sync-btn" type="button"
                      :disabled="syncState.running" @click="syncFromApi()">
                {{ syncState.running
                   ? (syncState.auto ? "Syncing automatically…" : "Syncing…")
                   : "Sync from ESPN" }}
              </button>
              <div class="sync-meta">Last sync: {{ lastSync }}</div>
              <div v-if="syncState.message" class="sync-meta">{{ syncState.message }}</div>
              <div v-if="syncState.error" class="sync-err">{{ syncState.error }}</div>
              <div class="atmos-hint">Runs on its own once the last sync is more
                than 15 minutes old — the button is only for when you are
                impatient. Pulls the live schedule and any finished scores;
                your watched marks, stars and notes are kept.</div>
            </div>
          </div>
        </div>
      </nav>
    </header>
    <main class="room"><router-view :key="$route.fullPath" /></main>
  </div>
</template>
