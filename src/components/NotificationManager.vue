<template>
  <!-- Loading 遮罩层 -->
  <div v-if="notificationStore.isLoading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-base-100 p-8 rounded-2xl shadow-2xl border border-accent border-opacity-20 flex flex-col items-center gap-4">
      <div class="loading loading-spinner loading-lg text-accent"></div>
      <p class="text-lg font-medium text-base-content">{{ notificationStore.loadingMessage }}</p>
    </div>
  </div>

  <!-- 通知消息区域 -->
  <div class="fixed top-4 right-4 z-40 space-y-3">
    <TransitionGroup
      name="notification"
      tag="div"
      class="space-y-3"
    >
      <div
        v-for="notification in notificationStore.notifications"
        :key="notification.id"
        class="alert shadow-xl border border-opacity-20 min-w-80 max-w-96"
        :class="getAlertClass(notification.type)"
      >
        <!-- 图标 -->
        <div class="flex-shrink-0">
          <svg v-if="notification.type === 'success'" xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else-if="notification.type === 'error'" xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else-if="notification.type === 'warning'" xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <!-- 内容 -->
        <div class="flex-1">
          <div v-if="notification.title" class="font-semibold">{{ notification.title }}</div>
          <div class="text-sm" :class="{ 'mt-1': notification.title }">{{ notification.message }}</div>
        </div>

        <!-- 关闭按钮 -->
        <button 
          @click="notificationStore.removeNotification(notification.id)"
          class="btn btn-ghost btn-sm btn-circle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useNotificationStore, type NotificationType } from '@/stores/notificationStore'

const notificationStore = useNotificationStore()

// 获取alert样式类
const getAlertClass = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'alert-success border-success'
    case 'error':
      return 'alert-error border-error'
    case 'warning':
      return 'alert-warning border-warning'
    case 'info':
    default:
      return 'alert-info border-info'
  }
}
</script>

<style scoped>
/* 通知动画 */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style> 