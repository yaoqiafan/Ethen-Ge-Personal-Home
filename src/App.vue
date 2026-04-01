<template>
  <RouterView />
  <CursorGlow />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import CursorGlow from '@/components/effects/CursorGlow.vue'
</script>
