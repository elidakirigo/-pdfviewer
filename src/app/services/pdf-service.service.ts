// pdf-annotation.service.ts
import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

@Injectable({
  providedIn: 'root',
})
export class PdfAnnotationService {
  constructor() {}

  async getPdfAnnotations(pdfUrl: string): Promise<any[]> {
    const annotations: any[] = [];
    const loadingTask = pdfjsLib.getDocument(pdfUrl);

    return loadingTask.promise.then(async (pdf: any) => {
      const numPages = pdf.numPages;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const pageAnnotations = await page.getAnnotations();
        annotations.push(...pageAnnotations);
      }

      return annotations;
    });
  }
}
