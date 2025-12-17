/**
 * 文本UI显示工具函数
 * 处理不同语言的文本显示方向和样式
 */

// RTL (从右到左) 语言代码列表
const RTL_LANGUAGES = [
  'ar',    // 阿拉伯语
  'iw',    // 希伯来语 (Hebrew)
  'he',    // 希伯来语 (备用代码)
  'fa',    // 波斯语 (Persian/Farsi)
  'ur',    // 乌尔都语
  'ps',    // 普什图语
  'dv',    // 迪维希语
  'syr',   // 叙利亚语
  'yi'     // 意第绪语
] as const

/**
 * 检测语言是否是RTL语言
 * @param languageCode 语言代码
 * @returns 是否是RTL语言
 */
export function isRTLLanguage(languageCode: string): boolean {
  if (!languageCode) return false
  
  // 获取基础语言代码（去掉地区标识符）
  const baseCode = languageCode.split('-')[0].toLowerCase()
  
  return (RTL_LANGUAGES as readonly string[]).includes(baseCode)
}

/**
 * 获取文本显示的CSS类名
 * @param languageCode 语言代码
 * @param isVertical 是否是竖排显示
 * @returns CSS类名字符串
 */
export function getTextDisplayClasses(languageCode: string, isVertical: boolean): string {
  const classes: string[] = []
  
  if (isVertical) {
    // 竖排显示样式
    classes.push('text-vertical')
  } else if (isRTLLanguage(languageCode)) {
    // RTL语言样式
    classes.push('text-rtl')
  } else {
    // 默认LTR（从左到右）样式
    classes.push('text-ltr')
  }
  
  return classes.join(' ')
}

/**
 * 获取文本显示的内联样式
 * @param languageCode 语言代码
 * @param isVertical 是否是竖排显示
 * @returns 样式对象
 */
export function getTextDisplayStyles(): Record<string, string> {
  // 大部分样式通过CSS类处理，这里只返回空对象或必要的动态样式
  return {}
}

/**
 * 获取文本容器的完整样式配置
 * @param languageCode 语言代码
 * @param textDirection 文本方向设置
 * @returns 包含类名和样式的配置对象
 */
export function getTextContainerConfig(languageCode: string, textDirection: string) {
  const isVertical = shouldUseVerticalDisplay(textDirection)
  
  return {
    classes: getTextDisplayClasses(languageCode, isVertical),
    styles: getTextDisplayStyles(),
    isVertical,
    isRTL: isRTLLanguage(languageCode)
  }
}

/**
 * 判断当前文本是否应该使用竖排显示
 * @param textDirection 文本方向设置 ('horizontal' | 'vertical')
 * @returns 是否使用竖排显示
 */
export function shouldUseVerticalDisplay(textDirection: string): boolean {
  return textDirection === 'vertical'
} 