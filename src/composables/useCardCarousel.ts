import * as THREE from 'three'
import { CSS3DRenderer, CSS3DSprite } from 'three/addons'

/* ═══════════════════════════════════════════════════
   Nav card definitions
   ═══════════════════════════════════════════════════ */
interface CardDef {
  id: string
  label: string
  icon: string
  path: string
  color: string
}

export const NAV_CARDS: CardDef[] = [
  { id: 'dashboard',  label: '控制台',    icon: '⊞', path: '/dashboard',  color: '#02AD8B' },
  { id: 'garage',     label: '数字车库',  icon: '◎', path: '/garage',     color: '#f85149' },
  { id: 'framework',  label: '工业框架',  icon: '◈', path: '/framework',  color: '#39d353' },
  { id: 'kitchen',    label: '家庭厨房',  icon: '🍳', path: '/kitchen',  color: '#bc8cff' },
  { id: 'ai-toolbox', label: 'AI 工具箱', icon: '✦', path: '/ai-toolbox', color: '#58a6ff' },
  { id: 'game-room',  label: '游戏室',    icon: '⌘', path: '/game-room',  color: '#e3b341' },
]

const CARD_ANGLES = [0, 1, 2, 3, 4, 5].map(n => n * Math.PI / 3)

interface CardEntry {
  sprite: CSS3DSprite
  angle: number
  element: HTMLElement
  def: CardDef
}

let cssRenderer: CSS3DRenderer | null = null
let liveCamera: THREE.PerspectiveCamera | null = null
let cards: CardEntry[] = []
let diagonalGroup: THREE.Group | null = null
let sceneRef: THREE.Scene | null = null
let navigateTo: ((path: string) => void) | null = null
let removeCallback: (() => void) | null = null

/* ═══════════════════════════════════════════════════
   Scroll rotation state
   ═══════════════════════════════════════════════════ */
let currentAngle = 0
let velocity = 0
let lastWheelTime = 0
const DAMPING = 0.92
const SENSITIVITY = 0.00025

/* ═══════════════════════════════════════════════════
   Reusable temps (avoid per-frame allocation)
   ═══════════════════════════════════════════════════ */
const _camWorldPos = new THREE.Vector3()
const _camLocal = new THREE.Vector3()
const _cardLocal = new THREE.Vector3()
const _rayDir = new THREE.Vector3()
const _invMatrix = new THREE.Matrix4()
const CUBE_MIN = new THREE.Vector3()
const CUBE_MAX = new THREE.Vector3()

/* ═══════════════════════════════════════════════════
   Ray-AABB intersection (slab method)
   Returns t at which ray enters the box, or null if no intersection
   ═══════════════════════════════════════════════════ */
function rayAABBIntersect(
  origin: THREE.Vector3, dir: THREE.Vector3,
  boxMin: THREE.Vector3, boxMax: THREE.Vector3,
): number | null {
  let tmin = -Infinity, tmax = Infinity

  for (let i = 0; i < 3; i++) {
    const d = dir.getComponent(i)
    const o = origin.getComponent(i)
    if (Math.abs(d) < 1e-10) {
      if (o < boxMin.getComponent(i) || o > boxMax.getComponent(i)) return null
    } else {
      let t1 = (boxMin.getComponent(i) - o) / d
      let t2 = (boxMax.getComponent(i) - o) / d
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp }
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
      if (tmin > tmax) return null
    }
  }
  return tmin
}

/* ═══════════════════════════════════════════════════
   Check if a card is occluded by the cube
   Returns true if the cube blocks line-of-sight to the card
   ═══════════════════════════════════════════════════ */
function isCardOccluded(cardLocalPos: THREE.Vector3): boolean {
  // Direction from camera (in diagonalGroup local space) to card
  _rayDir.copy(cardLocalPos).sub(_camLocal)

  const distToCard = _rayDir.length()
  if (distToCard < 0.01) return false

  _rayDir.divideScalar(distToCard) // normalize

  const tEntry = rayAABBIntersect(_camLocal, _rayDir, CUBE_MIN, CUBE_MAX)
  if (tEntry === null) return false

  // Card is occluded if the ray enters the cube before reaching the card
  // AND the entry point is in front of the camera (tEntry > 0)
  return tEntry > 0 && tEntry < distToCard - 0.2
}

/* ═══════════════════════════════════════════════════
   Create card DOM element
   ═══════════════════════════════════════════════════ */
function createCardElement(card: CardDef): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText =
    'width:70px; padding:5px 7px; cursor:pointer; text-align:center; pointer-events:auto;' +
    'background:rgba(20,20,20,0.35); border-top:1px solid rgba(255,255,255,0.12);' +
    'border-left:1px solid rgba(255,255,255,0.10); border-right:1px solid rgba(255,255,255,0.04);' +
    'border-bottom:1px solid rgba(255,255,255,0.03); border-radius:9px;' +
    'box-shadow:0 4px 14px rgba(0,0,0,0.45); transform:translateZ(0);' +
    'will-change:opacity; transition:opacity 0.15s ease;'
  el.innerHTML = [
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">',
    `<span style="font-size:11px;color:${card.color};line-height:1;">${card.icon}</span>`,
    '<span class="ca-arrow" style="font-size:8px;color:#30363d;">↗</span>',
    '</div>',
    `<div style="font-size:8px;font-weight:700;color:#e6edf3;letter-spacing:0.02em;">${card.label}</div>`,
    `<div style="font-size:7px;color:#484f58;margin-top:1px;letter-spacing:0.04em;">~/${card.id}</div>`,
  ].join('')

  el.addEventListener('mouseenter', () => {
    const a = el.querySelector('.ca-arrow') as HTMLElement | null
    if (a) { a.style.color = '#02AD8B'; a.style.transform = 'translate(2px, -2px)' }
  })
  el.addEventListener('mouseleave', () => {
    const a = el.querySelector('.ca-arrow') as HTMLElement | null
    if (a) { a.style.color = ''; a.style.transform = '' }
  })
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    navigateTo?.(card.path)
  })

  return el
}

/* ═══════════════════════════════════════════════════
   Position cards at cube middle-ring vertices
   ═══════════════════════════════════════════════════ */
function positionCards(HALF: number) {
  const radius = Math.sqrt(8 / 3) * HALF
  const upperY = HALF / Math.sqrt(3)
  const lowerY = -HALF / Math.sqrt(3)

  cards.forEach((card, i) => {
    const y = i % 2 === 0 ? upperY : lowerY
    card.sprite.position.set(
      Math.cos(card.angle) * radius,
      y,
      Math.sin(card.angle) * radius,
    )
  })
}

/* ═══════════════════════════════════════════════════
   Scroll → rotation
   ═══════════════════════════════════════════════════ */
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const now = performance.now()
  const dt = Math.min(now - lastWheelTime, 100) / 1000
  lastWheelTime = now

  velocity = (e.deltaY * SENSITIVITY) / Math.max(dt, 0.016)
  currentAngle += velocity
}

/* ═══════════════════════════════════════════════════
   Per-frame update — runs after WebGL render (matrices already updated)
   ═══════════════════════════════════════════════════ */
function update() {
  if (!diagonalGroup || !cssRenderer || !sceneRef || !liveCamera) return

  velocity *= DAMPING
  currentAngle += velocity

  // Compose: Y-rotation on top of body-diagonal-to-Y quaternion
  const baseQuat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(1, 1, 1).normalize(),
    new THREE.Vector3(0, 1, 0),
  )
  const yRotQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0), currentAngle,
  )
  diagonalGroup.quaternion.copy(yRotQuat).multiply(baseQuat)

  // WebGL renderer has already updated scene matrices (afterRender callback)

  // ── Occlusion: transform camera to diagonalGroup local space, test each card ──
  liveCamera!.getWorldPosition(_camWorldPos)
  _invMatrix.copy(diagonalGroup.matrixWorld).invert()
  _camLocal.copy(_camWorldPos).applyMatrix4(_invMatrix)

  for (const card of cards) {
    // Card position in diagonalGroup local space (sprite.position is already local)
    _cardLocal.copy(card.sprite.position)

    if (isCardOccluded(_cardLocal)) {
      card.element.style.opacity = '0'
      card.element.style.pointerEvents = 'none'
    } else {
      card.element.style.opacity = '1'
      card.element.style.pointerEvents = 'auto'
    }
  }

  cssRenderer.render(sceneRef, liveCamera!)
}

/* ═══════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════ */

export interface CarouselConfig {
  container: HTMLElement
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  diagonalGroup: THREE.Group
  half: number
  navigate: (path: string) => void
  addAfterRender: (cb: () => void) => void
  removeAfterRender: (cb: () => void) => void
}

export function setupCardCarousel(cfg: CarouselConfig) {
  sceneRef = cfg.scene
  diagonalGroup = cfg.diagonalGroup
  navigateTo = cfg.navigate
  liveCamera = cfg.camera
  // Cache cube AABB in diagonalGroup local space
  CUBE_MIN.set(-cfg.half, -cfg.half, -cfg.half)
  CUBE_MAX.set(cfg.half, cfg.half, cfg.half)

  cssRenderer = new CSS3DRenderer()
  cssRenderer.setSize(window.innerWidth, window.innerHeight)
  cssRenderer.domElement.style.cssText =
    'position:fixed;top:0;left:0;z-index:6;pointer-events:none;'
  cfg.container.appendChild(cssRenderer.domElement)

  cards = NAV_CARDS.map((def, i) => {
    const el = createCardElement(def)
    const sprite = new CSS3DSprite(el)
    sprite.scale.set(0.04, 0.04, 0.04)
    cfg.diagonalGroup.add(sprite)
    return { sprite, angle: CARD_ANGLES[i], element: el, def }
  })

  positionCards(cfg.half)

  cfg.addAfterRender(update)
  removeCallback = () => cfg.removeAfterRender(update)

  // Initial render
  update()
  window.addEventListener('wheel', onWheel, { passive: false })
}

export function teardownCardCarousel() {
  window.removeEventListener('wheel', onWheel)
  removeCallback?.()
  removeCallback = null

  if (diagonalGroup && cards.length) {
    cards.forEach(c => {
      diagonalGroup!.remove(c.sprite)
      c.element.remove()
    })
  }
  cards = []

  cssRenderer?.domElement.remove()
  cssRenderer = null
  liveCamera = null
  sceneRef = null
  diagonalGroup = null
  navigateTo = null

  currentAngle = 0; velocity = 0
}

export function resizeCardCarousel() {
  if (!cssRenderer) return
  cssRenderer.setSize(window.innerWidth, window.innerHeight)
}
