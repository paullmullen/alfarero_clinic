import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Table, Image } from "antd";

import TopBar from "../../layout/TopBar";
import { firestore } from "./../../helpers/firebaseConfig";
import { useHideMenu } from "../../hooks/useHideMenu";
import { useTranslation } from "react-i18next";
import { useServiceLocation } from "../../providers/ServiceLocationProvider";
import IconSizes from "../../helpers/iconSizes";

import { Page, TopHero, TurnoCardWrapper } from "./Turno.styles";
import { getDayWindow } from "./dayWindow";
import { getStationIconSrc } from "./stationIcons";
import { CheckBadge, WaitingBadge } from "./TurnoBadges";
import { buildTurnoTable } from "./buildTurnoTable";
import { useTableScrollY } from "./hooks/useTableScrollY";
import { useAutoScroll } from "./hooks/useAutoScroll";
import { usePatientsToday } from "./hooks/usePatientsToday";

export default function Turno() {
  const { locationId } = useServiceLocation();
  const locationFilterId = locationId === "__ALL__" ? null : locationId;

  const [currentTime, setCurrentTime] = useState(new Date());
  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [currentTime]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useHideMenu(true);
  const [t] = useTranslation("global");

  const [dayWindow, setDayWindow] = useState(() => getDayWindow());

  // midnight rollover
  useEffect(() => {
    const msUntilTomorrow =
      dayWindow.tomorrowDate.getTime() - Date.now() + 1000;
    const timer = setTimeout(
      () => setDayWindow(getDayWindow()),
      Math.max(1000, msUntilTomorrow),
    );
    return () => clearTimeout(timer);
  }, [dayWindow.tomorrowDate]);

  const patients = usePatientsToday({ firestore, dayWindow, locationFilterId });

  const tableRef = useRef(null);
  const scrollingRef = useRef(true);
  const scrollSpeed = 1;

  const iconSize = IconSizes?.width ?? 44;
  const tableScrollY = useTableScrollY(tableRef);

  const renderStationCell = useCallback(
    ({ station, status }) => {
      const norm = String(status || "")
        .trim()
        .toLowerCase();
      if (!norm || norm === "pending") return null;

      const src = getStationIconSrc(station);
      if (!src) return null;

      const showPulse = norm === "in_process"; // keep pulse capability
      const showWaiting = norm === "waiting";
      const showCheck = norm === "complete";

      return (
        <span className="stationIcon">
          {showPulse ? <span className={`pulseRing ${norm}`} /> : null}

          <Image src={src} width={iconSize} height={iconSize} preview={false} />

          {showWaiting ? <WaitingBadge /> : null}
          {showCheck ? <CheckBadge /> : null}
        </span>
      );
    },
    [iconSize],
  );

  const { columns, dataSource } = useMemo(() => {
    return buildTurnoTable({ patients, t, renderStationCell });
  }, [patients, t, renderStationCell]);

  useAutoScroll({
    tableRef,
    scrollingRef,
    scrollSpeed,
    deps: [dataSource], // same behavior as before
  });

  const getRowClassName = (_, index) =>
    index % 2 === 0 ? "even-row" : "odd-row";

  return (
    <Page>
      <TopHero>
        <div className="heroInner">
          <TopBar
            t={t}
            transparent
            formattedTime={formattedTime}
            isDev={false}
          />
        </div>
      </TopHero>

      <TurnoCardWrapper $iconSize={iconSize} style={{ flex: 1, minHeight: 0 }}>
        <div
          className="turnoOuter"
          style={{ flex: 1, minHeight: 0, display: "flex" }}
        >
          <div
            className="turnoCard"
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="turnoTableWrap"
              ref={tableRef}
              style={{ flex: 1, minHeight: 0 }}
            >
              <Table
                rowKey="pt_no"
                columns={columns}
                dataSource={dataSource}
                scroll={{ y: tableScrollY }}
                pagination={false}
                rowClassName={getRowClassName}
              />
            </div>
          </div>
        </div>
      </TurnoCardWrapper>
    </Page>
  );
}
