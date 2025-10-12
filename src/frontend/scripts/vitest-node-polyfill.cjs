"use strict";

const { webcrypto } = require("crypto");

// Set up primordials before jsdom loads to avoid webidl-conversions errors
// The error "Cannot read properties of undefined (reading 'get')" occurs because
// jsdom's webidl-conversions expects Object.prototype descriptors to be available
if (typeof globalThis.primordials === "undefined") {
  const ObjectPrototypeDescriptors = Object.getOwnPropertyDescriptors(
    Object.prototype
  );

  globalThis.primordials = {
    ObjectCreate: Object.create,
    ObjectDefineProperty: Object.defineProperty,
    ObjectGetOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
    ObjectGetOwnPropertyDescriptors: Object.getOwnPropertyDescriptors,
    ObjectGetPrototypeOf: Object.getPrototypeOf,
    ObjectSetPrototypeOf: Object.setPrototypeOf,
    ObjectPrototype: Object.prototype,
    ObjectPrototypeHasOwnProperty: Object.prototype.hasOwnProperty,
    ObjectPrototypeToString: Object.prototype.toString,
    SymbolIterator: Symbol.iterator,
    SymbolToStringTag: Symbol.toStringTag,
    SymbolHasInstance: Symbol.hasInstance,
    FunctionPrototypeCall: Function.prototype.call,
    FunctionPrototypeBind: Function.prototype.bind,
    ArrayPrototypeForEach: Array.prototype.forEach,
    ArrayPrototypeMap: Array.prototype.map,
    // Add descriptor accessors that webidl-conversions needs
    ObjectPrototypeDescriptors: ObjectPrototypeDescriptors,
  };
}

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
