// src/pdfjs.d.ts
declare module 'pdfjs' {
  export function getDocument(url: string | Uint8Array): PDFLoadingTask;

  export interface PDFLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface PDFPageProxy {
    render(params: { canvasContext: CanvasRenderingContext2D; viewport: any }): any;
    getViewport(params: { scale: number }): any; // Add any parameters you need
  }
}
