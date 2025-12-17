/**
 * HEIC格式转换工具
 * 统一处理HEIC/HEIF格式图片转换为JPEG格式
 */

import heic2any from 'heic2any'

/**
 * 将HEIC/HEIF格式文件转换为JPEG格式
 * @param file 原始HEIC文件
 * @param quality JPEG质量 (0-1)，默认0.8
 * @returns 转换后的JPEG文件
 */
export async function convertHeicToJpeg(file: File, quality: number = 0.8): Promise<File> {
  try {
    // 执行转换
    const jpegBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: Math.max(0.1, Math.min(1.0, quality)), // 确保质量在有效范围内
    }) as Blob

    // 生成新的文件名
    const originalName = file.name.replace(/\.[^/.]+$/, '') || 'image'
    const convertedFile = new File([jpegBlob], `${originalName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })

    return convertedFile
  } catch (error) {
    console.error('HEIC转换失败:', error)
    throw new Error(`HEIC格式转换失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 处理文件转换
 * @param file 原始文件
 * @param quality JPEG质量 (0-1)，默认0.8
 * @returns 处理后的文件
 */
export async function processFileWithHeicConversion(
  file: File,
  quality: number = 0.8
): Promise<File> {
  try {
    const convertedFile = await convertHeicToJpeg(file, quality)
    return convertedFile
  } catch {
    return file
  }
}
