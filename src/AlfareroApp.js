import React from "react";
import { UiProvider } from "./context/UiContext";
import { PermissionsProvider, RouterPage } from "./pages/RouterPage";

export const AlfareroApp = () => {
  return (
    <PermissionsProvider>
      <UiProvider>
        <RouterPage />
      </UiProvider>
    </PermissionsProvider>
  );
};
