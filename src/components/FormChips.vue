<script setup>
defineProps({ form: { type: Array, required: true } });
</script>

<template>
  <span v-if="!form.length" class="none">no matches yet</span>
  <span v-else class="form">
    <span v-for="(r, i) in form" :key="i" class="chip" :class="r">{{ r }}</span>
  </span>
</template>
