<template>
  <div class="cube-matrix-bg">
    <TresCanvas
      :alpha="true"
      :shadows="false"
      window-size
    >
      <TresPerspectiveCamera
        :position="[0, 14, 6]"
        :fov="55"
        :near="1"
        :far="100"
      />
      <TresAmbientLight :intensity="0.5" />
      <TresDirectionalLight
        :position="[5, 12, 5]"
        :intensity="0.9"
        color="#ffffff"
      />
      <TresPointLight
        :position="[0, 8, 0]"
        :intensity="80"
        :distance="30"
        color="#02AD8B"
      />
      <TresPointLight
        :position="[-10, 4, -10]"
        :intensity="50"
        :distance="25"
        color="#0066ff"
      />
      <TresPointLight
        :position="[10, 4, 10]"
        :intensity="40"
        :distance="25"
        color="#02AD8B"
      />
      <CubeField />
    </TresCanvas>
  </div>
</template>

<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import CubeField from './CubeField.vue'
</script>

<style scoped>
.cube-matrix-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: auto;
  background: #020617;
}
</style>
