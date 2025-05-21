import React, {
  useContext,
  useEffect,
  useState,
  Suspense,
  lazy,
  createContext,
} from "react";
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
  IdcardOutlined,
  BarChartOutlined,
  CoffeeOutlined,
  OrderedListOutlined,
  SettingOutlined,
  CompassOutlined,
} from "@ant-design/icons";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { firestore, auth } from "./../helpers/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ProtectedRoute } from "./../components/ProtectedRoute";
import styled from "styled-components";
import { AlertProvider } from "../hooks/alert";
import { UiContext } from "../context/UiContext";
import { useTranslation } from "react-i18next";
import full_logo from "../img/full_logo.png";
import { cleanPaulTests } from "../helpers/updateStationStatus";
import PropTypes from "prop-types";

// PermissionsContext
const PermissionsContext = createContext({
  permissions: null,
  loading: true,
  user: null,
  setUserPermissions: () => {},
});

export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(firestore, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            let perms = userSnap.data().permissions || {
              host: false,
              settings: false,
              stats: false,
            };
            if (Array.isArray(perms)) {
              perms = perms[0] || {
                host: false,
                settings: false,
                stats: false,
              };
              console.warn(
                "Converting array-based permissions to object:",
                perms
              );
            }
            setPermissions(perms);
          } else {
            setPermissions({ host: false, settings: false, stats: false });
          }
        } catch (error) {
          console.error("Error fetching user permissions:", error);
          setPermissions({ host: false, settings: false, stats: false });
        }
      } else {
        setPermissions(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setUserPermissions = (newPermissions) => {
    setPermissions(newPermissions);
  };

  return (
    <PermissionsContext.Provider
      value={{ permissions, loading, user, setUserPermissions }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

PermissionsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const usePermissions = () => {
  return useContext(PermissionsContext);
};

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
const Location = lazy(() =>
  import("./Location").then((module) => ({ default: module.Location }))
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
const LoginPage = lazy(() =>
  import("./LoginPage").then((module) => ({ default: module.LoginPage }))
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

// Sub-component for the main layout
const MainLayout = ({ ocultarMenu, t, permissions, children }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tapCount, setTapCount] = useState(0);
  const [count, setCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);

  const todayTimestamp = Timestamp.fromDate(today);
  const tomorrowTimestamp = Timestamp.fromDate(tomorrow);

  const handleHeaderTitleTap = () => {
    setTapCount(tapCount + 1);
    if (tapCount + 1 === 5) {
      setPopoverOpen(true);
    }
    setTimeout(() => {
      setTapCount(0);
    }, 1000);
  };

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
        setCount(data.records);
      } catch (error) {
        console.error("Error fetching patients:", error);
      }
    };
    fetchPatientCount();
  }, [currentTime, todayTimestamp, tomorrowTimestamp]);

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const rawMenuItems = [
    {
      key: "1",
      icon: <LoginOutlined />,
      label: <Link to="/ingresar-host">{t("hostLogin")}</Link>,
      disabled: !permissions?.basic,
    },
    {
      key: "2",
      icon: <CoffeeOutlined />,
      label: <Link to="/anfitrion">{t("pfm")}</Link>,
      disabled: !permissions?.host,
    },
    {
      key: "3",
      icon: <UserOutlined />,
      label: <Link to="/registro">{t("register")}</Link>,
      disabled: !permissions?.host,
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
      disabled: !permissions?.basic,
    },
    {
      key: "6",
      icon: <IdcardOutlined />,
      label: <Link to="/member">{t("MEMBERSHIP")}</Link>,
      disabled: !permissions?.basic,
    },
    {
      key: "7",
      icon: <BarChartOutlined />,
      label: <Link to="/estadisticas">{t("statistics")}</Link>,
      disabled: !permissions?.stats,
    },
    {
      key: "8",
      icon: <CompassOutlined />,
      label: <Link to="/location">{t("LOCATION")}</Link>,
      disabled: !permissions?.basic,
    },
    {
      key: "9",
      icon: <SettingOutlined />,
      label: <Link to="/settings">{t("SETTINGS")}</Link>,
      disabled: !permissions?.settings,
    },
    {
      key: "10",
      icon: <LoginOutlined />,
      label: <Link to="/loginpage">{t("Login")}</Link>,
    },
    {
      key: "11",
      label: t("version"),
    },
  ];

  const menuItems = rawMenuItems.filter((item) => !item.disabled);

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
                <a href="/loginpage">
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
          </Header>
          <Content style={{ margin: "24px 16px", padding: 24, minHeight: 280 }}>
            <AlertProvider>{children}</AlertProvider>
          </Content>
        </Layout>
      </Router>
    </Layout>
  );
};

MainLayout.propTypes = {
  ocultarMenu: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
  permissions: PropTypes.object,
  children: PropTypes.node.isRequired,
};

export const RouterPage = () => {
  const { ocultarMenu } = useContext(UiContext);
  const [t] = useTranslation("global");
  const { permissions, user, loading } = usePermissions();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MainLayout ocultarMenu={ocultarMenu} t={t} permissions={permissions}>
        {loading ? (
          <div>Loading...</div>
        ) : !user ? (
          <LoginPage />
        ) : (
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/registro"
              element={
                <ProtectedRoute requiredPermission="host">
                  <Registro />
                </ProtectedRoute>
              }
            />
            <Route path="/turnos" element={<Turno />} />
            <Route
              path="/escritorio"
              element={
                <ProtectedRoute requiredPermission="basic">
                  <Escritorio />
                </ProtectedRoute>
              }
            />
            <Route
              path="/member"
              element={
                <ProtectedRoute requiredPermission="basic">
                  <Member />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ingresar-host"
              element={
                <ProtectedRoute requiredPermission="basic">
                  <IngresarHost />
                </ProtectedRoute>
              }
            />
            <Route
              path="/location"
              element={
                <ProtectedRoute requiredPermission="basic">
                  <Location />
                </ProtectedRoute>
              }
            />
            <Route
              path="/survey"
              element={
                <ProtectedRoute requiredPermission="basic">
                  <Survey />
                </ProtectedRoute>
              }
            />
            <Route
              path="/estadisticas"
              element={
                <ProtectedRoute requiredPermission="stats">
                  <Stats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requiredPermission="settings">
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/anfitrion"
              element={
                <ProtectedRoute requiredPermission="host">
                  <Anfitrion />
                </ProtectedRoute>
              }
            />
            <Route path="/loginpage" element={<LoginPage />} />{" "}
            <Route path="/" element={<LoginPage />} />
            <Route path="*" element={<div>404 - Page Not Found</div>} />
          </Routes>
        )}
      </MainLayout>
    </Suspense>
  );
};
