<script setup>
import { ref, watch } from 'vue'
import { updateReminder, tags, repeatOptions, formatDateTimeLocal } from '../stores/reminderStore.js'
import { safeGet } from '../utils/safeStorage.js'

const props = defineProps({
  reminder: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

// 表单数据
const form = ref({
  title: '',
  datetime: '',
  priority: 'normal',
  tag: '',
  repeat: 'none',
  description: ''
})

const isSubmitting = ref(false)
const errors = ref({})

// AI 重写标题相关状态
const isRewriting = ref(false)
const showPreviewModal = ref(false)
const rewrittenTitle = ref('')
const originalTitle = ref('')

// 高级选项展开状态 - 编辑模式默认展开
const showAdvancedOptions = ref(true)

// 切换高级选项显示/隐藏
const toggleAdvancedOptions = () => {
  showAdvancedOptions.value = !showAdvancedOptions.value
}

// 优先级选项
const priorities = [
  { value: 'high', label: '高', color: '#ff3b30' },
  { value: 'normal', label: '中', color: '#ff9500' },
  { value: 'low', label: '低', color: '#34c759' }
]

// AI 重写标题
async function handleRewriteTitle() {
  const apiKey = safeGet('deepseek_api_key')
  if (!apiKey) {
    alert('请先在设置页面配置DeepSeek API密钥')
    return
  }
  
  if (!form.value.title.trim()) {
    alert('请先输入标题')
    return
  }
  
  isRewriting.value = true
  originalTitle.value = form.value.title
  
  try {
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
            content: '你是SkyDesk专属AI文案优化师。用户会提供一个模糊的任务标题，请你将其改写成清晰、具体、有行动力的任务标题。只输出合法的JSON格式，不要添加任何其他内容。JSON结构：{"title":"优化后的标题"}'
          },
          {
            role: 'user',
            content: form.value.title
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
    
    if (result.title) {
      rewrittenTitle.value = result.title
      showPreviewModal.value = true
    }
    
  } catch (err) {
    console.error('AI重写失败:', err)
    alert('AI重写失败，请稍后再试')
  } finally {
    isRewriting.value = false
  }
}

// 应用优化后的标题
function applyRewrittenTitle() {
  if (rewrittenTitle.value) {
    form.value.title = rewrittenTitle.value
  }
  showPreviewModal.value = false
}

// 取消预览
function cancelPreview() {
  showPreviewModal.value = false
}

// 监听提醒变化，填充表单
watch(() => props.reminder, (newReminder) => {
  if (newReminder) {
    form.value = {
      title: newReminder.title,
      datetime: formatDateTimeLocal(new Date(newReminder.datetime)),
      priority: newReminder.priority,
      tag: newReminder.tag,
      repeat: newReminder.repeat,
      description: newReminder.description
    }
  }
}, { immediate: true })

// 验证表单
function validate() {
  errors.value = {}
  
  if (!form.value.title.trim()) {
    errors.value.title = '请输入提醒内容'
  }
  
  if (!form.value.datetime) {
    errors.value.datetime = '请选择提醒时间'
  } else {
    const selectedTime = new Date(form.value.datetime)
    if (selectedTime <= new Date()) {
      errors.value.datetime = '请选择未来的时间'
    }
  }
  
  return Object.keys(errors.value).length === 0
}

// 提交表单
async function handleSubmit() {
  if (!validate() || !props.reminder) return
  
  isSubmitting.value = true
  
  try {
    await updateReminder(props.reminder.id, {
      title: form.value.title,
      datetime: form.value.datetime,
      priority: form.value.priority,
      tag: form.value.tag,
      repeat: form.value.repeat,
      description: form.value.description
    })
    
    emit('saved')
    emit('close')
  } catch (err) {
    console.error('更新提醒失败:', err)
    errors.value.submit = '更新失败，请重试'
  } finally {
    isSubmitting.value = false
  }
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="reminder" class="modal-overlay" @click.self="handleClose">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">编辑提醒</h3>
            <button class="close-btn" @click="handleClose">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <form @submit.prevent="handleSubmit" class="modal-body">
            <!-- 提醒内容 -->
            <div class="form-group">
              <label class="form-label">提醒内容</label>
              <div class="title-input-wrapper">
                <input
                  v-model="form.title"
                  type="text"
                  class="input"
                  :class="{ error: errors.title }"
                />
                <button
                  type="button"
                  class="ai-rewrite-btn"
                  @click="handleRewriteTitle"
                  :disabled="isRewriting"
                  title="AI重写标题"
                >
                  <span v-if="isRewriting" class="loading-text">...</span>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </button>
              </div>
              <span v-if="errors.title" class="error-text">{{ errors.title }}</span>
            </div>
            
            <!-- 时间选择 -->
            <div class="form-group">
              <label class="form-label">提醒时间</label>
              <input
                v-model="form.datetime"
                type="datetime-local"
                class="input"
                :class="{ error: errors.datetime }"
              />
              <span v-if="errors.datetime" class="error-text">{{ errors.datetime }}</span>
            </div>
            
            <!-- 高级选项切换按钮 -->
            <div class="form-group">
              <button
                type="button"
                class="advanced-toggle-btn"
                @click="toggleAdvancedOptions"
              >
                <span>{{ showAdvancedOptions ? '收起选项 ▲' : '更多选项 ▼' }}</span>
              </button>
            </div>
            
            <!-- 高级选项区域 -->
            <div v-show="showAdvancedOptions" class="advanced-options">
              <!-- 优先级选择 -->
              <div class="form-group">
                <label class="form-label">优先级</label>
                <div class="priority-selector">
                  <button
                    v-for="p in priorities"
                    :key="p.value"
                    type="button"
                    class="priority-btn"
                    :class="{ active: form.priority === p.value }"
                    :style="form.priority === p.value ? { backgroundColor: p.color, borderColor: p.color, color: '#ffffff' } : {}"
                    @click="form.priority = p.value"
                  >
                    <span class="priority-dot" :style="form.priority === p.value ? { backgroundColor: '#ffffff' } : { backgroundColor: p.color }"></span>
                    {{ p.label }}
                  </button>
                </div>
              </div>
              
              <!-- 标签选择 -->
              <div class="form-group">
                <label class="form-label">标签</label>
                <div class="tag-selector">
                  <button
                    v-for="tag in tags"
                    :key="tag.id"
                    type="button"
                    class="tag-btn"
                    :class="{ active: form.tag === tag.name }"
                    :style="form.tag === tag.name ? { backgroundColor: tag.color, borderColor: tag.color, color: '#ffffff' } : {}"
                    @click="form.tag = form.tag === tag.name ? '' : tag.name"
                  >
                    <span class="tag-icon">{{ tag.icon }}</span>
                    {{ tag.name }}
                  </button>
                </div>
              </div>
              
              <!-- 重复选项 -->
              <div class="form-group">
                <label class="form-label">重复</label>
                <div class="repeat-selector">
                  <button
                    v-for="opt in repeatOptions"
                    :key="opt.value"
                    type="button"
                    class="repeat-btn"
                    :class="{ active: form.repeat === opt.value }"
                    @click="form.repeat = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
              
              <!-- 描述 -->
              <div class="form-group">
                <label class="form-label">补充说明</label>
                <input
                  v-model="form.description"
                  type="text"
                  class="input"
                  placeholder="可选"
                />
              </div>
            </div>
            
            <!-- 错误提示 -->
            <div v-if="errors.submit" class="error-text submit-error">{{ errors.submit }}</div>
          </form>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
            <button type="button" class="btn btn-primary" :disabled="isSubmitting" @click="handleSubmit">
              {{ isSubmitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- AI 重写标题预览弹窗 -->
    <Transition name="modal">
      <div v-if="showPreviewModal" class="preview-modal-overlay" @click.self="cancelPreview">
        <div class="preview-modal-content">
          <div class="preview-modal-header">
            <h3 class="preview-modal-title">✨ 优化后的标题</h3>
          </div>
          <div class="preview-modal-body">
            <div class="title-comparison">
              <div class="title-item original">
                <div class="title-label">原标题</div>
                <div class="title-text">{{ originalTitle }}</div>
              </div>
              <div class="title-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
              <div class="title-item optimized">
                <div class="title-label">优化后</div>
                <div class="title-text">{{ rewrittenTitle }}</div>
              </div>
            </div>
          </div>
          <div class="preview-modal-footer">
            <button type="button" class="btn btn-secondary" @click="cancelPreview">取消</button>
            <button type="button" class="btn btn-primary" @click="applyRewrittenTitle">应用</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-md);
}

.modal-content {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--bg-tertiary);
}

.modal-title {
  font-size: var(--text-h2);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: var(--line-height-h2);
}

.close-btn {
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

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
  max-height: calc(90vh - 140px);
}

.modal-footer {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--bg-tertiary);
  justify-content: flex-end;
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
  line-height: var(--line-height-caption);
}

.error-text {
  display: block;
  font-size: var(--text-caption);
  color: var(--accent-red);
  margin-top: 6px;
  line-height: var(--line-height-caption);
}

.submit-error {
  text-align: center;
}

.priority-selector {
  display: flex;
  gap: 10px;
}

.priority-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: var(--line-height-body);
}

.priority-btn:hover {
  background: var(--bg-tertiary);
}

.priority-btn.active {
  font-weight: 600;
}

.priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tag-selector {
  display: flex;
  gap: var(--space-sm);
  overflow-x: auto;
  padding-bottom: var(--space-xs);
  -webkit-overflow-scrolling: touch;
}

.tag-selector::-webkit-scrollbar {
  display: none;
}

.tag-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
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

.tag-btn:hover {
  background: var(--bg-tertiary);
}

.tag-btn.active {
  font-weight: 600;
}

.tag-icon {
  font-size: 14px;
}

.repeat-selector {
  display: flex;
  gap: var(--space-sm);
}

.repeat-btn {
  padding: 6px 14px;
  background: var(--bg-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: var(--line-height-caption);
}

.repeat-btn:hover {
  background: var(--bg-tertiary);
}

.repeat-btn.active {
  background: rgba(0, 122, 255, 0.12);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  font-weight: 600;
}

.advanced-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: var(--line-height-caption);
}

.advanced-toggle-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.advanced-options {
  animation: slideDown var(--transition-normal) ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 弹窗动画 - 从中间放大并淡入，200ms */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from .modal-content {
  transform: scale(0.9);
}

.modal-leave-to .modal-content {
  transform: scale(0.9);
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }
  
  .modal-content {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    max-height: 85vh;
  }
  
  .modal-body {
    padding: var(--space-md);
  }
  
  .modal-footer {
    padding: var(--space-md);
  }
  
  .priority-btn {
    padding: 6px 12px;
    font-size: var(--text-caption);
  }
}

/* AI 重写标题按钮 */
.title-input-wrapper {
  display: flex;
  gap: var(--space-sm);
}

.title-input-wrapper .input {
  flex: 1;
}

.ai-rewrite-btn {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--accent-blue);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.ai-rewrite-btn:hover:not(:disabled) {
  background: rgba(0, 122, 255, 0.1);
  border-color: var(--accent-blue);
}

.ai-rewrite-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-text {
  font-size: 14px;
  font-weight: bold;
}

/* AI 重写标题预览弹窗 */
.preview-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  padding: var(--space-md);
}

.preview-modal-content {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 500px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.preview-modal-header {
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--bg-tertiary);
}

.preview-modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.preview-modal-body {
  padding: var(--space-lg);
}

.title-comparison {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.title-item {
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
}

.title-item.original {
  border-left: 3px solid var(--text-tertiary);
}

.title-item.optimized {
  border-left: 3px solid var(--accent-blue);
  background: rgba(0, 122, 255, 0.05);
}

.title-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.title-text {
  font-size: 15px;
  color: var(--text-primary);
  line-height: 1.5;
}

.title-item.optimized .title-text {
  color: var(--accent-blue);
  font-weight: 500;
}

.title-arrow {
  display: flex;
  justify-content: center;
  color: var(--accent-blue);
}

.preview-modal-footer {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--bg-tertiary);
  justify-content: flex-end;
}
</style>
