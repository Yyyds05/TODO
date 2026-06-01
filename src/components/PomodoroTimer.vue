<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { soundService } from '../services/sound.js'

const emit = defineEmits(['complete', 'skip'])

// 计时器模式定义
const MODES = {
  focus: { name: 'focus', label: '专注', minutes: 25, color: '#007aff' },
  shortBreak: { name: 'shortBreak', label: '短休息', minutes: 5, color: '#34c759' },
  longBreak: { name: 'longBreak', label: '长休息', minutes: 15, color: '#af52de' }
}

// 状态
const currentMode = ref('focus')
const timeLeft = ref(MODES.focus.minutes * 60)
const isRunning = ref(false)
const taskName = ref('')
const showCompletionAnimation = ref(false)
const timerInterval = ref(null)
const startTime = ref(null)

// 计算属性
const currentModeConfig = computed(() => MODES[currentMode.value])
const totalTime = computed(() => currentModeConfig.value.minutes * 60)
const progress = computed(() => (totalTime.value - timeLeft.value) / totalTime.value)

// 格式化时间显示
const formattedTime = computed(() => {
  const minutes = Math.floor(timeLeft.value / 60)
  const seconds = timeLeft.value % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// 圆形进度条参数
const circleRadius = 120
const circleCircumference = 2 * Math.PI * circleRadius
const strokeDashoffset = computed(() => {
  return circleCircumference * (1 - progress.value)
})

// 切换模式
function switchMode(mode) {
  if (isRunning.value) {
    const confirmed = confirm('切换模式将重置当前计时，确定要继续吗？')
    if (!confirmed) return
  }
  currentMode.value = mode
  timeLeft.value = MODES[mode].minutes * 60
  isRunning.value = false
  clearInterval(timerInterval.value)
  timerInterval.value = null
}

// 开始/暂停计时
function toggleTimer() {
  if (isRunning.value) {
    pauseTimer()
  } else {
    startTimer()
  }
}

// 开始计时
function startTimer() {
  if (currentMode.value === 'focus' && !taskName.value.trim()) {
    alert('请先输入专注任务名称')
    return
  }
  
  isRunning.value = true
  startTime.value = new Date()
  
  timerInterval.value = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      completeTimer()
    }
  }, 1000)
}

// 暂停计时
function pauseTimer() {
  isRunning.value = false
  clearInterval(timerInterval.value)
  timerInterval.value = null
}

// 重置计时
function resetTimer() {
  if (isRunning.value) {
    const confirmed = confirm('确定要重置当前计时吗？')
    if (!confirmed) return
  }
  pauseTimer()
  timeLeft.value = currentModeConfig.value.minutes * 60
}

// 跳过当前阶段
function skipTimer() {
  if (isRunning.value) {
    const confirmed = confirm('确定要跳过当前阶段吗？')
    if (!confirmed) return
  }
  
  const record = {
    taskName: taskName.value || currentModeConfig.value.label,
    mode: currentMode.value,
    duration: currentModeConfig.value.minutes * 60 - timeLeft.value,
    startTime: startTime.value?.toISOString() || new Date().toISOString(),
    completed: false,
    skipped: true
  }
  
  pauseTimer()
  timeLeft.value = currentModeConfig.value.minutes * 60
  emit('skip', record)
}

// 完成计时
function completeTimer() {
  pauseTimer()
  
  // 播放提示音
  soundService.play('complete')
  
  // 显示完成动画
  showCompletionAnimation.value = true
  setTimeout(() => {
    showCompletionAnimation.value = false
  }, 2000)
  
  // 创建记录
  const record = {
    taskName: taskName.value || currentModeConfig.value.label,
    mode: currentMode.value,
    duration: currentModeConfig.value.minutes * 60,
    startTime: startTime.value?.toISOString() || new Date().toISOString(),
    completed: true,
    skipped: false
  }
  
  emit('complete', record)
  
  // 重置计时器
  timeLeft.value = currentModeConfig.value.minutes * 60
  if (currentMode.value === 'focus') {
    taskName.value = ''
  }
}

// 监听模式变化
watch(currentMode, (newMode) => {
  timeLeft.value = MODES[newMode].minutes * 60
})

// 组件卸载时清理
onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})

// 页面可见性变化处理 - 确保后台计时继续
onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

function handleVisibilityChange() {
  // 使用 Page Visibility API 确保计时器在后台继续运行
  // 实际的计时逻辑已经在 setInterval 中处理
}
</script>

<template>
  <div class="pomodoro-timer">
    <!-- 完成动画 -->
    <div v-if="showCompletionAnimation" class="completion-animation">
      <div class="completion-content">
        <span class="completion-icon">🎉</span>
        <span class="completion-text">完成！</span>
      </div>
    </div>

    <!-- 模式切换 -->
    <div class="mode-switcher">
      <button
        v-for="mode in MODES"
        :key="mode.name"
        class="mode-btn"
        :class="{ active: currentMode === mode.name }"
        :style="{ '--mode-color': mode.color }"
        @click="switchMode(mode.name)"
      >
        {{ mode.label }}
      </button>
    </div>

    <!-- 任务输入 -->
    <div v-if="currentMode === 'focus'" class="task-input-wrapper">
      <input
        v-model="taskName"
        type="text"
        class="task-input"
        placeholder="输入专注任务..."
        :disabled="isRunning"
      />
    </div>

    <!-- 计时器显示 -->
    <div class="timer-display">
      <svg class="progress-ring" viewBox="0 0 280 280">
        <!-- 背景圆环 -->
        <circle
          class="progress-ring-bg"
          cx="140"
          cy="140"
          :r="circleRadius"
        />
        <!-- 进度圆环 -->
        <circle
          class="progress-ring-fill"
          cx="140"
          cy="140"
          :r="circleRadius"
          :stroke-dasharray="circleCircumference"
          :stroke-dashoffset="strokeDashoffset"
          :stroke="currentModeConfig.color"
        />
      </svg>
      <div class="timer-content">
        <div class="timer-time">{{ formattedTime }}</div>
        <div class="timer-mode">{{ currentModeConfig.label }}</div>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="timer-controls">
      <div class="control-wrapper">
        <button class="control-btn secondary" @click="resetTimer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <span class="control-label">重置</span>
      </div>
      
      <div class="control-wrapper">
        <button
          class="control-btn primary"
          :style="{ backgroundColor: currentModeConfig.color }"
          @click="toggleTimer"
        >
          <svg v-if="!isRunning" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        </button>
        <span class="control-label">{{ isRunning ? '暂停' : '开始' }}</span>
      </div>
      
      <div class="control-wrapper">
        <button class="control-btn secondary" @click="skipTimer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 4l10 8-10 8V4z" />
            <path d="M19 5v14" />
          </svg>
        </button>
        <span class="control-label">跳过</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pomodoro-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 24px;
}

/* 完成动画 */
.completion-animation {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.completion-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px;
  background: var(--bg-primary);
  border-radius: 24px;
  animation: scaleIn 0.3s ease;
}

.completion-icon {
  font-size: 64px;
  animation: bounce 0.5s ease infinite alternate;
}

.completion-text {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-10px); }
}

/* 模式切换 */
.mode-switcher {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.mode-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  color: var(--text-primary);
}

.mode-btn.active {
  background: var(--bg-primary);
  color: var(--mode-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 任务输入 */
.task-input-wrapper {
  width: 100%;
  max-width: 280px;
}

.task-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 16px;
  text-align: center;
  transition: all 0.2s ease;
}

.task-input:focus {
  outline: none;
  border-color: #007aff;
}

.task-input::placeholder {
  color: var(--text-tertiary);
}

.task-input:disabled {
  background: var(--bg-secondary);
  cursor: not-allowed;
}

/* 计时器显示 */
.timer-display {
  position: relative;
  width: 280px;
  height: 280px;
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring-bg {
  fill: none;
  stroke: var(--bg-secondary);
  stroke-width: 8;
}

.progress-ring-fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
}

.timer-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.timer-time {
  font-size: 56px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  letter-spacing: -2px;
}

.timer-mode {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* 控制按钮 */
.timer-controls {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.control-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.control-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn.primary {
  width: 72px;
  height: 72px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.control-btn.primary:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.control-btn.primary:active {
  transform: scale(0.95);
}

.control-btn.primary svg {
  width: 32px;
  height: 32px;
}

.control-btn.secondary {
  width: 48px;
  height: 48px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.control-btn.secondary:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.control-btn.secondary svg {
  width: 20px;
  height: 20px;
}

/* 响应式 */
@media (max-width: 640px) {
  .pomodoro-timer {
    padding: 16px;
    gap: 20px;
  }

  .timer-display {
    width: 240px;
    height: 240px;
  }

  .timer-time {
    font-size: 48px;
  }

  .control-btn.primary {
    width: 64px;
    height: 64px;
  }

  .control-btn.primary svg {
    width: 28px;
    height: 28px;
  }

  .control-btn.secondary {
    width: 44px;
    height: 44px;
  }
}
</style>
