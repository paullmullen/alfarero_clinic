import React, { useContext, useEffect, useState, Suspense, lazy } from "react";
import { Timestamp } from "firebase/firestore";

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
  // IdcardOutlined,
  BarChartOutlined,
  CoffeeOutlined,
  OrderedListOutlined,
  SettingOutlined,
  // CompassOutlined,
} from "@ant-design/icons";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  Redirect,
} from "react-router-dom";
import { firestore } from "./../helpers/firebaseConfig";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import styled from "styled-components";

import { AlertProvider } from "../hooks/alert";
import { UiContext } from "../context/UiContext";
import { LoginPage } from "./LoginPage";
import { useTranslation } from "react-i18next";
import full_logo from "../img/full_logo.png";
import { cleanPaulTests } from "../helpers/updateStationStatus";

const Registro = lazy(() =>
  import("./Registro").then((module) => ({ default: module.Registro }))
);
const Turno = lazy(() =>
  import("./Turno").then((module) => ({ default: module.Turno }))
);
const Escritorio = lazy(() =>
  import("./Escritorio").then((module) => ({ default: module.Escritorio }))
);
const Member = lazy(() =>
  import("./Member").then((module) => ({ default: module.Member }))
);
const IngresarHost = lazy(() =>
  import("./IngresarHost").then((module) => ({ default: module.IngresarHost }))
);
const Survey = lazy(() =>
  import("./Survey").then((module) => ({ default: module.Survey }))
);
const Settings = lazy(() =>
  import("./Settings").then((module) => ({ default: module.Settings }))
);
const Stats = lazy(() => import("./Stats"));
const Anfitrion = lazy(() =>
  import("./Anfitrion").then((module) => ({ default: module.Anfitrion }))
);

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

const isAlfareroDev = process.env.REACT_APP_FIREBASE_DB !== "";

// Sidebar customization with dynamic styles
const CustomSider = styled(Sider).withConfig({
  shouldForwardProp: (prop) => prop !== "isDev",
})`
  .ant-menu-dark .ant-menu-item-selected {
    background-color: ${(props) =>
      props.isDev ? "#52c41a" : "#1890ff"} !important;
  }

  .ant-menu-dark .ant-menu-item:hover {
    background-color: ${(props) =>
      props.isDev ? "#73d13d" : "#40a9ff"} !important;
  }

  .ant-menu-dark .ant-menu-item-selected a {
    color: #ffffff !important;
  }
`;

export const RouterPage = () => {
  const { ocultarMenu } = useContext(UiContext);
  const [t] = useTranslation("global");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tapCount, setTapCount] = useState(0);
  const [count, setCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);

  // Convert JS Date to Firestore Timestamp
  const todayTimestamp = Timestamp.fromDate(today);
  const tomorrowTimestamp = Timestamp.fromDate(tomorrow);

  const handleHeaderTitleTap = () => {
    setTapCount(tapCount + 1);

    if (tapCount + 1 === 5) {
      setPopoverOpen(true);
    }

    setTimeout(() => {
      setTapCount(0); // Reset tap count after a timeout
    }, 1000);
  };

  /**********************************************************************/
  // This function runs whenever a user has the app open.  It causes a
  // change to the run_aggregation collection in the database.  There is a
  // cloud function that is triggered to run whenever that collection is
  // modified.  That function aggregates statistics for reporting.
  // When the last user closes the app, the function will not run again
  // and the cloud function will stop being triggered, saving cloud costs.
  /**********************************************************************/

  const checkAndUpdateTimestamp = async () => {
    const timestampRef = doc(firestore, "run_aggregation", "timestamp");

    try {
      const docSnapshot = await getDoc(timestampRef);

      if (docSnapshot.exists()) {
        const lastUpdated = docSnapshot.data().last_updated;

        if (lastUpdated instanceof Timestamp) {
          const currentTime = Timestamp.now();
          const diffInSeconds = currentTime.seconds - lastUpdated.seconds;

          if (diffInSeconds >= 60) {
            await updateDoc(timestampRef, { last_updated: serverTimestamp() });
          }
        } else {
          console.error("Timestamp is not of type Firestore Timestamp.");
        }
      } else {
        await setDoc(timestampRef, { last_updated: serverTimestamp() });
        console.log("Timestamp document created with current time.");
      }
    } catch (error) {
      console.error("Error checking or updating timestamp:", error);
    }
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
      checkAndUpdateTimestamp();
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchPatientCount = async () => {
      try {
        const response = await fetch(
          "https://us-central1-alfarero-478ad.cloudfunctions.net/getPatientCount",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              database: process.env.REACT_APP_FIREBASE_DB,
              startTimestamp: todayTimestamp,
              endTimestamp: tomorrowTimestamp,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        console.log(data);
        console.log(data.records);
        setCount(data.records);
        return;
      } catch (error) {
        console.error("Error fetching patients:", error);
        return;
      }
    };
    fetchPatientCount();
  }, [currentTime]);

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
    // {
    //   key: "6",
    //   icon: <IdcardOutlined />,
    //   label: <Link to="/member">{t("MEMBERSHIP")}</Link>,
    // },
    {
      key: "7",
      icon: <BarChartOutlined />,
      label: <Link to="/estadisticas">{t("statistics")}</Link>,
    },
    // {
    //   key: "8",
    //   icon: <CompassOutlined />,
    //   label: <Link to="/location">{t("LOCATION")}</Link>,
    // },
    {
      key: "9",
      icon: <SettingOutlined />,
      label: <Link to="/settings">{t("SETTINGS")}</Link>,
    },
    {
      key: "10",
      label: t("version"),
    },
    // {
    //   key: "11",
    //   icon: <LoginOutlined />,
    //   label: <Link to="/loginpage">{t("NewLogin")}</Link>,
    // },
  ];

  return (
    <Layout style={{ minHeight: "100vh", minWidth: "100%" }}>
      <Router>
        <CustomSider
          collapsedWidth="0"
          breakpoint="lg"
          hidden={ocultarMenu}
          isDev={isAlfareroDev}
        >
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={["1"]}
            items={menuItems}
          />
        </CustomSider>
        <Layout className="site-layout">
          <Header
            style={{
              display: "flex",
              justifyContent: "space-between",
              backgroundColor: isAlfareroDev ? "#e6e6fa" : "#fff",
              alignItems: "center",
            }}
          >
            <Row>
              <Col>
                <a href="/registro">
                  <Image
                    src={full_logo}
                    preview={false}
                    height={42}
                    width={185}
                  />
                </a>
              </Col>
            </Row>
            <Row>
              <Col>
                <Title level={4}>
                  <Title level={4}>
                    {formattedTime}{" "}
                    {count !== 0 && `- ${count} ${t("patients")}`}
                  </Title>
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
          </Header>
          <Content style={{ margin: "24px 16px", padding: 24, minHeight: 280 }}>
            <AlertProvider>
              <Suspense fallback={<div>Loading...</div>}>
                <Switch>
                  <Route path="/ingresar-host" component={IngresarHost} />
                  <Route path="/registro" component={Registro} />
                  <Route path="/turnos" component={Turno} />
                  <Route path="/escritorio" component={Escritorio} />
                  <Route path="/anfitrion" component={Anfitrion} />
                  <Route path="/estadisticas" component={Stats} />
                  <Route path="/survey" component={Survey} />
                  <Route path="/member" component={Member} />
                  {/* <Route path="/location" component={Location} /> */}
                  <Route path="/settings" component={Settings} />
                  <Route path="/loginpage" component={LoginPage} />
                  <Redirect to="/ingresar-host" />
                </Switch>
              </Suspense>
            </AlertProvider>
          </Content>
        </Layout>
      </Router>
    </Layout>
  );
};
