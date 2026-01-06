import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useOcrStore } from './ocrStore'

// 符号数据接口
interface SymbolData {
  text: string
  x: number
  y: number
  width: number
  height: number
  blockIdx: number
  paraIdx: number
  wordIdx: number
  symIdx: number
}

// 区块边界接口
interface BlockBoundary {
  points: string
  label: string
  text: string
  tooltip: string
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export const useCoordinateStore = defineStore('coordinate', () => {
  const ocrStore = useOcrStore()
  
  // 图片尺寸
  const imageDimensions = ref({ width: 0, height: 0 })
  
  // 是否有 OCR 结果
  const hasOcrResult = computed(() => {
    return ocrStore.result?.fullTextAnnotation?.pages && 
           ocrStore.result.fullTextAnnotation.pages.length > 0
  })
  
  // 提取符号数据
  const symbolsData = computed((): SymbolData[] => {
    if (!hasOcrResult.value) return []
    
    const symbols: SymbolData[] = []
    const pages = ocrStore.result?.fullTextAnnotation?.pages || []
    
    pages.forEach((page: any) => {
      page.blocks?.forEach((block: any, blockIdx: number) => {
        block.paragraphs?.forEach((para: any, paraIdx: number) => {
          para.words?.forEach((word: any, wordIdx: number) => {
            word.symbols?.forEach((symbol: any, symIdx: number) => {
              const vertices = symbol.boundingBox?.vertices || []
              if (vertices.length >= 4) {
                const xs = vertices.map((v: any) => v.x || 0)
                const ys = vertices.map((v: any) => v.y || 0)
                const minX = Math.min(...xs)
                const minY = Math.min(...ys)
                const maxX = Math.max(...xs)
                const maxY = Math.max(...ys)
                
                symbols.push({
                  text: symbol.text || '',
                  x: minX,
                  y: minY,
                  width: maxX - minX,
                  height: maxY - minY,
                  blockIdx,
                  paraIdx,
                  wordIdx,
                  symIdx
                })
              }
            })
          })
        })
      })
    })
    
    return symbols
  })
  
  // 提取区块边界
  const getBlockBoundaries = (level: 'blocks' | 'paragraphs' | 'words' | 'symbols'): BlockBoundary[] => {
    if (!hasOcrResult.value) return []
    
    const boundaries: BlockBoundary[] = []
    const pages = ocrStore.result?.fullTextAnnotation?.pages || []
    
    const addBoundary = (vertices: any[], label: string, text: string = '') => {
      if (!vertices || vertices.length < 3) return
      
      const points = vertices.map(v => `${v?.x ?? 0},${v?.y ?? 0}`).join(' ')
      const xs = vertices.map(v => v?.x ?? 0)
      const ys = vertices.map(v => v?.y ?? 0)
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      const maxX = Math.max(...xs)
      const maxY = Math.max(...ys)
      
      boundaries.push({
        points,
        label,
        text,
        tooltip: `${label}\n${text}`,
        minX,
        minY,
        maxX,
        maxY
      })
    }
    
    pages.forEach((page: any) => {
      page.blocks?.forEach((block: any, blockIdx: number) => {
        if (level === 'blocks') {
          const text = block.paragraphs?.map((p: any) => 
            p.words?.map((w: any) => 
              w.symbols?.map((s: any) => s.text || '').join('')
            ).join(' ')
          ).join('\n') || ''
          addBoundary(block.boundingBox?.vertices, `Block ${blockIdx}`, text)
        } else {
          block.paragraphs?.forEach((para: any, paraIdx: number) => {
            if (level === 'paragraphs') {
              const text = para.words?.map((w: any) => 
                w.symbols?.map((s: any) => s.text || '').join('')
              ).join(' ') || ''
              addBoundary(para.boundingBox?.vertices, `Para ${blockIdx}-${paraIdx}`, text)
            } else {
              para.words?.forEach((word: any, wordIdx: number) => {
                if (level === 'words') {
                  const text = word.symbols?.map((s: any) => s.text || '').join('') || ''
                  addBoundary(word.boundingBox?.vertices, `Word ${blockIdx}-${paraIdx}-${wordIdx}`, text)
                } else if (level === 'symbols') {
                  word.symbols?.forEach((symbol: any, symIdx: number) => {
                    addBoundary(symbol.boundingBox?.vertices, `Sym ${blockIdx}-${paraIdx}-${wordIdx}-${symIdx}`, symbol.text || '')
                  })
                }
              })
            }
          })
        }
      })
    })
    
    return boundaries
  }
  
  // 根据索引和级别获取文本
  const getTextByLevel = (
    blockIdx: number, 
    paraIdx: number, 
    wordIdx: number, 
    symIdx: number, 
    level: 'blocks' | 'paragraphs' | 'words' | 'symbols'
  ): string => {
    if (!hasOcrResult.value) return ''
    
    const pages = ocrStore.result?.fullTextAnnotation?.pages || []
    
    for (const page of pages) {
      const block = page.blocks?.[blockIdx]
      if (!block) continue
      
      if (level === 'blocks') {
        // 返回整个区块的文本
        return block.paragraphs?.map((p: any) => 
          p.words?.map((w: any) => 
            w.symbols?.map((s: any) => s.text || '').join('')
          ).join(' ')
        ).join('\n') || ''
      }
      
      const para = block.paragraphs?.[paraIdx]
      if (!para) continue
      
      if (level === 'paragraphs') {
        // 返回整个段落的文本
        return para.words?.map((w: any) => 
          w.symbols?.map((s: any) => s.text || '').join('')
        ).join(' ') || ''
      }
      
      const word = para.words?.[wordIdx]
      if (!word) continue
      
      if (level === 'words') {
        // 返回整个单词的文本
        return word.symbols?.map((s: any) => s.text || '').join('') || ''
      }
      
      // level === 'symbols'
      const symbol = word.symbols?.[symIdx]
      return symbol?.text || ''
    }
    
    return ''
  }
  
  // 设置图片尺寸
  const setImageDimensions = (width: number, height: number) => {
    imageDimensions.value = { width, height }
  }
  
  return {
    imageDimensions,
    hasOcrResult,
    symbolsData,
    getBlockBoundaries,
    getTextByLevel,
    setImageDimensions
  }
})

