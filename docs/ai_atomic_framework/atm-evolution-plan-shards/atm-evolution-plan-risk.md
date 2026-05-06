# ATM 框架演進執行規劃書 — 風險、排除與結論（§6–§8）

> 這是 `ATM框架演進執行規劃書.md` 的「風險、排除與結論（§6–§8）」分片。完整索引見 `docs/ai_atomic_framework/ATM框架演進執行規劃書.md`。

## 6. 開發風險清單

| 風險 | 嚴重度 | 觸發點 | 防範 |
|---|---|---|---|
| 把演化狀態塞進已完成 MVP | 高 | 對 ATM-2-0003/0004 追加需求 | 全部改由 follow-up 新卡承接。 |
| 誕生與演化共用 registry update 造成 currentVersion 污染 | 高 | `UpdateRegistry` 未區分 new entry / promote version | 引入 `birth/evolution` mode 與 registry transaction report。 |
| 品質指標不可比 | 中高 | 不同 runner / adapter 產出的 metrics 欄位不同 | ATM-2-0016 先定最小共同 metrics schema。 |
| rollback 只回 registry 不回實檔 | 高 | 只更新 `currentVersion` | rollback proof 必須含 spec/code/test hash 驗證與 artifact source。 |
| human review 被做成 core dependency | 中 | core 直接 import review queue plugin | HumanReviewGate 放 reference plugin / effect node，不進 core hard dependency。 |
| alpha0 被 alpha1 願景拖慢 | 高 | 把 usage feedback / review queue 納入 self-host gate blocker | alpha0 gate 僅 deterministic；演化只做 readiness warning。 |
| downstream adapter 過早綁定未定稿 schema | 中 | 3KLife adapter 先於 evidence / SDK 定稿 | ATM-3 先 shadow/parity，演化 evidence adapter 延到 ATM-3-0014。 |

---

## 7. 已完成項排除清單

以 `docs/tasks/tasks-atm.json` thin index 與 `docs/tasks/tasks-atm/tasks-atm-part-*.json` rebuild 後的 `status=done` 為唯一真相；本規劃不再人工維護靜態排除清單。

所有 done 卡（包含 `ATM-0-0002`、ATM-1 / ATM-1.5 已完成卡、`ATM-2-0001` ~ `ATM-2-0004`、`ATM-2-0013` 等）只作為依賴基礎。對 done 卡產生的新需求，必須使用 follow-up 任務卡或下游 open 任務補充，不得回頭擴張原驗收標準。

---

## 8. 結論

進化版提案的核心方向可採納：誕生管線與演化管線應共享 ATM 的基礎原子；但提案中「不需要新工具」與「ATM-2-0004 自然延伸」兩點需修正。合理路徑是：alpha0 先守住可自舉的 birth pipeline；alpha1 再以版本歷史、品質指標、upgrade proposal、human review 與 rollback proof 補出 evolution pipeline。這樣才能同時遵守已完成任務不變動、核心原子 000001-000010 先支撐 Adapter、以及 upstream/downstream 邊界不混線三項原則。

---
