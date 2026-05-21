<template>
  <div class="kitchen-view animate-fade-in">

    <!-- 管理后台头部 -->
    <div class="admin-header">
      <div class="ah-left">
        <div class="ah-badge">Admin</div>
        <div>
          <div class="ah-title">家庭厨房 · 管理后台</div>
          <div class="ah-meta">
            {{ allDishes.length }} 道菜 · {{ availableCount }} 供应中 · {{ activeSessions }} 个进行中工单
            <span v-if="customRequestCount > 0" class="ah-meta-highlight"> · {{ customRequestCount }} 条自定义请求</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 主 Tab 导航 -->
    <div class="tab-nav">
      <button class="tab-btn" :class="{ active: activeTab === 'dishes' }" @click="activeTab = 'dishes'">
        <span class="tab-icon">🍽</span> 菜品管理
        <span class="tab-count">{{ allDishes.length }}</span>
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'sessions' }" @click="switchToSessions">
        <span class="tab-icon">📋</span> 工单管理
        <span class="tab-count" :class="{ 'tab-count--active': activeSessions > 0 }">{{ activeSessions }}</span>
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'requests' }" @click="switchToRequests">
        <span class="tab-icon">✏</span> 自定义请求
        <span v-if="customRequestCount > 0" class="tab-count tab-count--purple">{{ customRequestCount }}</span>
      </button>
    </div>

    <!-- ── Tab: 菜品管理 ──────────────────────────────────────────────── -->
    <div v-if="activeTab === 'dishes'" class="tab-content">

      <!-- 子操作栏 -->
      <div class="sub-toolbar">
        <div class="sub-toolbar-left">
          <button
            class="sub-btn"
            :class="{ 'sub-btn--active': dishSubTab === 'list' }"
            @click="dishSubTab = 'list'"
          >菜品列表</button>
          <button
            class="sub-btn"
            :class="{ 'sub-btn--active': dishSubTab === 'form' }"
            @click="openAddForm"
          >+ 新增菜品</button>
        </div>
      </div>

      <!-- 菜品列表 -->
      <div v-if="dishSubTab === 'list'">
        <div v-if="loading" class="skeleton-list">
          <div v-for="i in 5" :key="i" class="skeleton-row" />
        </div>
        <div v-else-if="allDishes.length === 0" class="empty-state">
          <span>🥢</span>
          <p>暂无菜品，点击「新增菜品」开始添加</p>
        </div>
        <div v-else class="dish-table">
          <div v-for="dish in allDishes" :key="dish.id" class="dish-row">
            <div class="dr-img-wrap">
              <img
                v-if="dish.imageUrl && !failedImages.has(dish.id)"
                :src="dish.imageUrl"
                :alt="dish.name"
                class="dr-img"
                @error="failedImages.add(dish.id)"
              />
              <span v-else class="dr-emoji">{{ CATEGORY_ICONS[dish.category] }}</span>
            </div>
            <div class="dr-info">
              <div class="dr-name">{{ dish.name }}</div>
              <div class="dr-meta">{{ dish.category }}<span v-if="dish.description"> · {{ dish.description }}</span></div>
            </div>
            <div class="dr-actions">
              <button
                class="dr-btn"
                :class="dish.available ? 'btn-avail' : 'btn-sold'"
                @click="toggleAvail(dish.id)"
              >{{ dish.available ? '供应中' : '已估清' }}</button>
              <button class="dr-btn btn-edit" @click="openEditForm(dish)">编辑</button>
              <button class="dr-btn btn-del" @click="deleteDish(dish.id)">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 新增 / 编辑表单 -->
      <div v-if="dishSubTab === 'form'" class="dish-form-wrap">
        <div class="form-title">{{ editingId ? '编辑菜品' : '新增菜品' }}</div>
        <form class="dish-form" @submit.prevent="handleDishSubmit">
          <!-- 图片上传 -->
          <div
            class="upload-zone"
            :class="{ 'upload-zone--dragging': isDragging, 'upload-zone--has-img': previewUrl }"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="onDrop"
            @click="fileInputRef?.click()"
          >
            <img v-if="previewUrl" :src="previewUrl" class="upload-preview" />
            <div v-else class="upload-hint">
              <span class="upload-icon">⊕</span>
              <span>{{ uploading ? '上传中…' : '点击或拖拽图片' }}</span>
              <span class="upload-sub">JPG / PNG / WebP，≤ 10MB</span>
            </div>
          </div>
          <input ref="fileInputRef" type="file" accept="image/*" class="file-input-hidden" @change="onFileChange" />
          <div v-if="uploadError" class="upload-error">⚠ {{ uploadError }}</div>

          <div class="form-field">
            <label class="form-label">菜品名称 *</label>
            <input v-model="form.name" class="form-input" placeholder="如：红烧肉" required />
          </div>
          <div class="form-field">
            <label class="form-label">分类 *</label>
            <select v-model="form.category" class="form-input form-select" required>
              <option v-for="cat in DISH_CATEGORIES" :key="cat" :value="cat">{{ CATEGORY_ICONS[cat] }} {{ cat }}</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">描述</label>
            <textarea v-model="form.description" class="form-input form-textarea" placeholder="菜品简介…" rows="2" />
          </div>
          <div class="form-field form-row">
            <div class="form-half">
              <label class="form-label">价格（可选）</label>
              <input v-model.number="form.price" type="number" min="0" step="0.5" class="form-input" placeholder="0" />
            </div>
            <div class="form-half">
              <label class="form-label">状态</label>
              <button type="button" class="toggle-btn" :class="{ active: form.available }" @click="form.available = !form.available">
                {{ form.available ? '✓ 供应中' : '× 已估清' }}
              </button>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="dishSubTab = 'list'">取消</button>
            <button type="submit" class="btn-save" :disabled="uploading || saving">
              {{ saving ? '保存中…' : (editingId ? '更新菜品' : '添加菜品') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Tab: 工单管理 ──────────────────────────────────────────────── -->
    <div v-if="activeTab === 'sessions'" class="tab-content">

      <!-- 新建工单 -->
      <div class="session-create-box">
        <div class="sc-label">新建点单工单（创建后分享链接给家人点菜）</div>
        <div class="sc-row">
          <input
            v-model="newSessionName"
            class="form-input sc-input"
            placeholder="工单名称，如：周末大餐"
            @keydown.enter.prevent="doCreateSession"
          />
          <button class="btn-create-session" :disabled="creatingSession || !newSessionName.trim()" @click="doCreateSession">
            {{ creatingSession ? '创建中…' : '+ 创建' }}
          </button>
        </div>
        <div v-if="createdLink" class="sc-link-box">
          <div class="sc-link-label">分享链接（发给家人，通过链接点菜）</div>
          <div class="sc-link-wrap">
            <span class="sc-link-text">{{ createdLink }}</span>
            <button class="btn-copy" @click="copyLink(createdLink)">{{ copiedLink === createdLink ? '✓ 已复制' : '复制' }}</button>
          </div>
        </div>
      </div>

      <!-- 工单列表 -->
      <div class="section-header">历史工单</div>
      <div v-if="sessionsLoading" class="skeleton-list">
        <div v-for="i in 3" :key="i" class="skeleton-row" />
      </div>
      <div v-else-if="sortedSessions.length === 0" class="empty-state">
        <span>📋</span>
        <p>暂无工单记录</p>
      </div>
      <div v-else class="session-list">
        <div v-for="sess in sortedSessions" :key="sess.id" class="session-row">
          <div class="sr-top">
            <div class="sr-info">
              <span class="sr-name">{{ sess.name }}</span>
              <span class="sr-badge" :class="sess.status === 'active' ? 'badge-active' : 'badge-closed'">
                {{ sess.status === 'active' ? '进行中' : '已结束' }}
              </span>
            </div>
            <div class="sr-time">{{ formatTime(sess.createdAt) }}</div>
          </div>
          <div class="sr-meta">
            共 {{ sess.items.length }} 道菜 · {{ totalQty(sess.items) }} 份
            <span v-if="countCustomItems(sess.items) > 0" class="sr-custom-hint">· {{ countCustomItems(sess.items) }} 条自定义</span>
          </div>
          <div class="sr-actions">
            <button v-if="sess.status === 'active'" class="dr-btn btn-copy-link" @click="copyLink(makeLink(sess.id))">
              {{ copiedLink === makeLink(sess.id) ? '✓ 已复制' : '复制链接' }}
            </button>
            <button class="dr-btn btn-view-items" @click="toggleExpand(sess.id)">
              {{ expandedId === sess.id ? '收起' : '查看点单' }}
            </button>
            <button v-if="sess.status === 'active'" class="dr-btn btn-close-session" @click="doCloseSession(sess.id)">结束工单</button>
            <button class="dr-btn btn-del" @click="doDeleteSession(sess.id)">删除</button>
          </div>
          <!-- 展开点单详情 -->
          <div v-if="expandedId === sess.id" class="sr-items">
            <div v-if="sess.items.length === 0" class="sr-items-empty">暂无点菜记录</div>
            <div v-for="item in sess.items" :key="item.dish.id" class="sr-item">
              <span class="sri-icon">{{ item.dish.isCustom ? '✏️' : CATEGORY_ICONS[item.dish.category] }}</span>
              <span class="sri-name" :class="{ 'sri-name--custom': item.dish.isCustom }">{{ item.dish.name }}</span>
              <span v-if="item.dish.isCustom" class="sri-custom-tag">自定义</span>
              <span v-else class="sri-cat">{{ item.dish.category }}</span>
              <span class="sri-qty">× {{ item.quantity }}</span>
              <span v-if="(item.submittedQty ?? 0) > 0" class="sri-submitted">已下单 {{ item.submittedQty }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab: 自定义请求 ─────────────────────────────────────────────── -->
    <div v-if="activeTab === 'requests'" class="tab-content">
      <div class="requests-intro">
        家人在点单时写的"菜单外"菜品，可一键添加到主菜单。
      </div>
      <div v-if="requestsLoading" class="skeleton-list">
        <div v-for="i in 3" :key="i" class="skeleton-row" />
      </div>
      <div v-else-if="customRequests.length === 0" class="empty-state">
        <span>✏</span>
        <p>暂无自定义请求</p>
      </div>
      <div v-else class="requests-list">
        <div v-for="req in customRequests" :key="req.id" class="req-row">
          <div class="req-main">
            <span class="req-icon">✏️</span>
            <div class="req-info">
              <div class="req-name">{{ req.name }}</div>
              <div class="req-meta">来自工单「{{ req.sessionName }}」· × {{ req.quantity }}</div>
            </div>
          </div>
          <div class="req-actions">
            <button
              v-if="!isAlreadyInMenu(req.name)"
              class="dr-btn btn-add-to-menu"
              @click="openPromoteForm(req)"
            >添加到菜单</button>
            <span v-else class="req-already-added">✓ 已在菜单</span>
          </div>
        </div>
      </div>

      <!-- 添加到菜单的快捷表单 -->
      <div v-if="promoteTarget" class="promote-form-wrap">
        <div class="promote-form-title">将「{{ promoteTarget.name }}」添加到主菜单</div>
        <form class="dish-form" @submit.prevent="handlePromoteSubmit">
          <div class="form-field">
            <label class="form-label">菜品名称 *</label>
            <input v-model="promoteForm.name" class="form-input" required />
          </div>
          <div class="form-field">
            <label class="form-label">分类 *</label>
            <select v-model="promoteForm.category" class="form-input form-select" required>
              <option v-for="cat in DISH_CATEGORIES" :key="cat" :value="cat">{{ CATEGORY_ICONS[cat] }} {{ cat }}</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">描述</label>
            <textarea v-model="promoteForm.description" class="form-input form-textarea" rows="2" placeholder="菜品简介…" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="promoteTarget = null">取消</button>
            <button type="submit" class="btn-save" :disabled="promoteSaving">
              {{ promoteSaving ? '添加中…' : '确认添加到菜单' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Toast 通知 -->
    <KitchenToast ref="toastRef" />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import type { Dish, DishCategory, OrderSession, CartItem } from '@/types/kitchen'
import { DISH_CATEGORIES, CATEGORY_ICONS } from '@/types/kitchen'
import * as kitchenSvc from '@/services/kitchenService'
import { uploadImage, fileToDataUrl } from '@/services/storageUpload'
import KitchenToast from '@/components/kitchen/KitchenToast.vue'

// ── Toast ──────────────────────────────────────────────────────────────────────
const toastRef = ref<InstanceType<typeof KitchenToast> | null>(null)
function toast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
  toastRef.value?.show(msg, type)
}

// ── 主 Tab ─────────────────────────────────────────────────────────────────────
type MainTab = 'dishes' | 'sessions' | 'requests'
const activeTab = ref<MainTab>('dishes')

// ══════════════════════════════════════════════════════════════════════════════
// 菜品管理
// ══════════════════════════════════════════════════════════════════════════════
const allDishes    = ref<Dish[]>([])
const loading      = ref(true)
const failedImages = reactive(new Set<string>())
const dishSubTab   = ref<'list' | 'form'>('list')
const editingId    = ref<string | null>(null)
const saving       = ref(false)
const uploading    = ref(false)
const uploadError  = ref('')
const isDragging   = ref(false)
const previewUrl   = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

interface DishForm {
  name: string; category: DishCategory; description: string
  imageUrl: string; available: boolean; price: number
}
const defaultForm = (): DishForm => ({
  name: '', category: '荤菜', description: '', imageUrl: '', available: true, price: 0,
})
const form = ref<DishForm>(defaultForm())

const availableCount = computed(() => allDishes.value.filter(d => d.available).length)

async function loadDishes() {
  loading.value = true
  try { allDishes.value = await kitchenSvc.getAll() }
  finally { loading.value = false }
}

function openAddForm() {
  form.value = defaultForm()
  previewUrl.value = ''
  uploadError.value = ''
  editingId.value = null
  dishSubTab.value = 'form'
}

function openEditForm(dish: Dish) {
  form.value = {
    name: dish.name, category: dish.category,
    description: dish.description, imageUrl: dish.imageUrl,
    available: dish.available, price: dish.price,
  }
  previewUrl.value = dish.imageUrl
  uploadError.value = ''
  editingId.value = dish.id
  dishSubTab.value = 'form'
}

async function handleFile(file: File) {
  if (!file.type.startsWith('image/')) return
  uploading.value = true; uploadError.value = ''
  try {
    previewUrl.value = await fileToDataUrl(file)
    const result = await uploadImage(file)
    form.value.imageUrl = result.url
  } catch (e: unknown) {
    uploadError.value = e instanceof Error ? e.message : '上传失败'
  } finally {
    uploading.value = false
  }
}
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}
function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) handleFile(file)
}

async function handleDishSubmit() {
  saving.value = true
  try {
    if (editingId.value) {
      await kitchenSvc.update(editingId.value, form.value)
      toast('菜品已更新')
    } else {
      await kitchenSvc.create(form.value)
      toast('菜品已添加')
    }
    await loadDishes()
    dishSubTab.value = 'list'
    editingId.value = null
  } catch (e) {
    toast('保存失败，请重试', 'error')
    console.error(e)
  } finally {
    saving.value = false
  }
}

async function toggleAvail(id: string) {
  await kitchenSvc.toggleAvailable(id)
  await loadDishes()
}

async function deleteDish(id: string) {
  if (!confirm('确认删除这道菜？')) return
  await kitchenSvc.remove(id)
  await loadDishes()
  toast('已删除')
}

// ══════════════════════════════════════════════════════════════════════════════
// 工单管理
// ══════════════════════════════════════════════════════════════════════════════
const sessions        = ref<OrderSession[]>([])
const sessionsLoading = ref(false)
const newSessionName  = ref('')
const creatingSession = ref(false)
const createdLink     = ref('')
const copiedLink      = ref('')
const expandedId      = ref<string | null>(null)

const sortedSessions = computed(() =>
  [...sessions.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
)
const activeSessions = computed(() => sessions.value.filter(s => s.status === 'active').length)

async function loadSessions() {
  sessionsLoading.value = true
  try { sessions.value = await kitchenSvc.getSessions() }
  finally { sessionsLoading.value = false }
}

function makeLink(sessionId: string) {
  return `${window.location.origin}/menu?sid=${sessionId}`
}

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = url; ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); document.body.removeChild(ta)
  }
  copiedLink.value = url
  toast('链接已复制')
  setTimeout(() => { if (copiedLink.value === url) copiedLink.value = '' }, 2500)
}

async function doCreateSession() {
  if (!newSessionName.value.trim() || creatingSession.value) return
  creatingSession.value = true; createdLink.value = ''
  try {
    const sess = await kitchenSvc.createSession(newSessionName.value)
    createdLink.value = makeLink(sess.id)
    newSessionName.value = ''
    await loadSessions()
    toast('工单已创建，请复制链接分享给家人')
  } catch (e) {
    toast('创建工单失败', 'error'); console.error(e)
  } finally {
    creatingSession.value = false
  }
}

async function doCloseSession(id: string) {
  if (!confirm('确认结束该工单？结束后家人将无法继续点菜。')) return
  try {
    const res = await fetch(`https://stoplesslab.com/api/kitchen/session/${id}/close`, { method: 'PUT' })
    if (!res.ok) throw new Error(`关闭失败: ${res.status}`)
    await loadSessions()
    toast('工单已结束')
    if (expandedId.value === id) expandedId.value = null
  } catch (e) {
    toast('操作失败', 'error'); console.error(e)
  }
}

async function doDeleteSession(id: string) {
  if (!confirm('确认删除该工单？此操作不可恢复。')) return
  try {
    await kitchenSvc.deleteSession(id)
    await loadSessions()
    toast('工单已删除')
    if (expandedId.value === id) expandedId.value = null
    if (createdLink.value.includes(id)) createdLink.value = ''
  } catch (e) {
    toast('删除失败', 'error'); console.error(e)
  }
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function totalQty(items: CartItem[]) {
  return items.reduce((s, i) => s + i.quantity, 0)
}

function countCustomItems(items: CartItem[]) {
  return items.filter(i => i.dish.isCustom).length
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function switchToSessions() {
  activeTab.value = 'sessions'
  if (sessions.value.length === 0) await loadSessions()
}

// ══════════════════════════════════════════════════════════════════════════════
// 自定义请求
// ══════════════════════════════════════════════════════════════════════════════
interface CustomRequest {
  id: string        // dish.id (custom_xxx)
  name: string
  quantity: number
  sessionId: string
  sessionName: string
}

const customRequests   = ref<CustomRequest[]>([])
const requestsLoading  = ref(false)
const promoteTarget    = ref<CustomRequest | null>(null)
const promoteSaving    = ref(false)

interface PromoteForm {
  name: string; category: DishCategory; description: string
}
const promoteForm = ref<PromoteForm>({ name: '', category: '荤菜', description: '' })

const customRequestCount = computed(() => customRequests.value.length)

async function loadCustomRequests() {
  requestsLoading.value = true
  try {
    const allSess = await kitchenSvc.getSessions()
    // 把所有 session 中的自定义菜品汇总，去重（以 dish.name 为 key，累加数量）
    const map = new Map<string, CustomRequest>()
    for (const sess of allSess) {
      for (const item of sess.items) {
        if (!item.dish.isCustom) continue
        const key = item.dish.name.trim().toLowerCase()
        if (map.has(key)) {
          map.get(key)!.quantity += item.quantity
        } else {
          map.set(key, {
            id: item.dish.id,
            name: item.dish.name,
            quantity: item.quantity,
            sessionId: sess.id,
            sessionName: sess.name,
          })
        }
      }
    }
    customRequests.value = [...map.values()]
    // 同步 sessions（供 activeSessions 计算）
    sessions.value = allSess
  } finally {
    requestsLoading.value = false
  }
}

function isAlreadyInMenu(name: string) {
  return allDishes.value.some(d => d.name.trim().toLowerCase() === name.trim().toLowerCase() && !d.isCustom)
}

function openPromoteForm(req: CustomRequest) {
  promoteTarget.value = req
  promoteForm.value = { name: req.name, category: '荤菜', description: '' }
}

async function handlePromoteSubmit() {
  if (!promoteTarget.value) return
  promoteSaving.value = true
  try {
    await kitchenSvc.create({
      name: promoteForm.value.name,
      category: promoteForm.value.category,
      description: promoteForm.value.description,
      imageUrl: '',
      available: true,
      price: 0,
    })
    await loadDishes()
    toast(`「${promoteForm.value.name}」已添加到主菜单`)
    promoteTarget.value = null
  } catch (e) {
    toast('添加失败', 'error'); console.error(e)
  } finally {
    promoteSaving.value = false
  }
}

async function switchToRequests() {
  activeTab.value = 'requests'
  await loadCustomRequests()
}

// ══════════════════════════════════════════════════════════════════════════════
// 初始化
// ══════════════════════════════════════════════════════════════════════════════
onMounted(async () => {
  await Promise.all([loadDishes(), loadSessions()])
})

// 切换到 sessions tab 时刷新列表
watch(activeTab, (tab) => {
  if (tab === 'sessions' && sessions.value.length === 0) loadSessions()
})
</script>

<style scoped>
.kitchen-view { display: flex; flex-direction: column; gap: 16px; }

/* ── 管理后台头部 ─────────────────────────────────────────────────────────── */
.admin-header {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
  padding: 14px 16px;
  background: var(--glass-bg); border: 1px solid #21262d; border-radius: 8px;
  border-top: 2px solid rgba(227,179,65,.5);
}
.ah-left { display: flex; align-items: center; gap: 12px; }
.ah-badge {
  font-size: 10px; padding: 2px 8px; border-radius: 4px;
  background: rgba(227,179,65,.1); border: 1px solid rgba(227,179,65,.3);
  color: #e3b341; letter-spacing: .06em;
  font-family: 'JetBrains Mono', monospace; white-space: nowrap;
}
.ah-title { font-size: 17px; font-weight: 800; color: #e6edf3; }
.ah-meta { font-size: 11px; color: #484f58; margin-top: 2px; }
.ah-meta-highlight { color: #a78bfa; }

/* ── Tab 导航 ────────────────────────────────────────────────────────────── */
.tab-nav { display: flex; gap: 4px; }
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 7px; cursor: pointer;
  background: var(--glass-bg); border: 1px solid #21262d;
  color: #7d8590; font-size: 13px; font-family: 'JetBrains Mono', monospace;
  transition: all .2s;
}
.tab-btn:hover { color: #c9d1d9; border-color: #30363d; }
.tab-btn.active { color: #e3b341; background: rgba(227,179,65,.07); border-color: rgba(227,179,65,.3); }
.tab-icon { font-size: 14px; }
.tab-count {
  font-size: 10px; padding: 1px 6px; border-radius: 8px;
  background: rgba(125,133,144,.1); border: 1px solid #30363d; color: #484f58;
  font-family: 'JetBrains Mono', monospace;
}
.tab-count--active { background: rgba(57,211,83,.1); border-color: rgba(57,211,83,.3); color: #39d353; }
.tab-count--purple { background: rgba(139,92,246,.1); border-color: rgba(139,92,246,.3); color: #a78bfa; }

/* ── Tab 内容区 ──────────────────────────────────────────────────────────── */
.tab-content { display: flex; flex-direction: column; gap: 12px; }

/* ── 子操作栏 ────────────────────────────────────────────────────────────── */
.sub-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.sub-toolbar-left { display: flex; gap: 6px; }
.sub-btn {
  padding: 5px 14px; border-radius: 5px; cursor: pointer; font-size: 12px;
  font-family: 'JetBrains Mono', monospace; background: transparent;
  border: 1px solid #21262d; color: #7d8590; transition: all .15s;
}
.sub-btn:hover { color: #c9d1d9; border-color: #30363d; }
.sub-btn--active { color: #f97316; background: rgba(249,115,22,.08); border-color: rgba(249,115,22,.3); }

/* ── 骨架屏 ──────────────────────────────────────────────────────────────── */
.skeleton-list { display: flex; flex-direction: column; gap: 8px; }
.skeleton-row {
  height: 54px; border-radius: 7px;
  background: var(--glass-bg); border: 1px solid #21262d;
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer { 0%,100% { opacity:1; } 50% { opacity:.4; } }

/* ── 空状态 ──────────────────────────────────────────────────────────────── */
.empty-state {
  text-align: center; padding: 3rem 2rem; color: #484f58; font-size: 13px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.empty-state span { font-size: 36px; opacity: .5; }

/* ── 菜品表格 ────────────────────────────────────────────────────────────── */
.dish-table { display: flex; flex-direction: column; gap: 6px; }
.dish-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; border-radius: 7px;
  border: 1px solid #21262d; background: var(--glass-bg); 
}
.dr-img-wrap {
  width: 40px; height: 40px; border-radius: 6px; overflow: hidden;
  background: var(--glass-bg); flex-shrink: 0; display: flex; align-items: center; justify-content: center;
}
.dr-img { width: 100%; height: 100%; object-fit: cover; }
.dr-emoji { font-size: 20px; }
.dr-info { flex: 1; min-width: 0; }
.dr-name { font-size: 13px; font-weight: 600; color: #c9d1d9; }
.dr-meta { font-size: 10px; color: #484f58; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dr-actions { display: flex; gap: 5px; flex-shrink: 0; }
.dr-btn {
  font-size: 10px; padding: 3px 9px; border-radius: 4px; cursor: pointer;
  font-family: 'JetBrains Mono', monospace; border-width: 1px; border-style: solid; transition: all .15s;
}
.btn-avail  { background: rgba(57,211,83,.08);  border-color: rgba(57,211,83,.25);  color: #39d353; }
.btn-sold   { background: rgba(248,81,73,.08);  border-color: rgba(248,81,73,.25);  color: #f85149; }
.btn-edit   { background: rgba(88,166,255,.08); border-color: rgba(88,166,255,.25); color: #58a6ff; }
.btn-del    { background: rgba(248,81,73,.05);  border-color: rgba(248,81,73,.2);   color: #f85149; }
.btn-del:hover { background: rgba(248,81,73,.15); }
.btn-copy-link  { background: rgba(88,166,255,.08); border-color: rgba(88,166,255,.25); color: #58a6ff; }
.btn-view-items { background: rgba(249,115,22,.08); border-color: rgba(249,115,22,.25); color: #f97316; }
.btn-close-session { background: rgba(248,81,73,.06); border-color: rgba(248,81,73,.2); color: #f85149; }
.btn-close-session:hover { background: rgba(248,81,73,.15); }
.btn-add-to-menu { background: rgba(139,92,246,.08); border-color: rgba(139,92,246,.3); color: #a78bfa; }
.btn-add-to-menu:hover { background: rgba(139,92,246,.18); }

/* ── 菜品表单 ────────────────────────────────────────────────────────────── */
.dish-form-wrap {
  background: var(--glass-bg); border: 1px solid #21262d; border-radius: 8px; padding: 16px;
}
.form-title { font-size: 13px; font-weight: 700; color: #c9d1d9; margin-bottom: 14px; }
.dish-form { display: flex; flex-direction: column; gap: 12px; }
.upload-zone {
  width: 100%; aspect-ratio: 16/9; border-radius: 8px; border: 2px dashed #30363d;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s; overflow: hidden; background: var(--glass-bg); 
}
.upload-zone:hover, .upload-zone--dragging { border-color: rgba(249,115,22,.5); background: rgba(249,115,22,.03); }
.upload-zone--has-img { border-style: solid; border-color: rgba(249,115,22,.3); }
.upload-preview { width: 100%; height: 100%; object-fit: cover; }
.upload-hint { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.upload-icon { font-size: 24px; color: #484f58; }
.upload-hint span { font-size: 12px; color: #7d8590; }
.upload-sub { font-size: 10px !important; color: #484f58 !important; }
.file-input-hidden { display: none; }
.upload-error {
  font-size: 11px; color: #f85149;
  background: rgba(248,81,73,.06); border: 1px solid rgba(248,81,73,.2);
  border-radius: 5px; padding: 6px 10px;
}
.form-field { display: flex; flex-direction: column; gap: 5px; }
.form-label { font-size: 11px; color: #7d8590; font-family: 'JetBrains Mono', monospace; }
.form-input {
  background: var(--glass-bg); border: 1px solid #30363d; border-radius: 6px;
  color: #c9d1d9; font-size: 12px; font-family: 'JetBrains Mono', monospace;
  padding: 7px 10px; outline: none; transition: border-color .15s;
  width: 100%; box-sizing: border-box;
}
.form-input:focus { border-color: rgba(249,115,22,.45); }
.form-select option { background: var(--glass-bg); }
.form-textarea { resize: vertical; min-height: 56px; }
.form-row { flex-direction: row; gap: 10px; }
.form-half { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.toggle-btn {
  padding: 7px 14px; border-radius: 6px; cursor: pointer; font-size: 12px;
  font-family: 'JetBrains Mono', monospace; transition: all .2s;
  background: rgba(248,81,73,.08); border: 1px solid rgba(248,81,73,.25); color: #f85149;
}
.toggle-btn.active { background: rgba(57,211,83,.08); border-color: rgba(57,211,83,.25); color: #39d353; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-cancel {
  padding: 7px 16px; border-radius: 6px; cursor: pointer; font-size: 12px;
  font-family: 'JetBrains Mono', monospace; background: transparent;
  border: 1px solid #30363d; color: #7d8590; transition: all .15s;
}
.btn-cancel:hover { color: #c9d1d9; border-color: #484f58; }
.btn-save {
  padding: 7px 20px; border-radius: 6px; cursor: pointer; font-size: 12px;
  font-family: 'JetBrains Mono', monospace; font-weight: 700;
  background: rgba(249,115,22,.15); border: 1px solid rgba(249,115,22,.4); color: #f97316;
  transition: all .2s;
}
.btn-save:hover:not(:disabled) { background: rgba(249,115,22,.25); }
.btn-save:disabled { opacity: .5; cursor: not-allowed; }

/* ── 工单管理 ────────────────────────────────────────────────────────────── */
.session-create-box {
  background: var(--glass-bg); border: 1px solid #21262d; border-radius: 8px;
  padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;
}
.sc-label { font-size: 11px; color: #7d8590; font-family: 'JetBrains Mono', monospace; }
.sc-row { display: flex; gap: 8px; }
.sc-input { flex: 1; }
.btn-create-session {
  padding: 7px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: nowrap;
  font-family: 'JetBrains Mono', monospace; font-weight: 700; flex-shrink: 0;
  background: rgba(57,211,83,.1); border: 1px solid rgba(57,211,83,.3); color: #39d353; transition: all .2s;
}
.btn-create-session:hover:not(:disabled) { background: rgba(57,211,83,.2); }
.btn-create-session:disabled { opacity: .5; cursor: not-allowed; }
.sc-link-box { display: flex; flex-direction: column; gap: 5px; }
.sc-link-label { font-size: 10px; color: #484f58; font-family: 'JetBrains Mono', monospace; }
.sc-link-wrap {
  display: flex; align-items: center; gap: 8px;
  background: rgba(88,166,255,.05); border: 1px solid rgba(88,166,255,.2);
  border-radius: 6px; padding: 6px 10px;
}
.sc-link-text {
  flex: 1; font-size: 11px; color: #58a6ff;
  font-family: 'JetBrains Mono', monospace; word-break: break-all; min-width: 0;
}
.btn-copy {
  padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; white-space: nowrap;
  font-family: 'JetBrains Mono', monospace; flex-shrink: 0;
  background: rgba(88,166,255,.1); border: 1px solid rgba(88,166,255,.3); color: #58a6ff; transition: all .15s;
}
.btn-copy:hover { background: rgba(88,166,255,.2); }
.section-header { font-size: 11px; color: #484f58; font-family: 'JetBrains Mono', monospace; padding: 4px 0; }
.session-list { display: flex; flex-direction: column; gap: 8px; }
.session-row {
  border: 1px solid #21262d; border-radius: 8px; padding: 12px 14px;
  background: var(--glass-bg); display: flex; flex-direction: column; gap: 6px;
}
.sr-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.sr-info { display: flex; align-items: center; gap: 8px; }
.sr-name { font-size: 13px; font-weight: 600; color: #c9d1d9; }
.sr-badge { font-size: 9px; padding: 1px 6px; border-radius: 3px; font-family: 'JetBrains Mono', monospace; }
.badge-active { background: rgba(57,211,83,.1); border: 1px solid rgba(57,211,83,.3); color: #39d353; }
.badge-closed { background: rgba(125,133,144,.08); border: 1px solid #30363d; color: #484f58; }
.sr-time { font-size: 10px; color: #484f58; font-family: 'JetBrains Mono', monospace; white-space: nowrap; }
.sr-meta { font-size: 11px; color: #7d8590; }
.sr-custom-hint { color: #a78bfa; }
.sr-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.sr-items {
  border-top: 1px solid #21262d; padding-top: 8px; margin-top: 2px;
  display: flex; flex-direction: column; gap: 4px;
}
.sr-items-empty { color: #484f58; font-size: 11px; }
.sr-item {
  display: flex; align-items: center; gap: 7px;
  padding: 4px 8px; background: var(--glass-bg); border-radius: 5px; font-size: 12px;
}
.sri-icon { font-size: 14px; }
.sri-name { flex: 1; color: #c9d1d9; }
.sri-name--custom { color: #a78bfa; }
.sri-custom-tag {
  font-size: 9px; padding: 1px 5px; border-radius: 3px;
  background: rgba(139,92,246,.1); border: 1px solid rgba(139,92,246,.25); color: #a78bfa;
}
.sri-cat  { font-size: 10px; color: #484f58; }
.sri-qty  { font-size: 12px; color: #f97316; font-family: 'JetBrains Mono', monospace; }
.sri-submitted { font-size: 10px; color: #39d353; font-family: 'JetBrains Mono', monospace; }

/* ── 自定义请求 ───────────────────────────────────────────────────────────── */
.requests-intro { font-size: 12px; color: #7d8590; padding: 2px 0; }
.requests-list { display: flex; flex-direction: column; gap: 6px; }
.req-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; border-radius: 7px;
  border: 1px solid rgba(139,92,246,.2); background: var(--glass-bg); 
}
.req-main { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.req-icon { font-size: 20px; flex-shrink: 0; }
.req-info { flex: 1; min-width: 0; }
.req-name { font-size: 13px; font-weight: 600; color: #c9d1d9; }
.req-meta { font-size: 10px; color: #484f58; margin-top: 2px; font-family: 'JetBrains Mono', monospace; }
.req-actions { flex-shrink: 0; }
.req-already-added { font-size: 11px; color: #39d353; font-family: 'JetBrains Mono', monospace; }
.promote-form-wrap {
  background: var(--glass-bg); border: 1px solid rgba(139,92,246,.3);
  border-radius: 8px; padding: 16px; margin-top: 4px;
}
.promote-form-title { font-size: 13px; font-weight: 700; color: #a78bfa; margin-bottom: 14px; }
</style>
