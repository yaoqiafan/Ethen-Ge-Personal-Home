<template>
  <div ref="containerRef" class="cube-matrix-bg">
    <div class="vignette" />
    <div class="scanlines" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const containerRef = ref<HTMLDivElement | null>(null)

const emit = defineEmits<{ ready: [] }>()

/* ═══════════════════════════════════════════════════
   Config — 10×10×10 3D cube matrix
   ═══════════════════════════════════════════════════ */
const isMobile = window.innerWidth < 768
const GRID = isMobile ? 8 : 10
const SPACING = 1.4
const HALF = ((GRID - 1) / 2) * SPACING
const MAX_DIST = Math.sqrt(3) * HALF
const INFLUENCE = HALF * 1.8
const AMBIENT_PARTICLES = isMobile ? 60 : 120
const REACTIVE_PARTICLES = isMobile ? 15 : 30

/** Scale rootGroup so the cube matrix fills the viewport at any resolution */
let responsiveScale = 1
function computeResponsiveScale(): number {
  const w = window.innerWidth
  const h = window.innerHeight
  const diagonal = Math.sqrt(w * w + h * h)
  const ref = Math.sqrt(1920 * 1920 + 1080 * 1080)
  return Math.max(0.9, Math.min(1.6, (diagonal / ref) * 1.08))
}

/* ═══════════════════════════════════════════════════
   Three.js refs
   ═══════════════════════════════════════════════════ */
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let orbitPivot: THREE.Group
let rootGroup: THREE.Group
let diagonalGroup: THREE.Group
let cursorLight: THREE.SpotLight
let faceLights: THREE.RectAreaLight[] = []
let ambientSprites: THREE.Sprite[] = []
let reactiveSprites: { sprite: THREE.Sprite; state: ParticleState }[] = []
let cubeEntries: CubeEntry[] = []
let animId = 0
const afterRenderCallbacks: (() => void)[] = []

interface CubeEntry {
  mesh: THREE.Mesh
  basePos: THREE.Vector3
  baseSize: number
  baseEmissive: number
  baseColor: THREE.Color
  distFromCenter: number
}

interface ParticleState {
  life: number
  maxLife: number
  baseX: number
  baseY: number
  baseZ: number
  speedY: number
  driftX: number
  driftZ: number
}

/* ═══════════════════════════════════════════════════
   Mouse
   ═══════════════════════════════════════════════════ */
const mouse = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0 }
let hasMouse = false

function onMouseMove(e: MouseEvent) {
  if (isDragging) {
    const dx = e.clientX - prevMouse.x
    const dy = e.clientY - prevMouse.y
    targetRot.y += dx * 0.005
    targetRot.x += dy * 0.005
    targetRot.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRot.x))
    prevMouse.x = e.clientX
    prevMouse.y = e.clientY
  }
  mouse.tx = (e.clientX / window.innerWidth) * 2 - 1
  mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1
  mouse.px = e.clientX
  mouse.py = e.clientY
  hasMouse = true
}
function onMouseLeave() { hasMouse = false }

// Right-click drag to rotate cube
let isDragging = false
let prevMouse = { x: 0, y: 0 }
const pivotRot = { x: 0, y: 0 }
const targetRot = { x: 0, y: 0 }

function onMouseDown(e: MouseEvent) {
  if (e.button === 2) { // right click
    isDragging = true
    prevMouse.x = e.clientX
    prevMouse.y = e.clientY
    e.preventDefault()
  }
}
function onMouseUp(e: MouseEvent) {
  if (e.button === 2) isDragging = false
}
function onContextMenu(e: Event) { e.preventDefault() }

/* ═══════════════════════════════════════════════════
   Colors
   ═══════════════════════════════════════════════════ */
const COL_ACCENT = new THREE.Color(0x02ad8b)
const COL_HIGHLIGHT = new THREE.Color(0x66ffee)

/* ═══════════════════════════════════════════════════
   Math
   ═══════════════════════════════════════════════════ */
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function lerpColor(a: THREE.Color, b: THREE.Color, t: number) {
  return new THREE.Color(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  )
}

/** 3D wave height — uses all 3 axes for organic motion */
function waveY(px: number, py: number, pz: number, t: number): number {
  return (
    Math.sin(t * 1.2 + (px + pz) * 0.5 + py * 0.3) * 0.35 +
    Math.sin(t * 1.8 + px * 0.6 - pz * 0.4) * Math.cos(t * 1.4 + py * 0.5) * 0.25 +
    Math.sin(t * 2.2 + pz * 0.45 + py * 0.35) * 0.2
  )
}

/* ═══════════════════════════════════════════════════
   Particle helpers — two-layer sprite system
   ═══════════════════════════════════════════════════ */
function createGlowSprite(color: string, size: number, opacity: number, coreRatio: number): THREE.Sprite {
  const s = 128
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')!
  const half = s / 2
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  gradient.addColorStop(0, color)
  gradient.addColorStop(coreRatio, color)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({
    map: tex,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    opacity,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.setScalar(size)
  sprite.renderOrder = 999
  return sprite
}

function buildAmbientSprites(scene: THREE.Scene) {
  const range = HALF * 1.4
  const yRange = HALF * 1.2

  for (let i = 0; i < AMBIENT_PARTICLES; i++) {
    const sprite = createGlowSprite('rgba(136,68,255,0.9)', 0.28, 0.45, 0.25)
    sprite.position.set(
      (Math.random() - 0.5) * range * 2,
      (Math.random() - 0.5) * yRange * 2,
      (Math.random() - 0.5) * range * 2,
    )
    sprite.userData = {
      velY: 0.002 + Math.random() * 0.006,
      velX: (Math.random() - 0.5) * 0.003,
      velZ: (Math.random() - 0.5) * 0.003,
      range,
      yRange,
      type: 'ambient',
    }
    scene.add(sprite)
    ambientSprites.push(sprite)
  }
}

function buildReactiveSprites(scene: THREE.Scene) {
  const deadY = -HALF * 1.2

  for (let i = 0; i < REACTIVE_PARTICLES; i++) {
    const sprite = createGlowSprite('rgba(88,166,255,1)', 0.35, 0.55, 0.25)
    sprite.position.set(0, deadY, 0)
    sprite.userData.type = 'reactive'
    const state: ParticleState = {
      life: 0,
      maxLife: 1.0 + Math.random() * 2.2,
      baseX: 0, baseY: 0, baseZ: 0,
      speedY: 0.5 + Math.random() * 1.3,
      driftX: (Math.random() - 0.5) * 0.35,
      driftZ: (Math.random() - 0.5) * 0.35,
    }
    scene.add(sprite)
    reactiveSprites.push({ sprite, state })
  }
}

function buildParticles(scene: THREE.Scene) {
  buildAmbientSprites(scene)
  buildReactiveSprites(scene)
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
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)

  /* ── Scene / Fog ────────────────────────────── */
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x020617, 0.00018)

  /* ── Camera ─────────────────────────────────── */
  camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    1,
    150,
  )
  camera.position.set(8, 12, 24)
  camera.lookAt(0, 0, 0)

  /* ── Lights ─────────────────────────────────── */
  scene.add(new THREE.AmbientLight(0xffffff, 0.12))
  const dir = new THREE.DirectionalLight(0xffffff, 0.25)
  dir.position.set(8, 16, 8)
  scene.add(dir)

  // Teal searchlight (follows cursor, focused beam toward center)
  cursorLight = new THREE.SpotLight(0x02ad8b, 60, HALF * 3, Math.PI / 10, 0.25, 1)
  cursorLight.position.set(0, 0, 0)
  cursorLight.target.position.set(0, 0, 0)
  scene.add(cursorLight)
  scene.add(cursorLight.target)

  /* ── Orbit pivot + root group ────────────────── */
  orbitPivot = new THREE.Group()
  scene.add(orbitPivot)

  rootGroup = new THREE.Group()
  responsiveScale = computeResponsiveScale()
  rootGroup.scale.setScalar(responsiveScale)
  orbitPivot.add(rootGroup)

  // Body-diagonal alignment: rotate so (+HALF,+HALF,+HALF) aligns with world Y
  diagonalGroup = new THREE.Group()
  const bodyDiagDir = new THREE.Vector3(1, 1, 1).normalize()
  const worldUp = new THREE.Vector3(0, 1, 0)
  diagonalGroup.quaternion.setFromUnitVectors(bodyDiagDir, worldUp)
  rootGroup.add(diagonalGroup)

  // 6 purple rect-area lights inside diagonalGroup — rotate with cube
  const faceSize = HALF * 2.1
  const lightDist = HALF + 0.6
  const faceDefs: { pos: [number, number, number]; rot: [number, number, number] }[] = [
    { pos: [ lightDist, 0, 0], rot: [0, Math.PI / 2, 0] },
    { pos: [-lightDist, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { pos: [0,  lightDist, 0], rot: [-Math.PI / 2, 0, 0] },
    { pos: [0, -lightDist, 0], rot: [Math.PI / 2, 0, 0] },
    { pos: [0, 0,  lightDist], rot: [0, Math.PI, 0] },
    { pos: [0, 0, -lightDist], rot: [0, 0, 0] },
  ]
  for (const { pos, rot } of faceDefs) {
    const light = new THREE.RectAreaLight(0x8844ff, 8, faceSize, faceSize)
    light.position.set(...pos)
    light.rotation.set(...rot)
    diagonalGroup.add(light)
    faceLights.push(light)
  }

  /* ── Build 10×10×10 cubes ──────────────────── */
  const offset = (GRID - 1) / 2
  const geo = new THREE.BoxGeometry(1, 1, 1)

  for (let y = 0; y < GRID; y++) {
    for (let z = 0; z < GRID; z++) {
      for (let x = 0; x < GRID; x++) {
        const px = (x - offset) * SPACING
        const py = (y - offset) * SPACING
        const pz = (z - offset) * SPACING
        const dist = Math.sqrt(px * px + py * py + pz * pz)
        const normDist = dist / MAX_DIST

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

        diagonalGroup.add(mesh)
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

  /* ── Particle system ────────────────────────── */
  buildParticles(scene)
}

/* ═══════════════════════════════════════════════════
   Animation loop
   ═══════════════════════════════════════════════════ */
const timer = new THREE.Timer()
let firstFrame = true

function animate(ts?: number) {
  animId = requestAnimationFrame(animate)

  timer.update(ts ?? 0)

  mouse.x = lerp(mouse.x, mouse.tx, 0.5)
  mouse.y = lerp(mouse.y, mouse.ty, 0.5)

  const t = timer.getElapsed()

  // Mouse 3D hit point (projected into the cube volume — local space)
  const hitLX = mouse.x * HALF * 1.1
  const hitLY = -mouse.y * HALF * 1.1
  const hitLZ = 0
  // World-space hit point for lights (outside rootGroup)
  const hitWX = hitLX * responsiveScale
  const hitWY = hitLY * responsiveScale
  const hitWZ = 0

  for (const entry of cubeEntries) {
    const { mesh, basePos, baseSize, baseEmissive, baseColor } = entry

    // Wave displacement (original style — all 3 axes)
    const wy = waveY(basePos.x, basePos.y, basePos.z, t)
    mesh.position.x = basePos.x + Math.cos(t * 1.1 + basePos.y * 0.4) * 0.2
    mesh.position.y = basePos.y + wy
    mesh.position.z = basePos.z + Math.sin(t * 1.3 + basePos.y * 0.4) * 0.2

    // Size pulse
    const sizePulse = 1 + Math.sin(t * 2.0 + basePos.y * 0.8) * 0.08

    // Distance to mouse hit point (in 3D)
    const dx = mesh.position.x - hitLX
    const dy = mesh.position.y - hitLY
    const dz = mesh.position.z - hitLZ
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    const mat = mesh.material as THREE.MeshStandardMaterial

    if (hasMouse && dist < INFLUENCE) {
      const f = 1 - dist / INFLUENCE
      const f2 = f * f

      // Emissive boost up to ~3.5×
      mat.emissiveIntensity = baseEmissive * (1 + f2 * 2.8)
      // Emissive: teal → bright cyan
      mat.emissive.copy(lerpColor(COL_ACCENT, COL_HIGHLIGHT, f * 0.85))
      // Base color lightens
      mat.color.copy(lerpColor(baseColor, new THREE.Color(0x446677), f * 0.35))
      // Size: grow near cursor
      const sizeDelta = (f - 0.4) * 0.45
      mesh.scale.setScalar(baseSize * (sizePulse + Math.max(0, sizeDelta)))
    } else {
      // Smooth decay back to base
      mat.emissiveIntensity = lerp(mat.emissiveIntensity, baseEmissive, 0.06)
      mat.emissive.copy(lerpColor(mat.emissive, COL_ACCENT, 0.06))
      mat.color.copy(lerpColor(mat.color, baseColor, 0.04))
      mesh.scale.setScalar(baseSize * sizePulse)
    }
  }

  /* ── Cursor light follows mouse projection ──── */
  cursorLight.intensity = lerp(cursorLight.intensity, hasMouse ? 60 : 20, 0.08)
  cursorLight.position.lerp(
    new THREE.Vector3(hitWX, hitWY, hitWZ),
    0.25,
  )
  const faceTarget = hasMouse ? 10 : 5
  for (const l of faceLights) {
    l.intensity = lerp(l.intensity, faceTarget, 0.06)
  }

  /* ── Ambient particles ──────────────────────── */
  // Frustum-filling ranges (visible area of camera at cube center)
  const ambRangeXZ = HALF * 2.5
  const ambRangeY = HALF * 1.8
  const frustumTop = ambRangeY
  const frustumBot = -ambRangeY * 1.2
  for (const sprite of ambientSprites) {
    const ud = sprite.userData
    sprite.position.y += ud.velY + Math.sin(t * 0.3 + sprite.position.x * 0.2) * 0.003
    sprite.position.x += ud.velX + Math.cos(t * 0.2 + sprite.position.y * 0.2) * 0.002
    sprite.position.z += ud.velZ + Math.sin(t * 0.25 + sprite.position.y * 0.2) * 0.002
    // Depth-based scale
    const distToCamera = camera.position.distanceTo(sprite.position)
    sprite.scale.setScalar(0.28 * (15 / Math.max(distToCamera, 5)))
    // Out of frustum → respawn at bottom
    if (sprite.position.y > frustumTop || sprite.position.y < frustumBot ||
        Math.abs(sprite.position.x) > ambRangeXZ || Math.abs(sprite.position.z) > ambRangeXZ) {
      sprite.position.set(
        (Math.random() - 0.5) * ambRangeXZ * 2,
        frustumBot + Math.random() * 0.5,
        (Math.random() - 0.5) * ambRangeXZ * 2,
      )
    }
  }

  /* ── Reactive particles ─────────────────────── */
  for (const { sprite, state } of reactiveSprites) {
    if (state.life <= 0) {
      const spawnChance = hasMouse ? 0.12 : 0.04
      if (Math.random() < spawnChance) {
        if (hasMouse) {
          // Tight cluster right at mouse 3D position
          const angle = Math.random() * Math.PI * 2
          const phi = Math.random() * Math.PI * 0.5
          const radius = 0.3 + Math.random() * 1.0
          state.baseX = hitLX + Math.cos(angle) * Math.sin(phi) * radius
          state.baseY = hitLY + Math.cos(phi) * radius * 0.6
          state.baseZ = hitLZ + Math.sin(angle) * Math.sin(phi) * radius
        } else {
          state.baseX = (Math.random() - 0.5) * ambRangeXZ * 2
          state.baseY = frustumBot + Math.random() * 1.5
          state.baseZ = (Math.random() - 0.5) * ambRangeXZ * 2
        }
        state.life = state.maxLife
        state.speedY = 0.4 + Math.random() * 0.8
        state.driftX = (Math.random() - 0.5) * 0.3
        state.driftZ = (Math.random() - 0.5) * 0.3
      }
      sprite.material.opacity = 0
    } else {
      state.life -= 0.016
      const progress = 1 - state.life / state.maxLife
      // Rise upward, fade out at top
      const rise = progress * 8 + state.speedY * state.life * 0.5
      sprite.position.x = state.baseX + state.driftX * progress * 3
      sprite.position.y = state.baseY + rise
      sprite.position.z = state.baseZ + state.driftZ * progress * 3
      // Shrink as it rises
      const shrinkScale = (1 - progress) * 0.35
      const distToCamera = camera.position.distanceTo(sprite.position)
      sprite.scale.setScalar(Math.max(0.05, shrinkScale * (15 / Math.max(distToCamera, 5))))
      // Fade out near top of frustum
      const nearTop = sprite.position.y > frustumTop * 0.6
      sprite.material.opacity = nearTop
        ? (hasMouse ? 0.55 : 0.3) * (1 - (sprite.position.y - frustumTop * 0.6) / (frustumTop * 0.4))
        : (hasMouse ? 0.55 : 0.3)
      // Kill if past top
      if (sprite.position.y > frustumTop) {
        state.life = 0
      }
    }
  }

  /* ── Orbit pivot rotation ──────────────────── */
  pivotRot.x = lerp(pivotRot.x, targetRot.x, 0.08)
  pivotRot.y = lerp(pivotRot.y, targetRot.y, 0.08)
  orbitPivot.rotation.set(pivotRot.x, pivotRot.y, 0)

  /* ── Camera parallax ───────────────────────── */
  camera.position.x = 8 + mouse.x * 3
  camera.position.z = 24 + mouse.y * 2
  camera.lookAt(0, 0, 0)

  renderer.render(scene, camera)
  for (const cb of afterRenderCallbacks) cb()

  if (firstFrame) {
    firstFrame = false
    // Double rAF ensures the canvas is composited before UI reveals
    requestAnimationFrame(() => {
      requestAnimationFrame(() => emit('ready'))
    })
  }
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
  responsiveScale = computeResponsiveScale()
  rootGroup.scale.setScalar(responsiveScale)
}

/* ═══════════════════════════════════════════════════
   Lifecycle
   ═══════════════════════════════════════════════════ */
onMounted(() => {
  if (!containerRef.value) return
  buildScene(containerRef.value)
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('mouseleave', onMouseLeave)
  window.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('resize', onResize)
  animate()
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('mouseleave', onMouseLeave)
  window.removeEventListener('contextmenu', onContextMenu)
  window.removeEventListener('resize', onResize)
  renderer?.dispose()
  cubeEntries = []
})

defineExpose({
  scene: () => scene,
  camera: () => camera,
  rootGroup: () => rootGroup,
  diagonalGroup: () => diagonalGroup,
  HALF,
  addAfterRender: (cb: () => void) => { afterRenderCallbacks.push(cb) },
  removeAfterRender: (cb: () => void) => {
    const idx = afterRenderCallbacks.indexOf(cb)
    if (idx !== -1) afterRenderCallbacks.splice(idx, 1)
  },
})
</script>

<style scoped>
.cube-matrix-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: auto;
  background: #020617;
  overflow: hidden;
}

/* ── Vignette ───────────────────────────────── */
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

/* ── Scanlines ──────────────────────────────── */
.scanlines {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.025) 2px,
    rgba(0, 0, 0, 0.025) 4px
  );
  opacity: 0.45;
}
</style>
