<template>
  <TerminalParticles v-if="showParticles" />
  <RouterView v-slot="{ Component, route }">
    <Transition name="page" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>
  <CursorGlow />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import CursorGlow          from '@/components/effects/CursorGlow.vue'
import TerminalParticles   from '@/components/effects/TerminalParticles.vue'

const route = useRoute()
const showParticles = computed(() => route.name !== 'enter')
</script>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
