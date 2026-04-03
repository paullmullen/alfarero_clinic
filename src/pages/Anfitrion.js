import React, {
  useEffect,
  useState,
  useMemo,
  lazy,
  Suspense,
  useCallback,
} from "react";
import {
  Table,
  Space,
  Popover,
  Popconfirm,
  Modal,
  Form,
  Select,
  Input,
  message,
} from "antd";
import {
  collection,
  query,
  where,
  Timestamp,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { fetchData } from "../helpers/fetchData";
import { firestore, auth } from "./../helpers/firebaseConfig";
import { handleDelete } from "./../helpers/updateStationStatus";
import { handleStatusChangeV2 } from "./../helpers/updateStationStatusV2";
import { useNavigate } from "react-router-dom";
import { useHideMenu } from "../hooks/useHideMenu";
import { AlertInfo } from "../components/AlertInfo";
import { useTranslation } from "react-i18next";
import IconSizes from "../helpers/iconSizes";
import fin from "../img/fin.png";
import edit from "../img/edit.svg";
import addToRoute from "../img/add-to-route.svg";
import { getTodayAndTomorrowTimestamps } from "../helpers/dateHelpers";
import { useServiceLocation } from "../providers/ServiceLocationProvider";
import AppointmentList from "../components/anfitrion/AppointmentList";
import useAnfitrionAppointments from "../hooks/useAnfitrionAppointments";
import useCancellationReasons from "../hooks/useCancellationReasons";
import {
  getPlanOfCareIcon,
  getPlannedRouteIcon,
} from "../helpers/getPlanOfCareIcon";

const { TextArea } = Input;
const EditPatientData = lazy(() => import("../components/EditPatientData.js"));

const formatNationalId = (rawDigits) => {
  const v = (rawDigits || "").replace(/\D/g, "").slice(0, 13);
  if (v.length <= 4) return v;
  if (v.length <= 9) return `${v.slice(0, 4)} ${v.slice(4)}`;
  return `${v.slice(0, 4)} ${v.slice(4, 9)} ${v.slice(9, 13)}`;
};

const Anfitrion = () => {
  useHideMenu(true);

  const [rowsRaw, setRowsRaw] = useState([]);
  const [statsData, setStatsData] = useState([]);
  const [appointmentScope, setAppointmentScope] = useState("today");
  const [busyAppointmentId, setBusyAppointmentId] = useState(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelForm] = Form.useForm();

  const [t] = useTranslation("global");
  const navigate = useNavigate();

  const { todayTimestamp, tomorrowTimestamp } = useMemo(
    () => getTodayAndTomorrowTimestamps(),
    [],
  );

  const { locationId, selectedLocation } = useServiceLocation();

  const locationFilterId = locationId === "__ALL__" ? null : locationId;
  const locationFilterName =
    locationId === "__ALL__" ? null : selectedLocation?.name || null;

  const { activeReasons, loadingReasons } = useCancellationReasons();

  useEffect(() => {
    const baseConstraints = [
      where("start_time", ">=", todayTimestamp),
      where("start_time", "<", tomorrowTimestamp),
      where("complete", "==", false),
    ];

    const constraints = locationFilterId
      ? [...baseConstraints, where("location_id", "==", locationFilterId)]
      : baseConstraints;

    const q = query(collection(firestore, "patients"), ...constraints);

    const unsubscribePatients = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRowsRaw(rows);
    });

    return () => unsubscribePatients();
  }, [todayTimestamp, tomorrowTimestamp, locationFilterId]);

  const { appointmentsData } = useAnfitrionAppointments({
    todayTimestamp,
    tomorrowTimestamp,
    appointmentScope,
    locationFilterName,
  });

  useEffect(() => {
    let isMounted = true;
    const dateRange = [todayTimestamp, tomorrowTimestamp];

    fetchData({
      dateRange,
      setData: () => {},
      setPatientsChanged: () => {},
      setStatsData,
      isMounted,
    });

    return () => {
      isMounted = false;
    };
  }, [todayTimestamp, tomorrowTimestamp, setStatsData]);

  const stationMetrics = useMemo(() => {
    const map = new Map();
    statsData.forEach((s) => {
      if (s?.station_type) map.set(s.station_type, s);
    });
    return map;
  }, [statsData]);

  const stationNames = useMemo(() => {
    const stations = statsData
      .filter(
        (s) =>
          !!s.station_type && (s.display === undefined || s.display === true),
      )
      .map((s) => ({
        name: s.station_type,
        order:
          typeof s.sort_order === "number"
            ? s.sort_order
            : Number.POSITIVE_INFINITY,
      }));

    const orderMap = new Map();
    stations.forEach(({ name, order }) => {
      if (!orderMap.has(name)) {
        orderMap.set(name, order);
      } else {
        orderMap.set(name, Math.min(orderMap.get(name), order));
      }
    });

    return Array.from(orderMap.entries())
      .sort((a, b) => {
        const [nameA, orderA] = a;
        const [nameB, orderB] = b;
        if (orderA !== orderB) return orderA - orderB;
        return String(nameA).localeCompare(String(nameB));
      })
      .map(([name]) => name);
  }, [statsData]);

  const dataSource = useMemo(() => {
    if (!Array.isArray(rowsRaw)) return [];

    const toMs = (val) => {
      if (val instanceof Timestamp) return val.toMillis();
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
    };

    const nowMs = Timestamp.now().toMillis();

    const sorted = [...rowsRaw].sort(
      (a, b) => toMs(a?.start_time) - toMs(b?.start_time),
    );

    return sorted.map((item) => {
      const stations = {};
      const elapsedMinsCandidates = [];

      (item.plan_of_care ?? []).forEach((plan) => {
        stations[plan.station] = {
          status: plan.status,
          route_order: plan.route_order,
        };

        if (
          plan.status === "waiting" &&
          plan.waiting_start instanceof Timestamp
        ) {
          elapsedMinsCandidates.push(
            Math.floor((nowMs - plan.waiting_start.toMillis()) / 60000),
          );
        } else if (
          plan.status === "in_process" &&
          plan.in_process_start instanceof Timestamp
        ) {
          elapsedMinsCandidates.push(
            Math.floor((nowMs - plan.in_process_start.toMillis()) / 60000),
          );
        }
      });

      const current_process = elapsedMinsCandidates.length
        ? Math.max(...elapsedMinsCandidates)
        : 0;

      const minutesSinceStart = Math.round(
        (nowMs - toMs(item.start_time)) / 60000,
      );

      const displayName =
        (item.patient_name ?? "") +
        (item.guardian_name ? ` (${item.guardian_name})` : "");

      return {
        pt_no: item.pt_no,
        raw_patient_name: item.patient_name ?? "",
        guardian_name: item.guardian_name ?? "",
        age_group: item.age_group ?? null,
        national_id_number: item.national_id_number ?? "",
        reason_for_visit: item.reason_for_visit ?? "",
        tel: item.tel ?? "",
        type_of_visit: item.type_of_visit ?? "",
        patient_name:
          displayName +
          "\n" +
          (item.national_id_number ?? "") +
          "\n" +
          (item.reason_for_visit ?? "") +
          "\n" +
          t(item.type_of_visit) +
          "\n" +
          (item.tel ?? " "),
        wtg_time: `${current_process}\n${minutesSinceStart}`,
        ...stations,
      };
    });
  }, [rowsRaw, t]);

  const STATUS_CHOICES = useMemo(
    () => ["pending", "planned", "waiting", "in_process", "obs", "complete"],
    [],
  );

  const renderStatusChoice = useCallback(
    (nextStatus, stationName, pt_no, routeOrder, iconScale = 1.5) => {
      const handleClick = async () => {
        try {
          await handleStatusChangeV2(nextStatus, pt_no, stationName);
        } catch (error) {
          console.error("Failed to update status via V2 helper", error);
        }
      };

      if (nextStatus === "planned") {
        const plannedSrc = getPlannedRouteIcon(routeOrder);

        if (plannedSrc) {
          return (
            <img
              key={`${stationName}-planned`}
              src={plannedSrc}
              width={IconSizes.width * iconScale}
              height={IconSizes.height * iconScale}
              loading="lazy"
              decoding="async"
              alt=""
              style={{ cursor: "pointer" }}
              onClick={handleClick}
            />
          );
        }

        return (
          <img
            key={`${stationName}-planned`}
            src={addToRoute}
            width={IconSizes.width * iconScale}
            height={IconSizes.height * iconScale}
            loading="lazy"
            decoding="async"
            alt="add to route"
            style={{ cursor: "pointer" }}
            onClick={handleClick}
          />
        );
      }

      const src = getPlanOfCareIcon(nextStatus);

      if (!src) return null;

      return (
        <img
          key={`${stationName}-${nextStatus}`}
          src={src}
          width={IconSizes.width * iconScale}
          height={IconSizes.height * iconScale}
          loading="lazy"
          decoding="async"
          alt=""
          style={{ cursor: "pointer" }}
          onClick={handleClick}
        />
      );
    },
    [],
  );

  const renderStatusIcon = useCallback(
    (step, stationName, pt_no) => {
      const status = step && typeof step === "object" ? step.status : step;

      const routeOrder =
        step && typeof step === "object" ? step.route_order : undefined;

      const src = getPlanOfCareIcon(status, routeOrder);

      const iconScale = 1.5;
      const popContent = (
        <Space wrap>
          {STATUS_CHOICES.map((nextStatus) =>
            renderStatusChoice(
              nextStatus,
              stationName,
              pt_no,
              routeOrder,
              iconScale,
            ),
          )}
        </Space>
      );

      if (!src) return null;

      return (
        <Popover content={popContent} title={t("modifyStatus")} trigger="hover">
          <img
            src={src}
            width={IconSizes.height}
            height={IconSizes.height}
            loading="lazy"
            decoding="async"
            alt=""
          />
        </Popover>
      );
    },
    [STATUS_CHOICES, t, renderStatusChoice],
  );

  const columns = useMemo(() => {
    const patientCol = {
      title: t("patient"),
      dataIndex: "patient_name",
      key: "patient",
      fixed: "left",
      render: (name, record) => (
        <table>
          <tbody>
            <tr>
              <td>
                <b> {String(name).split("\n")[0]} </b>
                <br /> {t("NATIONAL_ID_NUMBER")}:{" "}
                {formatNationalId(String(name).split("\n")[1])}
                <br /> {String(name).split("\n")[2]} <br />
                <i>{String(name).split("\n")[3]} </i>
                <br />
                {t("common.phone")} {String(name).split("\n")[4]}{" "}
              </td>
              <td align="right">
                <Popover
                  content={
                    <Suspense
                      fallback={
                        <div style={{ padding: 8 }}>{t("common.loading")}</div>
                      }
                    >
                      <EditPatientData
                        initialValues={{
                          paciente: record.raw_patient_name ?? "",
                          national_id_number: record.national_id_number ?? "",
                          tel: record.tel ?? "",
                          motivo: record.reason_for_visit ?? "",
                          guardian_name: record.guardian_name ?? "",
                          age_group: record.age_group ?? null,
                          pt_no: record.pt_no,
                        }}
                        onSave={() => console.log("Patient data saved")}
                      />
                    </Suspense>
                  }
                  title={t("EDITPATIENTDATA")}
                  trigger="click"
                >
                  <img
                    src={edit}
                    width={IconSizes.height}
                    height={IconSizes.height}
                    loading="lazy"
                    decoding="async"
                    alt=""
                    style={{ cursor: "pointer" }}
                  />
                </Popover>
              </td>
            </tr>
          </tbody>
        </table>
      ),
    };

    const stationCols = stationNames.map((stationName) => {
      const metrics = stationMetrics.get(stationName) || {};
      const avgMs = metrics.avg_waiting_time ?? 0;
      const maxSec = metrics.max_waiting_time ?? 0;
      const isOverLimit = avgMs / 1000 > maxSec;
      const waitTextMin = Math.round(avgMs / 60000);

      return {
        dataIndex: stationName,
        key: stationName,
        title: (
          <div>
            {t(stationName)}
            <div
              className="wait_times"
              style={{
                color: isOverLimit ? "red" : "black",
                fontWeight: isOverLimit ? "bold" : "normal",
              }}
            >
              {waitTextMin}m
            </div>
          </div>
        ),
        render: (step, row) => renderStatusIcon(step, stationName, row.pt_no),
        width: IconSizes.width,
        align: "center",
      };
    });

    const waitingCol = {
      title: t("waitingTime"),
      dataIndex: "wtg_time",
      key: "wtg_time",
      width: 70,
      align: "center",
      fixed: "right",
      render: (wtg_time) => {
        const displayValue = Number(String(wtg_time).split("\n")[0]) || 0;
        const style = {
          fontSize: "18px",
          color: displayValue > 15 ? "red" : "black",
        };
        return (
          <span style={style}>
            {String(wtg_time).split("\n")[0]} {t("common.minutesShort")} <hr />
            <h5>
              {String(wtg_time).split("\n")[1]} {t("common.minutesShort")}
            </h5>
          </span>
        );
      },
    };

    const actionCol = {
      title: t("action"),
      dataIndex: "pt_no",
      key: "estado",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Popconfirm
          title={t("areYouSure")}
          onConfirm={() => handleDelete(record.pt_no, navigate)}
        >
          <img
            src={fin}
            width={IconSizes.height}
            height={IconSizes.height}
            loading="lazy"
            decoding="async"
            alt=""
            style={{ cursor: "pointer" }}
          />
        </Popconfirm>
      ),
    };

    return [patientCol, ...stationCols, waitingCol, actionCol];
  }, [t, stationNames, stationMetrics, navigate, renderStatusIcon]);

  const getRowClassName = (record, index) => {
    const allPendingOrComplete = stationNames.every((st) => {
      const cell = record[st];
      const status = cell && typeof cell === "object" ? cell.status : cell;
      return status === "pending" || status === "complete";
    });

    return allPendingOrComplete
      ? "highlight-row"
      : index % 2 === 0
        ? "even-row"
        : "odd-row";
  };

  const openCancelModal = useCallback(
    (appointment) => {
      setAppointmentToCancel(appointment);
      cancelForm.setFieldsValue({
        cancellationReasonCode: undefined,
        cancellationNotes: "",
      });
      setCancelModalOpen(true);
    },
    [cancelForm],
  );

  const closeCancelModal = useCallback(() => {
    setCancelModalOpen(false);
    setAppointmentToCancel(null);
    cancelForm.resetFields();
  }, [cancelForm]);

  const handleAdmitAppointment = async (appointment) => {
    setBusyAppointmentId(appointment.id);
    try {
      console.log("Admit appointment", appointment);
    } finally {
      setBusyAppointmentId(null);
    }
  };

  const handleCancelAppointment = async (appointment) => {
    openCancelModal(appointment);
  };

  const submitCancelAppointment = async () => {
    if (!appointmentToCancel?.id) return;

    let values;
    try {
      values = await cancelForm.validateFields();
    } catch {
      return;
    }

    setBusyAppointmentId(appointmentToCancel.id);

    try {
      await updateDoc(doc(firestore, "appointments", appointmentToCancel.id), {
        status: "cancelled",
        cancelled: true,
        cancelledAt: serverTimestamp(),
        cancelledBy: auth?.currentUser?.uid || null,
        cancellationReasonCode: values.cancellationReasonCode,
        cancellationNotes: values.cancellationNotes?.trim() || "",
        updatedAt: serverTimestamp(),
      });

      message.success(t("appointments.cancelSuccess"));
      closeCancelModal();
    } catch (error) {
      console.error("Error cancelling appointment", error);
      message.error(t("appointments.cancelError"));
    } finally {
      setBusyAppointmentId(null);
    }
  };

  const cancellationReasonOptions = useMemo(() => {
    return (activeReasons || []).map((reason) => {
      const normalizedCode = String(reason?.code || "")
        .trim()
        .toLowerCase();

      return {
        value: normalizedCode,
        label: t(`cancellationReasons.${normalizedCode}`, {
          defaultValue: normalizedCode,
        }),
      };
    });
  }, [activeReasons, t]);

  return (
    <>
      <AlertInfo />

      <Table
        rowKey={"pt_no"}
        columns={columns}
        dataSource={
          Array.isArray(rowsRaw) && rowsRaw.some((d) => d === undefined)
            ? []
            : dataSource
        }
        pagination={false}
        scroll={{ y: 850 }}
        sticky={{ offsetHeader: 0 }}
        rowClassName={getRowClassName}
      />

      <AppointmentList
        appointmentsData={appointmentsData}
        appointmentScope={appointmentScope}
        setAppointmentScope={setAppointmentScope}
        onAdmit={handleAdmitAppointment}
        onCancel={handleCancelAppointment}
        busyAppointmentId={busyAppointmentId}
      />

      <Modal
        open={cancelModalOpen}
        title={t("appointments.cancelModalTitle")}
        onCancel={closeCancelModal}
        onOk={submitCancelAppointment}
        okText={t("appointment.cancel")}
        cancelText={t("common.cancel")}
        confirmLoading={
          !!appointmentToCancel?.id &&
          busyAppointmentId === appointmentToCancel.id
        }
        destroyOnHidden
      >
        <div style={{ marginBottom: 16 }}>
          <strong>{appointmentToCancel?.patientName || "—"}</strong>
          <div style={{ marginTop: 4, color: "#666" }}>
            {appointmentToCancel?.appointmentDateTime ||
              t("appointment.noDate")}
          </div>
          {!!appointmentToCancel?.location && (
            <div style={{ marginTop: 4, color: "#666" }}>
              {appointmentToCancel.location}
            </div>
          )}
        </div>

        <Form form={cancelForm} layout="vertical">
          <Form.Item
            label={t("appointments.cancellationReason")}
            name="cancellationReasonCode"
            rules={[
              {
                required: true,
                message: t("appointments.cancellationReasonRequired"),
              },
            ]}
          >
            <Select
              showSearch
              loading={loadingReasons}
              options={cancellationReasonOptions}
              placeholder={t("appointments.selectCancellationReason")}
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item
            label={t("appointments.cancellationNotes")}
            name="cancellationNotes"
          >
            <TextArea
              rows={3}
              maxLength={500}
              placeholder={t("appointments.cancellationNotesPlaceholder")}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Anfitrion;
