// OCR 相关类型定义

export interface Vertex {
  x?: number
  y?: number
}

export interface BoundingBox {
  vertices: Vertex[]
}

export interface DetectedBreak {
  type?: string
  isPrefix?: boolean
}

export interface SymbolProperty {
  detectedBreak?: DetectedBreak
}

export interface Symbol {
  text: string
  boundingBox?: BoundingBox
  property?: SymbolProperty
}

export interface Word {
  symbols?: Symbol[]
  boundingBox?: BoundingBox
}

export interface Paragraph {
  words?: Word[]
  boundingBox?: BoundingBox
}

export interface Block {
  paragraphs?: Paragraph[]
  boundingBox?: BoundingBox
}

export interface DetectedLanguage {
  languageCode: string
  confidence?: number
}

export interface PageProperty {
  detectedLanguages?: DetectedLanguage[]
}

export interface Page {
  blocks?: Block[]
  property?: PageProperty
  confidence?: number
}

export interface FullTextAnnotation {
  text?: string
  pages?: Page[]
}

export interface ProcessedSymbol {
  text: string
  isFiltered: boolean
  detectedBreak: DetectedBreak
  midX: number
  midY: number
  width: number
  height: number
  x: number
  y: number
  originalIndex: number
} 