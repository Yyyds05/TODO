<template>
  <!-- 全局悬浮桌宠组件 -->
  <div class="pet-companion">
    <!-- 最小化小图标 -->
    <Transition name="pet-pop">
      <div
        v-if="isMinimized"
        class="pet-mini"
        @click="expandPet"
        title="点击展开桌宠"
      >
        <img v-if="petImage" :src="petImage" class="pet-mini-img" />
        <span v-else class="pet-mini-placeholder">🐾</span>
        <span v-if="unreadCount > 0" class="pet-badge">{{ unreadCount }}</span>
      </div>
    </Transition>

    <!-- 桌宠主体 -->
    <Transition name="pet-pop">
      <div
        v-if="!isMinimized && showPet"
        class="pet-body"
        :style="petPosition"
        @mousedown="startDrag"
        @touchstart="startDrag"
      >
        <!-- 桌宠图片 -->
        <div class="pet-avatar" @dblclick="openFullChat">
          <img v-if="petImage" :src="petImage" class="pet-img" draggable="false" />
          <div v-else class="pet-placeholder">
            <span>🐾</span>
            <p>设置你的桌宠</p>
          </div>
          <!-- 加载动画 -->
          <div v-if="isAiThinking" class="pet-thinking">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>

        <!-- 气泡对话（单击触发） -->
        <Transition name="bubble">
          <div v-if="showBubble && currentBubble" class="pet-bubble" @click.stop>
            <div class="bubble-content">{{ currentBubble }}</div>
            <div class="bubble-arrow"></div>
          </div>
        </Transition>

        <!-- 快捷对话面板（单击触发） -->
        <Transition name="chat-panel">
          <div v-if="showQuickChat" class="pet-quick-chat" @click.stop>
            <div class="quick-chat-messages" ref="quickChatRef">
              <div
                v-for="(msg, i) in quickMessages"
                :key="i"
                :class="['chat-msg', msg.role]"
              >
                <div class="chat-msg-content">{{ msg.content }}</div>
              </div>
              <div v-if="isAiThinking" class="chat-msg ai">
                <div class="chat-msg-content typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
            <div class="quick-chat-input">
              <input
                v-model="userInput"
                @keyup.enter="sendQuickMessage"
                placeholder="和桌宠聊聊天..."
                :disabled="isAiThinking"
              />
              <button @click="sendQuickMessage" :disabled="isAiThinking || !userInput.trim()">
                发送
              </button>
            </div>
          </div>
        </Transition>

        <!-- 控制按钮 -->
        <div class="pet-controls">
          <button class="pet-ctrl-btn" @click.stop="openFullChat" title="AI对话">
            💬
          </button>
          <button class="pet-ctrl-btn" @click.stop="minimizePet" title="最小化">
            ➖
          </button>
          <button class="pet-ctrl-btn" @click.stop="hidePet" title="隐藏">
            ✕
          </button>
        </div>
      </div>
    </Transition>

    <!-- 完整AI对话弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showFullChat" class="pet-chat-modal" @click.self="closeFullChat">
          <div class="pet-chat-window">
            <div class="chat-header">
              <div class="chat-header-info">
                <span class="chat-avatar">🐾</span>
                <div>
                  <h3>专属桌宠 AI</h3>
                  <p class="chat-status">{{ isAiThinking ? '思考中...' : '在线' }}</p>
                </div>
              </div>
              <button class="chat-close" @click="closeFullChat">✕</button>
            </div>
            <div class="chat-body" ref="fullChatRef">
              <div
                v-for="(msg, i) in fullMessages"
                :key="i"
                :class="['chat-msg', msg.role]"
              >
                <div class="chat-msg-content">{{ msg.content }}</div>
              </div>
              <div v-if="isAiThinking" class="chat-msg ai">
                <div class="chat-msg-content typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
            <div class="chat-footer">
              <button class="chat-action-btn" @click="clearFullChat" title="清空对话">🗑️</button>
              <input
                v-model="fullInput"
                @keyup.enter="sendFullMessage"
                placeholder="输入消息..."
                :disabled="isAiThinking"
              />
              <button class="chat-send-btn" @click="sendFullMessage" :disabled="isAiThinking || !fullInput.trim()">
                发送
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { safeGet } from '../utils/safeStorage.js'

// ========== 状态 ==========
const showPet = ref(true)
const isMinimized = ref(false)
const showBubble = ref(false)
const showQuickChat = ref(false)
const showFullChat = ref(false)
const isAiThinking = ref(false)
const unreadCount = ref(0)
const userInput = ref('')
const fullInput = ref('')
const quickChatRef = ref(null)
const fullChatRef = ref(null)

// 桌宠图片
const petImage = ref(safeGet('pet_companion_image', ''))

// 桌宠位置
const petPosition = ref({
  right: '24px',
  bottom: '140px'
})

// 拖拽状态
let isDragging = false
let dragStartX = 0
let dragStartY = 0
let startPosRight = 0
let startPosBottom = 0

// 对话消息
const quickMessages = ref([
  { role: 'ai', content: '你好呀！我是你的专属桌宠 🐾 点击我可以聊天哦~' }
])

const fullMessages = ref([
  { role: 'ai', content: '你好！我是你的专属桌宠 AI 🐾\n可以陪你聊天、制定计划、分析问题，有什么需要帮忙的吗？' }
])

// 当前气泡文字
const currentBubble = ref('')

// ========== 桌宠图片监听 ==========
// 监听 localStorage 变化（其他页面可能更新了桌宠图片）
let storageListener = null
onMounted(() => {
  storageListener = () => {
    petImage.value = safeGet('pet_companion_image', '')
  }
  window.addEventListener('storage', storageListener)

  // 定时检查（兼容同页面更新）
  const timer = setInterval(() => {
    const newImage = safeGet('pet_companion_image', '')
    if (newImage !== petImage.value) {
      petImage.value = newImage
    }
  }, 1000)

  onUnmounted(() => {
    window.removeEventListener('storage', storageListener)
    clearInterval(timer)
  })
})

// ========== 拖拽功能 ==========
function startDrag(e) {
  // 如果点击的是按钮或输入框，不触发拖拽
  if (e.target.closest('.pet-controls') || e.target.closest('.pet-quick-chat')) return

  isDragging = false
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  dragStartX = clientX
  dragStartY = clientY

  // 计算当前位置
  const rect = e.currentTarget.getBoundingClientRect()
  startPosRight = window.innerWidth - rect.right
  startPosBottom = window.innerHeight - rect.bottom

  const onMove = (ev) => {
    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX
    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY
    const dx = cx - dragStartX
    const dy = cy - dragStartY

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isDragging = true
    }

    if (isDragging) {
      const newRight = Math.max(0, Math.min(window.innerWidth - 60, startPosRight - dx))
      const newBottom = Math.max(0, Math.min(window.innerHeight - 60, startPosBottom - dy))
      petPosition.value = {
        right: newRight + 'px',
        bottom: newBottom + 'px'
      }
    }
  }

  const onEnd = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onEnd)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onEnd)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onEnd)
  document.addEventListener('touchmove', onMove, { passive: false })
  document.addEventListener('touchend', onEnd)
}

// ========== 点击交互 ==========
// 单击 → 快捷对话
// 双击 → 完整对话
let clickTimer = null

function handlePetClick() {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
    // 双击
    openFullChat()
  } else {
    clickTimer = setTimeout(() => {
      clickTimer = null
      // 单击
      toggleQuickChat()
    }, 250)
  }
}

// 监听桌宠头像点击
onMounted(() => {
  document.addEventListener('click', (e) => {
    const avatar = e.target.closest('.pet-avatar')
    if (avatar && !isDragging) {
      handlePetClick()
    }
  })
})

function toggleQuickChat() {
  showQuickChat.value = !showQuickChat.value
  showBubble.value = false
  if (showQuickChat.value) {
    unreadCount.value = 0
    nextTick(() => {
      if (quickChatRef.value) {
        quickChatRef.value.scrollTop = quickChatRef.value.scrollHeight
      }
    })
  }
}

function openFullChat() {
  showFullChat.value = true
  showQuickChat.value = false
  showBubble.value = false
  unreadCount.value = 0
  nextTick(() => {
    if (fullChatRef.value) {
      fullChatRef.value.scrollTop = fullChatRef.value.scrollHeight
    }
  })
}

function closeFullChat() {
  showFullChat.value = false
}

// ========== 控制按钮 ==========
function minimizePet() {
  isMinimized.value = true
  showQuickChat.value = false
  showBubble.value = false
}

function expandPet() {
  isMinimized.value = false
}

function hidePet() {
  showPet.value = false
}

// ========== AI 对话 ==========
const SYSTEM_PROMPT = '你是用户的专属陪伴桌宠 AI，性格可爱、简洁、贴心，能陪用户聊天、制定学习/工作计划、提醒待办任务、分析项目问题。语气温暖简短，不啰嗦。每次回复控制在3句话以内。'

async function callDeepSeek(messages) {
  const apiKey = safeGet('deepseek_api_key')
  if (!apiKey) {
    return '还没有配置 DeepSeek API 密钥哦~\n请先去「设置」页面配置一下吧 🐾'
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      temperature: 0.8
    })
  })

  if (!response.ok) throw new Error('API 调用失败')
  const data = await response.json()
  return data.choices[0]?.message?.content || '抱歉，我有点懵了 🐾'
}

async function sendQuickMessage() {
  const text = userInput.value.trim()
  if (!text || isAiThinking.value) return

  quickMessages.value.push({ role: 'user', content: text })
  userInput.value = ''
  isAiThinking.value = true

  await nextTick()
  if (quickChatRef.value) {
    quickChatRef.value.scrollTop = quickChatRef.value.scrollHeight
  }

  try {
    const reply = await callDeepSeek(
      quickMessages.value.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))
    )
    quickMessages.value.push({ role: 'ai', content: reply })
  } catch (err) {
    quickMessages.value.push({ role: 'ai', content: '哎呀，出了点问题：' + err.message })
  } finally {
    isAiThinking.value = false
    await nextTick()
    if (quickChatRef.value) {
      quickChatRef.value.scrollTop = quickChatRef.value.scrollHeight
    }
  }
}

async function sendFullMessage() {
  const text = fullInput.value.trim()
  if (!text || isAiThinking.value) return

  fullMessages.value.push({ role: 'user', content: text })
  fullInput.value = ''
  isAiThinking.value = true

  await nextTick()
  if (fullChatRef.value) {
    fullChatRef.value.scrollTop = fullChatRef.value.scrollHeight
  }

  try {
    const reply = await callDeepSeek(
      fullMessages.value.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))
    )
    fullMessages.value.push({ role: 'ai', content: reply })
  } catch (err) {
    fullMessages.value.push({ role: 'ai', content: '哎呀，出了点问题：' + err.message })
  } finally {
    isAiThinking.value = false
    await nextTick()
    if (fullChatRef.value) {
      fullChatRef.value.scrollTop = fullChatRef.value.scrollHeight
    }
  }
}

function clearFullChat() {
  fullMessages.value = [
    { role: 'ai', content: '对话已清空，有什么新的需要吗？🐾' }
  ]
}

// ========== 欢迎气泡 ==========
onMounted(() => {
  setTimeout(() => {
    if (petImage.value) {
      currentBubble.value = '今天有什么计划吗？🐾'
      showBubble.value = true
      unreadCount.value = 1
      setTimeout(() => { showBubble.value = false }, 5000)
    }
  }, 2000)
})
</script>

<style scoped>
/* ========== 桌宠容器 ========== */
.pet-companion {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
}

.pet-companion > * {
  pointer-events: auto;
}

/* ========== 最小化图标 ========== */
.pet-mini {
  position: fixed;
  right: 24px;
  bottom: 140px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e4e6eb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.pet-mini:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 图片容器：强制1:1正方形，object-fit:cover居中裁切 */
.pet-mini-img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  object-position: center;
  border-radius: 50%;
  display: block;
}

.pet-mini-placeholder {
  font-size: 24px;
}

.pet-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  background: var(--accent-red);
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ========== 桌宠主体 ========== */
.pet-body {
  position: fixed;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.pet-body:active {
  cursor: grabbing;
}

/* ========== 桌宠头像 ========== */
/* 外层容器：强制1:1正方形，50%圆形圆角，柔和阴影+描边 */
.pet-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e4e6eb;
  position: relative;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.pet-avatar:hover {
  transform: scale(1.05);
}

/* 图片：强制填满容器，object-fit:cover居中裁切，禁止拉伸 */
.pet-img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  object-position: center;
  border-radius: 50%;
  display: block;
}

.pet-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f4fd, #f0e6ff);
  gap: 2px;
}

.pet-placeholder span {
  font-size: 28px;
}

.pet-placeholder p {
  font-size: 9px;
  color: var(--text-secondary);
  margin: 0;
  text-align: center;
  line-height: 1.2;
}

/* AI 思考动画 */
.pet-thinking {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 3px;
  padding: 4px 8px;
  background: var(--bg-primary);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pet-thinking .dot {
  width: 6px;
  height: 6px;
  background: var(--accent-blue);
  border-radius: 50%;
  animation: petBounce 1.4s infinite;
}

.pet-thinking .dot:nth-child(2) { animation-delay: 0.2s; }
.pet-thinking .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes petBounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

/* ========== 气泡 ========== */
.pet-bubble {
  position: relative;
  max-width: 200px;
  padding: 10px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px 16px 16px 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-line;
  word-break: break-word;
}

.bubble-arrow {
  position: absolute;
  bottom: -6px;
  left: 12px;
  width: 12px;
  height: 12px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  transform: rotate(45deg);
}

/* ========== 快捷对话面板 ========== */
.pet-quick-chat {
  width: 280px;
  max-height: 360px;
  background: var(--bg-primary);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.quick-chat-messages {
  flex: 1;
  max-height: 240px;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-chat-input {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border-color);
}

.quick-chat-input input {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  outline: none;
  background: var(--bg-secondary);
}

.quick-chat-input input:focus {
  border-color: var(--accent-blue);
}

.quick-chat-input button {
  padding: 8px 14px;
  font-size: 13px;
  background: var(--accent-blue);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.quick-chat-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ========== 对话消息 ========== */
.chat-msg {
  max-width: 85%;
  display: flex;
}

.chat-msg.user {
  align-self: flex-end;
}

.chat-msg-content {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-line;
  word-break: break-word;
}

.chat-msg.ai .chat-msg-content {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
}

.chat-msg.user .chat-msg-content {
  background: var(--accent-blue);
  color: white;
  border-bottom-right-radius: 4px;
}

/* 打字动画 */
.chat-msg-content.typing {
  display: flex;
  gap: 4px;
  padding: 10px 14px;
}

.chat-msg-content.typing span {
  width: 6px;
  height: 6px;
  background: var(--text-tertiary);
  border-radius: 50%;
  animation: petBounce 1.4s infinite;
}

.chat-msg-content.typing span:nth-child(2) { animation-delay: 0.2s; }
.chat-msg-content.typing span:nth-child(3) { animation-delay: 0.4s; }

/* ========== 控制按钮 ========== */
.pet-controls {
  display: flex;
  gap: 4px;
}

.pet-ctrl-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: var(--bg-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.pet-ctrl-btn:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* ========== 完整对话弹窗 ========== */
.pet-chat-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.pet-chat-window {
  width: 100%;
  max-width: 420px;
  max-height: 600px;
  background: var(--bg-primary);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--accent-blue), #5856d6);
  color: white;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-avatar {
  font-size: 28px;
}

.chat-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.chat-status {
  margin: 2px 0 0 0;
  font-size: 12px;
  opacity: 0.8;
}

.chat-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.chat-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 300px;
}

.chat-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
}

.chat-action-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s;
}

.chat-action-btn:hover {
  background: var(--bg-tertiary);
}

.chat-footer input {
  flex: 1;
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  outline: none;
  background: var(--bg-secondary);
}

.chat-footer input:focus {
  border-color: var(--accent-blue);
}

.chat-send-btn {
  padding: 10px 18px;
  font-size: 14px;
  background: var(--accent-blue);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.2s;
}

.chat-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ========== 动画 ========== */
.pet-pop-enter-active, .pet-pop-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pet-pop-enter-from, .pet-pop-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

.bubble-enter-active, .bubble-leave-active {
  transition: all 0.3s ease;
}

.bubble-enter-from, .bubble-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.9);
}

.chat-panel-enter-active, .chat-panel-leave-active {
  transition: all 0.25s ease;
}

.chat-panel-enter-from, .chat-panel-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.modal-enter-active, .modal-leave-active {
  transition: all 0.25s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-from .pet-chat-window,
.modal-leave-to .pet-chat-window {
  transform: scale(0.9) translateY(20px);
}

/* ========== 响应式 ========== */
@media (max-width: 640px) {
  /* 移动端：48px×48px 正方形 */
  .pet-avatar {
    width: 48px;
    height: 48px;
  }

  .pet-img {
    width: 48px;
    height: 48px;
  }

  .pet-placeholder span {
    font-size: 22px;
  }

  .pet-placeholder p {
    font-size: 8px;
  }

  .pet-quick-chat {
    width: 240px;
    max-height: 300px;
  }

  .pet-chat-window {
    max-height: 500px;
    border-radius: 16px;
  }

  /* 移动端最小化图标：48px×48px */
  .pet-mini {
    right: 16px;
    bottom: 120px;
    width: 48px;
    height: 48px;
  }

  .pet-mini-img {
    width: 48px;
    height: 48px;
  }

  .pet-controls {
    gap: 2px;
  }

  .pet-ctrl-btn {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }
}
</style>
