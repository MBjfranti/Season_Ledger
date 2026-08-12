<script setup>
import { computed } from "vue";
import { COMPETITIONS } from "../data/competitions.js";
import { activeClubs, activeFixtures, playedFixtures } from "../store.js";
import { fmtDate, todayISO, timeSortKey, matchupLabel } from "../utils.js";
import BcChip from "../components/BcChip.vue";

// One door per competition your clubs are in, the way the ledger has one door
// per club. Competitions nobody follows are left out rather than greyed.
const comps = computed(() => {
  const out = [];
  for (const [name, c] of Object.entries(COMPETITIONS)) {
    const clubs = activeClubs.value.filter(x => (x.comps || []).includes(name));
    if (!clubs.length) continue;
    const next = activeFixtures.value
      .filter(f => f.comp === name && f.date >= todayISO() && !f.played)
      .sort((a, b) => a.date.localeCompare(b.date) || timeSortKey(a.time) - timeSortKey(b.time))[0];
    out.push({ name, ...c, clubs, next, played: playedFixtures.value.filter(f => f.comp === name).length });
  }
  return out;
});
</script>

<template>
  <div class="sheet">
    <h2 class="section-label">Competitions</h2>
    <div v-if="!comps.length" class="empty">Follow a club and its competitions appear here.</div>
    <div v-else class="comp-grid">
      <router-link v-for="c in comps" :key="c.slug" class="comp-door" :to="`/competition/${c.slug}`">
        <div class="cd-head">
          <span class="cd-abbr">{{ c.abbr }}</span>
          <span class="cd-kits"><span v-for="club in c.clubs" :key="club.id"
                                      class="kit" :class="`kit-${club.id}`" :title="club.short"></span></span>
        </div>
        <h3>{{ c.name }}</h3>
        <div class="cd-meta">{{ c.country }} · {{ c.tier }}</div>
        <div class="cd-next">
          <template v-if="c.next">
            <span class="cd-when">{{ fmtDate(c.next.date) }}</span> {{ matchupLabel(c.next) }}
          </template>
          <template v-else-if="c.played">{{ c.played }} played · nothing scheduled</template>
          <template v-else>Fixtures arrive with the draw</template>
        </div>
        <div class="cd-bc"><BcChip :comp="c.name" /></div>
      </router-link>
    </div>
  </div>
</template>
