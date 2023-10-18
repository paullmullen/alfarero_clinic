import React from "react";
import QRCode from "qrcode.react";
export const CardPrint = React.forwardRef(
  (
    {
      qrCodeData,
      patientName,
      membershipText,
      membershipColor,
      membershipFontColor,
      imageUrl,
    },
    ref
  ) => {

    return (
      <div className="card-print" ref={ref}>
        <div>
          <QRCode value={qrCodeData || ";"} />
        </div>
        <div align="center">
          <h2>{patientName}</h2>
          <h1
            style={{
              backgroundColor: membershipColor,
              color: membershipFontColor,
            }}
          >
            {membershipText}foo
          </h1>
          <img src={imageUrl} alt="Membership Card" />
        </div>
      </div>
    );
  }
);

export default CardPrint;
