---
doc_id: doc_other_0604
task_id: TASK-ATD-0003
title: TASK-ATD-0003 self-governance example decision evidence
owner: atm-core
status: completed
created_at: 2026-05-18T11:00:00+08:00
created_by_agent: ClaudeCode_Sonnet4.6
---

# TASK-ATD-0003 — Self-Governance Example Decision Evidence

## 結論

TASK-ATD-0003 的全部驗收條件已達成，M0 第三項任務完成。**決策：diagnostic-only**，不建立 `.atm.example/` 或 `examples/self-host/`。

## 決策理由

| 選項 | 評估 | 結論 |
|---|---|---|
| `.atm.example/` | 需手動維護、易與 CLI/schema 脫節 | 否決 |
| `examples/self-host/` | 功能已被 `self-host-alpha --verify --json` 完全覆蓋 | 否決 |
| diagnostic-only（現狀） | 動態 temp workspace、零維護成本、parity 由 validator 確保 | **採用** |

## 驗收對照

| 驗收條件 | 結果 | 證據 |
|---|---|---|
| source / root-drop / onefile / npm route 有 parity evidence | PASS | `validate:root-drop-release` ok、`validate:standard` (53/53) ok |
| release artifact 不含 maintainer-local runtime state | PASS | release/ 由 build 流程生成，不含 `.atm/` / `.atm-temp/` / local lock |
| cross-platform smoke 通過 | PASS | `validate:root-drop-release` 含 cross-platform wrapper 驗證 |

## 工作成果

**修改的檔案**：`C:/Users/User/AI-Atomic-Framework/docs/SELF_HOSTING_ALPHA.md`（新增 Section）

**新增 Section「Self-Governance Example Location Decision」**：
- 明確記錄選擇 diagnostic-only 的理由（3 點）
- Release parity evidence 說明（`validate:root-drop-release` / `validate:onefile-release` / `validate:self-hosting-alpha`）
- 確認 release artifact 不含 maintainer-local runtime state

## 驗證結果

```
validate:root-drop-release → ok (release bundle build, self-host, and blank-repo bootstrap verified)
validate:standard          → ok (passed=53, failed=0, total=53)
```

## 未污染確認

- 未在 SELF_HOSTING_ALPHA.md 中寫入 3KLife / npc-brain / Cocos / task-lock 語彙
- 未 commit `.atm/` runtime state
- 無 upstream commit / push（本卡為 internal-mirror）
