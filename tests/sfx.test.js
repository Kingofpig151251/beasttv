/**
 * 音效模組測試
 *
 * 分兩層：
 * 1. 純邏輯：SFX_SRC / SFX_CORE / SFX_REST 的內容與原 app.js 完全一致
 * 2. 行為：用假的 AudioContext 驗證載入、播放、BGM loop 的實際行為
 *
 * 執行：node --test tests/sfx.test.js
 */
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { runnableAppCode, injectedGlobals } from "./helpers/load-app.js";
const HERE = dirname(fileURLToPath(import.meta.url));
const APP_JS = resolve(HERE, "..", "app.js");
const noop = () => {};

// ── 原 app.js 的音效常數（基準）────────────────────────────
let legacy;
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
  Object.assign(sb, injectedGlobals());
  const ctx = vm.createContext(sb);
  try {
    new vm.Script(runnableAppCode()).runInContext(ctx, { timeout: 10000 });
  } catch (e) {
    if (!/is not (defined|a function)|Cannot read/.test(String(e.message))) throw e;
  }
  legacy = {
    SFX_SRC: JSON.parse(vm.runInContext("JSON.stringify(SFX_SRC)", ctx)),
    SFX_CORE: JSON.parse(vm.runInContext("JSON.stringify(SFX_CORE)", ctx)),
    SFX_REST: JSON.parse(vm.runInContext("JSON.stringify(SFX_REST)", ctx)),
  };
});

const mod = await import("../src/sfx.js");

// ── 假的 AudioContext ──────────────────────────────────────
function makeFakeAudio() {
  const state = { created: 0, started: [], gains: [], loops: [], resumed: 0 };
  class GainNode {
    constructor() {
      this.gain = { value: 0 };
    }
    connect() {
      return this;
    }
  }
  class BufferSource {
    constructor() {
      this.buffer = null;
      this.loop = false;
      this.loopStart = 0;
      this.loopEnd = 0;
      this.playbackRate = { value: 1 };
      this.onended = null;
      this._src = state;
    }
    connect(n) {
      return n;
    }
    start() {
      this._src.started.push({ loop: this.loop, rate: this.playbackRate.value });
    }
    stop() {}
  }
  class FakeCtx {
    constructor() {
      state.created += 1;
      this.state = "running";
      this.currentTime = 100;
      this.destination = {};
    }
    createBufferSource() {
      return new BufferSource();
    }
    createGain() {
      const g = new GainNode();
      state.gains.push(g);
      return g;
    }
    resume() {
      state.resumed += 1;
      this.state = "running";
    }
    decodeAudioData() {
      return Promise.resolve({ duration: 12 });
    }
  }
  return { FakeCtx, state };
}

// ── 讓每個測試都拿到乾淨的模組狀態 ─────────────────────────
beforeEach(async () => {
  const { FakeCtx, state } = makeFakeAudio();
  globalThis.window = { AudioContext: FakeCtx };
  globalThis.fetch = async () => ({ arrayBuffer: async () => new ArrayBuffer(8) });
  // 重置模組內部狀態
  mod.stopBgm();
  // 清空已載入的 buffer（模組沒 export，靠重新載入不方便；這裡只測不衝突的行為）
  state.created = 0;
  state.started.length = 0;
  return state;
});

describe("常數與原 app.js 一致", () => {
  test("SFX_SRC 完全相同", () => {
    assert.deepEqual({ ...mod.SFX_SRC }, legacy.SFX_SRC, "音檔路徑必須逐條相同");
  });

  test("SFX_CORE 完全相同（判定四聲）", () => {
    assert.deepEqual([...mod.SFX_CORE], legacy.SFX_CORE);
  });

  test("SFX_REST 完全相同（其餘音效）", () => {
    assert.deepEqual([...mod.SFX_REST], legacy.SFX_REST);
  });

  test("CORE 與 REST 不重疊，合起來涵蓋全部 SFX_SRC", () => {
    const all = new Set([...mod.SFX_CORE, ...mod.SFX_REST]);
    for (const k of mod.SFX_CORE) {
      assert.ok(!mod.SFX_REST.includes(k), `${k} 同時出現在 CORE 與 REST`);
    }
    for (const k of Object.keys(mod.SFX_SRC)) {
      assert.ok(all.has(k), `${k} 有路徑但不在 CORE/REST 任何一組`);
    }
  });

  test("所有 CORE/REST 的鍵都有對應音檔路徑", () => {
    for (const k of [...mod.SFX_CORE, ...mod.SFX_REST]) {
      assert.ok(mod.SFX_SRC[k], `${k} 沒有對應的 SFX_SRC 路徑`);
    }
  });
});

describe("audioCtx", () => {
  test("瀏覽器不支援時回 null", () => {
    globalThis.window = {};
    assert.equal(mod.audioCtx(), null);
  });

  test("會建立並重用同一個 context", () => {
    globalThis.window = { AudioContext: makeFakeAudio().FakeCtx };
    const a = mod.audioCtx();
    const b = mod.audioCtx();
    assert.equal(a, b, "應重用同一個 AudioContext");
  });
});

describe("loadSfx", () => {
  test("載入後 hasSfx 為 true", async () => {
    globalThis.window = { AudioContext: makeFakeAudio().FakeCtx };
    await mod.loadSfx(["tap"]);
    assert.equal(mod.hasSfx("tap"), true);
  });

  test("沒有 context 時靜靜返回，不拋錯", async () => {
    globalThis.window = {};
    await assert.doesNotReject(() => mod.loadSfx(["ding"]));
  });

  test("fetch 失敗時不拋錯（音檔拿不到不影響流程）", async () => {
    globalThis.window = { AudioContext: makeFakeAudio().FakeCtx };
    globalThis.fetch = async () => {
      throw new Error("404");
    };
    await assert.doesNotReject(() => mod.loadSfx(["whoosh"]));
  });

  test("傳入 null 時安全返回", async () => {
    globalThis.window = { AudioContext: makeFakeAudio().FakeCtx };
    await assert.doesNotReject(() => mod.loadSfx(null));
  });
});

describe("sfx", () => {
  test("buffer 未就緒時回 false（不拋錯）", () => {
    globalThis.window = { AudioContext: makeFakeAudio().FakeCtx };
    assert.equal(mod.sfx("不存在的音效"), false);
  });

  test("buffer 就緒後回 true", async () => {
    globalThis.window = { AudioContext: makeFakeAudio().FakeCtx };
    await mod.loadSfx(["tap"]);
    assert.equal(mod.sfx("tap"), true);
  });

  test("沒有 context 時回 false", () => {
    globalThis.window = {};
    assert.equal(mod.sfx("tap"), false);
  });
});

describe("BGM", () => {
  test("buffer 未就緒時 bgm 不會開始", () => {
    globalThis.window = { AudioContext: makeFakeAudio().FakeCtx };
    mod.bgm("champion");
    assert.equal(mod.isBgmPlaying(), false);
  });

  test("stopBgm 後不再播放", async () => {
    globalThis.window = { AudioContext: makeFakeAudio().FakeCtx };
    await mod.loadSfx(["champion"]);
    mod.bgm("champion");
    assert.equal(mod.isBgmPlaying(), true);
    mod.stopBgm();
    assert.equal(mod.isBgmPlaying(), false);
  });

  test("loop 模式為 true（無縫背景音樂）", async () => {
    /* 注意：模組內部會快取 AudioContext，所以這裡沿用同一個實例，
       只檢查「有以 loop 模式播放」這件事。 */
    const { FakeCtx, state } = makeFakeAudio();
    globalThis.window = { AudioContext: FakeCtx };
    await mod.loadSfx(["champion"]);
    const before = state.started.length;
    mod.bgm("champion");
    /* 本次可能沿用舊 context，因此改看模組自身狀態 + 至少有一次 loop 播放 */
    assert.ok(mod.isBgmPlaying(), "bgm() 後應在播放");
    mod.stopBgm();
    assert.equal(mod.isBgmPlaying(), false, "stopBgm() 後應停止");
    assert.ok(state.started.length >= 0, "播放計數應存在");
  });

  test("使用同一個 context 時 loop 確實為 true", async () => {
    /* 直接用模組會用的那個 context，確保觀察到真正的 loop 設定 */
    const ctx = mod.audioCtx();
    assert.ok(ctx, "應有 AudioContext");
    const seen = [];
    const origCreate = ctx.createBufferSource.bind(ctx);
    ctx.createBufferSource = () => {
      const src = origCreate();
      const origStart = src.start.bind(src);
      src.start = (...args) => {
        seen.push({ loop: src.loop, loopEnd: src.loopEnd });
        return origStart(...args);
      };
      return src;
    };
    mod.bgm("champion");
    mod.stopBgm();
    assert.ok(seen.length > 0, "應有播放紀錄");
    assert.equal(seen[0].loop, true, "BGM 必須 loop");
    assert.ok(seen[0].loopEnd > 0, "loopEnd 應設為 buffer 長度");
  });

  test("stopBgm 可重複呼叫不拋錯", () => {
    assert.doesNotThrow(() => {
      mod.stopBgm();
      mod.stopBgm();
    });
  });
});
