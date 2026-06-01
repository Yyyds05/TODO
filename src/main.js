import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import eventBus from './utils/eventBus'

const app = createApp(App)
app.use(router)

// 全局挂载 eventBus（通过 provide/inject 或 app.config.globalProperties）
app.config.globalProperties.$eventBus = eventBus

// ========== 全局异常捕获 ==========

// 1. 检测 localStorage 是否可用
function checkLocalStorageAvailable() {
  try {
    const testKey = '__skydesk_storage_test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    return true
  } catch (e) {
    return false
  }
}

// 2. localStorage 不可用时弹出提示
if (!checkLocalStorageAvailable()) {
  setTimeout(() => {
    alert('浏览器本地存储已禁用，数据无法保存，请修改浏览器设置')
  }, 500)
}

// 3. Vue 全局错误处理器
app.config.errorHandler = (err, instance, info) => {
  console.error('[SkyDesk 全局错误]', err)
  console.error('错误来源:', info)
  // 不让错误导致白屏，静默处理
}

// 4. 捕获未处理的 Promise 异常
window.addEventListener('unhandledrejection', (event) => {
  console.error('[SkyDesk 未处理的Promise异常]', event.reason)
  // 阻止默认的控制台错误输出，避免影响用户体验
  event.preventDefault()
})

// 5. 捕获全局 JS 错误
window.addEventListener('error', (event) => {
  console.error('[SkyDesk 全局JS错误]', event.error)
  // 不阻止默认行为，让控制台仍然显示错误（方便调试）
})

app.mount('#app')
