<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="kitchen-toast" :class="`toast--${type}`">
        <span class="toast-icon">{{ icons[type] }}</span>
        <span class="toast-msg">{{ message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type ToastType = 'success' | 'error' | 'info'

const visible = ref(false)
const message = ref('')
const type = ref<ToastType>('success')
let timer: ReturnType<typeof setTimeout> | null = null

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '⚡',
  info: '›',
}

function show(msg: string, t: ToastType = 'success', duration = 3000) {
  if (timer) clearTimeout(timer)
  message.value = msg
  type.value = t
  visible.value = true
  timer = setTimeout(() => { visible.value = false }, duration)
}

defineExpose({ show })
</script>

<style scoped>
.kitchen-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 32px rgba(0,0,0,.4);
  white-space: nowrap;
  pointer-events: none;
}
.toast--success { background: rgba(57,211,83,.15); border: 1px solid rgba(57,211,83,.4); color: #39d353; }
.toast--error   { background: rgba(248,81,73,.12);  border: 1px solid rgba(248,81,73,.4);  color: #f85149; }
.toast--info    { background: rgba(88,166,255,.12); border: 1px solid rgba(88,166,255,.4); color: #58a6ff; }
.toast-icon { font-size: 14px; font-weight: 700; }

.toast-enter-active { transition: all .3s cubic-bezier(0.34,1.56,0.64,1); }
.toast-leave-active { transition: all .25s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(-50%) translateY(16px); }
.toast-leave-to     { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>
