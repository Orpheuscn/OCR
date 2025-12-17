<template>
  <div class="image-tool">
    <!-- 悬浮按钮 -->
    <button
      class="btn btn-circle btn-accent fixed left-6 bottom-6 shadow-lg z-50 transition-transform hover:scale-110"
      @click="toggleEditor"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </button>

    <!-- 编辑浮窗 -->
    <div v-if="isEditorOpen" class="modal modal-open">
      <div class="modal-box w-[95%] h-[90%] max-w-none max-h-none p-0 bg-base-100">
        <!-- 头部 -->
        <div class="navbar bg-base-200 border-b border-accent/20 px-4">
          <div class="navbar-start">
            <h3 class="text-lg font-bold">图片编辑</h3>
          </div>
          <div class="navbar-end">
            <button class="btn btn-sm btn-circle btn-ghost" @click="toggleEditor">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Canvas 容器 -->
        <div class="flex-1 overflow-hidden relative bg-base-100 canvas-editor" ref="canvasContainer" style="height: calc(100% - 120px);">
          <canvas ref="canvas" class="absolute inset-0"></canvas>
        </div>

        <!-- 工具栏 -->
        <div class="navbar bg-base-200 border-t border-accent/20 px-4">
          <div class="navbar-start">
            <div class="text-sm text-base-content/70">
              拖动鼠标绘制矩形进行遮挡
            </div>
          </div>
          <div class="navbar-end">
            <button @click="clearAll" class="btn btn-sm btn-ghost mr-2">清除</button>
            <button @click="saveChanges" class="btn btn-sm btn-accent">保存更改</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { usePdfStore } from '@/stores/pdfStore'
import { calculateScaleFactor, type ScaleFactor } from '@/utils/coordinateUtils'

const store = useImageStore()
const pdfStore = usePdfStore()
const isEditorOpen = ref(false)
const canvas = ref<HTMLCanvasElement>()
const canvasContainer = ref<HTMLElement>()
let fabricCanvas: FabricCanvas | null = null
let isDrawing = false
let origX = 0
let origY = 0
let currentRect: FabricRect | null = null
const scaleFactor = ref<ScaleFactor>({ scaleX: 1, scaleY: 1 })

// 初始化 fabric.js canvas
const initCanvas = () => {
  if (!canvas.value || !canvasContainer.value) return

  const containerRect = canvasContainer.value.getBoundingClientRect()
  const width = containerRect.width
  const height = containerRect.height

  canvas.value.width = width
  canvas.value.height = height

  fabricCanvas = new fabric.Canvas(canvas.value, {
    width,
    height,
    backgroundColor: '#f8fafc',
    selection: false
  })

  // 设置 fabric.js canvas 的光标
  if (fabricCanvas && canvas.value) {
    canvas.value.style.cursor = 'crosshair'
    // 设置 fabric.js 的默认光标
    ;(fabricCanvas as any).defaultCursor = 'crosshair'
    ;(fabricCanvas as any).hoverCursor = 'crosshair'
    ;(fabricCanvas as any).moveCursor = 'crosshair'
  }

  // 如果有当前图片，加载到 canvas
  const imageToLoad = pdfStore.isPdfMode ? pdfStore.currentPdfPageImage : store.currentImage
  if (imageToLoad) {
    loadImageToCanvas(imageToLoad)
  }

  // 添加 Fabric.js 事件监听器
  setupCanvasEvents()
}

// 设置 Canvas 事件
const setupCanvasEvents = () => {
  if (!fabricCanvas) return

  // 鼠标按下事件
  fabricCanvas.on('mouse:down', (options: { e: Event }) => {
    if (!fabricCanvas) return
    const pointer = fabricCanvas.getPointer(options.e)
    
    // 获取图片边界，确保只能在图片区域内开始绘制
    const objects = fabricCanvas.getObjects()
    const imageObject = objects.find((obj: FabricObject) => obj.type === 'image')
    
    if (imageObject && 
        typeof imageObject.width === 'number' && 
        typeof imageObject.height === 'number' && 
        typeof imageObject.scaleX === 'number' && 
        typeof imageObject.scaleY === 'number') {
      const imageLeft = imageObject.left - (imageObject.width * imageObject.scaleX) / 2
      const imageTop = imageObject.top - (imageObject.height * imageObject.scaleY) / 2
      const imageRight = imageLeft + imageObject.width * imageObject.scaleX
      const imageBottom = imageTop + imageObject.height * imageObject.scaleY
      
      // 检查点击是否在图片区域内
      if (pointer.x < imageLeft || pointer.x > imageRight || 
          pointer.y < imageTop || pointer.y > imageBottom) {
        return // 不在图片区域内，不开始绘制
      }
    }
    
    isDrawing = true
    origX = pointer.x
    origY = pointer.y

    // 创建新的矩形
    currentRect = new fabric.Rect({
      left: origX,
      top: origY,
      originX: 'left',
      originY: 'top',
      width: 0,
      height: 0,
      fill: '#000000', // 完全不透明的黑色
      stroke: '#000000',
      strokeWidth: 0.5, // 最细的边框
      selectable: false,
      evented: false
    })

    fabricCanvas.add(currentRect)
  })

  // 鼠标移动事件
  fabricCanvas.on('mouse:move', (options: { e: Event }) => {
    if (!isDrawing || !currentRect || !fabricCanvas) return

    const pointer = fabricCanvas.getPointer(options.e)

    // 获取图片边界
    const objects = fabricCanvas.getObjects()
    const imageObject = objects.find((obj: FabricObject) => obj.type === 'image')
    
    const constrainedPointer = { x: pointer.x, y: pointer.y }
    
    if (imageObject && 
        typeof imageObject.width === 'number' && 
        typeof imageObject.height === 'number' && 
        typeof imageObject.scaleX === 'number' && 
        typeof imageObject.scaleY === 'number') {
      // 计算图片的边界
      const imageLeft = imageObject.left - (imageObject.width * imageObject.scaleX) / 2
      const imageTop = imageObject.top - (imageObject.height * imageObject.scaleY) / 2
      const imageRight = imageLeft + imageObject.width * imageObject.scaleX
      const imageBottom = imageTop + imageObject.height * imageObject.scaleY
      
      // 将鼠标位置限制在图片边界内
      constrainedPointer.x = Math.max(imageLeft, Math.min(pointer.x, imageRight))
      constrainedPointer.y = Math.max(imageTop, Math.min(pointer.y, imageBottom))
    }

    // 计算矩形的位置和尺寸 - 修复反弹问题
    const minX = Math.min(origX, constrainedPointer.x)
    const minY = Math.min(origY, constrainedPointer.y)
    const maxX = Math.max(origX, constrainedPointer.x)
    const maxY = Math.max(origY, constrainedPointer.y)

    currentRect.set({
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY
    })

    fabricCanvas.renderAll()
  })

  // 鼠标松开事件
  fabricCanvas.on('mouse:up', () => {
    if (isDrawing && currentRect) {
      currentRect.setCoords()
      isDrawing = false
      currentRect = null
    }
  })
}

// 加载图片到 canvas
const loadImageToCanvas = (img: HTMLImageElement) => {
  if (!fabricCanvas) return

  // 计算缩放比例以适应容器，和 CanvasPreview.vue 保持一致
  scaleFactor.value = calculateScaleFactor(
    img.width,
    img.height,
    fabricCanvas.width,
    fabricCanvas.height
  )

  fabric.Image.fromURL(img.src, (fabricImage: FabricImage) => {
    if (!fabricCanvas) return
    
    // 图片居中显示，使用计算的缩放比例
    fabricImage.set({
      left: fabricCanvas.width / 2,
      top: fabricCanvas.height / 2,
      originX: 'center',
      originY: 'center',
      scaleX: scaleFactor.value.scaleX,
      scaleY: scaleFactor.value.scaleY,
      selectable: false,
      evented: false
    })

    fabricCanvas.clear()
    fabricCanvas.add(fabricImage)
    fabricCanvas.renderAll()

    // 重新设置事件监听器
    setupCanvasEvents()
  })
}

// 清除所有矩形
const clearAll = () => {
  if (!fabricCanvas) return
  
  const objects = fabricCanvas.getObjects()
  const rectsToRemove = objects.filter((obj: FabricObject) => obj.type === 'rect')
  
  rectsToRemove.forEach((rect: FabricObject) => {
    if (fabricCanvas) {
      fabricCanvas.remove(rect)
    }
  })
  
  fabricCanvas.renderAll()
}

// 保存更改
const saveChanges = () => {
  if (!fabricCanvas) return
  
  // 获取当前要编辑的图片（PDF模式下使用PDF页面图片，否则使用普通图片）
  const currentImg = pdfStore.isPdfMode ? pdfStore.currentPdfPageImage : store.currentImage
  if (!currentImg) return

  // 创建原图尺寸的临时 canvas
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')!
  
  tempCanvas.width = currentImg.width
  tempCanvas.height = currentImg.height

  // 先绘制原图
  tempCtx.drawImage(currentImg, 0, 0)

  // 获取所有矩形并映射到原图坐标
  const objects = fabricCanvas.getObjects()
  const imageObject = objects.find((obj: FabricObject) => obj.type === 'image')
  const rects = objects.filter((obj: FabricObject) => obj.type === 'rect')

  if (imageObject &&
      typeof imageObject.width === 'number' && 
      typeof imageObject.height === 'number' && 
      typeof imageObject.scaleX === 'number' && 
      typeof imageObject.scaleY === 'number') {
    // 计算图片在 canvas 中的位置
    const imageLeft = imageObject.left - (imageObject.width * imageObject.scaleX) / 2
    const imageTop = imageObject.top - (imageObject.height * imageObject.scaleY) / 2

    rects.forEach((rect: FabricObject) => {
      // 将矩形坐标映射回原图坐标
      const originalX = (rect.left - imageLeft) / scaleFactor.value.scaleX
      const originalY = (rect.top - imageTop) / scaleFactor.value.scaleY
      const originalWidth = (rect.width || 0) / scaleFactor.value.scaleX
      const originalHeight = (rect.height || 0) / scaleFactor.value.scaleY

      // 在原图上绘制黑色矩形
      tempCtx.fillStyle = '#000000'
      tempCtx.fillRect(originalX, originalY, originalWidth, originalHeight)
    })
  }

  // 导出为 dataURL
  const dataUrl = tempCanvas.toDataURL('image/png', 1)
  store.setEditedImageData(dataUrl)
  toggleEditor()
}

// 切换编辑器
const toggleEditor = () => {
  isEditorOpen.value = !isEditorOpen.value
  if (isEditorOpen.value) {
    nextTick(() => {
      initCanvas()
    })
  } else {
    // 清理 canvas
    if (fabricCanvas) {
      (fabricCanvas as FabricCanvas & { dispose(): void }).dispose()
      fabricCanvas = null
    }
  }
}

// 监听图片变化
watch(() => store.currentImage, (newImage) => {
  if (newImage && fabricCanvas && !pdfStore.isPdfMode) {
    loadImageToCanvas(newImage)
  }
})

// 监听PDF页面图片变化
watch(() => pdfStore.currentPdfPageImage, (newImage) => {
  if (newImage && fabricCanvas && pdfStore.isPdfMode) {
    loadImageToCanvas(newImage)
  }
})

onMounted(() => {
  window.addEventListener('resize', initCanvas)
})

onUnmounted(() => {
  window.removeEventListener('resize', initCanvas)
  if (fabricCanvas) {
    (fabricCanvas as FabricCanvas & { dispose(): void }).dispose()
  }
})
</script>

<style scoped>
.modal-box {
  display: flex;
  flex-direction: column;
}
</style> 