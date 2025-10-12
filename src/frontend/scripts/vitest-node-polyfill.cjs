"use strict";

const { webcrypto } = require("crypto");

if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto;
}

if (typeof globalThis.SharedArrayBuffer === "undefined") {
  let sharedBufferCtor;
  try {
    ({ SharedArrayBuffer: sharedBufferCtor } = require("worker_threads"));
  } catch (error) {
    // ignore
  }

  if (typeof sharedBufferCtor === "function") {
    globalThis.SharedArrayBuffer = sharedBufferCtor;
  } else {
    class SharedArrayBufferPolyfill {
      constructor(length = 0) {
        this._buffer = new ArrayBuffer(length);
      }
    }

    Object.defineProperty(SharedArrayBufferPolyfill.prototype, "byteLength", {
      get() {
        return this._buffer.byteLength;
      },
    });

    Object.defineProperty(SharedArrayBufferPolyfill.prototype, "resizable", {
      get() {
        return false;
      },
    });

    Object.defineProperty(SharedArrayBufferPolyfill.prototype, "growable", {
      get() {
        return false;
      },
    });

    Object.defineProperty(SharedArrayBufferPolyfill.prototype, "slice", {
      value(begin, end) {
        return this._buffer.slice(begin, end);
      },
    });

    Object.defineProperty(
      SharedArrayBufferPolyfill.prototype,
      Symbol.toStringTag,
      {
        value: "SharedArrayBuffer",
      }
    );

    globalThis.SharedArrayBuffer = SharedArrayBufferPolyfill;
  }
}
