# spike 報告：Vite build 能否與 FastAPI 共存於同一 Vercel 專案

- 分支：`spike/vite-build`（base `main` @ `19b5279`）
- 日期：2026-11-15
- 結論：**走得通**，但有一項關鍵未實測（見「未解風險」§6）

---

## 1. 一句話結論

`vite build` 與既有 FastAPI `api/` 可以放在同一個 Vercel 專案，**不需要 Vercel Services、不需要拆 repo、不需要本機手動 build**。
做法是方案 (a)：`vercel.json` 保留 `functions`，加上 `buildCommand` + `outputDirectory`，`framework` 保持 `null`。

`vite build` 本地實測 **EXIT=0**；dist 內 20 個被引用的資源全部回 200。
**`vercel build` 本地無法執行**——不是設定問題，是這台機器缺 Windows symlink 權限（§5）。

---

## 2. 新增／修改的檔案（全部只在 spike 分支）

| 檔案 | 動作 | 說明 |
|---|---|---|
| `package.json` | 新增 | 只有 `vite` devDependency + `build` script |
| `vite.config.js` | 新增 | 多頁面 input、PWA 靜態檔處理、sw.js SHELL 改寫 |
| `.npmrc` | 新增 | `node-linker=hoisted`（理由見 §5.1） |
| `pnpm-workspace.yaml` | 新增 | `allowBuilds: esbuild: true`（理由見 §5.2） |
| `pnpm-lock.yaml` | 新增 | lockfile |
| `vercel.json` | **修改** | 只加 3 行 |
| `.gitignore` | **修改** | 加 `dist/`、`.pnpm-store/` |

`vercel.json` 的改動僅此三行，其餘（functions、headers、rewrites、cleanUrls、framework）**原封不動**：

```diff
+  "buildCommand": "vite build",
+  "outputDirectory": "dist",
+  "installCommand": "pnpm install --config.nodeLinker=hoisted",
```

> `app.js`、`styles.css`、`index.html`、`edit.html`、`credits.html`、`sw.js`、`api/*.py` **一行都沒改**。

---

## 3. 為什麼是方案 (a)，不是 Services

| | 方案 (a) 單專案 | 方案 (b) Vercel Services |
|---|---|---|
| 設定成本 | vercel.json 加 3 行 | 需要新增 services 設定、兩個 service 各自的 output |
| FastAPI 既有 `api/` | 原封不動 | 要重組目錄結構 |
| 網域 | 同一個 origin，`/api/*` 與靜態檔同源 | 需要處理跨 service 路由 |
| 風險 | 低（只動 build 設定） | 高（改動面大、且是較新的機制） |

**採用 (a)。** 原因：`api/` 目錄是 Vercel 的保留約定，只要 `vercel.json` 仍列出 `functions`，Vercel 就會把 `api/*.py` 編成 serverless function，與 `outputDirectory: "dist"` 互不干擾——靜態檔從 `dist` 出，`/api/*` 走 function。

`framework` 保持 `null` 而不是改成 `"vite"`：
- 改成 `"vite"` 會讓 Vercel 套用 Vite 預設值，可能覆蓋 `outputDirectory` 與 Python function 的偵測。
- `null` + 明確的 `buildCommand`/`outputDirectory` 是最小驚訝原則，也是現況（`framework: null`）的延續。

---

## 4. 實測證據

### 4.1 `vite build`（EXIT=0）

```
vite v7.3.8 building client environment for production...
✓ 7 modules transformed.
dist/credits.html                12.69 kB │ gzip:  5.20 kB
dist/index.html                  15.97 kB │ gzip:  4.86 kB
dist/edit.html                   21.99 kB │ gzip:  7.84 kB
dist/assets/styles-Bm7BSQxA.css  59.92 kB │ gzip: 14.67 kB
dist/assets/app-BjfSi5kw.js      66.35 kB │ gzip: 19.99 kB
✓ built in 179ms
[spike] sw.js SHELL 已改寫 → /assets/styles-Bm7BSQxA.css, /assets/app-BjfSi5kw.js
[spike] index.html script src 已改寫 → /assets/app-BjfSi5kw.js
EXIT=0
```

### 4.2 dist 產物結構正確

`dist` 根目錄保留全部 PWA 檔（**未被 hash、未被搬去 assets/**）：
```
apple-touch-icon.png  credits.html  edit.html  favicon.ico
icon-192.png  icon-512.png  icon-maskable-512.png
index.html  manifest.json  sw.js
assets/  art/  sfx/
```

HTML 內 PWA 路徑完全沒變：
```html
<link rel="manifest" href="/manifest.json">        ← 沒變
<link rel="icon" href="/favicon.ico">              ← 沒變
<link rel="apple-touch-icon" href="/apple-touch-icon.png">  ← 沒變
<link rel="stylesheet" href="/assets/styles-Bm7BSQxA.css">  ← 加了 hash
<script src="/assets/app-BjfSi5kw.js" defer></script>       ← 加了 hash
```

### 4.3 靜態服務實測：20 個引用路徑全 200

```
/                        200      /assets/app-BjfSi5kw.js      200
/edit.html               200      /assets/styles-Bm7BSQxA.css  200
/credits.html            200      /art/team/fox.webp           200
/sw.js                   200      /sfx/tap.mp3                 200
/manifest.json           200      /icon-192.png                200
/app.js                  404  ← 預期：舊檔名已不存在
/styles.css              404  ← 預期：舊檔名已不存在
```

`/app.js`、`/styles.css` 回 404 正是 §5.3 要處理的 sw.js 問題。

### 4.4 打包後 JS 語法有效

`node --check dist/assets/app-BjfSi5kw.js` → **OK**，且 `window.__bigtv` 仍在（第 2071 行）。

---

## 5. 遇到的坑與解法

### 5.1 坑一：pnpm 預設 isolated linking 在 Windows 下讓 vite 找不到 rollup

**現象**：`Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'rollup' imported from node_modules/vite/dist/node/chunks/config.js`

**原因**：pnpm 用 symlink 佈局，vite 內部從自己的路徑解析 `rollup` 時，在 Windows 非管理員帳號下無法跨越 symlink。這是 pnpm + Windows 的經典問題。

**解法**：`.npmrc` 加 `node-linker=hoisted`，改用扁平 node_modules。

**為什麼要在 repo 裡修而不是本機繞**：Vercel 上也會用 pnpm 安裝。若不在 repo 內固定，就會出現「Vercel 上炸、本機過」或反之。hoisted 讓兩邊佈局一致。

### 5.2 坑二：pnpm 10+ 預設封鎖 esbuild 的 postinstall

**現象**：`[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.2` → `exit code 1`

**原因**：pnpm 10 起預設不執行 dependency 的 build script。esbuild 靠 postinstall 下載平台二進位，被擋就無法使用。**這個 exit 1 會讓 Vercel 的 install step 直接失敗**。

**解法**：`pnpm-workspace.yaml`：
```yaml
allowBuilds:
  esbuild: true
```

> 注意：pnpm 11 的鍵名是 `allowBuilds`（布林映射），**不是** `onlyBuiltDependencies`，也**不能**寫在 `package.json` 的 `pnpm` 欄位（實測會報 deprecated 並忽略）。這三種寫法我都試過，只有 `allowBuilds` 有效。

**驗證**：`pnpm install --frozen-lockfile` → **EXIT=0**。

### 5.3 坑三：`<script src="/app.js">` 沒有 `type="module"`，Vite 根本不會打包它

**現象**：
```
<script src="/app.js"> in "/index.html" can't be bundled without type="module" attribute
```
build 仍會成功，但 `app.js` 原封不動被忽略——等於「build 過了但 JS 沒被處理」，是最危險的假成功。

**現況處理**：把 `app.js` 當 rollup 獨立 input 打包，再用 closeBundle 把 dist 內 HTML 的 `/app.js` 改寫成 hash 檔名。磁碟上的 `index.html` 不動。

**拆檔階段必須處理**：那時要真的把 `<script>` 改成 `type="module"`。已實測這條路可行（§5.6）。

### 5.4 坑四：PWA 靜態檔被 Vite 吞進 assets 並改寫路徑

**現象**（第一版沒設 publicDir 時）：`manifest.json`、`icon-*.png`、`art/`、`sfx/` 全被當資產處理，HTML 變成：
```html
<link rel="manifest" href="/assets/manifest-6Bo_Tk4Y.json">   ← 錯
<link rel="icon" href="/assets/icon-192-C-JLzxfj.png">        ← 錯
```

**雙重傷害**：
1. `sw.js` SHELL 寫的 `/manifest.json`、`/icon-192.png` 會 404
2. **`vercel.json` 針對 `/manifest.json` 的 `Content-Type: application/manifest+json` header 規則直接失效**（因為路徑變成 `/assets/manifest-xxx.json`）

**解法**：建置前把 PWA 檔複製到暫存 publicDir（`.vite-public`），Vite 原樣輸出到 dist 根，不改路徑。build 完清掉暫存目錄。

**為什麼不用真 `public/` 目錄**：那需要把 `sw.js`、`manifest.json`、`art/`、`sfx/` 從 repo 根**搬到** `public/` 下，等於動到現有檔案結構，超出本 spike 範圍。拆檔階段可考慮正式搬遷。

### 5.5 坑五：`vercel.json` 的 `installCommand` 與 `.npmrc` 重複

兩個地方都指定 hoisted。保留的原因：`installCommand` 在 Vercel 專案設定裡是可見的，方便日後除錯；`.npmrc` 則保證本機與 CI 一致。兩者一致不衝突。

### 5.6 坑六（已預先驗證）：改成 `type="module"` 後打包正常

拆檔必經之路。實測建置期改寫成 `<script type="module" src="/app.js">`：
```
dist-module/assets/main-B6nTvDt_.js   67.55 kB
probe: module syntax present? no (IIFE/bundle)
```
**輸出不含 ESM 語法**（rollup 打成 IIFE），且 `window.__bigtv` 仍在、`node --check` OK。
意味著 `app.js` 內 163 個頂層 `const/let/function` 不會因為 module 化而丟失作用域——因為它們本來就只被同一個檔案的程式碼引用，沒有 inline event handler 依賴全域（實測 0 個 `onclick=`）。

### 5.7 坑七：`vercel build` 本地無法執行（環境限制，非設定問題）

**現象**：
```
Error: [EPERM] EPERM: operation not permitted, mkdir
  'C:\Users\...\AppData\Local\com.vercel.cli\Cache\builders-vlt'
```
繞過快取目錄後變成：
```
Error: EPERM: operation not permitted, symlink
  '..\..\~npm~@vercel+build-utils@15.4.0\node_modules\@vercel\build-utils' -> '...'
```

**根因**：`vercel build` 要下載 builders 並用 npm 解壓，npm 在 Windows 建 symlink 需要 **SeCreateSymbolicLinkPrivilege**（管理員或開啟開發者模式）。

實測本機：
```
symlink FAIL: 此作業需要系統管理員權限。
IsAdmin = False
whoami /priv → 無 SeCreateSymbolicLinkPrivilege
Docker daemon → 未啟動（無法用容器繞過）
```

**判斷**：這是**本機環境限制**，不是 `vercel.json` 設定錯誤。Vercel 的 Linux Runner 建 symlink 沒有這個限制。
但依紅線要求「不確定的事標需實測」——**「Vercel Runner 上真的會成功」這件事，本地無法證明**，見 §6。

---

## 6. sw.js SHELL 清單問題與兩個方案

### 問題本質

`sw.js` 第 10 行寫死：
```js
const SHELL = [ ..., "/styles.css", "/app.js", ... ];
```
打包後真實檔名是 `/assets/styles-Bm7BSQxA.css`、`/assets/app-BjfSi5kw.js`。
**若不處理**：`c.install` 時 `c.add("/styles.css")` 會拿到 404，`.catch(() => {})` 靜默吞掉 →
**App shell 的 CSS/JS 完全沒進快取 → 離線開啟白屏**。

這是紅線說的「不得破壞現有 PWA 快取而不提出配套」的核心。

### 方案 A：建置時動態產生 SHELL（本 spike 已實作，建議採用）

在 `vite.config.js` 的 `closeBundle` 掃 `dist/assets`，用正則找實際 hash 檔名，回寫 `dist/sw.js` 的 SHELL：

```js
const files = readdirSync(assetsDir);
const app = files.find(n => /^app-.*\.js$/.test(n));
const css = files.find(n => /^styles-.*\.css$/.test(n));
let sw = readFileSync(swPath, "utf8");
sw = sw.replace(/"\/styles\.css"/, `"/assets/${css}"`);
sw = sw.replace(/"\/app\.js"/,   `"/assets/${app}"`);
writeFileSync(swPath, sw, "utf8");
```

**實測輸出**：`const SHELL` 第 10 行變成 `"/assets/styles-Bm7BSQxA.css", "/assets/app-BjfSi5kw.js"`。

| | |
|---|---|
| 優點 | 保留完整預載能力，離線體驗與現況一致；不需改 `sw.js` 原始碼 |
| 缺點 | 依賴 `vite.config.js` 內的正則與檔名約定，日後改 output 命名規則要同步改 |
| PWA 影響 | **零退化**，預載範圍與現在相同 |

### 方案 B：關掉預載，全交給 runtime cache

把 `sw.js` 的 SHELL 縮到只保留不存在 hash 問題的路徑（`/`、`/edit`、`/credits`、`/manifest.json`、icons），CSS/JS 靠現有的 `cacheFirst()` 在首次載入時自動入快取。

| | |
|---|---|
| 優點 | 完全不必管檔名，最簡單、最不會壞 |
| 缺點 | **首次載入的 CSS/JS 沒進快取前，離線一定白屏**；使用者若從未在線上開過，PWA 等於失效 |
| PWA 影響 | **明顯退化**——失去 app shell 離線保證 |

> 方案 B 只有在「願意接受離線能力下降」時才可選。

### 方案 C（補充，未實作）：`import.meta.glob` 產生清單

把 `sw.js` 改成由建置產生的 `sw-manifest.js`，用 `import.meta.glob('/dist/assets/*.{js,css}', { eager: true })` 在 build 期展開。

**判斷**：需要 SW 本身也走 Vite build pipeline（目前 `sw.js` 是靜態檔直接複製），改動面比方案 A 大，且對現況沒有額外好處。**不建議在拆檔前引入**。

### 建議

**用方案 A。** 本 spike 已實作並驗證通過。方案 B 留作 fallback，只有在方案 A 的檔名約定造成維護負擔時才考慮。

---

## 7. 拆檔前必須先解決的問題清單（按優先級）

### P0 — 阻擋上線

1. **`vercel build` 未在真實 Runner 驗證**
   本地因 Windows symlink 權限無法執行（§5.7）。Vercel 專案的 `framework` 目前是 `fastapi`，需改成 `null` 或讓 `vercel.json` 覆蓋。**建議：先推此 spike 分支開一個 Preview 部署，確認 `api/*.py` 仍被編成 function、`/api/*` 回 200、靜態檔從 `dist` 出。** 這是唯一能把「需實測」變成「已實測」的方法。

2. **Vercel 專案 `createDeployments=disabled`**
   Chief 提供的起點事實。不開啟就沒有自動部署，等于「push 即上線」失效。需在 Vercel 專案設定開啟。

3. **`app.js` 缺 `type="module"`**（§5.3）
   目前靠建置期改寫 HTML 繞過。拆檔時必須真的改 `index.html` 的 script 標籤，否則 Vite 永遠不會把 `app.js` 當模組處理，拆檔就失去意義。

### P1 — 拆檔前要定案

4. **`sw.js` 的 CACHE 版本號要自動化**
   現在 `beast-v17` 是手動 bump。檔案帶 hash 後，**每次 build 內容都不同**，若忘記 bump，舊 SW 會繼續派舊的 hash 檔名 → 使用者拿到 404 → 白屏。建議在 `closeBundle` 用內容 hash 或 timestamp 自動寫入 CACHE 版本。

5. **PWA 靜態檔是否正式搬進 `public/`**
   目前用暫存 `.vite-public` 繞過（§5.4）。正式做法應把 `sw.js`、`manifest.json`、`art/`、`sfx/` 搬進 `public/`，讓 Vite 原生處理。但這是**搬檔**，會動到 repo 結構，需 Chief 決定時機。

6. **`installCommand` 與 `.npmrc` 的 node-linker 設定要收斂**
   現在兩處都有。若日後有人只改一處，會出現本地過、Vercel 炸。建議保留 `.npmrc`，`installCommand` 可移除或加註解說明。

### P2 — 拆檔階段一起做

7. **`app.js` 1748 行的拆檔策略未定**
   已確認 163 個頂層宣告、0 個 inline event handler、`window.__bigtv` 是唯一對外出口。拆檔時要決定：按功能切（audio/render/game/network）還是按 view 切。

8. **`edit.html`、`credits.html` 的 CSS 尚未外部化**
   實測這兩頁都是 inline `<style>` + inline `<script>`，沒有引用 `styles.css`/`app.js`。所以它們目前**不參與 Vite 的 JS/CSS 打包**，只是被複製成 HTML。拆檔時若要共用元件，需一併處理這兩頁。

9. **TypeScript 導入時機**
   本 spike 未涉及。`vite` 對 TS 零設定即可用，但要先決定是否保留 `app.js` 的「無模組」風格。

---

## 8. 明確回答「這條路走不走得通」

**走得通。**

- Vite 能 build 現有 `index.html` + `styles.css` + `app.js` + 多頁面（`edit`、`credits`），**不改任何現有檔案內容**。
- FastAPI 的 `api/*.py` 與 `outputDirectory: "dist"` 可以共存，靠 `vercel.json` 加 3 行即可，不需要 Vercel Services。
- PWA 快取邏輯可以完整保留（方案 A 已實作並驗證）。
- 三個 pnpm/Vite 的坑（rollup 解析、esbuild postinstall、script 缺 module）都已解並寫進設定，Vercel 上不會重蹈。

**唯一未證實的一環**：Vercel Runner 上實際 build 的結果。
本地環境（Windows 非管理員 + 無 Docker daemon）無法跑 `vercel build`，這是環境限制而非設定問題。**需要用 Preview 部署做最終確認**——這也是我建議的下一步。

---

## 9. 復現指令（在 spike 分支）

```powershell
pnpm install --frozen-lockfile
pnpm build            # = vite build，EXIT=0
Get-ChildItem dist    # 驗證 PWA 檔在根、assets 帶 hash
Select-String -Path dist/sw.js -Pattern 'assets/'
```

`vercel build` 在具備 symlink 權限的環境（Vercel Runner / 管理員 PowerShell / 開啟開發者模式）執行。
