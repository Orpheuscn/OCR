<template>
  <button 
    @click="toggleTheme"
    class="btn btn-ghost btn-sm btn-circle"
    :title="isDark ? '切换到浅色主题' : '切换到深色主题'"
  >
    <!-- 太阳图标 (浅色模式) -->
    <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
    <!-- 月亮图标 (深色模式) -->
    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
const isDark = ref(false)

// 检查当前主题
const checkTheme = () => {
  const theme = document.documentElement.getAttribute('data-theme')
  isDark.value = theme === 'dark'
}

// 切换主题
const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme')
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
  
  // 更新DOM
  document.documentElement.setAttribute('data-theme', newTheme)
  
  // 保存到localStorage
  localStorage.setItem('theme', newTheme)
  
  // 更新状态
  isDark.value = newTheme === 'dark'
}

// 初始化主题
const initTheme = () => {
  // 从localStorage获取保存的主题
  const savedTheme = localStorage.getItem('theme')
  
  // 如果没有保存的主题，使用系统偏好
  const theme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  
  document.documentElement.setAttribute('data-theme', theme)
  checkTheme()
}

onMounted(() => {
  initTheme()
  
  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      const theme = e.matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', theme)
      checkTheme()
    }
  })
})
</script>

<style scoped>
/* 主题切换按钮的过渡动画 */
.btn {
  transition: all 0.2s ease-in-out;
}

.btn:hover {
  transform: scale(1.05);
}

/* 图标过渡动画 */
svg {
  transition: all 0.2s ease-in-out;
}
</style> 