# Captain Handoff - Team Agents Runtime / Integration Continuation

Created: 2026-06-19  
Owner: ATM Captain  
Target repo: `C:\Users\User\AI-Atomic-Framework`  
Planning repo: `C:\Users\User\3KLife`  
Status: active continuation, ready for next Captain thread

## 給下一位隊長的用途

這份文件是給新的對話群、下一位 Captain 一進場就讀的交接入口。

不要假設任何先前聊天歷史。只根據：

1. 本機 workspace 現況
2. 這份 handoff
3. 這裡列出的規劃與 task docs

來重新建立 Team Agents 的上下文與下一步。

## 新對話開場 Prompt

把下面整段貼到新的空白對話：

```text
你是新的 ATM Captain continuation thread。

Planning repo: C:\Users\User\3KLife
Target repo: C:\Users\User\AI-Atomic-Framework

不要假設任何先前聊天歷史。只根據本機 workspace 狀態與交接文件接手。
請使用繁體中文，維持 Captain 模式，但不要空泛角色扮演。

先讀：
1. C:\Users\User\3KLife\docs\keep.summary.md
2. C:\Users\User\AI-Atomic-Framework\README.md
3. C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\TEAM_AGENTS_CAPTAIN_LED_SOP.md
4. C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\tasks\README.md
5. C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\ATM 多廠商 Agent Runtime 與 Integration 藍圖.md
6. C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\blueprints\team-agent-runtime-contract.draft.ts
7. C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\CAPTAIN-HANDOFF-2026-06-19-TEAM-AGENTS-RUNTIME-INTEGRATION-CONTINUATION.md

然後在 C:\Users\User\AI-Atomic-Framework 執行：
node atm.mjs next --prompt "Continue Team Agents multi-vendor runtime integration lane TASK-TEAM-0037 to TASK-TEAM-0045" --json

如果 ATM 回傳 prompt-guidance-required 或 task-scope-not-found，不要硬套錯的 lifecycle；先回報你讀到的真相，再決定是做 planning/import prep 還是開始 target repo implementation。

第一個回報請包含：
- 你讀到的 Team Agents 現況摘要
- AI-Atomic-Framework 與 3KLife 的 dirty 狀態
- 0037..0045 哪些是 planning-only、哪些已經真正進 source
- 你要先做的第一個動作
```

## Dispatch Compliance

- Skill used: `atm-dispatch`
- Delegation mode for this handoff: `internal sidecar / broker-governed local verification`
- Internal sidecar 是預設，只用於 read-only review、grep、preflight、checklist、post-report verification。
- 外部 dispatch 只有在使用者明確授權寫入範圍時才可開。
- 不要把 ATM 稱作 AAF；ATM 是產品 / framework / CLI / governance workflow，AI-Atomic-Framework 只是 repo 名稱。

## 現在的真相

### 1. Team Agents 已經做到哪裡

截至 2026-06-19，Team Agents 有兩條要分開看：

- 已落地到 framework repo 並已關閉的 runtime extension lane：
  - `TASK-TEAM-0031` 到 `TASK-TEAM-0036`
- 新開的 multi-vendor runtime / integration lane：
  - `TASK-TEAM-0037` 到 `TASK-TEAM-0045`
  - 目前仍是 `3KLife` 規劃態，尚未在 framework repo 完成 import + source close

`tasks/README.md` 的 ledger truth note 已明確寫出：

- `0031..0036` 不再是 planning-only
- `0037..0045` 目前仍是 planning-only，直到 implementation cards 被 imported 並在 framework repo 關閉

### 2. framework source 現況

`C:\Users\User\AI-Atomic-Framework` 目前已存在的 Team runtime 基礎，重點只有這些：

- `packages/core/src/team-runtime/nodejs-worker-adapter.ts`
  - 已有 vendor-neutral 的 worker adapter contract 雛型
  - 支援 `real-agent | editor-subagent | broker-only`
  - 明確保留 coordinator 擁有 `git.write / task.lifecycle / evidence.write`
- `packages/cli/src/commands/team.ts`
  - 已有 runtime mode、providerId、sdkId、modelId 等 metadata surface
  - 但目前仍屬於「metadata advisory」層
  - 原始碼內已明講：`real-agent selected; adapter metadata is advisory until a worker bridge consumes it`
- `scripts/validate-team-agents.ts`
  - 已有 `real-agent / editor-subagent / broker-only` 與 node reference adapter 的驗證案例

換句話說：

- Team Agents **已經有 runtime mode contract**
- 但 **還沒有真正的多廠商 provider contract / provider registry / orchestration kernel / vendor bridges**
- 所以現在還不能說「Team Agents 已經完整啟動 OpenAI / Azure OpenAI / Claude Code / Gemini / Foundry 的 SDK Agent」

### 3. 0037..0045 規劃產物已完成

本輪已在 `3KLife` 落成以下 artifacts：

- 藍圖文件  
  `C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\ATM 多廠商 Agent Runtime 與 Integration 藍圖.md`
- TypeScript 介面初稿  
  `C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\blueprints\team-agent-runtime-contract.draft.ts`
- 任務卡  
  `TASK-TEAM-0037` 到 `TASK-TEAM-0045`
- Team roster / shard
  - `docs/ai_atomic_framework/team-agents/tasks/README.md`
  - `docs/tasks/tasks-team.json`
  - `docs/tasks/tasks-team/tasks-team-part-1.json`

這批規劃已通過：

- `npm.cmd run check:encoding:touched -- --files ...`
- `node tools_node/shard-manager.js validate docs/tasks/tasks-team`
- `git diff --check`

只有一個警告仍存在：

- `docs/tasks/tasks-team/tasks-team-part-1.json` 行數 768，大於 600，屬 `WARN` 非 `FAIL`

## 兩個 repo 的 dirty 狀態

### AI-Atomic-Framework

目前 dirty 很重，而且不只 Team Agents。

可見範圍包括：

- `.atm/history/**` 有多個 AAO / CID / MAO / TEAM residue
- `release/atm-root-drop/**` 有大量變更
- `scripts/*.ps1` 有新增

Captain 規則：

- 不要把這些一口氣 sweep 掉
- 不要因為要做 Team Agents 就順手清 release outputs 或別人的 AAO / CID / MAO 現場
- 如果要做 `0037..0045` source 實作，務必把 scope 收窄在 Team runtime 相關檔案

### 3KLife

目前 dirty 包含：

- Team Agents 舊卡與 roster 調整
- 新增 `0037..0045` task cards
- 新增 multi-vendor 藍圖與 TS 初稿
- 另有 AAO / paper lane 變更，不屬於這次 handoff 核心

Captain 規則：

- 不要回頭清掉別人正在處理的 3KLife dirty 檔
- handoff / planning / shard 修正可以做，但不要把 unrelated AAO / paper lane 混進來

## 新 lane 的設計原則

這條 0037..0045 lane 的核心設計原則已固定，不要重談舊結論：

1. 一定要有 vendor-neutral interface 層  
   不能讓 OpenAI / Azure / Claude / Gemini / Foundry 各走各的 runtime shape。

2. Agent 權限一定受治理，但不能和 vendor SDK 耦合  
   權限面應由 Team permission broker / lease / steward lane 決定，不由 vendor bridge 自己決定。

3. vendor 設定放 adopter repo，不放 ATM framework repo  
   framework 只擁有 contract、schema、discovery、verify；不擁有每個 adopter 的 endpoint / deployment / secrets。

4. 一定要有跨廠商、跨功能的 observability 事件格式  
   讓 Team runtime 能查 task / run / role / provider / sdk / model / artifact / error。

5. provider 選擇要可指定特定廠商，也要有預設值  
   repo default、role override、run override 要能共存。

6. Microsoft Foundry 要被當成 provider family  
   不能被錯誤簡化成「另一個 OpenAI endpoint」。

## 短中長期計畫

### 短期計畫

時間尺度：下一個工作日到 2 次 Captain 交接內

目標：

- 讓 0037..0045 從 planning-ready 進入 implementation-ready
- 把 framework 端第一層 shared contracts 真的落地

建議順序：

1. 先確認 `0037..0045` 的 planning docs 與 roster truth 沒漂移
2. 視需要把 `tasks-team-part-1.json` 做 `auto-split`
3. 在 `AI-Atomic-Framework` 開始 `TASK-TEAM-0037`
4. 緊接 `TASK-TEAM-0038`
5. 再做 `TASK-TEAM-0040`

短期 deliverables 應該長這樣：

- `packages/core/src/team-runtime/provider-contract.ts`
- `packages/core/src/team-runtime/provider-registry.ts`
- `packages/core/src/team-runtime/execution-orchestrator.ts`
- `packages/core/src/team-runtime/permission-broker.ts`
- `packages/core/src/team-runtime/observability.ts`
- `schemas/governance/team-agent-*.schema.json`
- `scripts/validate-team-agents.ts` 新增對應 case

短期完成判斷：

- framework source 不再只有 nodejs reference adapter
- 已能用 shared contract 表達 provider / session / step / artifact / permission / observability
- 但仍不必急著先把所有 vendor bridge 一次做完

### 中期計畫

時間尺度：本週到下一輪 major lane 完成

目標：

- 把 provider selection + adopter config + 第一批 vendor bridges 接上

建議順序：

1. `TASK-TEAM-0039` governed-repo vendor integration config surface
2. `TASK-TEAM-0041` provider selection defaults and role overrides
3. `TASK-TEAM-0042` OpenAI and Azure OpenAI runtime bridges
4. `TASK-TEAM-0044` Microsoft Foundry provider family bridge
5. `TASK-TEAM-0043` Claude Code and Gemini execution bridges

中期完成判斷：

- OpenAI / Azure OpenAI 可透過 shared provider contract 啟動實際 run
- Foundry 能分辨 `chat/inference` 與 `agent-service`
- Claude Code / Gemini 雖可能經不同 surface 進來，但對 Team runtime 看起來一致
- adopter repo 可以透過 config surface 指定預設 provider 與 role override

### 長期計畫

時間尺度：integration-ready 到 adopter-ready

目標：

- 讓 Team Agents 真正變成可採用、可驗證、可觀測、可治理的多廠商執行面

主要工作：

1. `TASK-TEAM-0045` integration capability manifest and verification wiring
2. 把 `atm integration verify` / `atm doctor` / `team start` 接上 capability discovery
3. 建立跨廠商 regression / fixture matrix
4. 再回頭補強 `TASK-TEAM-0018` 與 `TASK-TEAM-0019`
   - concurrency hardening
   - sandbox attestation
5. 視採用情況再接 knowledge track：
   - `0020`
   - `0025`
   - `0021`
   - `0023`
   - `0022`
   - `0024`

長期完成判斷：

- Team Agents 可以在 integration 中真正啟動至少一家的 SDK Agent
- 同一套 Team runtime contract 可支援多 vendor 與多 execution surface
- governance boundary、observability、doctor/verify 都可用

## 建議的正式 rollout 順序

這條 lane 請沿用已寫進 roster 的順序，不要改：

`TASK-TEAM-0037`  
-> `TASK-TEAM-0038`  
-> `TASK-TEAM-0040`  
-> `TASK-TEAM-0039`  
-> `TASK-TEAM-0041`  
-> `TASK-TEAM-0042` / `TASK-TEAM-0044` / `TASK-TEAM-0043`  
-> `TASK-TEAM-0045`

背後理由：

- 先有 shared contract
- 再有 permission / observability
- 再有 adopter config / provider policy
- 最後才接 vendor bridges 與 verify wiring

## 下一位隊長第一輪建議動作

先做 read-only reality check：

```powershell
cd C:\Users\User\AI-Atomic-Framework
git status --short
rg -n "providerId|sdkId|real-agent|editor-subagent|broker-only|advisory until a worker bridge consumes it" packages/cli/src/commands/team.ts scripts/validate-team-agents.ts
rg --files packages/core/src/team-runtime packages/cli/src/commands scripts atomic_workbench/atomization-coverage | rg "team-runtime|team\.ts$|validate-team-agents|path-to-atom-map"
```

然後再決定走哪條：

1. 如果要先穩 planning 面：  
   修 `tasks-team` shard warning，確認 0037..0045 planning truth 固定

2. 如果要直接進 framework implementation：  
   從 `TASK-TEAM-0037` 開始，不要跳過 contract 直接寫 vendor bridge

3. 如果使用者要求先驗證某家 vendor 可測：  
   先做 config/discovery/permission proof，不要在沒有 shared provider contract 前塞 vendor-specific 臨時碼

## 已知限制與風險

1. `0037..0045` 還沒真正 imported / closed 到 framework ledger  
   所以現在不能宣稱 lane 已實作完成。

2. framework repo dirty 很重  
   很容易把別條 lane residue 誤帶進來。

3. vendor credentials 尚未在本機被 Captain 實證  
   目前只有官方 free-tier / billing 路線的規劃確認，沒有本地 end-to-end prove。

4. Microsoft Foundry 不能被錯看成單一路徑  
   要保留 chat/inference 與 hosted agent reference 的雙態。

5. Claude Code 與 Gemini 不應被假設為同 surface  
   一個偏 editor bridge，一個可能 direct 或 editor/CLI hybrid。

## 不要做的事

- 不要把 0037..0045 當成已在 framework 完成
- 不要略過 0037/0038/0040 直接寫 vendor bridge
- 不要把 adopter repo vendor secrets 或 deployment names 寫進 ATM framework repo
- 不要讓 worker 拿到 `git.write`、`task.lifecycle`、`self-close`
- 不要順手清掉 AI-Atomic-Framework 或 3KLife 既有 dirty worktree
- 不要用 `atm.dev.mjs` 迴避 frozen runner 問題
- 不要新增第二套 registry / task store / authority document

## 下一位隊長的第一段回報建議

建議下一位 Captain 先這樣回：

```text
我已讀 Team Agents handoff、roster、multi-vendor blueprint 與 TS contract 初稿。現在的真相是：framework 端已有 runtime mode / adapter metadata 與 nodejs reference worker adapter，但 0037..0045 的多廠商 provider contract 與 vendor bridges 還沒有真正落到 source。接下來我先回報 AI-Atomic-Framework / 3KLife 的 dirty 狀態，然後決定先固定 planning truth，還是直接從 TASK-TEAM-0037 開始實作 shared provider contract。
```

## 交接文件的核心判斷

這次 handoff 最重要的結論只有一句：

**Team Agents 已有多 runtime mode 的治理骨架，但還沒有真正完成多廠商 SDK Agent runtime；0037..0045 是現在最該往前推的主線。**
