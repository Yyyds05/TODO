<script setup>
import { ref, computed, onMounted } from 'vue'
import PomodoroTimer from '../components/PomodoroTimer.vue'
import PomodoroHistory from '../components/PomodoroHistory.vue'
import { 
  pomodoroRecords, 
  todayPomodoroStats, 
  loadPomodoroRecords, 
  addPomodoroRecord,
  getPomodoroStats
} from '../stores/reminderStore.js'

// 统计数据
const stats = ref({
  totalCount: 0,
  totalMinutes: 0,
  streakDays: 0
})

// 计算今日专注时长（分钟）
const todayFocusMinutes = computed(() => {
  return Math.floor(todayPomodoroStats.value.totalMinutes)
})

// 计算今日专注次数
const todayFocusCount = computed(() => {
  return todayPomodoroStats.value.count
})

// 处理专注完成
async function handleComplete(record) {
  await addPomodoroRecord(record)
  await refreshStats()
}

// 处理专注跳过
async function handleSkip(record) {
  await addPomodoroRecord(record)
  await refreshStats()
}

// 刷新统计数据
async function refreshStats() {
  const newStats = await getPomodoroStats()
  if (newStats) {
    stats.value = newStats
  }
}

// 格式化时长
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}分钟`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}小时`
  }
  return `${hours}小时${remainingMinutes}分钟`
}

// 初始化
onMounted(async () => {
  await loadPomodoroRecords()
  await refreshStats()
})
</script>

<template>
  <div class="pomodoro-view">
    <!-- 页面标题 -->
    <header class="page-header">
      <h1 class="page-title">
        <span class="title-icon">🍅</span>
        番茄专注
      </h1>
      <p class="page-subtitle">保持专注，高效完成任务</p>
    </header>

    <!-- 番茄计时器 -->
    <section class="timer-section">
      <PomodoroTimer 
        @complete="handleComplete"
        @skip="handleSkip"
      />
    </section>

    <!-- 今日统计 -->
    <section class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-value">{{ todayFocusCount }}</div>
          <div class="stat-label">今日专注次数</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-value">{{ formatDuration(todayFocusMinutes) }}</div>
          <div class="stat-label">今日专注时长</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-value">{{ stats.streakDays }}</div>
          <div class="stat-label">连续专注天数</div>
        </div>
      </div>
    </section>

    <!-- 专注历史 -->
    <section class="history-section">
      <PomodoroHistory :records="pomodoroRecords" />
    </section>
  </div>
</template>

<style scoped>
.pomodoro-view {
  min-height: 100vh;
  background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  padding-bottom: 100px;
}

/* 页面标题 */
.page-header {
  text-align: center;
  padding: 32px 20px 24px;
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.title-icon {
  font-size: 32px;
}

.page-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

/* 计时器区域 */
.timer-section {
  display: flex;
  justify-content: center;
  padding: 0 20px;
}

/* 统计区域 */
.stats-section {
  padding: 24px 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  background: var(--bg-primary);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  font-size: 24px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}

/* 历史记录区域 */
.history-section {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 响应式 */
@media (max-width: 640px) {
  .page-header {
    padding: 24px 16px 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .title-icon {
    font-size: 28px;
  }

  .page-subtitle {
    font-size: 14px;
  }

  .stats-section {
    padding: 16px;
  }

  .stats-grid {
    gap: 8px;
  }

  .stat-card {
    padding: 16px 12px;
  }

  .stat-icon {
    font-size: 20px;
  }

  .stat-value {
    font-size: 16px;
  }

  .stat-label {
    font-size: 11px;
  }

  .history-section {
    padding: 0 16px;
  }
}

@media (max-width: 380px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    flex-direction: row;
    justify-content: flex-start;
    gap: 16px;
    padding: 16px;
  }

  .stat-icon {
    font-size: 28px;
  }

  .stat-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
