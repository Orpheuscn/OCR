<template>
  <div class="file-upload-container">
    <div
      ref="uploadArea"
      class="upload-area"
      :class="{ 'drag-over': isDragOver }"
      @click="handleClick"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <div class="upload-content">
        <div class="upload-icon">
          <svg
            class="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            ></path>
          </svg>
        </div>
        <div class="upload-text">
          <p class="text-lg font-medium text-gray-700 mb-2">
            {{ uploadText }}
          </p>
          <p class="text-xs text-gray-400 mt-2">
            支持图片和PDF
          </p>
        </div>
      </div>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="errorMessage" class="alert alert-error mt-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { FileUploadManager, type FileUploadCallback } from '@/utils/fileUpload'

// Props
interface Props {
  uploadText?: string
}

withDefaults(defineProps<Props>(), {
  uploadText: '选择、拖拽或粘贴图片'
})

// Emits
interface Emits {
  (e: 'file-selected', file: File): void
}

const emit = defineEmits<Emits>()

// Refs
const uploadArea = ref<HTMLElement>()
const isDragOver = ref(false)
const errorMessage = ref('')

// 文件上传管理器
let uploadManager: FileUploadManager | null = null

// 处理文件上传成功
const handleFileSuccess: FileUploadCallback = (file: File) => {
  errorMessage.value = ''
  emit('file-selected', file)
}

// 处理文件上传错误
const handleFileError = (error: string) => {
  errorMessage.value = error

  // 5秒后清除错误消息
  setTimeout(() => {
    errorMessage.value = ''
  }, 5000)
}

// 处理点击事件
const handleClick = () => {
  // 点击上传逻辑已在 uploadManager 中处理
}

// 处理拖拽事件
const handleDragOver = () => {
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = () => {
  isDragOver.value = false
  // 拖拽上传逻辑已在 uploadManager 中处理
}

// 组件挂载时设置上传管理器
onMounted(() => {
  if (uploadArea.value) {
    uploadManager = new FileUploadManager(handleFileSuccess, handleFileError)
    uploadManager.setupClickUpload(uploadArea.value)
    uploadManager.setupDragUpload(uploadArea.value)
    uploadManager.setupPasteUpload()
  }
})

// 组件卸载时清理
onUnmounted(() => {
  uploadManager?.cleanup()
})
</script>

<style scoped>
.file-upload-container {
  @apply w-full mx-auto;
}

.upload-area {
  @apply border-2 border-dashed border-accent border-opacity-30 rounded-lg p-8 text-center cursor-pointer transition-all duration-200 hover:border-accent;
}

.upload-area.drag-over {
  animation: dashFlow 2s linear infinite;
  border-style: dashed;
  border-width: 2px;
  border-color: #999;
  background-image: 
    linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.1) 50%),
    linear-gradient(0deg, transparent 50%, rgba(0,0,0,0.1) 50%);
  background-size: 10px 10px;
}

.upload-area:hover .upload-icon svg {
  @apply text-accent;
}

.upload-content {
  @apply flex flex-col items-center justify-center space-y-4;
}

.upload-icon {
  @apply flex items-center justify-center;
}

.upload-text {
  @apply text-center;
}

/* 边框脉冲动画 */
@keyframes borderPulse {
  0%, 100% {
    border-color: rgb(var(--ac));
    opacity: 1;
  }
  50% {
    border-color: rgb(var(--ac));
    opacity: 0.5;
  }
}

@keyframes dashRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dashFlow {
  0% {
    background-position: 0 0, 0 0;
  }
  100% {
    background-position: 10px 0, 0 10px;
  }
}
</style> 