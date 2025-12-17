<template>
  <div class="text-output-manager">
    <div class="card bg-base-200 shadow-lg border border-accent border-opacity-20 h-full">
      <div class="card-body p-4 h-full flex flex-col">
        <!-- 排版方式选择 -->
        <div class="flex items-center gap-4 mb-4 p-3 bg-base-100 rounded-lg border border-base-300">
          <div class="text-sm font-medium text-base-content">排版方式：</div>
          <div class="flex gap-6">
            <label class="cursor-pointer label gap-2">
              <input 
                type="radio" 
                name="layout-mode" 
                value="original" 
                v-model="layoutMode"
                class="radio radio-accent radio-sm" 
              />
              <span class="label-text">原始排版</span>
            </label>
            <label class="cursor-pointer label gap-2">
              <input 
                type="radio" 
                name="layout-mode" 
                value="paragraph" 
                v-model="layoutMode"
                class="radio radio-accent radio-sm" 
              />
              <span class="label-text">分段排版</span>
            </label>
          </div>
        </div>

        <!-- 顶部信息区域 - 新的现代化设计 -->
        <div v-if="displayText" class="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-accent/10 to-accent/5 rounded-xl border border-accent/20 backdrop-blur-sm">
          <div class="flex items-center gap-8">
            <!-- 字符数 -->
            <div class="flex flex-col items-center">
              <div class="text-2xl font-bold text-accent mb-1">{{ characterCount.toLocaleString() }}</div>
              <div class="text-xs text-base-content/60 font-medium">字符数</div>
            </div>
            
            <!-- 识别语言 -->
            <div v-if="detectedLanguage" class="flex flex-col items-center">
              <div class="text-lg font-bold text-primary mb-1">{{ detectedLanguage }}</div>
              <div class="text-xs text-base-content/60 font-medium">识别语言</div>
            </div>
            
            <!-- 置信度 -->
            <div v-if="confidence !== null" class="flex flex-col items-center">
              <div class="flex items-center gap-2 mb-1">
                <div class="text-lg font-bold text-success">{{ confidence }}%</div>
                <div class="radial-progress text-success" :style="`--value:${confidence}; --size:1.5rem; --thickness: 2px;`" role="progressbar"></div>
              </div>
              <div class="text-xs text-base-content/60 font-medium">识别准确度</div>
            </div>
          </div>
          
          <!-- 复制按钮 - 现代化设计 -->
          <button 
            @click="copyToClipboard" 
            :disabled="copying"
            class="btn btn-accent btn-sm gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0"
            :class="{ 'loading': copying }"
          >
            <svg v-if="!copying" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {{ copying ? '复制中...' : '复制' }}
          </button>
        </div>
        
        <div class="flex-1 overflow-hidden">
          <!-- 识别结果 -->
          <div v-if="displayText" class="h-full flex flex-col">
            <!-- 文本内容 -->
            <div 
              class="flex-1 text-container"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOcrStore } from '@/stores/ocrStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { processPunctuation, getDetectedLanguageCode } from '@/utils/textProcessors'
import { 
  processHorizontalParallelText,
  processHorizontalParagraphText,
  processVerticalParallelText,
  processVerticalParagraphText
} from '@/utils/textLayout'
import { getTextContainerConfig } from '@/utils/textUI'
import languageMap from '@/assets/languages.json'
import type { FullTextAnnotation, ProcessedSymbol, Page, Block, Paragraph, Word, Symbol, Vertex } from '@/types/ocr'

// Store
const ocrStore = useOcrStore()
const notificationStore = useNotificationStore()

// 响应式数据
const copying = ref(false)
const layoutMode = ref<'original' | 'paragraph'>('original')

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
                isFiltered: true, // 默认所有符号都被过滤
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

// 计算属性 - 根据方向和排版模式动态处理文本
const displayText = computed(() => {
  const result = ocrStore.result
  const direction = ocrStore.textDirection
  const mode = layoutMode.value
  
  if (!result?.fullTextAnnotation) return ''
  
  const languageCode = getDetectedLanguageCode()
  
  // 从OCR结果中提取符号数据
  const filteredSymbolsData = extractSymbolsData(result.fullTextAnnotation as FullTextAnnotation)
  
  return processTextByLayout(
    result.fullTextAnnotation as FullTextAnnotation, 
    filteredSymbolsData, 
    direction, 
    mode, 
    languageCode
  )
})

// 字符数统计 - 基于处理后的文本
const characterCount = computed(() => {
  return displayText.value?.length || 0
})

// 文本容器配置 - 根据语言和方向动态配置样式
const textContainerConfig = computed(() => {
  const languageCode = getDetectedLanguageCode()
  const direction = ocrStore.textDirection
  
  return getTextContainerConfig(languageCode, direction)
})

// 检测到的语言 - 从ocrStore获取元数据
const detectedLanguage = computed(() => {
  const fullTextAnnotation = ocrStore.result?.fullTextAnnotation
  if (fullTextAnnotation?.pages && fullTextAnnotation.pages.length > 0) {
    const firstPage = fullTextAnnotation.pages[0] as Page
    if (firstPage.property?.detectedLanguages && firstPage.property.detectedLanguages.length > 0) {
      const lang = firstPage.property.detectedLanguages[0]
      const langCode = lang.languageCode
      
      // 使用外部语言映射文件
      if (languageMap[langCode as keyof typeof languageMap]) {
        return languageMap[langCode as keyof typeof languageMap].zh
      }
      
      // 如果找不到映射，返回大写的语言代码
      return langCode.toUpperCase()
    }
  }
  return null
})

// 置信度 - 从ocrStore获取元数据
const confidence = computed(() => {
  const fullTextAnnotation = ocrStore.result?.fullTextAnnotation
  if (fullTextAnnotation?.pages && fullTextAnnotation.pages.length > 0) {
    const firstPage = fullTextAnnotation.pages[0] as Page
    if (firstPage.confidence !== undefined) {
      return Math.round(firstPage.confidence * 100)
    }
  }
  return null
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
.text-output-manager {
  @apply w-full h-full;
}

/* 文本容器基础样式 */
.text-container {
  overflow-y: auto;
}

/* 竖排文本样式 */
.text-vertical {
  writing-mode: vertical-rl;
  text-orientation: upright;
  height: 500px;
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  line-height: 1.5;
}

.text-vertical pre {
  white-space: pre-line;
  height: auto;
  max-height: 500px;
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

/* 添加渐变动画效果 */
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

/* 环形进度条自定义样式 */
.radial-progress {
  background: radial-gradient(closest-side, transparent 79%, currentColor 80% 100%),
              conic-gradient(currentColor calc(var(--value) * 1%), transparent 0);
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
