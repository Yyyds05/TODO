<script setup>
const emit = defineEmits(['click'])

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <button class="floating-add-btn" @click="handleClick">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  </button>
</template>

<style scoped>
.floating-add-btn {
  position: fixed;
  bottom: 100px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent-blue);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.4);
  transition: all 0.2s ease;
  z-index: 100;
}

.floating-add-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 24px rgba(0, 122, 255, 0.5);
}

.floating-add-btn:active {
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .floating-add-btn {
    bottom: 90px;
    right: 16px;
    width: 52px;
    height: 52px;
  }
}
</style>
