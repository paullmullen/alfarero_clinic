import React, { useContext } from "react";
import { Layout, Menu, Typography, Image, Row, Col } from "antd";
import {
  UserOutlined,
  FileTextFilled,
  LoginOutlined,
  IdcardOutlined,
  BarChartOutlined,
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
import { CrearTurno } from "./CrearTurno";
import { Escritorio } from "./Escritorio";
import { UiContext } from "../context/UiContext";
import { IngresarHost } from "./IngresarHost";
import Stats from "./Stats";
import { Anfitrion } from "./Anfitrion";

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

// Info in the side bar

export const RouterPage = () => {
  const { ocultarMenu } = useContext(UiContext);
  const menuItems = [
    {
      key: "1",
      icon: <LoginOutlined />,
      label: <Link to="/ingresar-host">Ingresar</Link>,
    },
    {
      key: "2",
      icon: <UserOutlined />,
      label: <Link to="/registro">Registro</Link>,
    },
    {
      key: "3",
      icon: <FileTextFilled />,
      label: <Link to="/turnos">Turnos</Link>,
    },
    {
      key: "4",
      icon: <IdcardOutlined />,
      label: <Link to="/escritorio">Escritorio</Link>,
    },
    {
      key: "6",
      icon: <BarChartOutlined />,
      label: <Link to="/estadisticas">Estadisticas</Link>,
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
              backgroundColor: "#fff",
              alignItems: "center",
            }}
          >
            <Row>
              <div className="header" />
              <Col xs={24} sm={24} md={24} lg={24}>
                <Image
                  src={require("../img/full_logo.png")}
                  style={{ margin: 0, flex: 1, justifyContent: "flex-start" }}
                  preview={false}
                />
              </Col>
            </Row>
            <Row justify="center">
              <Col xs={24} sm={24} md={24} lg={24}>
                <Title level={5}>Plan de Cuidado de Pacientes</Title>
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
                <Route path="/crear" component={CrearTurno} />
                <Route path="/escritorio" component={Escritorio} />
                <Route path="/anfitrion" component={Anfitrion} />
                <Route path="/estadisticas" component={Stats} />
                <Redirect to="/ingresar-host" />
              </Switch>
            </AlertProvider>
          </Content>
        </Layout>
      </Router>
    </Layout>
  );
};
