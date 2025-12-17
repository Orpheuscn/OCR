/// <reference types="vite/client" />

// Fabric.js 全局类型声明 (通过CDN加载)
declare global {
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
    originX?: string
    originY?: string
    fill?: string
    stroke?: string
    strokeWidth?: number
    set(options: Partial<FabricObject>): void
    setCoords(): void
  }

  interface FabricCanvas {
    width: number
    height: number
    add(object: FabricObject): void
    remove(object: FabricObject): void
    clear(): void
    renderAll(): void
    getObjects(): FabricObject[]
    getPointer(event: Event): { x: number; y: number }
    on(event: string, callback: (options: { e: Event }) => void): void
  }

  interface FabricImage extends FabricObject {
    src: string
  }

  type FabricRect = FabricObject

  const fabric: {
    Canvas: new (element: string | HTMLCanvasElement, options?: {
      width?: number
      height?: number
      backgroundColor?: string
      selection?: boolean
    }) => FabricCanvas
    Object: FabricObject
    Rect: new (options?: Partial<FabricRect>) => FabricRect
    Circle: new (options?: Partial<FabricObject>) => FabricObject
    Line: new (points: number[], options?: Partial<FabricObject>) => FabricObject
    Path: new (path: string, options?: Partial<FabricObject>) => FabricObject
    Text: new (text: string, options?: Partial<FabricObject>) => FabricObject
    Image: {
      fromURL: (url: string, callback: (img: FabricImage) => void, options?: Partial<FabricImage>) => void
    }
    util: {
      loadImage: (url: string, callback: (img: HTMLImageElement | HTMLVideoElement) => void, context?: unknown, crossOrigin?: string) => void
    }
  }
}

export {}
