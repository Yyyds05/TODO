<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { addReminder, settings } from '../stores/reminderStore.js'
import { parseNaturalLanguage, formatDateTimeLocal } from '../utils/naturalLanguageParser.js'

const emit = defineEmits(['close', 'added'])
const router = useRouter()

const inputRef = ref(null)
const content = ref('')
const isSubmitting = ref(false)

// 解析结果
const parsedResult = ref(null)
const showParsedHint = ref(false)

// 监听输入，解析自然语言
const handleInput = () => {
  const result = parseNaturalLanguage(content.value)
  parsedResult.value = result
  showParsedHint.value = !!result.matchedText
}

// 获取明天同一时间
const getTomorrowSameTime = () => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow
}

// 提交
const handleSubmit = async () => {
  if (!content.value.trim() || isSubmitting.value) return
  
  isSubmitting.value = true
  
  try {
    // 解析自然语言
    const result = parseNaturalLanguage(content.value)
    
    // 确定时间：解析到的时间 > 明天同一时间
    const datetime = result.datetime || getTomorrowSameTime()
    
    await addReminder({
      title: result.title || content.value,
      datetime: formatDateTimeLocal(datetime),
      priority: 'normal',
      tag: '',
      repeat: result.repeat || 'none',
      description: '',
      sound: settings.value.soundEnabled,
      notification: settings.value.notificationEnabled
    })
    
    emit('added')
    emit('close')
  } catch (err) {
    console.error('快速添加失败:', err)
  } finally {
    isSubmitting.value = false
  }
}

// 关闭
const handleClose = () => {
  emit('close')
}

// 键盘事件
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    handleClose()
  } else if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

// 点击外部关闭
const handleBackdropClick = (e) => {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}

onMounted(() => {
  // 自动聚焦输入框
  setTimeout(() => {
    inputRef.value?.focus()
  }, 100)
})
</script>

<template>
  <div class="quick-add-modal" @click="handleBackdropClick">
    <div class="quick-add-content">
      <input
        ref="inputRef"
        v-model="content"
        type="text"
        class="quick-add-input"
        placeholder="添加提醒..."
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <div v-if="showParsedHint && parsedResult?.matchedText" class="parse-hint">
        <span class="parse-time">{{ parsedResult.matchedText }}</span>
        <span class="parse-arrow">→</span>
        <span class="parse-date">{{ formatDateTimeLocal(parsedResult.datetime) }}</span>
      </div>
      <div class="quick-add-tips">
        <span>按 Enter 添加</span>
        <span>按 Esc 关闭</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quick-add-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 120px;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.quick-add-content {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  width: 90%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.quick-add-input {
  width: 100%;
  padding: 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.5;
  transition: all var(--transition-fast);
  box-sizing: border-box;
}

.quick-add-input:focus {
  outline: none;
  border-color: var(--accent-blue);
}

.quick-add-input::placeholder {
  color: var(--text-tertiary);
}

.parse-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(0, 122, 255, 0.08);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.parse-time {
  color: var(--accent-blue);
  font-weight: 600;
}

.parse-arrow {
  color: var(--text-tertiary);
}

.parse-date {
  color: var(--text-secondary);
  font-family: monospace;
}

.quick-add-tips {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 12px;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .quick-add-modal {
    padding-top: 80px;
  }
  
  .quick-add-content {
    width: 95%;
    padding: var(--space-md);
  }
  
  .quick-add-input {
    font-size: 16px;
    padding: 14px;
  }
}
</style>
