<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApiKeyStore } from '@/stores/apiKeyStore'

// Props
interface Props {
  show: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
  saved: []
}>()

// Store
const apiKeyStore = useApiKeyStore()

// 状态
const inputApiKey = ref('')
const errorMessage = ref('')
const isValidating = ref(false)

// 计算属性
const isValidKey = computed(() => {
  return inputApiKey.value.trim().length > 0
})

// 监听对话框显示，加载已有的 API Key
const loadExistingKey = () => {
  if (props.show && apiKeyStore.hasApiKey) {
    inputApiKey.value = apiKeyStore.apiKey
  }
}

// 监听 show 属性变化
import { watch } from 'vue'
watch(() => props.show, (newVal) => {
  if (newVal) {
    loadExistingKey()
  }
})

// 保存 API Key
const handleSave = async () => {
  errorMessage.value = ''
  
  if (!inputApiKey.value.trim()) {
    errorMessage.value = 'API Key 不能为空'
    return
  }

  // 验证格式
  if (!apiKeyStore.validateApiKey(inputApiKey.value)) {
    errorMessage.value = 'API Key 格式不正确，请检查后重试'
    return
  }

  try {
    isValidating.value = true
    
    // 保存到 localStorage
    apiKeyStore.saveApiKey(inputApiKey.value)
    
    // 清空输入
    inputApiKey.value = ''
    errorMessage.value = ''
    
    // 通知父组件
    emit('saved')
    emit('close')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败，请重试'
  } finally {
    isValidating.value = false
  }
}

// 取消
const handleCancel = () => {
  inputApiKey.value = ''
  errorMessage.value = ''
  emit('close')
}

// 处理回车键
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && isValidKey.value && !isValidating.value) {
    handleSave()
  }
}
</script>

<template>
  <div v-if="show" class="modal modal-open">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-2xl mb-4">配置 Google Cloud Vision API Key</h3>
      
      <div class="py-4">
        <p class="text-base-content/70 mb-4">
          首次使用需要配置 Google Cloud Vision API Key。API Key 将安全地保存在浏览器本地存储中。
        </p>
        
        <!-- API Key 输入框 -->
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text font-semibold">API Key</span>
          </label>
          <input
            v-model="inputApiKey"
            type="text"
            placeholder="请输入您的 Google Cloud Vision API Key"
            class="input input-bordered w-full"
            :class="{ 'input-error': errorMessage }"
            @keypress="handleKeyPress"
            :disabled="isValidating"
          />
          <label v-if="errorMessage" class="label">
            <span class="label-text-alt text-error">{{ errorMessage }}</span>
          </label>
        </div>

        <!-- 帮助信息 -->
        <div class="alert alert-info mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div class="text-sm">
            <p class="font-semibold mb-1">如何获取 API Key？</p>
            <ol class="list-decimal list-inside space-y-1">
              <li>访问 <a href="https://console.cloud.google.com/" target="_blank" class="link link-primary">Google Cloud Console</a></li>
              <li>创建或选择一个项目</li>
              <li>启用 Cloud Vision API</li>
              <li>在"凭据"页面创建 API 密钥</li>
            </ol>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="modal-action">
        <button 
          @click="handleCancel" 
          class="btn btn-ghost"
          :disabled="isValidating"
        >
          取消
        </button>
        <button 
          @click="handleSave" 
          class="btn btn-primary"
          :disabled="!isValidKey || isValidating"
        >
          <span v-if="isValidating" class="loading loading-spinner loading-sm"></span>
          {{ isValidating ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-open {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

