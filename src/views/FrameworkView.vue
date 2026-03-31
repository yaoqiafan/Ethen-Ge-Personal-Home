<template>
  <div class="min-h-screen p-8 flex flex-col items-center justify-center">
    <div class="terminal-window w-full max-w-4xl p-8 text-center">
      <div class="text-terminal-green text-4xl font-bold mb-4 glow-green">PF.AutoFramework</div>
      <div class="text-terminal-muted">Industrial automation framework docs — coming soon</div>
      <RouterLink to="/" class="mt-8 inline-block text-terminal-cyan hover:text-terminal-green transition-colors">
        ← cd ~
      </RouterLink>
    </div>
  </div>
</template>
<script setup>
import { RouterLink } from 'vue-router'
</script>
