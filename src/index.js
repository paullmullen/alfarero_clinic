import React from "react";
import ReactDOM from "react-dom/client"; // Updated import for React 18
import "./index.css";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
// import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter for routing
// import { PermissionsProvider } from "./helpers/permissionsContext"; // Import PermissionsProvider
import { AlfareroApp } from "./AlfareroApp";
import global_es from "./i18n/es.json";
import global_en from "./i18n/en.json";

i18next.init({
  escapeValue: false, // Fixed issue with the key
  lng: "es",
  resources: {
    es: { global: global_es },
    en: { global: global_en },
  },
  debug: process.env.NODE_ENV === "development",
  saveMissing: process.env.NODE_ENV === "development",
  missingKeyHandler: function (lng, ns, key) {
    console.warn(`[i18n missing] ${ns}:${key}`);
  },
  parseMissingKeyHandler: function (key) {
    return `⚠️ ${key}`;
  },
});

// Create a root and render the app
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <I18nextProvider i18n={i18next}>
    {/* <BrowserRouter> */}
    {/* <PermissionsProvider> */} {/* Wrap the app in PermissionsProvider */}
    <AlfareroApp />
    {/* </PermissionsProvider> */}
    {/* </BrowserRouter> */}
  </I18nextProvider>,
);
