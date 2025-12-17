/**
 * 文本处理和语言检测工具函数
 * 整合了语言检测和文本处理功能，直接从OCR Store获取数据进行处理
 */

import { useOcrStore } from '@/stores/ocrStore'

// 语言特性常量定义
const LANGUAGE_CATEGORIES = {
  CJK: ['zh', 'ja', 'ko'],
  SOUTHEAST_ASIAN: ['th', 'lo', 'my']
} as const

// 不使用空格的语言 = CJK + 东南亚语言
const NO_SPACE_LANGUAGES: readonly string[] = [...LANGUAGE_CATEGORIES.CJK, ...LANGUAGE_CATEGORIES.SOUTHEAST_ASIAN]

// 段落对象接口
export interface Paragraph {
  text: string
  y: number
}

// 符号对象接口
export interface SymbolData {
  text: string
  isFiltered: boolean
  detectedBreak?: {
    type?: string
  }
  midX: number
  midY: number
  width: number
  height: number
  x: number
  y: number
  originalIndex?: number
}

// 处理结果接口
export interface ProcessResult {
  processedText: string
  needSpace: boolean
}

// OCR 全文注释接口
export interface FullTextAnnotation {
  text?: string
  pages?: Array<{
    property?: {
      detectedLanguages?: Array<{
        languageCode: string
        confidence?: number
      }>
    }
    blocks?: Array<{
      paragraphs?: Array<{
        boundingBox?: {
          vertices?: Array<{ x?: number; y?: number }>
        }
        words?: Array<{
          symbols?: Array<{
            text: string
            boundingBox?: {
              vertices?: Array<{ x?: number; y?: number }>
            }
          }>
        }>
      }>
    }>
  }>
}

// 类型定义
export type LanguageCategory = 'cjk' | 'southeast_asian' | 'no_space'

export interface DetectedLanguage {
  languageCode: string
  confidence?: number
}

// 标点符号映射表 - 统一管理所有标点符号替换规则
const PUNCTUATION_MAPPING: Record<string, string> = {
  ',': '，',   // 逗号
  '-': '——',   // 连字符为破折号
  ';': '；',   // 分号
  '!': '！',   // 感叹号
  '?': '？',   // 问号
  ':': '：',   // 冒号
  '(': '（',   // 左括号
  ')': '）',   // 右括号
  '[': '【',   // 左方括号
  ']': '】',   // 右方括号
  '/': '／',   // 斜杠
  '\\': '＼',  // 反斜杠
  '.': '。'    // 句点
}

/**
 * 从OCR Store获取检测到的主要语言代码
 * @returns 主要语言代码，如果未检测到则返回'en'
 */
export function getDetectedLanguageCode(): string {
  const ocrStore = useOcrStore()
  const fullTextAnnotation = ocrStore.result?.fullTextAnnotation as FullTextAnnotation
  
  if (fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages) {
    const detectedLanguages = fullTextAnnotation.pages[0].property.detectedLanguages
    if (detectedLanguages.length > 0) {
      return detectedLanguages[0].languageCode || 'en'
    }
  }
  
  return 'en' // 默认使用英语
}

/**
 * 检查语言是否属于指定类别
 * @param languageCode 语言代码
 * @param category 语言类别
 * @returns 是否属于指定类别
 */
export function checkLanguageCategory(languageCode: string, category: LanguageCategory): boolean {
  if (!languageCode) return false
  
  const baseCode = languageCode.split('-')[0].toLowerCase()
  
  switch (category) {
    case 'cjk':
      return (LANGUAGE_CATEGORIES.CJK as readonly string[]).includes(baseCode)
    case 'southeast_asian':
      return (LANGUAGE_CATEGORIES.SOUTHEAST_ASIAN as readonly string[]).includes(baseCode)
    case 'no_space':
      return NO_SPACE_LANGUAGES.includes(baseCode)
    default:
      return false
  }
}

/**
 * 统一的标点符号处理函数
 * 根据语言特性决定是否进行标点符号转换
 * @param text 原始文本
 * @param languageCode 语言代码
 * @returns 处理后的文本
 */
export function processPunctuation(text: string, languageCode: string): string {
  if (!text || !languageCode) return text

  // 只有无空格语言（CJK + 东南亚语言）才进行标点符号转换
  if (!checkLanguageCategory(languageCode, 'no_space')) {
    return text
  }

  // 对于单个字符，直接查找映射表
  if (text.length === 1 && PUNCTUATION_MAPPING[text]) {
    return PUNCTUATION_MAPPING[text]
  }

  // 对于长文本，使用正则表达式批量替换
  let processedText = text
  for (const [western, cjk] of Object.entries(PUNCTUATION_MAPPING)) {
    const regex = new RegExp(western.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    processedText = processedText.replace(regex, cjk)
  }
  
  return processedText
}

/**
 * 处理符号文本，根据语言类型应用不同的处理规则
 * @param text 原始文本
 * @param languageCode 语言代码
 * @param breakType 断行类型
 * @returns 处理结果，包含处理后的文本和是否需要添加空格
 */
export function processSymbolText(
  text: string,
  languageCode: string,
  breakType: string = '',
): ProcessResult {
  if (!text) return { processedText: '', needSpace: false }

  // 统一使用标点符号处理函数
  const processedText = processPunctuation(text, languageCode)
  
  // 判断是否需要添加空格
  // 无空格语言（CJK + 东南亚）不需要空格
  const isSpacedLanguage = !checkLanguageCategory(languageCode, 'no_space')
  
  const needSpace = isSpacedLanguage && 
                   (breakType === 'SPACE' || breakType === 'EOL_SURE_SPACE')

  return { processedText, needSpace }
}

/**
 * 判断是否需要跳过符号处理
 * 主要用于处理有空格语言中的连字符
 * @param text 符号文本
 * @param languageCode 语言代码
 * @param breakType 断行类型
 * @returns 是否需要跳过处理
 */
export function shouldSkipSymbol(text: string, languageCode: string, breakType: string): boolean {
  // 只有有空格的语言（非CJK、非东南亚）才处理连字符
  const isSpacedLanguage = !checkLanguageCategory(languageCode, 'no_space')
  
  return isSpacedLanguage &&
         text === '-' &&
         (breakType === 'HYPHEN' || breakType === 'EOL_SURE_SPACE')
}

/**
 * 格式化段落文本
 * 根据不同语言的特性处理段落格式
 * @param paragraphs 段落数组
 * @param languageCode 语言代码
 * @returns 格式化后的文本
 */
export function formatParagraphText(paragraphs: Paragraph[]): string {
  if (!paragraphs || paragraphs.length === 0) return ''

  // 按垂直位置排序段落
  const sortedParagraphs = [...paragraphs].sort((a, b) => a.y - b.y)

  // 连接段落，使用双换行符分隔
  return sortedParagraphs.map((p) => p.text).join('\n\n')
}

/**
 * 清理文本中的换行符
 * @param text 原始文本
 * @returns 清理后的文本
 */
export function cleanLineBreaks(text: string): string {
  if (!text) return ''
  return text.replace(/[\r\n]/g, '')
}

/**
 * 清理文本中的多余空格和换行符
 * @param text 原始文本
 * @returns 清理后的文本
 */
export function cleanTextSpaces(text: string): string {
  if (!text) return ''
  return text.replace(/ +/g, ' ').replace(/\n+/g, '\n').trim()
}


