<script setup>
import { computed } from 'vue'
import { getTagInfo } from '../stores/reminderStore.js'

const props = defineProps({
  currentDate: {
    type: Date,
    required: true
  },
  reminders: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['edit'])

// 星期名称
const weekDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

// 计算当前周的日期列表
const weekDays = computed(() => {
  const days = []
  const date = new Date(props.currentDate)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // 周一为第一天
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(date)
    d.setDate(diff + i)
    d.setHours(0, 0, 0, 0)
    days.push(d)
  }
  
  return days
})

// 今天的日期（不含时间）
const today = computed(() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
})

// 获取某天的提醒列表
function getRemindersForDay(date) {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)
  
  return props.reminders
    .filter(r => {
      const dt = new Date(r.datetime)
      return !r.completed && dt >= dayStart && dt <= dayEnd
    })
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
}

// 格式化时间显示
function formatTime(datetime) {
  const date = new Date(datetime)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化日期显示
function formatDay(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 判断是否是今天
function isToday(date) {
  return date.getTime() === today.value
}

// 处理点击提醒
function handleReminderClick(reminder) {
  emit('edit', reminder)
}

// 获取标签颜色
function getTagColor(tag) {
  const tagInfo = getTagInfo(tag)
  return tagInfo ? tagInfo.color : '#86868b'
}
</script>

<template>
  <div class="week-view">
    <!-- 星期标题行 -->
    <div class="week-header">
      <div 
        v-for="(day, index) in weekDays" 
        :key="index"
        class="day-header"
        :class="{ today: isToday(day) }"
      >
        <span class="day-name">{{ weekDayNames[index] }}</span>
        <span class="day-date">{{ formatDay(day) }}</span>
      </div>
    </div>
    
    <!-- 日历网格 -->
    <div class="week-body">
      <div 
        v-for="(day, index) in weekDays" 
        :key="index"
        class="day-column"
        :class="{ today: isToday(day) }"
      >
        <!-- 提醒列表 -->
        <div class="reminders-list">
          <div 
            v-for="reminder in getRemindersForDay(day)" 
            :key="reminder.id"
            class="reminder-item"
            @click="handleReminderClick(reminder)"
          >
            <span 
              class="tag-dot" 
              :style="{ backgroundColor: getTagColor(reminder.tag) }"
            ></span>
            <span class="reminder-time">{{ formatTime(reminder.datetime) }}</span>
            <span class="reminder-title">{{ reminder.title }}</span>
          </div>
          
          <!-- 空状态 -->
          <div v-if="getRemindersForDay(day).length === 0" class="empty-day">
            <span class="empty-text">无提醒</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.week-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--bg-tertiary);
}

.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  gap: 4px;
}

.day-header.today {
  background: rgba(0, 122, 255, 0.1);
}

.day-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.day-header.today .day-name {
  color: var(--accent-blue);
}

.day-date {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.day-header.today .day-date {
  color: var(--accent-blue);
}

.week-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex: 1;
  overflow-x: auto;
}

.day-column {
  border-right: 1px solid var(--bg-tertiary);
  min-height: 300px;
  overflow-y: auto;
}

.day-column:last-child {
  border-right: none;
}

.day-column.today {
  background: rgba(0, 122, 255, 0.03);
  border-left: 3px solid var(--accent-blue);
}

.reminders-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}

.reminder-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-left: 3px solid transparent;
}

.reminder-item:hover {
  background: var(--bg-tertiary);
  transform: translateX(2px);
}

.tag-dot {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.reminder-item {
  position: relative;
  padding-left: 20px;
}

.reminder-time {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.reminder-title {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-day {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 8px;
}

.empty-text {
  font-size: 12px;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .week-view {
    min-height: auto;
  }
  
  .week-header {
    min-width: 600px;
  }
  
  .week-body {
    min-width: 600px;
  }
  
  .day-column {
    min-width: 85px;
    min-height: 200px;
  }
}

@media (max-width: 480px) {
  .day-header {
    padding: 8px 4px;
  }
  
  .day-name {
    font-size: 11px;
  }
  
  .day-date {
    font-size: 14px;
  }
  
  .reminders-list {
    padding: 4px;
  }
  
  .reminder-item {
    padding: 6px 8px 6px 16px;
  }
  
  .reminder-time {
    font-size: 10px;
  }
  
  .reminder-title {
    font-size: 12px;
  }
}
</style>