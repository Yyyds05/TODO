<script setup>
import { computed } from 'vue'

const props = defineProps({
  reminders: {
    type: Array,
    default: () => []
  }
})

// 获取最近7天的日期标签
const weekDays = computed(() => {
  const days = []
  const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const today = new Date()
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dayIndex = date.getDay()
    const isToday = i === 0
    
    days.push({
      fullDate: date,
      label: isToday ? '今天' : weekDayNames[dayIndex],
      dateStr: date.toISOString().split('T')[0],
      isToday
    })
  }
  
  return days
})

// 计算每天完成的提醒数量
const dailyStats = computed(() => {
  return weekDays.value.map(day => {
    const completedCount = props.reminders.filter(r => {
      if (!r.completed || !r.updatedAt) return false
      const completedDate = new Date(r.updatedAt)
      const dayStart = new Date(day.fullDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      
      return completedDate >= dayStart && completedDate < dayEnd
    }).length
    
    return {
      ...day,
      count: completedCount
    }
  })
})

// 最大数量用于计算柱状图高度
const maxCount = computed(() => {
  const counts = dailyStats.value.map(d => d.count)
  const max = Math.max(...counts)
  return max === 0 ? 1 : max // 避免除以0
})

// 总完成数量
const totalCompleted = computed(() => {
  return dailyStats.value.reduce((sum, day) => sum + day.count, 0)
})
</script>

<template>
  <div class="weekly-trend">
    <div class="chart-header">
      <h3 class="chart-title">
        <span class="title-icon">📈</span>
        每周趋势
      </h3>
      <span class="chart-subtitle">本周完成 {{ totalCompleted }} 项</span>
    </div>
    
    <div v-if="totalCompleted > 0" class="chart-content">
      <div class="bar-chart">
        <div
          v-for="day in dailyStats"
          :key="day.dateStr"
          class="day-column"
          :class="{ 'today': day.isToday }"
        >
          <div class="bar-wrapper">
            <div
              class="bar"
              :style="{
                height: (day.count / maxCount * 100) + '%',
                minHeight: day.count > 0 ? '4px' : '0'
              }"
            ></div>
            <div v-if="day.count > 0" class="bar-tooltip">
              {{ day.count }} 项
            </div>
          </div>
          <div class="day-label">{{ day.label }}</div>
        </div>
      </div>
      
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-dot today"></div>
          <span>今天</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot normal"></div>
          <span>已完成</span>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <div class="empty-icon">📊</div>
      <div class="empty-title">暂无数据</div>
      <div class="empty-desc">本周还没有完成的提醒</div>
    </div>
  </div>
</template>

<style scoped>
.weekly-trend {
  background-color: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--space-lg);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.title-icon {
  font-size: 20px;
}

.chart-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.chart-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.bar-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 160px;
  padding: var(--space-sm) 0;
  gap: 8px;
}

.day-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.day-column.today .day-label {
  color: var(--accent-blue);
  font-weight: 600;
}

.day-column.today .bar {
  background-color: var(--accent-blue);
}

.bar-wrapper {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}

.bar {
  width: 100%;
  max-width: 32px;
  background: linear-gradient(180deg, var(--accent-green) 0%, #2da846 100%);
  border-radius: var(--radius-sm) var(--radius-sm) 4px 4px;
  transition: height 0.5s ease;
  position: relative;
}

.bar:hover {
  opacity: 0.85;
}

.bar-tooltip {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--text-primary);
  color: white;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-fast);
  z-index: 10;
}

.bar-wrapper:hover .bar-tooltip {
  opacity: 1;
  visibility: visible;
}

.bar-tooltip::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid var(--text-primary);
}

.day-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
  text-align: center;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: var(--space-lg);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--bg-tertiary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.today {
  background-color: var(--accent-blue);
}

.legend-dot.normal {
  background: linear-gradient(180deg, var(--accent-green) 0%, #2da846 100%);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-md);
  opacity: 0.4;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .weekly-trend {
    padding: var(--space-md);
  }

  .chart-header {
    margin-bottom: var(--space-md);
  }

  .chart-title {
    font-size: 15px;
  }

  .title-icon {
    font-size: 18px;
  }

  .bar-chart {
    height: 120px;
    gap: 4px;
  }

  .bar {
    max-width: 24px;
  }

  .day-label {
    font-size: 11px;
  }

  .day-column {
    gap: 6px;
  }

  .chart-legend {
    gap: var(--space-md);
  }
}
</style>
