---
name: gotcha-atm-two-captain-close-storm
description: 雙隊長高頻並行下 close 收斂戰術——auto-evidence 原子收口、安靜窗衝刺、失敗回滾會吞證據
type: gotcha
updated: 2026-07-15
repo: AI-Atomic-Framework
status: active
---

# 雙隊長 close 風暴收斂戰術（MEM lane 實戰，2026-07-14/15）

對方隊長 1-3 分鐘一發 commit 時，普通 close 流程無法收斂，因為三個互鎖機制：

1. **失敗 close 的 rollback 會吞掉自己的 evidence bundle**（consumed 進 pending
   packet 後不還原）——每次失敗歸零重錄（BUG-ATM-0074）。
2. **對方的 close 週期會掃走我方 untracked evidence bundle**（foreign residue
   sweep）——證據錄了也活不過下一個對方視窗。
3. **runner-stale 閘**：對方每次 commit 都讓 frozen runner 過期，我方
   build（約 2.5 分）永遠追不上（BUG-ATM-0077）。

**收斂戰術**：
- 用 `taskflow close --auto-evidence --write`：證據與收口在同一進程內原子完成，
  無縫隙可掃（但 mapper 跳過 `npm run typecheck` / `git diff --check`，
  這兩筆要在 close 前一秒手動 `evidence run` 補，BUG-ATM-0075）。
- 掛背景監看「連續 2 分鐘無新 commit 且 index 無大量 staged」的安靜窗，
  觸發即 `build && close && close` 一氣呵成，中間零診斷指令。
- stale-gate 失敗發生在 ledger 寫入前、**不觸發 rollback**，證據可存活——
  可趁 stale 期間預先錄證據。
- reconcile 產物的互鎖（兩卡紀錄互擋 commit）用 swap-park：stash 甲、commit 乙、
  pop 甲、commit 甲（BUG-ATM-0073）。
