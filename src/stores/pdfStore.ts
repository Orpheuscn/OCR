import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePdfStore = defineStore('pdf', () => {
  // PDF模式状态
  const isPdfMode = ref(false)
  
  // 当前PDF页面的图片
  const currentPdfPageImage = ref<HTMLImageElement | null>(null)
  
  // 页面信息
  const currentPage = ref(1)
  const totalPages = ref(1)

  // 设置PDF模式状态
  const setPdfMode = (mode: boolean) => {
    isPdfMode.value = mode
    if (!mode) {
      // 退出PDF模式时清理状态
      currentPdfPageImage.value = null
      currentPage.value = 1
      totalPages.value = 1
    }
  }

  // 更新当前PDF页面图片
  const setCurrentPdfPageImage = (image: HTMLImageElement | null) => {
    currentPdfPageImage.value = image
  }

  // 更新页面信息
  const setPageInfo = (current: number, total: number) => {
    currentPage.value = current
    totalPages.value = total
  }

  return {
    isPdfMode,
    currentPdfPageImage,
    currentPage,
    totalPages,
    setPdfMode,
    setCurrentPdfPageImage,
    setPageInfo
  }
}) 