/**
 * ============================================================================
 * printEscPosPatientTicket.js
 * ============================================================================
 *
 * PURPOSE
 * -------
 * This helper is responsible ONLY for sending patient ticket print jobs
 * to the local ESC/POS print bridge service.
 *
 * It does NOT:
 *   - render HTML
 *   - open browser print dialogs
 *   - decide whether printing should be browser vs ESC/POS
 *   - generate visual React layouts
 *
 * ARCHITECTURE
 * ------------
 * The clinic app separates:
 *
 *   1. Ticket content / workflow
 *   2. Print transport selection
 *   3. Hardware communication
 *
 * This file lives in layer (3):
 * hardware communication.
 *
 * Current flow:
 *
 *   React app
 *      -> local print bridge HTTP API
 *      -> ESC/POS printer
 *
 * The local print bridge converts ticket data into raw ESC/POS commands
 * and sends them directly to the thermal printer.
 *
 * WHY THIS EXISTS
 * ---------------
 * Browser printing is unreliable for thermal receipt printers because
 * HTML/CSS rendering varies by browser, driver, and printer firmware.
 *
 * ESC/POS printing is substantially more reliable because it sends
 * printer-native commands directly to the device.
 *
 * FUTURE EVOLUTION
 * ----------------
 * Future transports may include:
 *
 *   - Android Bluetooth printing
 *   - Raspberry Pi print appliances
 *   - USB-connected printers
 *   - queued/offline printing
 *   - printer health/status APIs
 *
 * Higher-level code should call:
 *
 *   printPatientTicket(...)
 *
 * which decides HOW printing should occur.
 *
 * This file should remain focused ONLY on ESC/POS transport behavior.
 * ============================================================================
 */

const DEFAULT_ESC_POS_ENDPOINT = "http://127.0.0.1:3333/print/patient-ticket";

export const printEscPosPatientTicket = async ({
  patient,
  visitTypeLabel = "",
  endpoint = DEFAULT_ESC_POS_ENDPOINT,
}) => {
  if (!patient?.pt_no) {
    throw new Error("Cannot print ESC/POS ticket without patient.pt_no.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      patient: {
        pt_no: patient.pt_no,
        patient_name: patient.patient_name || "",
        guardian_name: patient.guardian_name || "",
        age_group: patient.age_group || "",
        organization: patient.organization || "",
        type_of_visit: patient.type_of_visit || "",
        visit_type_label: visitTypeLabel || patient.type_of_visit || "",
        location_name: patient.location_name || "",
        location_message: patient.location_message || "",
        created_at:
          patient.created_at instanceof Date
            ? patient.created_at.toISOString()
            : patient.created_at || new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    let details = "";

    try {
      const payload = await response.json();
      details = payload?.error ? ` ${payload.error}` : "";
    } catch (error) {
      details = response.statusText ? ` ${response.statusText}` : "";
    }

    throw new Error(
      `ESC/POS print request failed (${response.status}).${details}`,
    );
  }

  return response.json().catch(() => ({ ok: true }));
};
