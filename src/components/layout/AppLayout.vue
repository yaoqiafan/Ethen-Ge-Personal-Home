<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="content-shell">
      <AppHeader />
      <main class="content-main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #0a0e14;
}

.content-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.content-main {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}
</style>
