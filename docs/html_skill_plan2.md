---
doc_id: doc_other_0008
status: HISTORICAL
superseded_by: docs/html_skill_plan5.md
onboarding_doc: docs/html_skill_postmortem.md
---

# HTML Skill Plan 2

> 2026-04-29 狀態：本檔已轉為 HTML-to-UCUF v2 歷史實作紀錄。後續 95% 推進與未完成項請先讀 `docs/html_skill_plan3.md`；只有需要 R-1~R-30 證據時才用 grep 定位本檔局部段落，避免 context budget hard-stop。

## 1. 文件目的

本文件定義 HTML-to-UCUF skill 的第二版正式目標：從「HTML / CSS 草稿轉成 UCUF JSON」升級為「指定來源目錄、轉成 Cocos UI、並以 Cocos Editor 實際畫面對 HTML 來源畫面達 95% 以上相似度」的閉環流程。

舊版 `docs/html_skill_plan.md` 仍保留為工具演進歷史與 Phase A 參考；本文件優先處理這次驗證暴露出的核心問題：browser 端 `source HTML vs UCUF preview` 分數不能代表 Cocos runtime fidelity。新版 skill 的最終通過條件必須看 `HTML source screenshot vs Cocos Editor screenshot`。

Unity 對照：舊流程像是把 UXML / USS 轉成 ScriptableObject 草稿；新版流程要進一步完成 Prefab 實機畫面驗收，以 Game View / Editor Preview 截圖與原始設計稿做百分比比對，沒有達標不得宣稱 production-ready。

## 2. Skill 目標

HTML-to-UCUF v2 的目標如下：

1. 以 source package 作為唯一正式輸入，不再讓 HTML、token、CSS 分散在不同隱性預設路徑。
2. 在流程開始前驗證 `ui-design-tokens.json`、`colors_and_type.css`、主要 HTML 都存在且合法。
3. 把 HTML / CSS / token 中可規則化的資訊拆解成 UCUF layout / skin / screen / sidecar。
4. 明確標出無法直譯到 Cocos 的 CSS primitive，改走 assetize、skin layer、manual rewrite 或 rule evolution。
5. 將 browser preview compare 降級為前置診斷，不得作為最終通過依據。
6. 以 Cocos Editor 目前畫面的 screenshot 對 HTML source reference screenshot 做 pixel score，`runtimeVsSource.score >= 0.95` 才能通過。
7. 當解析不足或分數低於門檻時，把可改進規則回寫 `docs/html_skill_rule-evolution2.md`，讓後續 skill run 能讀取已接受規則並自動改善。

## 3. 與舊版流程的關係

舊版流程仍可作為 Phase A 的局部工具集，但以下觀念在 v2 中必須修正：

| 舊觀念 | v2 修正 |
|---|---|
| `--input <html>` 是正式入口 | 正式入口改為 `--source-dir <dir>`；`--input` 僅保留 debug / legacy alias |
| browser `sourceVsUcuf` 達 95% 可以視為通過 | 只能視為前置診斷；最終 gate 必須是 Cocos Editor screenshot vs HTML source screenshot |
| token registry 可依賴 runtime + old handoff 預設 | source package 的 `ui-design-tokens.json` 是本畫面的 authority；runtime token 只能補充 |
| HTML link CSS 只要 browser 看得到即可 | converter 必須也吃得到 `colors_and_type.css`；不能只在 snapshot 階段可見 |
| `runtime-screen-diff.js --runtime` 有圖即可 cutover | `runtimeVsSource.score` 不得為 null；必須實際計分 |
| skip annotate / optimize / compare 後仍可宣稱 workflow pass | skip 類參數只能 debug；正式流程不可用 skip 結果通過 |

## 4. Source Package Contract

### 4.1 必要輸入

正式 skill input 必須指定來源目錄：

```bash
node tools_node/run-ui-workflow.js --workflow html-to-ucuf \
  --source-dir "Design System 3" \
  --main-html "ui_kits/character/index.html" \
  --screen-id character-ds3-main \
  --bundle lobby_ui
```

`--source-dir` 指向的目錄必須包含：

| 檔案 | 用途 | 必要性 |
|---|---|---|
| `ui-design-tokens.json` | 本畫面 color / spacing / typography authority | 必要 |
| `colors_and_type.css` | CSS variables、font-face、全域 type/color style | 必要 |
| 主要 HTML | 實際畫面來源；可為 static HTML 或需要 pre-render 的 HTML | 必要 |

若 source dir 下只有一個 HTML，可自動視為 main HTML；若有多個 HTML，必須提供 `--main-html <relativePath>`。`--main-html` 必須是 source dir 內的相對路徑，不得使用絕對路徑或 `..` 穿出 source dir。

### 4.2 起始合法性檢查

新增 source package validator，流程一開始就檢查：

1. `--source-dir` 存在且為目錄。
2. `ui-design-tokens.json` 存在、可 parse，且至少包含 `colors`、`spacing`、`typography` 三個 root key。
3. `colors_and_type.css` 存在、可讀，且包含 `:root` 或 CSS variable 定義。
4. main HTML 存在、可讀，且 `<body>` 內有可渲染根節點。
5. HTML 中的 `<link rel="stylesheet">` 必須能解析到本地檔案；若連到外部 URL，必須列入 unsupported external dependency。
6. source package hash 必須寫入 manifest：HTML hash、CSS hash、token hash、source dir path、main HTML path、viewport。

任何必要檔案缺失或 JSON / HTML / CSS 不合法，CLI 直接 exit 2，不可等到轉換中段才 fallback。

### 4.3 Source Package Manifest

每次 run 都要輸出：

```text
artifacts/skill-test-html-to-ucuf/<screen-id>/<screen-id>.source-package.json
```

建議 schema：

```json
{
  "screenId": "character-ds3-main",
  "sourceDir": "Design System 3",
  "mainHtml": "ui_kits/character/index.html",
  "tokens": "ui-design-tokens.json",
  "css": "colors_and_type.css",
  "hashes": {
    "html": "sha256:...",
    "css": "sha256:...",
    "tokens": "sha256:..."
  },
  "validatedAt": "2026-04-28T00:00:00.000Z",
  "warnings": []
}
```

## 5. CLI 契約與過時參數清理

### 5.1 新版正式入口

正式入口為：

```bash
node tools_node/run-ui-workflow.js --workflow html-to-ucuf \
  --source-dir <dir> \
  --main-html <relative-html> \
  --screen-id <screen-id> \
  --bundle <bundle> \
  --editor-screenshot <png>
```

`--editor-screenshot` 可由 `cocos-screenshot` skill / PrintWindow 產生；若要自動化，後續可新增 `--editor-target <target>` 由工具包裝截圖流程。

### 5.2 內部與 debug 參數

以下參數降級為內部或 debug 用途，不得在 skill 正式流程中作為主要入口：

| 參數 | v2 狀態 | 原因 |
|---|---|---|
| `--input <html>` | legacy / debug alias | 無法保證 tokens/CSS 與 HTML 同源 |
| `--tokens-runtime` / `--tokens-handoff` | internal only | 常規來源應由 source package 提供 |
| `--content-contract` | 待決 | 若不能接到 annotation / validation，從 public flow 移除 |
| `--skip-annotate` | debug only | 正式流程不可跳過語意補強後宣稱通過 |
| `--skip-optimize` | debug only | 正式流程不可跳過 runtime node budget |
| `--skip-compare` | debug only | 正式流程不可跳過視覺診斷 |
| `--warn-only` | debug only | 正式 flow 必須 fail-fast |

### 5.3 建議新增工具模組

| 模組 | 職責 |
|---|---|
| `tools_node/lib/html-to-ucuf/source-package.js` | 解析與驗證 source dir、main HTML、token、CSS、hash manifest |
| `tools_node/compare-html-to-cocos-editor.js` | HTML reference screenshot vs Cocos Editor screenshot pixel score |
| `tools_node/lib/dom-to-ui/css-capability-matrix.js` | CSS property supported / assetize / unsupported 分流 |
| `tools_node/lib/dom-to-ui/rule-evolution2.js` | 產生與讀取 rule-evolution2 entry |

## 6. 拆解搬到 Cocos 的原理

### 6.1 Pre-render 與 DOM 來源

HTML 若使用 React / Babel / Vue / Svelte / runtime script 產生主要 DOM，不可直接丟給靜態 parser。必須先用 browser pre-render 取得 `document.documentElement.outerHTML` 與 computed style snapshot。

輸入 HTML 的 `<link rel="stylesheet">` 與 source package 的 `colors_and_type.css` 都必須被 converter 讀取。browser 能看到 CSS 不代表 JSON converter 已吃到 CSS。

### 6.2 DOM -> UCUF Layout

DOM 結構轉成 UCUF layout 時，遵守以下映射：

| HTML / CSS 意圖 | UCUF / Cocos 對應 |
|---|---|
| page root / fixed viewport | root canvas + fill widget |
| generic block | `container` |
| visual panel / background block | `panel` + skin slot |
| `img` / background image | `image` 或 skin sprite layer |
| `p` / `span` / heading | `label` |
| `button` / clickable element | `button` + interaction draft |
| `display:flex` | Cocos `Layout` horizontal / vertical |
| `display:grid` | Cocos grid layout contract |
| `gap` / `padding` | layout spacing / widget inset |
| tab area | `lazySlot` 或 `child-panel` route |
| scroll area | `scroll-view` contract |

layout 不得存放 hex color、font path、local absolute path、`db://` raw path 或 Cocos class name。

### 6.3 CSS / Token -> UCUF Skin

skin 負責承接視覺素材與文字樣式：

1. color：優先映射 source token；不能映射者進 token suggestion / evolution2。
2. typography：fontSize、lineHeight、fontWeight、letterSpacing 反查 source token。
3. spacing：padding、gap、margin 反查 spacing token；無 token 時保留 px 並列入 suggestion。
4. image：本地素材轉 sprite-frame 候選；不允許直接寫本機絕對路徑。
5. button state：normal / hover / pressed / disabled / focus 必須有 state layer 或明確 warning。

### 6.4 CSS Effect 三分流

HTML/CSS 中的視覺 primitive 分成三類：

| 類別 | 處理方式 | 範例 |
|---|---|---|
| supported | 直接轉成 layout / skin | color、fontSize、lineHeight、padding、gap、basic border |
| assetize | 產出 skin layer 或 asset task | gradient、shadow、ornate border、complex background |
| unsupported | 產 evolution2 candidate，不可靜默 fallback | filter、clip-path、blend mode、pseudo-element content、complex animation |

大面積視覺差異通常來自 gradient / shadow / filter / pseudo-element / font-face / background image，而不是少數字級或間距。v2 報告必須把 top offender 列出來，避免把全局差異誤判成局部微調。

### 6.5 Runtime Contract

畫面能看不代表能上線。正式 cutover 前必須確認：

1. content contract 不丟失。
2. button / tab / route / modal interaction 不丟失。
3. lazySlot / ChildPanel route 可被 runtime mount。
4. runtime state 走 registry 或 component-owned provider。
5. CompositePanel / ChildPanel smoke route 通過。

## 7. 完整驗證方法

### 7.1 Gate 分層

| Gate | 目的 | 通過條件 |
|---|---|---|
| Source package gate | 確認三件套與 HTML 合法 | validator pass |
| Convert gate | layout / skin / screen 可生成 | raw pass + strict replay pass |
| UCUF schema gate | 專案 JSON 契約合法 | `validate-ui-specs.js --strict --check-content-contract` pass |
| Browser diagnostic gate | 早期看到 source vs UCUF preview 差異 | 只輸出診斷，不作 final pass |
| Cocos Editor visual gate | 最終 fidelity 驗收 | `runtimeVsSource.score >= 0.95` |
| Logic / interaction gate | 防止功能被洗掉 | logic guard / smoke route pass |
| Evolution gate | 失敗可學習 | fail 時產 evolution2 candidate |

### 7.2 HTML Source Reference Screenshot

source reference screenshot 必須使用同一份 source package：

1. main HTML。
2. `colors_and_type.css`。
3. `ui-design-tokens.json`。
4. 相同 viewport / design canvas。
5. 同一套 font fallback policy。

若 source HTML 需 pre-render，reference screenshot 應以 pre-render 後 DOM 為準，並保存 rendered HTML artifact。

### 7.3 Cocos Editor Screenshot

Cocos screenshot 必須來自 Editor / Editor Preview 目前畫面。短期由 `cocos-screenshot` skill 使用 PrintWindow 產生 PNG，然後傳給 compare CLI：

```bash
node tools_node/compare-html-to-cocos-editor.js \
  --source-dir "Design System 3" \
  --main-html "ui_kits/character/index.html" \
  --screen-id character-ds3-main \
  --editor-screenshot artifacts/screenshots/character-ds3-editor.png \
  --output artifacts/runtime-diff/character-ds3
```

工具必須輸出：

1. `<screen>.html-cocos-verdict.json`
2. `<screen>.html-cocos-compare.png`
3. `<screen>.html-cocos-heatmap.png`
4. `<screen>.html-cocos-source.png`
5. `<screen>.html-cocos-editor-crop.png`
6. `<screen>.html-cocos-top-offenders.json`

### 7.4 Score 規則

正式 score 欄位：

```json
{
  "runtimeVsSource": {
    "score": 0.956,
    "threshold": 0.95,
    "verdict": "pass"
  }
}
```

規則：

1. `score >= 0.95`：pass。
2. `0.90 <= score < 0.95`：fail，需要人工審查與 evolution2 candidate。
3. `score < 0.90`：blocker，通常代表 renderer / token / CSS ingestion 系統性問題。
4. `score:null`：fail，不得 cutover。
5. 動態文字、游標、loading spinner、Editor chrome 必須用 crop / waiver 明確處理，不得用全圖雜訊掩蓋。
6. 已核准正式 runtime asset（例如既有 `sprite-frame` / `button-skin` 的 tab、button、panel chrome）若刻意不同於 HTML CSS 草稿，不視為 converter failure；raw score 仍保留，adjusted score 必須透過 image waiver / art-authority sidecar 明確列出 `reason` 與 rect，不能用無紀錄 mask 偷藏差異。
7. reviewer report 必須同時列出 `runtimeVsSource.score`（raw）、`runtimeVsSource.adjustedScore`、`waiverCoverage`、`unwaivedDiffTopN` 與 `artAuthorityWaivers[]`。raw score 不可被改寫；adjusted score 只能用於區分「converter fidelity failure」與「已核准正式美術差異」。

### 7.5 Browser Diagnostic 命名

舊 `runtime-screen-diff.js` 中的 `sourceVsUcuf` 在 v2 改名為：

```json
{
  "sourceVsUcufPreview": {
    "score": 0.96,
    "role": "diagnostic-only"
  }
}
```

這個分數只代表 browser renderer 下的 UCUF preview 與 source 相似，不代表 Cocos Editor runtime 相似。

## 8. Rule Evolution 2 正向循環

### 8.1 觸發條件

以下任一狀況都要產生 `docs/html_skill_rule-evolution2.md` candidate：

1. source package validator fail。
2. linked CSS 未被 converter 攝取。
3. token suggestion count 超過 strict 門檻。
4. unsupported CSS property 出現在大面積區域。
5. Cocos Editor visual score 低於 0.95。
6. `runtimeVsSource.score` 為 null。
7. logic guard / interaction guard 發現功能丟失。

### 8.2 Entry 欄位

每筆 candidate 必須包含：

| 欄位 | 說明 |
|---|---|
| suggestion id | 穩定唯一 id |
| status | `candidate` / `accepted` / `rejected` / `applied` |
| source package | source dir、main HTML、hash |
| screenId | 目標畫面 |
| before score | 失敗分數或 null |
| top offenders | CSS property、token、asset、zone |
| proposed rule | 建議新增 mapper / assetize / waiver / validator 規則 |
| safety | auto-applicable / reviewer-required |
| verification | 接受後要跑的命令 |
| applied by | reviewer / agent / commit 或 PR |

### 8.3 下一輪自動套用

skill 開始時讀取 evolution2：

1. `accepted` + `auto-applicable`：可套到 sandbox 轉換流程。
2. `accepted` + `reviewer-required`：只能提示，不自動修改正式產物。
3. `candidate`：只列入報告，不自動套用。
4. `rejected`：不再提示，除非同樣 gap 重新出現且 source hash 不同。

套用後仍必須跑完整 gate；規則套用不等於 pass。

## 9. 里程碑

| 里程碑 | 目標 | 代表產出 | 驗證 |
|---|---|---|---|
| M0 | 文件重建 | `html_skill_plan2.md`、`html_skill_rule-evolution2.md`、skill 入口改寫 | doc_id assign + encoding clean |
| M1 | Source Package Validator | `source-package.js`、`.source-package.json` | 缺 token/CSS/HTML 時 exit 2 |
| M2 | CLI Contract Cleanup | `--source-dir` / `--main-html` 正式接線，舊參數降級 | wrapper help 與 self-test |
| M3 | Token/CSS Authority | source token / CSS 進 converter 與 sidecar | linked CSS fixture pass |
| M4 | CSS Capability Matrix | supported / assetize / unsupported report | top offender report 可機讀 |
| M5 | UCUF Generation Gate | raw / optimized / final strict replay | validate + content contract pass |
| M6 | Cocos Editor Runtime Gate | HTML vs Editor screenshot scoring | `runtimeVsSource.score >= 0.95` |
| M7 | Rule Evolution Loop | fail -> evolution2 candidate -> accepted rule -> next run | candidate / accepted / applied test |
| M8 | DS3 Character Pilot | Design System 3 人物頁全流程 | Editor score >= 0.95 或產 blockers |
| M9 | Regression / CI Hardening | self-test、snapshot、encoding、verdict regression | CI / local check 全綠 |

### 2026-04-28 Implementation Status

本輪已完成 v2 toolchain：source package validator、source token/CSS authority、CSS capability report、HTML source vs Cocos Editor screenshot gate、evolution2 candidate feedback、workflow verdict hardening 與 regression self-test。M8 的 DS3 pilot 仍需要指定實際 Cocos Editor screenshot 作為正式畫面輸入；未提供該截圖時，只能驗證工具鏈與 synthetic Editor screenshot fixture。

## 10. Checklist

### M0 文件重建

- [x] 建立 `docs/html_skill_plan2.md`。
- [x] 建立 `docs/html_skill_rule-evolution2.md`。
- [x] 使用 `node tools_node/doc-id-registry.js --assign <path>` 分配 doc_id。
- [x] 更新 `.github/skills/html-to-ucuf/SKILL.md`，把 v2 source package flow 放在正式入口。
- [x] 將舊 `--input` flow 標為 legacy / debug。
- [x] 說明 browser preview compare 不再是 final pass。

### M1 Source Package Validator

- [x] 新增 `tools_node/lib/html-to-ucuf/source-package.js`。
- [x] 驗證 source dir 存在。
- [x] 驗證 `ui-design-tokens.json` 可 parse 且含必要 root key。
- [x] 驗證 `colors_and_type.css` 可讀且含 CSS vars 或 `:root`。
- [x] 驗證 main HTML 在 source dir 內。
- [x] 多 HTML 時要求 `--main-html`。
- [x] 輸出 `.source-package.json`。
- [x] validator fail 時 exit 2。

### M2 CLI Contract Cleanup

- [x] `run-ui-workflow.js` 支援轉送 `--source-dir` / `--main-html`。
- [x] `run-html-to-ucuf-workflow.js` 支援 source package。
- [x] `--input` 改為 legacy alias。
- [x] `--content-contract` 真接線或從 public help 移除。
- [x] `--skip-editor-compare` 在正式 flow 下不可產生 pass verdict；`--skip-compare` 僅略過 browser diagnostic。
- [x] summary 寫入 source package manifest path。

### M3 Token/CSS Authority

- [x] `token-registry.js` 支援 source token authority。
- [x] token 合併順序明確記錄：source > runtime supplement。
- [x] token conflict report 可機讀。
- [x] `dom-to-ui-json.js` 傳 source token path 到 `buildDraftFromHtml()`。
- [x] `fidelity-sidecars.js` 使用同一份 source token。
- [x] `html-parser.js` 或 pre-render stage 支援 source CSS 注入。
- [x] linked CSS fixture 加入 self-test。

### M4 CSS Capability Matrix

- [x] 建立 supported / assetize / unsupported property matrix。
- [x] gradient / shadow / filter / pseudo-element / clip-path 必須出現在 coverage report。
- [x] unsupported 大面積 property 產 evolution2 candidate。
- [x] assetize 類 property 產 asset task hint。
- [x] 不允許靜默 fallback 為透明或單色。

### M5 UCUF Generation Gate

- [x] raw layout / skin 生成 pass。
- [x] optimize pass 並輸出 node budget report。
- [x] skin autofix pass 並補 button state layer。
- [x] strict replay pass。
- [x] `validate-ui-specs.js --strict --check-content-contract` pass。
- [x] logic / interaction / motion sidecar 無 blocker。

### M6 Cocos Editor Runtime Gate

- [x] 新增或改造 HTML vs Cocos Editor compare CLI。
- [x] source reference screenshot 使用 source package。
- [x] editor screenshot 支援 `--editor-screenshot`。
- [x] 支援 crop / viewport normalization / font fallback policy。
- [x] 輸出 verdict / compare board / heatmap / top offenders。
- [x] `runtimeVsSource.score:null` 必須 fail。
- [x] `runtimeVsSource.score >= 0.95` 才 pass。

### M7 Rule Evolution Loop

- [x] fail 時 append evolution2 candidate。
- [x] candidate entry 含 source hash、screenId、score、top offenders、proposed rule。
- [x] skill 開始時讀 accepted / auto-applicable rules。
- [x] auto-applicable rule 先套 sandbox，再跑完整 gate。
- [x] reviewer-required rule 不自動修改正式產物。

### M8 DS3 Character Pilot

- [x] 使用 `Design System 3` source package。
- [x] 驗證 DS3 token 與 CSS 確實進 converter。
- [x] 產出 `character-ds3-main` v2 artifacts。
- [x] 打通 `LoadingScene -> LobbyScene -> GeneralList -> 張飛 -> character-ds3-main` 正式 smoke route。
- [x] `node tools_node/capture-ui-screens.js --target CharacterDs3 --outDir artifacts/ui-source/character-ds3/review` 產出 runtime screenshot / verdict。
- [x] `capture-ui-screens.js` 已支援顯式 `uiVariant`，可強制 unified / ds3 route，避免 sticky localStorage 誤判。
- [x] 正式玩家路徑收斂為單入口驗證 target：`GeneralDetailFromLobbyGeneralsButton` 走 UCUF 底部 `btnGenerals`，開 `GeneralList` 後點張飛進 `GeneralDetailComposite`。
- [x] `node tools_node/capture-ui-screens.js --target GeneralDetailFromLobbyGeneralsButton --outDir artifacts/ui-source/general-detail-overview/formal-route-lobby-generals-pass` 通過；runtime guard PASS，僅 AudioSystem preview warning。
- [ ] 正式產品 default cutover 仍 blocked：`ui=ds3` 走 `GeneralDetailComposite` 會 fail-fast 缺 `GeneralDetailRoot/RightTabBar/BtnTabOverview`；`character-ds3-main` 尚未補齊 GeneralDetailComposite shell / tabRouting 契約。
- [ ] 取得 Cocos Editor screenshot。
- [ ] HTML vs Editor score >= 0.95，或產出 top blockers 與 evolution2 candidates。

### M9 Regression / CI Hardening

- [x] `node tools_node/test/dom-to-ui-self-test.js` 全通過。
- [x] 新增 source package validator fixture。
- [x] 新增 linked CSS fixture。
- [x] 新增 runtime verdict fixture，覆蓋 `score:null` fail。
- [x] `node tools_node/validate-ui-specs.js --strict --check-content-contract` 通過。
- [x] `node tools_node/check-encoding-touched.js --files <touched>` clean。

### M10 i18n / bindPath 抽取（dom-to-ui-json 規則升級）

> 觸發原因：M8 baseline 0.3986 顯示 layout JSON 把 React-rendered 的所有文字都烤成 `"text"`，包含應該 data-bind 的武將名與傳記長文，導致換武將就壞、不能多語系。

- [ ] `tools_node/lib/dom-to-ui/text-classifier.js`：判斷 text node 屬於 dynamic / static-i18n / static-literal 三類。
- [ ] 規則：tag 內出現「武將/角色名稱、屬性數值、tab 內容、列表 item」→ dynamic；標題/分類/UI label → static-i18n；數學符號/單字符箭頭/`LEGEND` 類旗標 → static-literal。
- [ ] 顯式標記優先：`data-bind="config.name"` → dynamic with bindPath；`data-text-static` → static-literal；無顯式標記時用 classifier。
- [ ] layout schema 擴：`"i18nKey"`、`"bindPath"` 兩個新欄位（與 `"text"` 互斥）。
- [ ] dom-to-ui-json 新增 `--emit-i18n` flag，輸出 `<screen>.i18n.zh-TW.json`。
- [ ] `validate-ui-specs.js` 認新欄位（`"i18nKey"` 必須存在於 i18n 字典；`"bindPath"` 必須有對應 contentRequirement）。
- [ ] `UITemplateBinder` 在 mount 時依 `i18nKey` / `bindPath` 自動注入。
- [ ] self-test fixture：對 character HTML 跑後，「張飛」「燕人武聖」「傳記長文」變 bindPath；「人物傳記」「Chronicles」「逸 事」變 i18nKey；「←」「LEGEND」保留 static text。

### M11 CSS Variables → ui-design-tokens 反向同步

> 觸發原因：`Design System 3/colors_and_type.css` 內 `:root` 定義約 80+ CSS variable，其中 `--surface-sepia`、`--surface-sepia-warm`、`--jade-base/light/crest/field`、`--accent-gold-cta`、`--resource-gold`、`--bg-mid`、`--bg-olive`、`--surface-charcoal`、`--parchment-summary/module/main/detail/side`、`--text-warm-gold`、`--text-off-white`、`--text-khaki`、`--outline-heavy/standard/light` 等多項在 `ui-design-tokens.json` 缺漏，導致 dom-to-ui-json 反查命中率低、skin 大量 `unmappedColor`。

- [x] `tools_node/sync-css-vars-to-tokens.js`：解析 source dir 下的 `colors_and_type.css`，抽出 `:root` 內 `--*` 變數。
- [x] kebab-case → camelCase 轉換（`--surface-sepia` → `surfaceSepia`），衝突時 warning。
- [x] `--mode dry-run|append`：dry-run 列差異；append 補進專案 `assets/resources/ui-spec/ui-design-tokens.json`。（`patch` 模式暫不需要，DS3 source 與專案 tokens 已分離。）
- [x] 跨 token 種類分流：CSS vars `--type-*` / `--lh-*` 歸 `typography`；`--ease-*` / `--dur-*` 歸 `motion`；`--sp-*` 歸 `spacing`；`--r-*` 歸 `radii`。
- [x] alias / composite（rgba 多色、`var(--xxx)` 參照）skip 並計數。
- [x] 對 DS3 跑 `--mode append`：實際補進 26 colors / 7 spacing / 13 typography / 6 motion / 5 radii。
- [x] `validate-ui-specs.js` 通過（layouts=35, skins=38, screens=32, recipes=5）。

#### 2026-04-28 觀察與後續

- M11 把 token 覆蓋率補齊，但 skin 中的 `unmappedColor` 沒有下降（27 vs 26 ≈ 不變）。
- 原因：DS3 character HTML 的失敗 slot 多是 `style.background` 為 null 的 panel（draft-builder 第 740 行 `else` 直接寫 `unmappedColor`），不是 hex 反查失敗。剩下的少量 hex 失敗集中在 `rgba(...,0.x)` 透明度疊色與 inline 多層 gradient。
- 真正修這 27 個 slot 需要 M12（gradient → PNG 烘焙含 inventory 複用）+ draft-builder 對「無 background」的 panel 不要硬塞 color-rect（改成 `kind: "transparent"`）。
- 重要教訓：`character-ds3-main.json` layout 已做過 M38 codemod；任何重跑 dom-to-ui-json **必須用 `--merge-mode preserve-human`**，否則 `OverviewSlot` / `RightContentArea` 等命名節點會被 div_N 自動命名覆蓋，runtime guard 直接 fail。

### M12 Gradient / Shadow → PNG 烘焙器（含資產複用檢查）

> 觸發原因：HTML portrait-bg / panel 大量使用 3 層 `radial-gradient` + `linear-gradient` 疊加，CSS effect matrix 將其分類為 `assetize`，但目前無工具自動產出對應 PNG，導致 skin slot 只剩 `color-rect` fallback。

- [ ] **資產複用優先**（強制前置步驟）：在烘焙任何新 PNG 之前，先掃描 `assets/resources/sprites/**`、`assets/textures/**`、現有 layout/skin 引用過的 sprite-frame 路徑，建立資產 inventory。
- [ ] `tools_node/scan-existing-ui-sprites.js`：對既有 production UI（如 `general-detail-unified-screen` 的 right tab 按鈕、portrait frame、panel bg）建索引，輸出 `<screen>.sprite-inventory.json`：每個 sprite 含路徑、尺寸、9-slice、來源畫面、語意 tag（如 `tab-button-frame`、`portrait-bg-vignette`、`panel-parchment`）。
- [ ] `tools_node/match-slot-to-existing-sprite.js`：對每個 assetize 槽位，用語意 + 視覺指紋（dominant color、shape）和 inventory 比對；命中閾值 > 0.85 直接複用，並寫 evolution2 entry 紀錄複用。
- [ ] `tools_node/gradient-to-png-baker.js`：用 puppeteer-core 把指定 CSS rule 渲到無頭 canvas 並截圖。**只對 inventory 比對 miss 的槽位才烘焙新圖**。
- [ ] 輸入：source CSS file + selector + 輸出尺寸（與 layout node 同寬高）。
- [ ] 輸出：`assets/resources/sprites/ui_generated/<screen-id>/<slot>.png` + 對應 `.meta`。
- [ ] dom-to-ui-json 新增 `--bake-gradients` flag：對 `assetize` 類 background 自動跑「inventory 比對 → 命中複用 / 未命中烘焙」二段流程，skin slot 改寫為 `kind: "sprite-frame"` + 路徑。
- [ ] 9-slice 推斷：當 gradient 為 axis-aligned linear 時自動加 `nineSlice` margin；radial / 多層直接 `nineSlice: false`。
- [ ] `--force-rebake` flag：source CSS hash 變更時自動重烘（仍走 inventory 比對，避免覆蓋手動委託資產）。
- [ ] CSS evolution2 entry：當烘焙產生明顯 banding 或失真時 candidate；當 inventory 命中複用時也記錄為 reuse-evidence。
- [ ] 對 DS3 character pilot 跑一次：預期 right tab button、back button、rank badge 命中 unified 既有資產；只有 portrait-bg / story-strip 等 DS3 獨有 zone 需要新烘焙。
- [x] R-29 實測：`character-ds3-main` 的 right tab button slots 接回正式 `button-skin`（active/idle/disabled/selected），重跑 `dom-to-ui-json --sync-existing --merge-mode html-authoritative` 後 6 個 tab slot 全部保留為正式資產，sync-report 產生 6 筆 `existing-runtime-asset-preserved`。

### M13 Tab-Routing Mount 命名規則

> 觸發原因：`character-ds3-main.tab-routing.json` 寫 `mount: "TabOverviewContent"`，但 layout JSON 中只有 auto-generated `CharacterDs3Main_div_N`，ChildPanel 找不到掛載點，等同 6 個 ChildPanel 完全失效。

- [ ] `dom-to-ui-json` 在遇到 `data-tab-content="<id>"` 時，把節點命名為 `Tab<Id>Content`。
- [ ] 沒有 `data-tab-content` 時，依 `data-slot="tab-content.<id>"` 反推同樣命名。
- [ ] HTML 端：對 DS3 character `index.html` / React component（`tabs.jsx`）追加 `data-tab-content` 標記。
- [ ] `generate-tab-childpanels.js` 改為依 layout JSON 真實節點名產 mount，不再硬碼 `Tab<Id>Content`。
- [ ] validator：tab-routing.json 內每個 mount 必須能在 layout 中找到 node。

### M14 UISpecLoader 預載 + Frame-spread Mount（runtime 性能）

> 觸發原因：使用者回報「點武將 → 開人物頁很慢」「切 tab 也很慢」，懷疑是當場才解析 JSON + 同步建 157 節點 block 主執行緒。

- [ ] `UISpecLoader` 增 `preloadSpec(screenId)`，在 `LobbyScene.onLoad` 之後 idle-time 預讀 layout/skin/screen 三 JSON 並 cache。
- [ ] `CompositePanel.show()` 第一次掛載時，把 children 建立分散到 N frame（每 frame 建 ≤ 30 節點，整體完成不超過 5 frame）。
- [ ] ChildPanel lazy 子樹：背景 tabs 在 idle 時預建 `active=false` 節點樹，使用者點 tab 時只切換 active 即可。
- [ ] 不適用預建的 tab（資料量過大）保留 on-demand，但限制單 tab 不超過 60 節點。
- [ ] 加 timing log：`[UCUF] spec-load 8ms / mount 42ms / first-tab 12ms`。
- [ ] 測試：點武將到完整顯示 ≤ 200ms；切 tab ≤ 60ms。

### M15 DS3 Cutover Iteration（reach ≥95%）

- [ ] M11 同步 token 完成後重跑 dom-to-ui-json 產 skin；統計 `unmappedColor` 槽位數應降至 ≤ 5。
- [ ] M12 烘焙 gradient PNG 補進 sprite slot；portrait-bg / right-content / story-strip 三大 zone 換 sprite。
- [ ] M13 重命名 layout tab content 節點；6 個 ChildPanel mount 點對齊。
- [ ] M10 完成後 layout 中只剩真正靜態文字；其他改 i18nKey / bindPath。
- [ ] capture + compare-html-to-cocos-editor.js 每輪記錄分數。
- [x] 收斂表：score 從 0.3986（M11 baseline）→ 0.3479（transparent-only）→ 0.3791（zone-aware）→ 0.0906（bg fill, BAD revert）→ 回到 ~0.40。
- [ ] 達標後 flip default 為 ds3，跑真實 Chrome puppeteer LoginScene→LobbyScene→GeneralList→張飛 完整路徑驗證。

### M15 已知瓶頸（2026-04-28 後段實證）

當前 dom-to-ui-json 反向產線在 ~0.40 分有結構性上限，光調 skin 顏色無法越過：

1. **layout 節點命名化 vs 自動化**：M38 codemod 名（OverviewSlot / RightContentArea / TabOverviewContent）只在某次手動 codemod 過後保留；任何 dom-to-ui-json 重跑會以 auto 名（CharacterDs3Main_div_N）覆蓋。tab-routing.json 對映的 mount 名因此不存在於 layout，6 個 ChildPanel 完全沒掛上。
2. **ChildPanel TODO 化**：6 個 `CharacterDs3{Overview,Stats,Tactics,Bloodline,Equip,Aptitude}Child` 都是 generate-tab-childpanels.js 產的空殼（`onMount` / `onDataChanged` 全 TODO）。即使 mount 對齊也不會渲染任何視覺內容。
3. **顏色填補的反例**：把 `kind: color-rect` 的 token 砸在 container panel 上，會 OPAQUE 蓋掉它的 portrait sprite child。亦即 div_2（62% 寬 portrait area）若塗 `bgMid`，整個立繪會被遮，分數從 0.39 直接掉到 0.09。同理整片塗 `parchmentBase` 也不可行。
4. **右欄沒有可塗的 panel**：div_7（右欄 720px wrapper）以下幾乎都是 `container` type，無 skinSlot；HTML 那塊 parchment 其實來自 page-level CSS + 內部分區的細部 `<div>` 多層 gradient。layout 中找不到單一節點來代表「整個右欄背景」。
5. **parseColor 範圍不足**：dom-to-ui-json 只看 inline `style.background`，看不到 React-rendered computed style；大量 React 子元件的背景被 `unmappedColor` 預設值蓋掉。

### M16 突破 0.40 的路線決議（2026-04-28，美術總監角度裁決）

**結論：B 為主線、A 為產線輔助、C 僅作短期烘焙工具、D 不採納。**

| 路徑 | 角色 | 意義 | 缺點 / 邊界 |
| ---- | ---- | ---- | ----------- |
| **B. 手寫 6 個 ChildPanel 的 binder 內容**（主線） | 產品路線 | 把 DS3 從「靜態殼」推進為可營運的 `將/屬/命/技/寶/兵` 六頁，可動態換武將 / 換語系 / 換稀有度 / 切 tab / 接 hover / pressed 與 fail-fast | 工期最真實；mount target 與 slot map 需先補；單頁先做才能驗 score 提升 |
| **A. dom-to-ui-json 用 getComputedStyle 抽取真背景**（輔助） | 工具路線 | 修正 converter 的「眼睛」，讓 CSS variable / cascade / React-rendered computed style 都能正確進 token；降低 unmappedColor、減少黑塊與錯色 | 只修轉換品質，不修「runtime 沒內容」；單獨走無法到 0.95；屬於 B 的支援工程 |
| **C. puppeteer bake 右欄為 sprite-frame**（戰術） | 截圖路線 | 適合非互動裝飾、羊皮紋理、複雜框、漸層底圖等局部烘焙 | 文字 / 數值 / tab / 語系 / 稀有度狀態無法動，把 UI 變成「漂亮截圖」；不可用於整個右欄正式內容 |
| ~~D. 鎖定 ~0.40 不再前進~~ | 不採納 | — | 違反使用者「≥95% 才 flip default」共識 |

### M16 實作 checklist（B 主線；分階段，多 turn）

**階段 1：B 路線基礎修復（不改 layout 大架構，先讓 ChildPanel 能跑）** — ✅ 2026-04-28 完成

- [x] 對齊 6 個 `CharacterDs3{Overview,Stats,Tactics,Bloodline,Equip,Aptitude}Child` 的 method signature 到 `ChildPanelBase`（`onMount(spec): Promise<void>`、`onDataUpdate(data): void`、`validateDataFormat(data): string|null`）。先前 generate-tab-childpanels.js 產出的 `onMount(binder, skin)` + `onDataChanged` 簽名與 base 不符，框架實際呼叫不到；現已全部修正。
- [x] Overview ChildPanel 加上 `_nameLabel / _roleLabel / _rarityLabel / _bioLabel` cache slot 與 `binder.getLabelByPath(...)` 查詢；找不到時 `UCUFLogger.warn`。
- [x] 補 `validateDataFormat` 最小實作（檢查 `data && typeof data === 'object'`）。
- [x] 6 個檔案 `get_errors` clean。

**階段 2：B 路線 mount target 落地（Overview 先行）** — ✅ 2026-04-28 完成（rename-only 策略）

- [x] 針對 Overview：`assets/resources/ui-spec/layouts/character-ds3-main.json` 重命名 4 個節點（不增刪，保留原視覺）：
  - `CharacterDs3Main_div_9` → `TabOverviewContent`
  - `CharacterDs3Main_span_5`（「張飛」）→ `OverviewName`
  - `CharacterDs3Main_div_13`（「翼德 · 蜀 · 先鋒」）→ `OverviewRoleBadge`
  - `CharacterDs3Main_span_7`（「UR」）→ `OverviewRarityTier`
  - `CharacterDs3Main_div_15`（5 顆星 container）→ `OverviewRarityStars`
- [x] `validate-ui-specs.js` pass。
- [x] capture + compare 後 score = **0.3791**（與 baseline 持平，無視覺回歸）。
- [ ] Stats/Tactics/Bloodline/Equip/Aptitude 的 layout 改名與可選 sibling mount node 延到階段 4 逐 tab 進行。

**階段 3：B 路線 Overview ChildPanel 真實內容** — ✅ 2026-04-28 完成（smoke wiring）

- [x] `CharacterDs3OverviewChild.onMount` 改用 `binder.getLabel(name)` flat lookup 快取 Label / Node refs。
- [x] `onDataUpdate(data: GeneralConfig)` 寫入 `name` / `roleArchetype` / `rarityLabel`；Rarity stars 以 `OverviewRarityStars` container 子 Label 數量 toggle。
- [x] `GeneralDetailComposite._onAfterBuildReady` / `show()` DS3 分支直接實例化 `CharacterDs3OverviewChild` 並呼叫 `onMount` + `onDataUpdate`（暫不走 fragment / slot 機制）。
- [x] capture + compare 後 score = **0.3792**（水平位移 +0.0001，無回歸）。
- [ ] `OverviewBio` Label 類似位置（例如 `historicalAnecdote` 的 200~300 字介紹）需要 layout 补訂；等階段 4 部分 tab 評估一起补。

**階段 3\.5\：Overview Bio 收尾** — ✅ 2026-04-28 完成

- [x] `CharacterDs3Main_div_53` (歷史軼事長文 label) → `OverviewBio`。
- [x] `CharacterDs3OverviewChild` 增加 `_bioLabel` cache 與 `historicalAnecdote` 寫入。
- [x] capture + compare = **0.3794**（vs stage 3 = 0.3792，+0.0002 持平）。
- [x] 結論：B 路線 data binding 已飽和；剩下 5 tab 的 layout 在原始 dom-to-ui 產出沒有獨立 mount 容器，所有 tab 內容其實都被 hardcoded 在 `TabOverviewContent` 子樹下，再補 binding 對 score 無效。

**階段 4：B 路線複製到其他 5 個 tab**

- [ ] Stats（屬）：六色屬性條 / 教官評價。
- [ ] Tactics（技）：戰法習得清單。
- [ ] Bloodline（命）：14 人祖先血統圖 + 命槽。
- [ ] Equip（寶）：一般裝備 + 傳家寶 + 道具。
- [ ] Aptitude（兵）：戰場適性 + 虎符槽。
- [ ] 每補一個 tab 跑一次 compare，逐步逼近 ≥0.95。

**階段 5：A 路線（產線輔助，可與 B 並行）**

> **2026-04-28 架構勘查**：`tools_node/lib/dom-to-ui/computed-style-capture.js` 已存在（M13/M14/M19/M23/M29/M30/M31 累積），且 `dom-to-ui-json.js` 已透過 `buildFidelitySidecars` 呼叫 `captureComputedStyles`。但目前只產出 sidecar 報告（`cssCoveragePath` / `tokenSuggestionsPath` / `imageWaiversPath`），**未回灌進 `draft-builder.js` 的 `parseColor`**。Stage 5 真正工作 = 把 fidelity-snapshot 的 `background-color` / `background-image` 注入 `renderNode` / `ensureSpriteOrColorSlot` 的 style 物件。屬於 multi-turn 重構，需先設計 contract 再實作。

- [x] 在 `tools_node/lib/dom-to-ui/draft-builder.js` 注入 fidelity-snapshot：`captureComputedStyles` 會輸出 transient `data-ucuf-capture-id` annotated HTML，`draft-builder` 僅在 `--use-computed-style` 開啟時讀取有意義的 `background-color` / `background-image` / text color / typography computed 值，並過濾 `transparent` / `none`。
- [x] dom-to-ui-json 加上 `--use-computed-style` flag（預設 off，避免破壞 self-test baseline）。
- [x] 重跑 DS3：`node tools_node/dom-to-ui-json.js --use-computed-style --sync-existing --merge-mode preserve-human`；人工命名（`OverviewName` / `OverviewBio` / `TabOverviewContent`）保留，且 `_captureId` / `data-ucuf-capture-id` 未序列化到 layout。
- [x] self-test：`node tools_node/test/dom-to-ui-self-test.js` 尾端確認 **ALL PASS**；新增 M16 computed-style flag 測試與 preserve-human placeholder promotion 測試。
- [x] Stage 5/5B gate 結果（2026-04-28）：`unmappedColor` runtime 仍為 19；不 merge 的 computed draft 為 26，代表主要缺口不是 preserve-human 擋住，而是 gradient / image / effect 仍需 assetize。HTML vs Cocos score `0.3793`，未達 +0.01 改善 gate。

**階段 5C：Reusable CSS fidelity runtime（2026-04-28）** — ✅ 已落地，仍未達 0.95

- [x] `linear-gradient(...)` 由 `draft-builder` 轉成 `kind: "gradient-rect"` skin slot；`smart-merge` 可把安全的 `auto.*` `color-rect` 升級為 `gradient-rect`，並保護人工 slot。
- [x] Runtime 新增 `GradientBackground`，`UIPreviewStyleBuilder` 可套用線性漸層；`UISpecTypes` 增加 `SkinGradientRectSlot`。
- [x] `gradient-rect` 支援 `cornerRadius / borderWidth / borderColor`，可重建 tab rail 這類「圓角 / 圓形按鈕 + 漸層 + 邊框」組合。
- [x] computed `::before / ::after` pseudo overlay 已有 safe subset：只在父節點沒有真實 element children 時轉成 fill child panel；有 children 的 pseudo 先略過並記 warning，避免缺少 CSS z-index stacking 時錯層。
- [x] `preserve-human` 會清除 stale generated pseudo overlay 節點與 slot，避免上一輪錯層殘留。
- [x] Regression：`node tools_node/test/dom-to-ui-self-test.js` 通過至 HTML-to-UCUF workflow gate；`get_errors` 對 `GradientBackground.ts` / `UIPreviewStyleBuilder.ts` / `UISpecTypes.ts` clean。
- [x] DS3 有效分數：computed geometry + portrait assetization 後 `0.6314`；linear gradient runtime 後 `0.6419`；rounded gradient 後 **`0.6461`**（仍 fail，threshold `0.95`）。
- [x] 最新區域分數：`portrait-edge-fade=0.9684`、`story-strip=0.7888`、`right-content=0.6054`、`tab-rail=0.3824`、`top-left-badge=0.4386`。
- [ ] 下一個高價值缺口：shadow/filter/drop-shadow 的可控 runtime layer，及 multi-layer radial/linear background 的 assetize/reuse pipeline；不要把有 children 的 pseudo overlay 直接全開。

**階段 5D：CSS 陰影 / Sidecar / Compare gate 通則化（2026-04-28）** — ✅ 已落地

> 本階段條目不綁定任何特定畫面，**所有走 v2 source-package flow 的 screen 一律適用**。記錄目的是把這一輪在 DS3 試誤中找到的修正抽象成 HTML-to-UCUF skill 的常駐規則，下一個畫面進入此 skill 時可直接受惠。

- [x] **通則 R-1（外陰影 alpha 必須單調衰減）**：CSS `box-shadow` / `filter: drop-shadow(...)` 在 Cocos runtime 的 rasterizer (`assets/scripts/ui/components/ShadowBackground.ts`) 中，`_shadowAlpha(distance, blur)` 只能在 `distance >= 0` 區間回傳衰減值；`distance < 0` 必須回 `0`，否則陰影會把 element 內部填滿、造成 compare 整片黑。`blur === 0` 時只在 `distance === 0` 顯示。此規則對所有 sidecar 來源的 shadow effect 通用，不可為單一畫面 hack。
- [x] **通則 R-2（UCUF runtime check 只接受正式 screen manifest）**：`tools_node/ucuf-runtime-check.js` 必須以 `.screen.json` 結尾或裸 `<screen>.json` 且具備必填欄位（`layoutRef` / `skinRef` / `childPanels`）才算正式 screen；所有 sidecar (`.interaction` / `.motion` / `.preload` / `.sync-report` / `.visual-review` / `.logic-guard` / `.logic-inventory` / `.fragment-routes` / `.composite` / `.tab-routing` / `.r-guard` / `.bundle-suggestion`) 一律跳過，避免假陽性 RT-03。`layoutRef` / `skinRef` 解析新增支援 `assets/resources/ui-spec/...` 完整路徑，與 v2 source-package flow 一致。
- [x] **通則 R-3（compare viewport 必須對齊 runtime capture）**：`tools_node/compare-html-to-cocos-editor.js` 的 `--viewport` 必須等於實際 Cocos Editor screenshot 解析度（例如 `1920x1032`），不可預設 1080。viewport mismatch 會在像素層級平移，產生 false negative，與 fidelity 規則無關。
- [x] **通則 R-4（compare 失敗時的 evolution candidate 必須可抑制）**：診斷階段重複跑 compare 時必須使用 `--no-evolution`；reviewer 接受前不視為共識；自動寫入的 candidate 若被 reviewer 判為噪音，必須從 `docs/html_skill_rule-evolution2.md` 手動清除，避免下一輪 skill 誤套。
- [x] **通則 R-5（CSS shadow / gradient 雙端落地）**：`box-shadow` / `drop-shadow` / `linear-gradient` 必須在 DOM-to-UCUF（`fidelity-sidecars.js` 產 sidecar）與 runtime（`GradientBackground` / `ShadowBackground` 兩個通用元件 + `UIPreviewStyleBuilder` / `UIPreviewNodeFactory` wiring）兩端同時實作；只做單端會導致 sidecar 規則無 runtime 對應、或 runtime 元件吃不到 spec。
- [x] **通則 R-6（CSS custom property 不算 unsupported）**：`tools_node/lib/dom-to-ui/css-capability-matrix.js` 的 `classifyCssProperty` 必須把 `--*` 開頭的 property 當作 `token-declaration`，不能 fall-through 為 `unsupported`。`buildCssCapabilityFromUsage`（computed-style-capture.js）與 `buildCssCapabilityReport`（capability matrix）的 `summary` 都要新增 `tokenDeclaration` 計數，`topOffenders` 必須同時排除 `supported` 與 `token-declaration`。任何使用 design-system token 的 HTML 都受惠（DS3 case：unsupported 從 128 → 7）。
- [x] **通則 R-7（CSS 註解必須剝除）**：`buildCssCapabilityReport` 在掃描 declaration 前必須先 strip `/* ... */` 註解。否則 `/* SOURCE: ... */` / `/* spec 1920x1080 */` 會被誤判成 `source` / `spec` 屬性，污染 top offenders。任何附 documentation comment 的 source CSS 都受惠（DS3 case：unsupported 從 7 → 5，`source` / `spec` 假陽性消失）。
- [x] **通則 R-8（`background` 用值而非名稱分類）**：`classifyCssProperty` 必須在 ASSETIZE bulk 比對前優先處理 `background`：`linear-gradient` / `radial-gradient` / `conic-gradient` / `url(...)` 才走 `assetize`；solid color / `var(--token)` / `rgb(...)` / `#...` 一律 `supported`（runtime 的 color-rect 即可承接）。原本的死碼 (`if ASSETIZE.has(prop)` 先吃掉 `background`) 會把所有用 design-system 變數的 BG 都誤標 assetize。任何使用 token 化背景色的 UI 都受惠（DS3 case：assetize 從 3 → 1，supported 從 46 → 48）。
- [x] **通則 R-9（`text-transform` 在 converter 階段離線套用）**：Cocos Label 無原生 `text-transform`，等同於把 runtime 缺失搬到 converter 處理。`tools_node/lib/dom-to-ui/computed-style-capture.js` 的 `CAPTURED` / `ALL_PROPS` / `DEFAULT_VALUES` 必須包含 `text-transform`（default `none`）；`tools_node/lib/dom-to-ui/draft-builder.js` 在 label 分支必須以 `applyTextTransformGeneral(rawText, computed['text-transform'])` 預先轉換字串，並用 `toLocaleUpperCase` / `toLocaleLowerCase` 確保 CJK / 土耳其文等 locale-sensitive 字型不被破壞，`capitalize` 走 word-boundary，`full-width` 處理 ASCII→全形。轉換為純函式 `applyTextTransformGeneral(text, transform)` 並 export，方便其他 mapper（將來的 `::first-letter`、tooltip pipeline 等）共用。任何含大小寫敏感字型 / 全大寫設計風格的 UI 都受惠（DS3 case：6 處 navigation tab + section heading 直接顯示為 `OVERVIEW` / `TRAITS` / `BLOODLINE` / `BIOGRAPHY` 等，不再需要設計師手動把字串改大寫）。通則：**runtime 沒有的 CSS 能力，能離線決定的就離線決定，不要塞給 runtime。**
- [x] **通則 R-10（`font-family` stack registry-based 解析；不能寫死單一資產）**：`pickFontByTag` 必須走資料導向 `PROJECT_FONT_REGISTRY`（regex match → asset path）依 CSS stack 順序解析，第一個有專案資產的 family 勝出；未命中時走 `PROJECT_FONT_DEFAULT`（CJK-safe）。原本 `if (/serif/i.test(family)) return 'fonts/newsreader/font'; return 'fonts/newsreader/font'` 會把所有 label 都打成同一份字型，違反 CSS font-family 的「優先級堆疊」語意。registry 必須 export 為純函式 `resolveFontFamilyToAsset(value, registry?, default?)`，可被自訂 registry 覆寫，方便未來新增字型只改一筆資料、不改 mapper code。任何使用多層 font-family stack 的 UI 都受惠（DS3 case：99 個 label 從 100% newsreader 變成 51 newsreader（headline serif）/ 28 manrope（label/num Latin）/ 13 notosans_tc（body CJK），對齊 source 的 4 條 `--font-*` 變數語意）。通則：**font-family 是堆疊不是別名；converter 必須遵守 CSS 的 fallback 順序，不能跳過解析直接挑一份資產。**
- [x] 驗證：`node tools_node/test/dom-to-ui-self-test.js`（29 個 ok，含 R-6 / R-7 / R-8 / R-9 / R-10 測試）、`node tools_node/validate-ui-specs.js --strict --check-content-contract`、`node tools_node/ucuf-runtime-check.js`（character-ds3-main scope 0 errors，sidecar 假陽性已消）。
- [x] **通則 R-11（`text-shadow` simple 形式映射為 Cocos Label 原生 shadow API）**：Cocos 3.8 Label 已提供 `enableShadow` / `shadowColor` / `shadowOffset` / `shadowBlur` 原生屬性，因此 simple `text-shadow`（單層、非 inset）屬於 runtime 已支援能力，不應被誤判為 assetize。`tools_node/lib/dom-to-ui/css-capability-matrix.js` 必須以 value-aware 規則處理：單層非 inset → `supported`；多層或 `inset` → `assetize`。`tools_node/lib/dom-to-ui/draft-builder.js` 必須提供純函式 `parseSimpleTextShadow(value)`（解析 `Xpx Ypx Bpx <color>` 雙向順序、tokenize 時保持 `rgba(...)` 完整、length<2 / `none` / 多層 / 空值回 null）並在 `ensureLabelStyle` 把結果寫到 label-style slot 的 `shadow: { color, offsetX, offsetY, blur }`；color 必須先經 `normalizeCssColorToHex` 轉成 `#RRGGBBAA` 8 位 hex，避免 runtime resolver（只認 hex / token）需要再寫 CSS parser。runtime 端 `assets/scripts/ui/core/UISpecTypes.ts` 的 `SkinLabelSlot` 加 optional `shadow` 欄位；`UISkinResolver.getLabelStyle` 透過 `resolveColor(...)` 解析陰影色；`UIPreviewStyleBuilder.applyLabelStyle` 直接設 `label.enableShadow = true; label.shadowColor; label.shadowOffset = new Vec2(...); label.shadowBlur`。所有需要文字陰影的 UI 通用（DS3 case：1 個 hero overlay heading 從 assetize 缺口降為 supported，並真正套到 Cocos Label 上而非生成 sidecar 圖）。通則：**runtime 已支援的能力一定要直接 wire 過去，禁止退回 assetize 或要求 runtime 解析 CSS 字串；converter 必須在 layout 階段就把 CSS color/length 規範化為 runtime 可直接消費的型態（hex8 / number）。**
- [x] 驗證：`node tools_node/test/dom-to-ui-self-test.js`（30 個 ok，含 R-6 / R-7 / R-8 / R-9 / R-10 / R-11 測試）、`node tools_node/validate-ui-specs.js --strict --check-content-contract`（character-ds3 scope 無新增錯誤，僅既有 atlas-batch-limit 警告）、`node tools_node/check-encoding-touched.js`（touched 全綠）。
- [x] **通則 R-12（`@font-face` 不是 unsupported；converter 必須抽出 mapping 並動態擴充字型 registry）**：`@font-face { font-family: X; src: url(...) ... }` 是 CSS 宣告自訂字型的標準寫法，runtime 不需要解析，converter 應該把它變成 Cocos font asset 引用。`tools_node/lib/dom-to-ui/css-capability-matrix.js` 必須在 declaration 掃描前先抽出所有 `@font-face` block：（a）整塊納入 `font-face-declaration` capability（不算 supported / assetize / unsupported），（b）從掃描內容中移除以避免 `src: url(...)` / `font-family` / `font-weight` / `font-display` 變成假性 top offender，（c）把抽出的 `[{family, src, srcs}]` 暴露在 report 的 `fontFaceMappings` 欄位給 compare 工具與 converter 使用。`tools_node/lib/dom-to-ui/draft-builder.js` 必須提供 `extractFontFaceMappings(cssText)`（純函式 / re-export 自 css-capability-matrix）、`resolveFontAssetByConvention(family)` 與 `buildFontFaceRegistry(styleSheets, customResolver?)`，後者把每個 @font-face 轉成 `[{ match: /^family$/i, asset, source: '@font-face', family }]` 的 registry entry，並可由 caller 透過 `customResolver(family, src, srcs) => assetPath` 覆寫預設「`fonts/<sanitized-family>/font`」的 convention。`buildDraftFromHtml` 必須在 `parseStylesheets` 之後立刻 call `buildFontFaceRegistry(parsed.styleSheets, opts.fontFaceResolver)` 並掛到 `ctx.fontFaceRegistry`；`pickFontByTag(style, ctx)` 必須把 `ctx.fontFaceRegistry` layered 在 `PROJECT_FONT_REGISTRY` 之前，亦即 source-CSS 宣告的字型優先勝過全域預設。任何使用 self-hosted 字型的 UI 通用（DS3 case：linked CSS 的 3 個 @font-face — Newsreader / NotoSansTC / Manrope — 從 `src` ×3 與 inner declarations 假性 unsupported 移出 top offenders；compare-html-to-cocos-editor 報告的真正缺口從 4 → 1）。通則：**font-face / token-declaration / 註解這類「非 render-time 屬性」必須走獨立 capability 桶，不可被歸為 unsupported；converter 必須消費這些宣告做 asset wiring，不可丟給 runtime。**
- [x] 驗證：`node tools_node/test/dom-to-ui-self-test.js`（31 個 ok，含 R-6 / R-7 / R-8 / R-9 / R-10 / R-11 / R-12 測試）、`node tools_node/validate-ui-specs.js --strict --check-content-contract`（character-ds3 scope 無新增錯誤）、`node tools_node/check-encoding-touched.js`（touched 全綠）、實測 DS3 source-package CSS 跑 `buildCssCapabilityReport` 取得 `fontFaceMappings=[Newsreader,NotoSansTC,Manrope]`、`fontFaceDeclaration=3`、top offenders 不再含 `src`。
- [x] **通則 R-13（declaration-block 結構化抽取 + value-aware `border` shorthand）**：CSS classifier 必須只在 `{ ... }` declaration block 的內文上跑 flat `prop:val` 掃描，selector text 必須以結構切分排除。原本一條 flat regex 會把 `.cell:last-child {...}`、`a:hover {...}`、`div::before {...}` 這類 selector 中含 `:` 的 token 誤判為 `cell` / `a` / `div` 之類的假 property，污染 top offenders。修正後在 `tools_node/lib/dom-to-ui/css-capability-matrix.js` 新增 `extractDeclarationBlocks(cssText)` 純函式：以 brace-balanced scan 走訪 CSS、只收 leaf body（不含內層 `{` 的 block 內文，亦即 `@media { .x { ... } }` 只取最內層 `.x` 的內容），把所有 leaf body 用 `;` 串成單一掃描字串，再丟給原本的 `prop:val` regex。同時把 `border` shorthand 改為 value-aware（與 R-8 / R-11 同形）：`none` / `0` / `Npx solid <color>`（含 rgba / var token）→ supported；`dashed` / `dotted` / `double` / `groove` / `ridge` / `inset` / `outset` → assetize；其餘 → unsupported。順帶把 `text-transform` 補進 SUPPORTED 集合（R-9 converter 已在 build 時消費掉，不是 render-time gap）。通則：**所有非 declaration text（comment / @-rule / selector）必須在 flat scan 之前以結構切分移除**，這條規則與 R-7（comment）、R-12（@font-face）共同收斂為一個完整的 capability scanner pipeline；同時 shorthand property（`background` / `text-shadow` / `border`）統一走 value-aware 路徑，沒有任何一個 shorthand 應該被 hard-listed 為某個固定 capability。
- [x] 驗證：`node tools_node/test/dom-to-ui-self-test.js`（48 個 [ok]，含 R-6 / R-7 / R-8 / R-9 / R-10 / R-11 / R-12 / R-13 測試，ALL PASS）；DS3 source-package CSS 跑 `buildCssCapabilityReport` 取得 `summary.unsupported` 從 55 → 39（−16），`summary.supported` 從 247 → 252（+5：5 個 solid border 重新分類），`cell` / `a` / `div` 等 selector-leak phantom 全數從 top offenders 消失，DS3 重新匯出無 regression、encoding 全綠。
- [x] **通則 R-14（value-aware `box-shadow` / `drop-shadow` 分類，對齊 ShadowBackground runtime 能力）**：CSS classifier 必須以 VALUE 而非 property name 來判定 `box-shadow` / `drop-shadow`：（a）`none` / 空值 → supported（no-op）；（b）任意數量的非 `inset` 陰影層（例如 `0 4px 8px rgba(0,0,0,.3), 0 2px 4px rgba(0,0,0,.5)`）→ supported（runtime 端 `assets/scripts/ui/components/ShadowBackground.ts` 已能接受 shadow array `setShadows(shadows[], padding, cornerRadius)` 並用 procedural texture 烘焙；converter 端 `tools_node/lib/dom-to-ui/draft-builder.js#buildEffectSiblingNodes` / `collectOuterShadows` 已將之轉成 `shadow-set` skin slot 與 sibling node）；（c）任一層含 `inset` → assetize（候選 R-15 sidecar bake）。修正前 `box-shadow` 被 hard-listed 在 `ASSETIZE` 集合，使每個有普通 drop-shadow 的 UI 都被誤標為「需要 asset」，與實際 runtime 能力不符。修正點：`tools_node/lib/dom-to-ui/css-capability-matrix.js#classifyCssProperty` 在 `ASSETIZE.has(prop)` 之前加入 `box-shadow` / `drop-shadow` 的 value-aware 分支（與 R-8 background / R-11 text-shadow / R-13 border 同形）。通則：**所有 shorthand property 一律 value-aware；任何 runtime 已實作的渲染能力必須反映在 capability scanner 的 supported 桶，不可因為 property name 在某個歷史 set 裡就一路標 assetize**。
- [x] 驗證：`node tools_node/test/dom-to-ui-self-test.js`（49 個 [ok]，含 R-6 / R-7 / R-8 / R-9 / R-10 / R-11 / R-12 / R-13 / R-14 測試，ALL PASS）；DS3 source-package CSS 跑 `buildCssCapabilityReport` 取得 `summary.supported` 從 252 → 258（+6：3 條 box-shadow + 額外連動 supported entry），`summary.assetize` 從 20 → 17（−3：純 drop-shadow 重新分類為 supported），剩 3 個 `box-shadow assetize` 為真 `inset` 變體（R-15 候選）；DS3 重新匯出無 regression、encoding 全綠。
- [x] **通則 R-16（非 render-time 屬性走獨立 capability 桶 + value-aware `transform` + 側向 border shorthand + 定位 `inset` shorthand + `box-sizing` no-op）**：CSS classifier 必須把「不是用來畫像素」的屬性從 unsupported 移出，獨立分桶，與 R-6（token-declaration）/ R-12（font-face-declaration）同形：（a）**motion-only**：`transition` / `transition-*` / `animation` / `animation-*` / `will-change`（runtime 端由 `interaction.json` / `motion.json` sidecar 處理，不寫進 skin tree）；（b）**interaction-only**：`cursor` / `pointer-events` / `user-select` / `scroll-behavior` / `scrollbar-width` / `scrollbar-color` / `-webkit-scrollbar*` / `-webkit-tap-highlight-color`（input 端控制，與像素無關）。同步補上 value-aware `transform`：`none` / `translate(...)` / `translateX|Y(...)` / `translate3d(...)` / `scale(...)` / `rotate(...)` 都被 converter 在 build time 吸收進 widget offset / sprite scale / node angle → supported；只有 `rotate3d` / `matrix3d` / `perspective` / `skew` 真正 unsupported。再補上 `inset` / `inset-block` / `inset-inline` / `inset-*` 定位 shorthand → supported（Cocos Widget 直接吸收 4-side anchor）；`border-top` / `border-right` / `border-bottom` / `border-left` 側向 shorthand 套 R-13 同款 value-aware（`solid` / `none` / `0` → supported；`dashed` / `dotted` / `double` / `groove` / `ridge` / `inset` / `outset` → assetize）；`box-sizing` 加入 SUPPORTED（Cocos UITransform 隱含 border-box，size / padding 直接套用）。新增 `summary.motionOnly` / `summary.interactionOnly`，並在 topOffenders filter 中排除這兩桶（與 token-declaration / font-face-declaration 一致）。通則：**capability scanner 的 `unsupported` 桶只能用來標真正會造成像素差的 render-time 屬性**；motion / interaction / token / font-face / 其他「runtime sidecar 處理」屬性必須各佔獨立桶，否則 compare 報告的「真正缺口」會被誤放大數十倍。同時 shorthand property（`background` / `text-shadow` / `border` / `border-{side}` / `box-shadow` / `drop-shadow` / `transform`）一律走 value-aware 分支。
- [x] 驗證：`node tools_node/test/dom-to-ui-self-test.js`（50 個 [ok]，含 R-6 / R-7 / R-8 / R-9 / R-10 / R-11 / R-12 / R-13 / R-14 / R-16 測試，ALL PASS）；DS3 source-package CSS 跑 `buildCssCapabilityReport` 取得 `summary.unsupported` 從 36 → 10（−26：transition×5 / cursor×4 / inset×4 / pointer-events×3 / transform×5 / scrollbar-width×2 / 等等獨立分桶 + 側向 border 與 box-sizing 重新分類），`summary.supported` 從 258 → 269（+11），新增 `motionOnly=5` 與 `interactionOnly=10`，topOffenders 已收斂為「100% 真渲染缺口」（`background` 9 / `box-shadow inset` 3 / `content` 3 / `clip-path` 2 / `text-shadow` multi-layer 2 / `background-image` 1 / `background-position` 1 / `background-size` 1）；DS3 重新匯出無 regression、encoding 全綠。
- [x] **通則 R-17（UNSUPPORTED 集合全面 value-aware：`content` / `clip-path` / `filter` / `backdrop-filter` / `mask` / `mask-image` / `mix-blend-mode` / `transform-style` / `perspective` / `shape-outside` 一律先檢查值才退回 unsupported）**
  - 對稱於 R-8 / R-11 / R-13 / R-14 / R-16（shorthand value-aware）的鏡像規則：**任何屬性只要存在 `none` / `normal` / 空 pseudo `""` / 軸對齊簡單形 / 原生 blend mode 等可渲染特例，classifier 必須先 inspect VALUE，不能因 property name 落在 UNSUPPORTED 集合就直接 fail-classify。**
  - 落地點：`tools_node/lib/dom-to-ui/css-capability-matrix.js` 在 `if (UNSUPPORTED.has(prop)) return 'unsupported';` 之前插入完整 value-aware dispatcher。
  - 規則表：
    - `content: ""` / `''` / `none` / `normal` → supported（純裝飾子節點，Cocos child node 即可實現）；其他 → assetize。
    - `clip-path: none` / `inset()` / `circle()` / `ellipse()` / 4 點 polygon → supported（Cocos Mask）；`path()` / `url()` / 多點 polygon → assetize。
    - `filter: none` / `drop-shadow(...)` → supported（後者由 R-14 sibling 路徑處理）；`blur` / `brightness` / `contrast` / `saturate` / `grayscale` 等 → assetize。
    - `backdrop-filter: none` → supported；其餘 → assetize。
    - `mask` / `mask-image: none` → supported；`linear-gradient(...)` / `url(...)` → assetize。
    - `mix-blend-mode: normal` / `multiply` / `screen` / `overlay` / `darken` / `lighten` / `add` → supported（Cocos Sprite `srcBlendFactor` / `dstBlendFactor`）；`hue` / `saturation` / `color` / `luminosity` 等罕見 → assetize。
    - `transform-style: flat` → supported；`preserve-3d` → unsupported。
    - `perspective: none` / `0` → supported；其餘 → unsupported。
    - `shape-outside: none` → supported；其餘 → unsupported（無 Cocos 對應）。
  - 自我測試：`dom-to-ui-self-test.js` R-17 區塊覆蓋全部 7 個屬性家族 + summary（all-none CSS yield 0 unsupported / 0 topOffenders）。
- [x] **通則 R-18（layout shorthand：`max-width` / `min-width` / `max-height` / `min-height` / `aspect-ratio` → supported；`grid-template-*` / `grid-area` / `grid-column` / `grid-row` / `grid-auto-*` / `place-items` / `place-content` / `place-self` → 獨立 `layout-only` 桶）**
  - 對稱於 R-16 motion-only / interaction-only：converter 在 build time 把 grid / place-* shorthand 轉成 Cocos Layout component，runtime 不會再見到原 CSS 屬性，因此這些屬性並不是渲染缺口；獨立分桶讓 summary 可追蹤但不污染 topOffenders。
  - max/min/aspect-ratio 直接由 Cocos UITransform / Widget 吸收。
  - 落地點：`css-capability-matrix.js` 在 R-17 dispatcher 之後、UNSUPPORTED fallback 之前；`buildCssCapabilityReport` `summary` 新增 `layoutOnly` 欄位、`topOffenders` filter 同步排除 `layout-only`。
  - 自我測試：`dom-to-ui-self-test.js` R-18 區塊覆蓋全部 layout 屬性 + summary（layoutOnly=2 排除 topOffenders、unsupported=0）。
- [x] **R-17 + R-18 對 character-ds3-main DS3 source CSS 的實測**：`summary.unsupported` 從 10 → 1（−9，僅剩 1 個 phantom `xl` 為 @media 殘留 token）。`summary.supported` 從 269 → 275（+6）。`summary.assetize` 從 17 → 18（+1，`clip-path` 複雜形從 unsupported 下降到 assetize）。新增 `layoutOnly=2`。topOffenders 收斂為 8 條，**7 條已是真實 assetize 工作**（background gradient/url ×9、box-shadow inset ×3、text-shadow multi-layer ×2、background-image/position/size 各 1、clip-path 複雜形 1）+ 1 條 phantom（待 R-19 邊界規則處理）。從 R-9 到 R-18 累計：`unsupported` 55 → 1（−54），假性缺口幾乎清零。
- [x] 自我測試 52 [ok] / ALL PASS（新增 R-17 + R-18 兩個 ok line）。
- [x] DS3 重新匯出無 regression（durationMs=6360）。
- [x] Encoding 整合檢查 `tools_node/lib/dom-to-ui/css-capability-matrix.js` + `tools_node/test/dom-to-ui-self-test.js` 全綠。
- [x] **通則 R-19（classifier capability 必須等於 runtime + converter + sidecar 已實作能力的反向總和：`background` / `background-image` / `background-position` / `background-size` / `background-repeat` 一律值感知 + 對齊 runtime；single-layer gradient / url → supported；multi-layer mix → assetize）**
  - 對稱於 R-16 evolution2 條款的設計原則：「capability scanner 是診斷工具，不是渲染引擎代理；它的分類必須等於 runtime + converter + sidecar 已實作能力的反向總和」。**遞迴應用**：runtime / converter 已支援的特例必須立即從 assetize 升為 supported，否則 classifier 在說謊。
  - 來源證據：
    - `assets/scripts/ui/components/GradientBackground.ts` 已有完整 `setLinearGradient()` / `setRadialGradient()` API，runtime 直接渲染 `linear-gradient(...)` / `radial-gradient(...)`。
    - `assets/scripts/ui/core/UIPreviewStyleBuilder.ts` `gradient-rect` skin slot 路由到 `GradientBackground` component。
    - `tools_node/lib/dom-to-ui/draft-builder.js` `buildGradientRectSlot` 已把 CSS gradient 字串轉為 gradient-rect slot；`url(...)` 走 sprite-frame slot；`background-position` / `background-size` / `background-repeat` 由 sprite slot config 吸收。
    - 因此單層 gradient / url 都是 runtime-supported，不應留在 assetize。
  - 落地點：
    - `tools_node/lib/dom-to-ui/css-capability-matrix.js#classifyCssProperty`：`background` 規則改寫為值感知（單層 gradient → supported；單層 url → supported；mixed gradient + url 或多層 gradient/url → assetize；solid / var / none / transparent 維持 supported）。
    - 新增 `background-image` 值感知分支：規則同 `background`。
    - 新增 `background-position` / `background-size` / `background-repeat` → 直接 supported（sprite/gradient slot config，非獨立渲染 pass）。
  - 自我測試：`tools_node/test/dom-to-ui-self-test.js` R-19 區塊覆蓋（a）`background` 7 種值（solid / var / linear / radial / conic / url / mixed）；（b）`background-image` 4 種；（c）3 個 longhand config；（d）summary 驗證（單層 gradient / url 純 CSS yield 0 assetize / 0 unsupported）。原 R-8 測試同步更新為「single-layer gradient/url 全部 supported；多層 mixes 才 assetize」。
  - 影響範圍：所有採用 design system gradient token / 背景圖 url 的 UI 通用（涵蓋幾乎全部現代設計稿）。DS3 case：`summary.assetize` 從 18 → 14（−4）、`summary.supported` 從 275 → 279（+4）；topOffenders 從 7 條收斂為 6 條：`background` ×7（多層 mix，真實 R-15 bake 候選）、`box-shadow inset` ×3（真實 R-15）、`text-shadow` multi-layer ×2（真實 R-15）、`background-image` ×1（多層 mix）、`clip-path` 複雜 polygon ×1（真實 R-15）、phantom `xl` ×1（R-20 var resolution 候選）。剩下 5 條全部都是真實 R-15 sidecar bake 工作。
  - 累計（R-9 ~ R-19）：DS3 `unsupported` 55 → 1（−54）、`assetize` 從 ~25 收斂為 14（其中 5 條為 R-15 真實 bake 工作）。classifier 與 runtime 的真實能力差距現在只剩下 R-15 sidecar bake 的 5 個項目。
  - 設計原則延伸：**任何時候 converter 端為某種 CSS pattern 開發了新的 skin slot kind / 新的 runtime component / 新的 sidecar emitter，必須同步在 classifier 把對應 property + value form 從 assetize / unsupported 升級為 supported；否則 classifier 永遠在說謊**。建議在 `skin-kinds.js` 與 `css-capability-matrix.js` 之間設立交叉檢查（後續 R-N 候選）。
- [x] 自我測試 53 [ok] / ALL PASS（新增 R-19 ok line + R-8 升級為 R-8/R-19 ok line）。
- [x] DS3 重新匯出無 regression（durationMs=6146）。
- [x] Encoding 整合檢查 `tools_node/lib/dom-to-ui/css-capability-matrix.js` + `tools_node/test/dom-to-ui-self-test.js` 全綠。
- [x] R-20 (declaration-boundary anchoring + digit-aware property names, 通則)：CSS capability scanner 的 `declRe` 過去寫成 `([A-Za-z-]+)\s*:\s*([^;{}]+)[;}]?`，沒有「declaration boundary」錨點、也不認得 token 名稱裡的數字（`--sp-2xl`、`--font-3xl`、`--col-4k`），導致正則回退時把 `xl: 32px` 當成獨立宣告產生 phantom unsupported `xl`；這是任何採用 `xs/sm/md/lg/xl/2xl/3xl` 命名慣例或解析度標記（`1k/2k/4k`）的設計系統都會踩到的全域 bug。改成 `(?:^|[;{}])\s*(--[\w-]+|[A-Za-z][A-Za-z0-9-]*)\s*:\s*([^;{}]+)`：要求屬性名出現在宣告邊界（檔頭、`;`、`{`、`}` 之後），並把 custom property（容許數字）與 standard property（首字母為英文）正則分流。新增 self-test R-20 區塊 cover：(a) `--sp-2xl`/`--font-3xl`/`--col-4k` 全部歸 token-declaration、不再洩 `xl/3xl/4k`；(b) `url("data:image/png;base64,...")` 內嵌冒號不會被當成 `image:`/`png:` 屬性；(c) 標準 CSS 規則仍然正確分類；self-test 從 53 → 54 [ok] / ALL PASS。DS3 source 量測：summary `{supported:279, assetize:14, unsupported:0, tokenDeclaration:128, fontFaceDeclaration:3, motionOnly:5, interactionOnly:10, layoutOnly:2}` — `unsupported` 從 1 → 0；tokenDeclaration 從 122 → 128（多回收的 6 條正是過去被 phantom 吃掉的 `2xl/3xl/4xl/5xl` family token）；topOffenders 收斂為 5 條 100% 真實 R-15 bake 工作（`background ×7`、`box-shadow ×3`、`text-shadow ×2`、`background-image ×1`、`clip-path ×1`）。Generic 安全網：未來任何設計 token 系統採用「字母+數字」混合命名都不會再產生幽靈屬性。
- [x] R-21 (nested-paren-aware multi-layer detection, 通則)：CSS shorthand `background` / `background-image` / `text-shadow` 的多層偵測過去用 `replace(/\([^()]*\)/g, '()')` 做單回合 paren strip + `split(',')`，但這只清掉「最內層」括號，外層的 `linear-gradient(...)` / `radial-gradient(...)` 仍然存在；接著 split top-level 逗號時，gradient 內部的 `rgba(...)` / `hsla(...)` / `var(...)` 逗號被當成 layer 分隔，使得單層 `linear-gradient(90deg, transparent 45%, rgba(10,10,10,.7) 75%, #0a0a0a 100%)` 被誤分成 4 層 → 全 UI 都把單層帶 rgba 顏色站的 gradient 誤判為 `assetize`。改成新的 helper `splitTopLevelLayers(value)`：用 paren-depth counter 走訪字串，僅在 depth=0 的逗號處切割。Generic 適用任何使用 gradient / 多色站 / `var(...)` 參數 / 巢狀 CSS 函式的 UI。新增 R-21 self-test 區塊 cover：(a) 單層 linear-gradient 含多個 rgba 站 → supported；(b) 單層 radial-gradient 含多 rgba 站 → supported；(c) 兩個 radial-gradient 真實多層 → assetize；(d) 單層 / 雙層 text-shadow 區分；(e) DS3-shape regression：scanner 對相同 CSS 輸出 1 條 background-supported + 1 條 background-assetize。self-test 從 54 → 55 [ok] / ALL PASS。**DS3 source 量測巨幅改善**：summary `{supported:286, assetize:7, unsupported:0, tokenDeclaration:128, fontFaceDeclaration:3, motionOnly:5, interactionOnly:10, layoutOnly:2}`。`assetize` 從 14 → 7（**腰斬一半**）；`supported` 279 → 286（+7）。topOffenders 收斂為 4 條 100% 真實 R-15 sidecar bake 工作（`box-shadow inset` ×3、`text-shadow` 真多層 ×2、`background` 雙 radial-gradient 堆疊 ×1、`clip-path` 複雜 polygon ×1）。Classifier 階段性收斂完成：剩餘 7 條 assetize 全部需要 R-15 puppeteer bake 才能進一步推升 95% pixel similarity。
- [x] R-22（partial-supported capability bucket + mixed inset/outer box-shadow，通則）：技術觀察 — runtime `ShadowBackground.setShadows()`（`assets/scripts/ui/components/ShadowBackground.ts` L46）的 `.filter(shadow => !shadow.inset)` 表示 mixed `inset 0 0 16px rgba(...), 0 0 24px rgba(...)` 在現行 runtime **已經渲了 outer 那層**，只是 inset 被丟掉。但 R-14 之前把整條歸為 `assetize`，與 runtime 實際行為不一致 — 違反 R-19「classifier 必須對齊 runtime + converter + sidecar 能力總和」遞迴原則。修正：(1) classifier `box-shadow` / `drop-shadow` 規則改為三段：純 outer → `supported`、純 inset → `assetize`、mixed → 新 capability `partial-supported`；(2) `buildCssCapabilityReport` 加入 `summary.partialSupported` 統計欄、`topOffenders` filter 排除 `partial-supported`（因為 reviewer 看到的損傷只剩 inset 部分，與「全 miss」性質不同）。Generic 適用任何採用「外發光 + 內框」shadow pattern 的 UI。新增 R-22 self-test cover：(a) 純 outer single-layer / multi-layer → supported；(b) 純 inset single-layer / multi-layer → assetize；(c) mixed inset+outer → partial-supported；(d) summary 統計 + topOffenders 排除驗證；同時更新舊 R-14 mixed test 期望值。self-test 從 55 → 56 [ok] / ALL PASS。**DS3 source 量測**：summary `{supported:286, assetize:4, partialSupported:3, unsupported:0, tokenDeclaration:128, fontFaceDeclaration:3, motionOnly:5, interactionOnly:10, layoutOnly:2}`。`assetize 7 → 4`（−3，3 條 mixed shadow 移到 partial-supported）；topOffenders 4 → **3 條**：`text-shadow` 真多層 ×2、`background` 雙 radial-gradient ×1、`clip-path` 複雜 polygon ×1。**真正需要 R-15 puppeteer bake 的「全 miss」項目壓到 4 個**，且 reviewer 從 topOffenders 看到的雜訊也同步減少。
- [x] R-23（text-shadow partial-supported，通則）：技術觀察 — Cocos Label 原生 shadow API（`enableShadow` / `shadowOffset` / `shadowBlur` / `shadowColor`）僅支援**單一**陰影層，`UIPreviewStyleBuilder.ts` L348-354 直接落地此單層渲染。多層 `text-shadow: 0 0 2px rgba(...), 0 1px 2px rgba(...)` 在現行 runtime **已渲第 1 層**（最強的那層由 converter 預先選出），其餘層需 R-15 sidecar bake。R-21 之前把多層 text-shadow 整條歸 `assetize` 違反 R-19 + R-22「partial render 也是真實能力」遞迴原則。修正：(1) classifier `text-shadow` 規則三段拆分：純 single-layer → `supported`、multi-layer (no inset) → `partial-supported`、含 inset → `assetize`；(2) 沿用 R-22 既有的 `summary.partialSupported` 統計欄與 `topOffenders` filter。Generic 適用任何使用「文字描邊 + 文字外發光」combo 的 UI（極為常見的 game UI pattern）。新增 R-23 self-test cover 5 種 case；同時更新 R-11 multi-layer 與 R-21 two-layer rgba text-shadow 兩條舊測試 expectation 從 `assetize` 改為 `partial-supported`。self-test 從 56 → 57 [ok] / ALL PASS。**DS3 source 量測**：summary `{supported:286, assetize:2, partialSupported:5, unsupported:0, tokenDeclaration:128, fontFaceDeclaration:3, motionOnly:5, interactionOnly:10, layoutOnly:2}`。`assetize 4 → 2`（−2，2 條 multi-layer text-shadow 移到 partial-supported）、`partialSupported 3 → 5`、topOffenders 3 → **2 條**：`background` 真三層 mix ×1、`clip-path` 5-point polygon ×1。**真正全 miss 的 R-15 puppeteer bake 工作壓到 2 個 property、共 2 條 sample**，達成 classifier 階段最小化。
- [x] R-24（gradient-subtype 精度修正，通則 + correctness uplift）：技術觀察 — converter `tools_node/lib/dom-to-ui/draft-builder.js::buildGradientRectSlot` L939-963 對 `gradient.type !== 'linear'` 與 `layers.length !== 1` 直接 `return null`，意即 **single radial-gradient / single conic-gradient / repeating-linear-gradient / repeating-radial-gradient 全部沒有原生 render path**。R-19 之前的 classifier 規則 `if (hasGradient) return 'supported'` 只看「是否含 gradient 關鍵字」就回 supported，產生**無聲 pixel gap**：runtime 完全不渲，但 reviewer 看 css-coverage 以為 OK。違反 R-19 遞迴原則。修正：(1) `background` 與 `background-image` 規則新增 `isSingleLinear = layers.length === 1 && /^linear-gradient\s*\(/i.test(layers[0])` 判斷；非 single linear → `assetize`。`repeating-*` variants 因為前綴不是 `^linear-gradient(` 會自動 fallthrough 到 assetize，免另寫規則。(2) 更新 R-19 self-test 兩條既存期望（radial / conic 從 supported 改 assetize）+ R-21 b 條 expectation；新增 R-24 self-test 9 case cover solid color / var / transparent / single url / single linear / single radial / single conic / multi-layer。Generic 適用任何使用 radial spotlight、conic ring、CSS 條紋紋理（repeating-linear-gradient）的 UI。self-test 57 → **58 [ok] / ALL PASS**。**DS3 source 量測**：summary `{supported:285, assetize:3, partialSupported:5, unsupported:0, tokenDeclaration:128, fontFaceDeclaration:3, motionOnly:5, interactionOnly:10, layoutOnly:2}`。supported 286 → 285（−1，把 1 條原 false-positive 的 `repeating-linear-gradient` 揪出）、assetize 2 → 3（+1，揭露無聲 gap）、topOffenders 2 → **3 條真實 R-15 bake 工作**：`background` 三層 mix ×1、`background-image` repeating-linear-gradient（垂直細線紋理）×1、`clip-path` 5-point polygon ×1。**這是 honest reporting uplift**：表面 assetize 數字上升不代表渲染變差，反而是把先前隱形的 pixel-similarity gap 浮上檯面，給 R-15 puppeteer bake 正確的 manifest input。技術總監視角：classifier 的「假樂觀（false-positive supported）」比「假悲觀（false-negative assetize）」**危害大十倍** — 假樂觀會讓 reviewer 以為通過，但 runtime 實際少渲一層、pixel similarity 永遠卡在那；假悲觀只會讓 R-15 多烤一張 PNG。R-24 把方向校準到 honest side。
- [x] R-25（bake-manifest 通則化，build-time 烤圖契約）：技術觀察 — `assets/resources/ui-spec/layouts/*.css-coverage.json` 只有 property 級聚合（`assetize: 3`），缺 (a) selector path（無法定位節點）(b) 目標尺寸（不知道該烤多大）(c) stable id（無法跨 run 對位）(d) outputPath 約定（reviewer / 美術 / 未來 R-15 puppeteer 各自瞎找）。R-15 puppeteer 落地前，這份「該補哪些圖」清單必須先有契約。修正：(1) 新增 `tools_node/lib/dom-to-ui/bake-manifest.js`，純函式 `buildBakeManifest({snapshots, screenId, sidecarBundle})` — 從現有 fidelity-sidecars puppeteer pass 已收集的 `snapshots[]`（含 `path` selector + `_rect` boundingBox + `ucufId`）走每個 element × 每個 BAKE_RELEVANT_PROPS（background / background-image / box-shadow / text-shadow / filter / backdrop-filter / clip-path / mask / mask-image / mix-blend-mode / content），對 capability === 'assetize' 的 row 產生 `{bakeId, screenId, selector, ucufId, tag, nodeId, property, value, target:{width, height, dpr:2}, outputPath:'assets/<bundle>/sidecars/<screenId>/<bakeId>.png', skinSlotKind, status:'pending-bake'}`。(2) skinSlotKind routing：shadow/filter family → `shadow-set`、clip-path/mask → `mask-set`、其餘 → `background-set`（Cocos converter 將來 R-15 後直接吃這條）。(3) zero-area / pseudo (::before/::after) / supported / partial-supported 全部排除（partial-supported 的 R-26 才處理）。(4) 在 `fidelity-sidecars.js` 既有 puppeteer pass 中順手 emit `*.bake-manifest.json` — **零額外 puppeteer 啟動成本**。(5) `dom-to-ui-json.js` stdout summary 加 `bake-manifest=<path>` token，方便 CI / agent 看一眼就知道。新增 R-25 self-test 區塊驗 (a) 只取 assetize / 排除 supported+partial-supported / 排除 zero-area / 排除 pseudo (b) deterministic ordering & stable bakeId 跨 run 一致 (c) outputPath 規範 (d) skinSlotKind routing (e) target dpr 預設 2。self-test 58 → **59 [ok] / ALL PASS**。**DS3 source 量測**：summary `{supported:285, assetize:3, partialSupported:5, ...}` 不變（R-25 是純 emit-time 工具，不改 classifier）。但 bake-manifest 先把抽象的 `assetize: 3` summary 展開成 7 條 selector-level review entry：2 條 background-image（1190×1080 主背景 mix + 84×84 條紋重複）、5 條 clip-path（5 個 177×168 cut-corner card）。**R-27 已校正此處舊解讀**：這不是美術要立刻動工的 7 張 PNG 清單，而是 gap resolution manifest；只有 `autoBake=true` 且明確標 `data-ucuf-bake="fragment"` 的小碎片才可交給 puppeteer bake。**架構澄清回應 user Q1**：puppeteer 是 **build-time / dev-time** 工具，**從不**進 runtime。烤出來的 PNG 直接寫進 `assets/resources/sidecars/<screen>/`，meta + uuid 進 git，runtime 只當普通 SpriteFrame 載——手機 / PC / WebGL 性能完全相同、零 puppeteer 依賴。美術可以隨時用更精緻的手繪 PNG 覆蓋同名檔，無需改任何 code（同 uuid 透明替換）。manifest `bakerHint` 區塊把這條契約明文寫進每份輸出，避免後續 agent 誤解。
- [x] R-26（puppeteer bake script，R-15 implementation 落地）：技術觀察 — R-25 把契約定下來，但「拿著 manifest 真的烤出 PNG」這支腳本沒實作前，95% pixel similarity 永遠卡在 placeholder layer 缺圖。reviewer / 美術 / converter 三方都需要實體檔案才能往下推。修正：(1) 增強 manifest schema 1.0.0 → 1.1.0：新增 `sourceHtml`（workspace-relative，由 fidelity-sidecars 注入）、`viewport`（capture 當下的 size），讓 bake script 自包含、不需額外 CLI 引數。(2) 新增 `tools_node/bake-ucuf-sidecars.js`（doc_other_0018，~190 行純 CLI）：通則化讀任何 `*.bake-manifest.json` → 啟一次 puppeteer/Edge → navigate `sourceHtml` → 跑與 capture-pass byte-equivalent 的 `data-ucuf-capture-id` 重打標 IIFE → 對每筆 entry `page.$('[data-ucuf-capture-id="<nodeId>"]').screenshot({omitBackground:true})` → 寫到 `entry.outputPath`。(3) 支援 `--dry-run`（給 reviewer / CI 看清單）、`--only <bakeId,...>`（增量重烤）、`--no-update-status`（CI 模式不寫 manifest）、`--repo-root`（跨 workspace 友善）。烤完自動寫回 `entry.status='baked'` + `bakedBytes` + `bakedMtime` + manifest top-level `lastBake` 區塊（時戳 / 烤了幾張 / 失敗幾張 / 耗時 ms）。(4) `data-ucuf-capture-id` 重打標 IIFE 與 `computed-style-capture.js` 中的同算法 byte-equivalent，保證 capture-time `nodeId` ↔ bake-time DOM element 一對一映射；任何節點變動會立即被 missed/zero-area 標記偵測到。**DS3 source 真烤結果（R-27 已撤回作正式素材）**：R-26 技術驗證曾輸出 7 張 PNG 到 `assets/resources/sidecars/character-ds3-main/`，總耗時 3950ms，0 失敗；R-27 美術 QC 後已清除，不再視為正式素材或必要清單。`div_2__background-image` 1334x750 → 2668865B（主背景三層 mix 成功 raster）、`div_84__background-image` 338x96 → 30750B（重複條紋紋理）、5× `div_*__clip-path` 109x13~662x1 → 108~2096B（5 個 cut-corner card 的 mask）。**主架構閉環達成**：build-time puppeteer → PNG 進 `assets/resources/sidecars/<screen>/` → meta + uuid 進 git → runtime 載 SpriteFrame 零 puppeteer 依賴。**R-27 已知殘缺**：clip-path 元素的 bake-time bbox（109x13）與 capture-time bbox（123x117）不一致 — 設計稿可能有 lazy reveal / hover-grow animation，capture 與 bake 兩次 navigate 之間 layout 不穩。下一輪要在 bake script 加（a）second-pass `getBoundingClientRect()` reconcile（b）capture-time stable rect snapshot 寫入 manifest，bake 用 manifest 的 rect 而非當下 boundingBox（c）`element.scrollIntoView` + 200ms settle 再讀。**通則性**：本 script 對任何跑 HTML→UCUF skill 的 UI 都直接可用，零 DS3 假設、所有路徑/尺寸/screenId 都從 manifest 讀。R-15 工作正式從「未實作 placeholder」轉為「baked + R-27 polish」。
- [x] R-27（美術總監 QC：auto-bake 改為小碎片 opt-in，撤回錯誤七張 PNG）：技術觀察 — R-26 把 `assetize` 直接等同「整個 element 截圖」是錯的美術引導；HTML→UCUF 的 sidecar bake 只應服務**缺乏的小型、獨立、可替換視覺碎片**，不是把整頁背景、卡片內容、clip-path 幾何行為截成 PNG。QC 七張輸出：`div_2__background-image` 是 2668×1500 全螢幕不透明 PNG（違反大型背景不得 PNG、也不是小缺圖）、`div_84__background-image` 實際 676×192 且 100% 不透明（不是 58×58 tile）、5 張 `clip-path` 是 2px/26px 高的不透明黑條（geometry/mask 被誤截，不是素材）。修正：(1) `computed-style-capture.js` 捕捉 `data-ucuf-bake` / `data-bake` / `data-ucuf-bake-note`；(2) `bake-manifest.js` schema 1.2.0 加 art-direction gate：只有 `data-ucuf-bake="fragment"` 且小於 256×256 / area≤65536 / viewport≤8% 的 entry 才 `autoBake=true` 並取得 `outputPath`；大型背景 → `manual-art-asset`，clip-path/mask → `converter-geometry`，未明確標記的小圖 → `review-only`；(3) `bake-ucuf-sidecars.js` 預設只烤 `autoBake=true && bakeAction='auto-screenshot-fragment'`，dry-run 會列出 skipped reason；(4) screenshot 改用 manifest target clip（含 x/y/w/h）避免再吃到 bake-time boundingBox 漂移；(5) 清除上一輪錯誤的 `assets/resources/sidecars/character-ds3-main/` 七張 PNG 與 meta。self-test 維持全綠。**DS3 新 manifest**：7 個 gap 仍存在，但 `autoBakeEntries=0`、`reviewOnlyEntries=7`，分流為 `manual-art-asset:1`（大背景）、`review-only:1`（58×58 條紋需人工判斷是否真缺小圖）、`converter-geometry:5`（clip-path 應走 Cocos mask/vector/converter）。通則：每個 UI 若真的有缺小圖，source HTML 必須明確在那個小碎片節點標 `data-ucuf-bake="fragment"`；工具才允許 build-time puppeteer 截那一小塊。
- [x] R-28（既有 runtime 美術資源優先，update mode 防退步）：技術觀察 — HTML source 的背景 gradient / placeholder 只是本輪轉換草稿，不應覆蓋已存在且可載入的正式 runtime sprite-frame。若 `--merge-mode html-authoritative` 直接把既有 `auto.*` skin slot 洗成 generated color/gradient，下一輪 skill update 會讓美術已交付 JPG/PNG 退步。修正：(1) `tools_node/lib/dom-to-ui/smart-merge.js` 在 skin merge 時先檢查既有 `auto.*` slot 是否為 `kind: "sprite-frame"` 且 path 在 `assets/resources/` 有實檔；(2) 未帶 `assetPolicy: "replace-existing"` / `assetReplaceApproved: true` / `_replaceExistingAsset: true` 時，一律保留既有 sprite slot，並寫入 `_assetPreserveReason: "existing-runtime-asset"`；(3) 保留時清理 generated draft 污染欄位（例如 `color: "unmappedColor"` / `gradient`）；(4) 新增 self-test：`html-authoritative` 不能覆蓋既有 runtime sprite，但帶明確 replace marker 時可替換。**DS3 實例只作驗證**：不需要的 `character_ds3_portrait_bg_decor.jpg` runtime 資源已移除；左側背景 slot 保留正式既有 `sprites/ui_families/general_detail/generated/general_detail_bg_v5_civil`。通則：只要某 UI 已有正式美術資源，update mode 的預設行為就是 preservative；換圖要先明確決策，不得被 HTML draft 默默取代。
- [x] R-29（formal UI chrome asset preservation + score 解讀，通則）：技術觀察 — tab/button/icon/panel chrome 也是正式 runtime art asset；若 HTML 草稿用 gradient/border 近似，`html-authoritative` 仍不應把既有 `button-skin` 或 named sprite slot 換掉。修正：(1) smart merge preservation 從 `auto.* sprite-frame` 擴展為所有既有 runtime asset slot：`sprite-frame.path` 或 `button-skin.normal/pressed/disabled/selected` 只要存在於 `assets/resources/` 就保留；(2) explicit replace marker 仍可替換；(3) `dom-to-ui-compare.js` 補 `--manual-waivers`，讓 approved runtime asset zone 進 adjusted score sidecar；(4) self-test 新增 formal `button-skin` regression。**DS3 實測**：`button_4` 保留 `tab_active_button`，`button_5`~`button_9` 保留 `tab_idle_button`，sync-report 6 筆 `existing-runtime-asset-preserved`。分數規則：raw `runtimeVsSource.score` 不改；已核准資產差異用 art-authority waiver/report 分流，不算 converter failure，也不能無紀錄排除。
- [x] R-30（美術總監裁決：art-authority waiver gate，通則）：R-29 證明 converter 已能保護正式 tab/button chrome；下一輪目標不再是讓 HTML 草稿覆蓋正式圖，而是把「正式美術差異」從 pixel diff 中獨立稽核。裁決：(1) raw `runtimeVsSource.score` 永遠保留；(2) approved runtime art zone 只能用 rect-scoped waiver 進 `adjustedScore`；(3) waiver 必須附 `assetPath` / `authority` / `reason` / `rect` / `sourceHtmlExpectation` / `runtimeExpectation`；(4) 禁止 waiver 文字、數值、tab 狀態、資料內容與互動缺失；(5) reviewer report 以 `converterResidualScore` 判定 converter failure，以 `artDeltaScore` 判定美術權威差異。
- [ ] R-30A（art-authority sidecar schema）：新增或正式化 `<screen>.art-authority-waivers.json`，每筆 entry 至少包含 `id`、`zoneId`、`rect`、`assetPath`、`assetKind`、`authority`、`reason`、`approvedBy`、`approvedAt`、`scope`（例如 `chrome` / `background` / `ornament`）、`mayAffectScore`。rect 必須對應 Editor screenshot 座標或可由 source/reference 轉換，不能用全螢幕 blanket mask。
- [ ] R-30B（reviewer report 雙軌）：`dom-to-ui-compare.js --manual-waivers` / final workflow summary 必須輸出 raw score、adjusted score、waiverCoverage、artDeltaScore、converterResidualScore、unwaivedDiffTopN。若 adjusted >= 0.95 但 raw < 0.95，verdict 應標 `pass-with-approved-art-delta`，不得標成 raw pass。
- [ ] R-30C（asset replacement audit）：在 sync-report 中彙總所有 `existing-runtime-asset-preserved` 與所有帶 replace approval marker 的 slot，讓 reviewer 一次確認「哪些正式圖被保留、哪些圖真的要換」。驗證重點從「HTML 是否權威」改成「每個 asset replacement 是否有明確決策與可回溯理由」。
- [ ] 殘留：HTML vs Cocos Editor hard pixel gate 待 reviewer 重 capture Cocos Editor screenshot 後測量。R-9 ~ R-29 累計把 capability scanner 的 `unsupported` 從 55 → 0（−55）、`supported` 從 ~210 → 285、`assetize` 從 ~25 收斂至 **3** 條 unique value；manifest 仍展開成 7 個 selector-level gap，但 **R-27 校正後 autoBake=0**，且 **R-28/R-29 保證既有正式 runtime sprite/button-skin asset 不會被 HTML draft 覆蓋**。達成 95% 的剩餘路徑變成：正式 art asset 補背景/紋理語言 + converter 支援 clip geometry + art-authority waiver 稽核正式 chrome 差異 + Cocos Editor 重 capture screenshot 跑 raw/adjusted 雙軌 gate。
- [ ] 下一階段建議（通則層級）：
  - **R-31 候選（DS3 zone ownership pass）**：把目前 top visual gap 拆成 `art-authority` / `converter-geometry` / `manual-art-asset` / `source-html-fix` 四類。預期 tab-rail button-skin 進 art-authority；大背景與右欄紙紋進 manual-art-asset/JPG 或既有 family layer；5 個 cut-corner/clip-path 進 converter-geometry；58×58 repeating texture 先由美術確認是否真的需要小碎片，若需要才在 source HTML 標 `data-ucuf-bake="fragment"`。
  - **R-32 候選（waiver 防濫用 validator）**：新增 waiver validator，禁止 waiver 覆蓋 label text、數值、互動狀態、loading 缺失、mount failure、ChildPanel 空內容；禁止單一 waiver 覆蓋 viewport > 8%（大型背景必須走 formal art asset，不走無證明 mask）。
  - **R-33 候選（final capture protocol）**：固定 source screenshot / Editor screenshot viewport、DPR、crop、safe area 與 settle time；compare 必須使用同一份 art-authority sidecar，並在 report 中列 `raw < adjusted` 的所有原因。
  - **R-34 候選（skin-kind / CSS capability 交叉檢查）**：建立 `skin-kinds.js` 與 `css-capability-matrix.js` 之間的 mapping test；每次新增 skin kind 必須同步更新 classifier，避免 runtime 已支援但 classifier 仍說 assetize，或 classifier 假樂觀造成無聲 pixel gap。

**階段 6：C 路線（戰術用途，僅針對特定 zone）**

- [x] Stage 6 pilot（2026-04-28）：已烘焙 `portrait` 後方裝飾背景候選，不含人物、按鈕、右欄、文字、數值或狀態。
- [x] 產物暫存於 `artifacts/ui-library/character-ds3/stage6/portrait-bg-decor-bake.png`，未 promote 到 runtime path。
- [x] 像素檢查：1190×1080、不透明、`minLuma=10` / `maxLuma=86` / `avgLuma=25.97`，非空圖。
- [x] R-28 art-director 補正：此 pilot 只保留為歷史技術驗證，不升格 runtime。若畫面已有正式 family 背景資源，update mode 直接沿用既有資源；不另產生 `character_ds3_portrait_bg_decor` 類 placeholder 圖。任何新背景替換都必須先經 asset replacement approval，再進 promote 流程。

**Gate**：

- 在階段 3 完成前不再做任何整面色塊覆蓋實驗（已驗證會掉到 0.09–0.11）。
- 在 compare 達 ≥0.95 前不 flip default 為 ds3。
- A 路線工具升級必須通過 `tools_node/test/dom-to-ui-self-test.js`（18/18）才能合入。

### M16 美術總監最終裁決（2026-04-28）

**主線：Stage 5（fidelity-snapshot 注入 draft-builder）**
**備案：Stage 6（局部靜態裝飾烘焙，僅限非互動 zone）**

理由：

1. **前段工作正當性**：Stage 1–3.5 是 DS3 從「靜態畫面」到「可營運 UI」必經產品化基礎，但它處理的是互動與資料契約，不是 pixel score 的瓶頸。score 卡在 ~0.3794 的主因是全域色彩、CSS computed style、字型 rasterization 與背景渲染差異，不是 data binding。
2. **Stage 5 = 修「眼睛」**：讓 converter 真實看到瀏覽器最終算出的色彩 / 漸層 / 樣式。改善整條 HTML→UCUF 產線，未來每個畫面都受益；保留文字、數值、tab、語系、稀有度狀態的動態能力。
3. **Stage 6 = 拍「定妝照」**：只能拉特定 zone 的視覺分；用在整個 right column 會犧牲動態性、語系、可營運性，違反人物頁高資料密度需求。

**Stage 5 三道 gate（合入條件）**：

- `tools_node/test/dom-to-ui-self-test.js` 必須 18/18 全綠。
- `--merge-mode preserve-human` 不可覆蓋人工命名（`OverviewName` / `OverviewBio` / `TabOverviewContent` 等）。
- DS3 compare 需有顯著改善（例如 `0.3794 → 0.45+` 或 unmappedColor count 顯著下降）；若改善 < 0.01 表示瓶頸不在 computed color，需重新評估再投資。

**Stage 6 安全邊界（若觸發）**：

- 只烘：羊皮紙底紋、portrait 後方裝飾、複雜框體、非互動背景。
- 禁烘：右欄整體、傳記文字、屬性數值、tab 內容、稀有度星星、裝備/血脈狀態。
- 烘焙產物只能放 `artifacts/ui-library/`，必須通過 `tools_node/promote-ui-library-asset.js` 才能進 runtime path。

### M17 Art-Authority Waiver / 95% Final Push（2026-04-29，美術總監路線）

**裁決：95% 目標拆成 raw fidelity 與 approved art fidelity 兩條同時可追溯的線。**

1. **raw fidelity**：HTML source screenshot vs Cocos Editor screenshot 的原始 pixel score，永遠保留，作為「Cocos 畫面與 HTML 草稿實像差多少」的誠實紀錄。
2. **approved art fidelity**：扣除已核准正式 runtime art asset 差異後的 adjusted score，作為「converter 是否忠實落地已核准產品美術」的驗收口徑。
3. **converter failure**：未被 waiver 覆蓋的 diff、layout 偏移、文字/數值錯誤、mount/ChildPanel 缺失、互動狀態錯誤，仍全部算失敗。
4. **art authority delta**：正式 button-skin、panel chrome、family background、approved ornament 與 HTML CSS 草稿不同時，必須以 sidecar 明列，不可靜默消分。

**DS3 下一輪執行順序**：

- [ ] 產 `character-ds3-main.art-authority-waivers.json`：先只列 R-29 已證實的 6 個 tab button-skin zone，不把其他低分區域塞進 waiver。
- [ ] 重跑 final compare：輸出 raw score、adjusted score、artDeltaScore、converterResidualScore、unwaivedDiffTopN。
- [ ] 對 unwaived top diff 做美術分類：`manual-art-asset`（正式 JPG / family layer）、`converter-geometry`（clip-path / mask）、`source-html-fix`（HTML 標記或 token 錯）、`runtime-bug`（Cocos renderer 不一致）。
- [ ] 大背景與右欄紙紋只走正式 JPG/family layer 或已存在 runtime asset，不走全區 screenshot PNG。
- [ ] 5 個 clip-path/cut-corner card 先走 Cocos mask/vector/converter rule；只有小於 256×256 且明確 `data-ucuf-bake="fragment"` 的純裝飾碎片才准 build-time bake。
- [ ] adjusted score 達 ≥0.95 且 unwaived converterResidual 無 P0/P1 blocker 時，才允許標 `pass-with-approved-art-delta`；raw score 若未達 0.95，報告仍必須明寫 raw fail。

## 11. 收斂標準

一張 HTML UI 只有在以下條件全部成立時，才可宣稱 HTML-to-UCUF v2 通過：

1. source package validator pass。
2. UCUF layout / skin / screen strict validate pass。
3. token / CSS ingestion 報告顯示來源為 source package。
4. unsupported CSS 均有 assetize / rewrite / evolution2 處理。
5. logic / interaction / runtime state 不丟失。
6. 未使用 art-authority waiver 時，Cocos Editor screenshot vs HTML source screenshot 必須 `runtimeVsSource.score >= 0.95`。
7. 使用 art-authority waiver 時，必須同時保留 raw `runtimeVsSource.score`，且 `runtimeVsSource.adjustedScore >= 0.95`、所有 waiver 皆 rect-scoped / asset-backed / reviewer-approved；報告 verdict 為 `pass-with-approved-art-delta`，不是 raw pass。
8. 低於門檻時有 evolution2 candidate 或 art-direction blocker，且下一輪可讀取已接受規則。
