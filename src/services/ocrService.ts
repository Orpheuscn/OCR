/**
 * OCR服务层
 * 直接调用 Google Cloud Vision API
 */

interface APIError {
  message: string
  status?: number
}

interface GoogleVisionResponse {
  success: boolean
  fullTextAnnotation?: {
    text: string
    pages?: unknown[]
  }
  textAnnotations?: unknown[]
  error?: string
}

class OCRService {
  private timeout: number
  private apiEndpoint: string

  constructor(timeout: number = 60000) {
    this.timeout = timeout
    this.apiEndpoint = 'https://vision.googleapis.com/v1/images:annotate'
  }

  /**
   * 图片OCR识别
   * @param imageBlob 图片二进制数据
   * @param apiKey Google Cloud Vision API Key
   * @param languageHints 语言提示（可选）
   */
  async recognizeText(
    imageBlob: Blob,
    apiKey: string,
    languageHints?: string[]
  ): Promise<GoogleVisionResponse> {
    try {
      // 将图片转换为 base64
      const base64Image = await this.blobToBase64(imageBlob)

      // 构建请求体
      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION',
                maxResults: 1
              }
            ],
            imageContext: languageHints && languageHints.length > 0
              ? { languageHints }
              : undefined
          }
        ]
      }

      // 调用 Google Vision API
      const response = await this.callVisionAPI(requestBody, apiKey)

      return {
        success: true,
        ...response.responses[0]
      }
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * 从Image元素识别文字
   * @param img HTMLImageElement
   * @param apiKey Google Cloud Vision API Key
   * @param languageHints 语言提示（可选）
   */
  async recognizeFromImage(
    img: HTMLImageElement,
    apiKey: string,
    languageHints?: string[]
  ): Promise<GoogleVisionResponse> {
    const blob = await this.imageToBlob(img)
    return this.recognizeText(blob, apiKey, languageHints)
  }

  /**
   * 从DataURL识别文字
   * @param dataUrl base64编码的图片数据
   * @param apiKey Google Cloud Vision API Key
   * @param languageHints 语言提示（可选）
   */
  async recognizeFromDataURL(
    dataUrl: string,
    apiKey: string,
    languageHints?: string[]
  ): Promise<GoogleVisionResponse> {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    return this.recognizeText(blob, apiKey, languageHints)
  }

  /**
   * 调用 Google Vision API
   */
  private async callVisionAPI(requestBody: unknown, apiKey: string): Promise<any> {
    const url = `${this.apiEndpoint}?key=${apiKey}`

    // 创建 AbortController 来处理超时
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error?.message ||
          `API 请求失败: ${response.status} ${response.statusText}`
        )
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * 将 Blob 转换为 base64（不包含 data URL 前缀）
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        // 移除 data URL 前缀 (data:image/png;base64,)
        const base64Data = base64String.split(',')[1]
        resolve(base64Data)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * 错误处理
   */
  private handleError(error: unknown): APIError {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      return { message: '请求超时，请稍后重试', status: 408 }
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { message: '网络连接失败，请检查网络设置', status: 0 }
    }

    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      // 检查是否是 API 密钥相关错误
      if (error.message.includes('API key') || error.message.includes('401')) {
        return { message: 'API Key 无效或已过期，请检查配置', status: 401 }
      }

      // 检查是否是配额错误
      if (error.message.includes('quota') || error.message.includes('429')) {
        return { message: 'API 配额已用尽，请稍后重试', status: 429 }
      }

      return {
        message: error.message,
        status: 500
      }
    }

    return {
      message: '未知错误',
      status: 500
    }
  }

  /**
   * 工具方法：将Image转换为Blob
   */
  private async imageToBlob(img: HTMLImageElement): Promise<Blob> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    
    ctx.drawImage(img, 0, 0)
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Image转换为Blob失败'))
        }
      }, 'image/png', 1.0)
    })
  }
}

// 创建并导出OCR服务实例
export const ocrService = new OCRService()

// 导出类型
export type { APIError, GoogleVisionResponse } 