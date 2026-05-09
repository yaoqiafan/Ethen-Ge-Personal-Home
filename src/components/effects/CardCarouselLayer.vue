<template>
  <div ref="layerRef" class="carousel-layer" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { setupCardCarousel, teardownCardCarousel, resizeCardCarousel } from '@/composables/useCardCarousel'

const props = defineProps<{
  scene: any
  camera: any
  diagonalGroup: any
  half: number
  addAfterRender: (cb: () => void) => void
  removeAfterRender: (cb: () => void) => void
}>()

const router = useRouter()
const layerRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!layerRef.value) return
  setupCardCarousel({
    container: layerRef.value,
    scene: props.scene,
    camera: props.camera,
    diagonalGroup: props.diagonalGroup,
    half: props.half,
    navigate: (path: string) => router.push(path),
    addAfterRender: props.addAfterRender,
    removeAfterRender: props.removeAfterRender,
  })
  window.addEventListener('resize', resizeCardCarousel)
})

onUnmounted(() => {
  teardownCardCarousel()
  window.removeEventListener('resize', resizeCardCarousel)
})
</script>

<style scoped>
.carousel-layer {
  position: fixed;
  inset: 0;
  z-index: 6;
  pointer-events: none;
}
</style>
