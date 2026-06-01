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
        <div 
          class="pet-avatar" 
          :class="['pose-' + currentPose, { 'pose-enabled': poseEnabled }]"
          @dblclick="openFullChat"
        >
          <img v-if="displayPoseImage" :src="displayPoseImage" class="pet-img" draggable="false" />
          <img v-else-if="petImage" :src="petImage" class="pet-img" draggable="false" />
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

// 桌宠图片（优先使用抠图后的透明底图片）
const petImage = ref('')
const petImageRemoved = ref('')

// ========== AI姿态系统 ==========
const aiPoses = ref([])
const useAiPoses = ref(false)

// 姿态映射：行为 -> AI姿态名称
const POSE_MAPPING = {
  idle: '站立',    // 空闲/站立 -> 站立帧
  walk: '行走',    // 行走/游走 -> 行走帧
  rest: '跳跃',    // 互动/歪头 -> 跳跃帧
  sleep: '趴卧'    // 休息 -> 趴卧帧
}

// 显示的姿态图片（根据当前姿态选择对应的AI生成图片）
const displayPoseImage = computed(() => {
  if (!useAiPoses.value || aiPoses.value.length === 0) return null
  
  const poseName = POSE_MAPPING[currentPose.value] || '站立'
  const pose = aiPoses.value.find(p => p.name === poseName)
  return pose ? pose.image : null
})

// 初始化AI姿态
function initAiPoses() {
  const savedPoses = safeGet('pet_ai_poses', '')
  if (savedPoses) {
    try {
      aiPoses.value = JSON.parse(savedPoses)
      useAiPoses.value = aiPoses.value.length > 0
    } catch (e) {
      console.warn('解析AI姿态失败:', e)
      aiPoses.value = []
      useAiPoses.value = false
    }
  }
}

// ========== 自主游走系统 ==========
const roamingEnabled = ref(safeGet('pet_roaming_enabled', 'true') === 'true')
let isRoaming = false
let roamAnimationId = null
let roamPosX = 0
let roamPosY = 0
let roamVelX = 0
let roamVelY = 0
const ROAM_SPEED = 0.5 // 移动速度（像素/帧）
const ROAM_PADDING = 80 // 边界留白（避免完全贴边）

// 开始自主游走
function startRoaming() {
  if (!roamingEnabled.value || isRoaming || isDragging || showQuickChat.value || showFullChat.value) return
  
  isRoaming = true
  
  // 初始化位置（从当前位置开始）
  const rect = document.querySelector('.pet-body')?.getBoundingClientRect()
  if (rect) {
    roamPosX = window.innerWidth - rect.right
    roamPosY = window.innerHeight - rect.bottom
  }
  
  // 随机初始方向
  const angle = Math.random() * Math.PI * 2
  roamVelX = Math.cos(angle) * ROAM_SPEED
  roamVelY = Math.sin(angle) * ROAM_SPEED
  
  // 切换为走路姿态
  currentPose.value = 'walk'
  
  // 开始动画循环
  roamLoop()
}

// 游走动画循环
function roamLoop() {
  if (!isRoaming) return
  
  // 计算新位置
  roamPosX += roamVelX
  roamPosY += roamVelY
  
  // 获取窗口尺寸
  const maxX = window.innerWidth - ROAM_PADDING
  const maxY = window.innerHeight - ROAM_PADDING
  const minX = ROAM_PADDING - 64 // 64是桌宠宽度
  const minY = ROAM_PADDING - 64
  
  // 边界检测与反弹
  if (roamPosX <= minX || roamPosX >= maxX) {
    roamVelX = -roamVelX
    roamPosX = Math.max(minX, Math.min(maxX, roamPosX))
    // 随机微调Y方向
    roamVelY += (Math.random() - 0.5) * 0.2
  }
  
  if (roamPosY <= minY || roamPosY >= maxY) {
    roamVelY = -roamVelY
    roamPosY = Math.max(minY, Math.min(maxY, roamPosY))
    // 随机微调X方向
    roamVelX += (Math.random() - 0.5) * 0.2
  }
  
  // 偶尔随机改变方向（增加自然感）
  if (Math.random() < 0.005) {
    const angle = Math.random() * Math.PI * 2
    roamVelX = Math.cos(angle) * ROAM_SPEED
    roamVelY = Math.sin(angle) * ROAM_SPEED
  }
  
  // 更新位置
  petPosition.value = {
    right: roamPosX + 'px',
    bottom: roamPosY + 'px'
  }
  
  // 继续循环
  roamAnimationId = requestAnimationFrame(roamLoop)
}

// 停止自主游走
function stopRoaming() {
  isRoaming = false
  if (roamAnimationId) {
    cancelAnimationFrame(roamAnimationId)
    roamAnimationId = null
  }
  // 恢复姿态循环
  if (poseEnabled.value && !showQuickChat.value && !showFullChat.value) {
    currentPose.value = 'idle'
    startPoseAnimation()
  }
}

// ========== 姿态动画系统 ==========
// 姿态类型：idle(站立) | walk(走路) | rest(跳跃/互动) | sleep(趴卧)
const currentPose = ref('idle')
const poseEnabled = ref(safeGet('pet_pose_enabled', 'true') === 'true')
let poseTimer = null
let walkFrame = 0

// 空闲姿态循环配置（站立↔趴卧，5分钟切换）
const IDLE_POSE_CYCLE = ['idle', 'sleep']
let idlePoseIndex = 0

// 开始空闲姿态循环（站立/趴卧交替，5分钟一次）
function startIdlePoseCycle() {
  if (!poseEnabled.value) return
  
  poseTimer = setTimeout(() => {
    idlePoseIndex = (idlePoseIndex + 1) % IDLE_POSE_CYCLE.length
    currentPose.value = IDLE_POSE_CYCLE[idlePoseIndex]
    startIdlePoseCycle()
  }, 5 * 60 * 1000) // 5分钟
}

// 开始姿态动画循环（非空闲时的快速切换）
function startPoseAnimation() {
  if (!poseEnabled.value) return
  startIdlePoseCycle()
}

// 停止姿态动画
function stopPoseAnimation() {
  if (poseTimer) {
    clearTimeout(poseTimer)
    poseTimer = null
  }
}

// 设置特定姿态（用于交互时）
function setPose(pose) {
  stopPoseAnimation()
  currentPose.value = pose
  walkFrame = 0
  
  // 跳跃姿态是单次触发，0.3秒后恢复站立
  if (pose === 'rest') {
    setTimeout(() => {
      currentPose.value = 'idle'
      if (poseEnabled.value) startPoseAnimation()
    }, 400)
    return
  }
  
  // 其他交互结束后恢复空闲循环
  if (poseEnabled.value && pose !== 'idle') {
    setTimeout(() => {
      currentPose.value = 'idle'
      startPoseAnimation()
    }, 2000)
  }
}

// 初始化桌宠图片
function initPetImage() {
  // 优先读取抠图后的透明底图片
  petImageRemoved.value = safeGet('pet_companion_image_removed', '')
  const originalImage = safeGet('pet_companion_image_original', '')
  
  if (petImageRemoved.value) {
    petImage.value = petImageRemoved.value
  } else if (originalImage) {
    petImage.value = originalImage
  } else {
    petImage.value = ''
  }
  
  // 初始化AI姿态
  initAiPoses()
}

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
  // 初始化
  initPetImage()
  
  // 启动姿态动画或自主游走（游走优先）
  if (roamingEnabled.value) {
    setTimeout(() => startRoaming(), 1000)
  } else if (poseEnabled.value) {
    startPoseAnimation()
  }
  
  storageListener = () => {
    initPetImage()
    // 监听姿态开关变化
    const newPoseEnabled = safeGet('pet_pose_enabled', 'true') === 'true'
    if (newPoseEnabled !== poseEnabled.value) {
      poseEnabled.value = newPoseEnabled
      if (poseEnabled.value && !roamingEnabled.value) {
        startPoseAnimation()
      } else {
        stopPoseAnimation()
        currentPose.value = 'idle'
      }
    }
    // 监听游走开关变化
    const newRoamingEnabled = safeGet('pet_roaming_enabled', 'true') === 'true'
    if (newRoamingEnabled !== roamingEnabled.value) {
      roamingEnabled.value = newRoamingEnabled
      if (roamingEnabled.value) {
        stopPoseAnimation()
        startRoaming()
      } else {
        stopRoaming()
        if (poseEnabled.value) startPoseAnimation()
      }
    }
  }
  window.addEventListener('storage', storageListener)

  // 定时检查（兼容同页面更新）
  const timer = setInterval(() => {
    const removedImage = safeGet('pet_companion_image_removed', '')
    const originalImage = safeGet('pet_companion_image_original', '')
    
    // 检查是否有更新
    if (removedImage !== petImageRemoved.value) {
      petImageRemoved.value = removedImage
      petImage.value = removedImage || originalImage
    }
    
    // 检查AI姿态更新
    const savedPoses = safeGet('pet_ai_poses', '')
    if (savedPoses) {
      try {
        const newPoses = JSON.parse(savedPoses)
        if (JSON.stringify(newPoses) !== JSON.stringify(aiPoses.value)) {
          aiPoses.value = newPoses
          useAiPoses.value = newPoses.length > 0
        }
      } catch (e) {}
    }
  }, 1000)

  onUnmounted(() => {
    window.removeEventListener('storage', storageListener)
    clearInterval(timer)
    stopPoseAnimation()
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

  // 拖拽开始时停止游走和姿态动画
  stopRoaming()
  stopPoseAnimation()
  currentPose.value = 'idle'

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
    
    // 拖拽结束后恢复游走和姿态循环
    if (roamingEnabled.value) {
      setTimeout(() => startRoaming(), 500)
    } else if (poseEnabled.value) {
      startPoseAnimation()
    }
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
    // 双击 - 切换为歪头互动姿态
    setPose('rest')
    openFullChat()
  } else {
    clickTimer = setTimeout(() => {
      clickTimer = null
      // 单击 - 切换为歪头互动姿态
      setPose('rest')
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
    // 打开对话时停止游走
    stopRoaming()
    unreadCount.value = 0
    nextTick(() => {
      if (quickChatRef.value) {
        quickChatRef.value.scrollTop = quickChatRef.value.scrollHeight
      }
    })
  } else {
    // 关闭对话后恢复游走
    if (roamingEnabled.value) {
      setTimeout(() => startRoaming(), 500)
    }
  }
}

function openFullChat() {
  showFullChat.value = true
  showQuickChat.value = false
  showBubble.value = false
  unreadCount.value = 0
  // 打开对话时停止游走
  stopRoaming()
  nextTick(() => {
    if (fullChatRef.value) {
      fullChatRef.value.scrollTop = fullChatRef.value.scrollHeight
    }
  })
}

function closeFullChat() {
  showFullChat.value = false
  // 关闭对话后恢复游走
  if (roamingEnabled.value) {
    setTimeout(() => startRoaming(), 500)
  }
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

/* 图片容器：object-fit:contain完整展示 */
.pet-mini-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  object-position: center bottom;
  border-radius: 0;
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
/* 透明容器：无圆角裁切，保留柔和阴影，透明底宠物自然融合 */
.pet-avatar {
  width: 64px;
  height: 64px;
  border-radius: 0;
  overflow: visible;
  background: transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: none;
  position: relative;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.pet-avatar:hover {
  transform: scale(1.05);
}

/* 图片：object-fit:contain完整展示宠物主体，不裁切不变形 */
.pet-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  object-position: center bottom;
  border-radius: 0;
  display: block;
}

/* ========== 姿态动画系统 ========== */
/* 姿态1：站立 — 轻微呼吸效果，scale微动，2秒循环 */
.pet-avatar.pose-enabled.pose-idle .pet-img {
  animation: poseIdle 2s ease-in-out infinite;
}

@keyframes poseIdle {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

/* 姿态2：行走 — 左右偏移+脚步微动，180ms切换，模拟走路 */
.pet-avatar.pose-enabled.pose-walk .pet-img {
  animation: poseWalk 0.18s steps(1) infinite;
}

@keyframes poseWalk {
  0% { transform: translateX(-1px) translateY(0); }
  50% { transform: translateX(1px) translateY(-1px); }
}

/* 姿态3：跳跃 — 向上弹跳+回弹，单次触发 */
.pet-avatar.pose-enabled.pose-rest .pet-img {
  animation: poseJump 0.3s ease-out forwards;
}

@keyframes poseJump {
  0% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
  70% { transform: translateY(-2px); }
  100% { transform: translateY(0); }
}

/* 姿态4：趴卧/休憩 — 缓慢歪头微动，3秒循环，慵懒感 */
.pet-avatar.pose-enabled.pose-sleep .pet-img {
  animation: poseSleep 3s ease-in-out infinite;
}

@keyframes poseSleep {
  0%, 100% { transform: rotate(0deg); }
  30% { transform: rotate(3deg); }
  60% { transform: rotate(-2deg); }
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
  /* 移动端：48px×48px */
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
