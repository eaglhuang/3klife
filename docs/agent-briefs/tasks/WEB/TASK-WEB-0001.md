---
doc_id: doc_task_0392
id: TASK-WEB-0001
priority: P2
phase: external-comms
created: 2026-05-25
created_by_agent: claude-code-opus-4-7
owner: claude-code-opus-4-7
status: done
started_at: 2026-05-25T00:53:47Z
started_by_agent: claude-code-opus-4-7
completed_at: 2026-05-25T01:15:00Z
completed_by_agent: claude-code-opus-4-7
type: web-demo
related_cards: []
depends: []
runtime_scope:
  - temp_workspace/AI-learning-notes/demo/atm-petri-dish
smoke_route: "browser open demo/atm-petri-dish/index.html -> tutorial 4 steps -> sandbox 30s"
verification_commands:
  - node tools_node/compute-gate.js --profile standard --agent-feedback
  - python -m http.server 8000 --directory temp_workspace/AI-learning-notes
docs_backwritten:
  - docs/ai_atomic_framework/原子行為參考手冊.md (doc_other_0045)
notes: "完工 2026-05-25。MVP 互動 web demo，~1100 行 standalone HTML+inline JS+Canvas 2D，落於 temp_workspace/AI-learning-notes/demo/atm-petri-dish/（注：該目錄是另一個獨立 GitHub Pages repo，已在該 repo commit a37497b 落地）。Layer 3 治理：12 顆細胞使用 atomic_workbench/capsules/ 真實 H2U manifest，bake 成 data/*.json。首頁 index.html 加 1 張 signal-item 卡連到新 demo（grid 由 4 欄改 5 欄）。compute-gate post-flight：MY 檔案均已 lock 覆蓋；剩餘 uncovered 為其他 agent 的 pre-existing dirty state（PROG-2-0012~0017 等），不是本卡 regression。"
---

# [TASK-WEB-0001] ATM Petri 培養皿互動 web demo

## 背景

`原子行為參考手冊.md`（doc_other_0045）剛同步到最新代碼，含 12 種行為、4 層治理、8 條 demand-police 規則，但文字密度高、初次讀的人不容易感受到原子在 ATM 世界中如何彼此互動演進。

本任務在現有 `temp_workspace/AI-learning-notes/`（GitHub Pages 純靜態網站）下新增 1 個獨立子目錄，做成活潑誇張、可互動、有動態效果的 MVP 小遊戲，把代碼當培養皿、capsule 當細胞、anchor 當細胞膜、demand-police 當白血球、行為當生物事件。完整提案見 `C:\Users\User\.claude\plans\md-web-game-jazzy-rossum.md`。

## 範圍

- 1 個 Tutorial 關卡（4 個 step，~3 分鐘走完）
- 1 個 Sandbox 自由模式
- 至少 7 種 behavior 動畫（split / dedup-merge / polymorphize / evolve / sweep / anchorize / promote）
- bake 真實 ATM artifacts 作為遊戲資料

## 邊界

- ✅ 落在 `temp_workspace/AI-learning-notes/demo/atm-petri-dish/`
- ✅ 唯一動到網站既有檔案的修改：`temp_workspace/AI-learning-notes/index.html` 加 1 個 `<a class="signal-item">` 連結卡
- ❌ 不對 demo 自身執行 `atm-atomize`（capsule pipeline 對 inline HTML JS overkill；follow-up 開 TASK-WEB-0002 stub）
- ❌ 不引入任何 build step / 外部 npm 依賴（保持與 liu-bei demo 一致的純靜態）

## 實作清單

- [ ] **Layer 3 — bake snapshot 資料**
  - [ ] 跑 `node tools_node/atm-atomize.js demand-police --json` 並另存
  - [ ] 從 `atomic_workbench/capsules/{parse-color,normalize-css-color-to-hex,build-draft-from-html,collect-behavior,merge-computed-style,...}/capsule.manifest.json` 拉精簡欄位整合
  - [ ] 從 `atomic_workbench/anchors/draft-builder-core-82992a5f/anchor.manifest.json` 拉精簡欄位
  - [ ] 三份 snapshot 都加 `_meta` header
  - [ ] 落地：`demo/atm-petri-dish/data/{capsules,anchors,demand-police}.snapshot.json`

- [ ] **新增 index.html**（單檔 inline css+js，~800-1000 行）
  - [ ] 重用首頁設計 token（jade/cinnabar/gold/paper/ink）
  - [ ] 重用首頁 keyframes（`blobMorph`、`nucMove`、`cellA/cellB/bridgePulse`、`pulseDot`、`pageEnter`）
  - [ ] Canvas 2D 渲染細胞 / 膜 / police / 粒子
  - [ ] DOM 渲染右側 finding 面板 / 底部 behavior dock / 頂部健康指數
  - [ ] Tutorial 4 step 流程：orphan-capsule / duplicate-fingerprint / family-promotion-threshold / promote
  - [ ] Sandbox 每 8 秒隨機 finding，從 8 種規則中抽
  - [ ] 錯誤 behavior 跳教學氣泡

- [ ] **新增 README.md**
  - [ ] 玩法說明、設計理念、回連 原子行為參考手冊.md (doc_other_0045)
  - [ ] 本機跑法（`python -m http.server`）
  - [ ] snapshot 資料重生指令

- [ ] **動首頁** `temp_workspace/AI-learning-notes/index.html`
  - [ ] 在 Interactive Demo focus-strip 的 `.signal-row` 加 1 個 `<a class="signal-item signal-item-link">`
  - [ ] 視 mobile 縮排決定是否把 `repeat(4, 1fr)` 改成 `repeat(5, 1fr)` 或拆 2 行

## 驗收條件

### 功能驗收

- [ ] Tutorial 4 step 全程可玩，每個 behavior 動畫都要播
- [ ] Sandbox 跑 30 秒能看到至少 2 個隨機 finding
- [ ] 錯誤 behavior 觸發教學氣泡 + 健康度 -1
- [ ] 全對拿 3 star

### 治理驗收

- [ ] `node tools_node/compute-gate.js --profile standard --agent-feedback` 通過
- [ ] 所有新增的 `.html / .json / .md` 跑 encoding-touched-guard 通過（no BOM / no U+FFFD / no mojibake）
- [ ] `git diff` 確認除新增檔案 + 首頁加的 1 個 `signal-item` 外無其他變動
- [ ] browser console 乾淨（除 snapshot meta info log）

### 收尾

- [ ] `node tools_node/task-lock.js unlock TASK-WEB-0001 claude-code-opus-4-7`
- [ ] 任務卡 frontmatter `status: done` + 補 notes
- [ ] commit 並推送（或交給用戶決定 push timing）

## Follow-up（不在本卡範圍）

- `TASK-WEB-0002`：把 inline JS 抽出到 `petri.js`、納入 `atm-atomize` includeGlobs（capsule pipeline 自我托管）
- `TASK-WEB-0003`：加 `?live=1` 模式，fetch 同 repo 即時 registry
- `TASK-WEB-0004`：擴增 8-10 關教學模式
- `TASK-WEB-0005`：vs AI 對戰模式
