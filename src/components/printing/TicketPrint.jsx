import React from "react";
import full_logo_bw from "../../img/full_logo_bw.gif";
import { useTranslation } from "react-i18next";
import { Divider } from "antd";
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
  } = patient;

  const [t] = useTranslation("global");

  const displayName = (
    <>
      <div>
        <strong>{patient_name}</strong>
      </div>

      {guardian_name && age_group === "child" && (
        <div>(Responsable: {guardian_name})</div>
      )}
    </>
  );

  const date = created_at.toLocaleDateString("es-GT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div style={styles.ticket}>
      <img src={full_logo_bw} alt="logo" style={styles.logo} />

      <div style={styles.center}>
        <strong>MULTIMEDICA ALFARERO</strong>
        <div>{location_name}</div>
      </div>
      <Divider />
      <div style={styles.center}>
        <div>{displayName}</div>
        <Divider />
        <div>{t(type_of_visit)}</div>
        <div>{date}</div>
      </div>

      <div style={styles.qrWrapper}>
        <QRCodeSVG value={pt_no} size={160} level="M" includeMargin={true} />
      </div>

      <div style={styles.footer}>Traiga este ticket a cada estación.</div>
      {location_message && <div style={styles.message}>{location_message}</div>}
    </div>
  );
};

const styles = {
  ticket: {
    width: "58mm",
    padding: "8px",
    fontFamily: "monospace",
    background: "white",
    color: "black",
  },
  logo: {
    width: "60%",
    display: "block",
    margin: "0 auto 8px",
  },
  center: {
    textAlign: "center",
    marginBottom: "8px",
  },
  section: {
    marginBottom: "10px",
    fontSize: "12px",
  },
  barcodeWrapper: {
    textAlign: "center",
    margin: "10px 0",
  },
  barcodeText: {
    textAlign: "center",
    fontSize: "10px",
    marginBottom: "10px",
  },
  message: {
    textAlign: "center",
    fontSize: "10px",
    marginTop: "8px",
    marginBottom: "8px",
    borderTop: "1px solid #000",
    paddingTop: "8px",
    borderBottom: "1px solid #000",
    paddingBottom: "8px",
  },
  footer: {
    textAlign: "center",
    fontSize: "10px",
    marginBottom: "25px",
  },
  qrWrapper: {
    display: "flex",
    justifyContent: "center",
    margin: "12px 0",
  },
};

export default TicketPrint;
