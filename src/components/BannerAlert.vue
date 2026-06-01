<script setup>
import { ref, onMounted } from 'vue'
import eventBus from '../utils/eventBus.js'

const visible = ref(false)
const title = ref('')
const description = ref('')
const priority = ref('normal')

let autoHideTimer = null

// 监听显示事件
eventBus.on('banner:show', (data) => {
  show(data)
})

function show(data) {
  // 清除之前的定时器
  if (autoHideTimer) {
    clearTimeout(autoHideTimer)
  }
  
  // 设置内容
  title.value = data.title || '提醒'
  description.value = data.description || ''
  priority.value = data.priority || 'normal'
  
  // 显示横幅
  visible.value = true
  
  // 5秒后自动隐藏
  autoHideTimer = setTimeout(() => {
    hide()
  }, 5000)
}

function hide() {
  visible.value = false
  if (autoHideTimer) {
    clearTimeout(autoHideTimer)
    autoHideTimer = null
  }
}

// 获取优先级颜色
function getPriorityColor() {
  const colors = {
    high: '#ff3b30',
    normal: '#ff9500',
    low: '#34c759'
  }
  return colors[priority.value] || colors.normal
}

onMounted(() => {
  // 组件挂载时的初始化
})
</script>

<template>
  <Transition name="banner">
    <div v-if="visible" class="banner-alert" :style="{ borderLeftColor: getPriorityColor() }">
      <div class="banner-content">
        <div class="banner-icon" :style="{ backgroundColor: getPriorityColor() + '20', color: getPriorityColor() }">
          🔔
        </div>
        <div class="banner-text">
          <h4 class="banner-title">{{ title }}</h4>
          <p v-if="description" class="banner-description">{{ description }}</p>
        </div>
      </div>
      <button class="banner-close" @click="hide">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.banner-alert {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 600px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-left: 4px solid var(--accent-blue);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  z-index: 2000;
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.banner-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
  min-width: 0;
}

.banner-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.banner-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 动画 */
.banner-enter-active,
.banner-leave-active {
  transition: all 0.3s ease;
}

.banner-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.banner-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

@media (max-width: 640px) {
  .banner-alert {
    top: 72px;
    padding: 12px 16px;
  }
  
  .banner-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
  
  .banner-title {
    font-size: 15px;
  }
  
  .banner-description {
    font-size: 13px;
  }
}
</style>
