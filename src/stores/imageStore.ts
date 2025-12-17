import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useImageStore = defineStore('image', () => {
  const currentImage = ref<HTMLImageElement | null>(null)
  const editedImageData = ref<string | null>(null)

  const setCurrentImage = (image: HTMLImageElement | null) => {
    currentImage.value = image
    // 清除之前的编辑数据
    editedImageData.value = null
    // 清除OCR状态 - 延迟执行避免初始化时的问题
    setTimeout(() => {
      import('./ocrStore').then(({ useOcrStore }) => {
        const ocrStore = useOcrStore()
        ocrStore.clearAll()
      }).catch(() => {
        // 忽略可能的导入错误
      })
    }, 0)
  }

  const setEditedImageData = (dataUrl: string | null) => {
    editedImageData.value = dataUrl
    // 编辑图片后清除OCR状态 - 延迟执行避免初始化时的问题
    setTimeout(() => {
      import('./ocrStore').then(({ useOcrStore }) => {
        const ocrStore = useOcrStore()
        ocrStore.clearAll()
      }).catch(() => {
        // 忽略可能的导入错误
      })
    }, 0)
  }

  return {
    currentImage,
    editedImageData,
    setCurrentImage,
    setEditedImageData
  }
}) 