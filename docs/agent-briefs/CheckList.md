<!-- doc_id: doc_ai_0022 -->
# Agent Briefs CheckList

## UI 量產新增檢查

- 新 UI 任務預設必須走：`template family -> content contract -> skin fragment -> smoke route -> docs backwrite`
- 開卡或接卡時，先對照 [UI-task-card-template.md](C:\Users\User\3KLife\docs\agent-briefs\UI-task-card-template.md (doc_task_0132)) (doc_task_0132)
- 若任務卡沒有 `template_family / content_contract / skin_fragments / smoke_route / docs_backwritten`，視為尚未收斂完成，不應直接進入大量實作

本表是任務卡總覽。狀態更新時，必須同步修改：
- 任務卡本身
- [ui-quality-todo.json](C:\Users\User\3KLife\docs\ui-quality-todo.json)
- 本檔

共通硬規則以 [keep.md](C:\Users\User\3KLife\docs\keep.md (doc_index_0011)) (doc_index_0011) 為準。

## 執行前檢查

1. 這次工作是否已有任務卡。
2. 若沒有，而且不是小錯字或一次性查詢，先開卡。
3. 若決定開始做，先鎖卡：`status=in-progress`、補 `started_at` / `started_by_agent`、更新 `notes`。
4. 若是 bug 修復，可以先做最小修補，但仍要保留可追蹤性與單一問題範圍。
5. 若範圍擴大，先更新 `related / depends / notes`，必要時補開新卡。
6. 準備 commit 前，確認這批變更能對回單一卡號、單一主題或單一 bug。

## UI 視覺介面系統

| 優先級 | 卡號 | 簡單描述 | 狀態 | 完成度% | 負責 Agent |
|---|---|---|---|---|---|
| P0 | [UI-1-0001](tasks/UI-1-0001.md (doc_task_0009)) (doc_task_0009) | 搬遷 `nav_ink` 按鈕 family 至 runtime 路徑 | done | 100% | Agent2 |
| P0 | [UI-1-0002](tasks/UI-1-0002.md (doc_task_0010)) (doc_task_0010) | 搬遷 `paper_utility` 按鈕 family 至 runtime 路徑 | done | 100% | Agent2 |
| P0 | [UI-1-0003](tasks/UI-1-0003.md (doc_task_0011)) (doc_task_0011) | 搬遷 `warning` 按鈕 family 至 runtime 路徑 | done | 100% | Agent2 |
| P0 | [UI-1-0004](tasks/UI-1-0004.md (doc_task_0012)) (doc_task_0012) | 產生共用 shadow 與 noise 紋理 | not-started | 0% | Agent2 |
| P0 | [UI-2-0001](tasks/UI-2-0001.md (doc_task_0025)) (doc_task_0025) | 更新 `lobby-main-default` skin 指向 `nav_ink` | done | 100% | Agent1 |
| P0 | [UI-2-0002](tasks/UI-2-0002.md (doc_task_0026)) (doc_task_0026) | 更新 `duel-challenge-default` skin 指向 `paper_utility` | done | 100% | Agent1 |
| P0 | [UI-2-0021](tasks/UI-2-0021.md (doc_task_0045)) (doc_task_0045) | 修復 PreviewInEditor 的 SpriteFrame 路徑解析 | done | 100% | Agent1 |
| P1 | [UI-2-0003](tasks/UI-2-0003.md (doc_task_0027)) (doc_task_0027) | 新增 parchment 系列 design token | done | 100% | Agent1 |
| P1 | [UI-2-0004](tasks/UI-2-0004.md (doc_task_0028)) (doc_task_0028) | 新增淺底專用 label-style 變體 | done | 100% | Agent1 |
| P1 | [UI-2-0006](tasks/UI-2-0006.md (doc_task_0030)) (doc_task_0030) | 驗證 shared button family 的 border 20px 規範 | done | 100% | Agent1 |
| P1 | [UI-2-0007](tasks/UI-2-0007.md (doc_task_0031)) (doc_task_0031) | 為多個 skin 補上 shadow slot 定義 | done | 100% | Agent1 |
| P1 | [UI-2-0008](tasks/UI-2-0008.md (doc_task_0032)) (doc_task_0032) | 建立 item-cell 標準 skin fragment | done | 0% | Agent1 |
| P1 | [UI-2-0009](tasks/UI-2-0009.md (doc_task_0033)) (doc_task_0033) | 建立 common-parchment skin fragment | done | 0% | Agent1 |
| P1 | [UI-2-0010](tasks/UI-2-0010.md (doc_task_0034)) (doc_task_0034) | 為 `UIPreviewBuilder` 加入 shadow layer 渲染 | done | 85% | Agent1 |
| P1 | [UI-2-0011](tasks/UI-2-0011.md (doc_task_0035)) (doc_task_0035) | 為 `UIPreviewBuilder` 加入 noise overlay | done | 100% | Agent1 |
| P1 | [UI-2-0012](tasks/UI-2-0012.md (doc_task_0036)) (doc_task_0036) | `duel.btn.accept` 對齊 `equipment.primary` | done | 100% | Agent1 |
| P1 | [UI-2-0013](tasks/UI-2-0013.md (doc_task_0037)) (doc_task_0037) | lobby / popup / duel 首批 skin 補 shadow slot | done | 100% | Agent1 |
| P1 | [UI-2-0014](tasks/UI-2-0014.md (doc_task_0038)) (doc_task_0038) | general / support / shop / gacha 群組補 shadow slot | done | 100% | Agent1 |
| P1 | [UI-2-0015](tasks/UI-2-0015.md (doc_task_0039)) (doc_task_0039) | battle / system 群組補 shadow slot | done | 100% | Agent1 |
| P1 | [UI-2-0016](tasks/UI-2-0016.md (doc_task_0040)) (doc_task_0040) | 補齊 popup / Layout / legacy shadow 覆蓋 | done | 60% | Agent1 |
| P1 | [UI-2-0017](tasks/UI-2-0017.md (doc_task_0041)) (doc_task_0041) | 修補 general-detail bleed slot 缺失 | done | 100% | Agent1 |
| P1 | [UI-2-0018](tasks/UI-2-0018.md (doc_task_0042)) (doc_task_0042) | 補上 screen-driven preview harness | done | 100% | Agent1 |
| P1 | [UI-2-0019](tasks/UI-2-0019.md (doc_task_0043)) (doc_task_0043) | 對齊 D-2 QA 目標與 target family | done | 100% | Agent1 |
| P1 | [UI-2-0020](tasks/UI-2-0020.md (doc_task_0044)) (doc_task_0044) | 補上 shared light-surface carrier | done | 0% | Agent1 |
| P1 | [UI-2-0022](tasks/UI-2-0022.md (doc_task_0046)) (doc_task_0046) | `general-list` 升級正式九宮格皮膚 | done | 100% | Agent1 |
| P1 | [UI-2-0023](tasks/UI-2-0023.md (doc_task_0047)) (doc_task_0047) | 完成 headless preview screenshot 流程 | done | 100% | Agent1 |
| P1 | [UI-2-0024](tasks/UI-2-0024.md (doc_task_0048)) (doc_task_0048) | 拆分 `UIPreviewBuilder.ts` 降低風險 | completed | 100% | Agent1 |
| P1 | [UI-2-0025](tasks/UI-2-0025.md (doc_task_0049)) (doc_task_0049) | 對齊 `Gacha` preview contract | done | 100% | Agent1 |
| P1 | [UI-1-0005](tasks/UI-1-0005.md (doc_task_0013)) (doc_task_0013) | 產生水平 Tab active/inactive sprites | done | 100% | Agent2 |
| P1 | [UI-1-0006](tasks/UI-1-0006.md (doc_task_0014)) (doc_task_0014) | 產生 bleed overlay sprites | done | 100% | Agent2 |
| P1 | [UI-1-0007](tasks/UI-1-0007.md (doc_task_0015)) (doc_task_0015) | 產生 dark_metal frame/fill/bg sprites | done | 100% | Agent2 |
| P1 | [UI-1-0008](tasks/UI-1-0008.md (doc_task_0016)) (doc_task_0016) | 產生 circle_icon sprites | done | 100% | Agent2 |
| P1 | [UI-1-0010](tasks/UI-1-0010.md (doc_task_0018)) (doc_task_0018) | 產生 badge sprites | done | 100% | Agent2 |
| P1 | [UI-1-0011](tasks/UI-1-0011.md (doc_task_0019)) (doc_task_0019) | 產生 gold_cta frame/fill/bg sprites | done | 100% | Agent2 |
| P1 | [UI-1-0012](tasks/UI-1-0012.md (doc_task_0020)) (doc_task_0020) | 建立 `validate-skin-contracts.js` | done | 100% | Agent2 |
| P1 | [UI-1-0013](tasks/UI-1-0013.md (doc_task_0021)) (doc_task_0021) | 建立 frame sprite 金色邊緣掃描 | done | 100% | Agent2 |
| P1 | [UI-1-0014](tasks/UI-1-0014.md (doc_task_0022)) (doc_task_0022) | `LobbyMain` 正式截圖與 notes 回填 | done | 100% | Agent2 |
| P1 | [UI-1-0015](tasks/UI-1-0015.md (doc_task_0023)) (doc_task_0023) | `ShopMain/Gacha` 正式比較與 notes 回填 | done | 100% | Agent2 |
| P1 | [UI-1-0016](tasks/UI-1-0016.md (doc_task_0024)) (doc_task_0024) | `DuelChallenge` mixed-family QA | done | 100% | Agent2 |
| P2 | [UI-2-0005](tasks/UI-2-0005.md (doc_task_0029)) (doc_task_0029) | button-skin 新增 selected 第四態 | done | 100% | Agent1 |
| P2 | [UI-1-0009](tasks/UI-1-0009.md (doc_task_0017)) (doc_task_0017) | 產生 diamond_tab sprites | done | 100% | Agent2 |

## HTML-to-UCUF Plan5 Tooling

| 優先級 | 卡號 | 簡單描述 | 狀態 | 完成度% | 負責 Agent |
|---|---|---|---|---|---|
| P0 | [PROG-2-0001](tasks/PROG-2-0001.md (doc_task_0177)) (doc_task_0177) | 建立 Plan5、任務卡與 shard bootstrap | done | 100% | GitHubCopilot |
| P0 | [PROG-2-0002](tasks/PROG-2-0002.md (doc_task_0178)) (doc_task_0178) | HTML-to-UCUF 舊規則與衝突流程審計 | done | 100% | GitHubCopilot |
| P0 | [PROG-2-0003](tasks/PROG-2-0003.md (doc_task_0179)) (doc_task_0179) | final gate 低分診斷與 nextFixes 契約 | done | 100% | GitHubCopilot |
| P0 | [PROG-2-0004](tasks/PROG-2-0004.md (doc_task_0180)) (doc_task_0180) | CSS semantics extraction parity | done | 100% | GitHubCopilot |
| P0 | [PROG-2-0005](tasks/PROG-2-0005.md (doc_task_0181)) (doc_task_0181) | UCUF runtime renderer parity closure | in-progress | 40% | GitHubCopilot |
| P1 | [PROG-2-0006](tasks/PROG-2-0006.md (doc_task_0182)) (doc_task_0182) | source-derived spec authority hardening | done | 100% | GitHubCopilot |
| P1 | [PROG-2-0007](tasks/PROG-2-0007.md (doc_task_0183)) (doc_task_0183) | 95% pixel fidelity regression matrix | open | 0% | GitHubCopilot |
| P1 | [PROG-2-0008](tasks/PROG-2-0008.md (doc_task_0184)) (doc_task_0184) | html-to-ucuf skill Plan5 workflow rewrite | done | 100% | GitHubCopilot |

## Harness Engineering Rollout

| 優先級 | 卡號 | 簡單描述 | 狀態 | 完成度% | 負責 Agent |
|---|---|---|---|---|---|
| P0 | [HARN-ART-0001](tasks/HARN-ART-0001.md) | 建立 Turn Artifact Schema 與版本契約 | done | 100% | GitHubCopilot |
| P0 | [HARN-ART-0002](tasks/HARN-ART-0002.md) | 建立 Turn Artifact Validator CLI | done | 100% | GitHubCopilot |
| P1 | [HARN-ART-0003](tasks/HARN-ART-0003.md) | 建立 Turn Artifact Storage Policy | done | 100% | GitHubCopilot |
| P1 | [HARN-ART-0004](tasks/HARN-ART-0004.md) | 讓 Finalize 使用標準 Artifact 預設路徑 | done | 100% | GitHubCopilot |
| P0 | [HARN-HDO-0001](tasks/HARN-HDO-0001.md) | 建立 Handoff Diff Validator Core | done | 100% | GitHubCopilot |
| P0 | [HARN-HDO-0002](tasks/HARN-HDO-0002.md) | 建立 Handoff Diff Validator Fixtures | done | 100% | GitHubCopilot |
| P1 | [HARN-HDO-0003](tasks/HARN-HDO-0003.md) | 將 Handoff Diff Validator 接入 Finalize | done | 100% | GitHubCopilot |
| P1 | [HARN-HDO-0004](tasks/HARN-HDO-0004.md) | 將 Task Lock Scope 納入 Handoff Validator | done | 100% | GitHubCopilot |
| P1 | [HARN-TRC-0001](tasks/HARN-TRC-0001.md) | 定義 Execution Trace Event Schema | open | 0% | GitHubCopilot |
| P1 | [HARN-TRC-0002](tasks/HARN-TRC-0002.md) | 建立 Node Tool Trace Middleware | open | 0% | GitHubCopilot |
| P1 | [HARN-TRC-0003](tasks/HARN-TRC-0003.md) | 建立 Execution Trace Collector | open | 0% | GitHubCopilot |
| P2 | [HARN-TRC-0004](tasks/HARN-TRC-0004.md) | 將 Trace Summary 掛入 Finalize 輸出 | open | 0% | GitHubCopilot |
| P1 | [HARN-EVAL-0001](tasks/HARN-EVAL-0001.md) | 建立 Workflow Path Taxonomy | open | 0% | GitHubCopilot |
| P2 | [HARN-EVAL-0002](tasks/HARN-EVAL-0002.md) | 建立 Workflow Baseline Fixture Pack | open | 0% | GitHubCopilot |
| P2 | [HARN-EVAL-0003](tasks/HARN-EVAL-0003.md) | 建立 Path Drift Comparator | open | 0% | GitHubCopilot |
| P1 | [HARN-MET-0001](tasks/HARN-MET-0001.md) | 建立 Turn Artifact History Query | open | 0% | GitHubCopilot |
| P2 | [HARN-MET-0002](tasks/HARN-MET-0002.md) | 建立 Harness Metrics Accumulator | open | 0% | GitHubCopilot |
| P2 | [HARN-MET-0003](tasks/HARN-MET-0003.md) | 擴充 Harness Health Report | open | 0% | GitHubCopilot |
| P1 | [HARN-GOV-0001](tasks/HARN-GOV-0001.md) | 建立 Harness Capability Boundary Matrix | open | 0% | GitHubCopilot |
| P1 | [HARN-GOV-0002](tasks/HARN-GOV-0002.md) | 更新 Agent Collaboration 強制規則入口 | open | 0% | GitHubCopilot |
| P2 | [HARN-GOV-0003](tasks/HARN-GOV-0003.md) | 更新 Task Card Template 的 Harness 欄位 | done | 100% | GitHubCopilot |
| P0 | [HARN-PILOT-0001](tasks/HARN-PILOT-0001.md) | 執行 Doc-only Pilot | open | 0% | GitHubCopilot |
| P1 | [HARN-PILOT-0002](tasks/HARN-PILOT-0002.md) | 執行 Tooling-code Pilot | open | 0% | GitHubCopilot |
| P2 | [HARN-PILOT-0003](tasks/HARN-PILOT-0003.md) | 執行 UI-QA Pilot | open | 0% | GitHubCopilot |

### HARN 審核摘要（2026-05-04）

- 全 HARN 任務卡盤點：34 張；done 19 張、open 15 張、in-progress 0 張。
- 34 張 HARN 任務卡皆已回寫 `## 審核結果（2026-05-04）`，內容包含審核結論、驗證證據與需修改事項。
- 已達成鏈：`HARN-ARCH-*`、`HARN-LOG-*`、`HARN-FIX-0001`、`HARN-UI-0001`、`HARN-GOV-0003`、`HARN-ART-0001/0002/0003/0004`、`HARN-DEMO-0003`、`HARN-HDO-0001/0002/0003/0004`。
- 未達成主鏈：`HARN-TRC-*`、`HARN-EVAL-*`、`HARN-MET-*`、`HARN-GOV-0001/0002`、`HARN-PILOT-*` 仍為 open；artifact schema、validator CLI、storage policy helper、finalize default path 與 handoff task scope check 已落地，後續鏈可開始重用這條 gate。
- 下一個應優先落地的根卡：`HARN-TRC-0001`；HDO chain 已完成，下一步可定義 execution trace event schema。

## 依賴維護原則

- 依賴的單一真相仍是 [ui-quality-todo.json](C:\Users\User\3KLife\docs\ui-quality-todo.json) 與各任務卡。
- 本檔只保留總覽，不再複製過長的依賴敘事。
- 若新增 blocker 或前後置關係，請同步更新任務卡與 manifest。

## 更新流程

1. 更新任務卡 frontmatter 與 notes。
2. 更新 [ui-quality-todo.json](C:\Users\User\3KLife\docs\ui-quality-todo.json)。
3. 更新本表狀態。
4. 若要正式 commit，確認 commit message 已帶任務卡號與 Agent 標籤。
5. 若是 bug commit，確認 message 也寫了系統代碼、問題描述與修改描述。

## 鎖卡最小欄位

- `status: in-progress`
- `started_at: <RFC3339>`
- `started_by_agent: AgentX`
- `notes` 第一筆寫開始時間、目前處理範圍與是否有 blocker
