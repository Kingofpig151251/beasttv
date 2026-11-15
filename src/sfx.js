/**
 * 音效模組
 *
 * 從 app.js 抽取（原 L861-L931）。這是 app.js 裡唯一真正獨立的子圖：
 * 8 個函式只依賴 audioCtx，對外只碰 window.AudioContext 與 fetch，
 * 不依賴 G、DOM 狀態或任何遊戲邏輯，所以可以安全搬出來。
 *
 * 設計要點（與原版完全一致）
 * ──────────────────────────
 * 1. 音檔分層載入：頁面一開只備好判定用的四聲（26KB），
 *    其餘等第一次觸碰才拉。全部一次過拉會令第一下按掣冇聲 ——
 *    loadSfx 同 pointerdown 同時開始，buffer 未 decode 完。
 * 2. 音檔拿不到就靜靜留空，不影響流程（sfx 回 false）。
 * 3. BGM 無縫 loop：loop = true 之外再加一層保險，
 *    ended 即重新接上，避免個別瀏覽器中斷。
 */

/** 音檔路徑。判定用真音源（門鐘／子彈等）。 */
export const SFX_SRC = Object.freeze({
  ding: "/sfx/dingdong.mp3",
  whoosh: "/sfx/whoosh.mp3",
  heart: "/sfx/hb3.mp3",
  countdown: "/sfx/countdown.mp3",
  whistle: "/sfx/whistle.mp3",
  settle: "/sfx/settle.mp3",
  champion: "/sfx/champion.mp3",
  tick: "/sfx/tick.mp3",
  drums: "/sfx/drums.mp3",
  snare: "/sfx/snare.mp3",
  foul: "/sfx/foul.mp3",
  tap: "/sfx/tap.mp3",
});

/** 判定用的四聲：頁面一開就載 */
export const SFX_CORE = Object.freeze(["tap", "ding", "whoosh", "tick"]);

/** 其餘：等第一次觸碰才拉 */
export const SFX_REST = Object.freeze([
  "countdown", "whistle", "settle", "champion", "drums", "snare", "foul", "heart",
]);

/** 已解碼的音訊 buffer */
const SFX = {};

let AC = null;
let SFX_LOADING = false;
let BGM = null;
let BGM_WANT = null;

/** 取得（並視需要建立／恢復）AudioContext。瀏覽器不支援時回 null。 */
export function audioCtx() {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  if (!AC) AC = new C();
  if (AC.state === "suspended") AC.resume();
  return AC;
}

/** 是否仍在載入音檔（供 UI 判斷） */
export function isSfxLoading() {
  return SFX_LOADING;
}

/** 某個音效是否已就緒 */
export function hasSfx(name) {
  return !!SFX[name];
}

/**
 * 載入指定音效。已載入的會跳過；失敗的靜靜留空。
 * @param {string[]} keys
 */
export async function loadSfx(keys) {
  const c = audioCtx();
  if (!c || !keys) return;
  const todo = keys.filter((k) => !SFX[k]);
  if (!todo.length) return;
  SFX_LOADING = true;
  await Promise.all(
    todo.map(async (k) => {
      try {
        const r = await fetch(SFX_SRC[k], { cache: "force-cache" });
        SFX[k] = await c.decodeAudioData(await r.arrayBuffer());
      } catch (e) {
        /* 音檔拿不到就靜靜留空，唔影響流程 */
      }
    })
  );
  SFX_LOADING = false;
}

/**
 * 播放音效。
 * @param {string} name
 * @param {number} [vol=0.85]
 * @param {number} [rate=1]
 * @param {number} [delay=0] 毫秒
 * @returns {boolean} 是否真的播放了（buffer 未就緒時回 false）
 */
export function sfx(name, vol = 0.85, rate = 1, delay = 0) {
  const c = audioCtx(), buf = SFX[name];
  if (!c || !buf) return false;
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf;
  src.playbackRate.value = rate;
  g.gain.value = vol;
  src.connect(g).connect(c.destination);
  src.start(c.currentTime + Math.max(0, delay) / 1000);
  return true;
}

/**
 * 播放背景音樂（會先停掉現有的）。
 * @param {string} name
 * @param {number} [vol=0.42]
 */
export function bgm(name, vol = 0.42) {
  stopBgm();
  if (!SFX[name]) return;
  BGM_WANT = { name, vol };
  startBgm();
}

/** 開始（或續接）BGM。ended 時自動重新接上，確保無縫。 */
export function startBgm() {
  if (!BGM_WANT) return;
  const c = audioCtx(), buf = SFX[BGM_WANT.name];
  if (!c || !buf) return;
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf;
  src.loop = true;
  src.loopStart = 0;
  src.loopEnd = buf.duration;
  g.gain.value = BGM_WANT.vol;
  src.connect(g).connect(c.destination);
  src.onended = () => {
    if (BGM_WANT) {
      BGM = null;
      setTimeout(startBgm, 0);
    }
  };
  src.start();
  BGM = src;
}

/** 停止 BGM 並清除「想播」的意圖。 */
export function stopBgm() {
  BGM_WANT = null;
  if (BGM) {
    try {
      BGM.onended = null;
      BGM.stop();
    } catch (e) {}
    BGM = null;
  }
}

/** 是否正在播 BGM */
export function isBgmPlaying() {
  return !!BGM;
}

export default {
  SFX_SRC, SFX_CORE, SFX_REST,
  audioCtx, loadSfx, sfx, bgm, startBgm, stopBgm,
  isSfxLoading, hasSfx, isBgmPlaying,
};
