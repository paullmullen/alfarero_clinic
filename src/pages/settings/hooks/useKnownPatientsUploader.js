import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { message } from "antd";
import { firestore } from "../../../helpers/firebaseConfig";
import { writeBatch, doc, Timestamp } from "firebase/firestore";

// Shared utilities from Step 1
import {
  getValueCI,
  cleanId,
  isValid13,
  parseAgeYears,
  inferAgeGroup,
  normalizePhone,
} from "../utils/normalization";

export const useKnownPatientsUploader = () => {
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const reset = () => {
    setRows([]);
    setParseError(null);
    setProgress({ current: 0, total: 0 });
  };

  // Normalize each row of the sheet
  const normalizeRows = (data) =>
    data.map((row, idx) => {
      const rawDpi = getValueCI(row, "dpi");
      const id = cleanId(rawDpi);

      const rawName =
        getValueCI(row, "nombre") ??
        getValueCI(row, "patient_name") ??
        getValueCI(row, "name");

      const patient_name = (rawName ?? "").toString().trim();

      const rawGender = getValueCI(row, "género") ?? getValueCI(row, "genero");
      let gender = null;
      if (rawGender) {
        const gtxt = rawGender.toString().trim().toLowerCase();
        if (gtxt.startsWith("m")) gender = "masculine";
        else if (gtxt.startsWith("f")) gender = "feminine";
      }

      const rawEdad = getValueCI(row, "edad");
      const years = parseAgeYears(rawEdad);
      const age_group = years !== null ? inferAgeGroup(years) : null;

      const rawPhone =
        getValueCI(row, "telephono") ??
        getValueCI(row, "telefono") ??
        getValueCI(row, "teléfono") ??
        getValueCI(row, "phone");

      const telephone = normalizePhone(rawPhone);

      let error = null;
      if (!rawDpi) error = "Missing DPI column";
      else if (!isValid13(id)) error = "DPI must be 13 digits";
      else if (!patient_name) error = "Missing patient name";

      return {
        id,
        patient_name,
        gender,
        age_group,
        telephone,
        originalRow: row,
        error,
        key: `${id}_${idx}`,
      };
    });

  // File handler for CSV / XLSX
  const handleFile = async (file) => {
    reset();

    const name = (file?.name || "").toLowerCase();
    const isCsv = name.endsWith(".csv");
    const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls");

    if (!isCsv && !isXlsx) {
      setParseError("Please select a .csv, .xlsx, or .xls file.");
      return;
    }

    try {
      let rawRows = [];

      if (isCsv) {
        rawRows = await new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (res) => resolve(res.data || []),
            error: reject,
          });
        });
      } else {
        rawRows = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const wb = XLSX.read(e.target.result, { type: "binary" });
              const sheet = wb.Sheets[wb.SheetNames[0]];
              const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
              resolve(json);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsBinaryString(file);
        });
      }

      const normalized = normalizeRows(rawRows);
      setRows(normalized);
    } catch (e) {
      console.error(e);
      setParseError("Failed to parse file");
    }
  };

  // Upload normalized data to Firestore
  const upload = async () => {
    const validRows = rows.filter((r) => !r.error);
    if (!validRows.length) {
      message.error("No valid rows to upload.");
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: validRows.length });

    try {
      const chunks = [];
      for (let i = 0; i < validRows.length; i += 450) {
        chunks.push(validRows.slice(i, i + 450));
      }

      let processed = 0;

      for (const part of chunks) {
        const batch = writeBatch(firestore);
        const now = Timestamp.now();

        part.forEach((row) => {
          const ref = doc(firestore, "known_patients", row.id);
          batch.set(
            ref,
            {
              national_id_number: row.id,
              patient_name: row.patient_name,
              gender: row.gender ?? null,
              age_group: row.age_group ?? null,
              telephone_number: row.telephone ?? null,
              is_new: false,
              updated_at: now,
            },
            { merge: false }, // FULL OVERWRITE
          );
        });

        await batch.commit();
        processed += part.length;
        setProgress({ current: processed, total: validRows.length });
      }

      message.success(
        `Uploaded ${validRows.length} records to known_patients.`,
      );
    } catch (err) {
      console.error("Batch upload failed:", err);
      message.error("Batch upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return {
    rows,
    parseError,
    handleFile,
    upload,
    reset,
    loading,
    progress,
  };
};
