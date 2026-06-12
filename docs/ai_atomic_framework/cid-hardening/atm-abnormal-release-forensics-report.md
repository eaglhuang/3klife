---
doc_id: doc_cid_forensics_0047
report_id: ATM-ABNORMAL-RELEASE-FORENSICS-20260612
task_id: TASK-CID-0047
generated_at: "2026-06-12T19:30:00+08:00"
generated_by: "008"
repos_inspected:
  - AI-Atomic-Framework
  - 3KLife
scope_tasks:
  - TASK-CID-0040
  - TASK-CID-0041
  - TASK-CID-0042
  - TASK-CID-0043
  - TASK-CID-0044
  - TASK-CID-0045
  - TASK-CID-0046
status: draft-for-captain-review
---

# ATM 平行派工鏈異常放行鑑識報告

## 1. 執行摘要

**事實：** CID AGR 硬化波次（TASK-CID-0040～0046）在 2026-06-12 以多代理平行派工方式推進。至鑑識時點，**原始碼交付**與 **ATM 目標 repo ledger 關閉狀態**、**3KLife 規劃卡狀態**、**mailbox 完成回報** 四者嚴重不一致。

**推論（主要根因）：** ATM 在 0046 修正前，**依賴任務是否可 claim / 是否可往下游推進，主要只看 `status=done|verified`，未強制驗證 governed closeout provenance**；同時 **mailbox 依賴順序僅存在於派工單 prose / YAML，未接入 `tasks claim` 或 `next --claim` 的機械式准入**。Captain 與多條工作線各自推進，造成「看起來完成」與「治理上可證明完成」脫鉤。

**推論（次要根因）：**

1. 規劃 repo（3KLife）task card `status: done` 被當成進度真相，但 **未與 target repo ledger 的 CLI close 事件雙向鎖定**。
2. 部分代理以 **一般 `git commit` + mailbox report=done** 收尾，**未執行 `tasks close`**，pre-commit 仍可能全綠。
3. `tasks close` 在 0046 前可從 `planned` 直接關到 `done`，且 close event **可不帶** `closure.schemaId=atm.taskClosureTransition.v1`。
4. `tasks import` 可把已 `done` 的 ledger **重開為 open/running**，與規劃鏡像、mailbox 狀態無自動對帳。
5. 平行派工中 **實際執行者與 mailbox assignee 不一致**（例：0042 由 `codex-gpt-5.4-mini` 交付，002 的 inbox 仍留卡）。

**0046 的意義（事實）：** `b1107ee7` 已落地 `verifyCloseoutProvenance` 強化與 `next`/`claim` 的 `incomplete-closeout` 阻擋，屬事後補強，**不 retroactively 修復** 0040～0045 的歷史 ledger 殘留。

---

## 2. 鑑識方法

| 類別 | 路徑 / 命令 |
|------|-------------|
| 規劃卡 | `3KLife/docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-004*.task.md` |
| Target ledger | `AI-Atomic-Framework/.atm/history/tasks/TASK-CID-004*.json` |
| Events | `AI-Atomic-Framework/.atm/history/task-events/TASK-CID-004*/` |
| Evidence | `AI-Atomic-Framework/.atm/history/evidence/TASK-CID-004*.json` |
| Closure packets | `AI-Atomic-Framework/.atm/history/evidence/*.closure-packet.json` |
| Commits | `git log --oneline 00be417f^..b1107ee7`（AAF） |
| Mailbox | `.atm-temp/captain-dispatch-mailbox/agents/*/inbox|done|reports/` |
| 決策面原始碼 | `packages/cli/src/commands/tasks.ts`（`verifyCloseoutProvenance`、`collectDependencyBlockers`） |

本報告 **未修改** ATM 原始碼、ledger、mailbox 檔案。

---

## 3. 任務交付矩陣（事實表）

| 任務 | 交付 commit（AAF） | Target ledger | Close event / packet | 3KLife 規劃卡 | Mailbox | 治理 closeout 是否完整 |
|------|-------------------|---------------|----------------------|---------------|---------|------------------------|
| **0040** | `daf47aa8`（registry/lifecycle）、`b373d1ee`（ledger+evidence） | `running` + active claim/lock | 無 close；曾被 import `done→open` 後重 claim | `done` | 001 done | **否** — 有交付 commit，未 close；且被 import 重開 |
| **0041** | `70594a03` | `done` | `close` from `planned`，**無** `closure` 物件 | `done` | 003 done | **弱** — audit 會判 `ATM_TASK_AUDIT_MANUAL_DONE` |
| **0042** | `803ffc33` | `done` | `historical-delivery 803ffc33` + closure packet | `done` | **002 inbox 仍留卡**（orphan dispatch） | **是** — 本鏈最佳實踐樣本 |
| **0043** | `00be417f`（早於 0042） | `planned`（僅 import） | 無 | `done` | 007 done | **否** — 有程式、無 ledger 推進 |
| **0044** | `d5c3dea8` | `planned` | 無 | `done` | 008 done + report | **否** — mailbox/report 充當完成 |
| **0045** | `0285e399` | `planned` | 無 | `done` | 008 done + report | **否** — 依賴 0044 未 close 仍交付 |
| **0046** | `b1107ee7` | **無 ledger 檔** | 無 | `done` | 未在本次 mailbox 掃到 | **否** — 修正已合入，自身未走完整 ledger |

### 3.1 Commit 時序（事實）

```
00be417f 16:22  0043 route/steward（commit 訊息未標 TASK-CID-0043）
803ffc33 16:29  0042 freeze
daf47aa8 16:48  0040 registry（訊息未標 0040）
70594a03 16:54  0041 conflict-matrix
d5c3dea8 16:55  0044 recovery
0285e399 16:56  0045 benchmark
b373d1ee 17:24  0040 ledger completion commit
b1107ee7 18:07  0046 dependency closeout gate
```

**推論：** Git 歷史亦呈現依賴逆序（0043 早於 0042），與任務卡 `depends_on` 不一致，顯示 **claim/close 門禁未阻止「先有程式、後補治理」**。

---

## 4. 各任務細部發現

### 4.1 TASK-CID-0040

**事實：**

- `daf47aa8` 修改 `registry.ts`、`lifecycle.ts`、`types.ts`、`intent-registry.test.ts` 等，訊息為泛化 broker 更新。
- `b373d1ee` 訊息為 `feat(broker): complete TASK-CID-0040`，含 ATM trailers；主要新增 `.atm/history/tasks/TASK-CID-0040.json`、evidence、task-events。
- Event `2026-06-12T09-38-58-718Z-import`：`fromStatus: done` → `toStatus: open`（`tasks import`）。
- 鑑識時 ledger：`status: running`，`taskDirectionLock.status: active`，actor `codex-gpt-5.4-mini`。
- 3KLife 規劃卡：`status: done`。

**推論：** 0040 曾進入過「看起來 done」狀態，import 重開後又進入 running；**規劃卡 done 與 target ledger 分叉**。Captain 若以規劃卡判斷「0040 已完成」，會過早放行 0041。

### 4.2 TASK-CID-0041

**事實：**

- Close event：`fromStatus: planned` → `toStatus: done`，command 為 `tasks close --status done`（actor 003），**未出現 `--historical-delivery`**，event **無** `closure` 區塊。
- `verifyCloseoutProvenance()` 要求 close event 內含 `closure.schemaId=atm.taskClosureTransition.v1` 或有效 closure packet；0041 **不滿足**。
- Pre-commit hook 曾 advisory：`ATM_TASK_AUDIT_MANUAL_DONE`（0041 marked done without ATM CLI closure metadata — 語意上指完整 closure metadata）。

**推論：** 0041 是「**status 已 done，但 closeout provenance 不完整**」的典型案例；0046 前下游任務仍可能只檢查 `status=done`。

### 4.3 TASK-CID-0042

**事實：**

- 由 `codex-gpt-5.4-mini` 執行 reserve → promote → claim → scope-amendment → close。
- Close 使用 `--historical-delivery 803ffc33`，closure packet 存在。
- Closure packet `changedFiles` 含大量 release/、next.ts、semantic-fingerprint 等 **超出 0042 deliverables 清單**的檔案（事實來自 packet JSON）。
- Mailbox：`agents/002/inbox/` **仍保留** 0042 dispatch；`agents/002` 未 claim。

**推論：** 0042 治理 closeout **形式完整**，但 historical-delivery 範圍可能 **過寬**；mailbox 與實際執行者脫鉤，Captain 難以從 mailbox 機械判斷真實執行線。

### 4.4 TASK-CID-0043

**事實：**

- `00be417f` 新增 `route.ts`、`steward-arbitration.test.ts`；同 commit 亦帶入 `TASK-CID-0025` ledger 片段（混 commit）。
- Target ledger 停留 `planned`，last event 僅 `import`。
- 3KLife 規劃卡：`done`；mailbox agent 007：`done`。

**推論：** **程式已存在、規劃與 mailbox 宣稱完成，但 target ledger 未 claim/close** — 三源真相分裂。

### 4.5 TASK-CID-0044 / 0045

**事實：**

- Agent 008 報告 `status: done`，validators 全綠；commit `d5c3dea8`、`0285e399` 已入 main。
- Target ledger 兩者皆 `planned`；無 reserve/claim/close events。
- 0045 宣告依賴 0041～0044；0044 ledger 未 done 時仍完成 benchmark 交付。
- 分開 commit 工作使用一般 `git commit`；多次被 direction lock（殘留 0040/0025 等）阻擋後以 `tasks lock cleanup` 解除。

**推論：** **Validator 綠燈 ≠ task close**；平行波次中代理以 commit + mailbox 作為「完成」訊號，ATM task ledger 未同步。

### 4.6 TASK-CID-0046

**事實：**

- `b1107ee7` 強化 `collectDependencyBlockers` / `verifyCloseoutProvenance` 在 claim 與 next 路由的使用。
- 3KLife 規劃卡 `done`；AAF **無** `TASK-CID-0046.json` ledger。
- 屬對 0040～0045 異常的 **補強**，非當時阻止放行。

---

## 5. Mailbox 依賴是否被機械執行？

**事實：**

- 派工單含 `depends_on_tasks` / `depends_on_dispatch`（例：0041 依賴 0040；0042 依賴 0040+0041）。
- `captain-dispatch-mailbox` 腳本負責投遞 Markdown 至 `agents/<id>/inbox`；**未發現**其將 `depends_on_tasks` 寫入 ATM `tasks claim` 或 `next` 路由。
- 實際投遞為平行多 agent（001/002/003/007/008），時間戳集中在 15:27～16:14 TPE。

**推論：** Mailbox 依賴順序 **僅為 prose 約束**；ATM 在 0046 前 **未** 以 closeout provenance 阻擋下游 claim，導致依賴鏈可被並行穿透。

---

## 6. `tasks close --historical-delivery` 行為

**事實（0042 樣本）：**

- 允許在 deliverable 已於先前 commit 落地後，以 `--historical-delivery <sha>` 關閉。
- 0042 closure packet 的 `changedFiles` 列舉範圍大於 task `scopePaths` / `deliverables`。

**推論（待 Captain 確認）：** Historical-delivery 驗證若以 commit 樹差分為準，可能接受 **同時間窗內其他任務或 release 同步** 的檔案變更，造成「關閉證明覆蓋過廣」。此點需對照 `tasks close` 實作中 historical diff 篩選邏輯進一步審計（本次僅記錄 packet 表面證據）。

**事實（0041 對照）：** 未使用 historical-delivery，從 `planned` 直接 close，門檻更低。

---

## 7. Frozen runner drift

**事實：**

- 鑑識期間 `node atm.mjs next` 曾回 `ATM_RUNNER_SYNC_REQUIRED`（frozen `atm.mjs` 舊於 source）。
- 多筆 commit 含 `release/atm-onefile/atm.mjs`、`release/atm-root-drop/**` 同步。
- 0046 修正存在於 source 與較新 release，但 **歷史平行派工當下** 各代理可能混用 frozen / 直接 source / `git commit` 繞過 `atm git commit`。

**推論：** Runner drift **加劇** 「hook 行為與 `next` 建議不一致」的觀感；但本次異常放行的主因仍是 **ledger/status 語意過弱**，非單純 artifact 過期。

---

## 8. 根因分級

### 8.1 主要根因（Primary）

**ATM 任務依賴准入在 0046 前將 `status=done` 視為充分條件，未強制 governed closeout provenance（closure transition + packet 或等價物）。**

支撐事實：

- 0041：`done` 但 provenance 不完整。
- 0043～0045：有交付、規劃卡/mailbox 宣稱完成，ledger 仍 `planned`。
- 0045 依賴 0044 未 close 仍可交付。

### 8.2 次要根因（Secondary）

1. **雙 repo + 三源狀態（規劃卡 / target ledger / mailbox）無單一真相仲裁。**
2. **Mailbox 非 ATM 治理子系統** — done 資料夾與 report 不觸發 `tasks close`。
3. **`tasks import` 可重開 done 任務**，與平行派工計畫不同步。
4. **平行派工實際執行者與 mailbox assignee 不一致**（0042）。
5. **Pre-commit hook 對無 `.atm` staged 的 delivery commit 不強制 task close**（0044/0045 分 commit 時僅 advisory scope drift）。
6. **Historical-delivery close 可能綁定過寬 commit 差分**（0042 packet 表面證據）。

---

## 9. 最高風險未解歧義

1. **3KLife 規劃卡 `status: done` 由誰、以何依據更新？** 是否來自 Captain 手動、腳本鏡像、或代理回報 — 本次未找到與 target `tasks close` 的自動連結證據。
2. **0042 historical-delivery 的範圍驗證是否刻意允許同批硬化波次的交叉檔案？** 需對照 `tasks.ts` close 實作與 Captain 意圖。
3. **0040 的 `done→import→open→running` 是否為計畫內重開？** 若為計畫內，規劃卡仍標 done 即為明確鏡像錯誤。

---

## 10. 建議（供 Captain；本任務不執行修復）

1. **以 target repo ledger + closeout provenance 為唯一放行依據**；規劃卡 done 降級為「人類可讀摘要」，不可驅動 claim。
2. **對 0040～0045 啟動受控 ledger 修復波次**（獨立任務，非本報告範圍）：reconcile delivery commit ↔ ledger ↔ closure packet。
3. **Mailbox 完成回報與 `tasks close` 脫鉤問題**：考慮派工單硬性要求「mailbox report 必附 `tasks close` JSON exit 0 證據」。
4. **0046 已落地後**，用 `tasks claim` / `next --claim` 回歸測試依賴鏈，確認 `incomplete-closeout` 能阻擋重現。
5. **清查 agent 002 inbox 殘留 0042** 等 orphan dispatch，避免下一輪誤判「未派工」。

---

## 11. 鑑識命令紀錄

```powershell
# AAF
git log --oneline --grep="TASK-CID-004" -20
git log --format="%h %ci %s" 00be417f^..b1107ee7
git show --stat daf47aa8 b373d1ee 70594a03 803ffc33 00be417f d5c3dea8 0285e399 b1107ee7

# Ledger / events（檔案系統檢視）
# .atm/history/tasks/TASK-CID-0040.json … 0045.json
# .atm/history/task-events/TASK-CID-004*/**

# Mailbox
# .atm-temp/captain-dispatch-mailbox/agents/*/inbox|done|reports/

# 3KLife 規劃卡 frontmatter status
# docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-004*.task.md
```

---

## 12. 驗證

報告完成後應執行：

```powershell
git -C "C:\Users\User\3KLife" diff --check -- "docs/ai_atomic_framework/cid-hardening/atm-abnormal-release-forensics-report.md"
```

---

*本報告由 TASK-CID-0047 鑑識產出；事實與推論已於各節標註。未修改 ATM 原始碼、ledger 或 mailbox。*
