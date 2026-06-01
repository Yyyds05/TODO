<script setup>
import { computed } from 'vue'

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  }
})

// 模式映射
const MODE_MAP = {
  focus: { label: '专注', color: '#007aff', icon: '🎯' },
  shortBreak: { label: '短休息', color: '#34c759', icon: '☕' },
  longBreak: { label: '长休息', color: '#af52de', icon: '😴' }
}

// 按日期分组的历史记录
const groupedRecords = computed(() => {
  const groups = {
    today: { label: '今天', records: [] },
    yesterday: { label: '昨天', records: [] },
    earlier: { label: '更早', records: [] }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  props.records.forEach(record => {
    const recordDate = new Date(record.startTime)
    const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())

    if (recordDay.getTime() === today.getTime()) {
      groups.today.records.push(record)
    } else if (recordDay.getTime() === yesterday.getTime()) {
      groups.yesterday.records.push(record)
    } else {
      groups.earlier.records.push(record)
    }
  })

  // 按时间倒序排序
  Object.keys(groups).forEach(key => {
    groups[key].records.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
  })

  return groups
})

// 格式化时长
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }
  return `${minutes}分钟`
}

// 格式化时间
function formatTime(isoString) {
  const date = new Date(isoString)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取模式信息
function getModeInfo(mode) {
  return MODE_MAP[mode] || MODE_MAP.focus
}
</script>

<template>
  <div class="pomodoro-history">
    <h3 class="history-title">专注记录</h3>

    <!-- 空状态 -->
    <div v-if="records.length === 0" class="empty-state">
      <div class="empty-icon">📝</div>
      <p class="empty-text">还没有专注记录</p>
      <p class="empty-subtext">开始一次专注，记录你的成长</p>
    </div>

    <!-- 记录列表 -->
    <div v-else class="history-list">
      <template v-for="(group, key) in groupedRecords" :key="key">
        <div v-if="group.records.length > 0" class="history-group">
          <div class="group-header">{{ group.label }}</div>
          <div class="group-items">
            <div
              v-for="record in group.records"
              :key="record.id"
              class="history-item"
              :class="{ completed: record.completed, skipped: record.skipped }"
            >
              <div class="item-icon" :style="{ backgroundColor: getModeInfo(record.mode).color + '20' }">
                <span>{{ getModeInfo(record.mode).icon }}</span>
              </div>
              <div class="item-content">
                <div class="item-header">
                  <span class="item-name">{{ record.taskName }}</span>
                  <span class="item-mode" :style="{ color: getModeInfo(record.mode).color }">
                    {{ getModeInfo(record.mode).label }}
                  </span>
                </div>
                <div class="item-meta">
                  <span class="item-time">{{ formatTime(record.startTime) }}</span>
                  <span class="item-duration">{{ formatDuration(record.duration) }}</span>
                  <span v-if="record.completed" class="item-status completed">已完成</span>
                  <span v-else-if="record.skipped" class="item-status skipped">已跳过</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pomodoro-history {
  padding: 20px;
}

.history-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 4px 0;
}

.empty-subtext {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}

/* 历史列表 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.history-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 4px;
}

.group-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.history-item:hover {
  background: var(--bg-tertiary);
}

.history-item.skipped {
  opacity: 0.7;
}

.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-icon span {
  font-size: 18px;
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.item-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-mode {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  flex-shrink: 0;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.item-time {
  font-variant-numeric: tabular-nums;
}

.item-duration {
  color: var(--text-tertiary);
}

.item-status {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: auto;
}

.item-status.completed {
  color: #34c759;
  background: rgba(52, 199, 89, 0.1);
}

.item-status.skipped {
  color: #ff9500;
  background: rgba(255, 149, 0, 0.1);
}

/* 响应式 */
@media (max-width: 640px) {
  .pomodoro-history {
    padding: 16px;
  }

  .history-title {
    font-size: 16px;
  }

  .history-item {
    padding: 10px;
  }

  .item-icon {
    width: 36px;
    height: 36px;
  }

  .item-icon span {
    font-size: 16px;
  }

  .item-name {
    font-size: 14px;
  }

  .item-meta {
    font-size: 12px;
    gap: 8px;
  }
}
</style>
