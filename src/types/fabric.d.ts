declare global {
  interface Window {
    fabric: typeof fabric
  }
}

// Fabric.js 基础类型定义
interface FabricObject {
  left: number
  top: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  type: string
  selectable?: boolean
  evented?: boolean
  set(options: Record<string, unknown>): void
  setCoords(): void
}

interface FabricRect extends FabricObject {
  fill?: string
  stroke?: string
  strokeWidth?: number
  originX?: string
  originY?: string
}

interface FabricImage extends FabricObject {
  originX?: string
  originY?: string
}

interface FabricCanvasOptions {
  width?: number
  height?: number
  backgroundColor?: string
  selection?: boolean
}

interface FabricCanvas {
  width: number
  height: number
  backgroundColor?: string
  selection?: boolean
  defaultCursor?: string
  hoverCursor?: string
  moveCursor?: string
  add(object: FabricObject): void
  remove(object: FabricObject): void
  clear(): void
  renderAll(): void
  dispose(): void
  destroy?(): void
  getObjects(): FabricObject[]
  getPointer(e: Event): { x: number, y: number }
  on(eventName: string, handler: (options?: Record<string, unknown>) => void): void
}

interface FabricRectOptions {
  left?: number
  top?: number
  originX?: string
  originY?: string
  width?: number
  height?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  selectable?: boolean
  evented?: boolean
}

declare const fabric: {
  Canvas: new (element: HTMLCanvasElement, options?: FabricCanvasOptions) => FabricCanvas
  Rect: new (options?: FabricRectOptions) => FabricRect
  Image: {
    fromURL: (url: string, callback: (img: FabricImage) => void) => void
  }
}

export default fabric 