<script setup>
import { ref, computed } from 'vue'
import { tags, addTag, updateTag, deleteTag, presetColors, presetIcons } from '../stores/reminderStore.js'

const emit = defineEmits(['manage-tags'])

// 编辑状态
const editingTag = ref(null)
const showEditModal = ref(false)

// 编辑表单
const editForm = ref({
  name: '',
  color: '#007aff',
  icon: '📌'
})

const isSaving = ref(false)
const errors = ref({})

// 是否是新建模式
const isNewMode = computed(() => !editingTag.value?.id)

// 打开编辑模态框（新建）
function openNewModal() {
  editingTag.value = { name: '', color: '#007aff', icon: '📌' }
  editForm.value = { name: '', color: '#007aff', icon: '📌' }
  errors.value = {}
  showEditModal.value = true
}

// 打开编辑模态框（编辑现有标签）
function openEditModal(tag) {
  editingTag.value = { ...tag }
  editForm.value = { name: tag.name, color: tag.color, icon: tag.icon }
  errors.value = {}
  showEditModal.value = true
}

// 关闭编辑模态框
function closeEditModal() {
  showEditModal.value = false
  editingTag.value = null
  editForm.value = { name: '', color: '#007aff', icon: '📌' }
  errors.value = {}
}

// 选择颜色
function selectColor(color) {
  editForm.value.color = color
}

// 选择图标
function selectIcon(icon) {
  editForm.value.icon = icon
}

// 验证表单
function validate() {
  errors.value = {}
  
  if (!editForm.value.name.trim()) {
    errors.value.name = '请输入标签名称'
  }
  
  // 检查名称是否重复（排除当前编辑的标签）
  const existingTag = tags.value.find(t => t.name === editForm.value.name.trim() && t.id !== editingTag.value?.id)
  if (existingTag) {
    errors.value.name = '标签名称已存在'
  }
  
  return Object.keys(errors.value).length === 0
}

// 保存标签
async function handleSave() {
  if (!validate()) return
  
  isSaving.value = true
  
  try {
    if (isNewMode.value) {
      // 新建标签
      await addTag({
        name: editForm.value.name.trim(),
        color: editForm.value.color,
        icon: editForm.value.icon
      })
    } else {
      // 更新标签
      await updateTag(editingTag.value.id, {
        name: editForm.value.name.trim(),
        color: editForm.value.color,
        icon: editForm.value.icon
      })
    }
    
    closeEditModal()
  } catch (err) {
    console.error('保存标签失败:', err)
    errors.value.submit = '保存失败，请重试'
  } finally {
    isSaving.value = false
  }
}

// 删除标签
async function handleDelete(tag) {
  const confirmed = confirm(`确定要删除标签"${tag.name}"吗？`)
  if (!confirmed) return
  
  try {
    await deleteTag(tag.id)
  } catch (err) {
    console.error('删除标签失败:', err)
  }
}

// 点击遮罩关闭
function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    closeEditModal()
  }
}
</script>

<template>
  <div class="tag-manager">
    <!-- 标签列表 -->
    <div class="tag-list">
      <div
        v-for="tag in tags"
        :key="tag.id"
        class="tag-item"
      >
        <div class="tag-preview" :style="{ backgroundColor: tag.color + '20' }">
          <span class="tag-icon">{{ tag.icon }}</span>
          <span class="tag-name" :style="{ color: tag.color }">{{ tag.name }}</span>
        </div>
        <div class="tag-actions">
          <button class="action-btn edit" @click="openEditModal(tag)" title="编辑">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="action-btn delete" @click="handleDelete(tag)" title="删除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 添加新标签按钮 -->
    <button class="add-tag-btn" @click="openNewModal">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      添加新标签
    </button>
    
    <!-- 编辑模态框 -->
    <Transition name="modal">
      <div v-if="showEditModal" class="modal-overlay" @click="handleOverlayClick">
        <div class="modal-content card">
          <div class="modal-header">
            <h3 class="modal-title">{{ isNewMode ? '新建标签' : '编辑标签' }}</h3>
            <button class="close-btn" @click="closeEditModal">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          
          <form @submit.prevent="handleSave">
            <!-- 标签名称 -->
            <div class="form-group">
              <label class="form-label">标签名称</label>
              <input
                v-model="editForm.name"
                type="text"
                class="input"
                placeholder="输入标签名称..."
                :class="{ error: errors.name }"
              />
              <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
            </div>
            
            <!-- 颜色选择 -->
            <div class="form-group">
              <label class="form-label">标签颜色</label>
              <div class="color-picker">
                <button
                  v-for="color in presetColors"
                  :key="color"
                  type="button"
                  class="color-btn"
                  :class="{ active: editForm.color === color }"
                  :style="{ backgroundColor: color }"
                  @click="selectColor(color)"
                >
                  <span v-if="editForm.color === color" class="check-icon">✓</span>
                </button>
              </div>
            </div>
            
            <!-- 图标选择 -->
            <div class="form-group">
              <label class="form-label">标签图标</label>
              <div class="icon-picker">
                <button
                  v-for="icon in presetIcons"
                  :key="icon"
                  type="button"
                  class="icon-btn"
                  :class="{ active: editForm.icon === icon }"
                  @click="selectIcon(icon)"
                >
                  {{ icon }}
                </button>
              </div>
            </div>
            
            <!-- 预览 -->
            <div class="form-group">
              <label class="form-label">预览效果</label>
              <div class="preview-box">
                <span class="preview-tag" :style="{ backgroundColor: editForm.color + '20', color: editForm.color }">
                  {{ editForm.icon }} {{ editForm.name || '标签名称' }}
                </span>
              </div>
            </div>
            
            <!-- 错误提示 -->
            <div v-if="errors.submit" class="error-text submit-error">{{ errors.submit }}</div>
            
            <!-- 按钮组 -->
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" @click="closeEditModal">
                取消
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSaving">
                {{ isSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tag-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tag-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.tag-item:hover {
  box-shadow: var(--shadow-sm);
}

.tag-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
}

.tag-icon {
  font-size: 16px;
}

.tag-name {
  font-size: 14px;
  font-weight: 600;
}

.tag-actions {
  display: flex;
  gap: 8px;
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
  background: var(--bg-secondary);
}

.action-btn.edit:hover {
  color: var(--accent-blue);
}

.action-btn.delete:hover {
  color: var(--accent-red);
}

.add-tag-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.add-tag-btn:hover {
  background: var(--bg-tertiary);
  color: var(--accent-blue);
  border-color: var(--accent-blue);
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
}

.modal-content {
  width: 100%;
  max-width: 400px;
  padding: 24px;
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
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

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.error-text {
  display: block;
  font-size: 13px;
  color: var(--accent-red);
  margin-top: 6px;
}

.submit-error {
  margin-bottom: 12px;
  text-align: center;
}

/* 颜色选择器 */
.color-picker {
  display: flex;
  gap: 10px;
}

.color-btn {
  width: 36px;
  height: 36px;
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-btn:hover {
  transform: scale(1.1);
}

.color-btn.active {
  border-color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.check-icon {
  color: white;
  font-size: 14px;
  font-weight: bold;
}

/* 图标选择器 */
.icon-picker {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 18px;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: var(--bg-tertiary);
}

.icon-btn.active {
  background: rgba(0, 122, 255, 0.12);
  border-color: var(--accent-blue);
}

/* 预览 */
.preview-box {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-tag {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.modal-actions .btn {
  flex: 1;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
}

/* 过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: var(--space-md);
    align-items: flex-end;
  }
  
  .modal-content {
    max-width: 100%;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    padding: 20px;
  }
  
  .icon-picker {
    grid-template-columns: repeat(8, 1fr);
    gap: 6px;
  }
  
  .icon-btn {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  .color-picker {
    gap: 8px;
  }
  
  .color-btn {
    width: 32px;
    height: 32px;
  }
}
</style>