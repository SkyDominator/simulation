"use strict";

const { webcrypto } = require("crypto");

if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto;
}

if (typeof globalThis.SharedArrayBuffer === "undefined") {
  globalThis.SharedArrayBuffer = class SharedArrayBuffer extends ArrayBuffer {};
}
