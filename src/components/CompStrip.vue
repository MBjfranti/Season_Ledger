<script setup>
import { computed } from "vue";
import { COMPETITIONS } from "../data/competitions.js";
import { activeClubs } from "../store.js";

// The competition equivalent of ClubStrip: one hop from any competition page to
// any other, without going back through an index first.
defineProps({ activeSlug: { type: String, default: null } });

const comps = computed(() => {
  const mine = new Set(activeClubs.value.flatMap(c => c.comps || []));
  return Object.entries(COMPETITIONS)
    .filter(([name]) => mine.has(name))
    .map(([name, c]) => ({ name, ...c }));
});
</script>

<template>
  <nav class="comp-strip" aria-label="Competitions">
    <router-link v-for="c in comps" :key="c.slug" :to="`/competition/${c.slug}`"
                 :class="{ active: c.slug === activeSlug }" :title="c.name">
      <span>{{ c.abbr }}</span>
    </router-link>
  </nav>
</template>
