# ATM 多 Agent 寫入治理里程碑計劃

## Summary

本版修正多 Agent 寫入治理的排程與接縫，先補 fencing / identity / ledger invariant，再把 CID close gate、Team runtime、reference adapter 與 broker close/commit queue 的接線順序排清楚。

這份計劃不是要求一次把治理做到「完全封閉交易系統」，而是把最值得先做、最能降低多 AI 寫入碰撞成本的部分先落地，避免過度設計。

## 目標

1. 先把多 Agent 寫入的身份、租約、交易與關閉邏輯補齊。
2. 讓 broker 能在衝突前盡量更早判斷，並把判斷結果接到 close/commit 的硬閘。
3. 讓 Team Agents、CID hard gate、commit queue 與 evidence flow 形成可批次實作的主線。
4. 保留彈性，不把所有未知都硬塞成永久阻斷。
5. 把「何時可自動放行、何時必須停下交給人類或 ADR」做成可執行的治理欄位，而不是只留在文件宣告。

## 已知現況

- `TASK-MAO-0053..0057` 已可作為基礎能力使用。
- `TASK-TEAM-0018` 仍是 fencing / identity / leaseEpoch 的關鍵前置。
- `TASK-CID-0110` 已完成，不能再把它當作仍在進行中的主線。
- `TASK-CID-0112` 與 `TASK-CID-0113` 才是目前真正需要接續的 CID 線。
- `TASK-TEAM-0032` 與 `TASK-TEAM-0035` 的 reference adapter / bridge contract 應該一起看，避免契約與實作脫節。

## Milestone 0: Ledger Invariant 與歷史清帳

先處理會干擾後續判斷的歷史問題，不新增新能力。

- 清查 `TASK-CID-0048`、`TASK-CID-0001` 這類 `status=done` 但 `closedAt=null` 的 ledger invariant 破口。
- 確認 task JSON / evidence JSON 是否有編碼或 parse fragility。
- 這一階段只做 repair / closeback / audit，不混進新功能。

## Milestone 1: Team Fencing 與 Identity 收斂

這是多 Agent 寫入治理的地基。

- 優先完成 `TASK-TEAM-0018`。
- 把 `leaseEpoch` 接進 transaction / WriteTransaction 語意。
- 把 writer identity 收斂成可操作的主鍵規則，建議使用 `(instanceId, worktreeId)` 作為同一寫手的判定主鍵。
- `principalId` 只做歸戶 / 審計。
- `actorId` 只做顯示與人類可讀 attribution。
- `sessionId` 只做 lifecycle trace。
- Level 1 升級條件要明確：同一 branch / worktree domain 中，active transaction 且 `writeSet` 非空的 distinct writer key 達到 2 個以上。
- Level 1 的 close 權威保持清楚：transaction owner 執行 close，但需 broker 簽發 close ticket。
- Team runtime 應在這一層就保留 `requiresHumanSignoff` / `requiresAdr` / `violationStatus` 這類治理欄位，避免後續 close gate 才臨時猜測。

## Milestone 2: CID 0112 與 0113

這一段是 broker 的 explicit-intent seed 與 close gate。

### 0112

- 只接受結構化 mutation input。
- 支援 `MutationRequest[]`、`PatchProposal[]`、owner-shard row target、JSON pointer、text range、scalar op。
- 缺資料就回 `missingInputs`，不要猜。
- 不做通用自然語意推理器。

### 0113

- `taskflow close --write` 只有在 broker confirmed conflict 時才 hard block。
- `taskflow pre-close` 維持 advisory，不把 insufficient mutation intent 直接升成硬阻斷。
- `0113` 第一版可以先只做 confirmed-conflict gate，不要偷宣稱已完整整合 Team epoch/fencing，除非該路徑真的已經接好並驗證過。
- 但若已知命中治理紅線，例如 evidence 缺漏、scope 越權、reviewer independence 不成立、或 human / ADR gate 未滿足，close lane 仍應維持 block，不可因為「沒有 confirmed conflict」就放行。

## Milestone 3: Broker Operation Log

`TASK-CID-0110` 已完成，這一段不再是實作主線，而是觀測性與復盤能力的參考背景。

- broker operation log 的重點是 run record、決策原因、adapter choice、lane decision、merge verdict、evidence path、task / commit linkage。
- 它的價值在於讓後續團隊可以查到「為什麼這次 broker 這樣判」。
- 若要延伸 learning，應放在 adopter repo 的本地學習區，不要把累積知識回寫成 framework 的高耦合核心狀態。

## Milestone 4: Team Runtime / Rework / Adapter

這一段是讓 Team 系列更完整，也讓後續多 Agent 協作更穩。

- `TASK-TEAM-0031`：runtime mode 與 adapter contract。
- `TASK-TEAM-0033 -> TASK-TEAM-0034`：reviewer-validator rework 與 bounded retry。
- `TASK-TEAM-0032 + TASK-TEAM-0035`：editor bridge contract 與 Node.js reference worker adapter 應該聯動處理。
- `TASK-TEAM-0019`：在 `TASK-TEAM-0018` 之後處理 sandbox attestation / closure contract。
- `TASK-TEAM-0036`：只當 stretch，先不要讓它壓過主線。
- Team runtime / adapter contract 應能把下列阻擋原因結構化輸出：`scope-violation`、`evidence-missing`、`validator-failed`、`reviewer-independence-missing`、`human-signoff-required`、`adr-required`、`broker-conflict-blocked`。

## 批次順序

建議順序如下：

1. Milestone 0：ledger invariant 修正
2. Milestone 1：`TASK-TEAM-0018`
3. Milestone 2：`TASK-CID-0112`
4. Milestone 2：`TASK-CID-0113`
5. Milestone 3：broker operation log 背景收斂
6. Milestone 4：`TASK-TEAM-0031`
7. Milestone 4：`TASK-TEAM-0033`、`TASK-TEAM-0034`
8. Milestone 4：`TASK-TEAM-0032`、`TASK-TEAM-0035`
9. Milestone 4：`TASK-TEAM-0019`
10. Milestone 4：`TASK-TEAM-0036`

## 介面規則

- `WriteTransaction` 需要保留：`transactionId`、`taskId`、`principalId`、`actorId`、`sessionId`、`instanceId`、`worktreeId`、`branchRef`、`baseHead`、`leaseEpoch`、`allowedFiles`、`readSet`、`writeSet`、`fileHashesBefore`、`brokerDecision`、`startedAt/expiresAt/heartbeatAt`。
- `parallel-safe` 對外建議改寫成 `no-known-textual-or-resource-conflict`，避免讓人誤以為這表示語意正確。
- commit mutex 內只做 epoch recheck、CAS 與 commit。
- staging 不要和慢驗證綁死在同一個 mutex 裡。
- worktree 不是一致性權威，真正的權威是在 shared branch publish 的 CAS + epoch。
- learning schema 採 adopter-local，framework 不負責幫 adopter 透明遷移既有學習資料。
- 與 close / commit 相關的 Team runtime payload 至少要能帶出：`decisionClass`、`decisionReason`、`requiresHumanSignoff`、`requiresAdr`、`violationStatus`、`reviewerIndependenceResult`、`validatorVerdict`。

## 驗證計畫

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-agents.ts --case <relevant-case>`
- `node --strip-types scripts/validate-brokered-write.ts`
- `git diff --check`

## 風險與邊界

- 不要把 `TASK-CID-0110` 再拿來當成未完成主線。
- 不要把 `TASK-CID-0113` 一開始就宣稱成 epoch 完整版硬閘，除非 Team fencing 真正接上。
- 不要把 insufficient mutation intent 直接做成全域硬阻斷，否則會把正常 operator 流程卡死。
- 不要把 reference adapter 放在主線後面才補，契約和實作應該同批對齊。
- 不要讓多 Agent 寫入治理只管「檔案衝突」而不管「治理越權」；沒有衝檔也可能因為人類簽核、ADR、稽核或證據邊界而必須停下。

## 結論

這份里程碑的核心思想是：

先把身份、租約、關閉與觀測的地基補穩，再讓 broker 的 hard gate 逐步接上 close/commit queue，最後再把 Team runtime 與 reference adapter 走完。

這樣做的好處是，後續每個 task card 都能批次執行，但不會因為太早追求「全硬閘」而把開發速度拖垮。
