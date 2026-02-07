// src/pages/Registro/utils/crypto.js
import CryptoJS from "crypto-js";

const secretPass = "XkhZG4fW2t2W";

export function encryptData(text) {
  return CryptoJS.AES.encrypt(JSON.stringify(text), secretPass).toString();
}

export function decryptData(text) {
  const bytes = CryptoJS.AES.decrypt(text, secretPass);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}
