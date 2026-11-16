import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { wakeOn, wakeOff, installWakeVisibility } from "../src/audio-ui.js";

describe("audio-ui：wakeOn / wakeOff", () => {
  let origNavigator;
  let origDocument;
  let releases;
  let requested;

  beforeEach(() => {
    origNavigator = globalThis.navigator;
    origDocument = globalThis.document;
    releases = 0;
    requested = 0;
  });

  afterEach(() => {
    if (origNavigator === undefined) delete globalThis.navigator;
    else globalThis.navigator = origNavigator;
    if (origDocument === undefined) delete globalThis.document;
    else globalThis.document = origDocument;
  });

  test("無 navigator 或無 wakeLock 時不拋錯", async () => {
    delete globalThis.navigator;
    await assert.doesNotReject(() => wakeOn());
    assert.doesNotThrow(() => wakeOff());
  });

  test("wakeOn 取得 screen wake lock 並可被 wakeOff 釋放", async () => {
    const lock = {
      addEventListener: (_ev, _fn) => {},
      release: async () => { releases++; },
    };
    globalThis.navigator = {
      wakeLock: {
        request: async (type) => { requested++; assert.equal(type, "screen"); return lock; }
      }
    };
    await wakeOn();
    assert.equal(requested, 1);
    wakeOff();
    assert.equal(releases, 1);
  });

  test("wakeLock.request 拒絕時靜默降級", async () => {
    globalThis.navigator = {
      wakeLock: { request: async () => { throw new Error("denied"); } }
    };
    await assert.doesNotReject(() => wakeOn());
    assert.doesNotThrow(() => wakeOff());
  });
});

describe("audio-ui：installWakeVisibility", () => {
  let origDocument;
  let origNavigator;
  let listeners;
  let requested;

  beforeEach(() => {
    origDocument = globalThis.document;
    origNavigator = globalThis.navigator;
    listeners = {};
    requested = 0;
    globalThis.document = {
      visibilityState: "hidden",
      addEventListener: (ev, fn) => { listeners[ev] = fn; },
    };
    globalThis.navigator = {
      wakeLock: {
        request: async () => { requested++; return { addEventListener() {}, release: async () => {} }; }
      }
    };
  });

  afterEach(() => {
    if (origDocument === undefined) delete globalThis.document;
    else globalThis.document = origDocument;
    if (origNavigator === undefined) delete globalThis.navigator;
    else globalThis.navigator = origNavigator;
  });

  test("頁面可見且遊戲處於可喚醒 phase 時會重新取得 wake lock", async () => {
    installWakeVisibility(() => ({ phase: "running" }));
    globalThis.document.visibilityState = "visible";
    listeners.visibilitychange();
    // wakeOn is async; allow microtask to run
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(requested, 1);
  });

  test("非可喚醒 phase 或頁面不可見時不喚醒", async () => {
    installWakeVisibility(() => ({ phase: "ended" }));
    globalThis.document.visibilityState = "visible";
    listeners.visibilitychange();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(requested, 0);

    installWakeVisibility(() => ({ phase: "running" }));
    globalThis.document.visibilityState = "hidden";
    listeners.visibilitychange();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(requested, 0);
  });
});
