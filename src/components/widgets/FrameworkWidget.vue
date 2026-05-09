<template>
  <div class="card fw-card">
    <div class="card-header">
      <span class="header-dot"></span>
      模块 A — 开源项目
    </div>

    <div class="fw-title-row">
      <div>
        <div class="fw-name">PF.AutoFramework</div>
        <div class="fw-desc">工业自动化软件开发框架</div>
      </div>
      <span class="fw-version">v0.3.0-alpha</span>
    </div>

    <!-- Progress -->
    <div class="fw-progress-section">
      <div class="progress-label-row">
        <span class="label-text">整体进度</span>
        <span class="label-pct">{{ project.progress }}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${project.progress}%` }"></div>
      </div>
    </div>

    <!-- Feature list -->
    <div class="fw-features">
      <div
        v-for="(feat, i) in project.features"
        :key="i"
        class="fw-feature"
        :class="feat.done ? 'done' : 'pending'"
      >
        <span class="feat-check">{{ feat.done ? '✓' : '○' }}</span>
        <span class="feat-text">{{ feat.text }}</span>
      </div>
    </div>

    <!-- Tags & action -->
    <div class="fw-footer">
      <div class="fw-tags">
        <span class="tag">C#</span>
        <span class="tag">.NET 8</span>
        <span class="tag tag-cyan">WPF</span>
        <span class="tag tag-purple">Prism</span>
        <span class="tag tag-yellow">MVVM</span>
      </div>
      <RouterLink to="/framework" class="btn-primary">
        查看文档 →
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

const project = {
  progress: 35,
  features: [
    { text: '核心 IoC / DI 容器', done: true },
    { text: '模块系统（Prism 风格）', done: true },
    { text: '事件聚合器', done: true },
    { text: '区域管理器 & 导航', done: false },
    { text: '硬件抽象层', done: false },
    { text: '插件热重载支持', done: false },
  ],
}
</script>

<style scoped>
.fw-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
}

.header-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #39d353;
  box-shadow: 0 0 6px rgba(57, 211, 83, 0.7);
}

.fw-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.fw-name {
  font-size: 16px;
  font-weight: 700;
  color: #e6edf3;
  letter-spacing: 0.02em;
}
.fw-desc {
  font-size: 11px;
  color: #7d8590;
  margin-top: 2px;
}
.fw-version {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(227, 179, 65, 0.1);
  border: 1px solid rgba(227, 179, 65, 0.25);
  color: #e3b341;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Progress */
.fw-progress-section { display: flex; flex-direction: column; gap: 5px; }
.progress-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}
.label-text { color: #7d8590; }
.label-pct { color: #39d353; font-weight: 600; }
.progress-track {
  width: 100%;
  height: 5px;
  background: #21262d;
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #39d353, #58a6ff);
  box-shadow: 0 0 6px rgba(57, 211, 83, 0.5);
  transition: width 1s ease;
}

/* Features */
.fw-features {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}
.fw-feature {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 3px 0;
}
.fw-feature.done   { color: #c9d1d9; }
.fw-feature.pending { color: #484f58; }
.feat-check {
  font-size: 12px;
  width: 14px;
  flex-shrink: 0;
}
.fw-feature.done .feat-check { color: #39d353; }
.fw-feature.pending .feat-check { color: #30363d; }

/* Footer */
.fw-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 0.75rem;
  border-top: 1px solid #21262d;
}
.fw-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* tag overrides — inline for scoped */
.tag {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 3px;
  background: rgba(57, 211, 83, 0.08);
  border: 1px solid rgba(57, 211, 83, 0.2);
  color: #39d353;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tag-cyan {
  background: rgba(88, 166, 255, 0.08);
  border-color: rgba(88, 166, 255, 0.2);
  color: #58a6ff;
}
.tag-purple {
  background: rgba(188, 140, 255, 0.08);
  border-color: rgba(188, 140, 255, 0.2);
  color: #bc8cff;
}
.tag-yellow {
  background: rgba(227, 179, 65, 0.08);
  border-color: rgba(227, 179, 65, 0.2);
  color: #e3b341;
}
</style>
