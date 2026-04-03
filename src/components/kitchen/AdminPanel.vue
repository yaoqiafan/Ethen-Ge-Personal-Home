<template>
  <!-- 遮罩 -->
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="modelValue" class="admin-overlay" @click="$emit('update:modelValue', false)" />
    </Transition>

    <!-- 面板 -->
    <Transition name="panel">
      <div v-if="modelValue" class="admin-panel">
        <!-- 头部 -->
        <div class="ap-header">
          <div class="ap-title">
            <span class="ap-icon">⚙</span>
            <span>后台管理</span>
            <span class="ap-badge">Admin</span>
          </div>
          <button class="ap-close" @click="$emit('update:modelValue', false)">✕</button>
        </div>

        <!-- Tab -->
        <div class="ap-tabs">
          <button class="ap-tab" :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">菜品列表</button>
          <button class="ap-tab" :class="{ active: activeTab === 'form'  }" @click="openAdd">新增菜品</button>
        </div>

        <!-- 菜品列表 -->
        <div v-if="activeTab === 'list'" class="ap-body">
          <div v-if="dishes.length === 0" class="ap-empty">暂无菜品，请先新增</div>
          <div v-for="dish in dishes" :key="dish.id" class="dish-row">
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
              <div class="dr-cat">{{ dish.category }}</div>
            </div>
            <div class="dr-actions">
              <button class="dr-btn" :class="dish.available ? 'btn-avail' : 'btn-sold'" @click="toggleAvail(dish.id)">
                {{ dish.available ? '上架' : '估清' }}
              </button>
              <button class="dr-btn btn-edit" @click="openEdit(dish)">编辑</button>
              <button class="dr-btn btn-del"  @click="deleteDish(dish.id)">删除</button>
            </div>
          </div>
        </div>

        <!-- 新增/编辑表单 -->
        <div v-if="activeTab === 'form'" class="ap-body">
          <form class="dish-form" @submit.prevent="handleSubmit">
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

            <!-- 表单字段 -->
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
                <div class="avail-toggle">
                  <button type="button" class="toggle-btn" :class="{ active: form.available }" @click="form.available = !form.available">
                    {{ form.available ? '✓ 供应中' : '× 已估清' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-cancel" @click="activeTab = 'list'">取消</button>
              <button type="submit" class="btn-save" :disabled="uploading || saving">
                {{ saving ? '保存中…' : (editingId ? '更新菜品' : '添加菜品') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { Dish, DishCategory } from '@/types/kitchen'
import { DISH_CATEGORIES, CATEGORY_ICONS } from '@/types/kitchen'
import * as kitchenSvc from '@/services/kitchenService'
import { uploadImage, fileToDataUrl } from '@/services/storageUpload'

const props = defineProps<{ modelValue: boolean; dishes: Dish[] }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'refresh'): void
}>()

const activeTab    = ref<'list' | 'form'>('list')
const editingId    = ref<string | null>(null)
// 图片加载失败的菜品 ID 集合，用于回退到 emoji 显示
const failedImages = reactive(new Set<string>())
const saving      = ref(false)
const uploading   = ref(false)
const uploadError = ref('')
const isDragging  = ref(false)
const previewUrl  = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

interface DishForm {
  name: string; category: DishCategory; description: string
  imageUrl: string; available: boolean; price: number
}

const defaultForm = (): DishForm => ({
  name: '', category: '荤菜', description: '',
  imageUrl: '', available: true, price: 0,
})
const form = ref<DishForm>(defaultForm())

watch(() => props.modelValue, (v) => {
  if (!v) { activeTab.value = 'list'; editingId.value = null }
})

function openAdd() {
  form.value = defaultForm()
  previewUrl.value = ''
  uploadError.value = ''
  editingId.value = null
  activeTab.value = 'form'
}

function openEdit(dish: Dish) {
  form.value = {
    name: dish.name, category: dish.category,
    description: dish.description, imageUrl: dish.imageUrl,
    available: dish.available, price: dish.price,
  }
  previewUrl.value = dish.imageUrl
  editingId.value = dish.id
  activeTab.value = 'form'
}

async function handleFile(file: File) {
  if (!file.type.startsWith('image/')) return
  uploading.value = true
  uploadError.value = ''
  try {
    // 先本地预览（不依赖 COS，即使上传失败也能看到图片）
    previewUrl.value = await fileToDataUrl(file)
    const result = await uploadImage(file)
    form.value.imageUrl = result.url
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '未知错误'
    uploadError.value = msg
    console.error('图片上传失败:', e)
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

async function handleSubmit() {
  saving.value = true
  try {
    if (editingId.value) {
      await kitchenSvc.update(editingId.value, form.value)
    } else {
      await kitchenSvc.create(form.value)
    }
    emit('refresh')
    activeTab.value = 'list'
    editingId.value = null
  } catch (e) {
    console.error('保存失败:', e)
  } finally {
    saving.value = false
  }
}

async function toggleAvail(id: string) {
  await kitchenSvc.toggleAvailable(id)
  emit('refresh')
}

async function deleteDish(id: string) {
  if (!confirm('确认删除这道菜？')) return
  await kitchenSvc.remove(id)
  emit('refresh')
}
</script>

<style scoped>
.admin-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(2px); z-index: 300; }
.admin-panel {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: min(480px, 96vw);
  background: #161b22; border-left: 1px solid #30363d;
  z-index: 301; display: flex; flex-direction: column;
  box-shadow: -12px 0 50px rgba(0,0,0,.5);
}
.ap-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid #21262d; flex-shrink: 0;
}
.ap-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #e6edf3; }
.ap-icon { color: #7d8590; }
.ap-badge { font-size: 9px; padding: 1px 6px; border-radius: 3px; background: rgba(227,179,65,.1); border: 1px solid rgba(227,179,65,.3); color: #e3b341; font-family: 'JetBrains Mono', monospace; }
.ap-close { width: 28px; height: 28px; border-radius: 5px; cursor: pointer; background: rgba(255,255,255,.04); border: 1px solid #21262d; color: #7d8590; font-size: 12px; transition: all .15s; display: flex; align-items: center; justify-content: center; }
.ap-close:hover { color: #f85149; border-color: rgba(248,81,73,.3); }

.ap-tabs { display: flex; gap: 4px; padding: 10px 14px; border-bottom: 1px solid #21262d; flex-shrink: 0; }
.ap-tab { padding: 5px 14px; border-radius: 5px; font-size: 12px; cursor: pointer; font-family: 'JetBrains Mono', monospace; background: transparent; border: 1px solid transparent; color: #7d8590; transition: all .15s; }
.ap-tab:hover { color: #c9d1d9; border-color: #30363d; }
.ap-tab.active { color: #f97316; background: rgba(249,115,22,.08); border-color: rgba(249,115,22,.3); }

.ap-body { flex: 1; overflow-y: auto; padding: 12px 14px; }
.ap-empty { text-align: center; color: #484f58; font-size: 13px; padding: 3rem 0; }

.dish-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 7px; border: 1px solid #21262d; background: #0d1117; margin-bottom: 6px; }
.dr-img-wrap { width: 40px; height: 40px; border-radius: 6px; overflow: hidden; background: #161b22; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.dr-img { width: 100%; height: 100%; object-fit: cover; }
.dr-emoji { font-size: 20px; }
.dr-info { flex: 1; min-width: 0; }
.dr-name { font-size: 12px; font-weight: 600; color: #c9d1d9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dr-cat { font-size: 10px; color: #484f58; margin-top: 1px; }
.dr-actions { display: flex; gap: 5px; flex-shrink: 0; }
.dr-btn { font-size: 10px; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-family: 'JetBrains Mono', monospace; border-width: 1px; border-style: solid; transition: all .15s; }
.btn-avail { background: rgba(57,211,83,.08);  border-color: rgba(57,211,83,.25);  color: #39d353; }
.btn-sold  { background: rgba(248,81,73,.08);  border-color: rgba(248,81,73,.25);  color: #f85149; }
.btn-edit  { background: rgba(88,166,255,.08); border-color: rgba(88,166,255,.25); color: #58a6ff; }
.btn-del   { background: rgba(248,81,73,.05);  border-color: rgba(248,81,73,.2);   color: #f85149; }
.btn-del:hover { background: rgba(248,81,73,.15); }

/* 表单 */
.dish-form { display: flex; flex-direction: column; gap: 12px; }
.upload-zone {
  width: 100%; aspect-ratio: 16 / 9; border-radius: 8px; border: 2px dashed #30363d;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s; overflow: hidden; background: #0d1117;
}
.upload-zone:hover, .upload-zone--dragging { border-color: rgba(249,115,22,.5); background: rgba(249,115,22,.04); }
.upload-zone--has-img { border-style: solid; border-color: rgba(249,115,22,.3); }
.upload-preview { width: 100%; height: 100%; object-fit: cover; }
.upload-hint { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.upload-icon { font-size: 24px; color: #484f58; }
.upload-hint span { font-size: 12px; color: #7d8590; }
.upload-sub { font-size: 10px !important; color: #484f58 !important; }
.file-input-hidden { display: none; }
.upload-error {
  font-size: 11px; color: #f85149; font-family: 'JetBrains Mono', monospace;
  background: rgba(248,81,73,.06); border: 1px solid rgba(248,81,73,.25);
  border-radius: 5px; padding: 6px 10px; word-break: break-all;
}

.form-field { display: flex; flex-direction: column; gap: 5px; }
.form-label { font-size: 11px; color: #7d8590; font-family: 'JetBrains Mono', monospace; }
.form-input {
  background: #0d1117; border: 1px solid #30363d; border-radius: 6px;
  color: #c9d1d9; font-size: 12px; font-family: 'JetBrains Mono', monospace;
  padding: 7px 10px; outline: none; transition: border-color .15s; width: 100%; box-sizing: border-box;
}
.form-input:focus { border-color: rgba(249,115,22,.45); }
.form-select option { background: #161b22; }
.form-textarea { resize: vertical; min-height: 56px; }
.form-row { flex-direction: row; gap: 10px; }
.form-half { flex: 1; display: flex; flex-direction: column; gap: 5px; }

.avail-toggle { margin-top: 2px; }
.toggle-btn {
  padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px;
  font-family: 'JetBrains Mono', monospace; transition: all .2s;
  background: rgba(248,81,73,.08); border: 1px solid rgba(248,81,73,.25); color: #f85149;
}
.toggle-btn.active { background: rgba(57,211,83,.08); border-color: rgba(57,211,83,.25); color: #39d353; }

.form-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }
.btn-cancel { padding: 7px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'JetBrains Mono', monospace; background: transparent; border: 1px solid #30363d; color: #7d8590; transition: all .15s; }
.btn-cancel:hover { color: #c9d1d9; border-color: #484f58; }
.btn-save { padding: 7px 20px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'JetBrains Mono', monospace; font-weight: 700; background: rgba(249,115,22,.15); border: 1px solid rgba(249,115,22,.4); color: #f97316; transition: all .2s; }
.btn-save:hover:not(:disabled) { background: rgba(249,115,22,.25); }
.btn-save:disabled { opacity: .5; cursor: not-allowed; }

.overlay-enter-active, .overlay-leave-active { transition: opacity .25s; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }
.panel-enter-active { transition: transform .3s cubic-bezier(0.34,1.15,0.64,1); }
.panel-leave-active { transition: transform .22s ease; }
.panel-enter-from, .panel-leave-to { transform: translateX(100%); }
</style>
