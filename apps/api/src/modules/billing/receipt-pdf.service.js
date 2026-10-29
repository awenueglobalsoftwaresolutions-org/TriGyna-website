const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// TriGyna Brand Palette
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
};

/**
 * Format currency in Indian numbering format (e.g. 1,000.00)
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format date in standard receipt format (e.g. 27 Oct 2026)
 */
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format time (e.g. 11:22 AM)
 */
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
 * Generate high-fidelity A4 TriGyna Payment Receipt PDF
 */
/**
 * Generate high-fidelity A4 TriGyna Payment Receipt PDF
 */
function generateReceiptPdf(receiptData, stream, orgData) {
  return new Promise((resolve, reject) => {
    try {
      const org = orgData || receiptData.organization || {
        name: "TriGyna Health & Wellness",
        phone: "+91 917-277-2326",
        email: "trigyna.health@gmail.com",
        website: "www.trigyna.com",
      };

      const doc = new PDFDocument({
        size: "A4", // 595.28 x 841.89 points
        margins: { top: 28, bottom: 28, left: 32, right: 32 },
        info: {
          Title: `TriGyna Payment Receipt - ${receiptData.receiptNumber || "RCP"}`,
          Author: org.name || "TriGyna Women Health & Wellness",
          Subject: "Payment Receipt & Healthcare Billing Slip",
          Keywords: "TriGyna, Healthcare, Payment, Receipt, Invoice, Wellness",
        },
      });

      doc.pipe(stream);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const leftMargin = 32;
      const rightMargin = pageWidth - 32;
      const contentWidth = rightMargin - leftMargin; // ~531.28 pt

      // ----------------------------------------------------------------------
      // 1. TOP HEADER SECTION
      // ----------------------------------------------------------------------
      const logoPath = path.resolve(__dirname, "../../../../../public/images/brand/logo.png");
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, leftMargin, 26, { width: 155 });
        } catch (e) {
          // Fallback text logo
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

      // Top Right: Title and Greeting
      doc
        .font("Times-Bold")
        .fontSize(23)
        .fillColor(COLORS.deepForest)
        .text("Payment Receipt", 320, 24, { width: 240, align: "right" });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(COLORS.primaryGreen)
        .text("Thank you for trusting TriGyna", 320, 52, { width: 240, align: "right" });

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLORS.textSecondary)
        .text("Your health and wellness journey matters to us.", 320, 66, {
          width: 240,
          align: "right",
        });

      // ----------------------------------------------------------------------
      // 2. PAYMENT STATUS BANNER
      // ----------------------------------------------------------------------
      const bannerY = 88;
      const bannerHeight = 62;

      // Determine banner text and styling by status
      const pStatus = (receiptData.paymentStatus || "PAID").toUpperCase();
      let bannerTitle = "Payment Successful";
      let bannerDesc = "Your payment has been received. We look forward to supporting your health and wellness journey.";
      let statusColor = COLORS.deepForest;

      if (pStatus === "PARTIALLY_PAID" || pStatus === "PARTIAL") {
        bannerTitle = "Partial Payment Received";
        bannerDesc = "Part of the invoice amount has been received. The remaining balance is recorded below.";
        statusColor = "#B45309"; // Amber
      } else if (pStatus === "REFUNDED") {
        bannerTitle = "Payment Refunded";
        bannerDesc = "This payment transaction has been processed for refund to the original payment source.";
        statusColor = "#B91C1C"; // Crimson
      } else if (pStatus === "PENDING") {
        bannerTitle = "Payment Pending Verification";
        bannerDesc = "Payment is currently pending verification from the bank or payment gateway.";
        statusColor = "#D97706";
      }

      // Outer container
      doc
        .roundedRect(leftMargin, bannerY, contentWidth, bannerHeight, 8)
        .fillAndStroke(COLORS.paleMint, COLORS.cardBorder);

      // Status Circle Icon
      const iconCenterX = leftMargin + 26;
      const iconCenterY = bannerY + 31;
      doc
        .circle(iconCenterX, iconCenterY, 14)
        .fill(statusColor);

      // Checkmark tick in white
      doc
        .lineWidth(2)
        .strokeColor(COLORS.white)
        .moveTo(iconCenterX - 6, iconCenterY)
        .lineTo(iconCenterX - 2, iconCenterY + 5)
        .lineTo(iconCenterX + 6, iconCenterY - 4)
        .stroke();

      // Heading and message
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(statusColor)
        .text(bannerTitle, leftMargin + 48, bannerY + 12);

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLORS.textSecondary)
        .text(bannerDesc, leftMargin + 48, bannerY + 28, {
          width: 220,
          lineGap: 1,
        });

      // Divider inside banner
      doc
        .lineWidth(0.8)
        .strokeColor(COLORS.cardBorder)
        .moveTo(330, bannerY + 8)
        .lineTo(330, bannerY + bannerHeight - 8)
        .stroke();

      // Receipt info block (Right side of banner)
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(COLORS.textSecondary)
        .text("Receipt No.", 345, bannerY + 10);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.textPrimary)
        .text(receiptData.receiptNumber || "—", 345, bannerY + 20);

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(COLORS.textSecondary)
        .text("Invoice No.", 345, bannerY + 36);
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLORS.textPrimary)
        .text(receiptData.invoiceNumber || "—", 345, bannerY + 46);

      // Date & Time
      const issuedDate = receiptData.paidAt || receiptData.issuedAt || new Date();
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(COLORS.textSecondary)
        .text("Date & Time", 460, bannerY + 10);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.textPrimary)
        .text(formatDate(issuedDate), 460, bannerY + 20);
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLORS.textSecondary)
        .text(formatTime(issuedDate), 460, bannerY + 33);

      // ----------------------------------------------------------------------
      // 3. PATIENT & CONSULTANT DETAILS (Side by Side)
      // ----------------------------------------------------------------------
      const detailsY = 160;
      const cardWidth = (contentWidth - 12) / 2; // ~259.6 pt
      const cardHeight = 88;

      // Patient Details Card (Left)
      doc
        .roundedRect(leftMargin, detailsY, cardWidth, cardHeight, 7)
        .fillAndStroke(COLORS.white, COLORS.cardBorder);

      doc.circle(leftMargin + 16, detailsY + 16, 8).fill(COLORS.paleMint);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.textPrimary)
        .text("Patient Details", leftMargin + 30, detailsY + 11);

      const pCol1 = leftMargin + 12;
      const pCol2 = leftMargin + 72;
      let pY = detailsY + 28;

      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Name", pCol1, pY);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.patientName || "—", pCol2, pY);

      pY += 14;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Patient ID", pCol1, pY);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.patientCode || "—", pCol2, pY);

      pY += 14;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Mobile No.", pCol1, pY);
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.patientPhone || "—", pCol2, pY);

      pY += 14;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Email", pCol1, pY);
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.patientEmail || "Not provided", pCol2, pY);

      // Consultant Details Card (Right)
      const cLeft = leftMargin + cardWidth + 12;
      doc
        .roundedRect(cLeft, detailsY, cardWidth, cardHeight, 7)
        .fillAndStroke(COLORS.white, COLORS.cardBorder);

      doc.circle(cLeft + 16, detailsY + 16, 8).fill(COLORS.paleMint);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.textPrimary)
        .text("Consultant Details", cLeft + 30, detailsY + 11);

      const cCol1 = cLeft + 12;
      const cCol2 = cLeft + 90;
      let cY = detailsY + 28;

      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Consultant Name", cCol1, cY);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.doctorName || "Consultant Doctor", cCol2, cY);

      cY += 14;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Qualifications", cCol1, cY);
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.doctorQualifications || "Medical Consultant", cCol2, cY);

      cY += 14;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Specialization", cCol1, cY);
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.doctorSpecialization || "Women's Health & Wellness", cCol2, cY);

      cY += 14;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Consultation Type", cCol1, cY);
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.appointmentMode || "Clinical Consultation", cCol2, cY);

      // ----------------------------------------------------------------------
      // 4. APPOINTMENT DETAILS (Full Width Card)
      // ----------------------------------------------------------------------
      const apptY = 256;
      const apptHeight = 64;

      doc
        .roundedRect(leftMargin, apptY, contentWidth, apptHeight, 7)
        .fillAndStroke(COLORS.white, COLORS.cardBorder);

      doc.circle(leftMargin + 16, apptY + 14, 8).fill(COLORS.paleMint);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.textPrimary)
        .text("Appointment Details", leftMargin + 30, apptY + 10);

      const aCol1 = leftMargin + 12;
      const aCol2 = leftMargin + 108;
      let aY = apptY + 26;

      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Service / Programme", aCol1, aY);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.serviceName || receiptData.items?.[0]?.description || "Clinical Consultation", aCol2, aY);

      aY += 12;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Date & Time", aCol1, aY);
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.appointmentDateTime || formatDate(issuedDate), aCol2, aY);

      aY += 12;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Duration", aCol1, aY);
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.duration || "30 Minutes", aCol2, aY);

      aY += 12;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Mode", aCol1, aY);
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.appointmentMode || "Clinical Consultation", aCol2, aY);

      // ----------------------------------------------------------------------
      // 5. ITEMIZED BILLING TABLE
      // ----------------------------------------------------------------------
      const tableY = 328;
      const thHeight = 22;

      // Table Header Row: Deep Forest Green
      doc
        .rect(leftMargin, tableY, contentWidth, thHeight)
        .fill(COLORS.deepForest);

      // Column widths
      const colX = {
        num: leftMargin + 8,
        desc: leftMargin + 48,
        qty: leftMargin + 300,
        rate: leftMargin + 360,
        amount: rightMargin - 8,
      };

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.white);
      doc.text("#", colX.num, tableY + 6, { width: 30, align: "center" });
      doc.text("Description", colX.desc, tableY + 6);
      doc.text("Qty", colX.qty, tableY + 6, { width: 40, align: "center" });
      doc.text("Unit Price (₹)", colX.rate, tableY + 6, { width: 75, align: "right" });
      doc.text("Amount (₹)", colX.amount - 80, tableY + 6, { width: 80, align: "right" });

      // Table Rows from real data
      let rowY = tableY + thHeight;
      const fallbackAmount = Number(receiptData.subtotal || receiptData.totalAmount || receiptData.amountReceived || 0);
      const items = receiptData.items && receiptData.items.length > 0
        ? receiptData.items
        : [
            {
              description: receiptData.serviceName || "Clinical Consultation",
              details: receiptData.appointmentMode || "",
              quantity: 1,
              unitPrice: fallbackAmount,
              amount: fallbackAmount,
            },
          ];

      items.forEach((item, index) => {
        const rowHeight = item.details ? 30 : 22;

        // Subtle alternating row background or border
        doc
          .rect(leftMargin, rowY, contentWidth, rowHeight)
          .fillAndStroke(index % 2 === 0 ? COLORS.white : COLORS.lightGray, COLORS.cardBorder);

        // Column #
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLORS.textPrimary)
          .text(String(index + 1), colX.num, rowY + 6, { width: 30, align: "center" });

        // Description & subtext
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(COLORS.textPrimary)
          .text(item.description || "Healthcare Service", colX.desc, rowY + 5);

        if (item.details) {
          doc
            .font("Helvetica")
            .fontSize(7.5)
            .fillColor(COLORS.textSecondary)
            .text(item.details, colX.desc, rowY + 16);
        }

        // Qty
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLORS.textPrimary)
          .text(String(item.quantity || 1), colX.qty, rowY + 6, { width: 40, align: "center" });

        // Unit Price
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLORS.textPrimary)
          .text(formatCurrency(item.unitPrice), colX.rate, rowY + 6, { width: 75, align: "right" });

        // Line Amount
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(COLORS.textPrimary)
          .text(formatCurrency(item.amount), colX.amount - 80, rowY + 6, { width: 80, align: "right" });

        rowY += rowHeight;
      });

      // ----------------------------------------------------------------------
      // 6. LOWER PANELS: PAYMENT INFO & AMOUNT SUMMARY
      // ----------------------------------------------------------------------
      const lowerY = Math.max(rowY + 12, 420);
      const lowerCardHeight = 114;

      // Left Panel: Payment Information
      doc
        .roundedRect(leftMargin, lowerY, cardWidth, lowerCardHeight, 7)
        .fillAndStroke(COLORS.white, COLORS.cardBorder);

      doc.circle(leftMargin + 16, lowerY + 16, 8).fill(COLORS.paleMint);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.textPrimary)
        .text("Payment Information", leftMargin + 30, lowerY + 11);

      let payY = lowerY + 28;
      const payCol1 = leftMargin + 12;
      const payCol2 = leftMargin + 85;

      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Payment Method", payCol1, payY);
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.paymentMethod || "UPI", payCol2, payY);

      payY += 15;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Transaction ID", payCol1, payY);
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.textPrimary).text(receiptData.providerTransactionId || "—", payCol2, payY);

      payY += 15;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Payment Date", payCol1, payY);
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.textPrimary).text(
        `${formatDate(receiptData.paidAt || receiptData.issuedAt || new Date())}, ${formatTime(receiptData.paidAt || receiptData.issuedAt || new Date())}`,
        payCol2,
        payY
      );

      payY += 15;
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textSecondary).text("Payment Status", payCol1, payY);

      // Status Badge
      let badgeLabel = "Paid";
      let badgeBg = COLORS.primaryGreen;
      let badgeWidth = 34;

      if (pStatus === "PARTIALLY_PAID" || pStatus === "PARTIAL") {
        badgeLabel = "Partial";
        badgeBg = "#D97706";
        badgeWidth = 42;
      } else if (pStatus === "REFUNDED") {
        badgeLabel = "Refunded";
        badgeBg = "#DC2626";
        badgeWidth = 50;
      } else if (pStatus === "PENDING") {
        badgeLabel = "Pending";
        badgeBg = "#F59E0B";
        badgeWidth = 46;
      }

      doc
        .roundedRect(payCol2, payY - 2, badgeWidth, 13, 6)
        .fill(badgeBg);
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(COLORS.white)
        .text(badgeLabel, payCol2, payY + 0.5, { width: badgeWidth, align: "center" });

      // Right Panel: Amount Summary
      doc
        .roundedRect(cLeft, lowerY, cardWidth, lowerCardHeight, 7)
        .fillAndStroke(COLORS.white, COLORS.cardBorder);

      doc.circle(cLeft + 16, lowerY + 16, 8).fill(COLORS.paleMint);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.textPrimary)
        .text("Amount Summary", cLeft + 30, lowerY + 11);

      let sumY = lowerY + 26;
      const sumCol1 = cLeft + 12;
      const sumCol2 = cLeft + cardWidth - 12;

      // Subtotal
      const subtotalVal = receiptData.subtotal !== undefined
        ? receiptData.subtotal
        : (receiptData.totalAmount !== undefined ? receiptData.totalAmount : receiptData.amountReceived);
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text("Subtotal", sumCol1, sumY);
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text(
        `₹ ${formatCurrency(subtotalVal || 0)}`,
        sumCol2 - 100,
        sumY,
        { width: 100, align: "right" }
      );

      sumY += 13;
      // Discount
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text("Discount", sumCol1, sumY);
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text(
        `- ₹ ${formatCurrency(receiptData.discountAmount || 0)}`,
        sumCol2 - 100,
        sumY,
        { width: 100, align: "right" }
      );

      sumY += 13;
      // Tax
      const taxRateLabel = receiptData.taxRate !== undefined ? `${receiptData.taxRate}%` : "0%";
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text(`Tax (GST ${taxRateLabel})`, sumCol1, sumY);
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.textPrimary).text(
        `₹ ${formatCurrency(receiptData.taxAmount || 0)}`,
        sumCol2 - 100,
        sumY,
        { width: 100, align: "right" }
      );

      // Check if there is balance amount
      const balanceVal = Number(receiptData.balanceAmount) || 0;
      if (balanceVal > 0) {
        sumY += 13;
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#B45309").text("Balance Due", sumCol1, sumY);
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#B45309").text(
          `₹ ${formatCurrency(balanceVal)}`,
          sumCol2 - 100,
          sumY,
          { width: 100, align: "right" }
        );
      }

      sumY += 15;
      // Pale Mint Highlight Bar for Total Paid
      doc
        .roundedRect(cLeft + 8, sumY, cardWidth - 16, 24, 6)
        .fill(COLORS.paleMint);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.deepForest)
        .text("Total Paid", cLeft + 16, sumY + 6);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(COLORS.deepForest)
        .text(
          `₹ ${formatCurrency(receiptData.amountReceived || receiptData.totalAmount || 0)}`,
          sumCol2 - 120,
          sumY + 6,
          { width: 110, align: "right" }
        );

      // ----------------------------------------------------------------------
      // 7. THANK YOU & AUTHORIZED SIGNATORY SECTION
      // ----------------------------------------------------------------------
      const footY = lowerY + lowerCardHeight + 16;

      // Left: Script style "Thank you"
      doc
        .font("Times-Italic")
        .fontSize(24)
        .fillColor(COLORS.primaryGreen)
        .text("Thank you", leftMargin + 12, footY);

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLORS.textSecondary)
        .text("for being a part of your health journey.", leftMargin + 12, footY + 26);

      // Right: Authorized Signatory
      const signX = cLeft + 20;
      const signWidth = cardWidth - 40;

      const signatoryName = receiptData.doctorName || org.name || "Authorized Signatory";
      doc
        .font("Times-Italic")
        .fontSize(15)
        .fillColor(COLORS.textPrimary)
        .text(signatoryName, signX, footY + 6, { width: signWidth, align: "center" });

      doc
        .lineWidth(0.8)
        .strokeColor(COLORS.cardBorder)
        .moveTo(signX, footY + 26)
        .lineTo(signX + signWidth, footY + 26)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.textPrimary)
        .text("Authorized Signatory", signX, footY + 29, { width: signWidth, align: "center" });

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(COLORS.textSecondary)
        .text(org.name || "TriGyna Women Health & Wellness", signX, footY + 39, {
          width: signWidth,
          align: "center",
        });

      // ----------------------------------------------------------------------
      // 8. BOTTOM CONTACT STRIP
      // ----------------------------------------------------------------------
      const stripY = pageHeight - 44;
      doc
        .roundedRect(leftMargin, stripY, contentWidth, 22, 6)
        .fill(COLORS.paleMint);

      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.textPrimary);

      const city = org.address?.city || "Pune";
      const phone = org.phone || "+91 917-277-2326";
      const email = org.email || "trigyna.health@gmail.com";
      const website = org.website ? org.website.replace(/^https?:\/\//, "") : "www.trigyna.com";
      const contactText = `${city}, India    |    ${phone}    |    ${email}    |    ${website}`;
      doc.text(contactText, leftMargin + 12, stripY + 6);

      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(COLORS.primaryGreen)
        .text("Women Health  |  Holistic Care  |  Better Tomorrows", rightMargin - 220, stripY + 6, {
          width: 210,
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
  generateReceiptPdf,
};
