import React, { memo } from "react";
import { Button, Segmented } from "antd";
import { useTranslation } from "react-i18next";

const sectionCardStyle = {
  marginTop: 16,
  background: "#ffffff",
  border: "1px solid #e8e8e8",
  borderRadius: 12,
  padding: 16,
};

const appointmentRowStyle = {
  display: "grid",
  gridTemplateColumns: "140px minmax(220px, 1.5fr) minmax(220px, 1.2fr) 160px",
  gap: 12,
  alignItems: "center",
  padding: "10px 12px",
  borderTop: "1px solid #f0f0f0",
};

const appointmentCellLabelStyle = {
  fontSize: 12,
  color: "#8c8c8c",
  marginBottom: 2,
};

const appointmentCellValueStyle = {
  fontSize: 14,
  color: "#262626",
  lineHeight: 1.35,
};

const mobileAppointmentBlockStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "12px 0",
  borderTop: "1px solid #f0f0f0",
};

const formatNationalId = (rawDigits) => {
  const v = (rawDigits || "").replace(/\D/g, "").slice(0, 13);
  if (v.length <= 4) return v;
  if (v.length <= 9) return `${v.slice(0, 4)} ${v.slice(4)}`;
  return `${v.slice(0, 4)} ${v.slice(4, 9)} ${v.slice(9, 13)}`;
};

const AppointmentList = memo(function AppointmentList({
  appointmentsData,
  appointmentScope,
  setAppointmentScope,
  onAdmit,
  onCancel,
  busyAppointmentId,
}) {
  const [t] = useTranslation("global");

  return (
    <div style={sectionCardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#262626" }}>
            {t("appointment.title")}
          </div>
          <div style={{ fontSize: 13, color: "#8c8c8c", marginTop: 4 }}>
            {t("appointment.subtitle")}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Segmented
            value={appointmentScope}
            onChange={setAppointmentScope}
            options={[
              {
                label: t("appointment.todayOnly"),
                value: "today",
              },
              {
                label: t("appointment.todayAndFuture"),
                value: "future",
              },
            ]}
          />

          <div style={{ fontSize: 13, color: "#595959", fontWeight: 600 }}>
            {appointmentsData.length} {t("appointment.scheduled")}
          </div>
        </div>
      </div>

      {appointmentsData.length === 0 ? (
        <div style={{ padding: "18px 0 6px 0", color: "#8c8c8c" }}>
          {appointmentScope === "today"
            ? t("appointment.noneToday")
            : t("appointment.noneTodayOrFuture")}
        </div>
      ) : (
        <>
          <div className="appointments-desktop" style={{ marginTop: 12 }}>
            {appointmentsData.map((appt) => {
              const isBusy = busyAppointmentId === appt.id;

              return (
                <div key={appt.id} style={appointmentRowStyle}>
                  <div>
                    <div style={appointmentCellLabelStyle}>
                      {t("appointment.time")}
                    </div>
                    <div style={appointmentCellValueStyle}>
                      {appt.appointmentDateTime}
                    </div>
                  </div>

                  <div>
                    <div style={appointmentCellLabelStyle}>{t("patient")}</div>
                    <div style={appointmentCellValueStyle}>
                      <div style={{ fontWeight: 600 }}>{appt.patientName}</div>

                      {appt.nationalIdNumber ? (
                        <div>
                          {t("NATIONAL_ID_NUMBER")}:{" "}
                          {formatNationalId(appt.nationalIdNumber)}
                        </div>
                      ) : null}

                      {appt.phone ? (
                        <div>
                          {t("common.phone")} {appt.phone}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div style={appointmentCellLabelStyle}>
                      {t("appointment.details")}
                    </div>
                    <div style={appointmentCellValueStyle}>
                      {appt.visitType ? <div>{appt.visitType}</div> : null}
                      {appt.reasonForVisit ? (
                        <div>{appt.reasonForVisit}</div>
                      ) : null}
                      {appt.ageGroup || appt.gender ? (
                        <div>
                          {[appt.ageGroup, appt.gender]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <Button
                      onClick={() => onAdmit?.(appt)}
                      loading={isBusy}
                      disabled={isBusy}
                    >
                      {t("appointment.admit")}
                    </Button>
                    <Button
                      danger
                      onClick={() => onCancel?.(appt)}
                      loading={isBusy}
                      disabled={isBusy}
                    >
                      {t("appointment.cancel")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="appointments-mobile"
            style={{ display: "none", marginTop: 12 }}
          >
            {appointmentsData.map((appt) => {
              const isBusy = busyAppointmentId === appt.id;

              return (
                <div
                  key={`${appt.id}-mobile`}
                  style={mobileAppointmentBlockStyle}
                >
                  <div>
                    <div style={appointmentCellLabelStyle}>
                      {t("appointment.time")}
                    </div>
                    <div style={appointmentCellValueStyle}>
                      {appt.appointmentDateTime}
                    </div>
                  </div>

                  <div>
                    <div style={appointmentCellLabelStyle}>{t("patient")}</div>
                    <div style={appointmentCellValueStyle}>
                      <div style={{ fontWeight: 600 }}>{appt.patientName}</div>

                      {appt.nationalIdNumber ? (
                        <div>
                          {t("NATIONAL_ID_NUMBER")}:{" "}
                          {formatNationalId(appt.nationalIdNumber)}
                        </div>
                      ) : null}

                      {appt.phone ? (
                        <div>
                          {t("common.phone")} {appt.phone}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div style={appointmentCellLabelStyle}>
                      {t("appointment.details")}
                    </div>
                    <div style={appointmentCellValueStyle}>
                      {appt.visitType ? <div>{appt.visitType}</div> : null}
                      {appt.reasonForVisit ? (
                        <div>{appt.reasonForVisit}</div>
                      ) : null}
                      {appt.location ? <div>{appt.location}</div> : null}
                      {appt.ageGroup || appt.gender ? (
                        <div>
                          {[appt.ageGroup, appt.gender]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      block
                      onClick={() => onAdmit?.(appt)}
                      loading={isBusy}
                      disabled={isBusy}
                    >
                      {t("appointment.admit")}
                    </Button>
                    <Button
                      danger
                      block
                      onClick={() => onCancel?.(appt)}
                      loading={isBusy}
                      disabled={isBusy}
                    >
                      {t("appointment.cancel")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});

export default AppointmentList;
