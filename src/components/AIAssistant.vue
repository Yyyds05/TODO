<template>
  <div class="ai-assistant">
    <!-- AI助手入口按钮 -->
    <button class="ai-float-btn" @click="togglePanel" title="AI助手">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
        <path d="M12 2a10 10 0 0 1 10 10"/>
        <path d="M12 12L2.5 12"/>
        <path d="M12 12v9.5"/>
      </svg>
    </button>

    <!-- AI面板 -->
    <Transition name="slide-up">
      <div v-if="showPanel" class="ai-panel">
        <div class="ai-header">
          <h3>✨ AI助手</h3>
          <button class="btn-close" @click="togglePanel">×</button>
        </div>

        <!-- 功能标签页 -->
        <div class="ai-tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.key"
            :class="['ai-tab', { active: currentTab === tab.key }]"
            @click="currentTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="ai-content">
          <!-- AI对话 -->
          <div v-if="currentTab === 'chat'" class="chat-section">
            <div class="messages" ref="messagesRef">
              <div 
                v-for="(msg, index) in messages" 
                :key="index"
                :class="['message', msg.role]"
              >
                <div class="message-content">{{ msg.content }}</div>
              </div>
              <div v-if="isLoading" class="message ai loading">
                <div class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
            <div class="chat-input">
              <input 
                v-model="userInput" 
                @keyup.enter="sendMessage"
                placeholder="输入消息..."
                :disabled="isLoading"
              />
              <button @click="sendMessage" :disabled="isLoading || !userInput.trim()">
                发送
              </button>
            </div>
          </div>

          <!-- AI制定计划 -->
          <div v-if="currentTab === 'plan'" class="plan-section">
            <div class="plan-input">
              <textarea 
                v-model="planInput"
                placeholder="描述你的目标或任务，AI会帮你制定详细的执行计划..."
                rows="4"
              />
              <button @click="generatePlan" :disabled="isLoading || !planInput.trim()">
                {{ isLoading ? '生成中...' : '生成计划' }}
              </button>
            </div>
            <div v-if="generatedPlan" class="plan-result">
              <h4>📋 执行计划</h4>
              <div class="plan-content">{{ generatedPlan }}</div>
              <button class="btn-add" @click="addPlanAsReminders">
                添加到提醒列表
              </button>
            </div>
          </div>

          <!-- AI分析项目 -->
          <div v-if="currentTab === 'analyze'" class="analyze-section">
            <div class="analyze-actions">
              <button @click="analyzeReminders" :disabled="isLoading">
                {{ isLoading ? '分析中...' : '分析任务完成情况' }}
              </button>
            </div>
            <div v-if="analysisResult" class="analysis-result">
              <h4>📊 分析报告</h4>
              <div class="analysis-content">{{ analysisResult }}</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { reminders, addReminder, tags } from '../stores/reminderStore.js'
import { safeGet } from '../utils/safeStorage.js'

// 面板显示状态
const showPanel = ref(false)
const togglePanel = () => {
  showPanel.value = !showPanel.value
}

// 标签页
const tabs = [
  { key: 'chat', label: 'AI对话' },
  { key: 'plan', label: '制定计划' },
  { key: 'analyze', label: '项目分析' }
]
const currentTab = ref('chat')

// 对话相关
const messages = ref([
  { role: 'ai', content: '你好！我是SkyDesk AI助手，可以帮助你管理任务、制定计划和分析项目。有什么可以帮你的吗？' }
])
const userInput = ref('')
const messagesRef = ref(null)
const isLoading = ref(false)

// 计划相关
const planInput = ref('')
const generatedPlan = ref('')

// 分析相关
const analysisResult = ref('')

// 获取API密钥
const apiKey = computed(() => safeGet('deepseek_api_key'))

// 调用DeepSeek API
async function callDeepSeekAPI(messages, temperature = 0.7) {
  const key = apiKey.value
  if (!key) {
    throw new Error('请先设置DeepSeek API密钥')
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
      response_format: { type: 'text' }
    })
  })

  if (!response.ok) {
    throw new Error('API调用失败')
  }

  const data = await response.json()
  return data.choices[0]?.message?.content
}

// 发送消息
async function sendMessage() {
  if (!userInput.value.trim() || isLoading.value) return

  const userMsg = userInput.value.trim()
  messages.value.push({ role: 'user', content: userMsg })
  userInput.value = ''
  isLoading.value = true

  await nextTick()
  scrollToBottom()

  try {
    const aiResponse = await callDeepSeekAPI([
      {
        role: 'system',
        content: '你是SkyDesk智能助手，一个专注于任务管理和效率提升的AI助手。你可以帮助用户管理待办事项、提供时间管理建议、回答关于任务规划的问题。回答要简洁实用，避免冗长。'
      },
      ...messages.value.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content
      }))
    ])

    messages.value.push({ role: 'ai', content: aiResponse })
  } catch (err) {
    messages.value.push({ role: 'ai', content: '抱歉，发生了错误：' + err.message })
  } finally {
    isLoading.value = false
    await nextTick()
    scrollToBottom()
  }
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// 生成计划
async function generatePlan() {
  if (!planInput.value.trim() || isLoading.value) return

  isLoading.value = true
  try {
    const plan = await callDeepSeekAPI([
      {
        role: 'system',
        content: '你是任务规划专家。根据用户的目标，制定详细的执行计划，包括具体步骤、时间安排和优先级建议。输出格式要清晰易读，使用Markdown格式。'
      },
      {
        role: 'user',
        content: `请帮我制定计划：${planInput.value}`
      }
    ], 0.5)

    generatedPlan.value = plan
  } catch (err) {
    alert('生成计划失败：' + err.message)
  } finally {
    isLoading.value = false
  }
}

// 将计划添加为提醒
async function addPlanAsReminders() {
  if (!generatedPlan.value) return

  try {
    // 解析计划内容，提取任务
    const lines = generatedPlan.value.split('\n').filter(line => line.trim())
    const tasks = []
    
    for (const line of lines) {
      // 匹配类似 "1. 任务内容" 或 "- 任务内容" 的格式
      const match = line.match(/^(?:\d+[.\s]+|[\-\*]\s+)(.+)$/)
      if (match) {
        tasks.push(match[1].trim())
      }
    }

    if (tasks.length === 0) {
      alert('未能识别出具体任务，请手动添加')
      return
    }

    // 添加为提醒
    let addedCount = 0
    const now = new Date()
    
    for (let i = 0; i < Math.min(tasks.length, 5); i++) {
      try {
        await addReminder({
          title: tasks[i],
          datetime: new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'normal',
          tag: '',
          repeat: 'none',
          description: `来自AI生成的计划：${planInput.value}`
        })
        addedCount++
      } catch (e) {
        console.warn('添加提醒失败:', e)
      }
    }

    alert(`成功添加 ${addedCount} 个提醒！`)
    generatedPlan.value = ''
    planInput.value = ''
  } catch (err) {
    alert('添加失败：' + err.message)
  }
}

// 分析任务
async function analyzeReminders() {
  if (isLoading.value) return

  const allReminders = reminders.value
  if (allReminders.length === 0) {
    analysisResult.value = '暂无任务数据，请先添加一些提醒。'
    return
  }

  isLoading.value = true
  try {
    const completed = allReminders.filter(r => r.completed).length
    const pending = allReminders.filter(r => !r.completed).length
    const overdue = allReminders.filter(r => !r.completed && new Date(r.datetime) < new Date()).length
    
    // 按标签统计
    const tagStats = {}
    allReminders.forEach(r => {
      const tag = r.tag || '未分类'
      if (!tagStats[tag]) tagStats[tag] = { total: 0, completed: 0 }
      tagStats[tag].total++
      if (r.completed) tagStats[tag].completed++
    })

    const analysis = await callDeepSeekAPI([
      {
        role: 'system',
        content: '你是数据分析专家，擅长任务管理和效率分析。根据用户的任务数据，提供洞察和改进建议。语气要友好鼓励，给出具体可行的建议。'
      },
      {
        role: 'user',
        content: `请分析我的任务数据：
总任务数：${allReminders.length}
已完成：${completed} (${Math.round(completed/allReminders.length*100)}%)
待完成：${pending}
已过期：${overdue}

标签分布：
${Object.entries(tagStats).map(([tag, stat]) => `- ${tag}: ${stat.completed}/${stat.total} 完成`).join('\n')}

请给出分析和建议。`
      }
    ], 0.5)

    analysisResult.value = analysis
  } catch (err) {
    analysisResult.value = '分析失败：' + err.message
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.ai-assistant {
  position: fixed;
  bottom: 140px;
  right: 20px;
  z-index: 1000;
}

.ai-float-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #007aff, #5856d6);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.ai-float-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 122, 255, 0.5);
}

.ai-panel {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 380px;
  max-height: 600px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #007aff, #5856d6);
  color: white;
}

.ai-header h3 {
  margin: 0;
  font-size: 16px;
}

.btn-close {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.ai-tabs {
  display: flex;
  border-bottom: 1px solid #e5e5ea;
}

.ai-tab {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  font-size: 14px;
  color: #8e8e93;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-tab.active {
  color: #007aff;
  border-bottom: 2px solid #007aff;
}

.ai-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 对话样式 */
.chat-section {
  display: flex;
  flex-direction: column;
  height: 400px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
  padding-right: 4px;
}

.message {
  margin-bottom: 12px;
  max-width: 85%;
}

.message.user {
  margin-left: auto;
}

.message-content {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
}

.message.ai .message-content {
  background: #f2f2f7;
  color: #000;
}

.message.user .message-content {
  background: #007aff;
  color: white;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 14px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #8e8e93;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
}

.chat-input {
  display: flex;
  gap: 8px;
}

.chat-input input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e5e5ea;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}

.chat-input input:focus {
  border-color: #007aff;
}

.chat-input button {
  padding: 10px 16px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.chat-input button:disabled {
  background: #c7c7cc;
  cursor: not-allowed;
}

/* 计划样式 */
.plan-section, .analyze-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e5ea;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  outline: none;
}

.plan-input textarea:focus {
  border-color: #007aff;
}

.plan-input button, .analyze-actions button {
  width: 100%;
  padding: 12px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}

.plan-input button:disabled, .analyze-actions button:disabled {
  background: #c7c7cc;
  cursor: not-allowed;
}

.plan-result, .analysis-result {
  background: #f2f2f7;
  border-radius: 12px;
  padding: 16px;
}

.plan-result h4, .analysis-result h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #007aff;
}

.plan-content, .analysis-content {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.btn-add {
  margin-top: 12px;
  width: 100%;
  padding: 10px;
  background: #34c759;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

/* 动画 */
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@media (max-width: 480px) {
  .ai-panel {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .ai-assistant {
    bottom: 100px;
    right: 16px;
  }
}
</style>
