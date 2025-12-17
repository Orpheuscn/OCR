/**
 * PDF转换工具
 * 使用 pdfjs-dist 渲染真实的PDF内容
 */

import * as pdfjsLib from 'pdfjs-dist'

// 设置worker路径
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

/**
 * PDF文档信息接口
 */
export interface PdfDocumentInfo {
  totalPages: number
  currentPage: number
  document: pdfjsLib.PDFDocumentProxy
}

/**
 * PDF页面渲染结果接口
 */
export interface PdfPageResult {
  imageFile: File
  pageNumber: number
  totalPages: number
}

/**
 * 加载PDF文档
 * @param file PDF文件
 * @returns PDF文档信息
 */
export async function loadPdfDocument(file: File): Promise<PdfDocumentInfo> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    return {
      totalPages: pdf.numPages,
      currentPage: 1,
      document: pdf
    }
  } catch (error) {
    console.error('PDF加载失败:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    throw new Error(`PDF文件加载失败: ${errorMessage}`)
  }
}

/**
 * 渲染PDF页面为图片
 * @param pdfDoc PDF文档信息
 * @param pageNumber 页码（从1开始）
 * @param scale 缩放比例，默认2.0（高清）
 * @returns 渲染后的图片文件
 */
export async function renderPdfPage(
  pdfDoc: PdfDocumentInfo,
  pageNumber: number,
  scale: number = 2.0
): Promise<PdfPageResult> {
  try {
    if (pageNumber < 1 || pageNumber > pdfDoc.totalPages) {
      throw new Error(`页码超出范围: ${pageNumber}，总页数: ${pdfDoc.totalPages}`)
    }

    // 获取指定页面
    const page = await pdfDoc.document.getPage(pageNumber)

    // 计算视口
    const viewport = page.getViewport({ scale })

    // 创建canvas
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('无法创建Canvas上下文')
    }

    canvas.height = viewport.height
    canvas.width = viewport.width

    // 渲染页面到canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }

    await page.render(renderContext).promise

    // 将canvas转换为Blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas转换为Blob失败'))
        }
      }, 'image/png', 1.0)
    })

    // 创建File对象
    const imageFile = new File([blob], `pdf-page-${pageNumber}.png`, {
      type: 'image/png',
      lastModified: Date.now()
    })

    return {
      imageFile,
      pageNumber,
      totalPages: pdfDoc.totalPages
    }
  } catch (error) {
    console.error(`PDF第${pageNumber}页渲染失败:`, error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    throw new Error(`PDF页面渲染失败: ${errorMessage}`)
  }
}

/**
 * PDF处理管理器类
 * 管理PDF文档的加载和页面渲染
 */
export class PdfProcessor {
  private pdfDoc: PdfDocumentInfo | null = null
  private scale: number = 2.0

  constructor(scale: number = 2.0) {
    this.scale = scale
  }

  /**
   * 加载PDF文件
   * @param file PDF文件
   */
  async loadPdf(file: File): Promise<PdfDocumentInfo> {
    this.pdfDoc = await loadPdfDocument(file)
    return this.pdfDoc
  }

  /**
   * 渲染指定页面
   * @param pageNumber 页码
   */
  async renderPage(pageNumber: number): Promise<PdfPageResult> {
    if (!this.pdfDoc) {
      throw new Error('PDF文档未加载')
    }

    return await renderPdfPage(this.pdfDoc, pageNumber, this.scale)
  }

  /**
   * 渲染第一页
   */
  async renderFirstPage(): Promise<PdfPageResult> {
    return await this.renderPage(1)
  }

  /**
   * 渲染下一页
   */
  async renderNextPage(): Promise<PdfPageResult | null> {
    if (!this.pdfDoc) {
      throw new Error('PDF文档未加载')
    }

    if (this.pdfDoc.currentPage < this.pdfDoc.totalPages) {
      this.pdfDoc.currentPage++
      return await this.renderPage(this.pdfDoc.currentPage)
    }

    return null // 已经是最后一页
  }

  /**
   * 渲染上一页
   */
  async renderPreviousPage(): Promise<PdfPageResult | null> {
    if (!this.pdfDoc) {
      throw new Error('PDF文档未加载')
    }

    if (this.pdfDoc.currentPage > 1) {
      this.pdfDoc.currentPage--
      return await this.renderPage(this.pdfDoc.currentPage)
    }

    return null // 已经是第一页
  }

  /**
   * 获取当前页码信息
   */
  getCurrentPageInfo(): { currentPage: number; totalPages: number } | null {
    if (!this.pdfDoc) {
      return null
    }

    return {
      currentPage: this.pdfDoc.currentPage,
      totalPages: this.pdfDoc.totalPages
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.pdfDoc?.document) {
      this.pdfDoc.document.destroy()
      this.pdfDoc = null
    }
  }
}

/**
 * 简单的PDF转图片函数
 * @param file PDF文件
 * @param pageNumber 页码，默认第1页
 * @param scale 缩放比例，默认2.0
 * @returns 渲染后的图片文件
 */
export async function convertPdfToImage(
  file: File,
  pageNumber: number = 1,
  scale: number = 2.0
): Promise<PdfPageResult> {
  const pdfDoc = await loadPdfDocument(file)
  return await renderPdfPage(pdfDoc, pageNumber, scale)
}
