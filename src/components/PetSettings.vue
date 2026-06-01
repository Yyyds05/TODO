<template>
  <div class="pet-settings">
    <h3 class="settings-title">🐾 我的专属桌宠</h3>
    <p class="settings-desc">上传一张图片作为你的专属AI桌宠，它会一直陪伴你</p>

    <!-- 当前桌宠预览 -->
    <div class="pet-preview">
      <div class="preview-circle" :class="{ 'removed-bg': showRemovedBg && removedBgImage }">
        <img v-if="displayImage" :src="displayImage" class="preview-img" />
        <div v-else class="preview-placeholder">
          <span>🐾</span>
          <p>还没有桌宠</p>
        </div>
      </div>
      <div class="preview-actions">
        <!-- 原图/抠图切换 -->
        <label v-if="originalImage && removedBgImage" class="toggle-switch">
          <input type="checkbox" v-model="showRemovedBg" />
          <span class="toggle-label">{{ showRemovedBg ? '透明底' : '原图' }}</span>
        </label>
        <button v-if="currentImage" class="btn btn-secondary btn-sm" @click="resetPet">
          重置桌宠
        </button>
      </div>
    </div>

    <!-- 上传方式 -->
    <div class="upload-section">
      <h4>选择桌宠形象</h4>

      <!-- 本地上传 -->
      <div class="upload-method">
        <label class="upload-area" :class="{ 'has-error': uploadError, 'processing': isProcessing }">
          <input
            type="file"
            ref="fileInput"
            accept=".png,.jpg,.jpeg,.webp"
            @change="handleFileUpload"
            class="upload-input"
            :disabled="isProcessing"
          />
          <div class="upload-icon">{{ isProcessing ? '✨' : '📁' }}</div>
          <p class="upload-text">{{ isProcessing ? 'AI抠图中...' : '点击上传图片' }}</p>
          <p class="upload-hint">支持 PNG / JPG / WebP，最大 2MB</p>
          <!-- 处理进度条 -->
          <div v-if="isProcessing" class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </label>
      </div>

      <!-- 一键抠图按钮（上传后显示） -->
      <div v-if="originalImage && !removedBgImage" class="remove-bg-section">
        <button class="btn btn-primary btn-full" @click="removeBackground" :disabled="isProcessing">
          {{ isProcessing ? '抠图中...' : '✨ 一键抠图' }}
        </button>
        <p class="hint-text">去除背景，生成透明底桌宠</p>
      </div>

      <!-- 重新抠图按钮（抠图失败后显示） -->
      <div v-if="originalImage && removeBgFailed" class="remove-bg-section">
        <button class="btn btn-secondary btn-full" @click="removeBackground" :disabled="isProcessing">
          {{ isProcessing ? '重试中...' : '🔄 重新抠图' }}
        </button>
      </div>

      <!-- 粘贴链接 -->
      <div class="url-method">
        <div class="url-input-row">
          <input
            v-model="imageUrl"
            type="url"
            placeholder="粘贴图片链接..."
            class="input"
            :disabled="isProcessing"
          />
          <button class="btn btn-primary btn-sm" @click="handleUrlUpload" :disabled="!imageUrl.trim() || isProcessing">
            应用
          </button>
        </div>
      </div>

      <!-- 姿态动画开关 -->
      <div class="pose-toggle-section">
        <label class="pose-toggle">
          <input type="checkbox" v-model="poseEnabled" @change="togglePose" />
          <span class="toggle-slider"></span>
          <span class="toggle-label">开启宠物姿态动画</span>
        </label>
        <p class="pose-hint">桌宠会自动切换站立、走路、休憩姿态</p>
      </div>

      <!-- 错误提示 -->
      <p v-if="uploadError" class="error-text">{{ uploadError }}</p>
      <p v-if="uploadSuccess" class="success-text">{{ uploadSuccess }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { safeGet, safeSet, safeRemove } from '../utils/safeStorage.js'
import removeBackgroundLib from '@imgly/background-removal'

// 状态
const currentImage = ref('')
const originalImage = ref('')
const removedBgImage = ref('')
const showRemovedBg = ref(true)
const imageUrl = ref('')
const uploadError = ref('')
const uploadSuccess = ref('')
const fileInput = ref(null)
const isProcessing = ref(false)
const progressPercent = ref(0)
const removeBgFailed = ref(false)
const poseEnabled = ref(true)

// 姿态开关切换
function togglePose() {
  safeSet('pet_pose_enabled', poseEnabled.value ? 'true' : 'false')
}

// 显示的图片（根据切换状态）
const displayImage = computed(() => {
  if (showRemovedBg.value && removedBgImage.value) {
    return removedBgImage.value
  }
  return currentImage.value
})

// 初始化
onMounted(() => {
  // 优先读取抠图后的图片
  removedBgImage.value = safeGet('pet_companion_image_removed', '')
  originalImage.value = safeGet('pet_companion_image_original', '')
  
  // 读取姿态开关状态（默认开启）
  poseEnabled.value = safeGet('pet_pose_enabled', 'true') === 'true'
  
  // 当前显示的图片
  if (removedBgImage.value) {
    currentImage.value = removedBgImage.value
    showRemovedBg.value = true
  } else if (originalImage.value) {
    currentImage.value = originalImage.value
    showRemovedBg.value = false
  }
})

// 文件大小限制 2MB
const MAX_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

// 处理文件上传
async function handleFileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  uploadError.value = ''
  uploadSuccess.value = ''
  removeBgFailed.value = false

  // 格式校验
  if (!ALLOWED_TYPES.includes(file.type)) {
    uploadError.value = '格式不支持，请上传 PNG / JPG / WebP 格式的图片'
    event.target.value = ''
    return
  }

  // 大小校验
  if (file.size > MAX_SIZE) {
    uploadError.value = '图片大小不能超过 2MB'
    event.target.value = ''
    return
  }

  // 读取文件
  const reader = new FileReader()
  reader.onload = async (e) => {
    const dataUrl = e.target.result
    
    // 保存原图
    originalImage.value = dataUrl
    currentImage.value = dataUrl
    showRemovedBg.value = false
    safeSet('pet_companion_image_original', dataUrl)
    
    // 清除之前的抠图结果
    removedBgImage.value = ''
    safeRemove('pet_companion_image_removed')
    
    uploadSuccess.value = '✅ 图片已上传，可点击「一键抠图」去除背景'
    event.target.value = ''
    
    // 3秒后清除成功提示
    setTimeout(() => { uploadSuccess.value = '' }, 3000)
  }
  reader.onerror = () => {
    uploadError.value = '读取文件失败，请重试'
    event.target.value = ''
  }
  reader.readAsDataURL(file)
}

// AI抠图
async function removeBackground() {
  if (!originalImage.value || isProcessing.value) return

  isProcessing.value = true
  uploadError.value = ''
  uploadSuccess.value = ''
  progressPercent.value = 0

  try {
    // 将 base64 转换为 Blob
    const blob = await fetch(originalImage.value).then(r => r.blob())
    const file = new File([blob], 'pet.png', { type: 'image/png' })

    // 调用 AI 抠图
    const blobResult = await removeBackgroundLib(file, {
      progress: (p) => {
        progressPercent.value = Math.round(p * 100)
      },
      output: {
        format: 'image/png',
        quality: 0.8
      }
    })

    // 转换为 base64
    const reader = new FileReader()
    reader.onload = (e) => {
      removedBgImage.value = e.target.result
      currentImage.value = e.target.result
      showRemovedBg.value = true
      
      // 保存抠图结果
      safeSet('pet_companion_image_removed', e.target.result)
      
      uploadSuccess.value = '✨ 抠图完成！已生成透明底桌宠'
      removeBgFailed.value = false
      isProcessing.value = false
      
      setTimeout(() => { uploadSuccess.value = '' }, 3000)
    }
    reader.readAsDataURL(blobResult)

  } catch (err) {
    console.error('抠图失败:', err)
    uploadError.value = '图片背景较复杂，建议更换纯色背景图片'
    removeBgFailed.value = true
    isProcessing.value = false
  }
}

// 处理URL上传
async function handleUrlUpload() {
  const url = imageUrl.value.trim()
  if (!url || isProcessing.value) return

  uploadError.value = ''
  uploadSuccess.value = ''
  removeBgFailed.value = false

  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise((resolve, reject) => {
      img.onload = () => {
        if (img.width > 0 && img.height > 0) {
          // 压缩图片
          const canvas = document.createElement('canvas')
          const maxSize = 400
          let w = img.width
          let h = img.height

          if (w > maxSize || h > maxSize) {
            if (w > h) {
              h = Math.round(h * maxSize / w)
              w = maxSize
            } else {
              w = Math.round(w * maxSize / h)
              h = maxSize
            }
          }

          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, w, h)
          const dataUrl = canvas.toDataURL('image/png', 0.8)
          
          // 保存原图
          originalImage.value = dataUrl
          currentImage.value = dataUrl
          showRemovedBg.value = false
          safeSet('pet_companion_image_original', dataUrl)
          
          // 清除之前的抠图结果
          removedBgImage.value = ''
          safeRemove('pet_companion_image_removed')
          
          uploadSuccess.value = '✅ 图片已应用，可点击「一键抠图」去除背景'
          imageUrl.value = ''
          resolve()
        } else {
          reject(new Error('图片无效'))
        }
      }
      img.onerror = () => reject(new Error('无法加载图片，请检查链接'))
      img.src = url
    })
    
    setTimeout(() => { uploadSuccess.value = '' }, 3000)
  } catch (err) {
    uploadError.value = err.message || '图片加载失败'
  }
}

// 重置桌宠
function resetPet() {
  if (confirm('确定要重置桌宠吗？')) {
    safeRemove('pet_companion_image_original')
    safeRemove('pet_companion_image_removed')
    currentImage.value = ''
    originalImage.value = ''
    removedBgImage.value = ''
    showRemovedBg.value = true
    uploadSuccess.value = ''
    uploadError.value = ''
    removeBgFailed.value = false
  }
}
</script>

<style scoped>
.pet-settings {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
}

.settings-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.settings-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 20px 0;
}

/* 预览 */
.pet-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

/* 预览容器：强制1:1正方形，50%圆形圆角，柔和阴影+描边 */
.preview-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #e8f4fd, #f0e6ff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e4e6eb;
}

/* 透明底预览：使用棋盘格背景 */
.preview-circle.removed-bg {
  background: 
    linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
    linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
  background-size: 10px 10px;
  background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
  background-color: #fff;
}

/* 预览图片：强制填满容器，object-fit:cover居中裁切，禁止拉伸 */
.preview-img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  object-position: center;
  border-radius: 50%;
  display: block;
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.preview-placeholder span {
  font-size: 36px;
}

.preview-placeholder p {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

/* 切换开关 */
.toggle-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
}

.toggle-switch input {
  display: none;
}

.toggle-label {
  padding: 4px 10px;
  background: var(--bg-secondary);
  border-radius: 12px;
  transition: all 0.2s;
}

.toggle-switch input:checked + .toggle-label {
  background: var(--accent-blue);
  color: white;
}

/* 上传区域 */
.upload-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.upload-method {
  margin-bottom: 12px;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.upload-area:hover:not(.processing) {
  border-color: var(--accent-blue);
  background: rgba(0, 122, 255, 0.03);
}

.upload-area.has-error {
  border-color: var(--accent-red);
}

.upload-area.processing {
  cursor: not-allowed;
  opacity: 0.8;
}

.upload-input {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.upload-area.processing .upload-input {
  cursor: not-allowed;
}

.upload-icon {
  font-size: 32px;
}

.upload-text {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0;
}

.upload-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}

/* 进度条 */
.progress-bar {
  width: 80%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--accent-blue);
  transition: width 0.3s;
}

/* 抠图区域 */
.remove-bg-section {
  margin-bottom: 12px;
  text-align: center;
}

.btn-full {
  width: 100%;
  padding: 10px;
  font-size: 14px;
}

.hint-text {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 6px 0 0 0;
}

/* URL输入 */
.url-method {
  margin-bottom: 12px;
}

.url-input-row {
  display: flex;
  gap: 8px;
}

.url-input-row .input {
  flex: 1;
}

/* 提示 */
.error-text {
  font-size: 13px;
  color: var(--accent-red);
  margin: 8px 0 0 0;
}

.success-text {
  font-size: 13px;
  color: var(--accent-green);
  margin: 8px 0 0 0;
}

/* 按钮样式 */
.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}

/* 姿态动画开关 */
.pose-toggle-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.pose-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.pose-toggle input {
  display: none;
}

.toggle-slider {
  width: 44px;
  height: 24px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  position: relative;
  transition: background 0.3s;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pose-toggle input:checked + .toggle-slider {
  background: var(--accent-blue);
}

.pose-toggle input:checked + .toggle-slider::after {
  transform: translateX(20px);
}

.toggle-label {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.pose-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 6px 0 0 56px;
}
</style>
