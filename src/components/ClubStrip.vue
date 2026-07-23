<script setup>
import { CLUBS } from "../data/data.js";

defineProps({ activeId: { type: String, default: null } });
</script>

<template>
  <nav class="club-strip">
    <router-link v-for="c in CLUBS" :key="c.id" :to="`/club/${c.id}`"
                 :class="{ active: c.id === activeId }">
      <span class="kit" :class="`kit-${c.id}`"></span><span>{{ c.short }}</span>
    </router-link>
  </nav>
</template>
