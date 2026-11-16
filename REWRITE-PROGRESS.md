# beasttv 重寫進度（交接文件）

> 這份文件記錄重寫的現況、執行指令、紅線與待辦。每次繼續工作前先讀這份。
> 定時任務已於 2026-11-16 停用，改由團隊目標（group_goal）並行推進。

## 目前狀態（2026-11-16 更新）

- 工作目錄：`C:\Users\KingLEUNGTungLam\DS Bot\beasttv`
- 分支：`rewrite/modular`（**不要動 main**，main 與線上服務要保持可用）
- 最新 commit：`23fe2d5 refactor(app): 接線 storage.js 模組`
- 測試：**364 個全過**（`node --test "tests/*.test.js"`）
- `static_check.py`：PASS（3 項）
- Vite build：EXIT=0，**15 modules transformed**（產出 `main-*.js` / `app-*.js` / `styles-*.css`，sw.js SHELL 自動改寫）
- 真實瀏覽器雙版本驗證：**dist 11 項 + raw 11 項 = 22 項全 PASS**（無 JS 例外、可進 COUNTDOWN/PLAYING、判定生效、隱藏分頁暫停 phase 正確、無重複載入 JS）

### 已完成：7 個 `src/` 模組全部接線（尚未上線）

`app.js` 已改成 ES module，`index.html` 已 `type="module"`。以下模組已真正 import 進 `app.js`，並由 `tests/helpers/load-app.js` 的 `IMPORT_BINDINGS` 注入沙箱測試：
- `src/format.js`、`src/state.js`、`src/dom.js`、`src/sfx.js`、`src/i18n.js`、`src/keys.js`、`src/storage.js`

接線提交：`d0b591f`（state+sfx）→ `e44744e`（i18n）→ `05c1e5e`（format）→ `876011c`（keys）→ `23fe2d5`（storage）。

### 已完成：Vite build 設定（尚未上線）

新增/調整 `vite.config.js`、`package.json`、`pnpm-workspace.yaml`，`.gitignore` 補上 build 產物。
- PWA 靜態檔原封不動複製到 dist；HTML entry + app.js 打包並改寫 hash 引用；`sw.js` SHELL 自動改寫為實際 hash 資產（含 main/app/css）。

**尚未做（依用戶決定「先做但不上線」）**：
- `vercel.json` 未動（未加 buildCommand / outputDirectory / installCommand），未 push、未合回 main、線上正式站維持現狀

## 已完成的成果

### src/ 模組（7 個，全部已接線）

| 檔案 | 內容 | 測試數（約） |
|---|---|---|
| `src/state.js` | 遊戲狀態機 | 30 |
| `src/i18n.js` | 國際化 | 14 |
| `src/dom.js` | 103 個元素 id 常數（契約哨兵） | 13 |
| `src/sfx.js` | 音效模組 | 19 |
| `src/format.js` | esc / fmtScore / statLine | 32 |
| `src/keys.js` | KEY_DEF / loadKeys / keyLabel / codeOf 等 | 45 |
| `src/storage.js` | 五個 localStorage 鍵讀寫封裝 | 42 |

後三個由團隊目標並行抽出並經交叉驗證後提交（`f0047cd`）。三名驗證者做了突變測試。

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

### 測試總覽（364）

| 測試檔 | 數量 |
|---|---|
| `logic.test.js` | 28 |
| `real-app.test.js` | 9 |
| `endgame.test.js` | 7 |
| `turn.test.js` | 13 |
| `state.test.js` | 30 |
| `i18n.test.js` | 14 |
| `dom.test.js` | 13 |
| `app-state.test.js` | 9 |
| `sfx.test.js` | 19 |
| `utils.test.js` | 62 |
| `format.test.js` | 32 |
| `keys.test.js` | 45 |
| `storage.test.js` | 42 |
| **合計** | **364** |

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

2. **`src/` 七個模組已真正接線**：`app.js` 已是 ES module，執行期由 import 載入各模組；Vite build 也已驗證可行，原始碼狀態與 dist 都可跑。

3. **`app.js` 現為 ES module**（`index.html` 使用 `type="module"`）；Vite build 會打包並改寫 hash 引用，原始碼狀態下瀏覽器也能直接載入模組。

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

### 1. ~~把 `src/` 模組真正接進 app.js~~（已完成）
7 個模組（format/state/dom/sfx/i18n/keys/storage）已全部 import 進 app.js，並通過 364 測試、static check、vite build（15 modules）與 22 項雙版本瀏覽器驗證。

### 2. 上線決策（下一個大關卡）
Vite build 已完整驗證可行，但 `vercel.json` 未動、未部署。
要上線需：
- `vercel.json` 加三行（buildCommand / outputDirectory / installCommand）
- push 後確認 Vercel 部署成功、線上是新版
- 這會動到正式站，**要用戶明確同意才做**

### 3. 其餘可獨立抽出的部分
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
