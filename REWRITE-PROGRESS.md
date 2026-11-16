# beasttv 重寫進度（交接文件）

> 這份文件記錄重寫的現況、執行指令、紅線與待辦。每次繼續工作前先讀這份。
> 定時任務已於 2026-11-16 停用，改由團隊目標（group_goal）並行推進。

## 目前狀態（2026-11-16 08:00）

- 工作目錄：`C:\Users\KingLEUNGTungLam\DS Bot\beasttv`
- 分支：`rewrite/modular`（**不要動 main**，main 與線上服務要保持可用）
- 最新 commit：`f0047cd`（三個純函式模組）
- 測試：**358 個全過**
- `static_check.py`：PASS
- headless Chrome 完整一局實測：13/13 通過

## 已完成的成果

### src/ 模組（7 個）

| 檔案 | 內容 | 測試數 |
|---|---|---|
| `src/state.js` | 遊戲狀態機 | 25 |
| `src/i18n.js` | 國際化，110 條字典 | 14 |
| `src/dom.js` | 103 個元素 id 常數（契約哨兵） | 13 |
| `src/sfx.js` | 音效模組 | 19 |
| `src/format.js` | esc / fmtScore / statLine | 32 |
| `src/keys.js` | KEY_DEF / loadKeys / keyLabel / codeOf 等 | 見下表 |
| `src/storage.js` | 五個 localStorage 鍵讀寫封裝 | 82 |

後三個由團隊目標並行抽出：施工A/B/C 施工、驗證A/B/C 交叉驗證、
Chief 收尾兩處行為分歧後統一提交（`f0047cd`）。三名驗證者都做了突變測試
（改壞模組看測試能否抓到），證明測試不是空殼。

### 兩處行為分歧（已收尾，重要）

1. **addReport**：原版 `saveReportLocal`（app.js L1166-1171）直接存取
   `localStorage.getItem`，getItem 拋錯時整筆放棄、storage 原封不動。
   模組初版用 `readRaw()` 會降級成 `[]` 後照常寫入，經 Chief 重現確認後
   改回照原版字面直接存取，並補測試鎖住
   （`getItem 拋錯但 setItem 成功 → 不寫入`）。
2. **getToken**：原版 `TOKEN()` 沒有 try/catch，隱私模式會拋 SecurityError
   導致啟動中斷（app.js 無全域 error handler）。模組保留吞例外回空字串，
   這是**刻意的改進**，已寫進 `src/storage.js` 檔案頭明確標記，不默默修掉。
   日後若要讓 app.js 也改用安全版，屬行為變更，要用戶同意。

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

### 測試總覽（358）

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
| `format.test.js` | 32 |
| `keys.test.js` | 約 60 |
| `storage.test.js` | 82 |
| **合計** | **358** |

CI 已用 glob（`node --test "tests/*.test.js"`），新增測試檔自動納入。

## 執行指令

```powershell
$d="C:\Users\KingLEUNGTungLam\DS Bot\beasttv"
$node="C:\Users\KingLEUNGTungLam\AppData\Local\Programs\DS Bot\resources\primary-runtime\dependencies\node\bin\node.exe"
$py="C:\Users\KingLEUNGTungLam\AppData\Local\Programs\DS Bot\resources\primary-runtime\dependencies\python\python.exe"
Set-Location $d
& $node --test "tests/*.test.js"
& $py tests/ci/static_check.py
```

## 重要背景（不要重複踩坑）

1. **`game.js` / `setup.js` 不能直接拆**。104 個函式的呼叫圖顯示它們依賴核心函式：
   `sfx` 被 11 個呼叫、`renderHome` 8 個、`showView` 8 個、`esc` 7 個、`toast` 7 個。
   硬拆只是把耦合搬家。

2. **`src/` 七個模組目前是「契約哨兵」而非執行期依賴**。`app.js` 是 classic script，
   自己第 344–345 行定義 `$` / `$$`，**執行期沒有載入任何 `src/` 檔案**。
   模組的價值在於測試把關。要真正載入需改成 module + Vite build，
   那是另一件事，不要混著做。

3. **`app.js` 是 classic script**，`<script src="/app.js" defer>` 沒有 `type="module"`。

4. **既存死路徑**：`app.js` 查 `#qCount` / `#qHint`，但 HTML 沒有這兩個元素。
   因有 `if()` 判空故不報錯、只是靜默失效。已標記 `DEAD_IDS`。**不要修**。

5. **9 個純裝飾 id 不動**（stepStage、gateText、teCard、exitTitle、exitNote、linkAuthor、
   linkRights、ruleSkip、ruleFoulPen）：app.js 零引用、CSS 無 `#id` 選擇器。

6. **`parseText` 去重早於 60 字截斷**（既有實作邊界）：兩條前 60 字相同但尾部不同的題目
   會都保留、截斷後看起來一樣。已記錄不改。

7. **測試不依賴 node_modules**，只用 `node:test` / `node:assert` / `node:vm` / `node:fs` / `node:path`。

8. **沙箱載入 app.js 需補齊 stub**：`location.pathname`、`addEventListener`、`NodeFilter`、
   `createTreeWalker`、`URLSearchParams`、`localStorage`、`matchMedia`。
   漏一項會令頂層副作用中途失敗、後半段宣告不執行。參考 `tests/sfx.test.js`。

9. **`Object.assign` 會覆寫 setter 而不觸發**。`G.phase` / `G.paused` 是 getter，
   測試替身要用 `mkG()`。

10. **CSS 順序不可重排**。尤其 `08-responsive.css` 的 23 個 `@media` 靠
    「後定義覆蓋前定義」生效，任何重排都會令樣式塌。

11. **行數統計用 `[System.IO.File]::ReadAllLines().Length` 或 `node -e`**。
    PowerShell 5.1 的 `Get-Content` 對純 LF 的 UTF-8 中文檔會少算，
    `Measure-Object -Line` 算的是非空白行，三者數字不同，不是有人說謊。

12. **`@import` 的樣式表在 `document.styleSheets` 裡 `href` 為 null**，
    用「數有幾個 /css/ 開頭的 href」檢查分片會誤判。改量 `:root` 的 CSS 變數
    （例如 `--bg`）computed style。

13. **13 個 API 端點定義在 `api/_app.py`**：signup / login / logout / config / me /
    banks(GET,POST) / newbank / findbank / text(GET,PUT) / report(POST,GET)。
    本輪完全沒動 `api/` 與三個 HTML 檔；只動了 `sw.js`（必要的 CACHE bump）。

## 紅線

- 不改玩法規則
- 不改三檔分離架構（app.js / styles.css / HTML）
- 不新增 build step
- 不改授權版權文案
- 不動 main 分支
- 不自行 git push
- CSS 分片順序不可重排

## 待辦（按優先序）

### 1. 決定何時把 `src/` 真正接進 app.js
目前七個模組是契約哨兵，執行期沒被載入。要讓重寫真正落地，
需改成 module + Vite build（spike 分支 `spike/vite-build` 已驗證可行）。
這是**下一個大決策**，會動到部署方式，要用戶同意才做。

### 2. 其餘可獨立抽出的部分
- `src/audio-ui.js`：wakeOn / wakeOff（螢幕常亮，與音效不同職責）
- `src/diag.js`：DIAG 環形緩衝與 diagPush

### 3. 最終合併
全部完成且用戶同意後，才把 `rewrite/modular` 合回 main 並部署。

## 工作守則

- 用戶偏好用**團隊目標（group_goal）並行**推進，不設定時任務
- 派工後要**主動回報**，不能等用戶問
- 每條「已完成」都要用 `git status`／實際讀檔核對，不信 Bot 自述
- 回報必須附真實測試輸出與「實際改了哪些檔案、幾行」
- 測試失敗先查真正原因，不要改測試來遷就
- 不確定要不要改 → 不要改，記錄下來等用戶決定
