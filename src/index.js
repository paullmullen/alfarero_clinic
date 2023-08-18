import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
import { AlfareroApp } from "./AlfareroApp";
import global_es from "./i18n/es.json";
import global_en from "./i18n/en.json";

i18next.init({
  Intersection: { escapeValue: false },
  lng: "es",
  resources: {
    es: { global: global_es },
    en: { global: global_en },
  },
});

ReactDOM.render(
  <I18nextProvider i18n={i18next}>
    <AlfareroApp />
  </I18nextProvider>,
  document.getElementById("root")
);
