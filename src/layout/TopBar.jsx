import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button, Image, Popover, Typography } from "antd";
import full_logo from "../img/full_logo.png";
import { cleanPaulTests } from "../helpers/updateStationStatus";
import { useServiceLocation } from "../providers/ServiceLocationProvider";

const { Title } = Typography;

export default function TopBar({ t, isDev, formattedTime, count }) {
  const [tapCount, setTapCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { locations, locationId } = useServiceLocation();

  const locationName = React.useMemo(() => {
    return locations.find((l) => l.id === locationId)?.name || "";
  }, [locations, locationId]);

  const handleHeaderTitleTap = () => {
    setTapCount((prev) => prev + 1);

    // open popover on 5 taps within 1 second window
    if (tapCount + 1 === 5) setPopoverOpen(true);

    setTimeout(() => {
      setTapCount(0);
    }, 1000);
  };

  const popoverContent = (
    <div>
      <Button
        onClick={() => {
          cleanPaulTests();
          setPopoverOpen(false);
        }}
      >
        Erase Paul Tests
      </Button>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: isDev ? "#e6e6fa" : "#fff",
        padding: "0 16px",
        height: 64,
        gap: 12,
        minWidth: 0, // important so flex children are allowed to shrink
        overflow: "visible",
      }}
    >
      {/* Left */}
      <div style={{ flex: "0 0 auto" }}>
        <a href="/loginpage">
          <Image src={full_logo} preview={false} height={42} width={185} />
        </a>
      </div>

      {/* Center (this is the one that must be allowed to shrink) */}
      <div
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          textAlign: "center",
          maxWidth: "calc(100% - 260px)",
        }}
      >
        <Title
          level={4}
          style={{
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {locationName && (
            <>
              {locationName}
              {" - "}
            </>
          )}
          {formattedTime}
          {count !== 0 && (
            <>
              {" – "}
              {count} {t("patients")}
            </>
          )}
        </Title>
      </div>

      {/* Right (do NOT allow shrinking) */}
      {/* Right (never shrink) */}
      <div
        style={{
          flexShrink: 0,
          whiteSpace: "nowrap",
          overflow: "visible",
          marginLeft: 12,
          paddingRight: 24,
          boxSizing: "border-box",
        }}
      >
        <div onClick={handleHeaderTitleTap}>
          <Button
            className="no-border-button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: 0,
              overflow: "visible",
              flexShrink: 0,
            }}
          >
            <Title level={4} style={{ margin: 0, whiteSpace: "nowrap" }}>
              {t("headerTitle")}
            </Title>
          </Button>
        </div>

        <Popover
          content={popoverContent}
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
        />
      </div>
    </div>
  );
}

TopBar.propTypes = {
  t: PropTypes.func.isRequired,
  isDev: PropTypes.bool.isRequired,
  formattedTime: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
};
