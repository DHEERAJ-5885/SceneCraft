import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Export any DOM node to PDF with multi-page support.
 * Keeps dark UI visible by forcing backgroundColor.
 */
export async function exportNodeToPdf(node, fileName = "SceneCraft_Report.pdf") {
  if (!node) throw new Error("exportNodeToPdf: node is null");

  // ✅ Give browser a moment to paint everything (important)
  await new Promise((r) => setTimeout(r, 150));

  // ✅ Capture full node at high resolution
  const canvas = await html2canvas(node, {
    scale: 2.5, // crisp text
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#0f0f0f", // 🔥 IMPORTANT: keeps white text visible
    logging: false,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
    scrollX: 0,
    scrollY: -window.scrollY, // avoids weird offsets
  });

  const imgData = canvas.toDataURL("image/png", 1.0);

  // PDF settings (A4)
  const pdf = new jsPDF("p", "mm", "a4");

  const pdfWidth = pdf.internal.pageSize.getWidth();  // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  // Canvas -> PDF scaling
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Multi-page slicing
  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
  heightLeft -= pdfHeight;

  // Add extra pages if needed
  while (heightLeft > 2) {
    pdf.addPage();
    position = heightLeft - imgHeight; // negative shift to show next part
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;
  }

  pdf.save(fileName);
}
