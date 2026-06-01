<template>
  <div class="pet-settings">
    <h3 class="settings-title">🐾 我的专属桌宠</h3>
    <p class="settings-desc">上传一张图片作为你的专属AI桌宠，它会一直陪伴你</p>

    <!-- 当前桌宠预览 -->
    <div class="pet-preview">
      <div class="preview-circle">
        <img v-if="currentImage" :src="currentImage" class="preview-img" />
        <div v-else class="preview-placeholder">
          <span>🐾</span>
          <p>还没有桌宠</p>
        </div>
      </div>
      <div class="preview-actions">
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
        <label class="upload-area" :class="{ 'has-error': uploadError }">
          <input
            type="file"
            ref="fileInput"
            accept=".png,.jpg,.jpeg,.webp"
            @change="handleFileUpload"
            class="upload-input"
          />
          <div class="upload-icon">📁</div>
          <p class="upload-text">点击上传图片</p>
          <p class="upload-hint">支持 PNG / JPG / WebP，最大 2MB</p>
        </label>
      </div>

      <!-- 粘贴链接 -->
      <div class="url-method">
        <div class="url-input-row">
          <input
            v-model="imageUrl"
            type="url"
            placeholder="粘贴图片链接..."
            class="input"
          />
          <button class="btn btn-primary btn-sm" @click="handleUrlUpload" :disabled="!imageUrl.trim()">
            应用
          </button>
        </div>
      </div>

      <!-- 错误提示 -->
      <p v-if="uploadError" class="error-text">{{ uploadError }}</p>
      <p v-if="uploadSuccess" class="success-text">✅ 桌宠已更新！</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { safeGet, safeSet, safeRemove } from '../utils/safeStorage.js'

const currentImage = ref('')
const imageUrl = ref('')
const uploadError = ref('')
const uploadSuccess = ref('')
const fileInput = ref(null)

// 初始化
onMounted(() => {
  currentImage.value = safeGet('pet_companion_image', '')
})

// 文件大小限制 2MB
const MAX_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

// 处理文件上传
function handleFileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  uploadError.value = ''
  uploadSuccess.value = ''

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
  reader.onload = (e) => {
    const dataUrl = e.target.result
    savePetImage(dataUrl)
    event.target.value = ''
  }
  reader.onerror = () => {
    uploadError.value = '读取文件失败，请重试'
    event.target.value = ''
  }
  reader.readAsDataURL(file)
}

// 处理URL上传
async function handleUrlUpload() {
  const url = imageUrl.value.trim()
  if (!url) return

  uploadError.value = ''
  uploadSuccess.value = ''

  try {
    // 尝试加载图片验证
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise((resolve, reject) => {
      img.onload = () => {
        if (img.width > 0 && img.height > 0) {
          // 将图片转为 base64 存储
          const canvas = document.createElement('canvas')
          const maxSize = 512
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
          const dataUrl = canvas.toDataURL('image/png', 0.9)
          savePetImage(dataUrl)
          resolve()
        } else {
          reject(new Error('图片无效'))
        }
      }
      img.onerror = () => reject(new Error('无法加载图片，请检查链接'))
      img.src = url
    })
  } catch (err) {
    uploadError.value = err.message || '图片加载失败'
  }
}

// 保存桌宠图片
function savePetImage(dataUrl) {
  try {
    safeSet('pet_companion_image', dataUrl)
    currentImage.value = dataUrl
    uploadSuccess.value = '✅ 桌宠已更新！'
    uploadError.value = ''
    imageUrl.value = ''

    // 3秒后清除成功提示
    setTimeout(() => { uploadSuccess.value = '' }, 3000)
  } catch (err) {
    uploadError.value = '保存失败，请重试'
  }
}

// 重置桌宠
function resetPet() {
  if (confirm('确定要重置桌宠吗？')) {
    safeRemove('pet_companion_image')
    currentImage.value = ''
    uploadSuccess.value = ''
    uploadError.value = ''
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

.preview-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #e8f4fd, #f0e6ff);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  gap: 8px;
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

.upload-area:hover {
  border-color: var(--accent-blue);
  background: rgba(0, 122, 255, 0.03);
}

.upload-area.has-error {
  border-color: var(--accent-red);
}

.upload-input {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
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
</style>
