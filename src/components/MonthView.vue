<script setup>
import { ref, computed } from 'vue'
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

// 选中的日期（用于显示弹出层）
const selectedDate = ref(null)

// 星期名称
const weekDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

// 计算月份网格数据
const monthGrid = computed(() => {
  const year = props.currentDate.getFullYear()
  const month = props.currentDate.getMonth()
  
  // 本月第一天
  const firstDay = new Date(year, month, 1)
  // 本月最后一天
  const lastDay = new Date(year, month + 1, 0)
  
  // 获取本月第一天是星期几（0是周日，转换为周一为第一天）
  let firstDayOfWeek = firstDay.getDay()
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // 周一为0，周日为6
  
  // 计算需要显示的上月天数
  const daysFromPrevMonth = firstDayOfWeek
  
  // 计算需要显示的下月天数（6行7列 = 42格）
  const totalCells = 42
  const daysInMonth = lastDay.getDate()
  const daysFromNextMonth = totalCells - daysFromPrevMonth - daysInMonth
  
  const grid = []
  
  // 上月的日期
  const prevMonth = new Date(year, month, 0)
  const daysInPrevMonth = prevMonth.getDate()
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const date = new Date(year, month - 1, day)
    date.setHours(0, 0, 0, 0)
    grid.push({
      date,
      day,
      isCurrentMonth: false,
      isToday: false
    })
  }
  
  // 本月的日期
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0)
    grid.push({
      date,
      day,
      isCurrentMonth: true,
      isToday: date.getTime() === today.getTime()
    })
  }
  
  // 下月的日期
  for (let day = 1; day <= daysFromNextMonth; day++) {
    const date = new Date(year, month + 1, day)
    date.setHours(0, 0, 0, 0)
    grid.push({
      date,
      day,
      isCurrentMonth: false,
      isToday: false
    })
  }
  
  return grid
})

// 获取某天的提醒数量
function getReminderCount(date) {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)
  
  return props.reminders.filter(r => {
    const dt = new Date(r.datetime)
    return !r.completed && dt >= dayStart && dt <= dayEnd
  }).length
}

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

// 格式化时间
function formatTime(datetime) {
  const date = new Date(datetime)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 点击日期格子
function handleDayClick(dayInfo) {
  if (getReminderCount(dayInfo.date) > 0) {
    selectedDate.value = selectedDate.value?.getTime() === dayInfo.date.getTime() 
      ? null 
      : dayInfo.date
  }
}

// 关闭弹出层
function closePopup() {
  selectedDate.value = null
}

// 点击提醒项
function handleReminderClick(reminder) {
  emit('edit', reminder)
  closePopup()
}

// 获取标签颜色
function getTagColor(tag) {
  const tagInfo = getTagInfo(tag)
  return tagInfo ? tagInfo.color : '#86868b'
}

// 格式化选中日期显示
function formatSelectedDate() {
  if (!selectedDate.value) return ''
  const d = selectedDate.value
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`
}
</script>

<template>
  <div class="month-view" @click.self="closePopup">
    <!-- 星期标题行 -->
    <div class="weekdays-header">
      <div v-for="name in weekDayNames" :key="name" class="weekday-name">
        {{ name }}
      </div>
    </div>
    
    <!-- 月份网格 -->
    <div class="month-grid">
      <div 
        v-for="(day, index) in monthGrid" 
        :key="index"
        class="day-cell"
        :class="{
          'other-month': !day.isCurrentMonth,
          'today': day.isToday,
          'has-reminders': getReminderCount(day.date) > 0,
          'selected': selectedDate && selectedDate.getTime() === day.date.getTime()
        }"
        @click.stop="handleDayClick(day)"
      >
        <span class="day-number">{{ day.day }}</span>
        
        <!-- 提醒数量标记 -->
        <div v-if="getReminderCount(day.date) > 0" class="reminder-dots">
          <span 
            v-for="i in Math.min(getReminderCount(day.date), 3)" 
            :key="i" 
            class="dot"
          ></span>
          <span v-if="getReminderCount(day.date) > 3" class="dot-count">
            +{{ getReminderCount(day.date) - 3 }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- 选中日期的提醒弹出层 -->
    <Transition name="popup">
      <div v-if="selectedDate" class="reminder-popup">
        <div class="popup-header">
          <h3 class="popup-title">{{ formatSelectedDate() }}</h3>
          <button class="popup-close" @click="closePopup">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M14 4L4 14M4 4L14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        
        <div class="popup-content">
          <div 
            v-for="reminder in getRemindersForDay(selectedDate)" 
            :key="reminder.id"
            class="popup-reminder-item"
            @click="handleReminderClick(reminder)"
          >
            <span 
              class="tag-indicator" 
              :style="{ backgroundColor: getTagColor(reminder.tag) }"
            ></span>
            <div class="reminder-info">
              <span class="reminder-time">{{ formatTime(reminder.datetime) }}</span>
              <span class="reminder-title">{{ reminder.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.month-view {
  position: relative;
  padding: 8px;
}

.weekdays-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}

.weekday-name {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  padding: 8px 0;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  min-height: 44px;
}

.day-cell:hover {
  background: var(--bg-secondary);
}

.day-cell.other-month {
  opacity: 0.4;
}

.day-cell.today {
  background: rgba(0, 122, 255, 0.1);
}

.day-cell.today .day-number {
  color: var(--accent-blue);
  font-weight: 700;
}

.day-cell.selected {
  background: rgba(0, 122, 255, 0.15);
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.reminder-dots {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 2px;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-blue);
}

.dot-count {
  font-size: 10px;
  color: var(--accent-blue);
  font-weight: 600;
  margin-left: 2px;
}

/* 弹出层样式 */
.reminder-popup {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  min-width: 280px;
  max-width: 90%;
  max-height: 60%;
  overflow: hidden;
  z-index: 100;
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--bg-tertiary);
}

.popup-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.popup-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.popup-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.popup-content {
  padding: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.popup-reminder-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.popup-reminder-item:hover {
  background: var(--bg-secondary);
}

.tag-indicator {
  width: 4px;
  height: 32px;
  border-radius: 2px;
  flex-shrink: 0;
}

.reminder-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.popup-reminder-item .reminder-time {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.popup-reminder-item .reminder-title {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 弹出层过渡动画 */
.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.2s ease;
}

.popup-enter-from,
.popup-leave-to {
  opacity: 0;
}

@media (max-width: 480px) {
  .month-view {
    padding: 4px;
  }
  
  .day-cell {
    min-height: 36px;
    padding: 2px;
  }
  
  .day-number {
    font-size: 12px;
  }
  
  .dot {
    width: 4px;
    height: 4px;
  }
  
  .reminder-popup {
    min-width: 260px;
  }
}
</style>