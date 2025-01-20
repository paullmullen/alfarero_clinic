import React, { useContext, useEffect, useState } from "react";
import {
  Layout,
  Menu,
  Typography,
  Image,
  Row,
  Col,
  Button,
  Popover,
} from "antd";
import {
  UserOutlined,
  ClockCircleOutlined,
  LoginOutlined,
  IdcardOutlined,
  BarChartOutlined,
  CoffeeOutlined,
  OrderedListOutlined,
} from "@ant-design/icons";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  Redirect,
} from "react-router-dom";
import { AlertProvider } from "../hooks/alert";
import { Registro } from "./Registro";
import { Turno } from "./Turno";
import { Escritorio } from "./Escritorio";
import { Member } from "./Member";
import { UiContext } from "../context/UiContext";
import { IngresarHost } from "./IngresarHost";
import { Survey } from "./Survey";
import Stats from "./Stats";
import { cleanPaulTests } from "../helpers/updateStationStatus";

import { Anfitrion } from "./Anfitrion";
import { useTranslation } from "react-i18next";
import full_logo from "../img/full_logo.png";

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

// Info in the side bar

export const RouterPage = () => {
  const { ocultarMenu } = useContext(UiContext);
  const [t] = useTranslation("global");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tapCount, setTapCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // count number of taps... 5 taps opens the admin features for database cleanup.
  const handleHeaderTitleTap = () => {
    setTapCount(tapCount + 1);

    if (tapCount + 1 === 5) {
      setPopoverOpen(true);
    }

    setTimeout(() => {
      setTapCount(0); // Reset tap count after a timeout
    }, 1000); // You can adjust the timeout duration as needed
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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);

    // Cleanup the interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const menuItems = [
    {
      key: "1",
      icon: <LoginOutlined />,
      label: <Link to="/ingresar-host">{t("hostLogin")}</Link>,
    },
    {
      key: "2",
      icon: <CoffeeOutlined />,
      label: <Link to="/anfitrion">{t("pfm")}</Link>,
    },

    {
      key: "3",
      icon: <UserOutlined />,
      label: <Link to="/registro">{t("register")}</Link>,
    },
    {
      key: "4",
      icon: <ClockCircleOutlined />,
      label: <Link to="/turnos">{t("turnTable")}</Link>,
    },
    {
      key: "5",
      icon: <OrderedListOutlined />,
      label: <Link to="/escritorio">{t("desk")}</Link>,
    },
    {
      key: "6",
      icon: <IdcardOutlined />,
      label: <Link to="/member">{t("MEMBERSHIP")}</Link>,
    },
    {
      key: "7",
      icon: <BarChartOutlined />,
      label: <Link to="/estadisticas">{t("statistics")}</Link>,
    },
    {
      key: "8",
      label: t("version"),
    },
  ];

  // Renders the visible screen

  return (
    <Layout style={{ minHeight: "100vh", minWidth: "100%" }}>
      <Router>
        <Sider collapsedWidth="0" breakpoint="lg" hidden={ocultarMenu}>
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={["1"]}
            items={menuItems}
          />
        </Sider>
        <Layout className="site-layout">
          <Header
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              backgroundColor:
                process.env.REACT_APP_FIREBASE_DB !== "" ? "#e6e6fa" : "#fff", // Light purple for non-default DB
              alignItems: "center",
            }}
          >
            <Row>
              <div className="header" />
              <Col xs={24} sm={24} md={24} lg={24}>
                <a href="/registro">
                  <Image
                    src={full_logo}
                    style={{ margin: 0, flex: 1, justifyContent: "flex-start" }}
                    preview={false}
                    height={100}
                    width={185}
                  />
                </a>
              </Col>
            </Row>
            <Row justify="center">
              <Col xs={24} sm={24} md={24} lg={24}>
                <Title level={4}>{formattedTime}</Title>
              </Col>
            </Row>
            <Row justify="center">
              <Col xs={24} sm={24} md={24} lg={24}>
                <div onClick={handleHeaderTitleTap}>
                  <Button
                    onClick={handleHeaderTitleTap}
                    className="no-border-button"
                  >
                    <Title style={{ backgroundColor: "transparent" }} level={4}>
                      {t("headerTitle")}
                    </Title>
                  </Button>
                </div>
                <Popover
                  content={popoverContent}
                  display="none"
                  overlayClassName="noheader-popover"
                  open={popoverOpen}
                  onOpenChange={(open) => setPopoverOpen(open)}
                ></Popover>
              </Col>
            </Row>
          </Header>
          <Content
            className="site-layout-background"
            style={{
              margin: "24px 16px",
              padding: 24,
              minHeight: 280,
            }}
          >
            <AlertProvider>
              <Switch>
                <Route path="/ingresar-host" component={IngresarHost} />
                <Route path="/registro" component={Registro} />
                <Route path="/turnos" component={Turno} />
                <Route path="/escritorio" component={Escritorio} />
                <Route path="/anfitrion" component={Anfitrion} />
                <Route path="/estadisticas" component={Stats} />
                <Route path="/survey" component={Survey} />
                <Route path="/member" component={Member} />
                <Redirect to="/ingresar-host" />
              </Switch>
            </AlertProvider>
          </Content>
        </Layout>
      </Router>
    </Layout>
  );
};
