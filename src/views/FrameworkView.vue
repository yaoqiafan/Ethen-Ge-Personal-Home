<template>
  <div class="coming-soon animate-fade-in">
    <div class="card cs-card">
      <div class="cs-badge">Module A</div>
      <div class="cs-title">PF.AutoFramework</div>
      <div class="cs-desc">工业自动化软件框架 · 文档与展示中心</div>
      <div class="cs-coming">
        <span class="cs-dot"></span>
        Documentation & showcase coming soon
      </div>
      <div class="cs-tags">
        <span class="tag">C#</span>
        <span class="tag tag-cyan">.NET 8</span>
        <span class="tag tag-cyan">WPF</span>
        <span class="tag tag-purple">Prism</span>
        <span class="tag tag-yellow">MVVM</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Module A: PF.AutoFramework — to be implemented
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
.cs-title {
  font-size: 24px;
  font-weight: 800;
  color: #e6edf3;
  letter-spacing: 0.02em;
}
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
.cs-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}
.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(57, 211, 83, 0.08);
  border: 1px solid rgba(57, 211, 83, 0.2);
  color: #39d353;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
