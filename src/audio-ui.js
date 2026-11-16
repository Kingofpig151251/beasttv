/**
 * 螢幕常亮（Wake Lock）模組
 *
 * 從 app.js 抽取（原 L478-L497 附近）。遊戲進行時防止螢幕熄滅；
 * 省電模式／低電量會拒絕，靜默降級。與音效（sfx.js）職責不同，獨立成模組。
 */

let WAKE = null;

/** 請求螢幕常亮。瀏覽器不支援或被拒絕時靜默略過。 */
export async function wakeOn() {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
  try {
    WAKE = await navigator.wakeLock.request("screen");
    WAKE.addEventListener("release", () => { WAKE = null; });
  } catch (_e) { /* 省電模式／低電量會拒絕，靜默降級 */ }
}

/** 釋放螢幕常亮。 */
export function wakeOff() {
  if (!WAKE) return;
  try { WAKE.release(); } catch (_e) {}
  WAKE = null;
}

/**
 * 安裝可見性變更監聽：頁面重新可見且遊戲處於可喚醒階段時自動重新取得 Wake Lock。
 * @param {() => any} getGame - 回傳目前遊戲狀態 G（或 null）
 */
export function installWakeVisibility(getGame) {
  if (typeof document === "undefined") return;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const G = typeof getGame === "function" ? getGame() : null;
    if (G && (G.phase === "running" || G.phase === "ready" || G.phase === "countdown")) {
      wakeOn();
    }
  });
}
