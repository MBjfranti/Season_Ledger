<script setup>
import { computed } from "vue";
import { broadcastFor } from "../utils.js";

const props = defineProps({ comp: { type: String, required: true } });
const b = computed(() => broadcastFor(props.comp));
</script>

<template>
  <span :class="b.have ? 'bc have' : 'bc need'">{{ b.svc }}<template v-if="b.note"> ({{ b.note }})</template></span>
</template>
