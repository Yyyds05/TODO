<script setup>
import { ref, computed, onMounted } from 'vue'
import WeekView from '../components/WeekView.vue'
import MonthView from '../components/MonthView.vue'
import EditModal from '../components/EditModal.vue'
import { reminders, loadReminders } from '../stores/reminderStore.js'

// 视图模式：week 或 month
const mode = ref('week')

// 当前日期（用于计算显示范围）
const currentDate = ref(new Date())

// 正在编辑的提醒
const editingReminder = ref(null)

// 加载提醒数据
onMounted(async () => {
  await loadReminders()
})

// 计算日期范围标题
const dateRangeTitle = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth() + 1
  
  if (mode.value === 'month') {
    return `${year}年${month}月`
  }
  
  // 周视图：计算周一和周日
  const date = new Date(currentDate.value)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // 周一为第一天
  const monday = new Date(date.setDate(diff))
  const sunday = new Date(date.setDate(diff + 6))
  
  const formatMonthDay = (d) => `${d.getMonth() + 1}月${d.getDate()}日`
  
  if (monday.getMonth() === sunday.getMonth()) {
    return `${year}年${formatMonthDay(monday)} - ${sunday.getDate()}日`
  } else if (monday.getFullYear() === sunday.getFullYear()) {
    return `${year}年${formatMonthDay(monday)} - ${formatMonthDay(sunday)}`
  } else {
    return `${monday.getFullYear()}年${formatMonthDay(monday)} - ${sunday.getFullYear()}年${formatMonthDay(sunday)}`
  }
})

// 切换视图模式
function switchMode(newMode) {
  mode.value = newMode
}

// 上一周/上一月
function goPrev() {
  const date = new Date(currentDate.value)
  if (mode.value === 'week') {
    date.setDate(date.getDate() - 7)
  } else {
    date.setMonth(date.getMonth() - 1)
  }
  currentDate.value = date
}

// 下一周/下一月
function goNext() {
  const date = new Date(currentDate.value)
  if (mode.value === 'week') {
    date.setDate(date.getDate() + 7)
  } else {
    date.setMonth(date.getMonth() + 1)
  }
  currentDate.value = date
}

// 回到今天
function goToday() {
  currentDate.value = new Date()
}

// 处理编辑提醒
function handleEdit(reminder) {
  editingReminder.value = reminder
}

function handleCloseEdit() {
  editingReminder.value = null
}

function handleEditSaved() {
  // 编辑保存后的回调
}
</script>

<template>
  <div class="calendar-view">
    <!-- 顶部控制栏 -->
    <div class="calendar-header">
      <div class="header-top">
        <h1 class="page-title">日历</h1>
        <button class="today-btn" @click="goToday">今天</button>
      </div>
      
      <!-- 视图切换 -->
      <div class="view-controls">
        <div class="mode-switcher">
          <button 
            class="mode-btn" 
            :class="{ active: mode === 'week' }"
            @click="switchMode('week')"
          >
            周视图
          </button>
          <button 
            class="mode-btn" 
            :class="{ active: mode === 'month' }"
            @click="switchMode('month')"
          >
            月视图
          </button>
        </div>
        
        <div class="nav-controls">
          <button class="nav-btn" @click="goPrev">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="date-range">{{ dateRangeTitle }}</span>
          <button class="nav-btn today-nav-btn" @click="goToday">
            今天
          </button>
          <button class="nav-btn" @click="goNext">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M8 4L14 10L8 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 视图内容 -->
    <div class="calendar-content">
      <WeekView 
        v-if="mode === 'week'" 
        :current-date="currentDate"
        :reminders="reminders"
        @edit="handleEdit"
      />
      <MonthView 
        v-else 
        :current-date="currentDate"
        :reminders="reminders"
        @edit="handleEdit"
      />
    </div>
    
    <!-- 编辑模态框 -->
    <EditModal
      :reminder="editingReminder"
      @close="handleCloseEdit"
      @saved="handleEditSaved"
    />
  </div>
</template>

<style scoped>
.calendar-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-bottom: 80px;
}

.calendar-header {
  background: var(--bg-primary);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-md);
  box-shadow: var(--shadow-sm);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.today-btn {
  padding: 8px 16px;
  background: var(--accent-blue);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.today-btn:hover {
  background: #0056d6;
  transform: translateY(-1px);
}

.view-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.mode-switcher {
  display: flex;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 4px;
}

.mode-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-btn:hover {
  color: var(--text-primary);
}

.mode-btn.active {
  background: var(--bg-primary);
  color: var(--accent-blue);
  box-shadow: var(--shadow-sm);
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.nav-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.nav-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-btn.today-nav-btn {
  width: auto;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 500;
}

.date-range {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 200px;
  text-align: center;
}

.calendar-content {
  flex: 1;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

@media (max-width: 640px) {
  .calendar-header {
    padding: var(--space-md);
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .view-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .mode-switcher {
    justify-content: center;
  }
  
  .nav-controls {
    justify-content: center;
  }
  
  .date-range {
    min-width: 160px;
    font-size: 14px;
  }
}
</style>