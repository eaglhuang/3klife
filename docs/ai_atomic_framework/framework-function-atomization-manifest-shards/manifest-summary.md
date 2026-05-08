# Framework Function Atomization Manifest — 判定結論與邊界

> 這是 `framework-function-atomization-manifest.md` 的「判定結論與邊界」分片。完整索引見 `docs/ai_atomic_framework/framework-function-atomization-manifest.md`。

<!-- doc_id: doc_other_0089 -->
# Framework Function Atomization Manifest

> 來源任務：`ATM-2-0050`。本檔是 ATM dogfooding 的 coverage 真相：所有 ATM framework Layer 2 功能都必須能在這裡找到 atom、atomic map、adapter facade 或正式例外的對應。

## 判定結論

- coverage gate 主體由 `ATM-2-0050` 完成，且 `ATM-2-0051` 已接手 self-coverage / finding route / blocker promotion follow-up。
- CLI protocol / commands 已進入 covered-existing，並由 task-router / adapter route / rule-guard contract 承接。
- manifest 自己也有一條 self-coverage meta-surface，避免 coverage gate 只管別人、不管自己。
- machine-readable inventory 與 fixture 必須持續對齊；validator 會把 drift 當成失敗。
- 2026-05-09 補入 done-card acknowledgement：`ATM-2-0006 / 0009 / 0014 / 0020 / 0021 / 0022` 的完成成果已成為 framework 可引用語言；family row 若仍有後續卡，仍維持 `open-card`。

## Layer Boundary

| Layer | 原子化要求 | 範圍 |
|---|---|---|
| Layer 1 Constitutional | 不要求原子化，只能 hash-lock + migration gate | `atomic-spec.schema.json`、`registry.schema.json`、canonical ID pattern、hash algorithm |
| Layer 2 Governed | 必須有 atom / atomic map / governed adapter facade coverage | CLI commands、registry manager、test runner、police plugins、adapter interfaces、evidence / report、task lifecycle、generator、map、PEV workflow |
| Layer 3 Mutable | 不要求原子化，只需 git / adapter config 管理 | `.atm/profile`、host-specific adapter config、project-local policy override |

## Coverage Status

| Status | 意義 |
|---|---|
| `covered-existing` | 已由 done card 或現有 atom / map / validator 覆蓋 |
| `open-card` | 已有 open / in-progress 任務卡承接，不再重複開卡 |
| `planned-gap` | 確認缺口，必須由 `ATM-2-0050` 或其 follow-up 連到任務卡 |
| `constitutional-exception` | Layer 1 自驗證悖論，不做 atom，只做 hash-lock / migration |
| `mutable-exception` | Layer 3 host config，不做 atom |
