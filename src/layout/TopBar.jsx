import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button, Image, Popover, Typography } from "antd";
import full_logo from "../img/full_logo.png";
import white_logo from "../img/white_logo.png";
import { cleanPaulTests } from "../helpers/updateStationStatus";
import { useServiceLocation } from "../providers/ServiceLocationProvider";

const { Title } = Typography;

export default function TopBar({
  t,
  isDev,
  formattedTime,
  count,
  transparent,
}) {
  const [tapCount, setTapCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const logoSrc = transparent ? white_logo : full_logo;

  const { locations, locationId } = useServiceLocation();

  const locationName = React.useMemo(() => {
    return locations.find((l) => l.id === locationId)?.name || "";
  }, [locations, locationId]);

  const textColor = transparent ? "#fff" : undefined;

  const handleHeaderTitleTap = () => {
    setTapCount((prev) => prev + 1);
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
        Erase testing records
      </Button>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        paddingTop: 14,
        backgroundColor: transparent
          ? "transparent"
          : isDev
            ? "#e6e6fa"
            : "#fff",
        padding: "0 16px",
        height: 32,
        gap: 12,
        minWidth: 0,
        overflow: "visible",
      }}
    >
      {/* Left */}
      <div style={{ flex: "0 0 auto" }}>
        <a href="/loginpage">
          <Image src={logoSrc} preview={false} height={42} width={185} />
        </a>
      </div>

      {/* Center */}
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
            color: textColor,
          }}
        >
          {locationName && (
            <>
              {locationName}
              {" - "}
            </>
          )}
          {formattedTime}

          {/* Only show patients section if count was passed */}
          {typeof count === "number" && (
            <>
              {" – "}
              {count} {t("patients")}
            </>
          )}
        </Title>
      </div>

      {/* Right */}
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
              background: "transparent",
              border: "none",
              boxShadow: "none",
              display: "inline-flex",
              alignItems: "center",
              padding: 0,
              overflow: "visible",
              flexShrink: 0,
              color: textColor,
            }}
          >
            <Title
              level={4}
              style={{
                margin: 0,
                whiteSpace: "nowrap",
                color: textColor,
              }}
            >
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
  count: PropTypes.number, // no longer required
  transparent: PropTypes.bool,
};
