"use client";

/**
 * Robust Cross-Browser Print Utility for TriGyna Billing Receipts & Invoices
 * Clones the rendered document element into an isolated hidden iframe
 * and triggers exact print preview without interference from modal backdrops,
 * dashboards, or parent scroll containers.
 */
export function printDocumentElement(
  elementId: string = "trigyna-billing-receipt",
  isA4: boolean = false
): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Print element #${elementId} not found, falling back to window.print()`);
    window.print();
    return;
  }

  // 1. Temporarily unlock parent body overflow so browser layout engines don't clip
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "visible";

  // 2. Remove any previous print iframe to keep DOM clean
  const existingFrame = document.getElementById("trigyna-print-frame");
  if (existingFrame) {
    existingFrame.remove();
  }

  // 3. Create an isolated hidden iframe
  const iframe = document.createElement("iframe");
  iframe.id = "trigyna-print-frame";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!frameDoc || !iframe.contentWindow) {
    document.body.style.overflow = prevOverflow;
    window.print();
    return;
  }

  const pageSize = isA4 ? "A4 portrait" : "80mm auto";
  const contentWidth = isA4 ? "190mm" : "78mm";

  // Collect all stylesheets and inline styles from the host document
  let stylesHtml = "";
  document.querySelectorAll("link[rel='stylesheet'], style").forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  frameDoc.open();
  frameDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>TriGyna Official Print</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${stylesHtml}
        <style>
          @page {
            size: ${pageSize};
            margin: ${isA4 ? "6mm" : "0"};
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: ${isA4 ? "0" : "1.5mm"} !important;
            background: #ffffff !important;
            color: #14251F !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          .print-host-wrapper {
            margin: 0 auto !important;
            width: ${contentWidth} !important;
            max-width: ${contentWidth} !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          .no-print, [data-no-print="true"] {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="print-host-wrapper">
          ${element.outerHTML}
        </div>
      </body>
    </html>
  `);
  frameDoc.close();

  // Give time for images, SVGs, and fonts to settle in the iframe before printing
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn("Iframe print preview error, falling back to window.print():", e);
      window.print();
    } finally {
      document.body.style.overflow = prevOverflow;
    }
  }, 300);
}

