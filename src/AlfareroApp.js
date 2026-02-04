import React from "react";
import { UiProvider } from "./context/UiContext";
import { PermissionsProvider } from "./providers/PermissionsProvider";
import { RouterPage } from "./pages/RouterPage";

export const AlfareroApp = () => {
  return (
    <PermissionsProvider>
      <UiProvider>
        <RouterPage />
      </UiProvider>
    </PermissionsProvider>
  );
};
