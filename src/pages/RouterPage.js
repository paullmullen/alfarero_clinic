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
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import { firestore, auth } from "./../helpers/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  // collection,
} from "firebase/firestore";
import styled from "styled-components";

import { AlertProvider } from "../hooks/alert";
import { UiContext } from "../context/UiContext";
import { LoginPage } from "./LoginPage";
import { useTranslation } from "react-i18next";
import full_logo from "../img/full_logo.png";
import { cleanPaulTests } from "../helpers/updateStationStatus";
import PropTypes from "prop-types";

// Permissions stuff
// permissionsContext.js

const PermissionsContext = createContext({
  permissions: null,
  loading: true,
  user: null,
  setUserPermissions: () => {}, // Function to update user permissions
});

// const getPermissionsData = async (userId) => {
//   console.log("userId:", userId);
//   const usersRef = collection(firestore, "users");
//   const userData = usersRef.doc(userId);
//   return userData.permissions;
// };

export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Current User: ", currentUser);
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(firestore, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setPermissions(userSnap.data().permissions || null);
            console.log("permissions:", userSnap.data().permissions);
          } else {
            setPermissions(null); // No permissions found
          }
        } catch (error) {
          console.error("Error fetching user permissions:", error);
          setPermissions(null);
        }
      } else {
        setPermissions(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <PermissionsContext.Provider value={{ permissions, loading, user }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  return useContext(PermissionsContext);
};

PermissionsProvider.propTypes = {
  children: PropTypes.node.isRequired,
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
  // eslint-disable-next-line no-unused-vars
  const { permissions, user, loading } = usePermissions();
  console.log("Permissions Hook Output:", permissions);

  if (!user) {
    console.log("no user");
  }
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
      icon: <CompassOutlined />,
      label: <Link to="/location">{t("LOCATION")}</Link>,
    },
    {
      key: "9",
      icon: <SettingOutlined />,
      label: <Link to="/settings">{t("SETTINGS")}</Link>,
    },
    {
      key: "10",
      label: t("version"),
    },
    {
      key: "11",
      icon: <LoginOutlined />,
      label: <Link to="/loginpage">{t("NewLogin")}</Link>,
    },
  ];

  if (auth) {
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
            <Content
              style={{ margin: "24px 16px", padding: 24, minHeight: 280 }}
            >
              <AlertProvider>
                <Suspense fallback={<div>Loading...</div>}>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/registro" element={<Registro />} />
                    <Route path="/turnos" element={<Turno />} />
                    <Route path="/escritorio" element={<Escritorio />} />
                    <Route path="/member" element={<Member />} />
                    <Route path="/ingresar-host" element={<IngresarHost />} />
                    <Route path="/location" element={<Location />} />
                    <Route path="/survey" element={<Survey />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/estadisticas" element={<Stats />} />
                    <Route path="/anfitrion" element={<Anfitrion />} />

                    {/* Redirect for root path */}
                    <Route
                      path="/"
                      element={<Navigate to="/registro" replace />}
                    />

                    {/* Catch-all route for 404 */}
                    <Route path="*" element={<div>404 - Page Not Found</div>} />
                  </Routes>
                </Suspense>
              </AlertProvider>
            </Content>
          </Layout>
        </Router>
      </Layout>
    );
  } else {
    return <text>Not authorized</text>;
  }
};
