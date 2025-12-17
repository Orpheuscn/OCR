import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API_KEY_STORAGE_KEY = 'google_vision_api_key'

export const useApiKeyStore = defineStore('apiKey', () => {
  // 状态
  const apiKey = ref<string>('')
  const isInitialized = ref<boolean>(false)

  // 计算属性
  const hasApiKey = computed(() => apiKey.value.trim().length > 0)

  // 从 localStorage 加载 API Key
  const loadApiKey = () => {
    try {
      const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY)
      if (storedKey) {
        apiKey.value = storedKey
        isInitialized.value = true
        return true
      }
      return false
    } catch (error) {
      console.error('加载 API Key 失败:', error)
      return false
    }
  }

  // 保存 API Key 到 localStorage
  const saveApiKey = (key: string) => {
    try {
      const trimmedKey = key.trim()
      if (!trimmedKey) {
        throw new Error('API Key 不能为空')
      }
      
      localStorage.setItem(API_KEY_STORAGE_KEY, trimmedKey)
      apiKey.value = trimmedKey
      isInitialized.value = true
      return true
    } catch (error) {
      console.error('保存 API Key 失败:', error)
      throw error
    }
  }

  // 清除 API Key
  const clearApiKey = () => {
    try {
      localStorage.removeItem(API_KEY_STORAGE_KEY)
      apiKey.value = ''
      isInitialized.value = false
    } catch (error) {
      console.error('清除 API Key 失败:', error)
      throw error
    }
  }

  // 验证 API Key 格式（基本验证）
  const validateApiKey = (key: string): boolean => {
    const trimmedKey = key.trim()
    // Google Cloud API Key 通常以 AIza 开头，长度约 39 个字符
    // 这里做基本的格式验证
    return trimmedKey.length > 20 && /^[A-Za-z0-9_-]+$/.test(trimmedKey)
  }

  // 初始化时自动加载
  loadApiKey()

  return {
    // 状态
    apiKey,
    isInitialized,
    // 计算属性
    hasApiKey,
    // 方法
    loadApiKey,
    saveApiKey,
    clearApiKey,
    validateApiKey
  }
})

