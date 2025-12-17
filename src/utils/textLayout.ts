/**
 * 高级文本处理工具函数
 * 包含复杂的文本布局处理逻辑：水平/垂直、并行/段落等不同模式
 */

// 引用基础接口和工具函数（需要根据实际情况调整导入）
interface SymbolData {
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

interface FullTextAnnotation {
  text?: string
  pages?: Array<{
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



// 导入textProcessors中的函数
import { 
  processSymbolText, 
  shouldSkipSymbol, 
  cleanTextSpaces, 
  cleanLineBreaks, 
  checkLanguageCategory, 
  processPunctuation
} from '@/utils/textProcessors'

/**
 * 处理水平并行模式的文本
 * @param fullTextAnnotation OCR识别结果
 * @param filteredSymbolsData 过滤后的符号数据
 * @param languageCode 语言代码
 * @returns 处理后的文本
 */
export function processHorizontalParallelText(
  fullTextAnnotation: FullTextAnnotation,
  filteredSymbolsData: SymbolData[],
  languageCode: string,
): string {
  // 如果没有过滤符号数据，返回空字符串
  if (
    !filteredSymbolsData ||
    !Array.isArray(filteredSymbolsData) ||
    filteredSymbolsData.length === 0
  ) {
    return ''
  }

  // 检查是否有原始文本并且所有符号都被过滤
  const hasOriginalText = fullTextAnnotation?.text && typeof fullTextAnnotation.text === 'string'
  const allSymbolsFiltered = filteredSymbolsData.every((symbol) => symbol.isFiltered)

  // 如果有原始文本并且所有符号都被过滤，直接使用原始文本
  if (hasOriginalText && allSymbolsFiltered) {
    // 只在无空格语言时进行标点替换
    if (checkLanguageCategory(languageCode, 'no_space')) {
      return processPunctuation(fullTextAnnotation.text || '', languageCode)
    }
    return fullTextAnnotation.text || ''
  }

  // 否则处理过滤后的符号
  let text = ''
  const filteredSymbols = filteredSymbolsData.filter((symbol) => symbol.isFiltered)

  filteredSymbols.forEach((symbol) => {
    // 使用工具函数处理符号文本
    const { processedText, needSpace } = processSymbolText(
      symbol.text,
      languageCode,
      symbol.detectedBreak?.type,
    )
    text += processedText

    // 如果需要添加空格
    if (needSpace) {
      text += ' '
    }

    // 处理断行
    if (
      symbol.detectedBreak &&
      (symbol.detectedBreak.type === 'LINE_BREAK' || symbol.detectedBreak.type === 'HYPHEN')
    ) {
      text += '\n'
    }
  })

  return cleanTextSpaces(text)
}

/**
 * 处理水平段落模式的文本
 * @param fullTextAnnotation OCR识别结果
 * @param filteredSymbolsData 过滤后的符号数据
 * @param languageCode 语言代码
 * @returns 处理后的文本
 */
export function processHorizontalParagraphText(
  fullTextAnnotation: FullTextAnnotation,
  filteredSymbolsData: SymbolData[],
  languageCode: string,
): string {
  if (!fullTextAnnotation?.pages || !filteredSymbolsData) return ''

  // 添加安全检查，确保 filteredSymbolsData 是数组
  if (!Array.isArray(filteredSymbolsData)) {
    console.error(
      '错误: processHorizontalParagraphText - filteredSymbolsData 不是数组',
      filteredSymbolsData,
    )
    return ''
  }

  const paragraphsOutput: Array<{ text: string; y: number }> = []

  fullTextAnnotation.pages.forEach((page) => {
    page.blocks?.forEach((block) => {
      block.paragraphs?.forEach((paragraph) => {
        let currentParagraphText = ''
        let paragraphHasFilteredContent = false
        let paragraphMinY = Infinity

        // 尝试获取段落边界框的Y坐标用于排序
        if (paragraph.boundingBox?.vertices && paragraph.boundingBox.vertices.length > 0) {
          paragraphMinY = Math.min(...paragraph.boundingBox.vertices.map((v) => v?.y ?? Infinity))
        }

        paragraph.words?.forEach((word) => {
          word.symbols?.forEach((symbol) => {
            // 在filteredSymbolsData中查找对应的符号
            const symbolData = filteredSymbolsData.find(
              (fd) =>
                fd.text === symbol.text &&
                Math.abs(
                  fd.midX -
                    (symbol.boundingBox?.vertices && symbol.boundingBox.vertices.length > 0
                      ? (Math.min(...symbol.boundingBox.vertices.map((v) => v?.x ?? Infinity)) +
                          Math.max(...symbol.boundingBox.vertices.map((v) => v?.x ?? -Infinity))) /
                        2
                      : -Infinity),
                ) < 5 &&
                Math.abs(
                  fd.midY -
                    (symbol.boundingBox?.vertices && symbol.boundingBox.vertices.length > 0
                      ? (Math.min(...symbol.boundingBox.vertices.map((v) => v?.y ?? Infinity)) +
                          Math.max(...symbol.boundingBox.vertices.map((v) => v?.y ?? -Infinity))) /
                        2
                      : -Infinity),
                ) < 5,
            )

            if (symbolData?.isFiltered) {
              // 检查符号是否通过过滤
              const breakType = symbolData.detectedBreak

              // 使用工具函数判断是否应该跳过该符号
              if (shouldSkipSymbol(symbol.text, languageCode, breakType?.type || '')) {
                // 跳过连字符和空格的添加
                paragraphHasFilteredContent = true // 仍然标记段落包含过滤内容
              } else {
                // 使用工具函数处理符号文本
                const { processedText, needSpace } = processSymbolText(
                  symbol.text,
                  languageCode,
                  breakType?.type || '',
                )
                currentParagraphText += processedText

                paragraphHasFilteredContent = true

                // 如果需要添加空格
                if (needSpace) {
                  currentParagraphText += ' '
                }
              }
            }
          }) // 符号循环结束
        }) // 单词循环结束

        if (paragraphHasFilteredContent) {
          const cleanedText = cleanTextSpaces(currentParagraphText) // 使用工具函数清理空格
          if (cleanedText.length > 0) {
            paragraphsOutput.push({
              text: cleanedText,
              y: isFinite(paragraphMinY) ? paragraphMinY : Infinity,
            })
          }
        }
      }) // 段落循环结束
    }) // 块循环结束
  }) // 页面循环结束

  if (paragraphsOutput.length === 0) {
    return ''
  }

  // 按垂直位置排序段落（从上到下）
  paragraphsOutput.sort((a, b) => a.y - b.y)

  // 用双换行符连接段落
  return paragraphsOutput.map((p) => p.text).join('\n\n')
}

/**
 * 处理垂直并行模式的文本
 * @param symbols 符号数组
 * @param languageCode 语言代码
 * @param isFiltered 是否只处理过滤后的符号
 * @returns 处理后的文本
 */
export function processVerticalParallelText(
  symbols: SymbolData[],
  languageCode: string,
  isFiltered: boolean = true,
): string {
  if (!symbols || symbols.length === 0) return ''

  // 创建一个新数组，不修改原始数据
  const processedSymbols = symbols
    .filter((symbol) => !isFiltered || symbol.isFiltered)
    .map((symbol) => {
      // 使用工具函数处理符号文本
      const { processedText } = processSymbolText(
        symbol.text,
        languageCode,
        symbol.detectedBreak?.type,
      )
      return { ...symbol, text: processedText }
    })

  // 计算平均字符宽度
  const getAverageCharWidth = (symbols: SymbolData[]): number => {
    if (!symbols || symbols.length === 0) return 15 // 默认宽度
    const validSymbols = symbols.filter((s) => s.width > 0 && isFinite(s.width))
    const widthsPerChar = validSymbols
      .filter((s) => s.text?.length > 0)
      .map((s) => s.width / s.text.length)
    if (widthsPerChar.length > 0) {
      return widthsPerChar.reduce((a, b) => a + b, 0) / widthsPerChar.length
    } else if (validSymbols.length > 0) {
      return validSymbols.reduce((a, b) => a + b.width, 0) / validSymbols.length
    } else {
      return 15 // 默认宽度
    }
  }

  const avgWidth = getAverageCharWidth(processedSymbols)
  const columnThreshold = avgWidth * 0.75

  // 初始排序：与 TextVerticalParallel 组件保持一致
  processedSymbols.sort((a, b) => {
    const colDiff = Math.abs(a.midX - b.midX)
    if (colDiff > columnThreshold) {
      return b.midX - a.midX
    }
    return a.midY - b.midY
  })

  // 分列：根据 X 坐标将字符分组
  const columns = []
  let currentColumn = []

  if (processedSymbols.length > 0) {
    currentColumn.push(processedSymbols[0])
    let lastMidX = processedSymbols[0].midX

    for (let i = 1; i < processedSymbols.length; i++) {
      const sym = processedSymbols[i]

      if (Math.abs(sym.midX - lastMidX) < columnThreshold) {
        currentColumn.push(sym)
        // 更新参考点（使用平均值）
        lastMidX = currentColumn.reduce((sum, s) => sum + s.midX, 0) / currentColumn.length
      } else {
        // 开始新列
        currentColumn.sort((a, b) => a.midY - b.midY)
        columns.push(currentColumn)
        currentColumn = [sym]
        lastMidX = sym.midX
      }
    }
    // 处理最后一列
    currentColumn.sort((a, b) => a.midY - b.midY)
    columns.push(currentColumn)
  }

  // 按列的 X 坐标排序（右到左）
  columns.sort((a, b) => {
    const avgXa = a.reduce((s, c) => s + c.midX, 0) / a.length
    const avgXb = b.reduce((s, c) => s + c.midX, 0) / b.length
    return avgXb - avgXa
  })

  // 拼接结果 - 与 TextVerticalParallel 组件保持一致
  const resultText = columns.map((col) => col.map((s) => s.text).join('')).join('\n')
  return resultText.length > 0 ? resultText : ''
}

/**
 * 处理垂直段落模式的文本
 * @param fullTextAnnotation OCR识别结果
 * @param filteredSymbolsData 过滤后的符号数据
 * @param languageCode 语言代码
 * @returns 处理后的文本
 */
export function processVerticalParagraphText(
  fullTextAnnotation: FullTextAnnotation,
  filteredSymbolsData: SymbolData[],
  languageCode: string,
): string {
  if (!fullTextAnnotation?.pages || !filteredSymbolsData) return ''

  // 添加安全检查，确保 filteredSymbolsData 是数组
  if (!Array.isArray(filteredSymbolsData)) {
    console.error(
      '错误: processVerticalParagraphText - filteredSymbolsData 不是数组',
      filteredSymbolsData,
    )
    return ''
  }

  // 辅助函数，计算平均字符宽度
  const getAverageCharWidth = (symbols: SymbolData[]): number => {
    if (!symbols || symbols.length === 0) return 15 // 默认宽度
    const validSymbols = symbols.filter((s) => s.width > 0 && isFinite(s.width))
    const widthsPerChar = validSymbols
      .filter((s) => s.text?.length > 0)
      .map((s) => s.width / s.text.length)
    if (widthsPerChar.length > 0) {
      return widthsPerChar.reduce((a, b) => a + b, 0) / widthsPerChar.length
    } else if (validSymbols.length > 0) {
      return validSymbols.reduce((a, b) => a + b.width, 0) / validSymbols.length
    } else {
      return 15 // 默认宽度
    }
  }

  const paragraphs: Array<{ text: string; x: number }> = []

  fullTextAnnotation.pages.forEach((page) => {
    page.blocks?.forEach((block) => {
      block.paragraphs?.forEach((paragraph) => {
        const symbolsInParagraph: SymbolData[] = []
        let paragraphHasFilteredContent = false
        let paragraphMinX = Infinity

        // 尝试获取段落边界框的X坐标用于排序
        if (paragraph.boundingBox?.vertices) {
          paragraphMinX = Math.min(...paragraph.boundingBox.vertices.map((v) => v?.x ?? Infinity))
        }

        paragraph.words?.forEach((word) => {
          word.symbols?.forEach((symbol) => {
            // 在filteredSymbolsData中查找对应的符号
            const symbolData = filteredSymbolsData.find(
              (fd) =>
                fd.originalIndex !== undefined &&
                fd.text === symbol.text &&
                Math.abs(fd.x - (symbol.boundingBox?.vertices?.[0]?.x ?? -1)) < 2 &&
                Math.abs(fd.y - (symbol.boundingBox?.vertices?.[0]?.y ?? -1)) < 2,
            )

            if (symbolData?.isFiltered) {
              // 只清理段落内的换行符
              const cleanedText = cleanLineBreaks(symbolData.text || '')

              // 使用工具函数处理符号文本
              const { processedText } = processSymbolText(
                cleanedText,
                languageCode,
                symbolData.detectedBreak?.type || '',
              )
              symbolsInParagraph.push({
                ...symbolData,
                text: processedText,
              })
              paragraphHasFilteredContent = true
            }
          })
        })

        if (paragraphHasFilteredContent && symbolsInParagraph.length > 0) {
          // 使用与processVerticalParallelText相同的列分割逻辑
          const avgWidth = getAverageCharWidth(symbolsInParagraph)
          const columnThreshold = avgWidth * 0.75

          // 排序：按X坐标（右到左），次要按Y坐标（上到下）
          symbolsInParagraph.sort((a, b) => {
            const colDiff = Math.abs(a.midX - b.midX)
            if (colDiff > columnThreshold) {
              return b.midX - a.midX
            }
            return a.midY - b.midY
          })

          // 分列
          const columns = []
          let currentColumn = []

          if (symbolsInParagraph.length > 0) {
            currentColumn.push(symbolsInParagraph[0])
            let lastMidX = symbolsInParagraph[0].midX

            for (let i = 1; i < symbolsInParagraph.length; i++) {
              const sym = symbolsInParagraph[i]

              if (Math.abs(sym.midX - lastMidX) < columnThreshold) {
                currentColumn.push(sym)
                lastMidX = currentColumn.reduce((sum, s) => sum + s.midX, 0) / currentColumn.length
              } else {
                currentColumn.sort((a, b) => a.midY - b.midY)
                columns.push(currentColumn)
                currentColumn = [sym]
                lastMidX = sym.midX
              }
            }
            // 处理最后一列
            currentColumn.sort((a, b) => a.midY - b.midY)
            columns.push(currentColumn)
          }

          // 按列的X坐标排序（右到左）
          columns.sort((a, b) => {
            const avgXa = a.reduce((s, c) => s + c.midX, 0) / a.length
            const avgXb = b.reduce((s, c) => s + c.midX, 0) / b.length
            return avgXb - avgXa
          })

          // 生成垂直段落文本 - 与 TextVerticalParagraph 组件保持一致
          // 列内字符直接连接，列之间不添加分隔符
          const paragraphText = columns.map((col) => col.map((s) => s.text).join('')).join('')

          paragraphs.push({
            text: paragraphText,
            x: isFinite(paragraphMinX) ? paragraphMinX : Infinity,
          })
        }
      })
    })
  })

  if (paragraphs.length === 0) {
    return ''
  }

  // 按水平位置排序段落（从右到左）
  paragraphs.sort((a, b) => b.x - a.x)

  // 用双换行符连接段落
  return paragraphs.map((p) => p.text).join('\n\n')
} 