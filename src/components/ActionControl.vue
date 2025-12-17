<template>
  <div class="action-control">
    <div class="card bg-base-200 shadow-lg border border-accent border-opacity-20 h-full">
      <div class="card-body p-4 h-full">
        <div class="h-full flex items-center justify-between">
          <!-- 左侧：方向选择单选框 -->
          <div class="flex flex-col gap-2">
            <div class="text-sm font-medium text-base-content mb-2">识别方向：</div>
            <div class="flex gap-4">
              <label 
                class="cursor-pointer label gap-2"
                :class="{ 'opacity-50 cursor-not-allowed': isDirectionSelectionDisabled }"
              >
                <input 
                  type="radio" 
                  name="direction" 
                  value="horizontal" 
                  v-model="ocrStore.textDirection"
                  :disabled="isDirectionSelectionDisabled"
                  class="radio radio-accent" 
                />
                <span class="label-text">横排</span>
              </label>
              <label 
                class="cursor-pointer label gap-2"
                :class="{ 'opacity-50 cursor-not-allowed': isDirectionSelectionDisabled }"
              >
                <input 
                  type="radio" 
                  name="direction" 
                  value="vertical" 
                  v-model="ocrStore.textDirection"
                  :disabled="isDirectionSelectionDisabled"
                  class="radio radio-accent" 
                />
                <span class="label-text">竖排</span>
              </label>
            </div>
          </div>

          <!-- 中间：语言选择下拉框 -->
          <div class="form-control w-full max-w-xs">
            <label class="label">
              <span class="label-text text-sm font-medium">识别语言:</span>
              <span class="label-text-alt text-xs">
                <button class="btn btn-xs btn-ghost" @click="clearLanguages" :disabled="notificationStore.isLoading">
                  清空
                </button>
              </span>
            </label>
            <div class="relative w-full" ref="dropdownRef">
              <button
                :class="['btn btn-sm w-full justify-start', notificationStore.isLoading ? 'btn-disabled' : '']"
                :disabled="notificationStore.isLoading"
                @click.stop="toggleDropdown"
              >
                {{ selectedLanguagesDisplay }}
              </button>
              <div
                v-if="showDropdown"
                class="absolute top-full left-0 right-0 mt-1 bg-base-100 shadow rounded-box z-50 max-h-60 overflow-auto"
                @click.stop
              >
                <div class="p-2">
                  <!-- 搜索框 -->
                  <div class="mb-2">
                    <input
                      type="text"
                      v-model="languageSearch"
                      placeholder="搜索语言"
                      class="input input-sm input-bordered w-full"
                      @input="filterLanguages"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-1">
                    <div
                      v-for="lang in filteredLanguages"
                      :key="lang.code"
                      :class="[
                        'form-control flex-row items-center px-2 py-1 rounded hover:bg-base-200 cursor-pointer',
                        selectedLanguages.includes(lang.code) ? 'bg-base-200' : '',
                      ]"
                      @click="toggleLanguage(lang.code)"
                    >
                      <label class="label cursor-pointer justify-start gap-2 w-full">
                        <input
                          type="checkbox"
                          :checked="selectedLanguages.includes(lang.code)"
                          class="checkbox checkbox-sm"
                          @click.stop
                          @change="toggleLanguage(lang.code)"
                        />
                        <span class="label-text text-xs">{{ lang.name }}</span>
                        <span class="text-xs opacity-60">({{ lang.code }})</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <label class="label">
              <span class="label-text-alt text-xs">支持多语言混合识别</span>
            </label>
          </div>

          <!-- 右侧：开始识别按钮 -->
          <div class="flex gap-2">
            <button 
              @click="startRecognition" 
              :disabled="!canStartRecognition"
              class="btn btn-accent btn-lg gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {{ notificationStore.isLoading ? '识别中...' : '开始识别' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { usePdfStore } from '@/stores/pdfStore'
import { useOcrStore } from '@/stores/ocrStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useApiKeyStore } from '@/stores/apiKeyStore'
import { useCoordinateStore } from '@/stores/coordinateStore'
import { ocrService, type APIError } from '@/services/ocrService'
import languagesData from '@/assets/languages.json'

// Store
const imageStore = useImageStore()
const pdfStore = usePdfStore()
const coordinateStore = useCoordinateStore()
const ocrStore = useOcrStore()
const notificationStore = useNotificationStore()
const apiKeyStore = useApiKeyStore()

// 语言选择相关状态
const selectedLanguages = ref<string[]>([])
const showDropdown = ref(false)
const languageSearch = ref('')
const filteredLanguages = ref<Array<{ code: string; name: string }>>([])
const dropdownRef = ref<HTMLElement>()

// 初始化语言列表
const initializeLanguages = () => {
  const languages = Object.entries(languagesData).map(([code, data]) => ({
    code,
    name: data.zh // 使用中文名称
  }))
  filteredLanguages.value = languages
}

// 过滤语言
const filterLanguages = () => {
  const search = languageSearch.value.toLowerCase()
  const languages = Object.entries(languagesData).map(([code, data]) => ({
    code,
    name: data.zh
  }))
  
  if (!search) {
    filteredLanguages.value = languages
  } else {
    filteredLanguages.value = languages.filter(lang => 
      lang.name.toLowerCase().includes(search) || 
      lang.code.toLowerCase().includes(search)
    )
  }
}

// 切换下拉框显示
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

// 切换语言选择
const toggleLanguage = (code: string) => {
  if (selectedLanguages.value.includes(code)) {
    selectedLanguages.value = selectedLanguages.value.filter(lang => lang !== code)
  } else {
    selectedLanguages.value.push(code)
  }
}

// 清空语言选择
const clearLanguages = () => {
  selectedLanguages.value = []
}

// 选中语言显示文本
const selectedLanguagesDisplay = computed(() => {
  if (selectedLanguages.value.length === 0) {
    return '选择语言'
  }
  
  const languageNames = selectedLanguages.value.map(code => {
    return languagesData[code as keyof typeof languagesData]?.zh || code
  })
  
  if (languageNames.length === 1) {
    return languageNames[0]
  } else {
    return `已选择 ${languageNames.length} 种语言`
  }
})

// 计算属性：是否禁用方向选择
const isDirectionSelectionDisabled = computed(() => {
  return notificationStore.isLoading
})

// 计算属性：是否可以开始识别
const canStartRecognition = computed(() => {
  const hasImage = imageStore.editedImageData || imageStore.currentImage || pdfStore.currentPdfPageImage
  const notLoading = !notificationStore.isLoading
  return hasImage && notLoading
})

// 开始识别
const startRecognition = async () => {
  if (!canStartRecognition.value) return

  // 检查是否有 API Key
  if (!apiKeyStore.hasApiKey) {
    notificationStore.showError('未配置 API Key', '请先配置 Google Cloud Vision API Key')
    return
  }

  try {
    notificationStore.isLoading = true
    notificationStore.loadingMessage = '正在识别文字...'

    // 准备语言提示
    const languageHints = selectedLanguages.value.length > 0 ? selectedLanguages.value : undefined

    // 获取 API Key
    const apiKey = apiKeyStore.apiKey

    let result

    // 优先使用编辑后的图片数据
    if (imageStore.editedImageData) {
      // 使用编辑后的图片数据进行识别
      result = await ocrService.recognizeFromDataURL(imageStore.editedImageData, apiKey, languageHints)
    } else if (pdfStore.isPdfMode && pdfStore.currentPdfPageImage) {
      // PDF模式下使用当前PDF页面图片
      result = await ocrService.recognizeFromImage(pdfStore.currentPdfPageImage, apiKey, languageHints)
    } else if (imageStore.currentImage) {
      // 使用当前图片
      result = await ocrService.recognizeFromImage(imageStore.currentImage, apiKey, languageHints)
    } else {
      throw new Error('没有找到要识别的图片')
    }

    if (result.success && result.fullTextAnnotation) {
      // 保存识别结果（ocrStore.setResult会处理通知显示）
      ocrStore.setResult(result)

      // 设置图片尺寸到 coordinateStore
      if (imageStore.editedImageData) {
        const img = new Image()
        img.onload = () => {
          coordinateStore.setImageDimensions(img.width, img.height)
        }
        img.src = imageStore.editedImageData
      } else if (pdfStore.isPdfMode && pdfStore.currentPdfPageImage) {
        coordinateStore.setImageDimensions(
          pdfStore.currentPdfPageImage.width,
          pdfStore.currentPdfPageImage.height
        )
      } else if (imageStore.currentImage) {
        coordinateStore.setImageDimensions(
          imageStore.currentImage.width,
          imageStore.currentImage.height
        )
      }
    } else {
      throw new Error(result.error || '识别失败')
    }

  } catch (error) {
    notificationStore.isLoading = false

    const apiError = error as APIError
    const errorMessage = apiError.message || '识别过程中发生错误'

    notificationStore.showError('识别失败', errorMessage)
    console.error('OCR识别错误:', error)
  }
}

// 点击外部关闭下拉框
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  initializeLanguages()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.action-control {
  @apply h-full;
}

/* 下拉框样式优化 */
.dropdown-content {
  @apply shadow-lg border border-base-300;
  max-height: 300px;
  overflow-y: auto;
}

/* 搜索框样式 */
.input:focus {
  @apply border-accent;
}

/* 语言选项hover效果 */
.form-control:hover {
  @apply bg-base-200;
}

/* 按钮禁用状态 */
.btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}
</style>
