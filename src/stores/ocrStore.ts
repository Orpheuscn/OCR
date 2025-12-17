import { defineStore } from 'pinia'
import { ref } from 'vue'

// OCR响应接口
interface OCRResponse {
  success: boolean
  fullTextAnnotation?: {
    text: string
    pages?: unknown[]
  }
  textAnnotations?: unknown[]
  error?: string
}

export const useOcrStore = defineStore('ocr', () => {
  // 状态
  const result = ref<OCRResponse | null>(null)
  const textDirection = ref<'horizontal' | 'vertical'>('horizontal')

  // 操作
  const startRecognition = () => {
    result.value = null
    
    // 显示loading
    import('./notificationStore').then(({ useNotificationStore }) => {
      const notificationStore = useNotificationStore()
      notificationStore.startLoading('正在识别文字...')
    })
  }

  const setResult = (apiResponse: OCRResponse) => {
    // 处理API响应并转换为OCRResponse格式
    const ocrResult: OCRResponse = {
      success: true,
      fullTextAnnotation: apiResponse.fullTextAnnotation,
      textAnnotations: apiResponse.textAnnotations,
      error: apiResponse.error
    }
    
    result.value = ocrResult
    
    // 停止loading并显示成功消息
    import('./notificationStore').then(({ useNotificationStore }) => {
      const notificationStore = useNotificationStore()
      notificationStore.stopLoading()
      notificationStore.showSuccess('文字识别完成！', undefined, 2000)
    })
  }

  const setError = (errorMessage: string) => {
    result.value = null
    
    // 停止loading并显示错误消息
    import('./notificationStore').then(({ useNotificationStore }) => {
      const notificationStore = useNotificationStore()
      notificationStore.stopLoading()
      notificationStore.showError(errorMessage, '识别失败', true)
    })
  }

  const setTextDirection = (direction: 'horizontal' | 'vertical') => {
    textDirection.value = direction
  }

  const clearAll = () => {
    result.value = null
    // 不再重置 textDirection，保持用户的选择
    
    // 清除所有通知
    import('./notificationStore').then(({ useNotificationStore }) => {
      const notificationStore = useNotificationStore()
      notificationStore.stopLoading()
      notificationStore.clearAllNotifications()
    })
  }

  return {
    // 状态
    result,
    textDirection,
    // 操作
    startRecognition,
    setResult,
    setError,
    setTextDirection,
    clearAll
  }
}) 