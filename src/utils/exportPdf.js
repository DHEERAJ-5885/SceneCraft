/* =========================================================
   utils/exportPdf.js  ✅ REPLACE FULL FILE WITH THIS
========================================================= */
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Export any DOM node to PDF with true multi-page slicing.
 * Fixes:
 * - "cut in middle" / missing strips / clipped cards
 * - last page stretching
 * - seam lines by adding overlap + background fill
 */
export async function exportNodeToPdf(node, fileName = "SceneCraft_Report.pdf") {
  if (!node) throw new Error("exportNodeToPdf: node is null");

  // Give browser time to paint/layout
  await new Promise((r) => setTimeout(r, 250));

  // Capture full node at high resolution
  const canvas = await html2canvas(node, {
    scale: 2, // stable + sharp
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#0f0f0f",
    logging: false,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
    scrollX: 0,
    scrollY: -window.scrollY,
  });

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // If fits one page
  if (imgHeight <= pdfHeight) {
    const imgData = canvas.toDataURL("image/png", 1.0);
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
    pdf.save(fileName);
    return;
  }

  // ✅ True slicing with overlap
  const pageCanvas = document.createElement("canvas");
  const pageCtx = pageCanvas.getContext("2d");

  // Page height in canvas pixels:
  const pageHeightPx = Math.floor((pdfHeight * canvas.width) / pdfWidth);

  pageCanvas.width = canvas.width;

  // overlap fixes “card cut in middle” seams
  const overlapPx = 6;

  let y = 0;
  let pageIndex = 0;

  while (y < canvas.height) {
    const remaining = canvas.height - y;
    const sliceHeightPx = Math.min(pageHeightPx, remaining);

    pageCanvas.height = sliceHeightPx;

    // Fill background (prevents transparent strips)
    pageCtx.fillStyle = "#0f0f0f";
    pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

    // Draw slice
    pageCtx.drawImage(canvas, 0, y, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    const imgData = pageCanvas.toDataURL("image/png", 1.0);

    if (pageIndex > 0) pdf.addPage();

    // Slice height in PDF units
    const sliceHeightMm = (sliceHeightPx * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, sliceHeightMm, undefined, "FAST");

    // break on last page
    if (remaining <= pageHeightPx) break;

    // move down but keep overlap
    y += pageHeightPx - overlapPx;
    pageIndex += 1;
  }

  pdf.save(fileName);
}
