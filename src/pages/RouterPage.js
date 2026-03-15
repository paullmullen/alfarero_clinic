import React, { Suspense, lazy, useContext } from "react";
import { Routes, Route, BrowserRouter as Router } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UiContext } from "../context/UiContext";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Spin } from "antd";

import AppShell from "../layout/AppShell";
import { ServiceLocationProvider } from "../providers/ServiceLocationProvider";
import { usePermissions } from "../providers/PermissionsProvider";
const Inventory = lazy(() => import("./inventory"));
const AppointmentImport = lazy(() => import("./AppointmentInput"));

const Registro = lazy(() => import("./Registro/Registro"));
const Turno = lazy(() => import("./Turno/Turno"));
const Escritorio = lazy(() => import("./Escritorio"));
// const Member = lazy(() => import("./Member"));
const IngresarHost = lazy(() => import("./IngresarHost"));
// const Location = lazy(() => import("./Location"));
const Survey = lazy(() => import("./Survey"));
const Settings = lazy(() => import("./Settings"));
const Stats = lazy(() => import("./Stats"));
const Anfitrion = lazy(() => import("./Anfitrion"));
const LoginPage = lazy(() => import("./LoginPage"));
const OperationalObservations = lazy(() => import("./OperationalObservations"));

export const RouterPage = () => {
  const { ocultarMenu } = useContext(UiContext);
  const [t] = useTranslation("global");
  const { permissions } = usePermissions();

  return (
    <Router>
      <ServiceLocationProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <AppShell ocultarMenu={ocultarMenu} t={t} permissions={permissions}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/loginpage" element={<LoginPage />} />
              <Route path="/" element={<LoginPage />} />

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

              {/* <Route
                path="/member"
                element={
                  <ProtectedRoute requiredPermission="basic">
                    <Member />
                  </ProtectedRoute>
                }
              /> */}

              <Route
                path="/ingresar-host"
                element={
                  <ProtectedRoute requiredPermission="basic">
                    <IngresarHost />
                  </ProtectedRoute>
                }
              />

              {/* <Route
                path="/location"
                element={
                  <ProtectedRoute requiredPermission="basic">
                    <Location />
                  </ProtectedRoute>
                }
              /> */}

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
                path="/observaciones-operativas"
                element={
                  <ProtectedRoute requiredPermission="basic">
                    <OperationalObservations />
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

              <Route
                path="/inventory"
                element={
                  <ProtectedRoute requiredPermission="basic">
                    <Suspense
                      fallback={
                        <div style={{ padding: 24 }}>
                          <Spin />
                        </div>
                      }
                    >
                      <Inventory />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/appointmentinput"
                element={
                  <ProtectedRoute requiredPermission="basic">
                    <Suspense
                      fallback={
                        <div style={{ padding: 24 }}>
                          <Spin />
                        </div>
                      }
                    >
                      <AppointmentImport />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<div>404 - Page Not Found</div>} />
            </Routes>
          </AppShell>
        </Suspense>
      </ServiceLocationProvider>
    </Router>
  );
};
