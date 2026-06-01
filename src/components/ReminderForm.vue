<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatDateTimeLocal, addReminder, settings, tags, repeatOptions } from '../stores/reminderStore.js'
import { parseNaturalLanguage, formatDateTimeLocal as formatDateTime } from '../utils/naturalLanguageParser.js'
import { safeGet } from '../utils/safeStorage.js'

const emit = defineEmits(['added'])
const router = useRouter()

// 日期选择器最小值（不允许选择过去的时间）
const minDatetime = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
})

// 获取明天同一时间的辅助函数
const getTomorrowSameTime = () => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow
}

// 表单数据
const form = ref({
  title: '',
  datetime: formatDateTimeLocal(getTomorrowSameTime()),
  priority: 'normal',
  tag: '',
  repeat: 'none',
  description: ''
})

// 监听标签列表加载，默认选中第一个标签
watch(() => tags.value, (newTags) => {
  if (newTags.length > 0 && !form.value.tag) {
    form.value.tag = newTags[0].name
  }
}, { immediate: true })

const isSubmitting = ref(false)
const errors = ref({})

// 高级选项展开状态
const showAdvancedOptions = ref(false)

// 切换高级选项显示/隐藏
const toggleAdvancedOptions = () => {
  showAdvancedOptions.value = !showAdvancedOptions.value
}

// 自然语言解析结果
const parsedResult = ref(null)
const showParsedHighlight = ref(false)

// 监听标题输入，解析自然语言
watch(() => form.value.title, (newTitle) => {
  const result = parseNaturalLanguage(newTitle)
  parsedResult.value = result
  showParsedHighlight.value = !!result.matchedText
  
  // 如果解析成功，自动更新时间
  if (result.datetime) {
    form.value.datetime = formatDateTime(result.datetime)
  }
  if (result.repeat) {
    form.value.repeat = result.repeat
  }
}, { immediate: false })

// 优先级选项
const priorities = [
  { value: 'high', label: '高', color: '#ff3b30' },
  { value: 'normal', label: '中', color: '#ff9500' },
  { value: 'low', label: '低', color: '#34c759' }
]

// 快速时间选项
const quickTimes = [
  { label: '5分钟后', minutes: 5 },
  { label: '15分钟后', minutes: 15 },
  { label: '30分钟后', minutes: 30 },
  { label: '1小时后', minutes: 60 },
  { label: '明天', minutes: 24 * 60 },
  { label: '后天', minutes: 2 * 24 * 60 },
  { label: '下周一', type: 'nextWeekday', weekday: 1 }
]

// 验证表单
function validate() {
  errors.value = {}
  
  if (!form.value.title.trim()) {
    errors.value.title = '请输入提醒内容'
    // 触发输入框抖动动画
    triggerShake()
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

// 输入框抖动动画
const isShaking = ref(false)
function triggerShake() {
  isShaking.value = true
  setTimeout(() => {
    isShaking.value = false
  }, 500)
}

// 设置快速时间
function setQuickTime(item) {
  let date
  if (item.type === 'nextWeekday') {
    // 下周一：找到下一个指定星期几
    date = new Date()
    const currentDay = date.getDay() // 0=周日, 1=周一...
    const targetDay = item.weekday
    let daysUntil = targetDay - currentDay
    if (daysUntil <= 0) {
      daysUntil += 7
    }
    date.setDate(date.getDate() + daysUntil)
    date.setHours(9, 0, 0, 0) // 默认上午9点
  } else {
    // 分钟偏移
    date = new Date(Date.now() + item.minutes * 60 * 1000)
  }
  form.value.datetime = formatDateTimeLocal(date)
}

// 获取标签信息
function getTagInfo(tagName) {
  return tags.value.find(t => t.name === tagName)
}

// 跳转到标签管理页面
function goToTagsPage() {
  router.push('/tags')
}

// 提交表单
async function handleSubmit() {
  if (!validate()) return
  
  isSubmitting.value = true
  
  try {
    // 如果有解析结果，使用解析后的标题（去除时间部分）
    let finalTitle = form.value.title
    if (parsedResult.value && parsedResult.value.title) {
      finalTitle = parsedResult.value.title
    }
    
    await addReminder({
      title: finalTitle,
      datetime: form.value.datetime,
      priority: form.value.priority,
      tag: form.value.tag,
      repeat: form.value.repeat,
      description: form.value.description,
      sound: settings.value.soundEnabled,
      notification: settings.value.notificationEnabled
    })
    
    // 重置表单
    form.value = {
      title: '',
      datetime: formatDateTimeLocal(new Date(Date.now() + 5 * 60 * 1000)),
      priority: 'normal',
      tag: '',
      repeat: 'none',
      description: ''
    }
    errors.value = {}
    
    emit('added')
  } catch (err) {
    console.error('添加提醒失败:', err)
    errors.value.submit = '添加失败，请重试'
  } finally {
    isSubmitting.value = false
  }
}

// AI 相关状态
const showAIInput = ref(false)
const aiInput = ref('')
const isGenerating = ref(false)
const aiError = ref('')

// 切换 AI 输入区域
function toggleAIInput() {
  const apiKey = safeGet('deepseek_api_key')
  if (!apiKey) {
    aiError.value = '请先前往设置页配置 DeepSeek API 密钥'
    // 3秒后自动清除提示
    setTimeout(() => { aiError.value = '' }, 3000)
    return
  }
  showAIInput.value = !showAIInput.value
  aiError.value = ''
}

// 调用 DeepSeek API 生成提醒
async function generateWithAI() {
  if (!aiInput.value.trim()) return
  
  const apiKey = safeGet('deepseek_api_key')
  if (!apiKey) {
    alert('请先在设置页面配置DeepSeek API密钥')
    return
  }
  
  isGenerating.value = true
  aiError.value = ''
  
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
            content: '你是SkyDesk专属AI任务助手。用户会输入一段自然语言描述的任务，请你将其转换成严格符合要求的结构化待办提醒。只输出合法的JSON格式，不要添加任何其他内容。JSON结构：{"title":"清晰的任务标题","date":"YYYY-MM-DD HH:mm","priority":"high|medium|low","tag":"学习|工作|生活|健康|其他","subtasks":["子任务1","子任务2"]}。date字段必须是未来的时间，如果没有具体时间就用明天同一时间。priority如果没有明确说明默认用medium。tag如果没有明确说明默认用工作。'
          },
          {
            role: 'user',
            content: aiInput.value
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
    
    // 解析 JSON
    let result
    try {
      result = JSON.parse(content)
    } catch (e) {
      throw new Error('AI返回格式错误')
    }
    
    // 填充表单
    if (result.title) {
      form.value.title = result.title
    }
    
    if (result.date) {
      // 将日期字符串转换为 datetime-local 格式
      const dateMatch = result.date.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/)
      if (dateMatch) {
        form.value.datetime = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T${dateMatch[4]}:${dateMatch[5]}`
      }
    }
    
    if (result.priority) {
      const priorityMap = { high: 'high', medium: 'normal', low: 'low' }
      form.value.priority = priorityMap[result.priority] || 'normal'
    }
    
    if (result.tag) {
      // 检查标签是否存在
      const validTags = ['学习', '工作', '生活', '健康', '其他']
      if (validTags.includes(result.tag)) {
        form.value.tag = result.tag
      }
    }
    
    if (result.subtasks && Array.isArray(result.subtasks) && result.subtasks.length > 0) {
      form.value.description = result.subtasks.join('\n')
    }
    
    // 关闭 AI 输入区域
    showAIInput.value = false
    aiInput.value = ''
    
  } catch (err) {
    console.error('AI生成失败:', err)
    if (err.message === 'API调用失败') {
      aiError.value = 'AI生成失败，请检查网络连接和API密钥'
    } else if (err.message === 'AI返回格式错误') {
      aiError.value = 'AI返回格式错误，请稍后再试'
    } else {
      aiError.value = 'AI生成失败，请稍后再试'
    }
  } finally {
    isGenerating.value = false
  }
}

// AI 输入框回车事件
function handleAIKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    generateWithAI()
  }
}
</script>

<template>
  <div class="reminder-form card">
    <h3 class="form-title">新建提醒</h3>
    
    <form @submit.prevent="handleSubmit">
      <!-- 提醒内容 -->
      <div class="form-group">
        <div class="title-input-wrapper">
          <input
            v-model="form.title"
            type="text"
            class="input title-input"
            placeholder="提醒内容..."
            :class="{ error: errors.title, 'has-parse': showParsedHighlight, shake: isShaking }"
          />
          <button
            type="button"
            class="ai-btn"
            @click="toggleAIInput"
            title="AI帮你生成结构化提醒"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </button>
        </div>
        <span v-if="errors.title" class="error-text">{{ errors.title }}</span>
        <span v-if="showParsedHighlight && parsedResult?.matchedText" class="parse-hint">
          识别到时间: <span class="parse-highlight">{{ parsedResult.matchedText }}</span>
        </span>
        
        <!-- AI 输入区域 -->
        <Transition name="slide-down">
          <div v-if="showAIInput" class="ai-input-area">
            <div class="ai-input-wrapper">
              <input
                v-model="aiInput"
                type="text"
                class="input ai-input"
                placeholder="告诉我你要做什么，AI帮你生成提醒"
                @keydown="handleAIKeydown"
                :disabled="isGenerating"
              />
              <button
                type="button"
                class="btn btn-primary ai-generate-btn"
                @click="generateWithAI"
                :disabled="isGenerating || !aiInput.trim()"
              >
                <span v-if="isGenerating" class="loading-text">正在生成...</span>
                <span v-else>生成</span>
              </button>
            </div>
            <span v-if="aiError" class="ai-error">{{ aiError }}</span>
          </div>
        </Transition>
      </div>
      
      <!-- 快速时间选择 -->
      <div class="quick-times">
        <button
          v-for="(time, index) in quickTimes"
          :key="time.minutes || index"
          type="button"
          class="quick-time-btn"
          @click="setQuickTime(time)"
        >
          {{ time.label }}
        </button>
      </div>
      
      <!-- 时间选择 -->
      <div class="form-group">
        <input
          v-model="form.datetime"
          type="datetime-local"
          class="input"
          :class="{ error: errors.datetime }"
          :min="minDatetime"
        />
        <span v-if="errors.datetime" class="error-text">{{ errors.datetime }}</span>
      </div>
      
      <!-- 高级选项切换按钮 -->
      <div class="form-group">
        <button
          type="button"
          class="advanced-toggle-btn"
          :class="{ expanded: showAdvancedOptions }"
          @click="toggleAdvancedOptions"
        >
          <span>{{ showAdvancedOptions ? '收起选项 ▲' : '更多选项 ▼' }}</span>
        </button>
      </div>
      
      <!-- 高级选项区域 -->
      <Transition name="expand">
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
            <!-- 管理标签按钮 -->
            <button
              type="button"
              class="tag-btn manage-btn"
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
        
        <!-- 描述（可选） -->
        <div class="form-group">
          <input
            v-model="form.description"
            type="text"
            class="input"
            placeholder="补充说明（可选）"
          />
        </div>
      </Transition>
      
      <!-- 错误提示 -->
      <div v-if="errors.submit" class="error-text submit-error">{{ errors.submit }}</div>
      
      <!-- 提交按钮 -->
      <button
        type="submit"
        class="btn btn-primary submit-btn"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? '添加中...' : '添加提醒' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.reminder-form {
  padding: var(--space-lg);
  margin-bottom: var(--space-lg);
}

.form-title {
  font-size: var(--text-h2);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-md) 0;
  line-height: var(--line-height-h2);
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-label {
  display: block;
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
  line-height: var(--line-height-caption);
}

.title-input {
  font-size: var(--text-body);
  font-weight: 500;
}

.error-text {
  display: block;
  font-size: var(--text-caption);
  color: var(--accent-red);
  margin-top: 6px;
  line-height: var(--line-height-caption);
}

.submit-error {
  margin-bottom: var(--space-sm);
  text-align: center;
}

.quick-times {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.quick-time-btn {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: var(--line-height-caption);
}

.quick-time-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
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

/* 自然语言解析提示 */
.parse-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.parse-highlight {
  color: var(--accent-blue);
  font-weight: 600;
  background: rgba(0, 122, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.manage-btn {
  color: var(--accent-blue);
  background: rgba(0, 122, 255, 0.08);
}

.manage-btn:hover {
  background: rgba(0, 122, 255, 0.15);
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

.advanced-toggle-btn svg {
  transition: transform var(--transition-fast);
}

.advanced-options {
  padding: var(--space-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  margin-top: var(--space-sm);
}

/* 展开/收起过渡动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 0;
}

/* 切换按钮展开状态 */
.advanced-toggle-btn.expanded {
  background: var(--bg-tertiary);
  border-style: solid;
}

/* 输入框抖动动画 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.shake {
  animation: shake 0.5s ease-in-out;
  border-color: var(--accent-red) !important;
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.15) !important;
}

/* AI 按钮和输入区域 */
.title-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.title-input-wrapper .title-input {
  flex: 1;
  padding-right: 40px;
}

.ai-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--accent-blue);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.ai-btn:hover {
  background: rgba(0, 122, 255, 0.1);
}

.ai-btn svg {
  width: 16px;
  height: 16px;
}

.ai-input-area {
  margin-top: var(--space-sm);
  animation: slideDown var(--transition-normal) ease-out;
}

.ai-input-wrapper {
  display: flex;
  gap: var(--space-sm);
}

.ai-input {
  flex: 1;
}

.ai-generate-btn {
  padding: 8px 16px;
  white-space: nowrap;
}

.loading-text {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ai-error {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--accent-red);
}

/* slide-down 动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all var(--transition-normal) ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.submit-btn {
  width: 100%;
  margin-top: var(--space-sm);
  height: 48px;
  font-size: var(--text-body);
  font-weight: 600;
}

@media (max-width: 640px) {
  .reminder-form {
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .form-title {
    margin-bottom: var(--space-md);
  }
  
  .priority-selector {
    gap: var(--space-sm);
  }
  
  .priority-btn {
    padding: 6px 12px;
    font-size: var(--text-caption);
  }
  
  .submit-btn {
    height: 44px;
  }
}
</style>
