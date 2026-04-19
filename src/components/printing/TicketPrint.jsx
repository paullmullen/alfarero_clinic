import React from "react";
import full_logo_bw from "../../img/full_logo_bw.gif";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";

const TicketPrint = ({ patient }) => {
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

  const [t] = useTranslation("global");

  const formatDate = (value) => {
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

  const date = formatDate(created_at);
  const translatedVisitType = type_of_visit ? t(type_of_visit) : "";
  const qrValue = pt_no ? `VISIT:${pt_no}` : "";

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
              <div style={styles.qrWrapper}>
                {qrValue ? (
                  <QRCodeSVG
                    value={qrValue}
                    size={220}
                    level="M"
                    includeMargin={true}
                  />
                ) : null}
              </div>
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
  clinicName: {
    fontSize: "24px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    marginBottom: "6px",
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
    minHeight: "250px",
    border: "2px solid #000",
    borderRadius: "10px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px",
    boxSizing: "border-box",
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
};

export default TicketPrint;
