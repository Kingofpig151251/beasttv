/**
 * DOM 層測試
 *
 * 重點：src/dom.js 宣告的每個 id 必須真實存在於 HTML，
 * 且 app.js 用到的每個 id 都已宣告。打錯字會在 CI 就擋下來，
 * 不用等執行時才發現元素查不到。
 *
 * 執行：node --test tests/dom.test.js
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const read = (f) => readFileSync(resolve(ROOT, f), "utf8");

const dom = await import("../src/dom.js");

/** 掃 HTML 檔裡所有 id */
function htmlIds() {
  const ids = new Set();
  for (const f of ["index.html", "edit.html", "credits.html"]) {
    let h;
    try {
      h = read(f);
    } catch {
      continue;
    }
    for (const m of h.matchAll(/\bid=["']([^"']+)["']/g)) ids.add(m[1]);
  }
  return ids;
}

/** 掃 app.js 裡所有 $("#id") 與 getElementById("id") */
function appIds() {
  const src = read("app.js");
  const ids = new Set();
  for (const m of src.matchAll(/\$\(\s*["']#([A-Za-z0-9_-]+)["']\s*\)/g)) ids.add(m[1]);
  for (const m of src.matchAll(/getElementById\(\s*["']([A-Za-z0-9_-]+)["']\s*\)/g)) ids.add(m[1]);
  return ids;
}

const DEAD = new Set(Object.values(dom.DEAD_IDS));

describe("ID 常數與 HTML 一致性", () => {
  test("每個宣告的 id 都存在於 HTML", () => {
    const inHtml = htmlIds();
    for (const [name, id] of Object.entries(dom.ID)) {
      assert.ok(inHtml.has(id), `ID.${name} = "${id}" 在 HTML 中找不到`);
    }
  });

  test("每個 HTML id 都已宣告（除了已知死路徑）", () => {
    const declared = new Set(Object.values(dom.ID));
    const missing = [...htmlIds()].filter((id) => !declared.has(id));
    assert.deepEqual(missing, [], `HTML 有這些 id 但 dom.js 未宣告：${missing.join(", ")}`);
  });

  test("app.js 用到的每個 id 都已宣告", () => {
    const declared = new Set(Object.values(dom.ID));
    const missing = [...appIds()].filter((id) => !declared.has(id) && !DEAD.has(id));
    assert.deepEqual(missing, [], `app.js 用到這些 id 但 dom.js 未宣告：${missing.join(", ")}`);
  });

  test("DEAD_IDS 確實不在 HTML 中（若出現就該升為正式常數）", () => {
    const inHtml = htmlIds();
    for (const [name, id] of Object.entries(dom.DEAD_IDS)) {
      assert.ok(!inHtml.has(id), `DEAD_IDS.${name} = "${id}" 竟然存在於 HTML，應改列為正式 ID`);
    }
  });

  test("id 常數值不重複", () => {
    const seen = new Map();
    for (const [name, id] of Object.entries(dom.ID)) {
      assert.ok(!seen.has(id), `id "${id}" 重複宣告：${seen.get(id)} 與 ${name}`);
      seen.set(id, name);
    }
  });

  test("id 值不含 # 前綴（呼叫方自己補）", () => {
    for (const [name, id] of Object.entries(dom.ID)) {
      assert.ok(!id.startsWith("#"), `ID.${name} 的值不應含 #：${id}`);
    }
  });

  test("全部常數名稱為大寫加底線", () => {
    for (const name of Object.keys(dom.ID)) {
      assert.match(name, /^[A-Z0-9_]+$/, `常數名稱格式不符：${name}`);
    }
  });
});

describe("$() 與 $$() 行為", () => {
  test("$ 查不到時回 null，不拋錯", () => {
    const fake = { querySelector: () => null };
    assert.equal(dom.$("#nope", fake), null);
  });

  test("$ 回傳 querySelector 的結果", () => {
    const el = { id: "x" };
    const fake = { querySelector: (s) => (s === "#x" ? el : null) };
    assert.equal(dom.$("#x", fake), el);
  });

  test("$$ 回傳真正的 Array（可用 map/filter）", () => {
    const fake = { querySelectorAll: () => ({ length: 2, 0: "a", 1: "b" }) };
    const r = dom.$$(".x", fake);
    assert.ok(Array.isArray(r), "$$ 必須回 Array");
    assert.deepEqual(r, ["a", "b"]);
  });

  test("$$ 查不到時回空陣列", () => {
    const fake = { querySelectorAll: () => [] };
    assert.deepEqual(dom.$$(".nope", fake), []);
  });

  test("byId 自動補 #", () => {
    let asked = null;
    const fake = { querySelector: (s) => ((asked = s), null) };
    dom.byId("pText", fake);
    assert.equal(asked, "#pText");
  });

  test("allIds 回傳全部 id 值", () => {
    const all = dom.allIds();
    assert.equal(all.length, Object.keys(dom.ID).length);
    assert.ok(all.includes("pText"));
  });
});
