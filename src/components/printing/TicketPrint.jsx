/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from "react";
import full_logo_bw from "../../img/full_logo_bw.gif";
import { useTranslation } from "react-i18next";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

const formatDateValue = (value) => {
  if (!value) return "";

  let dateValue = value;

  if (typeof value?.toDate === "function") {
    dateValue = value.toDate();
  } else if (!(value instanceof Date)) {
    dateValue = new Date(value);
  }

  if (Number.isNaN(dateValue?.getTime?.())) return "";

  return dateValue.toLocaleDateString("es-GT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const TicketPrint = ({
  patient,
  printFormat = "letter",
  thermalDebugStage = 4,
}) => {
  const [t] = useTranslation("global");

  if (printFormat === "ticket") {
    return <TicketReceiptLayout patient={patient} t={t} />;
  }

  return <LetterTicketLayout patient={patient} t={t} />;
};

const LetterTicketLayout = ({ patient, t }) => {
  const {
    pt_no,
    patient_name,
    guardian_name,
    age_group,
    type_of_visit,
    location_name,
    location_message,
    created_at,
  } = patient || {};

  const date = formatDateValue(created_at);
  const translatedVisitType = type_of_visit ? t(type_of_visit) : "";
  const qrValue = pt_no || "";

  return (
    <>
      <style>{`
        @page {
          size: letter portrait;
          margin: 0.5in;
        }

        @media print {
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div style={styles.page}>
        <div style={styles.ticketCard}>
          <div style={styles.header}>
            <img src={full_logo_bw} alt="logo" style={styles.logo} />
            <div style={styles.locationName}>{location_name}</div>
          </div>

          <div style={styles.rule} />

          <div style={styles.mainContent}>
            <div style={styles.leftColumn}>
              <div style={styles.sectionLabel}>Paciente</div>
              <div style={styles.patientName}>{patient_name}</div>

              {guardian_name && age_group === "child" && (
                <div style={styles.guardianName}>
                  Responsable: {guardian_name}
                </div>
              )}

              <div style={styles.infoBlock}>
                <div style={styles.sectionLabel}>Tipo de visita</div>
                <div style={styles.infoValue}>{translatedVisitType}</div>
              </div>

              <div style={styles.infoBlock}>
                <div style={styles.sectionLabel}>Fecha</div>
                <div style={styles.infoValue}>{date}</div>
              </div>

              <div style={styles.infoBlock}>
                <div style={styles.sectionLabel}>Código de visita</div>
                <div style={styles.visitCode}>{pt_no}</div>
              </div>
            </div>

            <div style={styles.rightColumn}>
              <LetterQR value={qrValue} />
              <div style={styles.qrCaption}>
                Presente este ticket en cada estación.
              </div>
            </div>
          </div>

          {location_message ? (
            <>
              <div style={styles.rule} />
              <div style={styles.messageBox}>{location_message}</div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
};

const TicketReceiptLayout = ({ patient, t }) => {
  const {
    pt_no,
    patient_name,
    guardian_name,
    age_group,
    type_of_visit,
    location_name,
    location_message,
    created_at,
  } = patient || {};

  const date = formatDateValue(created_at);
  const translatedVisitType = type_of_visit ? t(type_of_visit) : "";
  const qrValue = pt_no || "";

  return (
    <>
      <style>{`
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
        }
      `}</style>

      <div
        style={{
          width: "64mm",
          padding: "0 2mm",
          margin: 8,
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "black",
          background: "white",
          boxSizing: "border-box",
        }}
      >
        <div>{location_name || ""}</div>

        <div style={{ borderTop: "1px solid black", margin: "8px 0" }} />

        <div>Paciente: {patient_name || ""}</div>

        {guardian_name && age_group === "child" ? (
          <div>Responsable: {guardian_name}</div>
        ) : null}

        <div>Tipo: {translatedVisitType}</div>
        <div>Fecha: {date}</div>
        <div>Codigo: {pt_no || ""}</div>

        {location_message ? (
          <>
            <div style={{ borderTop: "1px solid black", margin: "8px 0" }} />
            <div style={{ marginTop: "8px" }}>{location_message}</div>
          </>
        ) : null}
        <ReceiptQR value={qrValue} />
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          Presente este ticket en cada estación.
        </div>

        <div style={{ height: "30mm" }} />
      </div>
    </>
  );
};

const LetterBarcode = ({ value }) => {
  const imgSrc = useBarcodeImage(value, {
    format: "CODE128",
    width: 2,
    height: 80,
    displayValue: false,
    margin: 0,
  });

  if (!value || !imgSrc) return null;

  return (
    <div style={styles.qrWrapper}>
      <img src={imgSrc} alt="barcode" style={styles.letterBarcodeImage} />
    </div>
  );
};

const LetterQR = ({ value }) => {
  return (
    <div style={styles.qrWrapper}>
      <QRCodeSvg value={value} size={180} />
    </div>
  );
};

const ReceiptQR = ({ value }) => {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", margin: "10px auto" }}
    >
      <QRCodeSvg value={value} size={150} />
    </div>
  );
};

const QRCodeSvg = ({ value, size = 180 }) => {
  const qr = useMemo(() => {
    if (!value) return null;

    try {
      return QRCode.create(value, {
        errorCorrectionLevel: "M",
        margin: 2,
      });
    } catch (error) {
      console.error("QR generation failed:", error);
      return null;
    }
  }, [value]);

  if (!qr) return null;

  const moduleCount = qr.modules.size;
  const quietZone = 4;
  const viewBoxSize = moduleCount + quietZone * 2;
  const darkModules = [];

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qr.modules.get(row, col)) {
        darkModules.push(
          <rect
            key={`${row}-${col}`}
            x={col + quietZone}
            y={row + quietZone}
            width="1"
            height="1"
          />,
        );
      }
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      style={styles.letterQrImage}
      role="img"
      aria-label="Código QR de visita"
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill="#fff" />
      <g fill="#000">{darkModules}</g>
    </svg>
  );
};

const useBarcodeImage = (value, options) => {
  const [imgSrc, setImgSrc] = useState("");
  const canvasRef = useRef(null);

  const stableOptions = useMemo(() => options, [options]);

  useEffect(() => {
    if (!value) {
      setImgSrc("");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvasRef.current = canvas;

      JsBarcode(canvas, value, stableOptions);

      const dataUrl = canvas.toDataURL("image/png");
      setImgSrc(dataUrl);
    } catch (error) {
      console.error("Failed to build barcode image:", error);
      setImgSrc("");
    }
  }, [value, stableOptions]);

  return imgSrc;
};

const styles = {
  page: {
    width: "100%",
    minHeight: "100vh",
    background: "white",
    color: "black",
    fontFamily: "Arial, Helvetica, sans-serif",
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "0.25in 0",
  },
  ticketCard: {
    width: "100%",
    maxWidth: "9.5in",
    border: "2px solid #000",
    borderRadius: "12px",
    padding: "0.35in",
    boxSizing: "border-box",
    background: "white",
  },
  header: {
    textAlign: "center",
  },
  logo: {
    width: "260px",
    maxWidth: "70%",
    display: "block",
    margin: "0 auto 12px",
  },
  locationName: {
    fontSize: "18px",
    fontWeight: 600,
  },
  rule: {
    borderTop: "2px solid #000",
    margin: "18px 0",
  },
  mainContent: {
    display: "flex",
    gap: "28px",
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  leftColumn: {
    flex: 1,
    minWidth: 0,
  },
  rightColumn: {
    width: "280px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: "6px",
  },
  patientName: {
    fontSize: "30px",
    fontWeight: 700,
    lineHeight: 1.15,
    marginBottom: "10px",
  },
  guardianName: {
    fontSize: "18px",
    marginBottom: "18px",
  },
  infoBlock: {
    marginTop: "16px",
  },
  infoValue: {
    fontSize: "22px",
    lineHeight: 1.25,
  },
  visitCode: {
    fontSize: "18px",
    fontWeight: 700,
    wordBreak: "break-all",
    lineHeight: 1.3,
  },
  qrWrapper: {
    width: "250px",
    minHeight: "140px",
    border: "2px solid #000",
    borderRadius: "10px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px",
    boxSizing: "border-box",
  },
  letterBarcodeImage: {
    display: "block",
    width: "100%",
    height: "auto",
  },
  qrCaption: {
    marginTop: "12px",
    fontSize: "16px",
    textAlign: "center",
    fontWeight: 600,
    lineHeight: 1.35,
  },
  messageBox: {
    textAlign: "center",
    fontSize: "18px",
    lineHeight: 1.4,
    padding: "6px 4px 0",
  },
  letterQrImage: {
    display: "block",
    flexShrink: 0,
  },
};

export default TicketPrint;
