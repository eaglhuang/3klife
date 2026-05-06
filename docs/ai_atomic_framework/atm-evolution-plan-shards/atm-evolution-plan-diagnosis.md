# ATM 框架演進執行規劃書 — 機讀真相與提案診斷（§1–§3）

> 這是 `ATM框架演進執行規劃書.md` 的「機讀真相與提案診斷（§1–§3）」分片。完整索引見 `docs/ai_atomic_framework/ATM框架演進執行規劃書.md`。

<!-- doc_id: doc_other_0043 -->
# ATM 框架演進執行規劃書

> 產出日期：2026-05-06  
> 對照來源：`關於進化版的原子提案.md`、`AI原子框架開發計畫書.md`、`docs/tasks/tasks-atm.json` thin index 與 `docs/tasks/tasks-atm/tasks-atm-part-*.json`。  
> 原則：已標記 `done` 的任務卡不得重開或改寫，只能作為下游基礎；新增能力一律以 open 任務補充或新卡承接。

---

## 1. 當前機讀真相與文件不一致

`docs/tasks/tasks-atm.json` 目前 summary 為 `done=32 / open=55 / in_progress=0 / total=87`。本輪已完成 v2 規劃落地：`ATM-0-0002` 已同步為 `done`，附錄 A 新增 11 張演化任務卡，附錄 B 新增 4 張 Atomic Map 任務卡。因此，提案與主計畫中仍提到「71 張任務卡」、「ATM-2-0004 in-progress」、「ATM-2 僅 3 done + 1 in-progress」或「v1 基準 72 張」的段落皆視為歷史基準。

| 項目 | 提案 / 主計畫舊敘述 | 機讀真相 | 處置 |
|---|---|---|---|
| 任務總數 | 71 張 / v1 機讀 72 張 | 87 張 | 後續文件應改以 thin index summary 為準；本輪新增 15 張 open 卡。 |
| ATM-2-0004 | in-progress，可自然延伸 versions[] / rollback | `done`，commit `7da6730` | 不可改卡；版本歷史與 rollback 改開 follow-up。 |
| ATM-2-0013 | 未被提案納入核心排序 | `done` | 視為 canonical per-atom folder 基礎：預設 home = `atomic_workbench/atoms/<Atomic ID>/`，資料夾名稱必須等於 Atomic ID，本輪後續文件一律沿用此規則。 |
| in-progress 任務 | 提案列 1 張 | 0 張 | 本輪規劃只校正 `open` 任務與新增卡。 |

---

## 2. 需修正的提案不合理處

### 2.1 「演化管線不需新工具」表述過度簡化

提案主張誕生管線與演化管線共享同一組工具，方向正確，但不應推論為「只在現有工具加版本比較即可」。演化模式至少多出四個不可混入誕生模式的狀態：

1. 舊版本 fixture / hash / evidence 的不可變基線。
2. 新舊品質指標的可比較 schema。
3. upgrade proposal 與 human review queue 的審核狀態。
4. rollback target、rollback proof 與 registry current pointer 的一致性。

修正建議：共享 `ParseSpec / RunTest / Validate / ComputeHash / UpdateRegistry / Regression` 等核心原子，但必須在 SDK 層明確加入 `lifecycleMode = birth | evolution`，並把版本歷史、品質比較、審核佇列、rollback 拆成 follow-up 任務。

### 2.2 把 versions[] / rollback 塞回 ATM-2-0004 已不合法

ATM-2-0004 已完成，且交付範圍是 JSON-first registry + spec/code/test hash lock MVP。提案第 III / IV 部分把 `versions[]`、rollback、hash diff report 視為 ATM-2-0004 的自然延伸，違反「不變動已完成任務」原則。

修正建議：以 `ATM-2-0014` 起的新卡承接 registry version history、hash diff report、rollback pointer。

### 2.3 alpha0 / alpha1 邊界被演化需求稀釋

主計畫已定義 alpha0 只證明空白 repo 可跑 hello-world atom 與最小治理證據；完整 Default Governance Bundle 與演化閉環屬 alpha1。提案若把 quality comparison、human review、usage feedback 全部壓進 alpha0，會讓 alpha0 critical path 膨脹。

修正建議：alpha0 只保留 deterministic hash-lock / police / self-host gate；演化專用能力分批進 alpha1。

### 2.4 000003 / 000004 未開卡，卻被列入核心 000001-000010 流程

目前已完成 `000001 ParseAtomicSpec`、`000002 GenerateAtomicScaffold`、`000005 RunAtomicTest`、`000007 ComputeAtomicHash`、`000008 UpdateAtomicRegistry`。但 `000003 BuildAgentPrompt` 與 `000004 ExecuteAgentTask` 無直接任務卡；若不補卡，後續 Adapter 只能手工串接，無法證明「AI 受控加工」生命週期完整。

修正建議：新增 BuildAgentPrompt 與 ExecuteAgentTask 任務，且 ExecuteAgentTask 必須是 effect node / dry-run first，不得直接修改 host project。

---

## 3. 現有 open 任務校正建議

以下只提出修改建議，不改動已完成任務卡。

| 任務卡 | 現況 | 校正建議 | 目的 |
|---|---|---|---|
| ATM-0-0002 | done；名詞定義 ATM prefix 已同步 JSON / MD | 不再作為新增 ATM-2-0014+ 阻塞；僅保留為代號治理依據。 | 避免把已完成治理卡重新放回 alpha0 critical path。 |
| ATM-2-0005 | Police plugin API | acceptance 增加 `birth/evolution mode`、`nonRegression`、`qualityComparison`、`registryCandidate` JSON report；違規時不可 promote 新版本。 | 支援版本比較與品質警察。 |
| ATM-2-0006 | Adapter API / Plugin SDK | 增加 `AtomLifecycleMode`、`VersionResolver`、`QualityMetricsComparator`、`UpgradeProposalAdapter` interface。 | 讓 Adapter 可區分誕生與演化。 |
| ATM-2-0007 | Governance Bundle schema | 先保留 alpha0 最小 WorkItem / ScopeLock；把 upgrade proposal / review queue 標為 alpha1 schema。 | 防止 alpha0 過度膨脹。 |
| ATM-2-0008 | Reference plugins | acceptance 補「reference plugin 不可被 core import」之外，再補 version-history / review queue 為 alpha1 plugin。 | 維持 core 輕量與可替換。 |
| ATM-2-0009 | Artifact / Log / Evidence Store | evidence schema 加 `usage-feedback`、`quality-baseline`、`quality-comparison`、`rollback-proof` 四類；所有 evidence 需可回放。 | 收集演化品質指標。 |
| ATM-2-0010 | Neutrality boundary guard | 增加 upgrade proposal / evidence report 的 adopter 私有資訊掃描。 | 防止演化報告污染 upstream。 |
| ATM-2-0011 | Context budget guard | 增加大型 quality report 的摘要 / hard-stop contract。 | 防止演化報告拖垮 Agent context。 |
| ATM-2-0012 | neutralityScanner atom + CI | 直接使用 ATM-2-0013 的 canonical atom folder：`atomic_workbench/atoms/<Atomic ID>/`；不要散放 spec/code/test/report，也不要另建 alias folder。 | 支撐後續自我治理原子。 |
| ATM-2.5-0001 | self-host-alpha verify CLI | alpha0 只驗最小 gate；version history / rollback 僅輸出 readiness warning，不作 blocker。 | 保持 alpha0 可落地。 |
| ATM-2.5-0002 | Sandbox Repo Fixture | fixture 應固定 hello-world birth pipeline；演化 fixture 延後到 alpha1 sandbox。 | 分離誕生與演化驗證。 |
| ATM-2.5-0003 | confidence gate | 可新增 upgrade dry-run confidence，但不得阻塞 alpha0。 | 收集跨 agent 兼容風險。 |
| ATM-3-0001~0013 | 3KLife adapter | alpha0 pass 後先做 shadow/parity；演化 evidence capture 必須依賴 ATM-2-0009 與新增 upgrade schema。 | 避免 Adapter 過早綁定未定稿演化格式。 |
| ATM-4-0001~0006 | H2U case study | 第一輪只做 birth / dry-run injection；演化 pilot 另開新卡，不改既有 case atom 目標。 | 避免 H2U regression 與演化閉環互相污染。 |
| ATM-5-0003/0005 | Lifecycle / PEV Loop | 補 framework semver、atom compatibility、PEV 與 upgrade proposal 的正式文件規則。 | 把演化治理寫進公開生命週期。 |

---
