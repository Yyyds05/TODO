import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import eventBus from './utils/eventBus'

const app = createApp(App)
app.use(router)

// 全局挂载 eventBus（通过 provide/inject 或 app.config.globalProperties）
app.config.globalProperties.$eventBus = eventBus

app.mount('#app')
