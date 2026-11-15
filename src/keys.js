/**
 * 鍵盤快捷鍵模組
 *
 * 從 app.js 抽出（原 L1806-L1842）。這一段有五個常數／函式是真純的：
 * 查表、正則比對、localStorage 讀寫，全部不依賴 DOM、不依賴遊戲狀態。
 *
 * 刻意**沒有**搬過來的兩件東西
 * ──────────────────────────────
 * 1. `KKEYS`（app.js L1819）— 它是模組層可變物件，`resetKeys()` 會就地改寫它，
 *    而 `applyKeys()` 又從它重建 ACT_BY_CODE。搬進模組就會變成兩份真相。
 * 2. `ACT_BY_CODE`（app.js L1820，L1844 重建）— 外部維護的可變狀態，不是純函式產物。
 *
 * 所以這個模組只提供「查表 + 讀寫」這幾個無狀態操作，狀態留在 app.js。
 *
 * 設計要點（與原版逐項等價）
 * ──────────────────────────
 * 1. `loadKeys` 預設值展開後逐鍵覆寫，壞掉的欄位（非字串、空字串）靜靜保留預設，
 *    不整份丟棄 —— 這正是原版 `typeof j[k] === "string" && j[k]` 的效果。
 * 2. localStorage 拋錯（隱私模式）一律吞掉，回預設值；`saveKeys` 寫入失敗同樣不拋。
 * 3. `keyLabel` 先查表、再逐個正則、最後才 `replace`。未知 code 原樣返回，
 *    但 `NumpadXxx` 這種沒被正則吃到的仍會被換成 `NumXxx`。
 * 4. `codeOf` 是 code 優先：合成事件冇 code 才用 key 反推。
 */

/** 四個動作的預設鍵 */
export const KEY_DEF = Object.freeze({
  foul: "ArrowLeft",
  skip: "ArrowDown",
  ok: "ArrowRight",
  undo: "ArrowUp",
});

/** 四個動作的中文名稱（renderKeyRows 會再過 T() 翻譯） */
export const KEY_WHAT = Object.freeze({
  foul: "犯規",
  skip: "跳過",
  ok: "正確",
  undo: "撤回",
});

/** 固定顯示順序：犯規／跳過／正確／撤回 */
export const KEY_ORDER = Object.freeze(["foul", "skip", "ok", "undo"]);

/** localStorage 鍵名。這是外部契約，改了會令舊用戶的按鍵設定讀不到。 */
export const KEYS_STORAGE_KEY = "beasttv.keys";

/**
 * 取得 storage 物件。
 * 瀏覽器裡就是 localStorage；測試可以注入假的，不必汙染全域。
 * @param {Storage} [store]
 */
function resolveStore(store) {
  if (store) return store;
  return typeof localStorage !== "undefined" ? localStorage : null;
}

/**
 * 讀取按鍵設定。任何損壞都降級回預設值，永不拋錯。
 * @param {Storage} [store] 可注入的 storage（預設 localStorage）
 * @returns {{foul:string, skip:string, ok:string, undo:string}}
 */
export function loadKeys(store) {
  const out = { ...KEY_DEF };
  try {
    const s = resolveStore(store);
    if (!s) return out;
    const j = JSON.parse(s.getItem(KEYS_STORAGE_KEY) || "{}");
    for (const k of KEY_ORDER) if (j && typeof j[k] === "string" && j[k]) out[k] = j[k];
  } catch (e) {
    /* 壞 JSON、storage 被封鎖：一律回預設 */
  }
  return out;
}

/**
 * 寫入按鍵設定。失敗（配額、隱私模式）靜默吞掉，不影響流程。
 * @param {object} keys 要寫入的按鍵物件
 * @param {Storage} [store]
 * @returns {boolean} 是否寫入成功（原版沒有回傳值，這裡只為測試方便）
 */
export function saveKeys(keys, store) {
  try {
    const s = resolveStore(store);
    if (!s) return false;
    s.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
    return true;
  } catch (e) {
    return false;
  }
}

/** 特殊鍵的顯示文字 */
const LABELS = Object.freeze({
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Space: "空格",
  Enter: "Enter",
  Backspace: "⌫",
  Delete: "Del",
  Home: "Home",
  End: "End",
  PageUp: "PgUp",
  PageDown: "PgDn",
  Insert: "Ins",
  Escape: "Esc",
});

/**
 * 把 KeyboardEvent.code 轉成人看的文字。
 * 未知 code 原樣返回；`NumpadXxx` 未命中正則者仍會變成 `NumXxx`。
 * @param {string} code
 * @returns {string}
 */
export function keyLabel(code) {
  if (LABELS[code]) return LABELS[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return "Num" + code.slice(6);
  return code.replace(/^Numpad/, "Num");
}

/**
 * 從鍵盤事件取出 code。優先順序與原版相同：
 * 1. `e.code` 有值就用
 * 2. 冇 code（合成事件）→ 用 `e.key` 反推
 * @param {{code?:string, key?:string}} e
 * @returns {string}
 */
export function codeOf(e) {
  if (e.code) return e.code;
  const k = e.key || "";
  if (/^Arrow(Left|Right|Up|Down)$/.test(k)) return k;
  if (k === " " || k === "Spacebar") return "Space";
  if (/^[a-zA-Z]$/.test(k)) return "Key" + k.toUpperCase();
  if (/^\d$/.test(k)) return "Digit" + k;
  return k;
}

export default {
  KEY_DEF, KEY_WHAT, KEY_ORDER, KEYS_STORAGE_KEY,
  loadKeys, saveKeys, keyLabel, codeOf,
};
