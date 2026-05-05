import type { FullTextAnnotation, Paragraph, Symbol, Vertex } from '@/types/ocr'
import { checkLanguageCategory } from '@/utils/textProcessors'

export type TextDirection = 'horizontal' | 'vertical'

export interface MissingCharacterBox {
  x: number
  y: number
  width: number
  height: number
  midX: number
  midY: number
  pageIndex: number
  blockIndex: number
  paragraphIndex: number
  text: '🔴'
  isMissingPlaceholder: true
  reason: 'in_paragraph_gap'
}

interface Bounds {
  x: number
  y: number
  width: number
  height: number
  left: number
  right: number
  top: number
  bottom: number
}

interface SymbolBox extends Bounds {
  text: string
  breakType?: string
  midX: number
  midY: number
}

interface CharacterMetrics {
  avgWidth: number
  avgHeight: number
  avgArea: number
}

interface ParagraphSymbols {
  pageIndex: number
  blockIndex: number
  paragraphIndex: number
  paragraphBounds: Bounds | null
  symbols: SymbolBox[]
  metrics: CharacterMetrics | null
}

interface VerticalColumn {
  avgX: number
  top: number
  bottom: number
  symbols: SymbolBox[]
}

interface HorizontalRow {
  avgY: number
  left: number
  right: number
  symbols: SymbolBox[]
}

const DEFAULT_CHAR_WIDTH = 15
const DEFAULT_CHAR_HEIGHT = 15
const GROUP_THRESHOLD_RATIO = 0.75
const MAX_SYMBOL_OVERLAP_RATIO = 0.25

// 根据OCR结果、文本方向和语言类型检测疑似缺失字符的位置。
export function detectMissingCharacterBoxes(
  fullTextAnnotation: FullTextAnnotation | null | undefined,
  textDirection: TextDirection,
  languageCode: string,
): MissingCharacterBox[] {
  if (!fullTextAnnotation?.pages || !checkLanguageCategory(languageCode, 'no_space')) {
    return []
  }

  const extractedParagraphs = extractParagraphSymbols(fullTextAnnotation)
  const allSymbols = extractedParagraphs.flatMap((paragraph) => paragraph.symbols)
  const paragraphs = extractedParagraphs
    .map((paragraph) => ({
      ...paragraph,
      metrics: calculateCharacterMetrics(paragraph.symbols),
    }))
    .filter((paragraph) => paragraph.symbols.length > 1 && paragraph.metrics)

  let boxes: MissingCharacterBox[]
  if (textDirection === 'vertical') {
    boxes = detectVerticalInParagraphGaps(paragraphs)
  } else {
    boxes = detectHorizontalInParagraphGaps(paragraphs)
  }

  return filterBoxesOverlappingSymbols(boxes, allSymbols)
}

// 从全文OCR结果中提取每个段落及其字符坐标数据。
function extractParagraphSymbols(fullTextAnnotation: FullTextAnnotation): ParagraphSymbols[] {
  const paragraphs: ParagraphSymbols[] = []

  fullTextAnnotation.pages?.forEach((page, pageIndex) => {
    page.blocks?.forEach((block, blockIndex) => {
      block.paragraphs?.forEach((paragraph, paragraphIndex) => {
        const symbols = extractSymbols(paragraph)

        paragraphs.push({
          pageIndex,
          blockIndex,
          paragraphIndex,
          paragraphBounds: boundsFromVertices(paragraph.boundingBox?.vertices),
          symbols,
          metrics: null,
        })
      })
    })
  })

  return paragraphs
}

// 从单个段落中提取所有字符的边界框和中心点。
function extractSymbols(paragraph: Paragraph): SymbolBox[] {
  const symbols: SymbolBox[] = []

  paragraph.words?.forEach((word) => {
    word.symbols?.forEach((symbol: Symbol) => {
      const bounds = boundsFromVertices(symbol.boundingBox?.vertices)
      if (!symbol.text || !bounds) return

      symbols.push({
        ...bounds,
        text: symbol.text,
        breakType: symbol.property?.detectedBreak?.type,
        midX: bounds.left + bounds.width / 2,
        midY: bounds.top + bounds.height / 2,
      })
    })
  })

  return symbols
}

// 计算段落内非标点字符的平均宽度、高度和面积。
function calculateCharacterMetrics(symbols: SymbolBox[]): CharacterMetrics | null {
  const characterSymbols = symbols.filter((symbol) => {
    return !isPunctuation(symbol.text) && symbol.width > 0 && symbol.height > 0
  })

  if (characterSymbols.length === 0) return null

  const avgWidth = average(characterSymbols.map((symbol) => symbol.width)) || DEFAULT_CHAR_WIDTH
  const avgHeight = average(characterSymbols.map((symbol) => symbol.height)) || DEFAULT_CHAR_HEIGHT
  const avgArea = average(characterSymbols.map((symbol) => symbol.width * symbol.height))

  return {
    avgWidth,
    avgHeight,
    avgArea: avgArea || avgWidth * avgHeight,
  }
}

// 检测竖排段落内部每一列中的疑似缺字空隙。
function detectVerticalInParagraphGaps(paragraphs: ParagraphSymbols[]): MissingCharacterBox[] {
  const boxes: MissingCharacterBox[] = []

  paragraphs.forEach((paragraph) => {
    if (!paragraph.metrics) return
    const metrics = paragraph.metrics

    const columns = groupVerticalColumns(paragraph.symbols, metrics)
    const firstParagraphSymbol = paragraph.symbols[0]
    columns.forEach((column) => {
      const isParagraphStartColumn =
        !!firstParagraphSymbol && column.symbols.includes(firstParagraphSymbol)

      if (paragraph.paragraphBounds && !isParagraphStartColumn) {
        boxes.push(
          ...createVerticalGapBoxes({
            gapStart: paragraph.paragraphBounds.top,
            gapSize: column.top - paragraph.paragraphBounds.top,
            centerX: column.avgX,
            paragraph,
            reason: 'in_paragraph_gap',
          }),
        )
      }

      for (let i = 0; i < column.symbols.length - 1; i++) {
        const current = column.symbols[i]
        const next = column.symbols[i + 1]
        const gapHeight = next.top - current.bottom

        boxes.push(
          ...createVerticalGapBoxes({
            gapStart: current.bottom,
            gapSize: gapHeight,
            centerX: column.avgX,
            paragraph,
            reason: 'in_paragraph_gap',
          }),
        )
      }

      if (paragraph.paragraphBounds) {
        const lastSymbol = column.symbols[column.symbols.length - 1]
        const shouldSkipLineBreakEndGap =
          lastSymbol?.breakType === 'LINE_BREAK' &&
          !hasVerticalParallelContinuation(paragraphs, paragraph, column, metrics)

        if (!shouldSkipLineBreakEndGap) {
          boxes.push(
            ...createVerticalGapBoxes({
              gapStart: column.bottom,
              gapSize: paragraph.paragraphBounds.bottom - column.bottom,
              centerX: column.avgX,
              paragraph,
              reason: 'in_paragraph_gap',
            }),
          )
        }
      }
    })
  })

  return boxes
}

// 检测横排段落内部每一行中的疑似缺字空隙。
function detectHorizontalInParagraphGaps(paragraphs: ParagraphSymbols[]): MissingCharacterBox[] {
  const boxes: MissingCharacterBox[] = []

  paragraphs.forEach((paragraph) => {
    if (!paragraph.metrics) return
    const metrics = paragraph.metrics

    const rows = groupHorizontalRows(paragraph.symbols, metrics)
    const firstParagraphSymbol = paragraph.symbols[0]
    rows.forEach((row) => {
      const isParagraphStartRow =
        !!firstParagraphSymbol && row.symbols.includes(firstParagraphSymbol)

      if (paragraph.paragraphBounds && !isParagraphStartRow) {
        boxes.push(
          ...createHorizontalGapBoxes({
            gapStart: paragraph.paragraphBounds.left,
            gapSize: row.left - paragraph.paragraphBounds.left,
            centerY: row.avgY,
            paragraph,
            reason: 'in_paragraph_gap',
          }),
        )
      }

      for (let i = 0; i < row.symbols.length - 1; i++) {
        const current = row.symbols[i]
        const next = row.symbols[i + 1]
        const gapWidth = next.left - current.right

        boxes.push(
          ...createHorizontalGapBoxes({
            gapStart: current.right,
            gapSize: gapWidth,
            centerY: row.avgY,
            paragraph,
            reason: 'in_paragraph_gap',
          }),
        )
      }

      if (paragraph.paragraphBounds) {
        const lastSymbol = row.symbols[row.symbols.length - 1]
        const shouldSkipLineBreakEndGap =
          lastSymbol?.breakType === 'LINE_BREAK' &&
          !hasHorizontalParallelContinuation(paragraphs, paragraph, row, metrics)

        if (!shouldSkipLineBreakEndGap) {
          boxes.push(
            ...createHorizontalGapBoxes({
              gapStart: row.right,
              gapSize: paragraph.paragraphBounds.right - row.right,
              centerY: row.avgY,
              paragraph,
              reason: 'in_paragraph_gap',
            }),
          )
        }
      }
    })
  })

  return boxes
}

// 判断竖排列尾后方是否存在同页平行文本延续。
function hasVerticalParallelContinuation(
  paragraphs: ParagraphSymbols[],
  currentParagraph: ParagraphSymbols,
  currentColumn: VerticalColumn,
  metrics: CharacterMetrics,
): boolean {
  return paragraphs.some((paragraph) => {
    if (
      paragraph === currentParagraph ||
      paragraph.pageIndex !== currentParagraph.pageIndex ||
      !paragraph.metrics
    ) {
      return false
    }

    return groupVerticalColumns(paragraph.symbols, paragraph.metrics).some((column) => {
      return (
        Math.abs(column.avgX - currentColumn.avgX) <= metrics.avgWidth &&
        column.top > currentColumn.bottom
      )
    })
  })
}

// 判断横排行尾后方是否存在同页平行文本延续。
function hasHorizontalParallelContinuation(
  paragraphs: ParagraphSymbols[],
  currentParagraph: ParagraphSymbols,
  currentRow: HorizontalRow,
  metrics: CharacterMetrics,
): boolean {
  return paragraphs.some((paragraph) => {
    if (
      paragraph === currentParagraph ||
      paragraph.pageIndex !== currentParagraph.pageIndex ||
      !paragraph.metrics
    ) {
      return false
    }

    return groupHorizontalRows(paragraph.symbols, paragraph.metrics).some((row) => {
      return (
        Math.abs(row.avgY - currentRow.avgY) <= metrics.avgHeight && row.left > currentRow.right
      )
    })
  })
}

// 按X坐标把竖排字符分组成从右到左的列。
function groupVerticalColumns(symbols: SymbolBox[], metrics: CharacterMetrics): VerticalColumn[] {
  const threshold = metrics.avgWidth * GROUP_THRESHOLD_RATIO
  const sortedSymbols = [...symbols].sort((a, b) => {
    const colDiff = Math.abs(a.midX - b.midX)
    if (colDiff > threshold) return b.midX - a.midX
    return a.midY - b.midY
  })

  const columns = groupByRunningAxis(sortedSymbols, threshold, 'midX')

  return columns
    .map((columnSymbols) => {
      const sortedColumnSymbols = [...columnSymbols].sort((a, b) => a.midY - b.midY)
      return {
        avgX: average(sortedColumnSymbols.map((symbol) => symbol.midX)),
        top: Math.min(...sortedColumnSymbols.map((symbol) => symbol.top)),
        bottom: Math.max(...sortedColumnSymbols.map((symbol) => symbol.bottom)),
        symbols: sortedColumnSymbols,
      }
    })
    .sort((a, b) => b.avgX - a.avgX)
}

// 按Y坐标把横排字符分组成从上到下的行。
function groupHorizontalRows(symbols: SymbolBox[], metrics: CharacterMetrics): HorizontalRow[] {
  const threshold = metrics.avgHeight * GROUP_THRESHOLD_RATIO
  const sortedSymbols = [...symbols].sort((a, b) => {
    const rowDiff = Math.abs(a.midY - b.midY)
    if (rowDiff > threshold) return a.midY - b.midY
    return a.midX - b.midX
  })

  const rows = groupByRunningAxis(sortedSymbols, threshold, 'midY')

  return rows
    .map((rowSymbols) => {
      const sortedRowSymbols = [...rowSymbols].sort((a, b) => a.midX - b.midX)
      return {
        avgY: average(sortedRowSymbols.map((symbol) => symbol.midY)),
        left: Math.min(...sortedRowSymbols.map((symbol) => symbol.left)),
        right: Math.max(...sortedRowSymbols.map((symbol) => symbol.right)),
        symbols: sortedRowSymbols,
      }
    })
    .sort((a, b) => a.avgY - b.avgY)
}

// 按给定中心轴和阈值把已排序字符连续分组。
function groupByRunningAxis(
  symbols: SymbolBox[],
  threshold: number,
  axis: 'midX' | 'midY',
): SymbolBox[][] {
  const groups: SymbolBox[][] = []
  let currentGroup: SymbolBox[] = []
  let currentAxis = 0

  symbols.forEach((symbol) => {
    if (currentGroup.length === 0) {
      currentGroup = [symbol]
      currentAxis = symbol[axis]
      return
    }

    if (Math.abs(symbol[axis] - currentAxis) < threshold) {
      currentGroup.push(symbol)
      currentAxis = average(currentGroup.map((item) => item[axis]))
      return
    }

    groups.push(currentGroup)
    currentGroup = [symbol]
    currentAxis = symbol[axis]
  })

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return groups
}

// 根据竖向空隙生成一个或多个缺字红框。
function createVerticalGapBoxes({
  gapStart,
  gapSize,
  centerX,
  paragraph,
  metrics = paragraph.metrics,
  reason,
}: {
  gapStart: number
  gapSize: number
  centerX: number
  paragraph: ParagraphSymbols
  metrics?: CharacterMetrics | null
  reason: MissingCharacterBox['reason']
}): MissingCharacterBox[] {
  if (!metrics || gapSize <= 0) return []

  const count = Math.floor((gapSize * metrics.avgWidth) / metrics.avgArea)
  if (count <= 0) return []

  const totalBoxHeight = count * metrics.avgHeight
  const margin = Math.max(0, (gapSize - totalBoxHeight) / (count + 1))

  return Array.from({ length: count }, (_, index) => ({
    x: centerX - metrics.avgWidth / 2,
    y: gapStart + margin + index * (metrics.avgHeight + margin),
    width: metrics.avgWidth,
    height: metrics.avgHeight,
    midX: centerX,
    midY: gapStart + margin + index * (metrics.avgHeight + margin) + metrics.avgHeight / 2,
    pageIndex: paragraph.pageIndex,
    blockIndex: paragraph.blockIndex,
    paragraphIndex: paragraph.paragraphIndex,
    text: '🔴',
    isMissingPlaceholder: true,
    reason,
  }))
}

// 根据横向空隙生成一个或多个缺字红框。
function createHorizontalGapBoxes({
  gapStart,
  gapSize,
  centerY,
  paragraph,
  metrics = paragraph.metrics,
  reason,
}: {
  gapStart: number
  gapSize: number
  centerY: number
  paragraph: ParagraphSymbols
  metrics?: CharacterMetrics | null
  reason: MissingCharacterBox['reason']
}): MissingCharacterBox[] {
  if (!metrics || gapSize <= 0) return []

  const count = Math.floor((gapSize * metrics.avgHeight) / metrics.avgArea)
  if (count <= 0) return []

  const totalBoxWidth = count * metrics.avgWidth
  const margin = Math.max(0, (gapSize - totalBoxWidth) / (count + 1))

  return Array.from({ length: count }, (_, index) => ({
    x: gapStart + margin + index * (metrics.avgWidth + margin),
    y: centerY - metrics.avgHeight / 2,
    width: metrics.avgWidth,
    height: metrics.avgHeight,
    midX: gapStart + margin + index * (metrics.avgWidth + margin) + metrics.avgWidth / 2,
    midY: centerY,
    pageIndex: paragraph.pageIndex,
    blockIndex: paragraph.blockIndex,
    paragraphIndex: paragraph.paragraphIndex,
    text: '🔴',
    isMissingPlaceholder: true,
    reason,
  }))
}

// 过滤掉和已有字符坐标重叠过高的候选红框。
function filterBoxesOverlappingSymbols(
  boxes: MissingCharacterBox[],
  symbols: SymbolBox[],
): MissingCharacterBox[] {
  return boxes.filter((box) => {
    const boxArea = box.width * box.height
    if (boxArea <= 0) return false

    const maxOverlapRatio = Math.max(
      0,
      ...symbols.map((symbol) => calculateOverlapArea(toBounds(box), symbol) / boxArea),
    )

    return maxOverlapRatio < MAX_SYMBOL_OVERLAP_RATIO
  })
}

// 计算两个矩形边界框的重叠面积。
function calculateOverlapArea(first: Bounds, second: Bounds): number {
  const overlapWidth = Math.max(
    0,
    Math.min(first.right, second.right) - Math.max(first.left, second.left),
  )
  const overlapHeight = Math.max(
    0,
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
  )
  return overlapWidth * overlapHeight
}

// 将缺字红框转换为通用边界框结构。
function toBounds(box: MissingCharacterBox): Bounds {
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    left: box.x,
    right: box.x + box.width,
    top: box.y,
    bottom: box.y + box.height,
  }
}

// 根据Google Vision顶点数组计算矩形边界框。
function boundsFromVertices(vertices: Vertex[] | undefined): Bounds | null {
  if (!vertices || vertices.length === 0) return null

  const xs = vertices.map((vertex) => vertex?.x).filter(isFiniteNumber)
  const ys = vertices.map((vertex) => vertex?.y).filter(isFiniteNumber)
  if (xs.length === 0 || ys.length === 0) return null

  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    left,
    right,
    top,
    bottom,
  }
}

// 判断文本是否全部由标点、符号或空白组成。
function isPunctuation(text: string): boolean {
  return /^[\p{P}\p{S}\s]+$/u.test(text)
}

// 计算有限数字数组的平均值。
function average(values: number[]): number {
  const validValues = values.filter(isFiniteNumber)
  if (validValues.length === 0) return 0
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length
}

// 判断输入是否为有限数字。
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
