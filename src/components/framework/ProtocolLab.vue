<template>
  <div class="protocol-lab">

    <!-- 实验室头部 -->
    <div class="lab-header">
      <div class="lab-title-row">
        <span class="lab-icon">⬡</span>
        <div>
          <div class="lab-title">工业协议实验室</div>
          <div class="lab-subtitle">Industrial Protocol Lab — 开发规划中</div>
        </div>
        <span class="wip-badge">WIP</span>
      </div>
      <div class="lab-desc">
        基于 PF.AutoFramework 协议层的工业通信仿真与调试工具集。目标是在浏览器内提供一个轻量级的协议报文编辑、发送与解析环境，辅助设备接入调试。
      </div>
    </div>

    <!-- 模块路线图 -->
    <div class="section-label">开发路线图</div>
    <div class="roadmap">

      <div
        v-for="item in roadmap"
        :key="item.id"
        class="road-item"
        :class="`road-item--${item.status}`"
      >
        <div class="road-status-col">
          <div class="road-status-dot" :class="`dot--${item.status}`"></div>
          <div class="road-line" v-if="item.id < roadmap.length"></div>
        </div>
        <div class="road-content">
          <div class="road-head">
            <span class="road-name">{{ item.name }}</span>
            <span class="road-badge" :class="`badge--${item.status}`">{{ statusLabel(item.status) }}</span>
            <span class="road-eta">{{ item.eta }}</span>
          </div>
          <div class="road-desc">{{ item.desc }}</div>
          <div v-if="item.features.length" class="road-features">
            <span v-for="f in item.features" :key="f" class="road-feature">{{ f }}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- 模块预览卡片 -->
    <div class="section-label">模块预览</div>
    <div class="preview-grid">

      <!-- SECS/GEM 仿真器 -->
      <div class="preview-card preview-card--secs">
        <div class="pc-header">
          <span class="pc-icon">◈</span>
          <span class="pc-title">SECS/GEM 仿真器</span>
          <span class="pc-status pending">规划中</span>
        </div>
        <div class="pc-body">
          <div class="pc-desc">
            基于 HSMS-SS 协议的设备仿真器，支持主动/被动连接模式，可发送标准 S1Fx/S2Fx 报文，用于上位机开发调试。
          </div>
          <div class="pc-specs">
            <div class="spec-row">
              <span class="spec-key">协议版本</span>
              <span class="spec-val">SEMI E37.1 (HSMS-SS)</span>
            </div>
            <div class="spec-row">
              <span class="spec-key">报文类型</span>
              <span class="spec-val">S1F1/2, S2F13/14, S6F11/12</span>
            </div>
            <div class="spec-row">
              <span class="spec-key">连接模式</span>
              <span class="spec-val">Active / Passive</span>
            </div>
            <div class="spec-row">
              <span class="spec-key">数据格式</span>
              <span class="spec-val">SECS-II (SML 文本编辑器)</span>
            </div>
          </div>
        </div>
        <div class="pc-terminal">
          <div class="terminal-bar">
            <span class="tb-dot red"></span>
            <span class="tb-dot yellow"></span>
            <span class="tb-dot green"></span>
            <span class="tb-title">SECS/GEM Console</span>
          </div>
          <div class="terminal-body">
            <div class="tl"><span class="tl-time">00:00:00.000</span><span class="tl-dir send">→ S1F1</span><span class="tl-msg">Are You There?</span></div>
            <div class="tl"><span class="tl-time">00:00:00.012</span><span class="tl-dir recv">← S1F2</span><span class="tl-msg">On Line Data</span></div>
            <div class="tl"><span class="tl-time">00:00:01.000</span><span class="tl-dir send">→ S2F13</span><span class="tl-msg">Equipment Constant Request</span></div>
            <div class="tl"><span class="tl-time">00:00:01.034</span><span class="tl-dir recv">← S2F14</span><span class="tl-msg">Equipment Constant Data [8 items]</span></div>
            <div class="tl blink-line"><span class="tl-time">00:00:02.000</span><span class="tl-cursor">█</span></div>
          </div>
        </div>
      </div>

      <!-- Modbus 调试器 -->
      <div class="preview-card preview-card--modbus">
        <div class="pc-header">
          <span class="pc-icon">⊞</span>
          <span class="pc-title">Modbus TCP 调试器</span>
          <span class="pc-status planned">即将推出</span>
        </div>
        <div class="pc-body">
          <div class="pc-desc">
            可视化 Modbus TCP/RTU 寄存器读写工具。支持线圈状态、输入/保持寄存器的批量操作，实时显示寄存器值变化曲线。
          </div>
          <div class="pc-specs">
            <div class="spec-row">
              <span class="spec-key">功能码</span>
              <span class="spec-val">FC01 / FC02 / FC03 / FC04 / FC05 / FC06 / FC15 / FC16</span>
            </div>
            <div class="spec-row">
              <span class="spec-key">数据类型</span>
              <span class="spec-val">Bool / Int16 / UInt16 / Int32 / Float32</span>
            </div>
            <div class="spec-row">
              <span class="spec-key">扫描周期</span>
              <span class="spec-val">100ms ~ 10000ms 可调</span>
            </div>
          </div>
        </div>
        <div class="register-mockup">
          <div class="reg-table">
            <div class="reg-header">
              <span>地址</span><span>类型</span><span>值</span><span>状态</span>
            </div>
            <div v-for="reg in mockRegisters" :key="reg.addr" class="reg-row">
              <span class="reg-addr">{{ reg.addr }}</span>
              <span class="reg-type">{{ reg.type }}</span>
              <span class="reg-val">{{ reg.val }}</span>
              <span class="reg-dot" :class="reg.ok ? 'ok' : 'err'"></span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 诊断面板预览 -->
    <div class="preview-grid" style="margin-top: 10px;">
      <div class="preview-card preview-card--diag" style="grid-column: 1 / -1;">
        <div class="pc-header">
          <span class="pc-icon">◉</span>
          <span class="pc-title">设备诊断面板</span>
          <span class="pc-status planned">即将推出</span>
        </div>
        <div class="diag-body">
          <div class="diag-desc">
            PF.Diagnostics 可视化前端：展示设备心跳状态、性能指标、报警历史与健康评分。支持 WebSocket 实时推送，数据更新延迟 &lt;100ms。
          </div>
          <div class="diag-mockup">
            <div v-for="dev in mockDevices" :key="dev.name" class="dev-card">
              <div class="dev-indicator" :class="dev.status"></div>
              <div class="dev-info">
                <div class="dev-name">{{ dev.name }}</div>
                <div class="dev-metric">{{ dev.metric }}</div>
              </div>
              <div class="dev-score" :class="dev.status">{{ dev.score }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 技术栈说明 -->
    <div class="tech-note">
      <span class="tn-icon">›</span>
      协议实现基于 <span class="tn-pkg">PF.Modules.SecsGem</span> 和 <span class="tn-pkg">PF.Modules.Modbus</span>，通过 WebSocket 桥接到浏览器前端。后端桥接服务使用 ASP.NET Core + SignalR 实现。
    </div>

  </div>
</template>

<script setup lang="ts">
interface RoadmapItem {
  id: number
  name: string
  status: 'done' | 'active' | 'planned' | 'future'
  eta: string
  desc: string
  features: string[]
}

const roadmap: RoadmapItem[] = [
  {
    id: 1,
    name: 'PF.Modules.Modbus — 核心库',
    status: 'done',
    eta: '已完成',
    desc: '.NET 库层已完成 TCP/RTU 全功能码支持，含连接池与断线重连。',
    features: ['FC01-FC16', '连接池', '断线重连', '批量读写'],
  },
  {
    id: 2,
    name: 'PF.Modules.SecsGem — Beta',
    status: 'active',
    eta: 'v0.9.x — 进行中',
    desc: 'HSMS-SS 主/被动模式实现完成，SECS-II 报文解析器正在完善边缘用例。',
    features: ['HSMS Active/Passive', 'S1/S2/S6 报文', 'SML 解析器'],
  },
  {
    id: 3,
    name: 'WebSocket 桥接服务',
    status: 'planned',
    eta: 'Q3 2026',
    desc: 'ASP.NET Core + SignalR 后端服务，将协议层事件实时推送到浏览器前端。',
    features: ['SignalR Hub', 'JWT 认证', 'Docker 部署'],
  },
  {
    id: 4,
    name: 'SECS/GEM 浏览器仿真器',
    status: 'planned',
    eta: 'Q3 2026',
    desc: '浏览器内 SML 编辑器 + 报文发送控制台，依赖桥接服务。',
    features: ['SML 编辑器', '报文历史', '会话管理'],
  },
  {
    id: 5,
    name: 'Modbus 可视化调试器',
    status: 'future',
    eta: 'Q4 2026',
    desc: '寄存器表格 + 实时折线图，支持多设备并发监控。',
    features: ['寄存器表格', '实时折线图', '多设备'],
  },
  {
    id: 6,
    name: '设备诊断大屏',
    status: 'future',
    eta: 'Q4 2026',
    desc: 'PF.Diagnostics 可视化前端，健康评分 + 报警历史看板。',
    features: ['健康评分', '报警历史', 'WebSocket 推送'],
  },
]

function statusLabel(status: RoadmapItem['status']): string {
  return { done: '已完成', active: '进行中', planned: '规划中', future: '远期' }[status]
}

const mockRegisters = [
  { addr: '40001', type: 'Int16',  val: '1234',    ok: true  },
  { addr: '40002', type: 'Float',  val: '98.6',    ok: true  },
  { addr: '40003', type: 'Bool',   val: 'TRUE',    ok: true  },
  { addr: '40004', type: 'UInt16', val: '65535',   ok: false },
]

const mockDevices = [
  { name: 'Device-001 (SECS)',   metric: 'Heartbeat: 1.2s',   status: 'online',  score: '98' },
  { name: 'PLC-Line3 (Modbus)', metric: 'Scan: 120ms',        status: 'online',  score: '94' },
  { name: 'Robot-ARM (Modbus)', metric: 'Scan: 85ms',         status: 'online',  score: '99' },
  { name: 'Sensor-HMI',         metric: 'Last seen: 32s ago', status: 'warning', score: '71' },
  { name: 'EQ-Loader-02',       metric: 'Connection lost',    status: 'offline', score: '--' },
]
</script>

<style scoped>
.protocol-lab { display: flex; flex-direction: column; gap: 14px; }

/* ── 头部 ─────────────────────────────────── */
.lab-header {
  background: var(--glass-bg); border: 1px solid #21262d; border-radius: 8px; padding: 16px;
}
.lab-title-row {
  display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
}
.lab-icon { font-size: 20px; color: #58a6ff; flex-shrink: 0; }
.lab-title { font-size: 15px; font-weight: 700; color: #e6edf3; }
.lab-subtitle { font-size: 11px; color: #484f58; margin-top: 1px; }
.wip-badge {
  margin-left: auto; font-size: 10px; padding: 2px 8px; border-radius: 4px;
  background: rgba(227,179,65,.1); border: 1px solid rgba(227,179,65,.3); color: #e3b341;
  font-family: 'JetBrains Mono', monospace; letter-spacing: .05em;
}
.lab-desc { font-size: 12px; color: #7d8590; line-height: 1.7; }

/* ── 分区标题 ─────────────────────────────── */
.section-label {
  font-size: 10px; color: #484f58; text-transform: uppercase; letter-spacing: .1em;
  padding-left: 2px;
}

/* ── 路线图 ───────────────────────────────── */
.roadmap { display: flex; flex-direction: column; }
.road-item { display: flex; gap: 12px; }
.road-status-col { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 16px; }
.road-status-dot {
  width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 3px;
  border: 2px solid transparent;
}
.dot--done    { background: #39d353; border-color: rgba(57,211,83,.3); box-shadow: 0 0 6px rgba(57,211,83,.5); }
.dot--active  { background: #58a6ff; border-color: rgba(88,166,255,.3); box-shadow: 0 0 6px rgba(88,166,255,.5); animation: pulse-dot 2s ease-in-out infinite; }
.dot--planned { background: transparent; border-color: #30363d; }
.dot--future  { background: transparent; border-color: #21262d; }
@keyframes pulse-dot { 0%, 100% { box-shadow: 0 0 6px rgba(88,166,255,.5); } 50% { box-shadow: 0 0 12px rgba(88,166,255,.9); } }

.road-line { flex: 1; width: 1px; background: #21262d; margin: 3px 0; min-height: 12px; }

.road-content { flex: 1; padding: 4px 0 16px; }
.road-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.road-name { font-size: 12px; font-weight: 600; color: #c9d1d9; font-family: 'JetBrains Mono', monospace; }
.road-badge {
  font-size: 9px; padding: 1px 6px; border-radius: 10px; border-width: 1px; border-style: solid;
}
.badge--done    { background: rgba(57,211,83,.1);   border-color: rgba(57,211,83,.3);   color: #39d353; }
.badge--active  { background: rgba(88,166,255,.1);  border-color: rgba(88,166,255,.3);  color: #58a6ff; }
.badge--planned { background: rgba(227,179,65,.1);  border-color: rgba(227,179,65,.3);  color: #e3b341; }
.badge--future  { background: rgba(139,148,158,.1); border-color: rgba(139,148,158,.2); color: #484f58; }
.road-eta { font-size: 10px; color: #484f58; margin-left: auto; }

.road-desc { font-size: 11px; color: #7d8590; line-height: 1.6; margin-bottom: 6px; }
.road-features { display: flex; gap: 5px; flex-wrap: wrap; }
.road-feature {
  font-size: 10px; padding: 1px 6px; border-radius: 3px;
  background: #21262d; border: 1px solid #30363d; color: #7d8590;
  font-family: 'JetBrains Mono', monospace;
}

/* ── 预览网格 ─────────────────────────────── */
.preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.preview-card {
  background: var(--glass-bg); border: 1px solid #21262d; border-radius: 8px; overflow: hidden;
}
.preview-card--secs  { border-top: 2px solid rgba(57,211,83,.3); }
.preview-card--modbus{ border-top: 2px solid rgba(88,166,255,.3); }
.preview-card--diag  { border-top: 2px solid rgba(227,179,65,.3); }

.pc-header {
  display: flex; align-items: center; gap: 8px; padding: 12px 14px;
  border-bottom: 1px solid #21262d;
}
.pc-icon { font-size: 14px; }
.preview-card--secs  .pc-icon { color: #39d353; }
.preview-card--modbus .pc-icon { color: #58a6ff; }
.preview-card--diag  .pc-icon { color: #e3b341; }
.pc-title { font-size: 12px; font-weight: 600; color: #c9d1d9; }
.pc-status {
  margin-left: auto; font-size: 9px; padding: 1px 6px; border-radius: 10px;
  border-width: 1px; border-style: solid;
}
.pc-status.pending { background: rgba(227,179,65,.1); border-color: rgba(227,179,65,.3); color: #e3b341; }
.pc-status.planned { background: rgba(88,166,255,.1);  border-color: rgba(88,166,255,.3);  color: #58a6ff; }

.pc-body { padding: 12px 14px; }
.pc-desc { font-size: 11px; color: #7d8590; line-height: 1.7; margin-bottom: 10px; }
.pc-specs { display: flex; flex-direction: column; gap: 4px; }
.spec-row { display: flex; gap: 8px; font-size: 10px; }
.spec-key { color: #484f58; width: 64px; flex-shrink: 0; }
.spec-val { color: #c9d1d9; font-family: 'JetBrains Mono', monospace; }

/* SECS 终端仿真 */
.pc-terminal { border-top: 1px solid #21262d; }
.terminal-bar {
  display: flex; align-items: center; gap: 5px; padding: 6px 10px;
  background: var(--glass-bg); border-bottom: 1px solid #21262d;
}
.tb-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.tb-dot.red    { background: #f85149; }
.tb-dot.yellow { background: #e3b341; }
.tb-dot.green  { background: #39d353; }
.tb-title { font-size: 10px; color: #484f58; margin-left: 4px; font-family: 'JetBrains Mono', monospace; }

.terminal-body { padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; background: var(--glass-bg); }
.tl { display: flex; gap: 8px; font-size: 10px; font-family: 'JetBrains Mono', monospace; align-items: center; }
.tl-time { color: #484f58; flex-shrink: 0; }
.tl-dir { flex-shrink: 0; font-weight: 700; width: 44px; }
.tl-dir.send { color: #39d353; }
.tl-dir.recv { color: #58a6ff; }
.tl-msg { color: #7d8590; }
.tl-cursor { color: #39d353; animation: blink-cur .7s step-end infinite; }
@keyframes blink-cur { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* Modbus 寄存器表格 */
.register-mockup { padding: 10px 14px; border-top: 1px solid #21262d; }
.reg-table { font-size: 10px; font-family: 'JetBrains Mono', monospace; }
.reg-header {
  display: grid; grid-template-columns: 1fr 1fr 1fr 20px;
  padding: 4px 6px; color: #484f58; border-bottom: 1px solid #21262d; margin-bottom: 4px;
}
.reg-row {
  display: grid; grid-template-columns: 1fr 1fr 1fr 20px;
  padding: 3px 6px; border-radius: 3px; transition: background .1s;
}
.reg-row:hover { background: rgba(255,255,255,.02); }
.reg-addr { color: #58a6ff; }
.reg-type { color: #7d8590; }
.reg-val  { color: #c9d1d9; }
.reg-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 1px; flex-shrink: 0; }
.reg-dot.ok  { background: #39d353; }
.reg-dot.err { background: #f85149; }

/* 诊断面板 */
.diag-body { padding: 12px 14px; }
.diag-desc { font-size: 11px; color: #7d8590; line-height: 1.7; margin-bottom: 12px; }
.diag-mockup { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.dev-card {
  background: var(--glass-bg); border: 1px solid #21262d; border-radius: 6px;
  padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 5px;
  transition: border-color .2s;
}
.dev-card:hover { border-color: #30363d; }
.dev-indicator {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.dev-indicator.online  { background: #39d353; box-shadow: 0 0 6px rgba(57,211,83,.6); }
.dev-indicator.warning { background: #e3b341; box-shadow: 0 0 6px rgba(227,179,65,.6); animation: pulse-dot 1.5s ease-in-out infinite; }
.dev-indicator.offline { background: #484f58; }
.dev-info { text-align: center; }
.dev-name   { font-size: 9px;  color: #c9d1d9; font-family: 'JetBrains Mono', monospace; line-height: 1.4; word-break: break-all; }
.dev-metric { font-size: 9px;  color: #484f58; margin-top: 2px; }
.dev-score  { font-size: 13px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.dev-score.online  { color: #39d353; }
.dev-score.warning { color: #e3b341; }
.dev-score.offline { color: #484f58; }

/* ── 技术栈说明 ───────────────────────────── */
.tech-note {
  font-size: 11px; color: #484f58; line-height: 1.7;
  padding: 10px 12px; background: var(--glass-bg); border: 1px solid #21262d;
  border-radius: 6px; display: flex; gap: 6px; align-items: flex-start;
}
.tn-icon { color: #39d353; flex-shrink: 0; }
.tn-pkg {
  font-family: 'JetBrains Mono', monospace; color: #58a6ff;
  background: rgba(88,166,255,.08); padding: 0 4px; border-radius: 3px;
}

@media (max-width: 700px) {
  .preview-grid { grid-template-columns: 1fr; }
  .diag-mockup { grid-template-columns: repeat(2, 1fr); }
}
</style>
