<template>
  <div class="pose-generator">
    <!-- 姿态生成状态 -->
    <div v-if="isGenerating" class="generating-status">
      <div class="generating-animation">
        <span class="gen-dot"></span>
        <span class="gen-dot"></span>
        <span class="gen-dot"></span>
      </div>
      <p class="gen-text">{{ generatingText }}</p>
      <div class="gen-progress">
        <div class="gen-progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <!-- 生成结果预览 -->
    <div v-if="generatedPoses.length > 0" class="poses-preview">
      <h4>🎨 AI生成姿态</h4>
      <div class="poses-grid">
        <div v-for="(pose, index) in generatedPoses" :key="index" class="pose-item">
          <img :src="pose.image" :alt="pose.name" class="pose-img" />
          <span class="pose-name">{{ pose.name }}</span>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <p v-if="errorText" class="error-text">{{ errorText }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { safeGet, safeSet } from '../utils/safeStorage.js'

// 状态
const isGenerating = ref(false)
const generatingText = ref('')
const progressPercent = ref(0)
const generatedPoses = ref([])
const errorText = ref('')

// 姿态配置
const POSE_CONFIGS = [
  { name: '站立', prompt: 'standing pose, upright, alert expression, transparent background' },
  { name: '行走', prompt: 'walking pose, mid-step, legs moving, transparent background' },
  { name: '跳跃', prompt: 'jumping pose, playful, mid-air, happy expression, transparent background' },
  { name: '趴卧', prompt: 'lying down pose, resting, relaxed, cozy position, transparent background' }
]

// 系统提示词
const SYSTEM_PROMPT = 'Based on this pet image, generate consistent style transparent background frame images for desktop pet animation. Keep the same character appearance, simple composition, complete subject.'

// 初始化
onMounted(() => {
  // 读取已生成的姿态
  const savedPoses = safeGet('pet_ai_poses', '')
  if (savedPoses) {
    try {
      generatedPoses.value = JSON.parse(savedPoses)
    } catch (e) {
      console.warn('解析已保存姿态失败:', e)
    }
  }
})

// 生成姿态
async function generatePoses(sourceImage) {
  if (!sourceImage || isGenerating.value) return

  // 检查API密钥
  const apiKey = safeGet('stability_api_key', '')
  if (!apiKey) {
    errorText.value = '请先在设置页配置 Stability AI API 密钥'
    return false
  }

  isGenerating.value = true
  errorText.value = ''
  progressPercent.value = 0
  generatedPoses.value = []

  try {
    const poses = []
    
    for (let i = 0; i < POSE_CONFIGS.length; i++) {
      const config = POSE_CONFIGS[i]
      generatingText.value = `正在生成「${config.name}」姿态... (${i + 1}/${POSE_CONFIGS.length})`
      progressPercent.value = ((i + 1) / POSE_CONFIGS.length) * 100

      // 调用 Stability AI image-to-image API
      const poseImage = await generatePoseWithStability(sourceImage, config.prompt, apiKey)
      
      if (poseImage) {
        poses.push({
          name: config.name,
          image: poseImage,
          prompt: config.prompt
        })
      } else {
        // 生成失败，使用原图作为备选
        poses.push({
          name: config.name,
          image: sourceImage,
          prompt: config.prompt,
          isFallback: true
        })
      }
    }

    generatedPoses.value = poses
    
    // 保存到 localStorage
    safeSet('pet_ai_poses', JSON.stringify(poses))
    
    generatingText.value = '✅ 姿态生成完成！'
    isGenerating.value = false
    
    return true

  } catch (err) {
    console.error('姿态生成失败:', err)
    errorText.value = '姿态生成失败：' + (err.message || '网络错误，请稍后重试')
    isGenerating.value = false
    return false
  }
}

// 调用 Stability AI API
async function generatePoseWithStability(sourceImage, posePrompt, apiKey) {
  try {
    // 将 base64 图片转换为 FormData
    const base64Data = sourceImage.split(',')[1]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/png' })

    // 构建 FormData
    const formData = new FormData()
    formData.append('init_image', blob, 'source.png')
    formData.append('init_image_mode', 'IMAGE_STRENGTH')
    formData.append('image_strength', '0.35') // 保持原图特征的强度
    formData.append('text_prompts[0][text]', `${SYSTEM_PROMPT} ${posePrompt}`)
    formData.append('text_prompts[0][weight]', '1')
    formData.append('cfg_scale', '7')
    formData.append('samples', '1')
    formData.append('steps', '30')
    formData.append('width', '512')
    formData.append('height', '512')
    formData.append('style_preset', 'pixel-art') // 简洁风格

    const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: formData
    })

    if (!response.ok) {
      // 不抛出错误，静默失败使用原图
      console.warn('Stability API响应异常:', response.status)
      return null
    }

    const data = await response.json()
    
    // Stability AI 返回 base64 编码的图片
    if (data.artifacts && data.artifacts.length > 0) {
      return `data:image/png;base64,${data.artifacts[0].base64}`
    }
    
    return null

  } catch (err) {
    console.warn('Stability API调用失败:', err)
    return null
  }
}

// 获取指定姿态的图片
function getPoseImage(poseName) {
  const pose = generatedPoses.value.find(p => p.name === poseName)
  return pose ? pose.image : null
}

// 清除已生成的姿态
function clearPoses() {
  generatedPoses.value = []
  safeSet('pet_ai_poses', '')
}

// 导出函数供外部调用
defineExpose({
  generatePoses,
  getPoseImage,
  clearPoses,
  generatedPoses,
  isGenerating
})
</script>

<style scoped>
.pose-generator {
  padding: var(--space-md);
}

.generating-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.generating-animation {
  display: flex;
  gap: 6px;
}

.gen-dot {
  width: 10px;
  height: 10px;
  background: var(--accent-blue);
  border-radius: 50%;
  animation: genBounce 1.4s infinite;
}

.gen-dot:nth-child(2) { animation-delay: 0.2s; }
.gen-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes genBounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-12px); }
}

.gen-text {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0;
}

.gen-progress {
  width: 80%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.gen-progress-fill {
  height: 100%;
  background: var(--accent-blue);
  transition: width 0.3s;
}

/* 姿态预览 */
.poses-preview {
  margin-top: 16px;
}

.poses-preview h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.poses-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.pose-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.pose-img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  object-position: center;
  border-radius: 50%;
  background: 
    linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
    linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0px;
  background-color: #fff;
}

.pose-name {
  font-size: 11px;
  color: var(--text-secondary);
}

.error-text {
  font-size: 13px;
  color: var(--accent-red);
  margin: 8px 0 0 0;
  text-align: center;
}

@media (max-width: 480px) {
  .poses-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>