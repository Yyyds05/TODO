<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import eventBus from '../utils/eventBus.js'

const show = ref(false)
const message = ref('操作成功')
let timer = null

function showToast(msg = '操作成功') {
  message.value = msg
  show.value = true
  
  // 清除之前的定时器
  if (timer) {
    clearTimeout(timer)
  }
  
  // 3秒后自动消失
  timer = setTimeout(() => {
    show.value = false
  }, 3000)
}

onMounted(() => {
  eventBus.on('toast:show', showToast)
})

onUnmounted(() => {
  eventBus.off('toast:show', showToast)
  if (timer) {
    clearTimeout(timer)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="show" class="toast-container">
        <div class="toast-content">
          <svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span class="toast-message">{{ message }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  pointer-events: none;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--accent-green);
}

.toast-icon {
  color: var(--accent-green);
}

.toast-message {
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
  line-height: var(--line-height-body);
}

/* Toast动画 - 从右侧滑入 */
.toast-enter-active {
  transition: all 0.2s ease;
}

.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@media (max-width: 640px) {
  .toast-container {
    top: 10px;
    right: 10px;
    left: 10px;
  }
  
  .toast-content {
    justify-content: center;
  }
}
</style>