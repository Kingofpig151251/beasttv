# beasttv 重寫進度（自動推進用）

> 這份文件是給定時任務用的交接文件。每次自動執行時先讀這份，做完更新這份。

## 目前狀態（2026-11-16 01:45）

- 工作目錄：`C:\Users\KingLEUNGTungLam\DS Bot\beasttv`
- 分支：`rewrite/modular`（**不要動 main**，main 與線上服務要保持可用）
- 最新 commit：`072971e`（CSS 拆檔）
- 測試：**199 個全過**
- `static_check.py`：PASS

## 已完成的成果

### src/ 模組（4 個）

| 檔案 | 內容 | 測試數 |
|---|---|---|
| `src/state.js` | 遊戲狀態機 | 25 |
| `src/i18n.js` | 國際化，110 條字典 | 14 |
| `src/dom.js` | 103 個元素 id 常數（契約哨兵） | 13 |
| `src/sfx.js` | 音效模組 | 19 |

### CSS 拆檔（8 個分片）

`styles.css` 現在只有 8 行 `@import`，實際樣式在 `css/` 下：

| 檔案 | 原行號 | 行數 |
|---|---|---|
| `css/01-base.css` | 1–46 | 46 |
| `css/02-home.css` | 47–163 | 117 |
| `css/03-setup.css` | 164–333 | 170 |
| `css/04-buttons.css` | 334–345 | 12 |
| `css/05-play.css` | 346–481 | 136 |
| `css/06-screens.css` | 482–605 | 124 |
| `css/07-result.css` | 606–738 | 133 |
| `css/08-responsive.css` | 739–981 | 243 |

**驗證方式（雙層）**：
1. 位元組級：8 檔串接後 git 物件雜湊 `4385b32cf11f1a80a7f8d583ffbebb3ea29bd4de` 與 `HEAD:styles.css` 相同
2. 渲染級：headless Chrome 在同一 DOM 上 A/B 對照，24 個選擇器 × 23 個屬性 × 4 個視窗寬度，差異 0

`sw.js` 已處理：CACHE `beast-v17` → `v18`，8 個分片加進 SHELL（cache-first 下必須，否則首次離線載入樣式全失）。

### app.js 狀態機接入

- 狀態機已內嵌（classic script 不能用 import）
- `G.phase` / `G.paused` 是唯讀鏡像，寫入會 console 警告
- 判定路徑全部收斂到 `G.canJudge()` / `G.canUndo()`
- F-01（暫停時仍可判定）、F-02（倒數偷跑）已從結構上修好

### 測試總覽

| 測試檔 | 數量 |
|---|---|
| `logic.test.js` | 28 |
| `real-app.test.js` | 9 |
| `endgame.test.js` | 7 |
| `turn.test.js` | 13 |
| `state.test.js` | 25 |
| `i18n.test.js` | 14 |
| `dom.test.js` | 13 |
| `app-state.test.js` | 9 |
| `sfx.test.js` | 19 |
| `utils.test.js` | 62 |
| **合計** | **199** |

## 執行指令

```powershell
$d="C:\Users\KingLEUNGTungLam\DS Bot\beasttv"
$node="C:\Users\KingLEUNGTungLam\AppData\Local\Programs\DS Bot\resources\primary-runtime\dependencies\node\bin\node.exe"
$py="C:\Users\KingLEUNGTungLam\AppData\Local\Programs\DS Bot\resources\primary-runtime\dependencies\python\python.exe"
Set-Location $d
& $node --test "tests/*.test.js"
& $py tests/ci/static_check.py
```

CI 已改用 glob（`node --test "tests/*.test.js"`），新增測試檔會自動納入。

## 重要背景（不要重複踩坑）

1. **`game.js` / `setup.js` 不能直接拆**。104 個函式的呼叫圖顯示它們依賴核心函式：
   `sfx` 被 11 個呼叫、`renderHome` 8 個、`showView` 8 個、`esc` 7 個、`toast` 7 個。
   硬拆只是把耦合搬家。

2. **`src/` 四個模組目前是「契約哨兵」而非執行期依賴**。`app.js` 是 classic script，
   自己第 344–345 行定義 `$` / `$$`，**執行期沒有載入任何 `src/` 檔案**。
   模組的價值在於測試把關：誰動了 HTML、i18n 字典、狀態機規則，測試會擋。
   要真正載入需改成 module + Vite build，那是另一件事，不要混著做。

3. **`app.js` 是 classic script**，`<script src="/app.js" defer>` 沒有 `type="module"`。

4. **既存死路徑**：`app.js` 查 `#qCount` / `#qHint`，但 HTML 沒有這兩個元素。
   因有 `if()` 判空故不報錯、只是靜默失效。已標記 `DEAD_IDS`。**不要修**。

5. **9 個純裝飾 id 不動**（stepStage、gateText、teCard、exitTitle、exitNote、linkAuthor、
   linkRights、ruleSkip、ruleFoulPen）：app.js 零引用、CSS 無 `#id` 選擇器。
   刪它們屬行為變更。

6. **`parseText` 去重早於 60 字截斷**（既有實作邊界）：兩條前 60 字相同但尾部不同的題目
   會都保留、截斷後看起來一樣。已記錄不改，動它會碰既有斷言。

7. **測試不依賴 node_modules**，只用 `node:test` / `node:assert` / `node:vm` / `node:fs` / `node:path`。

8. **沙箱載入 app.js 需補齊 stub**：`location.pathname`、`addEventListener`、`NodeFilter`、
   `createTreeWalker`、`URLSearchParams`、`localStorage`、`matchMedia`。
   漏一項會令頂層副作用中途失敗、後半段宣告不執行。參考 `tests/sfx.test.js`。

9. **`Object.assign` 會覆寫 setter 而不觸發**。`G.phase` / `G.paused` 是 getter，
   測試替身要用 `mkG()`。

10. **CSS 順序不可重排**。8 個分片是按原檔行號切的，尤其 `08-responsive.css` 的 23 個
    `@media` 靠「後定義覆蓋前定義」生效，同一條件重複出現多次。任何重排都會令樣式塌。

## 紅線

- 不改玩法規則
- 不改三檔分離架構（app.js / styles.css / HTML）
- 不新增 build step
- 不改授權版權文案
- 不動 main 分支
- 不自行 git push
- CSS 分片順序不可重排

## 待辦（按優先序）

### 1. 抽出 src/format.js（下一個）
`esc`、`fmtScore`、`statLine` 這類純函式。純函式、無副作用、不依賴 DOM 或 G。
注意：`statLine` 會讀 `G.skipPenalty` 和 `LANG`，需要設計成可注入或接受參數。
已有 `tests/utils.test.js` 的 62 條可作為行為基準。

### 2. 抽出 src/storage.js
localStorage 五個鍵：`beasttv.lang`、`beasttv.token`、`beasttv.keys`、
`beasttv.reports`、`beastbrand.v1`。要保留 try/catch 降級（隱私模式會拋錯）。

### 3. 抽出 src/keys.js
`loadKeys` / `saveKeys` / `keyLabel` / `codeOf` / `ACT_BY_CODE`。
注意 `codeOf` 有 code 優先、空 code 退回 key 的行為，utils.test.js 已鎖。

## 每次自動執行的流程

1. 讀這份文件
2. 跑一次 `node --test "tests/*.test.js"`，確認基準 199 全過
3. 讀群組「beasttv 模組拆分」看子 Bot 進度（**必須讀群組，不能只看 list_bots**）
4. 用 `git status` 驗證是否有真實落檔
5. 做一個待辦項目（一次只做一件，做完跑測試）
6. 測試全過才 commit（不 push）
7. 更新這份文件
8. 若全部完成或有阻礙，在群組或用戶對話留言說明

## 遇到問題時

- 測試失敗 → 先查是自己改壞還是原本就有問題，不要硬改測試來通過
- 子 Bot 沒落檔 → 自己接手做
- 不確定要不要改 → 不要改，記錄下來等用戶決定
