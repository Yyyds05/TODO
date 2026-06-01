<script setup>
import { computed, ref } from 'vue'
import { formatDateTime, getPriorityInfo, getTagInfo, getRepeatInfo, toggleComplete, deleteReminder } from '../stores/reminderStore.js'
import { safeGet } from '../utils/safeStorage.js'

const props = defineProps({
  reminder: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit'])

const priorityInfo = computed(() => getPriorityInfo(props.reminder.priority))

const tagInfo = computed(() => getTagInfo(props.reminder.tag))

const repeatInfo = computed(() => {
  const repeat = props.reminder.repeat
  if (!repeat || repeat === 'none') return null
  return getRepeatInfo(repeat)
})

const formattedTime = computed(() => formatDateTime(props.reminder.datetime))

// 判断是否已过期
const isOverdue = computed(() => {
  if (props.reminder.completed) return false
  const dt = new Date(props.reminder.datetime)
  return dt < new Date()
})

// 判断是否即将到期（1小时内）
const isExpiringSoon = computed(() => {
  if (props.reminder.completed) return false
  const dt = new Date(props.reminder.datetime)
  const now = new Date()
  const oneHour = 60 * 60 * 1000
  return dt >= now && dt <= new Date(now.getTime() + oneHour)
})

// 动画状态
const showRipple = ref(false)
const showCheckFloat = ref(false)
const showCompleteToast = ref(false)

// 子任务状态
const subtasks = ref([])
const showSubtasks = ref(false)
const isGeneratingSubtasks = ref(false)

// 子任务完成状态
const completedSubtasks = ref(new Set())

async function handleToggleComplete() {
  if (!props.reminder.completed) {
    // 触发完成动画
    showRipple.value = true
    showCheckFloat.value = true
    showCompleteToast.value = true
    
    // 动画结束后重置状态
    setTimeout(() => {
      showRipple.value = false
    }, 600)
    
    setTimeout(() => {
      showCheckFloat.value = false
    }, 800)
    
    setTimeout(() => {
      showCompleteToast.value = false
    }, 1500)
  }
  
  await toggleComplete(props.reminder.id)
}

async function handleDelete() {
  if (confirm('确定要删除这个提醒吗？')) {
    await deleteReminder(props.reminder.id)
  }
}

function handleEdit() {
  emit('edit', props.reminder)
}

// AI 拆分子任务
function handleAISplit() {
  const apiKey = safeGet('deepseek_api_key')
  if (!apiKey) {
    alert('请先在设置页面配置DeepSeek API密钥')
    return
  }

  if (confirm('AI将为你拆解这个任务为3-5个可执行的子任务')) {
    generateSubtasks()
  }
}

async function generateSubtasks() {
  isGeneratingSubtasks.value = true

  try {
    const apiKey = safeGet('deepseek_api_key')
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是SkyDesk专属AI任务拆解专家。用户会提供一个任务标题，请你将其拆分成3-5个具体可执行的子任务。只输出合法的JSON格式，不要添加任何其他内容。JSON结构：{"subtasks":["子任务1","子任务2","子任务3"]}'
          },
          {
            role: 'user',
            content: props.reminder.title
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    })
    
    if (!response.ok) {
      throw new Error('API调用失败')
    }
    
    const data = await response.json()
    const content = data.choices[0]?.message?.content
    
    if (!content) {
      throw new Error('AI返回内容为空')
    }
    
    const result = JSON.parse(content)
    
    if (result.subtasks && Array.isArray(result.subtasks)) {
      subtasks.value = result.subtasks
      showSubtasks.value = true
    }
    
  } catch (err) {
    console.error('AI拆解失败:', err)
    alert('AI拆解失败，请稍后再试')
  } finally {
    isGeneratingSubtasks.value = false
  }
}

// 切换子任务完成状态
function toggleSubtask(index) {
  if (completedSubtasks.value.has(index)) {
    completedSubtasks.value.delete(index)
  } else {
    completedSubtasks.value.add(index)
  }
  // 触发响应式更新
  completedSubtasks.value = new Set(completedSubtasks.value)
}

// 切换子任务列表显示
function toggleSubtasksList() {
  showSubtasks.value = !showSubtasks.value
}
</script>

<template>
  <div class="reminder-item" :class="{ completed: reminder.completed, 'completing': showRipple, 'is-overdue': isOverdue, 'is-expiring': isExpiringSoon }">
    <div class="reminder-item-main">
      <div class="checkbox-wrapper">
      <input
        type="checkbox"
        class="checkbox"
        :checked="reminder.completed"
        @change="handleToggleComplete"
      />
      <!-- 波纹动画 -->
      <span v-if="showRipple" class="ripple"></span>
      <!-- 飘起的对勾 -->
      <span v-if="showCheckFloat" class="check-float">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </span>
      <!-- 完成提示 -->
      <Transition name="fade">
        <span v-if="showCompleteToast" class="complete-toast">已完成🎉</span>
      </Transition>
    </div>
    
    <div class="content" @click="handleToggleComplete">
      <div class="title-row">
        <span class="title">{{ reminder.title }}</span>
        <!-- 过期/即将到期标签 -->
        <span v-if="isOverdue" class="status-badge overdue-badge">已过期</span>
        <span v-else-if="isExpiringSoon" class="status-badge expiring-badge">即将到期</span>
        <span v-if="tagInfo" class="tag-badge" :style="{ backgroundColor: tagInfo.color + '20', color: tagInfo.color }">
          {{ tagInfo.icon }} {{ tagInfo.name }}
        </span>
        <span class="priority-badge" :style="{ backgroundColor: priorityInfo.color + '20', color: priorityInfo.color }">
          {{ priorityInfo.label }}
        </span>
      </div>
      <div class="meta">
        <span class="time">{{ formattedTime }}</span>
        <span v-if="repeatInfo" class="repeat-text">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          {{ repeatInfo.label }}
        </span>
        <span v-if="reminder.description" class="description">{{ reminder.description }}</span>
      </div>
    </div>
    
    <div class="actions">
      <button class="action-btn ai-split" @click="handleAISplit" title="智能拆分子任务">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </button>
      <button class="action-btn edit" @click="handleEdit" title="编辑">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button class="action-btn delete" @click="handleDelete" title="删除">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
    </div>

    <!-- 子任务列表 -->
    <Transition name="slide-down">
      <div v-if="showSubtasks && subtasks.length > 0" class="subtasks-container">
        <div class="subtasks-header" @click="toggleSubtasksList">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline :points="showSubtasks ? '6 9 12 15 18 9' : '9 6 15 12 9 18'"></polyline>
          </svg>
          <span>子任务 ({{ completedSubtasks.size }}/{{ subtasks.length }})</span>
        </div>
        <div v-if="showSubtasks" class="subtasks-list">
          <div
            v-for="(subtask, index) in subtasks"
            :key="index"
            class="subtask-item"
            :class="{ completed: completedSubtasks.has(index) }"
            @click="toggleSubtask(index)"
          >
            <input
              type="checkbox"
              class="subtask-checkbox"
              :checked="completedSubtasks.has(index)"
              @click.stop
              @change="toggleSubtask(index)"
            />
            <span class="subtask-text">{{ subtask }}</span>
          </div>
        </div>
        <div v-if="isGeneratingSubtasks" class="subtasks-loading">
          正在拆解...
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.reminder-item {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
  padding: var(--space-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.reminder-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.reminder-item.completed {
  opacity: 0.7;
  background: var(--bg-tertiary);
  box-shadow: none;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.reminder-item.completed .title {
  text-decoration: line-through;
  color: var(--text-secondary);
}

/* 主任务行 */
.reminder-item-main {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

/* 复选框容器 */
.checkbox-wrapper {
  position: relative;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 波纹动画 */
.ripple {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 122, 255, 0.3);
  animation: ripple-expand 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple-expand {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(3);
    opacity: 0;
  }
}

/* 飘起的对勾 */
.check-float {
  position: absolute;
  color: var(--accent-blue);
  animation: check-float-up 0.8s ease-out;
  pointer-events: none;
}

@keyframes check-float-up {
  0% {
    transform: translateY(0) scale(0.8);
    opacity: 1;
  }
  50% {
    transform: translateY(-20px) scale(1);
    opacity: 0.8;
  }
  100% {
    transform: translateY(-40px) scale(0.6);
    opacity: 0;
  }
}

/* 完成提示 */
.complete-toast {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #34c759 0%, #30d158 100%);
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(52, 199, 89, 0.3);
}

/* fade 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-5px);
}

/* 高优先级左侧竖线 */
.reminder-item[data-priority="high"] {
  border-left: 2px solid var(--accent-red);
  padding-left: calc(var(--space-md) - 2px);
}

/* 过期任务样式 */
.reminder-item.is-overdue {
  border-left: 3px solid var(--accent-red) !important;
  background: rgba(255, 59, 48, 0.04);
}

.reminder-item.is-expiring {
  border-left: 3px solid var(--accent-orange) !important;
  background: rgba(255, 149, 0, 0.04);
}

/* 状态标签 */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.overdue-badge {
  background: rgba(255, 59, 48, 0.12);
  color: var(--accent-red);
}

.expiring-badge {
  background: rgba(255, 149, 0, 0.12);
  color: var(--accent-orange);
}

/* 完成时的缩放动画 */
.checkbox:checked {
  animation: checkbox-pop 0.15s ease;
}

@keyframes checkbox-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.content {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.title {
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: var(--line-height-body);
}

.priority-badge {
  font-size: var(--text-caption);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  line-height: var(--line-height-caption);
}

.tag-badge {
  font-size: var(--text-caption);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  line-height: var(--line-height-caption);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: var(--line-height-caption);
}

.repeat-text {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: var(--line-height-caption);
}

.description {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: var(--line-height-caption);
}

.actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.reminder-item:hover .actions {
  opacity: 1;
}

.action-btn {
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
}

.action-btn:hover {
  background: var(--bg-tertiary);
}

.action-btn.edit:hover {
  color: var(--accent-blue);
}

.action-btn.delete:hover {
  color: var(--accent-red);
}

.action-btn.ai-split:hover {
  color: var(--accent-blue);
}

/* 子任务列表 */
.subtasks-container {
  width: 100%;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.subtasks-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 0;
}

.subtasks-header:hover {
  color: var(--text-primary);
}

.subtasks-list {
  margin-top: 8px;
  padding-left: 20px;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.subtask-item:hover {
  color: var(--text-primary);
}

.subtask-item.completed {
  color: var(--text-tertiary);
}

.subtask-item.completed .subtask-text {
  text-decoration: line-through;
}

.subtask-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--accent-blue);
}

.subtask-text {
  flex: 1;
  line-height: 1.4;
}

.subtasks-loading {
  margin-top: 8px;
  padding: 8px 0;
  font-size: 13px;
  color: var(--accent-blue);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* slide-down 动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 640px) {
  .reminder-item {
    padding: 12px;
    gap: 10px;
  }
  
  .actions {
    opacity: 1;
  }
  
  .action-btn {
    width: 28px;
    height: 28px;
  }
}
</style>
