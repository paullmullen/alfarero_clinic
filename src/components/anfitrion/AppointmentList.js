import React, { useMemo } from "react";
import { Button, Empty, Segmented } from "antd";
import { useTranslation } from "react-i18next";

const sectionCardStyle = {
  marginTop: 16,
  background: "#ffffff",
  border: "1px solid #e8e8e8",
  borderRadius: 12,
  padding: 16,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 12,
};

const headerCellStyle = {
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "#595959",
  padding: "10px 8px",
  borderBottom: "1px solid #f0f0f0",
  whiteSpace: "nowrap",
};

const bodyCellStyle = {
  fontSize: 13,
  color: "#262626",
  padding: "10px 8px",
  borderBottom: "1px solid #f5f5f5",
  verticalAlign: "top",
};

const secondaryLineStyle = {
  color: "#8c8c8c",
  fontSize: 12,
  marginTop: 2,
};

const actionsCellStyle = {
  ...bodyCellStyle,
  whiteSpace: "nowrap",
};

export default function AppointmentList({
  appointmentsData = [],
  appointmentScope,
  setAppointmentScope,
  onAdmit,
  onCancel,
  busyAppointmentId,
}) {
  const [t] = useTranslation("global");

  const sortedAppointments = useMemo(() => {
    return [...appointmentsData].sort((a, b) => {
      const aTime = a?.appointmentDateTime || "";
      const bTime = b?.appointmentDateTime || "";
      return String(aTime).localeCompare(String(bTime));
    });
  }, [appointmentsData]);

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
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {t("appointment.title")}
          </div>
          <div style={{ fontSize: 13, color: "#8c8c8c", marginTop: 2 }}>
            {t("appointment.subtitle")}
          </div>
        </div>

        <Segmented
          value={appointmentScope}
          onChange={setAppointmentScope}
          options={[
            { label: t("appointment.todayOnly"), value: "today" },
            { label: t("appointment.todayAndFuture"), value: "future" },
          ]}
        />
      </div>

      {sortedAppointments.length === 0 ? (
        <div style={{ marginTop: 18 }}>
          <Empty description={t("appointment.noneFound")} />
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headerCellStyle}>{t("appointment.time")}</th>
                <th style={headerCellStyle}>{t("appointment.patient")}</th>
                <th style={headerCellStyle}>{t("appointment.details")}</th>
                <th style={headerCellStyle}>{t("appointment.actions")}</th>
              </tr>
            </thead>

            <tbody>
              {sortedAppointments.map((appointment, index) => {
                const isBusy = busyAppointmentId === appointment.id;

                return (
                  <tr
                    key={appointment.id}
                    style={{
                      background: index % 2 === 0 ? "#ffffff" : "#fafafa",
                    }}
                  >
                    <td style={bodyCellStyle}>
                      <div>{appointment.appointmentDateTime || "—"}</div>
                      {!!appointment.location && (
                        <div style={secondaryLineStyle}>
                          {appointment.location}
                        </div>
                      )}
                    </td>

                    <td style={bodyCellStyle}>
                      <div style={{ fontWeight: 600 }}>
                        {appointment.patientName || "—"}
                      </div>

                      {!!appointment.nationalIdNumber && (
                        <div style={secondaryLineStyle}>
                          {t("appointment.dpi")}: {appointment.nationalIdNumber}
                        </div>
                      )}

                      {!!appointment.phone && (
                        <div style={secondaryLineStyle}>
                          {t("appointment.phone")}: {appointment.phone}
                        </div>
                      )}
                    </td>

                    <td style={bodyCellStyle}>
                      {!!appointment.reasonForVisit && (
                        <div>{appointment.reasonForVisit}</div>
                      )}

                      <div style={secondaryLineStyle}>
                        {[
                          appointment.visitType,
                          appointment.ageGroup,
                          appointment.gender,
                        ]
                          .filter(Boolean)
                          .join(" • ") || "—"}
                      </div>
                    </td>

                    <td style={actionsCellStyle}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <Button
                          size="small"
                          danger
                          onClick={() => onCancel?.(appointment)}
                          loading={isBusy}
                        >
                          {t("appointment.cancel")}
                        </Button>

                        <Button
                          size="small"
                          type="primary"
                          onClick={() => onAdmit?.(appointment)}
                          loading={isBusy}
                        >
                          {t("appointment.admit")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
