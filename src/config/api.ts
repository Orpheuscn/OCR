/**
 * API配置
 */

export const API_CONFIG = {
  // Google Cloud Vision API 端点
  VISION_API_ENDPOINT: 'https://vision.googleapis.com/v1/images:annotate',

  // 请求超时时间（毫秒）
  TIMEOUT: 60000,
} as const

export default API_CONFIG