/**
 * app.js 狀態機接線測試
 *
 * src/state.js 有 25 個測試把關，但 app.js 是 classic script，用的是內嵌的同一份邏輯。
 * 這支測試確保兩邊規則完全一致：任何一邊改了轉移表而另一邊沒跟上，這裡就會失敗。
 *
 * 執行：node --test tests/app-state.test.js
 */
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { GameStateMachine, State } from "../src/state.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_JS = resolve(HERE, "..", "app.js");
const noop = () => {};

let ctx;
const boot = (expr) => vm.runInContext(expr, ctx);

before(() => {
  const makeEl = (o = {}) =>
    Object.assign(
      {
        classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
        style: { setProperty: noop },
        dataset: {},
        setAttribute: noop,
        getAttribute: () => null,
        removeAttribute: noop,
        appendChild: noop,
        append: noop,
        addEventListener: noop,
        querySelector: () => makeEl(),
        querySelectorAll: () => [],
        getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
        focus: noop,
        textContent: "",
        innerHTML: "",
        value: "",
        hidden: false,
        offsetWidth: 0,
        offsetHeight: 0,
        parentElement: null,
        tagName: "DIV",
        nodeType: 1,
      },
      o
    );

  const store = new Map();
  const sb = {
    console: { log: noop, warn: noop, error: noop, info: noop },
    setTimeout: () => 0,
    clearTimeout: noop,
    setInterval: () => 0,
    clearInterval: noop,
    requestAnimationFrame: () => 0,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    document: {
      querySelector: () => makeEl(),
      querySelectorAll: () => [],
      getElementById: () => makeEl(),
      createElement: () => makeEl(),
      createTextNode: () => ({ nodeType: 3, textContent: "" }),
      createTreeWalker: () => ({ nextNode: () => null }),
      addEventListener: noop,
      documentElement: makeEl(),
      body: makeEl(),
      hidden: false,
      readyState: "complete",
      activeElement: makeEl(),
      visibilityState: "visible",
    },
    window: {
      addEventListener: noop,
      matchMedia: () => ({ matches: false, addEventListener: noop }),
      location: { href: "http://localhost/", pathname: "/" },
      innerWidth: 1280,
      innerHeight: 900,
      scrollTo: noop,
    },
    navigator: { userAgent: "n" },
    location: { href: "http://localhost/", pathname: "/" },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    innerWidth: 1280,
    innerHeight: 900,
    getComputedStyle: () => ({ fontSize: "16px", opacity: "1", visibility: "visible" }),
    fetch: () => Promise.reject(new Error("x")),
    Audio: function () {
      return { play: () => Promise.resolve(), pause: noop, addEventListener: noop };
    },
    Image: function () {
      return makeEl();
    },
    performance: { now: () => 0 },
    addEventListener: noop,
    NodeFilter: { SHOW_TEXT: 4 },
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3 },
    URL,
    URLSearchParams,
    Date,
    Math,
    JSON,
  };
  sb.globalThis = sb;
  ctx = vm.createContext(sb);
  try {
    new vm.Script(readFileSync(APP_JS, "utf8")).runInContext(ctx, { timeout: 10000 });
  } catch (e) {
    if (!/is not (defined|a function)|Cannot read/.test(String(e.message))) throw e;
  }
});

describe("app.js 內嵌狀態機與 src/state.js 一致", () => {
  test("State 常數完全相同", () => {
    const appState = JSON.parse(boot("JSON.stringify(State)"));
    assert.deepEqual(Object.keys(appState).sort(), Object.keys(State).sort(), "狀態列舉應相同");
    for (const k of Object.keys(State)) {
      assert.equal(appState[k], State[k], `狀態 ${k} 的值不同`);
    }
  });

  test("每個狀態的 canJudge() 結果一致", () => {
    const exp = new GameStateMachine();
    for (const s of Object.values(State)) {
      exp.state = s;
      const want = exp.canJudge();
      const got = boot(`
        (() => { const m = new GameStateMachine(); m.force(${JSON.stringify(s)}); return m.canJudge(); })()
      `);
      assert.equal(got, want, `狀態 ${s} 的 canJudge() 不一致：app=${got} src=${want}`);
    }
  });

  test("每個狀態的 paused 結果一致", () => {
    for (const s of Object.values(State)) {
      const exp = new GameStateMachine();
      exp.state = s;
      const got = boot(`
        (() => { const m = new GameStateMachine(); m.force(${JSON.stringify(s)}); return m.paused; })()
      `);
      assert.equal(got, exp.paused, `狀態 ${s} 的 paused 不一致`);
    }
  });

  test("每個狀態的 canUndo() 結果一致", () => {
    for (const s of Object.values(State)) {
      const exp = new GameStateMachine();
      exp.state = s;
      const got = boot(`
        (() => { const m = new GameStateMachine(); m.force(${JSON.stringify(s)}); return m.canUndo(); })()
      `);
      assert.equal(got, exp.canUndo(), `狀態 ${s} 的 canUndo() 不一致`);
    }
  });

  test("所有狀態對的轉移結果一致", () => {
    const states = Object.values(State);
    for (const from of states) {
      for (const to of states) {
        const exp = new GameStateMachine();
        exp.state = from;
        let want;
        try {
          want = exp.go(to);
        } catch {
          want = "throw";
        }
        const got = boot(`
          (() => { const m = new GameStateMachine(); m.force(${JSON.stringify(from)}); return m.go(${JSON.stringify(to)}); })()
        `);
        assert.equal(got, want, `轉移 ${from} → ${to} 不一致：app=${got} src=${want}`);
      }
    }
  });

  test("phase 鏡像把 PAUSED_* 映射回原階段（相容舊字串）", () => {
    const map = {
      idle: "idle",
      ready: "ready",
      countdown: "countdown",
      playing: "running",
      "paused-playing": "running",
      "paused-countdown": "countdown",
      interstitial: "interstitial",
      done: "done",
    };
    for (const [state, phase] of Object.entries(map)) {
      const got = boot(`
        (() => { const m = new GameStateMachine(); m.force(${JSON.stringify(state)}); return m.phase; })()
      `);
      assert.equal(got, phase, `狀態 ${state} 的 phase 應為 ${phase}，實得 ${got}`);
    }
  });
});

describe("F-01 / F-02 在 app.js 內同樣被修好", () => {
  test("F-01：PAUSED_PLAYING 時 canJudge() 為 false", () => {
    const got = boot(`
      (() => { const m = new GameStateMachine(); m.force("paused-playing"); return m.canJudge(); })()
    `);
    assert.equal(got, false, "暫停時絕不可判定");
  });

  test("F-02：PAUSED_COUNTDOWN 的 timer 不跑", () => {
    const got = boot(`
      (() => { const m = new GameStateMachine(); m.force("paused-countdown"); return m.isTimerActive(); })()
    `);
    assert.equal(got, false, "暫停的倒數不應計時");
  });

  test("F-02：解除暫停回到 COUNTDOWN 而非 PLAYING", () => {
    const got = boot(`
      (() => { const m = new GameStateMachine(); m.force("paused-countdown"); m.resume(); return m.state; })()
    `);
    assert.equal(got, State.COUNTDOWN);
  });
});
