export interface NavItem {
  id: string
  label: string
  labelCN: string
  path: string
  icon: string
  description: string
  badge?: string
}

export interface BootLine {
  text: string
  type: 'info' | 'ok' | 'warn' | 'error' | 'progress' | 'blank'
  delay: number
}

export interface ProjectStatus {
  name: string
  version: string
  progress: number
  lastUpdate: string
  tags: string[]
  description: string
  features: string[]
}

export interface H2Progress {
  target: number
  current: number
  currency: string
  startDate: string
  targetDate: string
  milestones: Milestone[]
}

export interface Milestone {
  label: string
  amount: number
  reached: boolean
}

export interface StatCard {
  id: string
  label: string
  value: string
  sub: string
  color: string
  icon: string
}

export type BootPhase = 'boot' | 'banner' | 'prompt' | 'exiting'
