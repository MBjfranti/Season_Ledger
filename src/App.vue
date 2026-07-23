<script setup>
import { ref } from "vue";
import { exportData, importData } from "./store.js";

const importFile = ref(null);

function onImportPicked(e) {
  if (e.target.files[0]) importData(e.target.files[0]);
  e.target.value = "";
}
</script>

<template>
  <div class="wrap">
    <header class="masthead">
      <div>
        <h1><router-link to="/">The Season Ledger</router-link></h1>
        <div class="season">EUROPEAN FOOTBALL · 2026–27 · NINE CLUBS · SIX LEAGUES</div>
      </div>
      <nav class="tools">
        <router-link class="btn" to="/">Ledger</router-link>
        <router-link class="btn" to="/calendar">Calendar</router-link>
        <button class="btn" type="button" @click="exportData">Export</button>
        <button class="btn" type="button" @click="importFile.click()">Import</button>
        <input ref="importFile" type="file" accept="application/json" hidden @change="onImportPicked">
      </nav>
    </header>
    <main><router-view :key="$route.fullPath" /></main>
    <div class="footer-note">Data lives in this browser (localStorage) — export regularly for backup.</div>
  </div>
</template>
