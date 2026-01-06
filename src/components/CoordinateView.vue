<template>
  <div
    v-if="isOpen && coordinateStore.hasOcrResult"
    class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
    @click.self="closeCoordinateView"
  >
    <div class="card bg-base-100 shadow-xl w-[95%] h-[95%] flex flex-col">
      <!-- 头部工具栏 -->
      <div class="p-4 border-b border-base-300 flex justify-between items-center flex-shrink-0">
        <h3 class="text-lg font-bold">坐标视图</h3>

        <div class="flex items-center gap-2">
          <!-- 缩放控制 -->
          <div class="join">
            <button class="btn btn-sm join-item" @click="zoomOut">-</button>
            <button class="btn btn-sm join-item no-animation">{{ Math.round(zoomLevel * 100) }}%</button>
            <button class="btn btn-sm join-item" @click="zoomIn">+</button>
          </div>

          <!-- 区块级别选择 -->
          <select v-model="selectedBlockLevel" class="select select-sm select-bordered">
            <option value="blocks">区块</option>
            <option value="paragraphs">段落</option>
            <option value="words">单词</option>
            <option value="symbols">符号</option>
          </select>

          <!-- 显示/隐藏边界 -->
          <button class="btn btn-sm" @click="showBounds = !showBounds">
            {{ showBounds ? '隐藏边界' : '显示边界' }}
          </button>

          <!-- 关闭按钮 -->
          <button class="btn btn-sm btn-circle btn-ghost" @click="closeCoordinateView">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 坐标系统容器 -->
      <div class="flex-1 overflow-auto bg-base-200 p-4" ref="containerRef">
        <div
          class="relative border border-base-300"
          :class="isDarkMode ? 'bg-base-300' : 'bg-white'"
          :style="{
            width: `${systemWidth}px`,
            height: `${systemHeight}px`,
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left'
          }"
        >
          <!-- SVG 边界框 -->
          <svg
            v-if="showBounds"
            class="absolute inset-0 pointer-events-none"
            :width="systemWidth"
            :height="systemHeight"
          >
            <polygon
              v-for="(boundary, index) in blockBoundaries"
              :key="index"
              :points="boundary.points"
              fill="rgba(59, 130, 246, 0.1)"
              stroke="rgb(59, 130, 246)"
              stroke-width="1"
              class="cursor-pointer pointer-events-auto"
              @click="copyText(boundary.text)"
            >
              <title>{{ boundary.tooltip }}</title>
            </polygon>
          </svg>

          <!-- 文字符号 -->
          <div
            v-for="(symbol, index) in displaySymbols"
            :key="index"
            class="absolute cursor-pointer hover:bg-yellow-200 transition-colors"
            :style="{
              left: `${symbol.x}px`,
              top: `${symbol.y}px`,
              width: `${symbol.width}px`,
              height: `${symbol.height}px`,
              fontSize: `${symbol.fontSize}px`,
              lineHeight: `${symbol.height}px`
            }"
            @click="copySymbolText(symbol)"
          >
            {{ symbol.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- 复制成功提示 -->
    <div v-if="showCopyToast" class="toast toast-top toast-center">
      <div class="alert alert-success">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>文本已复制</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCoordinateStore } from '@/stores/coordinateStore'

// Props
interface Props {
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false
})

// Emits
interface Emits {
  (e: 'update:isOpen', value: boolean): void
}

const emit = defineEmits<Emits>()

const coordinateStore = useCoordinateStore()

// 状态
const containerRef = ref<HTMLElement | null>(null)
const zoomLevel = ref(1)
const selectedBlockLevel = ref<'blocks' | 'paragraphs' | 'words' | 'symbols'>('blocks')
const showBounds = ref(true)
const showCopyToast = ref(false)
const isDarkMode = ref(false)

// 检测暗色模式
const checkDarkMode = () => {
  isDarkMode.value = document.documentElement.getAttribute('data-theme') === 'dark'
}

// 计算属性
const systemWidth = computed(() => coordinateStore.imageDimensions.width || 800)
const systemHeight = computed(() => coordinateStore.imageDimensions.height || 600)

const blockBoundaries = computed(() => {
  return coordinateStore.getBlockBoundaries(selectedBlockLevel.value)
})

const displaySymbols = computed(() => {
  return coordinateStore.symbolsData.map(symbol => ({
    ...symbol,
    fontSize: Math.max(12, symbol.height * 0.8)
  }))
})

// 监听主题变化
onMounted(() => {
  checkDarkMode()

  // 监听主题变化
  const observer = new MutationObserver(() => {
    checkDarkMode()
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  })

  onUnmounted(() => {
    observer.disconnect()
  })
})

// 方法
const zoomIn = () => {
  zoomLevel.value = Math.min(2, zoomLevel.value + 0.1)
}

const zoomOut = () => {
  zoomLevel.value = Math.max(0.2, zoomLevel.value - 0.1)
}

const copyText = async (text: string) => {
  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    showCopyToast.value = true
    setTimeout(() => {
      showCopyToast.value = false
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

const copySymbolText = async (symbol: any) => {
  // 根据当前选择的层级获取对应的文本
  const text = coordinateStore.getTextByLevel(
    symbol.blockIdx,
    symbol.paraIdx,
    symbol.wordIdx,
    symbol.symIdx,
    selectedBlockLevel.value
  )
  await copyText(text)
}

const closeCoordinateView = () => {
  emit('update:isOpen', false)
}
</script>

