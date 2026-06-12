import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extracts images for each page in a PDF file
 * @param {File} file - The PDF file object
 * @returns {Promise<Array<{id: string, url: string}>>} - Array of page data
 */
export async function extractPdfPages(file) {
  console.log("Reading array buffer for", file.name);
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  console.log("Calling getDocument...");
  const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
  console.log("PDF loaded successfully. Number of pages:", pdf.numPages);
  
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    console.log("Rendering page", i);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    
    // Create a temporary canvas to render the page
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/png');
    
    pages.push({
      id: `slide_${i}`,
      index: i,
      originalUrl: dataUrl,
      // Default storyboard fields
      textBlocks: [],
      cleanBackgroundUrl: null,
      caption: "",
      audioUrl: null,
      audioDuration: 0,
      status: "pending" // pending -> segmenting -> cleaning -> ready
    });
  }

  return pages;
}
