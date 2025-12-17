<template>
  <div class="canvas-preview-container">
    <div class="canvas-wrapper" ref="canvasWrapper">
      <!-- 左箭头按钮 -->
      <button
        v-if="isPdfMode && currentPage > 1"
        class="nav-button nav-button-left"
        @click="handlePreviousPage"
        title="上一页"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>

      <canvas
        ref="canvas"
        class="canvas-element"
      ></canvas>

      <!-- 右箭头按钮 -->
      <button
        v-if="isPdfMode && currentPage < totalPages"
        class="nav-button nav-button-right"
        @click="handleNextPage"
        title="下一页"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  calculateScaleFactor,
  type ScaleFactor
} from '@/utils/coordinateUtils'
import { PdfProcessor } from '@/utils/pdfConverter'
import { isPdfFormat } from '@/utils/fileUpload'
import { useImageStore } from '@/stores/imageStore'
import { usePdfStore } from '@/stores/pdfStore'

// Props
interface Props {
  imageFile?: File | null
  maxWidth?: number
  maxHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  imageFile: null,
  maxWidth: 800,
  maxHeight: 600
})

// Emits
interface Emits {
  (e: 'image-loaded', data: { width: number; height: number; scaleFactor: ScaleFactor }): void
  (e: 'image-updated', imageData: string): void
}

const emit = defineEmits<Emits>()

// Stores
const imageStore = useImageStore()
const pdfStore = usePdfStore()

// Refs
const canvas = ref<HTMLCanvasElement>()
const canvasWrapper = ref<HTMLElement>()

// 响应式数据
const isPdfMode = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const originalImageWidth = ref(0)
const originalImageHeight = ref(0)
const scaleFactor = ref<ScaleFactor>({ scaleX: 1, scaleY: 1 })

// 内部状态
let currentImage: HTMLImageElement | null = null
let pdfProcessor: PdfProcessor | null = null

// 加载图片
const loadImage = async (file: File) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// 获取容器可用尺寸
const getContainerSize = () => {
  const canvasWrapper = canvas.value?.parentElement
  if (!canvasWrapper) return { width: props.maxWidth, height: props.maxHeight }

  const rect = canvasWrapper.getBoundingClientRect()
  // 减去padding和边框的空间
  const availableWidth = rect.width - 32 // 减去左右padding (16px * 2)
  const availableHeight = rect.height - 32 // 减去上下padding (16px * 2)

  return {
    width: Math.max(200, availableWidth), // 最小宽度200px
    height: Math.max(150, availableHeight) // 最小高度150px
  }
}

// 绘制图片到画布
const drawImageToCanvas = (img: HTMLImageElement) => {
  if (!canvas.value) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  // 获取容器实际可用尺寸
  const containerSize = getContainerSize()

  // 使用工具函数计算缩放比例
  scaleFactor.value = calculateScaleFactor(
    img.width,
    img.height,
    containerSize.width,
    containerSize.height
  )

  // 计算显示尺寸
  const displayWidth = Math.round(img.width * scaleFactor.value.scaleX)
  const displayHeight = Math.round(img.height * scaleFactor.value.scaleY)

  // 获取设备像素比，提高canvas分辨率
  const dpr = window.devicePixelRatio || 1

  // 设置canvas实际尺寸（高分辨率）
  canvas.value.width = displayWidth * dpr
  canvas.value.height = displayHeight * dpr

  // 设置canvas显示尺寸
  canvas.value.style.width = displayWidth + 'px'
  canvas.value.style.height = displayHeight + 'px'

  // 缩放绘图上下文以匹配设备像素比
  ctx.scale(dpr, dpr)

  // 清除画布并绘制图片
  ctx.clearRect(0, 0, displayWidth, displayHeight)
  ctx.drawImage(img, 0, 0, displayWidth, displayHeight)

  // 更新原始图片尺寸
  originalImageWidth.value = img.width
  originalImageHeight.value = img.height

  // 发送图片加载事件
  emit('image-loaded', {
    width: img.width,
    height: img.height,
    scaleFactor: scaleFactor.value
  })
}

// 处理文件变化（图片或PDF）
const handleImageFile = async (file: File | null) => {
  if (!file) {
    // 清除画布和状态
    if (canvas.value) {
      const ctx = canvas.value.getContext('2d')
      ctx?.clearRect(0, 0, canvas.value.width, canvas.value.height)
    }
    currentImage = null
    isPdfMode.value = false
    currentPage.value = 1
    totalPages.value = 1
    originalImageWidth.value = 0
    originalImageHeight.value = 0
    pdfProcessor?.cleanup()
    pdfProcessor = null
    
    // 清理PDF store状态
    pdfStore.setPdfMode(false)
    
    return
  }

  try {
    // 检查是否为PDF文件
    if (isPdfFormat(file)) {
      await handlePdfFile(file)
    } else {
      await handleRegularImageFile(file)
    }
  } catch (error) {
    console.error('文件处理失败:', error)
  }
}

// 处理普通图片文件
const handleRegularImageFile = async (file: File) => {
  isPdfMode.value = false
  currentPage.value = 1
  totalPages.value = 1
  pdfProcessor?.cleanup()
  pdfProcessor = null

  // 退出PDF模式
  pdfStore.setPdfMode(false)

  const img = await loadImage(file)
  currentImage = img
  imageStore.setCurrentImage(img) // 更新 store 中的图片
  await nextTick()
  drawImageToCanvas(img)
}

// 处理PDF文件
const handlePdfFile = async (file: File) => {
  isPdfMode.value = true

  // 清理之前的PDF处理器
  pdfProcessor?.cleanup()
  pdfProcessor = new PdfProcessor(2.0)

  // 加载PDF并渲染第一页
  const pdfDoc = await pdfProcessor.loadPdf(file)
  currentPage.value = 1
  totalPages.value = pdfDoc.totalPages

  // 设置PDF模式
  pdfStore.setPdfMode(true)
  pdfStore.setPageInfo(1, pdfDoc.totalPages)

  const pageResult = await pdfProcessor.renderFirstPage()
  const img = await loadImage(pageResult.imageFile)
  currentImage = img
  
  // 更新PDF store中的当前页面图片
  pdfStore.setCurrentPdfPageImage(img)
  
  await nextTick()
  drawImageToCanvas(img)
}

// PDF分页处理函数
const handlePageNavigation = async (direction: 'next' | 'previous') => {
  if (!pdfProcessor || !isPdfMode.value) return

  try {
    const pageResult = direction === 'next'
      ? await pdfProcessor.renderNextPage()
      : await pdfProcessor.renderPreviousPage()

    if (pageResult) {
      currentPage.value = pageResult.pageNumber
      const img = await loadImage(pageResult.imageFile)
      currentImage = img

      // 更新PDF store中的页面信息和图片
      pdfStore.setPageInfo(pageResult.pageNumber, pageResult.totalPages)
      pdfStore.setCurrentPdfPageImage(img)

      // 清除之前页面的编辑数据，确保使用当前页面的原始图片
      imageStore.setEditedImageData(null)

      await nextTick()
      drawImageToCanvas(img)
    }
  } catch (error) {
    console.error(`渲染${direction === 'next' ? '下一页' : '上一页'}失败:`, error)
  }
}

const handleNextPage = () => handlePageNavigation('next')
const handlePreviousPage = () => handlePageNavigation('previous')

// 重新绘制当前图片（用于窗口大小变化时）
const redrawCurrentImage = () => {
  if (currentImage) {
    drawImageToCanvas(currentImage)
  }
}

// 窗口大小变化处理
const handleResize = () => {
  // 使用防抖，避免频繁重绘
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(redrawCurrentImage, 100)
}

let resizeTimeout: number

// 监听图片文件变化
watch(() => props.imageFile, handleImageFile, { immediate: true })

// 监听编辑后的图片数据
watch(() => imageStore.editedImageData, (newDataUrl) => {
  if (newDataUrl) {
    const img = new Image()
    img.onload = () => {
      currentImage = img
      drawImageToCanvas(img)
    }
    img.src = newDataUrl
  }
})

// 组件挂载
onMounted(() => {
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
  if (currentImage && currentImage.src.startsWith('blob:')) {
    URL.revokeObjectURL(currentImage.src)
  }
  pdfProcessor?.cleanup()
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimeout)
})
</script>

<style scoped>
.canvas-preview-container {
  @apply w-full h-full flex flex-col;
}

.canvas-wrapper {
  @apply relative flex justify-center items-center border border-base-300 rounded-lg p-4 bg-base-100 flex-1 min-h-0;
}

.canvas-element {
  @apply border border-base-300 rounded shadow-sm cursor-crosshair;
}

.nav-button {
  @apply absolute z-10 bg-base-100 bg-opacity-80 hover:bg-opacity-100 border border-base-300 rounded-full p-2 shadow-md transition-all duration-200 hover:shadow-lg;
}

.nav-button:hover {
  @apply bg-accent text-white border-accent;
}

.nav-button-left {
  @apply left-6;
}

.nav-button-right {
  @apply right-6;
}
</style> 