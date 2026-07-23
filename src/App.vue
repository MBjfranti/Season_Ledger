<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { displayHour, phaseName, scrub, driftToNow, startClock, stopClock } from "./atmosphere.js";

const showTime = ref(false);

const GLYPH = { dawn: "🌅", day: "☀️", golden: "🌇", night: "🌙" };
const NAME = { dawn: "Dawn", day: "Midday", golden: "Golden hour", night: "Night" };
const phaseGlyph = computed(() => GLYPH[phaseName.value] || "☀️");

const clockLabel = computed(() => {
  const h = displayHour.value;
  const hh = Math.floor(h) % 24;
  const m = Math.floor((h - Math.floor(h)) * 60);
  const ap = hh < 12 ? "AM" : "PM";
  const h12 = hh % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap} · ${NAME[phaseName.value]}`;
});

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
          <span class="season">2026–27 · Nine clubs · Six leagues</span>
        </span>
      </router-link>
      <nav class="tools">
        <div class="seg">
          <router-link class="seg-item" to="/">Ledger</router-link>
          <router-link class="seg-item" to="/calendar">Calendar</router-link>
        </div>
        <div class="atmos">
          <button class="btn atmos-btn" type="button" :aria-expanded="showTime"
                  :title="clockLabel" @click="showTime = !showTime">{{ phaseGlyph }}</button>
          <div v-if="showTime" class="atmos-pop">
            <div class="atmos-clock">{{ clockLabel }}</div>
            <input class="atmos-range" type="range" min="0" max="24" step="0.25"
                   :value="displayHour" aria-label="Time of day"
                   @input="scrub(+$event.target.value)" @change="driftToNow">
            <div class="atmos-hint">Wander the day — it drifts back to now.</div>
          </div>
        </div>
      </nav>
    </header>
    <main class="room"><router-view :key="$route.fullPath" /></main>
  </div>
</template>
