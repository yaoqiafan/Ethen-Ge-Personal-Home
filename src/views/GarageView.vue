<template>
  <div class="min-h-screen p-8 flex flex-col items-center justify-center">
    <div class="terminal-window w-full max-w-4xl p-8 text-center">
      <div class="text-terminal-red text-4xl font-bold mb-4" style="text-shadow: 0 0 16px rgba(248,81,73,0.8)">
        Digital Garage 🏍️
      </div>
      <div class="text-terminal-muted">Kawasaki H2 showcase — coming soon</div>
      <RouterLink to="/" class="mt-8 inline-block text-terminal-cyan hover:text-terminal-green transition-colors">
        ← cd ~
      </RouterLink>
    </div>
  </div>
</template>
<script setup>
import { RouterLink } from 'vue-router'
</script>
