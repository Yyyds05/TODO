<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#007aff'
  },
  change: {
    type: Number,
    default: null
  }
})
</script>

<template>
  <div class="stats-card">
    <div class="card-header">
      <div class="icon-wrapper" :style="{ backgroundColor: color + '15' }">
        <span class="icon" :style="{ color: color }">{{ icon }}</span>
      </div>
      <div v-if="change !== null" class="change-badge" :class="{ 'positive': change >= 0, 'negative': change < 0 }">
        <span class="change-arrow">{{ change >= 0 ? '↑' : '↓' }}</span>
        <span class="change-value">{{ Math.abs(change) }}%</span>
      </div>
    </div>
    <div class="card-body">
      <div class="value" :style="{ color: color }">{{ value }}</div>
      <div class="title">{{ title }}</div>
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  background-color: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  min-width: 0;
  flex: 1;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon {
  font-size: 22px;
  line-height: 1;
}

.change-badge {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}

.change-badge.positive {
  background-color: rgba(52, 199, 89, 0.12);
  color: var(--accent-green);
}

.change-badge.negative {
  background-color: rgba(255, 59, 48, 0.12);
  color: var(--accent-red);
}

.change-arrow {
  font-size: 10px;
}

.change-value {
  font-size: 11px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.title {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

@media (max-width: 640px) {
  .stats-card {
    padding: var(--space-sm);
  }

  .icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .icon {
    font-size: 18px;
  }

  .value {
    font-size: 22px;
  }

  .title {
    font-size: 12px;
  }

  .change-badge {
    padding: 3px 6px;
    font-size: 10px;
  }
}
</style>
