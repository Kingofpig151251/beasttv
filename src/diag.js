/**
 * 診斷環形緩衝模組
 *
 * 從 app.js 抽取（原 DIAG / diagPush / reportProblem 相關緩衝）。每次出題記一筆，
 * 回報時可一併送出最近紀錄，方便追查空白題等問題。
 */

const DIAG = [];
const MAX_DIAG = 24;

/**
 * 記錄一筆出題診斷。
 * @param {string} text - 題目文字
 * @param {HTMLElement|null} el - 題目顯示元素
 * @param {{ phase?: string, turn?: number, team?: string }} [ctx] - 當前遊戲脈絡
 */
export function diagPush(text, el, ctx = {}) {
  try {
    const card = el && el.parentElement;
    const cs = (typeof getComputedStyle !== "undefined" && el) ? getComputedStyle(el) : null;
    DIAG.push({
      t: String(text == null ? "" : text).slice(0, 40),
      len: String(text == null ? "" : text).length,
      at: new Date().toISOString(),
      fs: cs ? cs.fontSize : "",
      op: cs ? cs.opacity : "",
      vis: cs ? cs.visibility : "",
      sw: el ? el.scrollWidth : 0,
      sh: el ? el.scrollHeight : 0,
      cw: card ? card.clientWidth : 0,
      ch: card ? card.clientHeight : 0,
      mw: (el && el.style && el.style.maxWidth) || "",
      team: ctx.team || "",
      turn: ctx.turn != null ? ctx.turn : -1,
      phase: ctx.phase || ""
    });
    if (DIAG.length > MAX_DIAG) DIAG.shift();
  } catch (_e) {}
}

/** 取得診斷緩衝（原始陣列，與舊版 __bigtv.diag 行為一致）。 */
export function getDiag() {
  return DIAG;
}

/** 取得最近 n 筆診斷紀錄的複本。 */
export function getDiagLog(n = MAX_DIAG) {
  return DIAG.slice(-n);
}

/** 清空診斷緩衝（主要供測試使用）。 */
export function clearDiag() {
  DIAG.length = 0;
}
