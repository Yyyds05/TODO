<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import StatsCard from '../components/StatsCard.vue'
import TagDistribution from '../components/TagDistribution.vue'
import WeeklyTrend from '../components/WeeklyTrend.vue'
import { reminders, tags, reminderStats } from '../stores/reminderStore.js'

const router = useRouter()

// AI 洞察相关状态
const aiInsights = ref([])
const isLoadingInsights = ref(false)
const showInsightsDetail = ref(false)

// 计算统计数据
const stats = computed(() => {
  const total = reminders.value.length
  const completed = reminders.value.filter(r => r.completed).length
  const pending = total - completed
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  
  // 今日待办（未完成的）
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const todayPending = reminders.value.filter(r => {
    if (r.completed) return false
    const dt = new Date(r.datetime)
    return dt >= today && dt < tomorrow
  }).length
  
  return {
    total,
    completed,
    completionRate,
    todayPending
  }
})

// 计算本周统计数据
const weeklyStats = computed(() => {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  
  const weekReminders = reminders.value.filter(r => {
    const dt = new Date(r.datetime)
    return dt >= startOfWeek && dt < endOfWeek
  })
  
  const weekCompleted = weekReminders.filter(r => r.completed).length
  const weekTotal = weekReminders.length
  
  // 标签分布
  const tagDistribution = {}
  weekReminders.forEach(r => {
    const tag = r.tag || '其他'
    tagDistribution[tag] = (tagDistribution[tag] || 0) + 1
  })
  
  // 每日完成率
  const dailyStats = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    const dayEnd = new Date(day)
    dayEnd.setDate(day.getDate() + 1)
    
    const dayReminders = weekReminders.filter(r => {
      const dt = new Date(r.datetime)
      return dt >= day && dt < dayEnd
    })
    
    const dayCompleted = dayReminders.filter(r => r.completed).length
    dailyStats.push({
      day: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][i],
      total: dayReminders.length,
      completed: dayCompleted,
      rate: dayReminders.length > 0 ? Math.round((dayCompleted / dayReminders.length) * 100) : 0
    })
  }
  
  return {
    total: weekTotal,
    completed: weekCompleted,
    rate: weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0,
    tagDistribution,
    dailyStats
  }
})

// 获取或生成 AI 洞察
async function getAIInsights() {
  const apiKey = localStorage.getItem('deepseek_api_key')
  if (!apiKey) return
  
  // 检查是否需要重新生成（每周一）
  const lastGenerated = localStorage.getItem('ai_insights_last_date')
  const today = new Date().toDateString()
  
  if (lastGenerated === today && aiInsights.value.length > 0) {
    return // 今天已经生成过
  }
  
  isLoadingInsights.value = true
  
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是SkyDesk专属AI数据分析专家。用户会提供本周的任务完成数据，请你分析并生成3条最有价值的效率洞察和建议。语言要亲切鼓励，不要批评用户。只输出合法的JSON格式，不要添加任何其他内容。JSON结构：{"insights":["洞察1","洞察2","洞察3"]}'
          },
          {
            role: 'user',
            content: `本周任务数据：
- 总任务数：${weeklyStats.value.total}
- 已完成：${weeklyStats.value.completed}
- 完成率：${weeklyStats.value.rate}%
- 标签分布：${JSON.stringify(weeklyStats.value.tagDistribution)}
- 每日完成情况：${JSON.stringify(weeklyStats.value.dailyStats)}`
          }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      })
    })
    
    if (!response.ok) {
      throw new Error('API调用失败')
    }
    
    const data = await response.json()
    const content = data.choices[0]?.message?.content
    
    if (!content) {
      throw new Error('AI返回内容为空')
    }
    
    const result = JSON.parse(content)
    
    if (result.insights && Array.isArray(result.insights)) {
      aiInsights.value = result.insights
      localStorage.setItem('ai_insights_last_date', today)
      localStorage.setItem('ai_insights_data', JSON.stringify(result.insights))
    }
    
  } catch (err) {
    console.error('AI洞察生成失败:', err)
  } finally {
    isLoadingInsights.value = false
  }
}

// 手动刷新洞察
async function refreshInsights() {
  localStorage.removeItem('ai_insights_last_date')
  await getAIInsights()
}

// 切换洞察详情
function toggleInsightsDetail() {
  showInsightsDetail.value = !showInsightsDetail.value
}

// 组件挂载时加载洞察
onMounted(() => {
  if (hasCompletedReminders.value) {
    getAIInsights()
  }
})

// 是否有已完成的提醒
const hasCompletedReminders = computed(() => {
  return reminders.value.some(r => r.completed)
})

// 跳转到提醒页面
const goToReminders = () => {
  router.push('/')
}

// 统计卡片配置
const statCards = computed(() => [
  {
    title: '总提醒数',
    value: stats.value.total,
    icon: '📊',
    color: '#007aff'
  },
  {
    title: '已完成',
    value: stats.value.completed,
    icon: '✅',
    color: '#34c759'
  },
  {
    title: '完成率',
    value: stats.value.completionRate + '%',
    icon: '📈',
    color: '#ff9500'
  },
  {
    title: '今日待办',
    value: stats.value.todayPending,
    icon: '📅',
    color: '#af52de'
  }
])
</script>

<template>
  <div class="stats-view">
    <header class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📊</span>
        数据统计
      </h1>
      <p class="page-desc">查看您的提醒数据概览</p>
    </header>
    
    <main class="page-content">
      <!-- 空状态 -->
      <div v-if="!hasCompletedReminders" class="empty-state">
        <div class="empty-state-content">
          <h2 class="empty-state-title">🎯 完成第一个提醒</h2>
          <p class="empty-state-subtitle">解锁你的数据统计！</p>
          <button class="empty-state-btn" @click="goToReminders">
            去添加提醒 →
          </button>
          <p class="empty-state-tip">
            💡 小贴士：完成提醒后，这里会显示你的完成率、标签分布等有趣的数据～
          </p>
        </div>
      </div>
      
      <!-- 正常统计内容 -->
      <template v-else>
        <!-- 统计卡片行 -->
        <section class="stats-cards">
          <StatsCard
            v-for="card in statCards"
            :key="card.title"
            :title="card.title"
            :value="card.value"
            :icon="card.icon"
            :color="card.color"
          />
        </section>
        
        <!-- 标签分布图表 -->
        <section class="chart-section">
          <TagDistribution
            :reminders="reminders"
            :tags="tags"
          />
        </section>
        
        <!-- 每周趋势图表 -->
        <section class="chart-section">
          <WeeklyTrend
            :reminders="reminders"
          />
        </section>

        <!-- AI 效率洞察 -->
        <section class="ai-insights-section">
          <div class="ai-insights-card" @click="toggleInsightsDetail">
            <div class="ai-insights-header">
              <div class="ai-insights-title">
                <span class="ai-icon">✨</span>
                <span>AI 效率洞察</span>
              </div>
              <div class="ai-insights-actions">
                <button
                  v-if="aiInsights.length > 0"
                  class="ai-refresh-btn"
                  @click.stop="refreshInsights"
                  title="刷新洞察"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                </button>
                <span class="ai-expand-icon">{{ showInsightsDetail ? '▲' : '▼' }}</span>
              </div>
            </div>

            <!-- 洞察列表 -->
            <div v-if="aiInsights.length > 0" class="ai-insights-list">
              <div
                v-for="(insight, index) in aiInsights.slice(0, showInsightsDetail ? aiInsights.length : 3)"
                :key="index"
                class="ai-insight-item"
              >
                <span class="insight-number">{{ index + 1 }}</span>
                <span class="insight-text">{{ insight }}</span>
              </div>
            </div>

            <!-- 加载状态 -->
            <div v-else-if="isLoadingInsights" class="ai-insights-loading">
              <span class="loading-text">正在分析你的数据...</span>
            </div>

            <!-- 未配置 API -->
            <div v-else class="ai-insights-empty">
              <p>在设置页面配置 DeepSeek API 密钥，即可获得 AI 效率洞察</p>
            </div>
          </div>

          <!-- 详细统计 -->
          <Transition name="slide-down">
            <div v-if="showInsightsDetail && aiInsights.length > 0" class="ai-insights-detail">
              <div class="detail-section">
                <h4 class="detail-title">本周数据概览</h4>
                <div class="detail-stats">
                  <div class="detail-stat">
                    <span class="stat-label">总任务</span>
                    <span class="stat-value">{{ weeklyStats.total }}</span>
                  </div>
                  <div class="detail-stat">
                    <span class="stat-label">已完成</span>
                    <span class="stat-value">{{ weeklyStats.completed }}</span>
                  </div>
                  <div class="detail-stat">
                    <span class="stat-label">完成率</span>
                    <span class="stat-value">{{ weeklyStats.rate }}%</span>
                  </div>
                </div>
              </div>
              <div class="detail-section">
                <h4 class="detail-title">每日完成情况</h4>
                <div class="daily-stats">
                  <div
                    v-for="day in weeklyStats.dailyStats"
                    :key="day.day"
                    class="day-stat"
                  >
                    <span class="day-label">{{ day.day }}</span>
                    <div class="day-progress">
                      <div class="day-progress-bar" :style="{ width: day.rate + '%' }"></div>
                    </div>
                    <span class="day-rate">{{ day.rate }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.stats-view {
  min-height: 100vh;
  padding: 24px;
  padding-bottom: 100px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.title-icon {
  font-size: 28px;
}

.page-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.page-content {
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.chart-section {
  width: 100%;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px 24px;
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 400px;
}

.empty-state-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.empty-state-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 24px 0;
}

.empty-state-btn {
  padding: 12px 24px;
  background: var(--accent-blue);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 24px;
}

.empty-state-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.empty-state-tip {
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

@media (max-width: 640px) {
  .stats-view {
    padding: 16px;
    padding-bottom: 80px;
  }

  .page-header {
    margin-bottom: 16px;
  }

  .page-title {
    font-size: 20px;
    gap: 8px;
  }

  .title-icon {
    font-size: 24px;
  }

  .page-desc {
    font-size: 13px;
  }

  .page-content {
    gap: 16px;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}

@media (max-width: 360px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
}

/* AI 效率洞察样式 */
.ai-insights-section {
  margin-top: 8px;
}

.ai-insights-card {
  background: linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.03) 100%);
  border: 1px solid rgba(0, 122, 255, 0.15);
  border-radius: var(--radius-lg);
  padding: 16px;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.ai-insights-card:hover {
  border-color: rgba(0, 122, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.1);
}

.ai-insights-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.ai-insights-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-blue);
}

.ai-icon {
  font-size: 18px;
}

.ai-insights-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-refresh-btn {
  width: 28px;
  height: 28px;
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

.ai-refresh-btn:hover {
  background: rgba(0, 122, 255, 0.1);
  color: var(--accent-blue);
}

.ai-expand-icon {
  font-size: 12px;
  color: var(--text-tertiary);
}

.ai-insights-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-insight-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: white;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.ai-insight-item:hover {
  background: rgba(0, 122, 255, 0.03);
}

.insight-number {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  background: var(--accent-blue);
  color: white;
  font-size: 12px;
  font-weight: 600;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.insight-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
}

.ai-insights-loading {
  padding: 20px;
  text-align: center;
}

.loading-text {
  color: var(--accent-blue);
  font-size: 14px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.ai-insights-empty {
  padding: 20px;
  text-align: center;
}

.ai-insights-empty p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 详细统计 */
.ai-insights-detail {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed rgba(0, 122, 255, 0.2);
}

.detail-section {
  margin-bottom: 16px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.detail-stats {
  display: flex;
  gap: 16px;
}

.detail-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: var(--radius-md);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--accent-blue);
}

.daily-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-stat {
  display: flex;
  align-items: center;
  gap: 10px;
}

.day-label {
  width: 36px;
  font-size: 12px;
  color: var(--text-secondary);
}

.day-progress {
  flex: 1;
  height: 8px;
  background: rgba(0, 122, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.day-progress-bar {
  height: 100%;
  background: var(--accent-blue);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.day-rate {
  width: 40px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
}

/* slide-down 动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 640px) {
  .ai-insights-card {
    padding: 14px;
  }

  .ai-insights-title {
    font-size: 15px;
  }

  .detail-stats {
    gap: 10px;
  }

  .detail-stat {
    padding: 10px;
  }

  .stat-value {
    font-size: 18px;
  }
}
</style>
