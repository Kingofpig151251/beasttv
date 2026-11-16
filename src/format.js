/**
 * 文字格式化模組
 *
 * 從 app.js 抽取（原 L347 esc、L1119 fmtScore、L1122-L1128 statLine）。
 * 這三個函式本身都是純函式，但原版 statLine 直接讀模組層的 LANG 與 G.skipPenalty，
 * 所以「搬出來」之前必須先把那兩個隱含輸入變成顯式參數 —— 否則只是把全域依賴
 * 換個檔案住，模組依然不能單獨測試、不能在不同語言／規則組合下重用。
 *
 * 行為等價的關鍵細節（與原版逐項相同）
 * ──────────────────────────────────
 * 1. esc 用 String(s) 先轉字串，所以 esc(null) === "null"、esc(undefined) === "undefined"、
 *    esc(0) === "0"。這不是疏漏，是原版行為，題目／隊名都是字串，非字串輸入只是不會炸。
 * 2. esc 的替換表一次掃描完成（單一 replace + 查表），不會二次跳脫：
 *    esc("&amp;") === "&amp;amp;"。
 * 3. fmtScore 的負號是 U+2212 MINUS SIGN（"−"），不是 ASCII hyphen-minus（"-"）。
 *    -0 不 `< 0`，所以得到 "+0"；大數不加千分位（"+" 直接串 Math.abs）。
 * 4. statLine 的三段順序固定：答中 → 犯規 → 跳過。
 *    犯規只在 truthy 時出現；跳過只在 skipPenalty 為 truthy **且** t.skip 為 truthy 時出現
 *    （t.skip 為 0 不算「跳過過」，這是原版行為）。
 * 5. t.ok 缺失時顯示 0（`t.ok || 0`）。
 *
 * 參數注入
 * ────────
 * statLine 的語言與跳過扣分規則改由呼叫方傳入：
 *   statLine(t, { bold, skipPenalty, lang })
 * 為免呼叫點改寫時漏改，第二個參數收 boolean 時視為 bold（等同舊的 statLine(t, true)）。
 * 選項物件可省略，亦可傳 null／undefined，一律當成全部預設值。
 */

/**
 * HTML 跳脫：& < > " ' 五個字元。
 *
 * @param {*} s 任意值，會先經 String() 轉換
 * @returns {string} 跳脫後的字串
 */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/**
 * 分數顯示：正數前綴 "+"，負數前綴 U+2212。
 *
 * @param {number} v
 * @returns {string}
 */
export function fmtScore(v) {
  return (v < 0 ? "\u2212" : "+") + Math.abs(v);
}

/**
 * 統計文字：答中 N · 犯規 K · 跳過 M（後兩者視情況出現）。
 *
 * @param {{ok?:number, foul?:number, skip?:number}} t 統計物件
 * @param {{bold?:boolean, skipPenalty?:boolean, lang?:string}|boolean} [opts]
 *        第二參數傳 boolean 時視為 bold。
 * @returns {string}
 */
export function statLine(t, opts) {
  const o = typeof opts === "boolean" ? { bold: opts } : opts || {};
  const bold = o.bold;
  const en = o.lang === "en";
  const b = (v) => (bold ? `<b>${v}</b>` : `${v}`);
  const parts = [en ? `${b(t.ok || 0)} correct` : `答中 ${b(t.ok || 0)}`];
  if (t.foul) parts.push(en ? `${b(t.foul)} foul` : `犯規 ${b(t.foul)}`);
  if (o.skipPenalty && t.skip) parts.push(en ? `${b(t.skip)} skipped` : `跳過 ${b(t.skip)}`);
  return parts.join(" · ");
}

export default { esc, fmtScore, statLine };
