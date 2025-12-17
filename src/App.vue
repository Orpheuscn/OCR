<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Header from './components/Header.vue'
import FileUpload from './components/FileUpload.vue'
import ActionControl from './components/ActionControl.vue'
import CanvasPreview from './components/CanvasPreview.vue'
import TextOutputManager from './components/TextOutputManager.vue'
import ImageTool from './components/ImageTool.vue'
import NotificationManager from './components/NotificationManager.vue'
import ApiKeyDialog from './components/ApiKeyDialog.vue'
import CoordinateView from './components/CoordinateView.vue'
import { useOcrStore } from './stores/ocrStore'
import { useApiKeyStore } from './stores/apiKeyStore'
import { useCoordinateStore } from './stores/coordinateStore'

// 响应式数据
const selectedFile = ref<File | null>(null)
const showApiKeyDialog = ref(false)
const showCoordinateView = ref(false)

// Store
const ocrStore = useOcrStore()
const apiKeyStore = useApiKeyStore()
const coordinateStore = useCoordinateStore()

// 处理文件选择
const handleFileSelected = (file: File) => {
  selectedFile.value = file
  // 清除之前的识别结果
  ocrStore.clearAll()
}

// 处理图片加载
const handleImageLoaded = () => {
  // 图片加载完成，可以在这里处理相关逻辑
}

// 处理 API Key 保存
const handleApiKeySaved = () => {
  showApiKeyDialog.value = false
}

// 打开设置对话框
const handleOpenSettings = () => {
  showApiKeyDialog.value = true
}

// 打开坐标视图
const handleOpenCoordinateView = () => {
  showCoordinateView.value = true
}

// 组件挂载时检查 API Key
onMounted(() => {
  // 如果没有 API Key，显示输入对话框
  if (!apiKeyStore.hasApiKey) {
    showApiKeyDialog.value = true
  }
})
</script>

<template>
  <div class="min-h-screen bg-base-100 flex flex-col">
    <!-- 头部 -->
    <Header @open-settings="handleOpenSettings" />

    <!-- 主要内容 -->
    <main class="flex-1 flex flex-col px-4 py-6">
      <!-- 文件上传区域 - 居中显示，宽度90% -->
      <div class="w-full max-w-none mx-auto mb-6" style="width: 90%;">
        <FileUpload
          upload-text="选择或拖拽图片文件"
          @file-selected="handleFileSelected"
        />
      </div>

      <!-- 操作控制区域 - 和文件上传区域相同的宽度和高度 -->
      <div class="w-full max-w-none mx-auto mb-6" style="width: 90%;">
        <ActionControl />
      </div>

      <!-- 下方内容区域 - 只有在上传文件后才显示 -->
      <div v-if="selectedFile" class="w-full max-w-none mx-auto flex" style="width: 90%; height: 90vh; gap: 2%;">
        <!-- 左侧：图片预览区域 - 宽度49% -->
        <div class="flex-shrink-0" style="width: 49%; height: 90vh;">
          <div class="card bg-base-200 shadow-lg border border-accent border-opacity-20 h-full">
            <div class="card-body p-4 h-full">
              <CanvasPreview
                :image-file="selectedFile"
                @image-loaded="handleImageLoaded"
              />
            </div>
          </div>
        </div>

        <!-- 右侧：文本输出区域 - 宽度49% -->
        <div class="flex-shrink-0" style="width: 49%; height: 90vh;">
          <TextOutputManager />
        </div>
      </div>

      <!-- 图片编辑工具 -->
      <ImageTool v-if="selectedFile" />

      <!-- 坐标视图打开按钮 -->
      <button
        v-if="selectedFile && coordinateStore.hasOcrResult"
        class="btn btn-circle btn-accent fixed left-6 bottom-32 shadow-lg z-50 transition-transform hover:scale-110"
        @click="handleOpenCoordinateView"
        title="打开坐标视图"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
        </svg>
      </button>
    </main>

    <!-- 全局通知管理器 -->
    <NotificationManager />

    <!-- API Key 输入对话框 -->
    <ApiKeyDialog
      :show="showApiKeyDialog"
      @close="showApiKeyDialog = false"
      @saved="handleApiKeySaved"
    />

    <!-- 坐标视图 -->
    <CoordinateView v-model:is-open="showCoordinateView" />
  </div>
</template>

<style scoped>
/* 自定义样式可以在这里添加 */
</style>
