import { jsPDF } from "jspdf";

function slug(s) {
  return s.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
}

/** Export a single topic (concept / example / common mistakes) as a PDF. */
export function exportTopicPDF(topic, subjectName) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`${topic.ref} \u00b7 ${topic.title}`, margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${subjectName} \u00b7 ${topic.strand}${topic.tier === "Higher" ? " \u00b7 Higher only" : ""}`, margin, y);
  y += 24;

  doc.setTextColor(20);
  doc.setFontSize(11);

  const addBlock = (label, text) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.splitTextToSize(text, pageW - margin * 2).forEach((line) => {
      doc.text(line, margin, y);
      y += 14;
    });
    y += 12;
  };

  addBlock("Concept", topic.concept);
  addBlock("Example", topic.example);
  addBlock("Common mistakes", topic.mistakes);

  doc.save(`${slug(topic.ref)}-${slug(topic.title)}.pdf`);
}

/** Export a saved note as a PDF. */
export function exportNotePDF(note, subjectName) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(note.title || "Untitled note", margin, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${subjectName} \u00b7 ${note.date || ""}`, margin, y);
  y += 22;

  doc.setTextColor(20);
  doc.setFontSize(11);
  doc.splitTextToSize(note.text || "", pageW - margin * 2).forEach((line) => {
    if (y > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 15;
  });

  doc.save(`${slug(note.title || "note")}.pdf`);
}

/** Export a printable practice paper (questions + optional mark scheme, no answers filled in). */
export function exportPracticePaperPDF(subjectName, questions, { revealAnswers = true } = {}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  function checkPage(extra) {
    if (y + (extra || 0) > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`AQA ${subjectName} \u00b7 Practice Paper`, margin, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Total marks: ${totalMarks} \u00b7 Name: ______________________`, margin, y);
  y += 26;
  doc.setTextColor(20);

  questions.forEach((q, i) => {
    checkPage(50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${i + 1}.  [${q.ref} \u00b7 ${q.marks} mark${q.marks > 1 ? "s" : ""}]`, margin, y);
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.splitTextToSize(q.q, pageW - margin * 2).forEach((line) => {
      checkPage(14);
      doc.text(line, margin, y);
      y += 14;
    });
    y += 14 * 3; // answer lines
    doc.setDrawColor(200);
    for (let l = 0; l < 3; l++) {
      doc.line(margin, y - 14 * (3 - l) + 10, pageW - margin, y - 14 * (3 - l) + 10);
    }
    y += 8;
  });

  if (revealAnswers) {
    doc.addPage();
    y = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Mark scheme", margin, y);
    y += 20;
    questions.forEach((q, i) => {
      checkPage(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(`${i + 1}. [${q.ref}]`, margin, y);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.splitTextToSize(q.model, pageW - margin * 2).forEach((line) => {
        checkPage(12);
        doc.text(line, margin, y);
        y += 12;
      });
      y += 8;
    });
  }

  doc.save(`${slug(subjectName)}-practice-paper.pdf`);
}

/** Export a completed mock's questions, answers and mark scheme as a PDF report. */
export function exportMockPDF(subjectName, result) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = result.reduce((s, r) => s + r.awarded, 0);
  const max = result.reduce((s, r) => s + r.marks, 0);

  function checkPage(extra) {
    if (y + (extra || 0) > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`${subjectName} mock report`, margin, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`Score: ${total}/${max} (${max ? Math.round((100 * total) / max) : 0}%) \u00b7 ${new Date().toLocaleDateString("en-GB")}`, margin, y);
  y += 22;
  doc.setTextColor(20);

  result.forEach((r, i) => {
    checkPage(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(`Q${i + 1}  [${r.ref} \u00b7 ${r.awarded}/${r.marks}]`, margin, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.splitTextToSize(r.q, pageW - margin * 2).forEach((line) => {
      checkPage(13);
      doc.text(line, margin, y);
      y += 13;
    });

    doc.setTextColor(100);
    checkPage(13);
    doc.text(`Your answer: ${r.given || "\u2014"}`, margin, y);
    y += 13;

    doc.setTextColor(60, 120, 60);
    doc.splitTextToSize(`Model: ${r.model}`, pageW - margin * 2).forEach((line) => {
      checkPage(12);
      doc.text(line, margin, y);
      y += 12;
    });
    doc.setTextColor(20);
    y += 10;
  });

  doc.save(`${slug(subjectName)}-mock-report.pdf`);
}
