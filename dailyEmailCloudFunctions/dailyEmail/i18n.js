"use strict";

const es = require("../i18n/es.json");

function getNested(obj, path) {
  return String(path)
    .split(".")
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined),
      obj,
    );
}

function t(key, fallback) {
  const val = getNested(es, key);
  return typeof val === "string" ? val : (fallback ?? key);
}

module.exports = { t };
