/**
 * 純函式單元測試：esc / fmtScore / statLine / parseText / codeOf / keyLabel
 *
 * 策略與 tests/real-app.test.js 相同：在 Node 的 vm 沙箱裡載入真實 app.js，
 * 注入最小 DOM stub，再從沙箱取出這六個函式來驗證。
 * 不複製一份實作，測的是「現在跑的那份 app.js」。
 *
 * 這六個函式的特性：無副作用、不讀 DOM、不改狀態，
 * 只有 statLine 依賴模組層的 LANG 與 G，測試時在沙箱內改這兩個值。
 *
 * 執行：node --test tests/utils.test.js
 */
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_JS = resolve(HERE, "..", "app.js");

// ── 最小瀏覽器環境 stub（與 real-app.test.js 同構）────────────────
function makeEnv() {
  const noop = () => {};
  const fakeEl = () => ({
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    style: { setProperty: noop },
    dataset: {},
    setAttribute: noop,
    getAttribute: () => null,
    removeAttribute: noop,
    appendChild: noop,
    append: noop,
    addEventListener: noop,
    removeEventListener: noop,
    querySelector: () => fakeEl(),
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
    focus: noop,
    blur: noop,
    click: noop,
    textContent: "",
    innerHTML: "",
    value: "",
    hidden: false,
    offsetWidth: 0,
    offsetHeight: 0,
    scrollWidth: 0,
    scrollHeight: 0,
    clientWidth: 0,
    clientHeight: 0,
    parentElement: null,
    children: [],
    childNodes: [],
    firstChild: null,
    tagName: "DIV",
    nodeType: 1,
  });

  const store = new Map();
  const sandbox = {
    console: { log: noop, warn: noop, error: noop, info: noop, debug: noop },
    setTimeout: () => 0,
    clearTimeout: noop,
    setInterval: () => 0,
    clearInterval: noop,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: noop,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    },
    document: {
      querySelector: () => fakeEl(),
      querySelectorAll: () => [],
      getElementById: () => fakeEl(),
      createElement: () => fakeEl(),
      createTextNode: () => ({ nodeType: 3, textContent: "" }),
      createTreeWalker: () => ({ nextNode: () => null }),
      addEventListener: noop,
      removeEventListener: noop,
      documentElement: fakeEl(),
      body: fakeEl(),
      hidden: false,
      readyState: "complete",
    },
    window: {
      addEventListener: noop,
      removeEventListener: noop,
      matchMedia: () => ({ matches: false, addEventListener: noop }),
      location: { href: "http://localhost/", pathname: "/", search: "" },
      innerWidth: 1280,
      innerHeight: 900,
      scrollTo: noop,
      localStorage: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
      },
    },
    navigator: { userAgent: "node-test" },
    location: { href: "http://localhost/", pathname: "/", search: "" },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    innerWidth: 1280,
    innerHeight: 900,
    getComputedStyle: () => ({ fontSize: "16px", opacity: "1", visibility: "visible" }),
    fetch: () => Promise.reject(new Error("no network in test")),
    Audio: function () {
      return { play: () => Promise.resolve(), pause: noop, addEventListener: noop };
    },
    Image: function () {
      return fakeEl();
    },
    performance: { now: () => 0 },
    addEventListener: noop,
    NodeFilter: { SHOW_TEXT: 4 },
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3 },
    caches: { open: () => Promise.resolve({ add: () => Promise.resolve(), match: () => Promise.resolve() }) },
    URL,
    URLSearchParams,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    Promise,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    Intl,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    alert: noop,
    confirm: () => false,
    prompt: () => null,
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox.window;
  return sandbox;
}

let ctx;
let boot;

before(() => {
  const code = readFileSync(APP_JS, "utf8");
  const sandbox = makeEnv();
  ctx = vm.createContext(sandbox);
  try {
    new vm.Script(code, { filename: "app.js" }).runInContext(ctx, { timeout: 10000 });
  } catch (e) {
    // app.js 可能有依賴真實 DOM 的頂層呼叫失敗；只要函式有定義就算載入成功
    if (!/is not defined|Cannot read/.test(String(e))) throw e;
  }
  boot = (expr) => vm.runInContext(expr, ctx);
});

/* 每個測試前把沙箱狀態還原：LANG 回中文、G 回 null、skipPenalty 關掉 */
beforeEach(() => {
  boot("LANG = 'zh'; G = null;");
});

// ── esc ───────────────────────────────────────────────────
describe("esc：HTML 跳脫", () => {
  test("五個危險字元全部跳脫", () => {
    assert.equal(boot(`esc('&<>"\\'')`), "&amp;&lt;&gt;&quot;&#39;");
  });

  test("純文字原樣返回", () => {
    assert.equal(boot("esc('hello')"), "hello");
  });

  test("中文與空白不受影響", () => {
    assert.equal(boot("esc('百獸台 派對')"), "百獸台 派對");
  });

  test("空字串返回空字串", () => {
    assert.equal(boot("esc('')"), "");
  });

  test("null / undefined 以 String() 轉字串（不拋錯）", () => {
    assert.equal(boot("esc(null)"), "null");
    assert.equal(boot("esc(undefined)"), "undefined");
  });

  test("數字與布林轉字串", () => {
    assert.equal(boot("esc(0)"), "0");
    assert.equal(boot("esc(-12.5)"), "-12.5");
    assert.equal(boot("esc(true)"), "true");
  });

  test("已跳脫的字串會被再跳脫一次（不是反跳脫）", () => {
    assert.equal(boot("esc('&amp;')"), "&amp;amp;");
  });

  test("混合內容只跳脫危險字元", () => {
    assert.equal(boot(`esc('<b class="x">中</b>')`), "&lt;b class=&quot;x&quot;&gt;中&lt;/b&gt;");
  });

  test("超長輸入不截斷、每處都跳脫", () => {
    const out = boot("esc('<'.repeat(5000))");
    assert.equal(out.length, 5000 * 4);
    assert.ok(!out.includes("<"));
  });

  test("腳本注入字串被完整中和", () => {
    const out = boot(`esc('<script>alert(1)</script>')`);
    assert.ok(!out.includes("<"));
    assert.ok(!out.includes(">"));
    assert.equal(out, "&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

// ── fmtScore ──────────────────────────────────────────────
describe("fmtScore：計分顯示", () => {
  test("正數帶 + 號", () => {
    assert.equal(boot("fmtScore(5)"), "+5");
  });

  test("零顯示 +0（不是 −0）", () => {
    assert.equal(boot("fmtScore(0)"), "+0");
  });

  test("負數用 U+2212 減號而非 hyphen", () => {
    const out = boot("fmtScore(-5)");
    assert.equal(out, "−5");
    assert.equal(out.charCodeAt(0), 0x2212, "必須是數學減號 U+2212");
    assert.notEqual(out, "-5", "不可用 ASCII hyphen");
  });

  test("負零顯示 +0", () => {
    assert.equal(boot("fmtScore(-0)"), "+0");
  });

  test("帶小數時保留小數", () => {
    assert.equal(boot("fmtScore(2.5)"), "+2.5");
    assert.equal(boot("fmtScore(-2.5)"), "−2.5");
  });

  test("大數字不加千分位", () => {
    assert.equal(boot("fmtScore(1234567)"), "+1234567");
    assert.equal(boot("fmtScore(-1234567)"), "−1234567");
  });

  test("字串會被比較後拼接（沿用原行為）", () => {
    assert.equal(boot("fmtScore('5')"), "+5");
  });
});

// ── statLine ──────────────────────────────────────────────
describe("statLine：統計文字", () => {
  test("中文只顯示答中", () => {
    assert.equal(boot("statLine({ok:3})"), "答中 3");
  });

  test("中文加犯規", () => {
    assert.equal(boot("statLine({ok:3, foul:1})"), "答中 3 · 犯規 1");
  });

  test("跳過未扣分時不顯示跳過", () => {
    assert.equal(boot("statLine({ok:3, skip:2})"), "答中 3");
  });

  test("跳過扣分且 G.skipPenalty 為 true 才顯示", () => {
    boot("G = { skipPenalty: true };");
    assert.equal(boot("statLine({ok:3, skip:2})"), "答中 3 · 跳過 2");
  });

  test("G 為 null 時即使有 skip 也不顯示（不拋錯）", () => {
    assert.equal(boot("statLine({ok:1, skip:9})"), "答中 1");
  });

  test("bold 模式把數字包 b 標籤", () => {
    assert.equal(boot("statLine({ok:2, foul:1}, true)"), "答中 <b>2</b> · 犯規 <b>1</b>");
  });

  test("英文語系輸出英文", () => {
    boot("LANG = 'en';");
    assert.equal(boot("statLine({ok:3})"), "3 correct");
  });

  test("英文語系加犯規與跳過", () => {
    boot("LANG = 'en'; G = { skipPenalty: true };");
    assert.equal(boot("statLine({ok:3, foul:2, skip:1}, true)"), "<b>3</b> correct · <b>2</b> foul · <b>1</b> skipped");
  });

  test("缺欄位時用 0", () => {
    assert.equal(boot("statLine({})"), "答中 0");
  });

  test("傳 null 會拋錯（原實作沒有防護，記錄現況）", () => {
    assert.throws(() => boot("statLine(null)"), /Cannot read|not a function|undefined/);
  });
});

// ── parseText ─────────────────────────────────────────────
describe("parseText：題目解析", () => {
  test("逐行拆開", () => {
    assert.deepEqual(
      [...boot("parseText('蘋果\\n香蕉\\n橙')")],
      ["蘋果", "香蕉", "橙"]
    );
  });

  test("空字串返回空陣列", () => {
    assert.deepEqual([...boot("parseText('')")], []);
  });

  test("null / undefined 返回空陣列", () => {
    assert.deepEqual([...boot("parseText(null)")], []);
    assert.deepEqual([...boot("parseText(undefined)")], []);
  });

  test("只有空白行時返回空陣列", () => {
    assert.deepEqual([...boot("parseText('   \\n\\t\\n  ')")], []);
  });

  test("頭尾空白被 trim", () => {
    assert.deepEqual([...boot("parseText('  蘋果  \\n\\t香蕉\\t')")], ["蘋果", "香蕉"]);
  });

  test("# 開頭的行被當註解過濾", () => {
    assert.deepEqual([...boot("parseText('# 標題\\n蘋果\\n#備註\\n香蕉')")], ["蘋果", "香蕉"]);
  });

  test("行中出現 # 不當註解", () => {
    assert.deepEqual([...boot("parseText('C#\\nF# 大調')")], ["C#", "F# 大調"]);
  });

  test("完全重複的行只留第一條", () => {
    assert.deepEqual([...boot("parseText('蘋果\\n蘋果\\n香蕉')")], ["蘋果", "香蕉"]);
  });

  test("去重忽略大小寫與中間空白", () => {
    assert.deepEqual(
      [...boot("parseText('Apple\\n a p p l e \\nAPPLE')")],
      ["Apple"]
    );
  });

  test("保留原始順序與原本寫法", () => {
    assert.deepEqual([...boot("parseText('B\\na\\nC')")], ["B", "a", "C"]);
  });

  test("\\r\\n 換行也食得住", () => {
    assert.deepEqual([...boot("parseText('甲\\r\\n乙\\r\\n丙')")], ["甲", "乙", "丙"]);
  });

  test("超過 60 字元被截斷", () => {
    const out = boot("parseText('" + "長".repeat(80) + "')");
    assert.equal([...out][0].length, 60);
  });

  test("剛好 60 字元不截斷", () => {
    const out = boot("parseText('" + "長".repeat(60) + "')");
    assert.equal([...out][0].length, 60);
  });

  test("截斷後長度不同的兩行可能被視為不同條目（記錄現況）", () => {
    const out = boot("parseText('" + "A".repeat(60) + "1\\n" + "A".repeat(60) + "2')");
    // 去重發生在截斷之前，因此兩行都保留，截斷後看起來一樣
    assert.equal([...out].length, 2);
    assert.equal([...out][0], [...out][1]);
  });

  test("數字會被轉字串處理", () => {
    assert.deepEqual([...boot("parseText(123)")], ["123"]);
  });

  test("回傳的是陣列（有 map/filter 鏈的結果）", () => {
    assert.equal(boot("Array.isArray(parseText('a'))"), true);
  });
});

// ── codeOf ────────────────────────────────────────────────
describe("codeOf：事件轉按鍵碼", () => {
  test("有 code 時直接採用", () => {
    assert.equal(boot("codeOf({ code: 'KeyQ' })"), "KeyQ");
    assert.equal(boot("codeOf({ code: 'ArrowLeft' })"), "ArrowLeft");
    assert.equal(boot("codeOf({ code: 'F5', key: 'x' })"), "F5");
  });

  test("方向鍵用 key 反推", () => {
    assert.equal(boot("codeOf({ key: 'ArrowLeft' })"), "ArrowLeft");
    assert.equal(boot("codeOf({ key: 'ArrowRight' })"), "ArrowRight");
    assert.equal(boot("codeOf({ key: 'ArrowUp' })"), "ArrowUp");
    assert.equal(boot("codeOf({ key: 'ArrowDown' })"), "ArrowDown");
  });

  test("空格以 Space 表示", () => {
    assert.equal(boot("codeOf({ key: ' ' })"), "Space");
    assert.equal(boot("codeOf({ key: 'Spacebar' })"), "Space");
  });

  test("字母轉 KeyX（一律大寫）", () => {
    assert.equal(boot("codeOf({ key: 'a' })"), "KeyA");
    assert.equal(boot("codeOf({ key: 'Z' })"), "KeyZ");
  });

  test("數字轉 DigitN", () => {
    assert.equal(boot("codeOf({ key: '5' })"), "Digit5");
    assert.equal(boot("codeOf({ key: '0' })"), "Digit0");
  });

  test("其他按鍵原樣返回", () => {
    assert.equal(boot("codeOf({ key: 'Enter' })"), "Enter");
    assert.equal(boot("codeOf({ key: 'Escape' })"), "Escape");
    assert.equal(boot("codeOf({ key: 'F12' })"), "F12");
  });

  test("空物件返回空字串（不拋錯）", () => {
    assert.equal(boot("codeOf({})"), "");
  });

  test("code 為空字串時退回 key 推導", () => {
    assert.equal(boot("codeOf({ code: '', key: 'b' })"), "KeyB");
  });

  test("中文輸入鍵原樣返回", () => {
    assert.equal(boot("codeOf({ key: '中' })"), "中");
  });
});

// ── keyLabel ──────────────────────────────────────────────
describe("keyLabel：按鍵碼轉顯示文字", () => {
  test("方向鍵顯示箭頭", () => {
    assert.equal(boot("keyLabel('ArrowLeft')"), "←");
    assert.equal(boot("keyLabel('ArrowRight')"), "→");
    assert.equal(boot("keyLabel('ArrowUp')"), "↑");
    assert.equal(boot("keyLabel('ArrowDown')"), "↓");
  });

  test("常用鍵有中文／縮寫", () => {
    assert.equal(boot("keyLabel('Space')"), "空格");
    assert.equal(boot("keyLabel('Enter')"), "Enter");
    assert.equal(boot("keyLabel('Backspace')"), "⌫");
    assert.equal(boot("keyLabel('Escape')"), "Esc");
    assert.equal(boot("keyLabel('PageUp')"), "PgUp");
    assert.equal(boot("keyLabel('PageDown')"), "PgDn");
  });

  test("字母鍵去掉 Key 前綴", () => {
    assert.equal(boot("keyLabel('KeyA')"), "A");
    assert.equal(boot("keyLabel('KeyZ')"), "Z");
  });

  test("數字鍵去掉 Digit 前綴", () => {
    assert.equal(boot("keyLabel('Digit1')"), "1");
    assert.equal(boot("keyLabel('Digit9')"), "9");
  });

  test("數字鍵盤顯示 Num 前綴", () => {
    assert.equal(boot("keyLabel('Numpad5')"), "Num5");
    assert.equal(boot("keyLabel('NumpadAdd')"), "NumAdd");
  });

  test("未列出的鍵原樣返回", () => {
    assert.equal(boot("keyLabel('F2')"), "F2");
    assert.equal(boot("keyLabel('Tab')"), "Tab");
  });

  test("空字串返回空字串", () => {
    assert.equal(boot("keyLabel('')"), "");
  });

  test("非 Key+單字母不誤判（KeyAB 保持原樣）", () => {
    assert.equal(boot("keyLabel('KeyAB')"), "KeyAB");
  });

  test("codeOf 與 keyLabel 串起來：key 'a' → 'A'", () => {
    assert.equal(boot("keyLabel(codeOf({ key: 'a' }))"), "A");
  });

  test("codeOf 與 keyLabel 串起來：' ' → '空格'", () => {
    assert.equal(boot("keyLabel(codeOf({ key: ' ' }))"), "空格");
  });
});
