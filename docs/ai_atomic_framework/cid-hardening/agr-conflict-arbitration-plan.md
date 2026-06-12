# AGR Conflict Arbitration Plan

> 此文件為 `agr-virtual-atomization-implementation-plan.md` 的 AGR-0001 / AGR-0002 / AGR-0003 / AGR-0005 / AGR-0006 細化附件。
> 目的不是建立第二份平行 roadmap，而是把 AGR 在實際多 Agent 並行寫入時的衝突仲裁、降速控制、暫停/恢復、checkpoint、rollback、neutral writer 接管與驗證矩陣，細化成可實作的執行設計。

## 1. 文件定位

本文件回答的不是「AGR 要不要做」，而是「AGR 一旦進入真實多 Agent 併發寫入場景，broker 要怎麼在不拖垮吞吐量的前提下，正確攔截、仲裁、接管與恢復衝突」。

對應主計畫：

- `AGR-0001`：提供衝突粒度所需的 Layer 1 enclosure / region / virtual atom 基礎。
- `AGR-0002`：提供衝突升級後的 Layer 2 decomposition request 與 bounded rewrite 邏輯。
- `AGR-0003`：提供 read-set / write-set / dependency collision 的 augmented decision rule。
- `AGR-0004`：本附件不實作 canon_sym manifest；只在 symbol canonicalization 影響 conflict-key 時引用其結果。
- `AGR-0005`：提供 mid-execution registration、in-use registry、neutral writer / steward 接管。
- `AGR-0006`：提供 validator catch-rate benchmark，驗證衝突機制是否真的抓得到碰撞。

## 2. 核心結論

### 2.1 不採用「所有寫檔都經過單點 writer」

若讓所有 Agent 的每一次內容寫入都同步經過 broker，吞吐量會被 broker 直接卡死，並且 broker 會變成單點瓶頸。

本計畫採用：

- broker 作為控制平面（control plane）
- agent / worker / neutral writer 作為內容平面（data plane）

也就是：

- 所有寫入都必須先向 broker 登記
- 只有衝突時才升級到 steward / neutral writer 接管
- 無衝突路徑仍允許 agent 直接寫入自己的工作樹

這與論文第 3.7 節的「Broker is the sole serialization point」不矛盾：broker 仍是 registry / admission / conflict-set 的唯一控制平面序列化點；本決策只是不讓每一次 file content 寫入都同步經過 broker。無衝突時，agent 可在已登記且有 lease 的範圍內直接寫；一旦進入衝突集，steward / neutral writer 才成為該衝突集的唯一資料平面落筆者。

### 2.2 衝突處理預設不是「立即 rollback」

當第二個 agent 撞入時，第一個 agent 不應該立刻退回原狀，也不應該直接丟棄未完成工作。

預設流程應為：

1. `freeze`
2. 產出 `WIP patch envelope`
3. 由 broker 判定：
   - 可共存
   - 可自動 merge
   - 需 neutral writer 接管
   - 必須 rollback 到 checkpoint

### 2.3 checkpoint 必須存在，但要分級

checkpoint 是必要的，但不能每次 claim 都做重型快照。

建議採三級：

- `L0`：只有 intent record，無檔案快照
- `L1`：保存 WIP patch envelope
- `L2`：對衝突檔案建立 file checkpoint

## 3. 與主計畫的對應

| 主計畫項目 | 本附件補充的細節 |
| --- | --- |
| `AGR-0001` | region claim、virtual atom claim、CID / atomCid / region 對應規則 |
| `AGR-0002` | Layer 2 衝突升級條件、decomposition request、bounded rewrite 接力 |
| `AGR-0003` | read-set / write-set / dependency collision 決策表 |
| `AGR-0004` | 不在本附件實作範圍；僅消費 canon_sym / symbol manifest 的既有結果 |
| `AGR-0005` | register / lease / heartbeat / freeze / steward takeover / neutral writer |
| `AGR-0006` | 衝突驗證矩陣、fixture 類型、validator pass/fail 期待 |

## 4. 設計目標

### 4.1 正確性

- 不允許兩個 Agent 在 broker 未知情下同時改同一個高風險 surface。
- 不只看同檔 diff，還要考慮 region、read-set、generated artifact、task boundary。
- 必須能回收 orphan claim / orphan lock / stale session。

### 4.2 吞吐量

- 無衝突路徑必須走快路徑。
- 不同 repo、不同 file、不同 atomCid 可並行仲裁。
- 只有衝突集（conflict-set）才進入序列化裁決。

### 4.3 可恢復性

- 衝突發生時，不讓未完成工作直接蒸發。
- 需能保存 WIP patch envelope。
- 高風險衝突需能回到 file checkpoint。

### 4.4 可審計性

- 每一次 claim、freeze、takeover、reset、override 都有可追蹤證據。
- 使用者手動強制越權修改時，要有 `manual override` audit trail。

## 5. 主要資料模型

## 5.1 Intent Record

每個 agent 在真正寫入前都必須註冊 intent。

建議欄位：

```ts
interface WriteIntentRegistration {
  repoId: string;
  taskId: string;
  actorId: string;
  sessionId: string;
  sourceThreadId?: string;
  baseCommit: string;
  baseTreeHash?: string;
  targetFiles: string[];
  targetRegions?: Array<{
    file: string;
    lineStart: number;
    lineEnd: number;
  }>;
  targetAtomCids?: string[];
  targetVirtualAtomCids?: string[];
  readAtoms?: string[];
  writeKind:
    | "direct-edit"
    | "generated-artifact"
    | "planner-doc"
    | "closeout-governance"
    | "neutral-writer";
  expectedLeaseSeconds: number;
  allowStewardTakeover: boolean;
  declaredOutputs?: string[];
  generatedArtifacts?: string[];
}
```

`expectedLeaseSeconds` 的預設值為 `300s`，上限為 `1800s`。超過上限必須由 captain / human 明確核准；未宣告時使用預設值，避免 stale lease 長時間阻塞同一個 file / atom / generated artifact family。

### 5.2 Patch Envelope

Patch envelope 不是單純 git diff，而是 broker 用來做仲裁的最小可攜格式。

```ts
interface PatchEnvelope {
  envelopeId: string;
  actorId: string;
  taskId: string;
  baseCommit: string;
  fileHashesBefore: Record<string, string>;
  touchedFiles: string[];
  touchedRegions?: Array<{
    file: string;
    lineStart: number;
    lineEnd: number;
  }>;
  semanticIntent: string;
  diffText?: string;
  generatedArtifacts?: string[];
  readAtoms?: string[];
  resumable: boolean;
  confidence: "high" | "medium" | "low";
  validatorState?: {
    ran: string[];
    passed: string[];
    failed: string[];
  };
}
```

### 5.3 Conflict Set

```ts
interface ConflictSet {
  conflictId: string;
  repoId: string;
  participants: string[];
  files: string[];
  atoms?: string[];
  virtualAtoms?: string[];
  conflictType:
    | "file-overlap"
    | "region-overlap"
    | "read-write-dependency"
    | "generated-artifact-collision"
    | "base-drift"
    | "capsule-cid-drift"
    | "task-boundary-mismatch"
    | "manual-override"
    | "orphan-lock";
  severity: "low" | "medium" | "high" | "critical";
  resolutionMode:
    | "parallel-allowed"
    | "watch"
    | "freeze"
    | "steward-takeover"
    | "rollback-required";
}
```

### 5.4 Persistence Layer

v1 採「in-memory registry + JSON snapshot」混合模式。

- in-memory registry：承載 fast-path admission、active lease、conflict-set index。
- JSON snapshot：每 `60s` 寫出一次 active intent / patch envelope / conflict-set 摘要，並在 freeze / takeover / rollback 事件後立即 flush。
- snapshot 位置：預設由 broker runtime profile 指定，建議優先落在 `.atm/runtime/broker-snapshot/`；最終路徑細節由 `TASK-CID-0040` 下放決定，而不是散落在 planning docs。
- 重啟恢復：broker 啟動時讀取最後一份 snapshot，將未過期 lease 轉為 `suspect`，要求 agent renew；無法 renew 的 lease 進入 stale cleanup。

這讓 broker 可以快，也保留 audit trail。正式實作可先用 JSON snapshot；SQLite 可列為 v2 優化，不阻塞 v1。

### 5.5 與主計畫的契約點

本附件補強後的硬契約如下：

| 契約點 | 決策 |
| --- | --- |
| Layer 2 threshold | `theta_count = 1`，`theta_density = 0.5` |
| Layer 2 prompt schema | 必須輸出 `DecompositionRequest`，constraint 固定為 `preserve-signature` |
| Capsule CID drift | validator 偵測 registry capsule CID 與 source 不符時，轉為 `capsule-cid-drift` conflict |
| Persistence | v1 使用 in-memory registry + JSON snapshot every `60s` |
| Freeze ack timeout | `30s`；逾時轉 force-release / filesystem WIP snapshot |
| Broker / steward 定位 | broker 是 control plane sole serialization point；steward 是衝突時 data plane sole writer |
| `allow-with-watch` | 只允許 `confidence = medium`；`low` 或 unknown read-set 必須 freeze |
| CID-0040~0045 | 為本附件工程拆解，與 AGR-0001~0006 是 M:N 對應，不取代主計畫卡 |

## 6. Broker 路徑設計

### 6.1 快路徑：`register-intent`

用途：

- 低成本確認此寫入是否可直接放行。
- 預設目標反應時間 `50ms ~ 200ms`。

輸出 verdict：

- `allow-direct`
- `allow-parallel`
- `allow-with-watch`
- `pause-and-escalate`
- `deny-and-reroute`

### 6.2 慢路徑：`escalate-conflict`

只在下列情況觸發：

- 同檔且 region 重疊
- read/write 依賴交叉
- generated artifact collision
- task boundary mismatch
- base drift
- orphan lock / stale claim / stale session

慢路徑允許：

- freeze 與收集 patch envelope
- file checkpoint
- steward takeover
- neutral writer merge
- rollback

### 6.3 v1 latency budget

這組數字不是效能最佳化目標，而是第一版可驗證的治理預算，供 `AGR-0006` benchmark 與論文 admission latency 指標使用。

| 動作 | v1 預算 | 超時處理 |
|---|---:|---|
| `register-intent` admission | `50ms ~ 200ms` | 超過 `500ms` 記 latency warning，但不直接 fail |
| `renew-lease` / `release-lease` | `50ms ~ 150ms` | 超過 `500ms` 記 broker pressure |
| freeze signal 到 ack | `30s` | 轉 `unresponsive`，停止新 admission |
| 收集 WIP patch envelope | `30s` | 建立 filesystem snapshot metadata-only envelope |
| 建立 steward session | `5s` | 記 `steward-start-timeout`，升級 captain review |
| steward merge simulation | `120s` | 轉 block / rescope，不自動 apply |
| validator-gated apply | 預設 `10min` 上限 | 超過則保留 checkpoint 並要求人工決策 |
| orphan / stale cleanup scan | 每 `60s` | 找到 stale lease 後先標 `suspect`，再依 lease 規則釋放 |

若大型 repo 或遠端檔案系統導致這些預算不合理，必須由 captain 在 task card 中明確給 waiver；broker 不應讓 agent 自行放寬 timeout。

## 7. 仲裁規則

### 7.1 允許直接放行

條件：

- 不同 file
- 無 shared generated artifact
- 無 read/write 交叉
- 無 task boundary 衝突

### 7.2 允許平行放行

條件：

- 同檔，但 region 明確不重疊
- 同時 read-set 不交叉
- 同時 virtual atom / atomCid 也不重疊

### 7.3 帶監看放行

條件：

- 同檔不同 region
- read-set 已宣告，且沒有 read/write 交叉
- region 判定為不重疊
- confidence 必須為 `medium`

做法：

- 發短租約
- 要求較密集 heartbeat
- 一旦檢測到 region 擴張或 generated artifact 擴張，立即升級

`allow-with-watch` 不能用於 read-set unknown 或 `confidence = low` 的情境。read-set unknown 時依 AGR-0003 的 augmented decision rule 採保守策略，直接 `pause-and-escalate`；`confidence = low` 也直接 freeze，不以 watch 樂觀放行。

### 7.4 暫停並升級

條件：

- region overlap
- generated artifact collision
- 同一 virtual atom
- read/write dependency collision
- task boundary mismatch

Layer 2 拆分觸發條件：

```text
if conflict_region is inside one function body
and conflict_count <= theta_count (= 1)
and len(conflict_region) / len(function_body) <= theta_density (= 0.5):
  verdict = decomposition-request
  constraint = preserve-signature
else:
  verdict = steward-takeover
```

`decomposition-request` 不是直接寫檔許可。它只授權 agent / steward 產生 preserving-signature 的 bounded rewrite proposal，proposal 必須重新經過 broker admission 與 validator。

### 7.5 拒絕並改道

條件：

- 使用者或 agent 明確要求進入不被允許的 protected surface
- 目前已存在 critical conflict-set
- 該操作必須經 neutral writer，但 caller 不允許 steward takeover

## 8. 衝突類型總表

### 8.1 同檔不同 region，但 broker 無法證明不相交

- 預設不放行
- 升級成 `freeze`
- 要求雙方送出 patch envelope

### 8.2 同檔不同 region，但 read-set 互相依賴

例如：

- A 寫 function body
- B 改 function signature 或 shared type

處理：

- 視為 `read-write-dependency`
- 禁止僅依 diff 判斷為安全

### 8.3 同檔同 region，但 patch 可自動 merge

處理：

- 原 agent 先 freeze
- steward / neutral writer 試 merge
- merge 後必跑 validator

### 8.4 不同檔，但共享 generated output

例如：

- `release-manifest.json`
- `path-to-atom-map.json`
- generated dist / lockfile / index

處理：

- 視為 shared surface
- 不可單憑不同檔直接放行

### 8.5 第一個 agent 還沒真的寫檔

處理：

- 第二個 agent 可進 waiting queue
- 不需要立刻 freeze 第一個 agent

### 8.6 第一個 agent 已寫到一半

處理：

- 不先要求 rollback
- 先 freeze
- 先收集 WIP patch envelope

### 8.7 agent 離線或 thread 消失

處理：

- lease 過期後轉 `suspect`
- 長 timeout 後轉 `stale`
- 可由 broker 釋放或 steward takeover

### 8.8 使用者手動叫 agent 越權改檔

處理：

- 不視為 rogue worker
- 但需記 `manual-override` audit trail
- 衝突等級提升一級

### 8.9 task 邊界與真實 dirty files 不一致

處理：

- 禁止合法 close
- 先要求 rescope 或 block

### 8.10 base commit 漂移

處理：

- 先做 rebase simulation
- 若仍可安全續行，重新 claim
- 若不可安全續行，freeze + steward

### 8.11 binary / generated / lockfile

處理：

- 預設不可雙寫
- 直接 `steward-only`

### 8.12 多檔原子 patch 只部分碰撞

處理：

- 視為 patch set transaction
- 不能只拆出單檔自動完成，其餘繼續前進

### 8.13 Capsule CID drift detected by validator

情境：

- validator 重算發現 registry 中的 capsule CID 與當前 source 不符
- 或 candidate CID / capsule CID / synthetic CID 分離後，capsule 對應的 source range 已漂移

處理：

- 視為 `capsule-cid-drift`
- severity 至少為 `high`
- 自動 freeze 該 capsule / atom 的所有 active intent
- 要求 broker 重建 conflict-set，並阻止 closeout 直到 registry 與 source 重新對齊
- 若 drift 同時影響 generated artifact，升級為 steward takeover

## 9. Freeze / Resume Protocol

### 9.1 Freeze 觸發條件

- 新進 intent 與 active lease 形成 medium 以上 conflict-set
- task boundary mismatch
- generated artifact collision
- human override with existing lease

Freeze signal v1 採 polling / command-boundary ack，不假設 LLM 推論中段可即時中斷。Agent SDK 或 worker loop 必須在下列節點檢查 freeze：

- 寫檔前
- 每次 tool call 前後
- validator 前
- closeout 前

`freeze ack timeout` 為 `30s`。逾時時 broker 將該 lease 標記為 `unresponsive`，停止新的寫入 admission，並進入 force-release 或 filesystem WIP snapshot 流程。

### 9.2 Freeze 後 agent 必須提交

- current base hash
- current file hash
- WIP patch envelope
- current validator state
- unresolved note
- touched file / region 清單

若 agent 沒有在 `30s` 內提交 WIP patch envelope，broker 可從 filesystem snapshot 建立 metadata-only envelope，標記 `confidence = low`，並要求 steward / captain 決定是否 rollback 或人工 rescope。

### 9.3 Resume 條件

- broker 判定可共存
- steward merge 完成
- 或 caller rollback 到指定 checkpoint 並重註冊

## 10. Checkpoint / Rollback 策略

### 10.1 L0：Intent-only

適用：

- claim 已建立
- 尚未開始內容修改

### 10.2 L1：Patch-envelope-only

適用：

- 已開始修改
- 尚未偵測到高風險 collision

### 10.3 L2：File checkpoint

適用：

- 發生高風險 collision
- 進入 steward takeover
- 同檔衝突且需安全回退

### 10.4 何時真的 rollback

只有下列情況才要求 rollback：

- WIP patch 已不再匹配 base
- neutral writer 無法在現況合併
- generated artifact 已污染 shared outputs
- 使用者要求回到穩定 checkpoint

否則預設先 freeze，不先退回。

generated artifact 污染判定：

```text
artifact_hash != broker_baseline_hash
and artifact_path not in active_intent.declaredOutputs
```

如果兩個 active intent 都宣告同一 generated artifact，則不看 mtime 作為污染證據，改以 baseline hash、declared output ownership、patch envelope 與 validator 結果判定。

## 11. Neutral Writer / Steward 接管

### 11.1 接管條件

- 同檔同 region
- generated artifact collision
- read/write dependency 高風險
- 人工 override 後仍需單一落筆

### 11.2 接管流程

1. broker 建立 steward session，目標 `5s` 內完成。
2. freeze 參與 agent，等待 ack 最多 `30s`。
3. 收集雙方 patch envelope，最多 `30s`；逾時改由 filesystem snapshot 產生 metadata-only envelope。
4. 建立 file checkpoint，記錄 baseline hash / capsule CID / declared outputs。
5. neutral writer 在隔離 worktree 生成整合 patch，merge simulation 目標 `120s` 內完成。
6. 跑 validators，validator-gated apply 預設總上限 `10min`。
7. 成功則 apply，並回寫 resolution result。
8. 失敗或超時則 rollback / block / rescope，不允許原 agent 繞過 steward 直接續寫衝突檔。

### 11.3 接管後原 agent 的狀態

- 對衝突檔失去直接寫入權
- 對其他未衝突檔可視情況保留 lease
- 最後由 steward 回寫 resolution result

## 12. 效能與併發設計

### 12.1 不可用全域大鎖

應以以下粒度建立索引與租約：

- repo
- file
- region
- atomCid
- virtualAtomCid
- generated artifact family

### 12.2 快取

broker 應維持：

- active intent index
- conflict-set index
- stale lease scanner
- generated artifact ownership index

### 12.3 heartbeat

- 一般路徑：低頻 heartbeat，每 `120s` renew 一次。
- `allow-with-watch`：中頻 heartbeat，每 `30s` renew 一次。
- `freeze waiting`：必須在 `30s` 內顯式 ack；ack 後若仍等待 steward，可每 `10s` 回報一次 pending state。
- stale 判定：連續漏掉 `2` 次 renew，或超過 lease 到期時間 `2x`，取較短者。
- lease 上限：預設 `300s`，最大 `1800s`；超過最大值必須 captain / human 批准。

### 12.4 背景工作

下列應走背景 queue，而非阻塞 `register-intent`：

- merge simulation
- validator runs
- steward takeover build-out
- orphan cleanup

orphan cleanup scanner 預設每 `60s` 執行一次。cleanup 不可直接刪除狀態，必須先把 lease/session 標為 `suspect`，下一輪仍無 renew 或無 thread 回應才轉 `stale` 並釋放。

### 12.5 v1 scope：single broker per worktree

本附件 v1 明確假設單一 repo / 單一 worktree 由單一 broker 管理。下列情境列為 v1 out of scope，但必須保留設計餘地：

- 多 repo 多 broker 的 distributed conflict-set。
- broker 高可用、leader election、跨機器 lease replication。
- broker 自身 crash / hang 時的強一致恢復。
- broker 升級期間的 rolling migration。

v1 的最低要求是 graceful shutdown 與 JSON snapshot recovery：broker 停止前 flush snapshot；重啟後將未過期 lease 標為 `suspect`，要求 agent renew，不能直接假設原 lease 仍安全。

## 13. 驗證矩陣

本段直接對應 `AGR-0006`。

### 13.1 必備 fixture 類型

1. 同檔不同 region，應 `allow-parallel`
2. 同檔不同 region 但 read-set 交叉，應 `freeze`
3. 同檔同 region，應 `steward-takeover`
4. 不同檔但 generated artifact collision，應 `freeze`
5. base drift，應 `re-register` 或 `rollback-required`
6. task boundary mismatch，應 `deny-and-reroute`
7. orphan lock，應可 cleanup recover
8. manual override 撞 active lease，應提升 severity
9. neutral writer merge 成功，應 validator pass
10. neutral writer merge 失敗，應 rollback / block
11. capsule CID drift（registry 紀錄的 capsule CID 與 source 不符），應 `freeze`；若牽涉 generated artifact，升級為 `steward-takeover`

### 13.2 驗證輸出

每個 fixture 應輸出：

- broker verdict
- conflict type
- 是否 freeze
- 是否要求 checkpoint
- 是否要求 steward takeover
- validator pass/fail
- final governance state

## 14. 里程碑拆解建議

### M1：Registration 基礎

- `register-intent`
- `renew-lease`
- `release-lease`
- `list-active-intents`

### M2：Conflict Model

- `patch envelope`
- `conflict-set`
- `generated artifact ownership`

### M3：Arbitration Engine

- file / region / atomCid / read-set 快速判定
- `allow-direct / allow-parallel / allow-with-watch / pause-and-escalate / deny-and-reroute`

### M4：Freeze / Resume

- `freeze session`
- `submit-wip-envelope`
- `resume token`

### M5：Steward Takeover

- neutral writer session
- isolated worktree merge
- validator-gated apply

### M6：Recovery

- orphan lock cleanup
- stale lease cleanup
- manual override audit

### M7：Benchmark

- fixture pack
- validator catch-rate report
- no-ship / guarded-ship decision support

## 15. 明確決策

### 採用

- 所有寫入前必須先 register intent
- 預設先 freeze 再上交 WIP envelope
- broker 必須記住 patch envelope
- checkpoint 採分級，不是全域快照
- 高風險 collision 交給 neutral writer

### 不採用

- 所有內容寫入都同步經過 broker
- 一偵測衝突就要求第一個 agent 立即 rollback
- 每次 claim 都做完整 repo snapshot
- 僅靠同檔 / 不同檔 判定安全

## 16. 待補實作問題

以下仍需在正式 task card 中進一步決定：

- `readAtoms` 的最小可信來源是 agent 宣告、adapter 推導，還是兩者併用
- generated artifact family 如何定義 ownership key
- neutral writer 的 validator 套餐是否依檔案類型自動選擇
- manual override 是否需要 captain 額外 waiver
- `patch envelope` 是否強制包含 textual diff，或允許 metadata-only

## 17. 建議後續 task 化

若要進入正式開卡，建議至少拆成 `TASK-CID-0040` ~ `TASK-CID-0045`。這些 CID task 是本附件的工程里程碑，不是 `AGR-0001` ~ `AGR-0006` 的替代品。

- `AGR-0001` ~ `AGR-0006`：主計畫骨架，對應論文與治理能力章節。
- `TASK-CID-0040` ~ `TASK-CID-0045`：本附件的 implementation milestones，用來把衝突仲裁能力拆成可交付工程包。
- 兩者關係為 M:N 對應；開卡時應同時標示 `AGR anchor` 與 `CID milestone`，避免 allowed_files 或驗收責任互撞。

| CID milestone | 工程範圍 | 主要 AGR anchor |
|---|---|---|
| `TASK-CID-0040` | intent registration + lease + heartbeat + lease bounds | `AGR-0005` |
| `TASK-CID-0041` | conflict-set model + arbitration verdicts + control/data plane contract | `AGR-0001`, `AGR-0003`, `AGR-0005` |
| `TASK-CID-0042` | freeze / patch envelope / checkpoint / filesystem WIP snapshot | `AGR-0002`, `AGR-0005` |
| `TASK-CID-0043` | neutral writer / steward takeover / isolated merge / validator-gated apply | `AGR-0002`, `AGR-0003`, `AGR-0005` |
| `TASK-CID-0044` | recovery / orphan cleanup / manual override audit / snapshot recovery | `AGR-0005` |
| `TASK-CID-0045` | conflict benchmark / validator catch-rate / latency reporting | `AGR-0006` |

`AGR-0004` 的 canon_sym manifest 不在本附件的直接實作範圍內；若後續 canon_sym 影響 conflict-key、capsule source range 或 generated artifact ownership，應由對應 CID task 以 consumed input 的方式引用，而不是在本附件另開主責實作。

---

此附件的判斷標準只有一個：
ATM 未來不只要「知道有人撞了」，而是要能在保留吞吐量的前提下，正確地攔截、保存、仲裁、接管、恢復與驗證真正的多 Agent 衝突。
## 18. Claim / close operating note

這份 plan 會把 `claim` 當成真正的 admission gate，不只是 routing 提示：

- `next --claim` 與 `tasks claim` 都必須 fail-closed
- 只要 task 的 `depends_on` / `blocked_by` 仍未完成，就要直接阻擋 claim
- 阻擋時要回傳可執行的 guidance，例如 `tasks status --task <blocking-task> --json`
- `validator` 全綠不代表可以 close；當 deliverables 已完成時，仍要先跑 `tasks close`，再進入 commit / closeout 流程
- 如果 claim 的 task 已經產出 deliverables，但還沒 close，文件與 task card 都應明確標示「尚未關單」而不是把它當成已完成
