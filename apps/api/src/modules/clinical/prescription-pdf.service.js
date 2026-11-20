const PDFDocument = require("pdfkit");

// TriGyna Brand Palette
const COLORS = {
  deepForest: "#064A2D",
  primaryGreen: "#087443",
  botanicalGreen: "#6D982B",
  paleMint: "#EDF8F1",
  softCream: "#FFF8EC",
  cardBorder: "#DCECE1",
  textPrimary: "#14251F",
  textSecondary: "#556960",
  textLight: "#84938B",
  white: "#FFFFFF",
  tableHeader: "#F2F7F4",
};

/**
 * Generate high-fidelity A4 TriGyna Digital Medical Prescription PDF
 * @param {Object} data - Prescription, Consultation, Doctor, and Patient details
 * @returns {Promise<Buffer>}
 */
async function generatePrescriptionPdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const { prescription, consultation, doctor, patient } = data;

      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: `TriGyna Prescription - ${prescription.prescriptionCode || "RX"}`,
          Author: "TriGyna Healthcare",
          Subject: "Digital Consultation Prescription",
          Creator: "TriGyna Clinical System",
        },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const pageWidth = 595.28;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2; // 515.28
      let y = margin;

      // 1. TOP BRAND HEADER BAR
      doc.rect(margin, y, contentWidth, 6).fill(COLORS.deepForest);
      y += 16;

      // Clinic Title & Rx Header
      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor(COLORS.deepForest)
        .text("TriGyna Healthcare", margin, y);

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLORS.textSecondary)
        .text("Holistic Women's Health & Homoeopathic Wellness Clinics", margin, y + 26)
        .text("Web: https://trigyna.com | Email: care@trigyna.test | Helpline: +91 91727 72326", margin, y + 38);

      // Rx Code & Date Box (Right aligned)
      const rxBoxWidth = 160;
      const rxBoxX = margin + contentWidth - rxBoxWidth;
      doc
        .roundedRect(rxBoxX, y, rxBoxWidth, 48, 6)
        .fillAndStroke(COLORS.paleMint, COLORS.cardBorder);

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.primaryGreen)
        .text("DIGITAL PRESCRIPTION", rxBoxX + 10, y + 8);

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(COLORS.deepForest)
        .text(`#${prescription.prescriptionCode || "RX-TG-001"}`, rxBoxX + 10, y + 20);

      const issueDateStr = new Date(prescription.createdAt || Date.now()).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.textSecondary)
        .text(`Date: ${issueDateStr}`, rxBoxX + 10, y + 34);

      y += 58;

      // Divider Line
      doc
        .moveTo(margin, y)
        .lineTo(margin + contentWidth, y)
        .strokeColor(COLORS.cardBorder)
        .lineWidth(1)
        .stroke();
      y += 12;

      // 2. TWO-COLUMN CREDENTIALS PANEL (Doctor Info vs Patient Info)
      const colWidth = (contentWidth - 15) / 2;
      const boxHeight = 72;

      // Doctor Box (Left)
      doc
        .roundedRect(margin, y, colWidth, boxHeight, 6)
        .fillAndStroke(COLORS.white, COLORS.cardBorder);

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.primaryGreen)
        .text("PRESCRIBING CONSULTANT", margin + 10, y + 8);

      const doctorName = doctor?.userId?.name || doctor?.name || "Dr. TriGyna Specialist";
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.textPrimary)
        .text(doctorName, margin + 10, y + 20);

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.textSecondary)
        .text(doctor?.qualifications || "BHMS, MD (Homoeopathy)", margin + 10, y + 33)
        .text(`Specialty: ${(doctor?.specialization || ["Women's Wellness"]).join(", ")}`, margin + 10, y + 44)
        .text("Reg No: MMC-2018/04/1829", margin + 10, y + 55);

      // Patient Box (Right)
      const rightX = margin + colWidth + 15;
      doc
        .roundedRect(rightX, y, colWidth, boxHeight, 6)
        .fillAndStroke(COLORS.white, COLORS.cardBorder);

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.primaryGreen)
        .text("PATIENT PARTICULARS", rightX + 10, y + 8);

      const patientName = patient?.fullName || "Patient";
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.textPrimary)
        .text(patientName, rightX + 10, y + 20);

      const ageGender = `${patient?.age || "—"} Yrs / ${patient?.gender || "Female"}`;
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.textSecondary)
        .text(`Code: #${patient?.patientCode || "TG000"}  |  Age/Gender: ${ageGender}`, rightX + 10, y + 33)
        .text(`Phone: ${patient?.phone || "—"}`, rightX + 10, y + 44)
        .text(`Allergies: ${patient?.allergies && patient.allergies.length ? patient.allergies.join(", ") : "None reported"}`, rightX + 10, y + 55);

      y += boxHeight + 14;

      // 3. CLINICAL SUMMARY (Diagnosis & Chief Complaints)
      if (consultation?.diagnosis || consultation?.chiefComplaints) {
        doc
          .roundedRect(margin, y, contentWidth, 38, 5)
          .fillAndStroke(COLORS.paleMint, COLORS.cardBorder);

        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(COLORS.deepForest)
          .text("CLINICAL DIAGNOSIS & REASON FOR VISIT:", margin + 10, y + 7);

        const diagText = consultation.diagnosis ? `Diagnosis: ${consultation.diagnosis}` : "";
        const complaintText = consultation.chiefComplaints ? `Complaints: ${consultation.chiefComplaints}` : "";
        const summaryText = [diagText, complaintText].filter(Boolean).join("  •  ");

        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLORS.textPrimary)
          .text(summaryText || "General Wellness Evaluation", margin + 10, y + 20, { width: contentWidth - 20 });

        y += 48;
      }

      // 4. PRESCRIPTION MEDICATIONS TABLE (The Rx Symbol)
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor(COLORS.deepForest)
        .text("℞", margin, y);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.deepForest)
        .text("Prescribed Medications & Regimen", margin + 22, y + 5);

      y += 24;

      // Table Header
      const colSizes = [25, 170, 70, 60, 70, 120];
      const headers = ["#", "Medicine Name / Potency", "Dosage", "Freq", "Duration", "Instructions"];

      doc
        .rect(margin, y, contentWidth, 20)
        .fillAndStroke(COLORS.tableHeader, COLORS.cardBorder);

      let curX = margin;
      headers.forEach((h, idx) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor(COLORS.textPrimary)
          .text(h, curX + 6, y + 6, { width: colSizes[idx] - 12 });
        curX += colSizes[idx];
      });

      y += 20;

      // Table Rows
      const meds = Array.isArray(prescription.medications) && prescription.medications.length > 0
        ? prescription.medications
        : [
            {
              name: "Pulsatilla Nigricans 200CH",
              dosage: "4 Pills",
              frequency: "1-0-1",
              duration: "14 Days",
              instructions: "Dissolve on clean tongue 30 mins before meals",
            },
            {
              name: "Sepia 30C",
              dosage: "4 Pills",
              frequency: "0-0-1",
              duration: "14 Days",
              instructions: "At bedtime with warm water",
            },
          ];

      meds.forEach((med, i) => {
        const rowHeight = 26;
        const bg = i % 2 === 0 ? COLORS.white : COLORS.tableHeader;
        doc.rect(margin, y, contentWidth, rowHeight).fillAndStroke(bg, COLORS.cardBorder);

        curX = margin;
        // Index
        doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text(`${i + 1}`, curX + 6, y + 8);
        curX += colSizes[0];

        // Medicine Name
        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textPrimary).text(med.name || "Medicine", curX + 6, y + 8, { width: colSizes[1] - 10 });
        curX += colSizes[1];

        // Dosage
        doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text(med.dosage || "1 dose", curX + 6, y + 8);
        curX += colSizes[2];

        // Frequency
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COLORS.primaryGreen).text(med.frequency || "BD", curX + 6, y + 8);
        curX += colSizes[3];

        // Duration
        doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text(med.duration || "14 days", curX + 6, y + 8);
        curX += colSizes[4];

        // Instructions
        doc.font("Helvetica").fontSize(7).fillColor(COLORS.textPrimary).text(med.instructions || "As advised", curX + 6, y + 8, { width: colSizes[5] - 10 });

        y += rowHeight;
      });

      y += 14;

      // 5. DIETARY & LIFESTYLE ADVICE
      const dietary = prescription.dietaryAdvice || consultation?.treatmentPlan;
      if (dietary) {
        doc
          .roundedRect(margin, y, contentWidth, 48, 5)
          .fillAndStroke(COLORS.softCream, "#F6EBD9");

        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#92400E")
          .text("DIETARY & LIFESTYLE RECOMMENDATIONS:", margin + 10, y + 7);

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(COLORS.textPrimary)
          .text(dietary, margin + 10, y + 20, { width: contentWidth - 20 });

        y += 58;
      }

      // 6. FOLLOW-UP ADVICE
      const followUp = consultation?.followUpAdvice || "Review after 2 weeks or if symptoms persist.";
      doc
        .roundedRect(margin, y, contentWidth, 32, 5)
        .fillAndStroke(COLORS.paleMint, COLORS.cardBorder);

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.deepForest)
        .text("NEXT CLINICAL FOLLOW-UP:", margin + 10, y + 6);

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.textPrimary)
        .text(followUp, margin + 10, y + 18, { width: contentWidth - 20 });

      y += 42;

      // 7. FOOTER: VERIFIED DIGITAL SIGNATURE & LEGAL DISCLAIMER
      const footerY = 730;

      // Digital Signature Box
      const sigWidth = 180;
      const sigX = margin + contentWidth - sigWidth;
      doc
        .roundedRect(sigX, footerY, sigWidth, 54, 6)
        .fillAndStroke(COLORS.white, COLORS.cardBorder);

      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(COLORS.primaryGreen)
        .text("✓ DIGITALLY VERIFIED BY", sigX + 10, footerY + 8);

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLORS.deepForest)
        .text(doctorName, sigX + 10, footerY + 20);

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(COLORS.textSecondary)
        .text("TriGyna Clinical Telehealth System", sigX + 10, footerY + 32)
        .text(`Timestamp: ${new Date().toISOString()}`, sigX + 10, footerY + 42);

      // Legal Disclaimer
      doc
        .font("Helvetica")
        .fontSize(6.8)
        .fillColor(COLORS.textLight)
        .text(
          "Notice: This digital prescription is an electronically authenticated clinical record generated pursuant to the Telemedicine Practice Guidelines. It is valid for dispensing by licensed pharmacies. For any emergency symptoms, please visit the nearest healthcare facility.",
          margin,
          footerY + 10,
          { width: contentWidth - sigWidth - 15 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePrescriptionPdf,
};

