<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { upcomingReminders, formatDateTime, getTagInfo } from '../stores/reminderStore.js'

// 展开/收起状态
const isExpanded = ref(false)

// 拖拽状态
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const position = ref({ x: 20, y: 80 }) // 默认右下角

// 倒计时
const countdown = ref('')
let countdownTimer = null

// 下一个提醒
const nextReminder = computed(() => {
  if (upcomingReminders.value.length === 0) return null
  return upcomingReminders.value[0]
})

// 下一个提醒的标签信息
const nextTagInfo = computed(() => {
  if (!nextReminder.value) return null
  return getTagInfo(nextReminder.value.tag)
})

// 更新倒计时
function updateCountdown() {
  if (!nextReminder.value) {
    countdown.value = ''
    return
  }
  
  const now = new Date()
  const target = new Date(nextReminder.value.datetime)
  const diff = target - now
  
  if (diff <= 0) {
    countdown.value = '已到期'
    return
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  if (days > 0) {
    countdown.value = `${days}天 ${hours}时 ${minutes}分`
  } else if (hours > 0) {
    countdown.value = `${hours}时 ${minutes}分 ${seconds}秒`
  } else if (minutes > 0) {
    countdown.value = `${minutes}分 ${seconds}秒`
  } else {
    countdown.value = `${seconds}秒`
  }
}

// 切换展开/收起
function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

// 拖拽开始
function onDragStart(e) {
  if (e.target.closest('.widget-detail')) return // 点击详情区域不触发拖拽
  
  isDragging.value = true
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  
  const rect = e.currentTarget.getBoundingClientRect()
  dragOffset.value = {
    x: clientX - rect.left,
    y: clientY - rect.top
  }
  
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('touchmove', onDragMove, { passive: false })
  document.addEventListener('touchend', onDragEnd)
}

// 拖拽移动
function onDragMove(e) {
  if (!isDragging.value) return
  e.preventDefault()
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  
  position.value = {
    x: Math.max(0, Math.min(window.innerWidth - 80, clientX - dragOffset.value.x)),
    y: Math.max(0, Math.min(window.innerHeight - 80, clientY - dragOffset.value.y))
  }
}

// 拖拽结束
function onDragEnd() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', onDragEnd)
}

onMounted(() => {
  countdownTimer = setInterval(updateCountdown, 1000)
  updateCountdown()
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<template>
  <div
    v-if="nextReminder"
    class="floating-widget"
    :class="{ expanded: isExpanded, dragging: isDragging }"
    :style="{ right: position.x + 'px', bottom: position.y + 'px' }"
    @mousedown="onDragStart"
    @touchstart="onDragStart"
  >
    <!-- 收起状态：紧凑圆形 -->
    <div class="widget-compact" @click="toggleExpand">
      <div class="widget-pulse"></div>
      <span class="widget-countdown-text">{{ countdown }}</span>
    </div>
    
    <!-- 展开状态：详情卡片 -->
    <Transition name="expand">
      <div v-if="isExpanded" class="widget-detail" @click.stop>
        <div class="detail-header">
          <span class="detail-title">下一个提醒</span>
          <button class="detail-close" @click="toggleExpand">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="detail-body">
          <div class="detail-reminder-title">{{ nextReminder.title }}</div>
          <div class="detail-meta">
            <span class="detail-time">{{ formatDateTime(nextReminder.datetime) }}</span>
            <span v-if="nextTagInfo" class="detail-tag" :style="{ backgroundColor: nextTagInfo.color + '20', color: nextTagInfo.color }">
              {{ nextTagInfo.icon }} {{ nextTagInfo.name }}
            </span>
          </div>
          <div class="detail-countdown">{{ countdown }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.floating-widget {
  position: fixed;
  z-index: 2000;
  user-select: none;
  -webkit-user-select: none;
}

.widget-compact {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(0, 122, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  box-shadow: 0 4px 24px rgba(0, 122, 255, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
}

.widget-compact:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 32px rgba(0, 122, 255, 0.4);
}

.widget-compact:active {
  cursor: grabbing;
}

.floating-widget.dragging .widget-compact {
  cursor: grabbing;
  transform: scale(1.1);
  box-shadow: 0 8px 40px rgba(0, 122, 255, 0.5);
}

.widget-pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.15); opacity: 0; }
}

.widget-countdown-text {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-align: center;
  line-height: 1.2;
  padding: 4px;
  position: relative;
  z-index: 1;
  max-width: 56px;
  word-break: break-all;
}

/* 展开详情 */
.widget-detail {
  position: absolute;
  bottom: 76px;
  right: 0;
  width: 240px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.5);
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
}

.detail-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.detail-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.detail-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.detail-body {
  padding: 0 16px 16px;
}

.detail-reminder-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.detail-time {
  font-size: 13px;
  color: var(--text-secondary);
}

.detail-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.detail-countdown {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-blue);
  letter-spacing: -0.5px;
}

/* 展开动画 */
.expand-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.expand-leave-active {
  transition: all 0.15s ease-in;
}

.expand-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}

.expand-leave-to {
  opacity: 0;
  transform: translateY(5px) scale(0.95);
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  .widget-detail {
    background: rgba(44, 44, 46, 0.85);
    border-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
