<script setup>
import { computed } from 'vue'

const props = defineProps({
  reminders: {
    type: Array,
    default: () => []
  },
  tags: {
    type: Array,
    default: () => []
  }
})

// 计算标签分布数据
const tagDistribution = computed(() => {
  const distribution = {}
  
  // 初始化所有标签
  props.tags.forEach(tag => {
    distribution[tag.name] = {
      name: tag.name,
      icon: tag.icon || '📌',
      color: tag.color || '#86868b',
      count: 0
    }
  })
  
  // 统计未完成的提醒
  props.reminders
    .filter(r => !r.completed)
    .forEach(reminder => {
      const tagName = reminder.tag || '其他'
      if (distribution[tagName]) {
        distribution[tagName].count++
      } else {
        // 如果标签不存在，创建临时条目
        if (!distribution[tagName]) {
          distribution[tagName] = {
            name: tagName,
            icon: '📌',
            color: '#86868b',
            count: 0
          }
        }
        distribution[tagName].count++
      }
    })
  
  // 转换为数组并按数量降序排序
  return Object.values(distribution)
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
})

// 最大数量用于计算条形宽度
const maxCount = computed(() => {
  if (tagDistribution.value.length === 0) return 0
  return Math.max(...tagDistribution.value.map(t => t.count))
})

// 总数量
const totalCount = computed(() => {
  return tagDistribution.value.reduce((sum, item) => sum + item.count, 0)
})
</script>

<template>
  <div class="tag-distribution">
    <div class="chart-header">
      <h3 class="chart-title">
        <span class="title-icon">🏷️</span>
        标签分布
      </h3>
      <span class="chart-subtitle">{{ totalCount }} 个待办</span>
    </div>
    
    <div v-if="tagDistribution.length > 0" class="chart-content">
      <div class="bar-list">
        <div
          v-for="item in tagDistribution"
          :key="item.name"
          class="bar-item"
        >
          <div class="bar-label">
            <span class="tag-icon" :style="{ backgroundColor: item.color + '15', color: item.color }">
              {{ item.icon }}
            </span>
            <span class="tag-name">{{ item.name }}</span>
          </div>
          <div class="bar-wrapper">
            <div
              class="bar-fill"
              :style="{
                width: maxCount > 0 ? (item.count / maxCount * 100) + '%' : '0%',
                backgroundColor: item.color
              }"
            >
              <span class="bar-value">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <div class="empty-icon">📊</div>
      <div class="empty-title">暂无数据</div>
      <div class="empty-desc">还没有带标签的待办事项</div>
    </div>
  </div>
</template>

<style scoped>
.tag-distribution {
  background-color: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--space-lg);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.title-icon {
  font-size: 20px;
}

.chart-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.chart-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.bar-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bar-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.tag-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.bar-wrapper {
  height: 28px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 10px;
  transition: width 0.5s ease;
  min-width: 32px;
}

.bar-value {
  font-size: 13px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-md);
  opacity: 0.4;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .tag-distribution {
    padding: var(--space-md);
  }

  .chart-header {
    margin-bottom: var(--space-md);
  }

  .chart-title {
    font-size: 15px;
  }

  .title-icon {
    font-size: 18px;
  }

  .bar-list {
    gap: 10px;
  }

  .bar-wrapper {
    height: 24px;
  }

  .bar-value {
    font-size: 12px;
  }

  .tag-icon {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }

  .tag-name {
    font-size: 13px;
  }
}
</style>
