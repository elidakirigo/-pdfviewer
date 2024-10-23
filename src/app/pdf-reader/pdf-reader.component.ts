import { Component, OnInit, ElementRef } from '@angular/core';
import * as pdfjs from 'pdfjs';
import LeaderLine from 'leader-line';

@Component({
  selector: 'app-pdf-annotations',
  templateUrl: './pdf-reader.component.html',
  styleUrls: ['./pdf-reader.component.scss'],
})
export class PdfReaderComponent implements OnInit {
  annotations: any[] = [];
  pdfUrl: string = './assets/examples/2TOUR_rx.pdf'; // Your PDF file

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.loadPdf();
  }

  // Method to load and render the PDF
  loadPdf(): void {
    const loadingTask = getDocument(this.pdfUrl);

    // Ensure 'promise' is correctly referenced from PDFLoadingTask
    loadingTask.promise
      .then((pdf: PDFDocumentProxy) => {
        this.pdfDoc = pdf;
        this.renderPage(1); // Render the first page
      })
      .catch((error) => {
        console.error('Error loading PDF:', error);
      });
  }

  // Method to render a single page and its annotations
  renderPage(page: any, pageNum: number): void {
    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    // Render the PDF page onto the canvas
    page.render(renderContext).promise.then(() => {
      // Extract annotations from the page and add them to the comment section
      page.getAnnotations().then((annotations: any[]) => {
        annotations.forEach((annotation) => {
          if (annotation.contents) {
            this.annotations.push({
              id: annotation.id,
              contents: annotation.contents,
              pageIndex: pageNum - 1,
              rect: annotation.rect, // Annotation rectangle position on the page
            });

            // Add annotation marker to the rendered page
            this.addAnnotationMarker(annotation, viewport);
          }
        });
      });
    });

    // Append the canvas to your PDF container in the HTML
    const pdfContainer = document.getElementById('pdf-container');
    pdfContainer?.appendChild(canvas);
  }

  // Method to add a visual marker to an annotation on the PDF
  addAnnotationMarker(annotation: any, viewport: any): void {
    const annotationElement = document.createElement('div');
    annotationElement.id = `annotation-${annotation.id}`;
    annotationElement.style.position = 'absolute';

    // Transform annotation rectangle coordinates to viewport coordinates
    const [left, bottom, right, top] = viewport.convertToViewportRectangle(
      annotation.rect
    );
    annotationElement.style.left = `${left}px`;
    annotationElement.style.top = `${top}px`;
    annotationElement.style.width = `${right - left}px`;
    annotationElement.style.height = `${bottom - top}px`;

    // Add border to highlight the annotation area
    annotationElement.style.border = '2px solid red';

    // Append the annotation marker to the PDF container
    const pdfContainer = document.getElementById('pdf-container');
    pdfContainer?.appendChild(annotationElement);
  }

  // When a comment is clicked, connect the comment with the corresponding PDF annotation
  onCommentClick(annotation: any): void {
    const annotationElement = this.getAnnotationElement(annotation);

    if (annotationElement) {
      annotationElement.scrollIntoView({ behavior: 'smooth' });

      // Connect the comment and the annotation with a leader line
      const commentElement = this.elementRef.nativeElement.querySelector(
        `#comment-${annotation.id}`
      );
      if (commentElement) {
        new LeaderLine(commentElement, annotationElement, {
          color: 'blue',
          size: 2,
          startSocket: 'right',
          endSocket: 'left',
        });
      }
    }
  }

  getAnnotationElement(annotation: any): HTMLElement | null {
    // Locate the annotation element within the rendered PDF
    return document.querySelector(`#annotation-${annotation.id}`);
  }
}
