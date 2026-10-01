import { PDFDocument } from "pdf-lib";

/**
 * Parses page range string like "1-3, 5, 8-10" and calculates the count of pages
 */
export function calculateEffectivePages(range: string, totalPages: number): number {
  if (!range || range.trim().toLowerCase() === "all") {
    return Math.max(1, totalPages);
  }

  const pagesSet = new Set<number>();
  const parts = range.split(",");

  for (const part of parts) {
    const clean = part.trim();
    if (!clean) continue;

    if (clean.includes("-")) {
      const [startStr, endStr] = clean.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
        for (let i = start; i <= Math.min(end, totalPages); i++) {
          pagesSet.add(i);
        }
      }
    } else {
      const pageNum = parseInt(clean, 10);
      if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
        pagesSet.add(pageNum);
      }
    }
  }

  return pagesSet.size > 0 ? pagesSet.size : totalPages;
}

/**
 * Detects the page count of an uploaded file.
 * - PDF: uses pdf-lib client-side
 * - Image: 1 page
 * - Word/PowerPoint: defaults to 1 with manual override indicator
 */
export async function detectFilePageCount(file: File): Promise<{ pages: number; canAutoDetect: boolean }> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "pdf") {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pages = pdfDoc.getPageCount();
      return { pages: Math.max(1, pages), canAutoDetect: true };
    } catch (err) {
      console.warn("Could not parse PDF pages client-side:", err);
      return { pages: 1, canAutoDetect: false };
    }
  }

  if (["jpg", "jpeg", "png", "webp", "bmp"].includes(extension || "")) {
    return { pages: 1, canAutoDetect: true };
  }

  // Office documents (DOCX, PPTX)
  return { pages: 1, canAutoDetect: false };
}
