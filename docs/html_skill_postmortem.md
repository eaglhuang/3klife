<!-- doc_id: doc_other_0026 -->
# HTML-to-UCUF Skill 五次大改 Postmortem 與架構審查

> **撰寫日期**: 2026-05-05
> **撰寫者**: ClaudeCode_claude-sonnet-4-6
> **目的**: 解釋為什麼從 plan1 到 plan5 已歷經 5 次大改，gacha-ds3 的 Cocos Editor 端 final gate adjustedScore 仍只達 ~0.62（目標 0.95），並把 A-E 證據與規則漂移時間線記錄為新 agent onboarding 的單一閱讀入口

---

## 一句話結論

> **方向沒撲錯，但方法論不夠。** 每個 plan 修對了某些事，但缺三個關鍵基礎設施 — multi-fixture matrix / 量化 acceptance / rule-impl 對齊機制 — 所以每次以為快達成時，發現規則只對單張畫面成立。**這題本身難（D1/D2/D3）但目前主要卡關仍在開發方法論，而非技術不可能。**

---

## A. 不合理設計

| # | 證據 | 問題 |
|---|---|---|
| A1 | `tools_node/lib/dom-to-ui/draft-builder.js` — **3091 行 / 172 個 functions** | 單檔混雜 HTML 遍歷、型別推理、字體/背景/運動解析 5 種職責 |
| A2 | `tools_node/lib/html-to-ucuf/rule-checkers.js` — **626 行 / 27 個 checker** | 同檔混合規則檢查 + core source scan + workflow summary 驗證 + radar 幾何驗證 |
| A3 | `tools_node/run-html-to-ucuf-workflow.js:18-95` parseArgs **78 行** | 14+ 個 flag、`debugOnly` 判定散在多處 |
| A4 | `compare-html-to-cocos-editor.js` (985 行) vs `capture-ui-screens.js` (1330 行) | puppeteer init / nav / screenshot 邏輯重複 |

## B. 新舊衝突的邏輯

| # | 證據 | 衝突 |
|---|---|---|
| B1 | `rule-guard.js` (82 行 組裝層) + `rule-checkers.js` (626 行 實作層) + `rule-registry.json` (metadata 層) | 三層責任邊界不清，新規則必改 rule-checkers + registry，rule-guard 不會自動知道 |
| B2 | `draft-builder.js:11` require `DRAFT_BUILDER_STAGE_RULES` from registry | registry 有 `draftBuilderStageRules` 但 rule-checkers 並未遍歷檢查，等於 declared 但 unenforced |
| B3 | `dom-to-ui-json.js` (1028 行 獨立 CLI) vs `run-html-to-ucuf-workflow.js` | 兩支都跑 preload / performance / telemetry / backup |
| B4 | Plan2 R-28 preserve-human ↔ Plan4 H2U-P4-006 source-authoritative ↔ Plan5 PROG-2-0006 update-mode guard | rule-registry 未把舊概念明確標 deprecated |

## C. 過時的老代碼

| # | 證據 | 狀態 |
|---|---|---|
| C1 | `.github/skills/html-to-ucuf/SKILL.md:115` 明文禁用 Phase B 工具 | 但 `cutover-screen-variant.js` / `generate-tab-childpanels.js` / `runtime-screen-diff.js` **3 個 Phase B 工具仍在 repo**，無 deprecation 標記 |
| C2 | `assets/scripts/tools/vfx-block-registry.ts` 已刪 (git status D) | 但 `tools_node/run-vfx-browser-qa.js` 仍 require 此路徑，執行會 crash |
| C3 | 5 份 plan 文件並列（plan / plan2 / plan3 / plan4 / plan5） | SKILL.md 雖有「優先順序」但無強制；新 agent 容易誤讀舊 plan 為 active |

## D. 更優化的作法

| # | 建議 | 預期效果 |
|---|---|---|
| D1 | `html-parser.js` (9.7K 自寫) → `node-html-parser` 或 `jsdom` | 移除 namespace / CDATA / entity 容錯的手寫負擔 |
| D2 | `draft-builder.js` 拆 5 模組（traverser/typography/backgrounds/interactions/motion） | 每模組 ≤ 600 行，可單獨測試 |
| D3 | `rule-checkers.js` 拆目錄（按規則 ID prefix 分檔） | 新規則只改對應子檔 |
| D4 | 抽 `lib/browser-capture-core.js` | 兩 CLI 共用，省 ~200 行 |
| D5 | Phase B 三工具移到 `.deprecated/` 或加 `// @deprecated` | 新 agent 不會誤觸 |

## E. 像素級 95% 對標 gap

| # | 證據 | 問題 |
|---|---|---|
| E1 | `compare-html-to-cocos-editor.js:178` `pixelDiff` + `lib/dom-to-ui/pixel-diff.js` | 算法不透明：「95% fidelity」是 pixel coverage？SSIM？bucket coverage？ |
| E2 | SKILL.md:120 列出 `history-not-story` / `radial-slide-background` / `interaction-carousel` 為已知 regression | rule-registry 中無 `knownGaps` 結構化欄位，自動驗證會誤判失敗 |
| E3 | `fixtures/html-to-ucuf-plan5/` 僅 1 個畫面 fixture | 規則為 gacha-ds3 over-fit，無法驗通用性 |

---

## 為什麼 5 次大改仍不穩定？

### 直接原因

**Plan1-4 都把「Cocos screenshot vs HTML screenshot 的視覺 diff」全部歸給「轉換器的責任」。** 實際上這個 diff 同時來自 3 個不同層：

1. **HTML → layout 轉換失誤**（D1 generated DOM structure loss — chip wrapper 變 plain label）
2. **Cocos renderer 能力邊界**（D2 multi-layer glow / box-shadow / backdrop-filter / radial gradient 無法等價）
3. **「該用 asset 還是 runtime 等價」的決策邊界**（D6 assetization boundary）

Plan5 才開始用 PROG-2-0004/0005/0006/0009 把責任拆給「source extraction / runtime renderer / asset boundary」各領域，但分工本身還沒驗完。

### 根本原因

**沒有「多畫面 golden baseline」**：Plan1-4 都在 gacha-ds3（或前身 GachaMain）上反覆迭代，規則容易 over-fit。Plan3 修「右側 tab-rail」對 gacha 有效但對其他畫面無意義。Plan5 PROG-2-0007 才要求 3 個 fixture，但目前只有 1 個。

### 三條失敗模式

| 模式 | 表現 | 證據 |
|---|---|---|
| **方向搖擺** | 每個 plan 都換核心目標（pixel parity → semantic parity → authority chain → owner mapping） | plan1 M1-M17 / plan2 R-1~R-30 / plan3 zone-ownership / plan4 rule-registry / plan5 root-cause taxonomy |
| **規則與工具脫鉤** | 規則寫在 plan 文件 → JS 常數 → 才到 registry。改規則不改代碼，代碼改了規則沒跟上 | plan4 提 H2U-P4-014~020 但 plan5 才實裝；draft-builder 殘留 `/story/` regex 直到 plan4 修補 |
| **acceptance 模糊** | 「95% 相似度」沒有數學定義；「轉換正確」沒有量化驗收 | plan2 用 pixel coverage、plan3 用 zone bucket、plan5 才補 nextFixes，但「nextFix 怎樣才算可執行」仍主觀 |

### 本質難題（這題確實難）

1. **Cocos Runtime 無法等價渲染 multi-layer compositing**：`backdrop-filter` / `box-shadow inset` / 多層 `text-shadow` / 複雜 `clip-path` 在 Cocos 沒有原生路徑。即使做 GradientBackground / ShadowBackground 自訂 skin，分數從 0.5567 → 0.6206（+6.39%）仍距 0.95 遠。
2. **HTML DOM 與 UCUF 欄位本質失配**：HTML `<div class="chip"><span>text</span></div>` 容器有 border/bg/radius，但 UCUF 是「一個 node 一個 skin slot」。要解決需重新設計 UCUF mapping，超出「轉換工具」範圍。
3. **「95% 相似度」無數學嚴格定義**：沒定視覺權重、色差門檻、結構相似性度量。Plan5 PROG-2-0009 Slice #3 才發現舊 zone trace 過寬導致 top 20 全誤派 converter-geometry。

---

## Plan 演進時間線

| Plan | 發佈時間 | 核心目標 | 引入概念 | 廢棄概念 | 最終狀態 |
|---|---|---|---|---|---|
| **Plan 1** | ~2026-04 | HTML/CSS → UCUF JSON 基礎轉換 | 基礎 dom-to-ui 架構、M1-M17 完成清單 | — | 2913 行歷史紀錄，廢棄為教科書 |
| **Plan 2** | ~2026-04-26 | 升級至「Cocos Editor screenshot vs HTML source screenshot 達 95%」的閉環流程 | R-1~R-30 系統化實作、pixel parity、puppeteer bake、raw/adjusted 雙軌 gate、art-authority waiver、zone-ownership 稽核 | — | 2026-04-29 轉為歷史實作紀錄；770 行已過時 |
| **Plan 3** | 2026-04-29 | 收斂 P2 規則殘留，以「正式 final compare (r61) `0.8312` 穩定 baseline」為新路線 | `zone-ownership` pixel bucket 叢集分析、`measure-html-selectors.js`、`geometry-correction-log.json`、per-tab replay、`Cocos Editor final gate >= 0.95` 為唯一正式 gate | phase-2-baseline、preserve-human 流程縮減 | active；398 行 |
| **Plan 4** | 2026-04-29 (4.1 2026-05-03) | 清除 P3 舊規則殘留、建立自我驗證機制、防止 debug-only 正式化 | 正式入口強制 `--source-dir`、formal vs debug entry 明確分界、rule guard 機制、semantic classifier 修正、background fidelity 與 interaction smoke、formal capture protocol | `--input` 模式取消 formal 用、preview diagnostic 僅 debug、stale/raw sidecar fallback 全刪 | 2026-05-03 active；418 行 |
| **Plan 5** | 2026-05-04 | 根本解決「Browser 高覆蓋 (97.99%) 但 Cocos 低分 (56.07%)」缺口 | 8 張任務卡 (PROG-2-0001~0009)、`H2U-P5-001` 到 `H2U-P5-010` 規則、final diff owner mapper、stale-rule audit、visual risk blocker、capture/geometry protocol gate、gradient capability 邊界重收斂、zone trace catalog | `raw score < 0.95` 不再視為 pass、browser 與 Cocos 分開驗收、拔除誤判的 radial/repeating gradient supported 假象 | 2026-05-04 開展（282 行）；PROG-2-0001~0004/0006/0008 done，0005/0009 in-progress，0007 open |

### 關鍵轉折

- **P1 → P2**：從「轉換正確」升級到「轉換後與 Cocos 一致」；引入 final screenshot gate
- **P2 → P3**：從「無中生有 95%」改為「穩定 baseline 後增量修正」；發現 raw 0.8312 是平台而非終點
- **P3 → P4**：從「個案優化」轉向「通用治理」；建立規則註冊表、formal vs debug 邊界、rule guard self-check
- **P4 → P5**：從「tool chain 正確執行」轉向「為什麼仍未達 95%？」；承認 browser/Cocos 差異是根本問題，需要責任追蹤而非總分數

---

## Rule Drift Timeline

| 規則 | P1 | P2 | P3 | P4 | P5 | 狀態 |
|---|---|---|---|---|---|---|
| pixel parity | 引入 | 強化（R-1~R-30） | 改名為「zone-ownership」 | 改名為「final gate score」 | 拆細為「blocker taxonomy」 | 活躍，逐步細化 |
| preserve-human | 引入 | 完全實現（R-28） | 縮減（僅 `--update-mode`） | 廢止（source-authoritative） | 已刪 | 已死 |
| raw/optimized/final 三層 | 引入 | 完整 | 開始重整 | 明確等級制（P4-006/020） | final 獨裁 | 活躍但嚴格等級制 |
| art-authority waiver | — | 引入（R-30） | 繼續（檢查 waiverEligibleCount） | 強化為 formal sidecar | 保留，但加 ownership trace | 活躍 |
| semantic classifier | — | 基礎 (/story/ regex) | 增強 | 問題浮現（history 誤中） | 修正（P4-014） | 活躍，已修復 |
| background fidelity | 簡單色 | 多層 + token | per-zone coverage | blocker on downgrade（P4-016/017） | capability matrix 重收斂 | 活躍，逐步強化 |
| runtime interaction | — | — | — | smoke test（P4-018） | formal pass 必備（H2U-P5-001） | 新增 & 強制 |
| formal entry | 無 | 寬鬆（`--input` 可用） | 仍寬鬆 | 強制 source-dir（P4-001） | 禁止 legacy route（P4-023） | 越來越嚴 |
| rule registry | — | — | — | 初版（H2U-P4-001~028） | 擴展（H2U-P5-001~010） | 新引入 & 活躍 |

### 規則互相衝突的案例

- **P2 preserve-human vs P4 source-authoritative**：P2 允許 `--sync-existing` 保留既有 runtime asset；P4 規定 `--no-runtime-sync` 時 `debugOnly=true`，formal 不得保留舊資料；P5 澄清：`--update-mode` 仍可保留，但只有 debug 時可用
- **P3 art-authority waiver vs P5 no-visual-degradation**：P3 同意建立 waiver 檔案，但 r61 報告 `waiverEligibleCount=0`；P5 轉向：waiver 不是解決方案，改為 blocker + nextFixes
- **P2 pixel parity vs P4 capture authority mismatch**：P2 假設「HTML screenshot == Cocos screenshot」可直接對比；P4 發現 `target=Gacha / screenId=GachaMain` 截的舊路由無法驗收新轉換；P5 確認 capture authority 為獨立 blocker

### 被靜默移除的規則

- **phase-2-baseline preserve-human workflow**（P2 R-28 → 廢止）
- **舊 `--input` HTML string 直接轉換**（P1 許可 → P4 debug-only → P5 formal 禁止）
- **CSS shorthand 解析 multi-layer fallback**（P1/P2 有 splitTopLevelLayers bug → P2 R-21 修復 → P5 仍在 gradient classifier 上糾纏）

---

## 任務卡與計劃對齊問題

| 卡號 | 狀態 | 對齊問題 |
|---|---|---|
| PROG-2-0001 | done | ✓ 與 P5 §任務卡 Checklist 對齊 |
| PROG-2-0002 | done | ✓ Plan5 §Stale Rule Audit checkpoint 已回填 |
| PROG-2-0003 | done | ⚠ 「nextFixes 包含 H2U-P5-003 診斷條目」仍無實體測試 |
| PROG-2-0004 | done | ⚠ 「補 banner title-block chip wrapper」等需求未定義對 score 的預期 delta |
| PROG-2-0005 | in-progress | ⚠ 「不要盲修 hero glow」但未說清楚「什麼條件下才開始修」 |
| PROG-2-0006 | done | ⚠ 「formal summary 必須 full-size formal capture inputs」未在卡中驗收 |
| PROG-2-0007 | open | ✗ **關鍵缺口**：P1~P4 都沒做 multi-fixture baseline，現在只有 gacha-ds3 |
| PROG-2-0008 | done | ✓ SKILL.md 已更新 |
| PROG-2-0009 | in-progress | ⚠ source trace 完整度不足（selectorTracePending=true 未封閉） |

---

## 後續行動

本文件促成下列任務卡建立（2026-05-05）：

### Skill 代碼健康度（H2U-REFACTOR-* 系列）

- **H2U-REFACTOR-0001**: draft-builder.js 拆 5 模組
- **H2U-REFACTOR-0002**: rule-checkers.js 拆目錄
- **H2U-REFACTOR-0003**: 抽 browser-capture-core
- **H2U-REFACTOR-0004**: 隔離 Phase B 工具
- **H2U-REFACTOR-0005**: 整併 5 份 plan 文件
- **H2U-REFACTOR-0006**: rule-registry 補 fidelityThresholds + knownGaps + draftBuilderStageRules 自動驗證

### Plan5 95% 收斂主軸

- **PROG-2-0010**: gacha-ds3 formal rerun + 2 個非 gacha fixture（多畫面 baseline）
- **PROG-2-0011**: CSS coverage → UCUF slot trace（封閉 selectorTracePending）
- **PROG-2-0005**: acceptance 改寫為量化條目
- **PROG-2-0007**: 標題 + acceptance + depends 改寫

---

## 參考文件

- `docs/html_skill_plan.md` ~ `plan5.md`（5 份 plan 演進史）
- `docs/html_skill_rule-evolution2.md`（規則演進記錄）
- `tools_node/lib/html-to-ucuf/rule-registry.json`（current rule source of truth）
- `.github/skills/html-to-ucuf/SKILL.md`（skill 流程指引）
- `docs/tasks/tasks-prog.json`（任務卡狀態）
