<script setup>
import TagManager from '../components/TagManager.vue'
</script>

<template>
  <div class="tags-view">
    <header class="page-header">
      <h1 class="page-title">
        <span class="title-icon">🏷️</span>
        标签管理
      </h1>
      <p class="page-desc">创建和管理您的自定义标签</p>
    </header>
    
    <main class="page-content">
      <TagManager />
    </main>
  </div>
</template>

<style scoped>
.tags-view {
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
  max-width: 600px;
}

@media (max-width: 640px) {
  .tags-view {
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
}
</style>