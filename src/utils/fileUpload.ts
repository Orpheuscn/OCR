/**
 * 文件上传工具函数
 * 支持点击上传、拖拽上传和粘贴上传三种方式
 */

import { convertHeicToJpeg } from './heicConverter'

// 支持的图片类型
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/heic',
  'image/heif'
]

// 支持的PDF类型
export const SUPPORTED_PDF_TYPES = [
  'application/pdf'
]

// 所有支持的文件类型
export const SUPPORTED_FILE_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_PDF_TYPES
]

// 文件上传回调函数类型
export type FileUploadCallback = (file: File) => void

// 文件上传错误回调函数类型
export type FileUploadErrorCallback = (error: string) => void

/**
 * 通用文件格式检查函数
 * @param file - 文件对象
 * @param mimeTypes - 支持的MIME类型数组
 * @param extensions - 支持的文件扩展名数组
 * @returns 是否匹配指定格式
 */
const checkFileFormat = (file: File, mimeTypes: string[], extensions: string[]): boolean => {
  // 通过MIME类型检查
  if (mimeTypes.includes(file.type)) {
    return true
  }

  // 通过文件扩展名检查
  const fileName = file.name.toLowerCase()
  return extensions.some(ext => fileName.endsWith(ext))
}

/**
 * 检查文件是否为HEIC/HEIF格式
 * @param file - 文件对象
 * @returns 是否为HEIC格式
 */
export const isHeicFormat = (file: File): boolean => {
  return checkFileFormat(file, ['image/heic', 'image/heif'], ['.heic', '.heif'])
}

/**
 * 检查文件是否为PDF格式
 * @param file - 文件对象
 * @returns 是否为PDF格式
 */
export const isPdfFormat = (file: File): boolean => {
  return checkFileFormat(file, ['application/pdf'], ['.pdf'])
}

/**
 * 验证文件是否为支持的文件类型（图片或PDF）
 * @param file - 要验证的文件
 * @returns 是否为支持的文件类型
 */
export const isValidFile = (file: File): boolean => {
  return checkFileFormat(file, SUPPORTED_FILE_TYPES, ['.heic', '.heif', '.pdf'])
}

/**
 * 处理文件选择
 * @param files - 文件列表
 * @param onSuccess - 成功回调
 * @param onError - 错误回调
 */
export const handleFileSelection = async (
  files: FileList | File[],
  onSuccess: FileUploadCallback,
  onError?: FileUploadErrorCallback
) => {
  const fileArray = Array.from(files)

  if (fileArray.length === 0) {
    onError?.('请选择文件')
    return
  }

  const file = fileArray[0] // 只处理第一个文件

  if (!isValidFile(file)) {
    onError?.('请选择有效的文件 (图片: JPEG, PNG, GIF, WebP, BMP, SVG, HEIC 或 PDF文档)')
    return
  }

  try {
    // 检查文件格式并进行相应处理
    if (isHeicFormat(file)) {
      const convertedFile = await convertHeicToJpeg(file)
      onSuccess(convertedFile)
    } else if (isPdfFormat(file)) {
      onSuccess(file)  // 直接传递PDF文件，让CanvasPreview组件处理
    } else {
      onSuccess(file)
    }
  } catch (error) {
    console.error('文件处理失败:', error)
    onError?.('文件处理失败，请重试')
  }
}

/**
 * 创建文件输入元素并触发选择
 * @param onSuccess - 成功回调
 * @param onError - 错误回调
 */
export const triggerFileSelect = (
  onSuccess: FileUploadCallback,
  onError?: FileUploadErrorCallback
) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = SUPPORTED_IMAGE_TYPES.join(',')
  input.multiple = false

  input.onchange = (event) => {
    const target = event.target as HTMLInputElement
    if (target.files) {
      handleFileSelection(target.files, onSuccess, onError)
    }
  }

  input.click()
}

/**
 * 设置拖拽上传事件监听器
 * @param element - 目标元素
 * @param onSuccess - 成功回调
 * @param onError - 错误回调
 * @returns 清理函数
 */
export const setupDragAndDrop = (
  element: HTMLElement,
  onSuccess: FileUploadCallback,
  onError?: FileUploadErrorCallback
) => {
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    element.classList.add('drag-over')
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    element.classList.remove('drag-over')
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    element.classList.remove('drag-over')

    const files = e.dataTransfer?.files
    if (files) {
      handleFileSelection(files, onSuccess, onError)
    }
  }

  // 添加事件监听器
  element.addEventListener('dragover', handleDragOver)
  element.addEventListener('dragleave', handleDragLeave)
  element.addEventListener('drop', handleDrop)

  // 返回清理函数
  return () => {
    element.removeEventListener('dragover', handleDragOver)
    element.removeEventListener('dragleave', handleDragLeave)
    element.removeEventListener('drop', handleDrop)
    element.classList.remove('drag-over')
  }
}

/**
 * 设置粘贴上传事件监听器
 * @param onSuccess - 成功回调
 * @param onError - 错误回调
 * @returns 清理函数
 */
export const setupPasteUpload = (
  onSuccess: FileUploadCallback,
  onError?: FileUploadErrorCallback
) => {
  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          handleFileSelection([file], onSuccess, onError)
        }
        break
      }
    }
  }

  // 添加事件监听器
  document.addEventListener('paste', handlePaste)

  // 返回清理函数
  return () => {
    document.removeEventListener('paste', handlePaste)
  }
}

/**
 * 文件上传管理器类
 * 统一管理所有上传方式
 */
export class FileUploadManager {
  private cleanupFunctions: (() => void)[] = []

  constructor(
    private onSuccess: FileUploadCallback,
    private onError?: FileUploadErrorCallback
  ) {}

  /**
   * 设置点击上传
   * @param element - 点击目标元素
   */
  setupClickUpload(element: HTMLElement) {
    const handleClick = () => {
      triggerFileSelect(this.onSuccess, this.onError)
    }

    element.addEventListener('click', handleClick)
    this.cleanupFunctions.push(() => {
      element.removeEventListener('click', handleClick)
    })
  }

  /**
   * 设置拖拽上传
   * @param element - 拖拽目标元素
   */
  setupDragUpload(element: HTMLElement) {
    const cleanup = setupDragAndDrop(element, this.onSuccess, this.onError)
    this.cleanupFunctions.push(cleanup)
  }

  /**
   * 设置粘贴上传
   */
  setupPasteUpload() {
    const cleanup = setupPasteUpload(this.onSuccess, this.onError)
    this.cleanupFunctions.push(cleanup)
  }

  /**
   * 清理所有事件监听器
   */
  cleanup() {
    this.cleanupFunctions.forEach(cleanup => cleanup())
    this.cleanupFunctions = []
  }
}
