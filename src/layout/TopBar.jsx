import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button, Col, Image, Popover, Row, Typography } from "antd";
import full_logo from "../img/full_logo.png";
import { cleanPaulTests } from "../helpers/updateStationStatus";

const { Title } = Typography;

export default function TopBar({ t, isDev, formattedTime, count }) {
  const [tapCount, setTapCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);

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
        justifyContent: "space-between",
        backgroundColor: isDev ? "#e6e6fa" : "#fff",
        alignItems: "center",
        padding: "0 16px",
        height: 64,
      }}
    >
      <Row>
        <Col>
          <a href="/loginpage">
            <Image src={full_logo} preview={false} height={42} width={185} />
          </a>
        </Col>
      </Row>

      <Row>
        <Col>
          <Title level={4}>
            {formattedTime} {count !== 0 && `- ${count} ${t("patients")}`}
          </Title>
        </Col>
      </Row>

      <Row>
        <Col>
          <div onClick={handleHeaderTitleTap}>
            <Button className="no-border-button">
              <Title level={4}>{t("headerTitle")}</Title>
            </Button>
          </div>

          <Popover
            content={popoverContent}
            open={popoverOpen}
            onOpenChange={setPopoverOpen}
          />
        </Col>
      </Row>
    </div>
  );
}

TopBar.propTypes = {
  t: PropTypes.func.isRequired,
  isDev: PropTypes.bool.isRequired,
  formattedTime: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
};
