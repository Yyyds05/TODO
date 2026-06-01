<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  settings, 
  saveSettings, 
  exportData, 
  importData, 
  clearAllData,
  tags
} from '../stores/reminderStore.js'
import { reminderAlarm } from '../services/reminderAlarm.js'

// 导入文件输入
const fileInput = ref(null)

// DeepSeek API 密钥
const deepseekApiKey = ref('')
const showApiKey = ref(false)

// 从 localStorage 读取 API 密钥
onMounted(() => {
  const savedKey = localStorage.getItem('deepseek_api_key')
  if (savedKey) {
    deepseekApiKey.value = savedKey
  }
})

// 保存 API 密钥
function saveApiKey() {
  localStorage.setItem('deepseek_api_key', deepseekApiKey.value)
  alert('保存成功！')
}

// 切换 API 密钥显示/隐藏
function toggleShowApiKey() {
  showApiKey.value = !showApiKey.value
}

// 清空确认弹窗状态
const showClearConfirmModal = ref(false)
const clearConfirmInput = ref('')
const isClearing = ref(false)

// 计算属性：是否可以确认清空
const canConfirmClear = computed(() => {
  return clearConfirmInput.value.trim() === '确认清空'
})

// 测试声音
function testSound() {
  reminderAlarm.playSound()
}

// 导出数据
function handleExport() {
  const data = exportData()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `skydesk-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 导入数据
function handleImportClick() {
  fileInput.value?.click()
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  
  try {
    const text = await file.text()
    const success = await importData(text)
    
    if (success) {
      alert('数据导入成功！')
      window.location.reload()
    } else {
      alert('数据导入失败，请检查文件格式')
    }
  } catch (err) {
    console.error('导入失败:', err)
    alert('数据导入失败，请检查文件格式')
  }
  
  // 清空 input 以便可以再次选择同一文件
  event.target.value = ''
}

// 打开清空确认弹窗
function openClearConfirmModal() {
  showClearConfirmModal.value = true
  clearConfirmInput.value = ''
}

// 关闭清空确认弹窗
function closeClearConfirmModal() {
  showClearConfirmModal.value = false
  clearConfirmInput.value = ''
}

// 确认清空数据
async function handleClearConfirm() {
  if (!canConfirmClear.value) return
  
  isClearing.value = true
  try {
    await clearAllData()
    closeClearConfirmModal()
    alert('所有数据已清空')
    window.location.reload()
  } catch (err) {
    console.error('清空数据失败:', err)
    alert('清空数据失败')
  } finally {
    isClearing.value = false
  }
}

// 请求通知权限
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('您的浏览器不支持通知功能')
    return
  }
  
  const permission = await Notification.requestPermission()
  
  if (permission === 'granted') {
    saveSettings({ notificationEnabled: true })
    new Notification('SkyDesk', {
      body: '通知权限已开启',
      icon: '/favicon.svg'
    })
  } else {
    saveSettings({ notificationEnabled: false })
    alert('请允许通知权限以接收提醒')
  }
}
</script>

<template>
  <div class="settings-view">
    <div class="settings-header">
      <h2 class="page-title">设置</h2>
    </div>
    
    <div class="settings-content">
      <!-- 通知设置 -->
      <section class="settings-section card">
        <h3 class="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          通知设置
        </h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-name">启用浏览器通知</span>
            <span class="setting-desc">在提醒时间到达时显示浏览器通知</span>
          </div>
          <button 
            class="toggle-btn"
            :class="{ active: settings.notificationEnabled }"
            @click="requestNotificationPermission"
          >
            <span class="toggle-slider"></span>
          </button>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-name">提醒声音</span>
            <span class="setting-desc">播放提示音提醒</span>
          </div>
          <button 
            class="toggle-btn"
            :class="{ active: settings.soundEnabled }"
            @click="saveSettings({ soundEnabled: !settings.soundEnabled })"
          >
            <span class="toggle-slider"></span>
          </button>
        </div>
        
        <button class="btn btn-secondary test-btn" @click="testSound">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
          测试声音
        </button>
      </section>

      <!-- AI 设置 -->
      <section class="settings-section card">
        <h3 class="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
            <path d="M12 12L2.5 12"></path>
            <path d="M12 12v9.5"></path>
          </svg>
          AI 设置
        </h3>

        <div class="setting-item ai-setting-item">
          <div class="setting-info">
            <span class="setting-name">DeepSeek API 密钥</span>
            <div class="api-key-input-wrapper">
              <input
                v-model="deepseekApiKey"
                :type="showApiKey ? 'text' : 'password'"
                class="input api-key-input"
                placeholder="请输入 API 密钥"
              />
              <button
                class="btn btn-secondary toggle-visibility-btn"
                @click="toggleShowApiKey"
                :title="showApiKey ? '隐藏' : '显示'"
              >
                <svg v-if="showApiKey" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
            <span class="setting-desc api-key-desc">密钥仅保存在本地浏览器中，不会上传到任何服务器</span>
          </div>
          <button class="btn btn-primary save-btn" @click="saveApiKey">
            保存
          </button>
        </div>
      </section>

      <!-- 数据管理 -->
      <section class="settings-section card">
        <h3 class="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          数据管理
        </h3>
        
        <div class="data-actions">
          <button class="btn btn-secondary action-btn" @click="handleExport">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            导出
          </button>
          
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            style="display: none"
            @change="handleFileChange"
          />
          
          <button class="btn btn-secondary action-btn" @click="handleImportClick">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            导入
          </button>
          
          <button class="btn btn-danger action-btn" @click="openClearConfirmModal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            清空
          </button>
        </div>
      </section>
      
      <!-- 关于 -->
      <section class="settings-section card">
        <h3 class="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          关于
        </h3>
        
        <div class="about-content">
          <div class="app-info">
            <h4 class="app-name">SkyDesk</h4>
            <p class="app-version">版本 2.0</p>
            <p class="app-desc">极简智能提醒工具</p>
          </div>
          
          <div class="tips">
            <h5 class="tips-title">使用提示：</h5>
            <ul class="tips-list">
              <li>保持页面打开以接收提醒</li>
              <li>建议开启浏览器通知权限</li>
              <li>定期导出数据备份</li>
              <li>支持 PWA 安装到桌面</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
    
    <!-- 清空确认弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showClearConfirmModal" class="modal-overlay" @click.self="closeClearConfirmModal">
          <div class="modal-content danger-modal">
            <h3 class="modal-title danger-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              危险操作
            </h3>
            <p class="danger-text">
              此操作将永久删除所有提醒、标签和设置，且无法恢复。
            </p>
            <div class="confirm-input-group">
              <label class="confirm-label">请输入'确认清空'以继续</label>
              <input 
                v-model="clearConfirmInput"
                type="text" 
                class="input confirm-input"
                placeholder="确认清空"
                @keyup.enter="handleClearConfirm"
              />
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="closeClearConfirmModal">取消</button>
              <button 
                class="btn btn-danger" 
                :disabled="!canConfirmClear || isClearing"
                @click="handleClearConfirm"
              >
                {{ isClearing ? '清空中...' : '确认清空' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.settings-view {
  max-width: 600px;
  margin: 0 auto;
}

.settings-header {
  margin-bottom: var(--space-lg);
}

.page-title {
  font-size: var(--text-h1);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: var(--line-height-h1);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.settings-section {
  padding: var(--space-lg);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-h2);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-md) 0;
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--bg-tertiary);
  line-height: var(--line-height-h2);
}

.section-title svg {
  color: var(--text-secondary);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--bg-tertiary);
}

.setting-item:last-of-type {
  border-bottom: none;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-name {
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
  line-height: var(--line-height-body);
}

.setting-desc {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: var(--line-height-caption);
}

.toggle-btn {
  width: 52px;
  height: 32px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  transition: background-color var(--transition-fast);
}

.toggle-btn.active {
  background: var(--accent-green);
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 28px;
  height: 28px;
  background: white;
  border-radius: 50%;
  transition: transform var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.toggle-btn.active .toggle-slider {
  transform: translateX(20px);
}

.test-btn {
  margin-top: var(--space-sm);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.data-actions {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.app-info {
  text-align: center;
}

.app-name {
  font-size: var(--text-h2);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-xs) 0;
  line-height: var(--line-height-h2);
}

.app-version {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: 0 0 var(--space-xs) 0;
  line-height: var(--line-height-caption);
}

.app-desc {
  font-size: var(--text-body);
  color: var(--text-secondary);
  margin: 0;
  line-height: var(--line-height-body);
}

.tips-title {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-sm) 0;
  line-height: var(--line-height-body);
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  font-size: var(--text-body);
  color: var(--text-secondary);
  padding: 6px 0;
  padding-left: 20px;
  position: relative;
  line-height: var(--line-height-body);
}

.tips-list li::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 14px;
  width: 6px;
  height: 6px;
  background: var(--accent-blue);
  border-radius: 50%;
}

/* 弹窗样式 */
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
  max-width: 400px;
  padding: var(--space-lg);
  box-shadow: var(--shadow-lg);
}

.danger-modal {
  border: 2px solid var(--accent-red);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-h2);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-md) 0;
  line-height: var(--line-height-h2);
}

.danger-title {
  color: var(--accent-red);
}

.danger-text {
  font-size: var(--text-body);
  color: var(--text-secondary);
  margin: 0 0 var(--space-md) 0;
  line-height: var(--line-height-body);
}

.confirm-input-group {
  margin-bottom: var(--space-md);
}

.confirm-label {
  display: block;
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
  line-height: var(--line-height-caption);
}

.confirm-input {
  border-color: var(--accent-red);
}

.confirm-input:focus {
  border-color: var(--accent-red);
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1);
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
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

/* AI 设置样式 */
.ai-setting-item {
  align-items: flex-start;
  gap: var(--space-md);
}

.api-key-input-wrapper {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.api-key-input {
  flex: 1;
  min-width: 200px;
}

.toggle-visibility-btn {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.api-key-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.save-btn {
  align-self: flex-start;
  margin-top: 24px;
}

@media (max-width: 640px) {
  .settings-section {
    padding: var(--space-md);
  }

  .data-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }

  .ai-setting-item {
    flex-direction: column;
    align-items: stretch;
  }

  .api-key-input-wrapper {
    flex-direction: row;
  }

  .save-btn {
    align-self: stretch;
    margin-top: var(--space-md);
  }
}
</style>
