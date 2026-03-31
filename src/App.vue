<template>
  <div class="min-h-screen bg-terminal-bg relative overflow-hidden">
    <!-- CRT scan line overlay -->
    <div class="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-5">
      <div class="absolute w-full h-0.5 bg-terminal-green animate-scan-line"></div>
    </div>

    <!-- CRT vignette -->
    <div
      class="pointer-events-none fixed inset-0 z-40"
      style="background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%)"
    ></div>

    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
</script>
