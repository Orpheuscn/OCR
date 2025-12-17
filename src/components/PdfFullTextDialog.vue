<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
    @click.self="closeDialog"
  >
    <div class="card bg-base-100 shadow-xl w-[95%] h-[95%] flex flex-col">
      <div class="card-body p-6 h-full flex flex-col">
        <!-- 头部 -->
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold text-base-content">PDF 全页识别结果</h2>
          <div class="flex gap-2">
            <!-- 复制按钮 -->
            <button 
              @click="copyToClipboard" 
              :disabled="copying"
              class="btn btn-accent btn-sm gap-2"
              :class="{ 'loading': copying }"
            >
              <svg v-if="!copying" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {{ copying ? '复制中...' : '复制全部' }}
            </button>
            
            <!-- 关闭按钮 -->
            <button 
              @click="closeDialog"
              class="btn btn-circle btn-sm btn-ghost"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 排版方式选择 -->
        <div class="flex items-center gap-4 mb-4 p-3 bg-base-200 rounded-lg">
          <div class="text-sm font-medium text-base-content">排版方式：</div>
          <div class="flex gap-6">
            <label class="cursor-pointer label gap-2">
              <input 
                type="radio" 
                name="pdf-layout-mode" 
                value="original" 
                v-model="layoutMode"
                class="radio radio-accent radio-sm" 
              />
              <span class="label-text">原始排版</span>
            </label>
            <label class="cursor-pointer label gap-2">
              <input 
                type="radio" 
                name="pdf-layout-mode" 
                value="paragraph" 
                v-model="layoutMode"
                class="radio radio-accent radio-sm" 
              />
              <span class="label-text">分段排版</span>
            </label>
          </div>
        </div>

        <!-- 统计信息 -->
        <div v-if="displayText" class="flex items-center gap-8 mb-4 p-4 bg-gradient-to-r from-accent/10 to-accent/5 rounded-xl border border-accent/20">
          <div class="flex flex-col items-center">
            <div class="text-2xl font-bold text-accent mb-1">{{ characterCount.toLocaleString() }}</div>
            <div class="text-xs text-base-content/60 font-medium">字符数</div>
          </div>
          <div class="flex flex-col items-center">
            <div class="text-2xl font-bold text-primary mb-1">{{ totalPages }}</div>
            <div class="text-xs text-base-content/60 font-medium">总页数</div>
          </div>
        </div>

        <!-- 文本内容 -->
        <div class="flex-1 overflow-hidden">
          <div 
            class="h-full text-container overflow-y-auto bg-base-200 rounded-lg"
            :class="textContainerConfig.classes"
            :style="textContainerConfig.styles"
          >
            <pre 
              class="text-content text-sm leading-relaxed text-base-content p-4"
              :class="{
                'whitespace-pre-wrap break-words': !textContainerConfig.isVertical,
                'whitespace-pre': textContainerConfig.isVertical
              }"
            >{{ displayText }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useOcrStore } from '@/stores/ocrStore'
import { processPunctuation, getDetectedLanguageCode } from '@/utils/textProcessors'
import { 
  processHorizontalParallelText,
  processHorizontalParagraphText,
  processVerticalParallelText,
  processVerticalParagraphText
} from '@/utils/textLayout'
import { getTextContainerConfig } from '@/utils/textUI'
import type { FullTextAnnotation, ProcessedSymbol, Page, Block, Paragraph, Word, Symbol, Vertex } from '@/types/ocr'

// Props
interface Props {
  isOpen?: boolean
  pagesAnnotations?: FullTextAnnotation[]  // 每一页的 fullTextAnnotation 数组
  totalPages?: number
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  pagesAnnotations: () => [],
  totalPages: 0
})

// Emits
interface Emits {
  (e: 'update:isOpen', value: boolean): void
}

const emit = defineEmits<Emits>()

// Store
const notificationStore = useNotificationStore()
const ocrStore = useOcrStore()

// 状态
const copying = ref(false)
const layoutMode = ref<'original' | 'paragraph'>('original')

// 关闭对话框
const closeDialog = () => {
  emit('update:isOpen', false)
}

// 辅助函数：从OCR结果中提取符号数据
const extractSymbolsData = (fullTextAnnotation: FullTextAnnotation): ProcessedSymbol[] => {
  const symbolsData: ProcessedSymbol[] = []

  if (!fullTextAnnotation?.pages) return symbolsData

  let originalIndex = 0

  fullTextAnnotation.pages.forEach((page: Page) => {
    page.blocks?.forEach((block: Block) => {
      block.paragraphs?.forEach((paragraph: Paragraph) => {
        paragraph.words?.forEach((word: Word) => {
          word.symbols?.forEach((symbol: Symbol) => {
            if (symbol.text && symbol.boundingBox?.vertices) {
              const vertices = symbol.boundingBox.vertices
              const minX = Math.min(...vertices.map((v: Vertex) => v?.x ?? Infinity))
              const maxX = Math.max(...vertices.map((v: Vertex) => v?.x ?? -Infinity))
              const minY = Math.min(...vertices.map((v: Vertex) => v?.y ?? Infinity))
              const maxY = Math.max(...vertices.map((v: Vertex) => v?.y ?? -Infinity))

              symbolsData.push({
                text: symbol.text,
                isFiltered: true,
                detectedBreak: symbol.property?.detectedBreak || {},
                midX: (minX + maxX) / 2,
                midY: (minY + maxY) / 2,
                width: maxX - minX,
                height: maxY - minY,
                x: minX,
                y: minY,
                originalIndex: originalIndex++
              })
            }
          })
        })
      })
    })
  })

  return symbolsData
}

// 辅助函数：根据方向和排版模式处理文本
const processTextByLayout = (fullTextAnnotation: FullTextAnnotation, filteredSymbolsData: ProcessedSymbol[], direction: string, mode: string, languageCode: string): string => {
  const key = `${direction}-${mode}`

  // 调试信息
  if (direction === 'vertical') {
    console.log('竖排模式调试信息:', {
      key,
      symbolsCount: filteredSymbolsData.length,
      hasFullText: !!fullTextAnnotation?.text,
      fullTextLength: fullTextAnnotation?.text?.length || 0
    })
  }

  switch (key) {
    case 'horizontal-original':
      return processHorizontalParallelText(fullTextAnnotation, filteredSymbolsData, languageCode)
    case 'horizontal-paragraph':
      return processHorizontalParagraphText(fullTextAnnotation, filteredSymbolsData, languageCode)
    case 'vertical-original':
      // 如果没有符号数据，回退到原始文本处理
      if (!filteredSymbolsData || filteredSymbolsData.length === 0) {
        return processPunctuation(fullTextAnnotation?.text || '', languageCode)
      }
      return processVerticalParallelText(filteredSymbolsData, languageCode, true)
    case 'vertical-paragraph':
      // 如果没有符号数据，回退到原始文本处理
      if (!filteredSymbolsData || filteredSymbolsData.length === 0) {
        return processPunctuation(fullTextAnnotation?.text || '', languageCode)
      }
      return processVerticalParagraphText(fullTextAnnotation, filteredSymbolsData, languageCode)
    default:
      // 如果没有匹配的处理函数，回退到简单的标点符号处理
      return processPunctuation(fullTextAnnotation?.text || '', languageCode)
  }
}

// 计算属性 - 显示文本
const displayText = computed(() => {
  if (!props.pagesAnnotations || props.pagesAnnotations.length === 0) return ''

  const direction = ocrStore.textDirection
  const mode = layoutMode.value
  const languageCode = getDetectedLanguageCode()

  // 对每一页分别处理，然后拼接
  const processedPages = props.pagesAnnotations.map((pageAnnotation, index) => {
    // 从当前页的OCR结果中提取符号数据
    const filteredSymbolsData = extractSymbolsData(pageAnnotation)

    // 处理当前页的文本
    const pageText = processTextByLayout(
      pageAnnotation,
      filteredSymbolsData,
      direction,
      mode,
      languageCode
    )

    // 添加页码标记
    return `========== 第 ${index + 1} 页 ==========\n${pageText}`
  })

  // 拼接所有页面
  return processedPages.join('\n\n')
})

// 字符数统计
const characterCount = computed(() => {
  return displayText.value?.length || 0
})

// 文本容器配置
const textContainerConfig = computed(() => {
  const languageCode = getDetectedLanguageCode()
  const direction = ocrStore.textDirection

  return getTextContainerConfig(languageCode, direction)
})

// 复制到剪贴板
const copyToClipboard = async () => {
  if (!displayText.value) return

  copying.value = true
  try {
    await navigator.clipboard.writeText(displayText.value)
    notificationStore.showSuccess('已复制到剪贴板', undefined, 1500)
  } catch (err) {
    console.error('复制失败:', err)
    notificationStore.showError('复制失败，请手动复制')
  } finally {
    copying.value = false
  }
}
</script>

<style scoped>
/* 文本容器基础样式 */
.text-container {
  overflow-y: auto;
}

/* 竖排文本样式 */
.text-vertical {
  writing-mode: vertical-rl;
  text-orientation: upright;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  line-height: 1.5;
}

.text-vertical pre {
  white-space: pre-line;
  height: auto;
  width: auto;
  display: block;
  margin: 0;
  padding: 4px;
}

/* RTL文本样式 */
.text-rtl {
  direction: rtl;
  text-align: right;
}

/* LTR文本样式 */
.text-ltr {
  direction: ltr;
  text-align: left;
}

/* 渐变动画效果 */
.bg-gradient-to-r {
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
}

@keyframes gradient-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* 滚动条样式优化 */
.text-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.text-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.text-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.text-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
}
</style>


