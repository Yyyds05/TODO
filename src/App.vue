<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import Toast from './components/Toast.vue'
import { safeGet, safeSet } from './utils/safeStorage.js'

const route = useRoute()

const currentDate = computed(() => {
  const now = new Date()
  const options = { month: 'long', day: 'numeric', weekday: 'long' }
  return now.toLocaleDateString('zh-CN', options)
})

const showHeader = computed(() => route.path !== '/settings')
const isDesktop = ref(window.innerWidth >= 768)

// 页面切换动画控制
const transitionName = ref('fade')

// 欢迎提示条
const showWelcome = ref(false)

onMounted(() => {
  // 检查是否是首次访问
  const hasVisited = safeGet('skydesk-visited')
  if (!hasVisited) {
    showWelcome.value = true
    // 3秒后自动隐藏
    setTimeout(() => {
      showWelcome.value = false
      safeSet('skydesk-visited', 'true')
    }, 3000)
  }
})

const closeWelcome = () => {
  showWelcome.value = false
  safeSet('skydesk-visited', 'true')
}
</script>

<template>
  <div class="app">
    <!-- Toast提示 -->
    <Toast />

    <!-- 欢迎提示条 -->
    <transition name="welcome-fade">
      <div v-if="showWelcome" class="welcome-banner">
        <span class="welcome-text">欢迎使用 SkyDesk！🎉 快速创建提醒，使用番茄专注提高效率，让学习更有规划～</span>
        <button class="welcome-close" @click="closeWelcome">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </transition>

    <!-- 顶部标题栏 -->
    <header v-if="showHeader && !isDesktop" class="app-header">
      <div class="header-content">
        <h1 class="app-title">SkyDesk</h1>
        <span class="current-date">{{ currentDate }}</span>
      </div>
    </header>
    
    <!-- 主内容区 - 添加页面切换动画 -->
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    
    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
}

.app-header {
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--bg-tertiary);
  padding: var(--space-md) var(--space-lg);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  font-size: var(--text-h1);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: var(--line-height-h1);
}

.current-date {
  font-size: var(--text-body);
  color: var(--text-secondary);
  font-weight: 400;
  line-height: var(--line-height-body);
}

.app-main {
  flex: 1;
  padding: var(--space-lg);
  padding-top: calc(var(--space-lg) + 56px);
  padding-bottom: 100px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

/* 欢迎提示条 */
.welcome-banner {
  background: linear-gradient(135deg, #007aff 0%, #5856d6 100%);
  color: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
}

.welcome-text {
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

.welcome-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.welcome-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 欢迎提示条动画 */
.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition: all 0.3s ease;
}

.welcome-fade-enter-from,
.welcome-fade-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

/* 页面切换淡入淡出动画 - 200ms */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .app-header {
    padding: var(--space-md);
  }
  
  .app-main {
    padding: var(--space-md);
    padding-bottom: 100px;
  }
}
</style>