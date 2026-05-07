<template>
  <TresGroup ref="gridGroupRef">
    <TresMesh
      v-for="cube in cubeData"
      :key="cube.id"
      :ref="(el: unknown) => setMeshRef(cube.id, el)"
      :position="[cube.x, 0, cube.z]"
      :rotation="cube.rotation"
    >
      <TresBoxGeometry :args="[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]" />
      <TresMeshStandardMaterial
        :color="cube.color"
        :emissive="EMISSIVE_COLOR"
        :emissive-intensity="cube.emissiveIntensity"
        :metalness="0.85"
        :roughness="0.25"
        :wireframe="cube.isWireframe"
        :opacity="cube.isWireframe ? 0.5 : 1"
        :transparent="cube.isWireframe"
      />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef } from 'vue'
import { useLoop, useTresContext } from '@tresjs/core'
import * as THREE from 'three'

/* ═══════════════════════════════════════════════════
   Grid config
   ═══════════════════════════════════════════════════ */
const GRID_SIZE = 14
const SPACING = 1.2
const CUBE_SIZE = 0.52
const EMISSIVE_COLOR = '#02AD8B'

interface CubeDef {
  id: number
  x: number
  z: number
  color: string
  emissiveIntensity: number
  isWireframe: boolean
  rotation: [number, number, number]
}

function buildCubeData(): CubeDef[] {
  const data: CubeDef[] = []
  const offset = (GRID_SIZE - 1) / 2
  const maxDist = Math.sqrt(offset * offset + offset * offset) * SPACING

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const id = row * GRID_SIZE + col
      const x = (col - offset) * SPACING
      const z = (row - offset) * SPACING
      const dist = Math.sqrt(x * x + z * z)
      const normDist = dist / maxDist

      const emissiveIntensity = 0.15 + (1 - normDist) * 0.7 + Math.random() * 0.1
      const isWireframe = Math.random() < 0.25
      const rotation: [number, number, number] = [
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15,
      ]

      const hueShift = (Math.random() - 0.5) * 0.06
      const r = 0.06 + hueShift * 0.3
      const g = 0.09 + Math.random() * 0.03
      const b = 0.11 + Math.random() * 0.03
      const color = new THREE.Color(r, g, b).getHexString()

      data.push({ id, x, z, color: `#${color}`, emissiveIntensity, isWireframe, rotation })
    }
  }
  return data
}

const cubeData = buildCubeData()

/* ═══════════════════════════════════════════════════
   Mesh refs
   ═══════════════════════════════════════════════════ */
const meshRefs = new Map<number, THREE.Mesh>()
const gridGroupRef = shallowRef<THREE.Group | null>(null)

function setMeshRef(id: number, el: unknown) {
  if (el) meshRefs.set(id, el as THREE.Mesh)
}

/* ═══════════════════════════════════════════════════
   TresJS context — camera manager + render loop
   ═══════════════════════════════════════════════════ */
const { camera: cameraManager } = useTresContext()
const { onRender } = useLoop()

/* ═══════════════════════════════════════════════════
   Mouse tracking
   ═══════════════════════════════════════════════════ */
const mouse = { x: 0, y: 0, tx: 0, ty: 0 }

function onMouseMove(e: MouseEvent) {
  mouse.tx = (e.clientX / window.innerWidth) * 2 - 1
  mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1
}

/* ═══════════════════════════════════════════════════
   Wave & bulge math
   ═══════════════════════════════════════════════════ */
function waveY(gx: number, gz: number, t: number): number {
  return (
    Math.sin(t * 1.6 + (gx + gz) * 0.45) * 0.7 +
    Math.sin(t * 2.1 + gx * 0.7) * Math.cos(t * 1.9 + gz * 0.7) * 0.5 +
    Math.sin(t * 2.8 + gz * 0.55 - gx * 0.35) * 0.35
  )
}

function bulgeY(gx: number, gz: number, mx: number, my: number): number {
  const halfExtent = ((GRID_SIZE - 1) / 2) * SPACING
  const cursorX = mx * halfExtent
  const cursorZ = my * halfExtent
  const dx = gx - cursorX
  const dz = gz - cursorZ
  const distSq = dx * dx + dz * dz
  const radius = 3.6
  if (distSq > radius * radius) return 0
  const t = Math.sqrt(distSq) / radius
  return Math.cos(t * Math.PI * 0.5) * 1.3 * (1 - t * 0.4)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/* ═══════════════════════════════════════════════════
   Camera base position (resting state)
   ═══════════════════════════════════════════════════ */
const camBase = { x: 0, y: 14, z: 6 }

/* ═══════════════════════════════════════════════════
   Render loop
   ═══════════════════════════════════════════════════ */
onRender(({ elapsed, camera: loopCamera }) => {
  // Smooth mouse follow
  mouse.x = lerp(mouse.x, mouse.tx, 0.06)
  mouse.y = lerp(mouse.y, mouse.ty, 0.06)

  const mt = elapsed
  const mx = mouse.x
  const my = mouse.y

  // Cube wave + bulge
  for (const cube of cubeData) {
    const mesh = meshRefs.get(cube.id)
    if (!mesh) continue
    mesh.position.y = waveY(cube.x, cube.z, mt) + bulgeY(cube.x, cube.z, mx, my)
  }

  // Camera parallax — nudge position, always looking at origin
  const cam = loopCamera.value as THREE.PerspectiveCamera | undefined
  if (cam && cam.isPerspectiveCamera) {
    cam.position.x = camBase.x + mx * 2.5
    cam.position.z = camBase.z + my * 2.0
    cam.lookAt(0, 0, 0)
  }

  // Pulse emissive
  const pulse = 1 + Math.sin(mt * 0.7) * 0.08
  for (const cube of cubeData) {
    const mesh = meshRefs.get(cube.id)
    if (!mesh || !mesh.material) continue
    const mat = mesh.material as THREE.MeshStandardMaterial
    if (!cube.isWireframe) {
      mat.emissiveIntensity = cube.emissiveIntensity * pulse
    }
  }
})

/* ═══════════════════════════════════════════════════
   Lifecycle
   ═══════════════════════════════════════════════════ */
onMounted(() => {
  window.addEventListener('mousemove', onMouseMove, { passive: true })

  // Init camera via the camera manager
  const cameras = cameraManager.cameras.value
  if (cameras.length > 0) {
    const cam = cameras[0] as THREE.PerspectiveCamera
    cam.position.set(camBase.x, camBase.y, camBase.z)
    cam.lookAt(0, 0, 0)
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  meshRefs.clear()
})
</script>
