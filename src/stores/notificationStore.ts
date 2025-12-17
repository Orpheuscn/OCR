import { defineStore } from 'pinia'
import { ref } from 'vue'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

export interface Notification {
  id: string
  type: NotificationType
  title?: string
  message: string
  duration?: number
  persistent?: boolean
}

export const useNotificationStore = defineStore('notification', () => {
  // Loading状态
  const isLoading = ref(false)
  const loadingMessage = ref('')

  // 通知列表
  const notifications = ref<Notification[]>([])

  // Loading操作
  const startLoading = (message = '加载中...') => {
    isLoading.value = true
    loadingMessage.value = message
  }

  const stopLoading = () => {
    isLoading.value = false
    loadingMessage.value = ''
  }

  // 通知操作
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const newNotification: Notification = {
      id,
      duration: 3000, // 默认3秒
      ...notification
    }
    
    notifications.value.push(newNotification)

    // 自动移除（除非是持久通知）
    if (!newNotification.persistent && newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }

    return id
  }

  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearAllNotifications = () => {
    notifications.value = []
  }

  // 便捷方法
  const showSuccess = (message: string, title?: string, duration?: number) => {
    return addNotification({ type: 'success', message, title, duration: duration || 3000 })
  }

  const showError = (message: string, title?: string, persistent?: boolean) => {
    return addNotification({ type: 'error', message, title, persistent })
  }

  const showInfo = (message: string, title?: string, duration?: number) => {
    return addNotification({ type: 'info', message, title, duration })
  }

  const showWarning = (message: string, title?: string, duration?: number) => {
    return addNotification({ type: 'warning', message, title, duration })
  }

  return {
    // 状态
    isLoading,
    loadingMessage,
    notifications,
    // Loading操作
    startLoading,
    stopLoading,
    // 通知操作
    addNotification,
    removeNotification,
    clearAllNotifications,
    // 便捷方法
    showSuccess,
    showError,
    showInfo,
    showWarning
  }
}) 