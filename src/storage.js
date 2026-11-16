/**
 * localStorage 存取集中層
 *
 * 從 app.js 抽取五個持久化鍵的讀寫，行為與原版逐項對等：
 *
 *   鍵名                  型別            原 app.js 位置
 *   ─────────────────────────────────────────────────────
 *   beasttv.lang          string "en"/"zh"   L99-100, L251
 *   beasttv.token         string             L352, L1975, L1998
 *   beasttv.keys          JSON object        L1814, L1822
 *   beasttv.reports       JSON array(≤10)    L1168-1169
 *   beastbrand.v1         JSON object|null   L396, L401, L425
 *
 * 設計原則
 * ────────
 * 1. 每個讀寫都包 try/catch。隱私模式、Safari 封鎖第三方 storage 時
 *    localStorage 存取本身會拋錯，原版靜默吞掉，本層一樣靜默降級。
 * 2. 鍵名是外部契約：改一個字元，舊用戶的本機資料就讀不到。KEYS 凍結。
 * 3. 每次呼叫都重新讀 globalThis.localStorage，不快取節點。
 *    這樣（a）測試可以換掉 localStorage 模擬失敗，（b）隱私模式下
 *    storage 不存在時自然降級，不必特判。
 *
 * 與 src/keys.js 的邊界
 * ─────────────────────
 * 本層只管「I/O + 降級」，不管資料結構的預設值與驗證。
 * beasttv.keys 的 KEY_DEF 合併、欄位型別檢查、KEY_ORDER 由 src/keys.js 負責；
 * 這裡只提供 getKeysRaw() / setKeysRaw() 的原始 JSON 物件讀寫。
 * 兩者組合使用：keys.js 拿 storage.getKeysRaw() 的結果再套自己的預設。
 *
 * 與原版唯一一處刻意差異（已記錄、已回報）
 * ──────────────────────────────────────────
 * 原 app.js 的 TOKEN() 是 `localStorage.getItem("beasttv.token") || ""`，
 * **沒有** try/catch。隱私模式下 getItem 拋錯時會把例外往上拋；
 * 而 app.js 沒有全域錯誤處理，所以啟動會中斷、畫面停在首頁。
 *
 * 本層的 getToken() 用 readRaw() 吞掉例外、回空字串。這是**刻意的改進**，
 * 不複製原版缺陷：模組是全新公開 API，沒有任何既有呼叫點依賴「會拋錯」，
 * 把一個已知會炸的行為帶進新介面只會製造未來的坑。
 *
 * 正常瀏覽器上兩者完全同值；差異只存在於「原版本來就會炸」的隱私模式。
 * 這個差異必須保留在文件裡，不能默默修掉——它屬行為變更，要讓使用者知道。
 */

/** 五個持久化鍵。鍵名是外部契約，不可改。 */
export const KEYS = Object.freeze({
  LANG: "beasttv.lang",
  TOKEN: "beasttv.token",
  KEYS: "beasttv.keys",
  REPORTS: "beasttv.reports",
  BRAND: "beastbrand.v1",
});

/** 問題回報保留筆數上限（原 app.js `arr.slice(-10)`）。 */
export const REPORTS_LIMIT = 10;

/** 合法語言值。 */
export const LANGS = Object.freeze(["zh", "en"]);

/**
 * 取得 localStorage。
 * 取不到（Node、隱私模式、被 iframe 封鎖）時回 null，不拋錯。
 * @returns {Storage|null}
 */
function store() {
  try {
    return globalThis.localStorage || null;
  } catch (_) {
    return null;
  }
}

/**
 * 讀原始字串。任何失敗（storage 不存在、getItem 拋錯）都回 null。
 * @param {string} key
 * @returns {string|null}
 */
export function readRaw(key) {
  try {
    const s = store();
    if (!s) return null;
    return s.getItem(key);
  } catch (_) {
    return null;
  }
}

/**
 * 寫原始字串。失敗一律吞掉。
 * @param {string} key
 * @param {string} value
 * @returns {boolean} 是否寫入成功（呼叫方通常不需要，供測試與除錯用）
 */
export function writeRaw(key, value) {
  try {
    const s = store();
    if (!s) return false;
    s.setItem(key, String(value));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * 刪除鍵。失敗一律吞掉。
 * @param {string} key
 * @returns {boolean}
 */
export function removeRaw(key) {
  try {
    const s = store();
    if (!s) return false;
    s.removeItem(key);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * 讀 JSON。解析失敗或不存在時回 defaultValue。
 * 對應原 app.js L274 `store.get(k,d)`：`v ? JSON.parse(v) : d`，
 * 注意空字串會被當成「不存在」而回預設值（原版就是這樣）。
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
export function readJson(key, defaultValue) {
  try {
    const v = readRaw(key);
    return v ? JSON.parse(v) : defaultValue;
  } catch (_) {
    return defaultValue;
  }
}

/**
 * 寫 JSON。失敗一律吞掉。
 * 對應原 app.js L275 `store.set(k,v)`。
 * @param {string} key
 * @param {*} value
 * @returns {boolean}
 */
export function writeJson(key, value) {
  try {
    return writeRaw(key, JSON.stringify(value));
  } catch (_) {
    return false;
  }
}

/* ────────────────────────── 語言 ────────────────────────── */

/**
 * 讀語言偏好。
 * 原 app.js L100：`getItem(LANG_KEY) === "en" ? "en" : "zh"`。
 * 任何非 "en" 的值（null、""、"xx"）都回 "zh"。
 * @returns {"zh"|"en"}
 */
export function getLang() {
  return readRaw(KEYS.LANG) === "en" ? "en" : "zh";
}

/**
 * 寫語言偏好。原 app.js L250-251 先正規化再存。
 * @param {"zh"|"en"} lang
 * @returns {"zh"|"en"} 實際存入的值
 */
export function setLang(lang) {
  const v = lang === "en" ? "en" : "zh";
  writeRaw(KEYS.LANG, v);
  return v;
}

/* ────────────────────────── Token ───────────────────────── */

/**
 * 讀登入 token。正常情況對等原 app.js L352 的
 * `getItem("beasttv.token") || ""`。
 *
 * 唯一差異：storage 拋錯時回空字串而非往上拋（見檔案頭「唯一一處刻意差異」）。
 * @returns {string}
 */
export function getToken() {
  return readRaw(KEYS.TOKEN) || "";
}

/**
 * 寫登入 token。edit.html 收到 /api/login 後呼叫。
 * @param {string} token
 * @returns {boolean}
 */
export function setToken(token) {
  return writeRaw(KEYS.TOKEN, String(token ?? ""));
}

/**
 * 清除登入 token（登出、401、token 失效三處都用這個）。
 * @returns {boolean}
 */
export function clearToken() {
  return removeRaw(KEYS.TOKEN);
}

/* ────────────────────────── 按鍵設定 ─────────────────────── */

/**
 * 讀按鍵設定的原始 JSON 物件。
 * 原 app.js L1814：`JSON.parse(getItem("beasttv.keys") || "{}")`，損壞回 `{}`。
 *
 * 注意：這裡**不做** KEY_DEF 合併與欄位驗證，那是 src/keys.js 的職責。
 * 回傳值可能是任何 JSON 型別（若用戶手改過 storage），呼叫方要自行檢查。
 * @returns {object} 解析失敗或不存在時回空物件
 */
export function getKeysRaw() {
  return readJson(KEYS.KEYS, {});
}

/**
 * 寫按鍵設定。原 app.js L1822。
 * @param {object} keys
 * @returns {boolean}
 */
export function setKeysRaw(keys) {
  return writeJson(KEYS.KEYS, keys);
}

/* ────────────────────────── 品牌 ────────────────────────── */

/**
 * 讀品牌快取。原 app.js L401：`JSON.parse(getItem(BRAND_KEY) || "null")`。
 * 不存在或損壞都回 null（原版用 `if(c && c.t)` 判空）。
 * @returns {{t?:string,s?:string}|null}
 */
export function getBrand() {
  return readJson(KEYS.BRAND, null);
}

/**
 * 寫品牌快取。原 app.js L425 存的是 `{t,s}`。
 * @param {{t?:string,s?:string}} brand
 * @returns {boolean}
 */
export function setBrand(brand) {
  return writeJson(KEYS.BRAND, brand);
}

/**
 * 清除品牌快取。
 * @returns {boolean}
 */
export function clearBrand() {
  return removeRaw(KEYS.BRAND);
}

/* ────────────────────────── 問題回報 ─────────────────────── */

/**
 * 讀問題回報陣列。原 app.js L1168：`JSON.parse(getItem(k) || "[]")`。
 * 損壞時回空陣列。
 * @returns {Array} 解析失敗、不存在、或存的不是陣列時回空陣列
 */
export function getReports() {
  const v = readJson(KEYS.REPORTS, []);
  return Array.isArray(v) ? v : [];
}

/**
 * 追加一筆問題回報，只保留最新 REPORTS_LIMIT 筆。
 * 對應原 app.js L1166-1171 `saveReportLocal(p)`：
 *
 *     try{
 *       const arr = JSON.parse(getItem(k) || "[]");
 *       arr.push(p); setItem(k, JSON.stringify(arr.slice(-10)));
 *     }catch(e){}
 *
 * 行為逐項對等，包含兩個原本就有的邊界：
 * - 既有內容是損壞 JSON → 例外被吞掉，**這筆回報不會寫入**（原版如此）。
 * - 既有內容是合法 JSON 但不是陣列（例如物件）→ push 拋錯被吞掉，
 *   同樣不寫入（原版如此）。
 * 我沒有「順手修好」這兩點，因為那會改變行為。
 *
 * @param {*} entry
 * @returns {boolean} 是否寫入成功
 */
export function addReport(entry) {
  try {
    /* 刻意不用 readRaw()／readJson()：兩者都會把「getItem 拋錯」降級成 null／[]，
       然後照常寫入成功。原版 L1168 是直接 localStorage.getItem(k)，
       getItem 拋錯時整段跳進 catch、**這筆回報不寫入、storage 原封不動**。
       這裡照原版字面直接存取，讓例外自然跳到 catch。 */
    const s = store();
    if (!s) return false;
    const arr = JSON.parse(s.getItem(KEYS.REPORTS) || "[]");
    arr.push(entry);
    s.setItem(KEYS.REPORTS, JSON.stringify(arr.slice(-REPORTS_LIMIT)));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * 清除全部問題回報。
 * @returns {boolean}
 */
export function clearReports() {
  return removeRaw(KEYS.REPORTS);
}

export default {
  KEYS,
  REPORTS_LIMIT,
  LANGS,
  readRaw,
  writeRaw,
  removeRaw,
  readJson,
  writeJson,
  getLang,
  setLang,
  getToken,
  setToken,
  clearToken,
  getKeysRaw,
  setKeysRaw,
  getBrand,
  setBrand,
  clearBrand,
  getReports,
  addReport,
  clearReports,
};
