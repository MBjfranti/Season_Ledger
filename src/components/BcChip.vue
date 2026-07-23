<script setup>
import { computed } from "vue";
import { broadcastFor } from "../utils.js";

const props = defineProps({ comp: { type: String, required: true } });
const services = computed(() => broadcastFor(props.comp));
</script>

<template>
  <span v-for="(b, i) in services" :key="i" :class="b.have ? 'bc have' : 'bc need'">{{ b.have ? "✓" : "+" }} {{ b.svc }}<template v-if="b.note"> ({{ b.note }})</template></span>
</template>
