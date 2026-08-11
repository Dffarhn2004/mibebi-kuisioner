import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function safe(value, fallback = "—") {
  if (value == null || value === "") return fallback;
  return String(value);
}

function wrapAddText(doc, text, x, y, maxWidth, lineHeight = 5) {
  const lines = doc.splitTextToSize(safe(text), maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

/**
 * Olah hasil analisis AI menjadi PDF dan trigger download di browser.
 */
export function downloadAnalysisPdf({
  restoName,
  ownerName,
  city,
  whatsapp,
  yesCount,
  totalQuestions,
  analysis,
  createdAt,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (needed = 24) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  };

  const addTitle = (text, size = 13) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(17, 17, 17);
    doc.text(text, margin, y);
    y += size * 0.45 + 3;
  };

  const addBody = (text) => {
    ensureSpace(10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    y = wrapAddText(doc, text, margin, y, maxWidth, 5);
    y += 3;
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(216, 48, 40);
  doc.text("Mibebi", margin, y);
  y += 8;

  doc.setFontSize(14);
  doc.setTextColor(17, 17, 17);
  doc.text("Laporan Business Health Check", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  y = wrapAddText(
    doc,
    `Resto: ${safe(restoName)} | PIC: ${safe(ownerName)} | WA: ${safe(whatsapp)} | Kota: ${safe(city, "-")}`,
    margin,
    y,
    maxWidth,
    4.5,
  );
  y = wrapAddText(
    doc,
    `YA: ${yesCount ?? 0}/${totalQuestions ?? 33} | Dibuat: ${
      createdAt ? new Date(createdAt).toLocaleString("id-ID") : new Date().toLocaleString("id-ID")
    }`,
    margin,
    y,
    maxWidth,
    4.5,
  );
  y += 4;

  if (analysis?.summary) {
    addTitle("Ringkasan");
    addBody(analysis.summary);
  }

  if (analysis?.pitch) {
    addTitle("Pesan Utama");
    addBody(analysis.pitch);
  }

  if (Array.isArray(analysis?.pain_clusters) && analysis.pain_clusters.length) {
    addTitle("Peluang & Tantangan");
    autoTable(doc, {
      startY: y,
      head: [["Area", "Ringkasan"]],
      body: analysis.pain_clusters.map((item) => [
        safe(item.label || item.section),
        safe(item.summary),
      ]),
      styles: { fontSize: 9, cellPadding: 2.5, textColor: [55, 65, 81] },
      headStyles: { fillColor: [216, 48, 40], textColor: 255 },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (Array.isArray(analysis?.recommendations) && analysis.recommendations.length) {
    addTitle("Rekomendasi Fitur Mibebi");
    autoTable(doc, {
      startY: y,
      head: [["Masalah", "Fitur", "Prioritas", "Penjelasan"]],
      body: analysis.recommendations.map((item) => [
        safe(item.problem),
        Array.isArray(item.features) ? item.features.join(", ") : safe(item.features),
        safe(item.priority, "medium"),
        safe(item.explanation),
      ]),
      styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [55, 65, 81] },
      headStyles: { fillColor: [216, 48, 40], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 35 },
        2: { cellWidth: 20 },
        3: { cellWidth: "auto" },
      },
      margin: { left: margin, right: margin },
    });
  }

  const filename = `mibebi-health-check-${safe(restoName, "resto")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)}.pdf`;

  doc.save(filename);
  return filename;
}
