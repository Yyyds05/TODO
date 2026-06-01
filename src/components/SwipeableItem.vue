<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  threshold: {
    type: Number,
    default: 0.5 // 50% 阈值
  }
})

const emit = defineEmits(['complete', 'delete', 'edit'])

// 滑动状态
const startX = ref(0)
const startY = ref(0)
const currentX = ref(0)
const isDragging = ref(false)
const swipeDirection = ref(null) // 'left' | 'right'

// 计算滑动距离
const translateX = computed(() => {
  if (!isDragging.value) return 0
  return currentX.value
})

// 滑动比例
const swipeRatio = computed(() => {
  if (typeof window === 'undefined') return 0
  return Math.abs(translateX.value) / window.innerWidth
})

// 是否超过阈值
const isOverThreshold = computed(() => {
  return swipeRatio.value > props.threshold
})

// 背景颜色
const leftBgColor = computed(() => {
  const ratio = Math.min(swipeRatio.value, 1)
  if (swipeDirection.value === 'right') {
    return `rgba(52, 199, 89, ${ratio})` // 绿色 - 完成
  }
  return 'rgba(52, 199, 89, 0)'
})

const rightBgColor = computed(() => {
  const ratio = Math.min(swipeRatio.value, 1)
  if (swipeDirection.value === 'left') {
    return `rgba(255, 59, 48, ${ratio})` // 红色 - 删除
  }
  return 'rgba(255, 59, 48, 0)'
})

// 触摸开始
function handleTouchStart(e) {
  startX.value = e.touches[0].clientX
  startY.value = e.touches[0].clientY
  isDragging.value = true
  currentX.value = 0
}

// 触摸移动
function handleTouchMove(e) {
  if (!isDragging.value) return
  
  const currentXVal = e.touches[0].clientX
  const currentYVal = e.touches[0].clientY
  const deltaX = currentXVal - startX.value
  const deltaY = currentYVal - startY.value
  
  // 判断滑动方向（主要看X轴偏移）
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // 水平滑动
    e.preventDefault()
    currentX.value = deltaX
    swipeDirection.value = deltaX > 0 ? 'right' : 'left'
  } else {
    // 垂直滑动，不处理
    isDragging.value = false
  }
}

// 触摸结束
function handleTouchEnd() {
  if (!isDragging.value) return
  
  if (isOverThreshold.value) {
    // 超过阈值，触发操作
    if (swipeDirection.value === 'right') {
      emit('complete', props.item)
    } else {
      emit('delete', props.item)
    }
  }
  
  // 重置状态
  isDragging.value = false
  currentX.value = 0
  swipeDirection.value = null
}
</script>

<template>
  <div class="swipeable-item">
    <!-- 左侧背景 - 完成 -->
    <div class="swipe-bg left" :style="{ backgroundColor: leftBgColor }">
      <div class="swipe-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span class="swipe-text">{{ item.completed ? '取消完成' : '完成' }}</span>
    </div>
    
    <!-- 右侧背景 - 删除 -->
    <div class="swipe-bg right" :style="{ backgroundColor: rightBgColor }">
      <div class="swipe-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </div>
      <span class="swipe-text">删除</span>
    </div>
    
    <!-- 内容区域 -->
    <div 
      class="swipe-content"
      :class="{ dragging: isDragging }"
      :style="{ transform: `translateX(${translateX}px)` }"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.swipeable-item {
  position: relative;
  overflow: hidden;
}

.swipe-bg {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px;
  box-sizing: border-box;
  border-radius: var(--radius-sm);
}

.swipe-bg.left {
  left: 0;
}

.swipe-bg.right {
  right: 0;
}

.swipe-icon {
  color: white;
  opacity: 0.9;
}

.swipe-text {
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.swipe-content {
  position: relative;
  z-index: 1;
  background: var(--bg-secondary);
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
}

.swipe-content.dragging {
  transition: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
