const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// TriGyna Healthcare Brand Palette
const COLORS = {
  deepForest: "#064A2D",
  primaryGreen: "#087443",
  botanicalGreen: "#6D982B",
  paleMint: "#EDF8F1",
  softCream: "#FFF8EC",
  cardBorder: "#E4EEE7",
  textPrimary: "#14251F",
  textSecondary: "#68766F",
  white: "#FFFFFF",
  lightGray: "#F8FAF9",
  amber: "#B45309",
  amberBg: "#FFFBEB",
  crimson: "#B91C1C",
  crimsonBg: "#FEF2F2",
};

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Generate high-fidelity A4 TriGyna Healthcare Invoice / Bill PDF
 * @param {Object} invoiceData - Normalized invoice document
 * @param {Stream} stream - Writable response stream
 * @param {Object} orgData - Optional organization profile
 */
function generateInvoicePdf(invoiceData, stream, orgData) {
  return new Promise((resolve, reject) => {
    try {
      const org = orgData || invoiceData.organization || {
        name: "TriGyna Health & Wellness",
        phone: "+91 917-277-2326",
        email: "trigyna.health@gmail.com",
        website: "www.trigyna.in",
        address: "Baner Road, Pune, Maharashtra 411045",
        gstin: "27AABCT9988C1ZR",
      };

      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 28, bottom: 28, left: 32, right: 32 },
        info: {
          Title: `TriGyna Invoice - ${invoiceData.invoiceNumber || "INV"}`,
          Author: org.name || "TriGyna Health & Wellness",
          Subject: "Healthcare Billing Statement & Tax Invoice",
          Keywords: "TriGyna, Healthcare, Invoice, Bill, Wellness, Consultation",
        },
      });

      doc.pipe(stream);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const leftMargin = 32;
      const rightMargin = pageWidth - 32;
      const contentWidth = rightMargin - leftMargin;

      // ----------------------------------------------------------------------
      // 1. BRAND HEADER & DOCUMENT TITLE
      // ----------------------------------------------------------------------
      const logoPath = path.resolve(__dirname, "../../../../../public/images/brand/logo.png");
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, leftMargin, 26, { width: 145 });
        } catch {
          doc
            .font("Helvetica-Bold")
            .fontSize(22)
            .fillColor(COLORS.deepForest)
            .text("TriGyna", leftMargin, 26);
          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor(COLORS.botanicalGreen)
            .text("WOMEN | HEALTH | WELLNESS", leftMargin, 50);
        }
      } else {
        doc
          .font("Helvetica-Bold")
          .fontSize(22)
          .fillColor(COLORS.deepForest)
          .text("TriGyna", leftMargin, 26);
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(COLORS.botanicalGreen)
          .text("WOMEN | HEALTH | WELLNESS", leftMargin, 50);
      }

      // Top Right: Document Title & Metadata
      doc
        .font("Times-Bold")
        .fontSize(22)
        .fillColor(COLORS.deepForest)
        .text("TAX INVOICE / BILL", 300, 24, { width: 260, align: "right" });

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLORS.primaryGreen)
        .text(`Invoice No: ${invoiceData.invoiceNumber || "INV-NEW"}`, 300, 50, { width: 260, align: "right" });

      const issueDateStr = formatDate(invoiceData.issueDate || invoiceData.createdAt || new Date());
      const dueDateStr = invoiceData.dueDate ? formatDate(invoiceData.dueDate) : "On Receipt";
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.textSecondary)
        .text(`Date of Issue: ${issueDateStr}  |  Due Date: ${dueDateStr}`, 300, 64, {
          width: 260,
          align: "right",
        });

      // ----------------------------------------------------------------------
      // 2. INVOICE STATUS BANNER
      // ----------------------------------------------------------------------
      const bannerY = 82;
      const bannerHeight = 52;
      const statusKey = String(invoiceData.status || "pending").toLowerCase();

      let bannerBg = COLORS.paleMint;
      let statusTextColor = COLORS.deepForest;
      let bannerTitle = "Invoice Settled (Fully Paid)";
      let bannerSubtitle = "Full payment has been verified. Thank you for choosing TriGyna.";

      if (statusKey === "pending" || statusKey === "issued" || statusKey === "draft") {
        bannerBg = COLORS.amberBg;
        statusTextColor = COLORS.amber;
        bannerTitle = "Payment Due / Pending Settlement";
        bannerSubtitle = "Please remit the outstanding balance via UPI, online checkout, or reception desk.";
      } else if (statusKey === "partially_paid") {
        bannerBg = COLORS.amberBg;
        statusTextColor = COLORS.amber;
        bannerTitle = "Partially Paid — Balance Due";
        bannerSubtitle = `A partial payment of ₹${formatCurrency(invoiceData.paidAmount || 0)} was verified. Balance due remains.`;
      } else if (statusKey === "overdue") {
        bannerBg = COLORS.crimsonBg;
        statusTextColor = COLORS.crimson;
        bannerTitle = "Invoice Overdue";
        bannerSubtitle = "Payment is past the configured due date. Immediate settlement is requested.";
      } else if (statusKey === "refunded") {
        bannerBg = "#F5F3FF";
        statusTextColor = "#6D28D9";
        bannerTitle = "Invoice Refunded";
        bannerSubtitle = "This invoice and its payment records have been audited and refunded.";
      } else if (statusKey === "cancelled") {
        bannerBg = "#F3F4F6";
        statusTextColor = "#4B5563";
        bannerTitle = "Invoice Cancelled";
        bannerSubtitle = "This invoice record was cancelled and is no longer payable.";
      }

      doc
        .roundedRect(leftMargin, bannerY, contentWidth, bannerHeight, 7)
        .fillAndStroke(bannerBg, COLORS.cardBorder);

      // Status pill badge
      const pillX = leftMargin + 14;
      const pillY = bannerY + 12;
      doc
        .roundedRect(pillX, pillY, 110, 26, 5)
        .fill(COLORS.white);

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(statusTextColor)
        .text((invoiceData.status || "PENDING").toUpperCase(), pillX, pillY + 8, { width: 110, align: "center" });

      doc
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .fillColor(statusTextColor)
        .text(bannerTitle, leftMargin + 134, bannerY + 13);

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.textSecondary)
        .text(bannerSubtitle, leftMargin + 134, bannerY + 28, { width: contentWidth - 146 });

      // ----------------------------------------------------------------------
      // 3. PATIENT & CLINICAL PROVIDER DETAILS
      // ----------------------------------------------------------------------
      const detailsY = 142;
      const cardWidth = (contentWidth - 12) / 2;
      const cardHeight = 84;

      // Left Card: Billed To (Patient)
      doc
        .roundedRect(leftMargin, detailsY, cardWidth, cardHeight, 7)
        .fillAndStroke(COLORS.white, COLORS.cardBorder);

      doc.circle(leftMargin + 16, detailsY + 15, 7).fill(COLORS.paleMint);
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(COLORS.textPrimary)
        .text("Billed To (Patient)", leftMargin + 28, detailsY + 11);

      let pY = detailsY + 28;
      const pCol1 = leftMargin + 12;
      const pCol2 = leftMargin + 72;

      const patientName = invoiceData.patientName || invoiceData.patientId?.fullName || "Valued Patient";
      const patientCode = invoiceData.patientCode || invoiceData.patientId?.patientCode || "—";
      const patientPhone = invoiceData.patientPhone || invoiceData.patientId?.phone || "—";
      const patientEmail = invoiceData.patientEmail || invoiceData.patientId?.email || "Not specified";

      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("Patient Name", pCol1, pY);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textPrimary).text(patientName, pCol2, pY);

      pY += 13;
      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("Patient ID", pCol1, pY);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textPrimary).text(patientCode, pCol2, pY);

      pY += 13;
      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("Contact No.", pCol1, pY);
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text(patientPhone, pCol2, pY);

      pY += 13;
      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("Email", pCol1, pY);
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text(patientEmail, pCol2, pY);

      // Right Card: Provider / Organization Details
      const cLeft = leftMargin + cardWidth + 12;
      doc
        .roundedRect(cLeft, detailsY, cardWidth, cardHeight, 7)
        .fillAndStroke(COLORS.white, COLORS.cardBorder);

      doc.circle(cLeft + 16, detailsY + 15, 7).fill(COLORS.paleMint);
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(COLORS.textPrimary)
        .text("Healthcare Provider", cLeft + 28, detailsY + 11);

      let cY = detailsY + 28;
      const cCol1 = cLeft + 12;
      const cCol2 = cLeft + 88;

      const docName = invoiceData.doctorName || invoiceData.doctorId?.userId?.name || invoiceData.doctorId?.name || "Consultant Care Team";
      const clinicAddress = org.address?.street || org.address || "Baner Road, Pune, Maharashtra";
      const clinicGstin = org.gstin || "27AABCT9988C1ZR";

      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("Consultant", cCol1, cY);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textPrimary).text(docName, cCol2, cY);

      cY += 13;
      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("Facility", cCol1, cY);
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text(org.name || "TriGyna Health & Wellness", cCol2, cY);

      cY += 13;
      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("Address", cCol1, cY);
      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textPrimary).text(typeof clinicAddress === "string" ? clinicAddress : "Pune, India", cCol2, cY, { width: cardWidth - 95 });

      cY += 13;
      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("GSTIN / Reg.", cCol1, cY);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textPrimary).text(clinicGstin, cCol2, cY);

      // ----------------------------------------------------------------------
      // 4. ITEMISED CHARGES TABLE
      // ----------------------------------------------------------------------
      const tableY = 234;
      const thHeight = 22;

      // Table Header Row: Deep Forest Green
      doc.rect(leftMargin, tableY, contentWidth, thHeight).fill(COLORS.deepForest);

      const colX = {
        num: leftMargin + 8,
        desc: leftMargin + 38,
        qty: leftMargin + 290,
        rate: leftMargin + 350,
        tax: leftMargin + 420,
        amount: rightMargin - 8,
      };

      doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.white);
      doc.text("#", colX.num, tableY + 6, { width: 25, align: "center" });
      doc.text("Item / Service Description", colX.desc, tableY + 6);
      doc.text("Qty", colX.qty, tableY + 6, { width: 40, align: "center" });
      doc.text("Unit Price (₹)", colX.rate, tableY + 6, { width: 65, align: "right" });
      doc.text("Tax", colX.tax, tableY + 6, { width: 40, align: "center" });
      doc.text("Amount (₹)", colX.amount - 70, tableY + 6, { width: 70, align: "right" });

      let rowY = tableY + thHeight;
      const items = Array.isArray(invoiceData.items) && invoiceData.items.length > 0
        ? invoiceData.items
        : [
            {
              description: invoiceData.serviceName || "Clinical Consultation & Healthcare Services",
              quantity: 1,
              unitPrice: invoiceData.totalAmount || 0,
              taxRate: invoiceData.taxRate || 0,
              amount: invoiceData.totalAmount || 0,
            },
          ];

      items.forEach((item, index) => {
        const rowHeight = item.details ? 32 : 22;

        if (index % 2 === 1) {
          doc.rect(leftMargin, rowY, contentWidth, rowHeight).fill(COLORS.lightGray);
        }

        doc.lineWidth(0.4).strokeColor(COLORS.cardBorder);
        doc.moveTo(leftMargin, rowY + rowHeight).lineTo(rightMargin, rowY + rowHeight).stroke();

        doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary);
        doc.text(String(index + 1), colX.num, rowY + 6, { width: 25, align: "center" });

        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textPrimary);
        doc.text(item.description || "Healthcare Service", colX.desc, rowY + 6, { width: 245 });

        if (item.details) {
          doc.font("Helvetica").fontSize(7).fillColor(COLORS.textSecondary);
          doc.text(item.details, colX.desc, rowY + 17, { width: 245 });
        }

        const qty = item.quantity || 1;
        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : item.amount / qty;

        doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary);
        doc.text(String(qty), colX.qty, rowY + 6, { width: 40, align: "center" });

        doc.text(formatCurrency(unitPrice), colX.rate, rowY + 6, { width: 65, align: "right" });

        const taxRate = item.taxRate !== undefined ? `${item.taxRate}%` : "Exempt";
        doc.text(taxRate, colX.tax, rowY + 6, { width: 40, align: "center" });

        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textPrimary);
        doc.text(formatCurrency(item.amount), colX.amount - 70, rowY + 6, { width: 70, align: "right" });

        rowY += rowHeight;
      });

      // ----------------------------------------------------------------------
      // 5. FINANCIAL TOTALS & PAYMENT INSTRUCTIONS
      // ----------------------------------------------------------------------
      const summaryY = Math.max(rowY + 12, 380);
      const summaryCardHeight = 146;

      // Left Box: Payment Instructions / Verification Box
      doc
        .roundedRect(leftMargin, summaryY, cardWidth, summaryCardHeight, 7)
        .fillAndStroke(COLORS.white, COLORS.cardBorder);

      const balanceDue = Number(invoiceData.balanceAmount !== undefined ? invoiceData.balanceAmount : Math.max(0, (invoiceData.totalAmount || 0) - (invoiceData.paidAmount || 0)));

      if (balanceDue > 0) {
        doc.circle(leftMargin + 16, summaryY + 16, 7).fill(COLORS.amberBg);
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(COLORS.amber)
          .text("Payment Remittance Instructions", leftMargin + 28, summaryY + 12);

        let remY = summaryY + 30;
        doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("Payment Modes", leftMargin + 12, remY);
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COLORS.textPrimary).text("UPI / Cards / Netbanking / QR Code", leftMargin + 85, remY);

        remY += 13;
        doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("Official UPI ID", leftMargin + 12, remY);
        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.deepForest).text("trigyna.health@icici", leftMargin + 85, remY);

        remY += 13;
        doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("Bank Account", leftMargin + 12, remY);
        doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textPrimary).text("ICICI Bank Ltd., Baner Branch", leftMargin + 85, remY);

        remY += 13;
        doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("A/C Number", leftMargin + 12, remY);
        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textPrimary).text("104805004921", leftMargin + 85, remY);

        remY += 13;
        doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textSecondary).text("IFSC Code", leftMargin + 12, remY);
        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textPrimary).text("ICIC0001048", leftMargin + 85, remY);

        remY += 15;
        doc
          .roundedRect(leftMargin + 10, remY, cardWidth - 20, 24, 4)
          .fill(COLORS.softCream);
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor(COLORS.amber)
          .text("Online Portal: Login to trigyna.in/patient/payments to pay instantly", leftMargin + 14, remY + 7, {
            width: cardWidth - 28,
            align: "center",
          });
      } else {
        doc.circle(leftMargin + 16, summaryY + 16, 7).fill(COLORS.paleMint);
        doc
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor(COLORS.deepForest)
          .text("Official Payment Verification Stamp", leftMargin + 28, summaryY + 12);

        let remY = summaryY + 34;
        doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Payment Status", leftMargin + 12, remY);
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.primaryGreen).text("FULL SETTLEMENT RECORDED", leftMargin + 95, remY);

        remY += 15;
        doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Payment Method", leftMargin + 12, remY);
        doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textPrimary).text((invoiceData.paymentMethod || "UPI").toUpperCase(), leftMargin + 95, remY);

        remY += 15;
        doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Settlement Date", leftMargin + 12, remY);
        doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text(formatDate(invoiceData.paidAt || invoiceData.updatedAt || new Date()), leftMargin + 95, remY);

        remY += 20;
        doc
          .roundedRect(leftMargin + 12, remY, cardWidth - 24, 28, 4)
          .fill(COLORS.paleMint);
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(COLORS.deepForest)
          .text("✓ OFFICIAL RECEIPT ISSUED & AUDITED", leftMargin + 16, remY + 9, {
            width: cardWidth - 32,
            align: "center",
          });
      }

      // Right Box: Financial Totals Breakdown
      doc
        .roundedRect(cLeft, summaryY, cardWidth, summaryCardHeight, 7)
        .fillAndStroke(COLORS.white, COLORS.cardBorder);

      let sumY = summaryY + 12;
      const sumCol1 = cLeft + 14;
      const sumCol2 = cLeft + cardWidth - 14;

      const subtotal = Number(invoiceData.subtotal !== undefined ? invoiceData.subtotal : invoiceData.totalAmount || 0);
      const discount = Number(invoiceData.discountAmount || 0);
      const taxAmount = Number(invoiceData.taxAmount || 0);
      const totalPayable = Number(invoiceData.totalAmount || 0);
      const paidAmount = Number(invoiceData.paidAmount || 0);

      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Subtotal", sumCol1, sumY);
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text(`₹ ${formatCurrency(subtotal)}`, sumCol2 - 90, sumY, { width: 90, align: "right" });

      sumY += 14;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Discount", sumCol1, sumY);
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text(`- ₹ ${formatCurrency(discount)}`, sumCol2 - 90, sumY, { width: 90, align: "right" });

      sumY += 14;
      const taxRateLabel = invoiceData.taxRate ? `${invoiceData.taxRate}%` : "0%";
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text(`Tax (GST ${taxRateLabel})`, sumCol1, sumY);
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text(`₹ ${formatCurrency(taxAmount)}`, sumCol2 - 90, sumY, { width: 90, align: "right" });

      sumY += 16;
      doc.lineWidth(0.5).strokeColor(COLORS.cardBorder).moveTo(sumCol1, sumY).lineTo(sumCol2, sumY).stroke();

      sumY += 6;
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.textPrimary).text("Total Payable", sumCol1, sumY);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.deepForest).text(`₹ ${formatCurrency(totalPayable)}`, sumCol2 - 100, sumY, { width: 100, align: "right" });

      sumY += 16;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Amount Paid", sumCol1, sumY);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.primaryGreen).text(`₹ ${formatCurrency(paidAmount)}`, sumCol2 - 90, sumY, { width: 90, align: "right" });

      sumY += 16;
      // Balance Due Highlight Bar
      const balBg = balanceDue > 0 ? COLORS.amberBg : COLORS.paleMint;
      const balColor = balanceDue > 0 ? COLORS.amber : COLORS.deepForest;

      doc
        .roundedRect(cLeft + 8, sumY, cardWidth - 16, 26, 5)
        .fill(balBg);

      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(balColor)
        .text("Net Balance Due", cLeft + 16, sumY + 7);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(balColor)
        .text(`₹ ${formatCurrency(balanceDue)}`, sumCol2 - 110, sumY + 7, { width: 100, align: "right" });

      // ----------------------------------------------------------------------
      // 6. BILLING TERMS & AUTHORIZED SIGNATORY
      // ----------------------------------------------------------------------
      const footY = summaryY + summaryCardHeight + 14;

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.textPrimary)
        .text("Terms & Conditions:", leftMargin + 6, footY);

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(COLORS.textSecondary)
        .text(
          "1. This is a computer-generated official billing document issued by TriGyna Health & Wellness.\n2. All consultations and medical services are subject to clinic policy and clinical evaluation.\n3. Refunds, cancellations, and appointment rescheduling must adhere to TriGyna patient terms.",
          leftMargin + 6,
          footY + 12,
          { width: cardWidth }
        );

      // Signatory
      const signX = cLeft + 20;
      const signWidth = cardWidth - 40;
      doc
        .font("Times-Italic")
        .fontSize(14)
        .fillColor(COLORS.textPrimary)
        .text(docName, signX, footY + 4, { width: signWidth, align: "center" });

      doc
        .lineWidth(0.8)
        .strokeColor(COLORS.cardBorder)
        .moveTo(signX, footY + 22)
        .lineTo(signX + signWidth, footY + 22)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(COLORS.textPrimary)
        .text("Authorized Signatory", signX, footY + 25, { width: signWidth, align: "center" });

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(COLORS.textSecondary)
        .text(org.name || "TriGyna Women Health & Wellness", signX, footY + 34, {
          width: signWidth,
          align: "center",
        });

      // ----------------------------------------------------------------------
      // 7. BOTTOM FOOTER STRIP
      // ----------------------------------------------------------------------
      const stripY = pageHeight - 38;
      doc.roundedRect(leftMargin, stripY, contentWidth, 20, 5).fill(COLORS.paleMint);

      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textPrimary);
      const city = org.address?.city || "Pune";
      const phone = org.phone || "+91 917-277-2326";
      const email = org.email || "trigyna.health@gmail.com";
      const website = org.website ? org.website.replace(/^https?:\/\//, "").replace(/trigyna\.com/g, "trigyna.in") : "www.trigyna.in";
      doc.text(`${city}, India   |   ${phone}   |   ${email}   |   ${website}`, leftMargin + 12, stripY + 5);

      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(COLORS.primaryGreen)
        .text("Holistic Women Health  •  Evidence-Based Care", rightMargin - 200, stripY + 5, {
          width: 190,
          align: "right",
        });

      doc.end();
      resolve(doc);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateInvoicePdf,
};

