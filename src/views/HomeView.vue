<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ReminderForm from '../components/ReminderForm.vue'
import ReminderList from '../components/ReminderList.vue'
import BannerAlert from '../components/BannerAlert.vue'
import EditModal from '../components/EditModal.vue'
import FloatingWidget from '../components/FloatingWidget.vue'
import FloatingAddButton from '../components/FloatingAddButton.vue'
import QuickAddModal from '../components/QuickAddModal.vue'
import { loadReminders, reminders } from '../stores/reminderStore.js'
import { reminderAlarm, requestNotificationPermission } from '../services/reminderAlarm.js'
import eventBus from '../utils/eventBus.js'
import { safeGet, safeSet } from '../utils/safeStorage.js'

// 当前正在编辑的提醒
const editingReminder = ref(null)

// 快速添加弹窗状态
const showQuickAdd = ref(false)

// 通知权限提示条状态
const showNotificationBanner = ref(false)

// 初始化提醒调度器
onMounted(async () => {
  await loadReminders()
  reminderAlarm.init(reminders.value)
  
  // 监听新提醒添加事件，自动调度
  eventBus.on('reminder:added', handleReminderAdded)
})

onUnmounted(() => {
  eventBus.off('reminder:added', handleReminderAdded)
})

// 处理新提醒添加
function handleReminderAdded(reminder) {
  reminderAlarm.schedule(reminder)
  
  // 首次添加提醒后显示通知权限提示条
  // 检查localStorage，如果用户之前点击过"稍后"或拒绝过，就不再显示
  const hasPromptShown = safeGet('notificationPromptShown')
  if (!hasPromptShown && reminderAlarm.getNotificationPermission() === 'default') {
    showNotificationBanner.value = true
  }
}

// 允许通知权限
async function handleAllowNotification() {
  const permission = await Notification.requestPermission()
  
  if (permission === 'granted') {
    // 发送测试通知
    new Notification('SkyDesk', {
      body: '通知权限已开启，您将准时收到所有提醒',
      icon: '/favicon.svg'
    })
  }
  
  // 无论用户同意还是拒绝，都标记为已显示，关闭提示条
  safeSet('notificationPromptShown', 'true')
  showNotificationBanner.value = false
}

// 稍后处理通知权限
function handleDismissNotification() {
  // 标记为已显示，以后不再弹出
  safeSet('notificationPromptShown', 'true')
  showNotificationBanner.value = false
}

function handleEdit(reminder) {
  editingReminder.value = reminder
}

function handleCloseEdit() {
  editingReminder.value = null
}

function handleEditSaved() {
  // 编辑保存后的回调（数据已通过 store 更新）
}

// 打开快速添加弹窗
function openQuickAdd() {
  showQuickAdd.value = true
}

// 关闭快速添加弹窗
function closeQuickAdd() {
  showQuickAdd.value = false
}

// 快速添加成功
function handleQuickAdded() {
  // 触发提醒列表刷新
  eventBus.emit('reminder:added')
}
</script>

<template>
  <div class="home-view">
    <!-- 通知权限提示条 -->
    <Transition name="banner-slide">
      <div v-if="showNotificationBanner" class="notification-banner">
        <span class="banner-text">为了能准时提醒您，请开启浏览器通知权限</span>
        <div class="banner-actions">
          <button class="banner-btn banner-btn-allow" @click="handleAllowNotification">允许</button>
          <button class="banner-btn banner-btn-dismiss" @click="handleDismissNotification">稍后</button>
        </div>
      </div>
    </Transition>
    
    <!-- 横幅提醒 -->
    <BannerAlert />
    
    <!-- 添加提醒表单 -->
    <ReminderForm />
    
    <!-- 提醒列表 -->
    <ReminderList @edit="handleEdit" />
    
    <!-- 编辑模态框 -->
    <EditModal
      :reminder="editingReminder"
      @close="handleCloseEdit"
      @saved="handleEditSaved"
    />
    
    <!-- 悬浮小挂件 -->
    <FloatingWidget />
    
    <!-- 悬浮添加按钮 -->
    <FloatingAddButton @click="openQuickAdd" />
    
    <!-- 快速添加弹窗 -->
    <QuickAddModal
      v-if="showQuickAdd"
      @close="closeQuickAdd"
      @added="handleQuickAdded"
    />
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* 通知权限提示条 - 浅灰色通栏设计 */
.notification-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 var(--space-md);
  background: #f5f7fa;
  border-bottom: 1px solid var(--bg-tertiary);
  gap: var(--space-md);
}

.banner-text {
  font-size: var(--text-body);
  color: var(--text-primary);
  font-weight: 400;
  flex: 1;
  text-align: left;
  line-height: var(--line-height-body);
}

.banner-actions {
  display: flex;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.banner-btn {
  padding: 6px var(--space-md);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: var(--line-height-caption);
}

.banner-btn-allow {
  background: var(--accent-blue);
  color: white;
}

.banner-btn-allow:hover {
  background: #0056d6;
}

.banner-btn-dismiss {
  background: transparent;
  color: var(--text-secondary);
}

.banner-btn-dismiss:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* 提示条动画 - 向上滑出 */
.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.3s ease;
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

@media (max-width: 640px) {
  .home-view {
    gap: var(--space-md);
  }
  
  .notification-banner {
    padding: 0 var(--space-sm);
    gap: var(--space-sm);
  }
  
  .banner-text {
    font-size: var(--text-caption);
  }
  
  .banner-btn {
    padding: 5px 12px;
    font-size: 11px;
  }
}
</style>
