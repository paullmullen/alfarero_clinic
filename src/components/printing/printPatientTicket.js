/**
 * ============================================================================
 * printPatientTicket.js
 * ============================================================================
 *
 * PURPOSE
 * -------
 * This file is the CENTRAL ORCHESTRATION LAYER for patient ticket printing.
 *
 * Higher-level clinic workflow code should call:
 *
 *   printPatientTicket(...)
 *
 * instead of directly calling:
 *
 *   - window.print()
 *   - printEscPosPatientTicket()
 *   - printer APIs
 *
 * This file decides HOW a ticket should be printed based on the
 * configured print method and format.
 *
 * ARCHITECTURE
 * ------------
 * Ticket printing is intentionally separated into layers:
 *
 *   1. Clinical workflow / ticket request
 *   2. Print orchestration (THIS FILE)
 *   3. Transport implementation
 *   4. Physical printer hardware
 *
 * Example flow:
 *
 *   Registro.jsx
 *      -> printPatientTicket()
 *      -> browser print OR ESC/POS transport
 *      -> printer
 *
 * CURRENT PRINT PATHS
 * -------------------
 *
 * LETTER FORMAT
 *   Uses browser/HTML printing:
 *
 *     React component
 *        -> window.print()
 *        -> browser print dialog
 *        -> standard printer
 *
 * TICKET FORMAT
 *   Uses ESC/POS thermal printing:
 *
 *     React app
 *        -> local print bridge HTTP API
 *        -> raw ESC/POS commands
 *        -> thermal printer
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Browser printing works reasonably well for standard page printers
 * but is unreliable for thermal receipt printers.
 *
 * Thermal printers work best when they receive native ESC/POS commands.
 *
 * This orchestration layer allows the application to:
 *
 *   - keep browser printing for letter format
 *   - use ESC/POS for ticket format
 *   - evolve transport methods independently
 *
 * FUTURE EVOLUTION
 * ----------------
 * Future print transports may include:
 *
 *   - Android Bluetooth printers
 *   - Raspberry Pi print appliances
 *   - USB-connected receipt printers
 *   - cloud print relays
 *   - offline print queues
 *   - printer failover/retry logic
 *
 * Future configuration may include:
 *
 *   printing: {
 *     format: "ticket",
 *     method: "escpos_network",
 *     serverUrl: "http://192.168.1.50:3333"
 *   }
 *
 * IMPORTANT DESIGN PRINCIPLE
 * --------------------------
 * Clinical workflow code should NOT need to know:
 *
 *   - printer IPs
 *   - ESC/POS details
 *   - browser print mechanics
 *   - transport protocols
 *
 * It should simply request:
 *
 *   "print this patient ticket"
 *
 * and allow this orchestration layer to determine how printing occurs.
 * ============================================================================
 */

const DEFAULT_PRINT_SERVER_URL = "http://localhost:3333";

export const getPrintFormat = (location) => {
  return location?.printing?.format || "letter";
};

export const printBrowserTicketNode = (node) => {
  return new Promise((resolve, reject) => {
    if (!node) {
      reject(new Error("No printable node found."));
      return;
    }

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      reject(new Error("Popup blocked."));
      return;
    }

    const styles = Array.from(
      document.querySelectorAll("link[rel='stylesheet'], style"),
    )
      .map((el) => el.outerHTML)
      .join("\n");

    const clone = node.cloneNode(true);

    const originalCanvases = node.querySelectorAll("canvas");
    const clonedCanvases = clone.querySelectorAll("canvas");

    clonedCanvases.forEach((canvas, i) => {
      const originalCanvas = originalCanvases[i];
      if (!originalCanvas) return;

      const img = document.createElement("img");
      img.src = originalCanvas.toDataURL("image/png");
      img.width = originalCanvas.width;
      img.height = originalCanvas.height;
      img.style.display = "block";
      img.style.margin = "0 auto";

      canvas.replaceWith(img);
    });

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          ${styles}
          <style>
            html, body {
              margin: 0;
              padding: 0;
              background: white;
            }
            @page {
              margin: 0;
            }
          </style>
        </head>
        <body>${clone.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        resolve();
      }, 250);
    };
  });
};

export const printEscPosPatientTicket = async ({
  patient,
  location,
  printServerUrl,
}) => {
  const url =
    printServerUrl || location?.printing?.serverUrl || DEFAULT_PRINT_SERVER_URL;

  const response = await fetch(`${url}/print/patient-ticket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      patient,
      location,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ESC/POS ticket print failed: ${response.status} ${text}`);
  }

  return response.json();
};

export const printPatientTicket = async ({
  patient,
  location,
  printableNode,
}) => {
  const printFormat = getPrintFormat(location);

  if (printFormat === "ticket") {
    return printEscPosPatientTicket({ patient, location });
  }

  return printBrowserTicketNode(printableNode);
};
