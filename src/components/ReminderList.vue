<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import ReminderItem from './ReminderItem.vue'
import SwipeableItem from './SwipeableItem.vue'
import { upcomingReminders, todayReminders, completedReminders, tags, toggleComplete, deleteReminder } from '../stores/reminderStore.js'

const emit = defineEmits(['edit'])
const router = useRouter()

// 视图模式：'all' | 'today'
const viewMode = ref('all')

// 标签筛选
const activeFilter = ref('')

// 搜索关键词
const searchQuery = ref('')

// 搜索匹配函数
const matchesSearch = (reminder) => {
  if (!searchQuery.value.trim()) return true
  const query = searchQuery.value.toLowerCase().trim()
  const titleMatch = reminder.title.toLowerCase().includes(query)
  const tagMatch = reminder.tag && reminder.tag.toLowerCase().includes(query)
  return titleMatch || tagMatch
}

// 按标签和搜索筛选后的提醒
const filteredUpcoming = computed(() => {
  let result = upcomingReminders.value
  if (activeFilter.value) {
    result = result.filter(r => r.tag === activeFilter.value)
  }
  if (searchQuery.value.trim()) {
    result = result.filter(matchesSearch)
  }
  return result
})

const filteredCompleted = computed(() => {
  let result = completedReminders.value
  if (activeFilter.value) {
    result = result.filter(r => r.tag === activeFilter.value)
  }
  if (searchQuery.value.trim()) {
    result = result.filter(matchesSearch)
  }
  return result
})

// 按日期分组
const groupedReminders = computed(() => {
  const groups = {
    overdue: [],  // 过期任务
    today: [],
    tomorrow: [],
    future: [],
    completed: []
  }
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfterTomorrow = new Date(tomorrow)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)
  
  // 处理未完成的提醒
  filteredUpcoming.value.forEach(reminder => {
    const dt = new Date(reminder.datetime)
    
    // 过期任务单独分组并置顶
    if (dt < now) {
      groups.overdue.push(reminder)
    } else if (dt >= today && dt < tomorrow) {
      groups.today.push(reminder)
    } else if (dt >= tomorrow && dt < dayAfterTomorrow) {
      groups.tomorrow.push(reminder)
    } else {
      groups.future.push(reminder)
    }
  })
  
  // 已完成的提醒
  groups.completed = filteredCompleted.value.slice(0, 5)
  
  return groups
})

// 我的一天：只显示今天的任务
const myDayReminders = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // 今天的待办
  const todayTasks = upcomingReminders.value.filter(r => {
    const dt = new Date(r.datetime)
    return dt >= today && dt < tomorrow
  })
  
  // 今天的已完成
  const todayCompleted = completedReminders.value.filter(r => {
    const dt = new Date(r.datetime)
    return dt >= today && dt < tomorrow
  })
  
  return {
    upcoming: todayTasks,
    completed: todayCompleted
  }
})

function setFilter(tagName) {
  activeFilter.value = activeFilter.value === tagName ? '' : tagName
}

function handleEdit(reminder) {
  emit('edit', reminder)
}

// 跳转到标签管理页面
function goToTagsPage() {
  router.push('/tags')
}

// 滑动手势处理
async function handleSwipeComplete(reminder) {
  await toggleComplete(reminder.id)
}

async function handleSwipeDelete(reminder) {
  await deleteReminder(reminder.id)
}
</script>

<template>
  <div class="reminder-list">
    <!-- 视图切换 -->
    <div class="view-switcher">
      <button
        class="view-btn"
        :class="{ active: viewMode === 'all' }"
        @click="viewMode = 'all'"
      >
        全部
      </button>
      <button
        class="view-btn"
        :class="{ active: viewMode === 'today' }"
        @click="viewMode = 'today'"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        我的一天
      </button>
    </div>

    <!-- 搜索框 -->
    <div v-if="viewMode === 'all'" class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="🔍 搜索提醒..."
      />
    </div>

    <!-- 标签筛选 -->
    <div v-if="viewMode === 'all'" class="tag-filter">
      <button
        class="filter-btn"
        :class="{ active: activeFilter === '' }"
        @click="setFilter('')"
      >
        全部
      </button>
      <button
        v-for="tag in tags"
        :key="tag.id"
        class="filter-btn"
        :class="{ active: activeFilter === tag.name }"
        :style="activeFilter === tag.name ? { backgroundColor: tag.color + '20', borderColor: tag.color, color: tag.color } : {}"
        @click="setFilter(tag.name)"
      >
        {{ tag.icon }} {{ tag.name }}
      </button>
      <!-- 管理标签按钮 -->
      <button
        class="filter-btn manage-btn"
        @click="goToTagsPage"
        title="管理标签"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        管理
      </button>
    </div>
    
    <!-- 我的一天视图 -->
    <template v-if="viewMode === 'today'">
      <!-- 今日待办 -->
      <section v-if="myDayReminders.upcoming.length > 0" class="list-section">
        <h3 class="section-title">
          <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          今天的任务
          <span class="count">{{ myDayReminders.upcoming.length }}</span>
        </h3>
        <TransitionGroup name="list-item" tag="div" class="items">
          <SwipeableItem
            v-for="reminder in myDayReminders.upcoming"
            :key="reminder.id"
            :item="reminder"
            @complete="handleSwipeComplete"
            @delete="handleSwipeDelete"
          >
            <ReminderItem
              :reminder="reminder"
              @edit="handleEdit"
            />
          </SwipeableItem>
        </TransitionGroup>
      </section>

      <!-- 今日已完成 -->
      <section v-if="myDayReminders.completed.length > 0" class="list-section completed-section">
        <h3 class="section-title">
          <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          今日已完成
          <span class="count">{{ myDayReminders.completed.length }}</span>
        </h3>
        <TransitionGroup name="list-item" tag="div" class="items">
          <SwipeableItem
            v-for="reminder in myDayReminders.completed"
            :key="reminder.id"
            :item="reminder"
            @complete="handleSwipeComplete"
            @delete="handleSwipeDelete"
          >
            <ReminderItem
              :reminder="reminder"
              @edit="handleEdit"
            />
          </SwipeableItem>
        </TransitionGroup>
      </section>

      <!-- 我的一天空状态 -->
      <div v-if="myDayReminders.upcoming.length === 0 && myDayReminders.completed.length === 0" class="empty-state">
        <div class="empty-state-icon">☀️</div>
        <div class="empty-state-title">今天还没有任务</div>
        <div class="empty-state-desc">享受美好的一天，或者添加一些任务</div>
      </div>
    </template>

    <!-- 全部视图 -->
    <template v-else>
      <!-- 已过期提醒（置顶显示） -->
      <section v-if="groupedReminders.overdue.length > 0" class="list-section">
        <h3 class="section-title overdue-title">
          <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          已过期
          <span class="count overdue-count">{{ groupedReminders.overdue.length }}</span>
        </h3>
        <TransitionGroup name="list-item" tag="div" class="items">
          <SwipeableItem
            v-for="reminder in groupedReminders.overdue"
            :key="reminder.id"
            :item="reminder"
            @complete="handleSwipeComplete"
            @delete="handleSwipeDelete"
          >
            <ReminderItem
              :reminder="reminder"
              @edit="handleEdit"
            />
          </SwipeableItem>
        </TransitionGroup>
      </section>

      <!-- 今日提醒 -->
      <section v-if="groupedReminders.today.length > 0" class="list-section">
        <h3 class="section-title">
          <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          今天
          <span class="count">{{ groupedReminders.today.length }}</span>
        </h3>
        <TransitionGroup name="list-item" tag="div" class="items">
          <SwipeableItem
            v-for="reminder in groupedReminders.today"
            :key="reminder.id"
            :item="reminder"
            @complete="handleSwipeComplete"
            @delete="handleSwipeDelete"
          >
            <ReminderItem
              :reminder="reminder"
              @edit="handleEdit"
            />
          </SwipeableItem>
        </TransitionGroup>
      </section>
    
    <!-- 明天提醒 -->
    <section v-if="groupedReminders.tomorrow.length > 0" class="list-section">
      <h3 class="section-title">
        <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 18a5 5 0 0 0-10 0"></path>
          <line x1="12" y1="9" x2="12" y2="2"></line>
          <line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line>
          <line x1="1" y1="18" x2="3" y2="18"></line>
          <line x1="21" y1="18" x2="23" y2="18"></line>
          <line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line>
        </svg>
        明天
        <span class="count">{{ groupedReminders.tomorrow.length }}</span>
      </h3>
      <TransitionGroup name="list-item" tag="div" class="items">
        <SwipeableItem
          v-for="reminder in groupedReminders.tomorrow"
          :key="reminder.id"
          :item="reminder"
          @complete="handleSwipeComplete"
          @delete="handleSwipeDelete"
        >
          <ReminderItem
            :reminder="reminder"
            @edit="handleEdit"
          />
        </SwipeableItem>
      </TransitionGroup>
    </section>
    
    <!-- 未来提醒 -->
    <section v-if="groupedReminders.future.length > 0" class="list-section">
      <h3 class="section-title">
        <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
          <path d="M8 14h.01"></path>
          <path d="M12 14h.01"></path>
          <path d="M16 14h.01"></path>
          <path d="M8 18h.01"></path>
          <path d="M12 18h.01"></path>
          <path d="M16 18h.01"></path>
        </svg>
        未来
        <span class="count">{{ groupedReminders.future.length }}</span>
      </h3>
      <TransitionGroup name="list-item" tag="div" class="items">
        <SwipeableItem
          v-for="reminder in groupedReminders.future"
          :key="reminder.id"
          :item="reminder"
          @complete="handleSwipeComplete"
          @delete="handleSwipeDelete"
        >
          <ReminderItem
            :reminder="reminder"
            @edit="handleEdit"
          />
        </SwipeableItem>
      </TransitionGroup>
    </section>
    
    <!-- 已完成的提醒 -->
    <section v-if="groupedReminders.completed.length > 0" class="list-section completed-section">
      <h3 class="section-title">
        <svg class="section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        已完成
        <span class="count">{{ groupedReminders.completed.length }}</span>
      </h3>
      <TransitionGroup name="list-item" tag="div" class="items">
        <SwipeableItem
          v-for="reminder in groupedReminders.completed"
          :key="reminder.id"
          :item="reminder"
          @complete="handleSwipeComplete"
          @delete="handleSwipeDelete"
        >
          <ReminderItem
            :reminder="reminder"
            @edit="handleEdit"
          />
        </SwipeableItem>
      </TransitionGroup>
    </section>
    
    <!-- 搜索无结果 -->
    <div v-if="searchQuery.trim() && groupedReminders.today.length === 0 && groupedReminders.tomorrow.length === 0 && groupedReminders.future.length === 0 && groupedReminders.completed.length === 0" class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-title">没有找到匹配的提醒</div>
      <div class="empty-state-desc">请尝试其他关键词</div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="upcomingReminders.length === 0 && completedReminders.length === 0" class="empty-state">
      <div class="empty-state-illustration">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <rect x="20" y="30" width="80" height="70" rx="8" fill="#f0f0f0" stroke="#d0d0d0" stroke-width="2"/>
          <line x1="35" y1="50" x2="85" y2="50" stroke="#d0d0d0" stroke-width="3" stroke-linecap="round"/>
          <line x1="35" y1="65" x2="75" y2="65" stroke="#d0d0d0" stroke-width="3" stroke-linecap="round"/>
          <line x1="35" y1="80" x2="65" y2="80" stroke="#d0d0d0" stroke-width="3" stroke-linecap="round"/>
          <circle cx="90" cy="25" r="15" fill="#007aff" opacity="0.1"/>
          <path d="M85 25L88 28L95 21" stroke="#007aff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="empty-state-title">还没有提醒 📋</div>
      <div class="empty-state-desc">点击上方输入框，创建你的第一个提醒吧！</div>
    </div>

    <!-- 只有已完成，没有待办 -->
    <div v-else-if="upcomingReminders.length === 0" class="empty-state all-completed">
      <div class="empty-state-icon">🎉</div>
      <div class="empty-state-title">太棒了！</div>
      <div class="empty-state-desc">所有提醒都已完成</div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.reminder-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* 视图切换 */
.view-switcher {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
}

.view-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: var(--text-body);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.view-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.view-btn.active {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: white;
}

.view-btn svg {
  width: 16px;
  height: 16px;
}

/* 搜索框 */
.search-box {
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--text-body);
  line-height: var(--line-height-body);
  transition: all var(--transition-fast);
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.tag-filter {
  display: flex;
  gap: var(--space-sm);
  overflow-x: auto;
  padding: var(--space-xs) 0;
  -webkit-overflow-scrolling: touch;
}

.tag-filter::-webkit-scrollbar {
  display: none;
}

.filter-btn {
  padding: 6px 16px;
  background: var(--bg-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
  line-height: var(--line-height-caption);
}

.filter-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.filter-btn.active {
  font-weight: 600;
  background: rgba(0, 122, 255, 0.12);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.manage-btn {
  color: var(--accent-blue);
  background: rgba(0, 122, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 4px;
}

.manage-btn:hover {
  background: rgba(0, 122, 255, 0.15);
}

.list-section {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  box-shadow: var(--shadow-md);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-h2);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-md) 0;
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--bg-tertiary);
  line-height: var(--line-height-h2);
}

.section-icon {
  color: var(--text-secondary);
}

.count {
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  margin-left: auto;
  line-height: var(--line-height-caption);
}

.items {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.completed-section {
  opacity: 0.8;
}

.completed-section .section-title {
  color: var(--text-secondary);
}

/* 过期任务标题 */
.overdue-title {
  color: var(--accent-red) !important;
}

.overdue-title .section-icon {
  color: var(--accent-red);
}

.overdue-count {
  background: rgba(255, 59, 48, 0.15);
  color: var(--accent-red);
}

.empty-state {
  padding: 60px var(--space-md);
  text-align: center;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: var(--space-md);
  opacity: 0.6;
}

.empty-state-illustration {
  margin-bottom: var(--space-md);
  opacity: 0.8;
}

.empty-state-title {
  font-size: var(--text-h2);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
  line-height: var(--line-height-h2);
}

.empty-state-desc {
  font-size: var(--text-body);
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}

.all-completed .empty-state-icon {
  opacity: 1;
}

/* 列表项动画 - 添加时从上方滑入，删除时向右滑出 */
.list-item-enter-active {
  transition: all 0.2s ease;
}

.list-item-leave-active {
  transition: all 0.2s ease;
}

.list-item-move-active {
  transition: transform 0.2s ease;
}

.list-item-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.list-item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@media (max-width: 640px) {
  .reminder-list {
    gap: var(--space-md);
  }
  
  .list-section {
    padding: var(--space-md);
  }
  
  .section-title {
    margin-bottom: var(--space-sm);
    padding-bottom: 10px;
  }
  
  .empty-state {
    padding: 40px var(--space-md);
  }
  
  .empty-state-icon {
    font-size: 48px;
  }
}
</style>
