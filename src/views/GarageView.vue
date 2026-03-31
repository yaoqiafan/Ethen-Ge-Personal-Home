<template>
  <div class="coming-soon animate-fade-in">
    <div class="card cs-card">
      <div class="cs-badge red">Module C</div>
      <div class="cs-bike-title">
        <span class="brand">KAWASAKI</span>
        <div class="model"><span class="h-letter">H</span><span class="two">2</span></div>
      </div>
      <div class="cs-desc">数字车库 · 机械爱好者展厅 · 即将上线</div>
      <div class="cs-coming">
        <span class="cs-dot red"></span>
        Visual showcase & H2 progress tracker — coming soon
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Module C: Digital Garage — to be implemented
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
  gap: 14px;
  border-radius: 12px;
}
.cs-badge {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.cs-badge.red {
  background: rgba(248, 81, 73, 0.1);
  border: 1px solid rgba(248, 81, 73, 0.25);
  color: #f85149;
}
.cs-bike-title { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.brand {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.25em;
  color: #39d353;
  text-shadow: 0 0 8px rgba(57, 211, 83, 0.5);
}
.model {
  display: flex;
  align-items: baseline;
  line-height: 1;
}
.h-letter {
  font-size: 52px;
  font-weight: 900;
  color: #e6edf3;
  letter-spacing: -0.03em;
}
.two {
  font-size: 52px;
  font-weight: 900;
  color: #f85149;
  text-shadow: 0 0 20px rgba(248, 81, 73, 0.6);
  letter-spacing: -0.03em;
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
.cs-dot.red {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f85149;
  box-shadow: 0 0 6px rgba(248, 81, 73, 0.7);
}
</style>
