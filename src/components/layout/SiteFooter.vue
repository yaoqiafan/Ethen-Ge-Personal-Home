<template>
  <footer class="site-footer" aria-label="站点合规信息">

    <!-- 版权 -->
    <div class="sf-copyright">
      Copyright © {{ year }} {{ ownerName }} 版权所有
    </div>

    <!-- 备案信息行 -->
    <div class="sf-filings">

      <!-- ICP 备案 -->
      <a
        v-if="icpNumber"
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
        class="sf-link"
      >{{ icpNumber }}</a>

      <!-- 公安联网备案 -->
      <a
        v-if="publicSecurityNumber"
        :href="`http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=${recordCode}`"
        target="_blank"
        rel="noopener noreferrer"
        class="sf-link sf-link--police"
      >
        <img :src="policeIconSrc" alt="公安备案" class="sf-police-icon" @error="hideIcon" />
        {{ publicSecurityNumber }}
      </a>

    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const icpNumber            = import.meta.env.VITE_ICP_NUMBER            as string | undefined
const publicSecurityNumber = import.meta.env.VITE_PUBLIC_SECURITY_NUMBER as string | undefined
const ownerName            = (import.meta.env.VITE_OWNER_NAME as string | undefined) || ''

const year = new Date().getFullYear()

// 从备案号中提取纯数字作为 recordcode 参数
const recordCode = computed(() =>
  publicSecurityNumber?.replace(/\D/g, '') ?? ''
)

// 动态绑定避免 Rollup 静态分析；@error 时隐藏图标（文件不存在也不报错）
const policeIconSrc = '/beian-icon.png'
function hideIcon(e: Event) {
  (e.target as HTMLImageElement).style.display = 'none'
}
</script>

<style scoped>
.site-footer {
  padding: 14px 16px;
  text-align: center;
  font-size: 11px;
  color: #484f58;
  line-height: 1.8;
  border-top: 1px solid #21262d;
  background: transparent;
  flex-shrink: 0;
}

.sf-copyright {
  margin-bottom: 4px;
}

.sf-filings {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.sf-link {
  color: #484f58;
  text-decoration: none;
  transition: color 0.15s;
  display: flex;
  align-items: center;
  gap: 4px;
}
.sf-link:hover { color: #7d8590; }

.sf-police-icon {
  width: 14px;
  height: 14px;
  opacity: 0.6;
  flex-shrink: 0;
}
</style>
