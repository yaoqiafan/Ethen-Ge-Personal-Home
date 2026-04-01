<template>
  <div class="app-layout">
    <!-- 移动端遮罩 -->
    <Transition name="overlay">
      <div
        v-if="isMobileMenuOpen"
        class="mobile-overlay"
        @click="isMobileMenuOpen = false"
      ></div>
    </Transition>

    <AppSidebar
      :is-collapsed="isCollapsed"
      :is-mobile-open="isMobileMenuOpen"
      @toggle-collapse="isCollapsed = !isCollapsed"
      @close-mobile="isMobileMenuOpen = false"
    />

    <div class="content-shell">
      <AppHeader
        :is-collapsed="isCollapsed"
        @open-mobile-menu="isMobileMenuOpen = true"
      />
      <main class="content-main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const isCollapsed = ref(false)
const isMobileMenuOpen = ref(false)
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #0a0e14;
  position: relative;
}

.content-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  transition: margin-left 0.3s ease;
}

.content-main {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* 移动端遮罩 */
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 40;
  backdrop-filter: blur(2px);
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.25s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
