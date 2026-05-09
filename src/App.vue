<template>
  <CyberGridBackground ref="bgRef" @ready="onBgReady" />
  <CardCarouselLayer
    v-if="bgReady && isHomePage"
    :scene="bgInternals.scene"
    :camera="bgInternals.camera"
    :diagonal-group="bgInternals.diagonalGroup"
    :half="bgInternals.HALF"
    :add-after-render="bgInternals.addAfterRender"
    :remove-after-render="bgInternals.removeAfterRender"
  />
  <RouterView v-if="bgReady" />
  <CursorGlow />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import CyberGridBackground from '@/components/effects/CyberGridBackground.vue'
import CardCarouselLayer from '@/components/effects/CardCarouselLayer.vue'
import CursorGlow from '@/components/effects/CursorGlow.vue'

const route = useRoute()
const bgRef = ref<InstanceType<typeof CyberGridBackground> | null>(null)
const bgReady = ref(false)
const isHomePage = computed(() => route.path === '/')

const bgInternals = ref<{
  scene: any
  camera: any
  diagonalGroup: any
  HALF: number
  addAfterRender: (cb: () => void) => void
  removeAfterRender: (cb: () => void) => void
}>({
  scene: null,
  camera: null,
  diagonalGroup: null,
  HALF: 0,
  addAfterRender: () => {},
  removeAfterRender: () => {},
})

function onBgReady() {
  bgReady.value = true
  if (bgRef.value) {
    const exp = bgRef.value as any
    bgInternals.value = {
      scene: exp.scene(),
      camera: exp.camera(),
      diagonalGroup: exp.diagonalGroup(),
      HALF: exp.HALF,
      addAfterRender: exp.addAfterRender,
      removeAfterRender: exp.removeAfterRender,
    }
  }
}
</script>
