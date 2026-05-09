<template>
  <div ref="containerRef" class="cube-matrix-bg">
    <div class="frost-pane" :style="frostStyle" />
    <div class="vignette" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const containerRef = ref<HTMLDivElement | null>(null)

/* ═══════════════════════════════════════════════════
   Config — 10×10×10 large cube
   ═══════════════════════════════════════════════════ */
const GRID = 10
const SPACING = 1.4
const HALF = ((GRID - 1) / 2) * SPACING

/* ═══════════════════════════════════════════════════
   Three.js refs
   ═══════════════════════════════════════════════════ */
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let rootGroup: THREE.Group
let cubeEntries: CubeEntry[] = []
let animationId = 0

interface CubeEntry {
  mesh: THREE.Mesh
  basePos: THREE.Vector3
  baseSize: number
  baseEmissive: number
  baseColor: THREE.Color
  distFromCenter: number
}

/* ═══════════════════════════════════════════════════
   Mouse
   ═══════════════════════════════════════════════════ */
const mouse = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0 }
const frostStyle = ref('')

function onMouseMove(e: MouseEvent) {
  mouse.tx = (e.clientX / window.innerWidth) * 2 - 1
  mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1
  mouse.px = e.clientX
  mouse.py = e.clientY
}

/* ═══════════════════════════════════════════════════
   Math
   ═══════════════════════════════════════════════════ */
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function lerpColor(a: THREE.Color, b: THREE.Color, t: number) {
  return new THREE.Color(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t)
}
/** Wave height for a cube at world position (px, py, pz) at time t */
function waveY(px: number, py: number, pz: number, t: number): number {
  return (
    Math.sin(t * 1.2 + (px + pz) * 0.5 + py * 0.3) * 0.35 +
    Math.sin(t * 1.8 + px * 0.6 - pz * 0.4) * Math.cos(t * 1.4 + py * 0.5) * 0.25 +
    Math.sin(t * 2.2 + pz * 0.45 + py * 0.35) * 0.2
  )
}

/* ═══════════════════════════════════════════════════
   Build scene
   ═══════════════════════════════════════════════════ */
function buildScene(container: HTMLDivElement) {
  /* ── Renderer ──────────────────────────────── */
  renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setClearColor(0x020617)
  container.appendChild(renderer.domElement)

  /* ── Scene ──────────────────────────────────── */
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x020617, 0.00018)

  /* ── Camera ─────────────────────────────────── */
  camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 1, 150)
  camera.position.set(6, 10, 18)
  camera.lookAt(0, 0, 0)

  /* ── Lights ─────────────────────────────────── */
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const dir = new THREE.DirectionalLight(0xffffff, 0.6)
  dir.position.set(8, 16, 8)
  scene.add(dir)
  const pt1 = new THREE.PointLight(0x02ad8b, 100, 45)
  pt1.position.set(0, 0, 0)
  scene.add(pt1)
  const pt2 = new THREE.PointLight(0x0066ff, 55, 35)
  pt2.position.set(-12, -4, -12)
  scene.add(pt2)
  const pt3 = new THREE.PointLight(0x02ad8b, 40, 35)
  pt3.position.set(12, 4, 12)
  scene.add(pt3)

  /* ── Root group ─────────────────────────────── */
  rootGroup = new THREE.Group()
  scene.add(rootGroup)

  /* ── Build 10×10×10 cubes ──────────────────── */
  const offset = (GRID - 1) / 2
  const maxDist = Math.sqrt(3) * offset * SPACING
  const geo = new THREE.BoxGeometry(1, 1, 1)

  for (let y = 0; y < GRID; y++) {
    for (let z = 0; z < GRID; z++) {
      for (let x = 0; x < GRID; x++) {
        const px = (x - offset) * SPACING
        const py = (y - offset) * SPACING
        const pz = (z - offset) * SPACING
        const dist = Math.sqrt(px * px + py * py + pz * pz)
        const normDist = dist / maxDist

        const t = 1 - normDist
        const baseSize = 0.22 + t * t * 0.55 + Math.random() * 0.08
        const baseEmissive = 0.12 + t * 0.7 + Math.random() * 0.12

        const isWireframe = Math.random() < 0.2 || normDist > 0.85

        const color = new THREE.Color(
          0.04 + Math.random() * 0.04,
          0.07 + Math.random() * 0.04,
          0.09 + Math.random() * 0.03,
        )

        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: new THREE.Color(0x02ad8b),
          emissiveIntensity: baseEmissive,
          metalness: 0.75,
          roughness: 0.3,
          wireframe: isWireframe,
          opacity: isWireframe ? 0.45 : 1,
          transparent: isWireframe,
        })

        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(px, py, pz)
        mesh.scale.setScalar(baseSize)
        mesh.rotation.set(
          (Math.random() - 0.5) * 0.25,
          (Math.random() - 0.5) * 0.25,
          (Math.random() - 0.5) * 0.25,
        )

        rootGroup.add(mesh)
        cubeEntries.push({
          mesh,
          basePos: new THREE.Vector3(px, py, pz),
          baseSize,
          baseEmissive,
          baseColor: color.clone(),
          distFromCenter: normDist,
        })
      }
    }
  }
}

/* ═══════════════════════════════════════════════════
   Animation loop
   ═══════════════════════════════════════════════════ */
const clock = new THREE.Clock()
const MOUSE_INFLUENCE = HALF * 1.8
const accentColor = new THREE.Color(0x02ad8b)
const highlightColor = new THREE.Color(0x66ffee)

function animate() {
  animationId = requestAnimationFrame(animate)

  mouse.x = lerp(mouse.x, mouse.tx, 0.5)
  mouse.y = lerp(mouse.y, mouse.ty, 0.5)

  const t = clock.getElapsedTime()

  // Mouse 3D hit point
  const hitX = mouse.x * HALF * 1.1
  const hitY = -mouse.y * HALF * 1.1
  const hitZ = 0

  for (const entry of cubeEntries) {
    const { mesh, basePos, baseSize, baseEmissive, baseColor } = entry

    // Wave displacement
    const wy = waveY(basePos.x, basePos.y, basePos.z, t)
    mesh.position.x = basePos.x + Math.cos(t * 1.1 + basePos.y * 0.4) * 0.2
    mesh.position.y = basePos.y + wy
    mesh.position.z = basePos.z + Math.sin(t * 1.3 + basePos.y * 0.4) * 0.2

    // Size pulse
    const sizePulse = 1 + Math.sin(t * 2.0 + basePos.y * 0.8) * 0.08

    // Distance to mouse hit point
    const dx = mesh.position.x - hitX
    const dy = mesh.position.y - hitY
    const dz = mesh.position.z - hitZ
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    const mat = mesh.material as THREE.MeshStandardMaterial

    if (dist < MOUSE_INFLUENCE) {
      const f = 1 - dist / MOUSE_INFLUENCE
      const f2 = f * f

      // Emissive boost — up to ~3.5×
      mat.emissiveIntensity = baseEmissive * (1 + f2 * 2.8)
      // Emissive: teal → bright cyan
      mat.emissive.copy(lerpColor(accentColor, highlightColor, f * 0.85))
      // Base color lightens
      mat.color.copy(lerpColor(baseColor, new THREE.Color(0x446677), f * 0.35))
      // Size: grow near center, shrink at edge
      const sizeDelta = (f - 0.4) * 0.45
      mesh.scale.setScalar(baseSize * (sizePulse + sizeDelta))
    } else {
      // Smooth decay
      mat.emissiveIntensity = lerp(mat.emissiveIntensity, baseEmissive, 0.06)
      mat.emissive.copy(lerpColor(mat.emissive, accentColor, 0.06))
      mat.color.copy(lerpColor(mat.color, baseColor, 0.04))
      mesh.scale.setScalar(baseSize * sizePulse)
    }
  }

  // Camera parallax
  camera.position.x = 6 + mouse.x * 3
  camera.position.z = 18 + mouse.y * 2
  camera.lookAt(0, 0, 0)

  // Frost mask — soft clear spot following mouse
  frostStyle.value = `--mx:${mouse.px}px;--my:${mouse.py}px`

  renderer.render(scene, camera)
}

/* ═══════════════════════════════════════════════════
   Resize
   ═══════════════════════════════════════════════════ */
function onResize() {
  if (!containerRef.value) return
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

/* ═══════════════════════════════════════════════════
   Lifecycle
   ═══════════════════════════════════════════════════ */
onMounted(() => {
  if (!containerRef.value) return
  buildScene(containerRef.value)
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('resize', onResize)
  animate()
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', onResize)
  renderer?.dispose()
  cubeEntries = []
})
</script>

<style scoped>
.cube-matrix-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: auto;
  background: #020617;
  overflow: hidden;
}

.frost-pane {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  backdrop-filter: blur(10px) saturate(0.5);
  -webkit-backdrop-filter: blur(10px) saturate(0.5);
  background: rgba(2, 6, 23, 0.22);
  mask-image: radial-gradient(
    circle 340px at var(--mx, 50%) var(--my, 50%),
    transparent 0%,
    transparent 65%,
    rgba(0, 0, 0, 0.02) 72%,
    rgba(0, 0, 0, 0.06) 80%,
    rgba(0, 0, 0, 0.14) 88%,
    rgba(0, 0, 0, 0.28) 95%,
    rgba(0, 0, 0, 0.5) 100%
  );
  -webkit-mask-image: radial-gradient(
    circle 340px at var(--mx, 50%) var(--my, 50%),
    transparent 0%,
    transparent 65%,
    rgba(0, 0, 0, 0.02) 72%,
    rgba(0, 0, 0, 0.06) 80%,
    rgba(0, 0, 0, 0.14) 88%,
    rgba(0, 0, 0, 0.28) 95%,
    rgba(0, 0, 0, 0.5) 100%
  );
}

/* ── Edge vignette ──────────────────────────── */
.vignette {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: radial-gradient(
    ellipse 85% 75% at 50% 45%,
    transparent 55%,
    rgba(2, 6, 23, 0.4) 100%
  );
}
</style>
