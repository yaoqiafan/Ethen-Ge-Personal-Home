<template>
  <div class="coming-soon animate-fade-in">
    <div class="card cs-card">
      <div class="cs-badge cyan">Module B</div>
      <div class="cs-title cyan">AI Toolbox</div>
      <div class="cs-desc">多模型 AI 对话工具箱 · 正在组件化中</div>
      <div class="cs-coming">
        <span class="cs-dot cyan"></span>
        多模型对话界面 — 即将上线
      </div>
      <div class="cs-models">
        <div v-for="m in models" :key="m" class="cs-model">{{ m }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const models = ['GPT-4o', 'Claude 3.5', 'DeepSeek V3', 'Kimi k1.5']
</script>

<style scoped>
.coming-soon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.cs-card {
  padding: 2rem;
  text-align: center;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
}
.cs-badge {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  background: rgba(57, 211, 83, 0.1);
  border: 1px solid rgba(57, 211, 83, 0.25);
  color: #39d353;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.cs-badge.cyan {
  background: rgba(88, 166, 255, 0.1);
  border-color: rgba(88, 166, 255, 0.25);
  color: #58a6ff;
}
.cs-title {
  font-size: 24px;
  font-weight: 800;
  color: #e6edf3;
}
.cs-title.cyan { color: #58a6ff; text-shadow: 0 0 16px rgba(88, 166, 255, 0.4); }
.cs-desc {
  font-size: 13px;
  color: #7d8590;
}
.cs-coming {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #7d8590;
  padding: 8px 16px;
  border: 1px solid #21262d;
  border-radius: 6px;
  background: #0d1117;
}
.cs-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #e3b341;
  box-shadow: 0 0 6px rgba(227, 179, 65, 0.7);
}
.cs-dot.cyan {
  background: #58a6ff;
  box-shadow: 0 0 6px rgba(88, 166, 255, 0.7);
}
.cs-models {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}
.cs-model {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 4px;
  background: rgba(88, 166, 255, 0.08);
  border: 1px solid rgba(88, 166, 255, 0.2);
  color: #58a6ff;
}
</style>
