<!-- doc_id: doc_other_0638 -->
# APF-0017 — Validator Profile Wiring

## 1. 目標

把 `validate-police-family` 接進 validator profile，使 police family 在明確 gate 中啟動。M7 的最低守關 gate 選 `validate:standard`，不是只放在 `validate:full`。

## 2. Target wiring

| Profile | 目標接線 |
|---|---|
| `validate:standard` | 新增 `validate-police-family`，執行 core blocker runner 與 advisory adapters |
| `validate:full` | 繼承 `standard` 的 `validate-police-family`，並保留既有 `validate:police` |

package script 可新增：

```json
{
  "validate:police-family": "tsx scripts/validate-police-family.ts"
}
```

validator config 可新增 validator id：

```json
{
  "id": "validate-police-family",
  "command": "npm run validate:police-family",
  "profile": "standard"
}
```

實際欄位名稱以 upstream `scripts/validators.config.json` 現有 schema 為準；不得為 APF 發明第二套 runner config。

## 3. Gate semantics

- `standard`：blocker family fail 會讓 profile fail；advisory family 只記錄 report。
- `full`：全部 family 必跑；promotion to blocker 仍依 APF-0010。
- `validate:police` 不刪除，避免破壞既有 fixture 驗收。

## 4. Acceptance

- `npm run validate:standard` 的 validator list 包含 `validate-police-family`。
- `npm run validate:full` 同時包含 `validate-police-family` 與既有 `validate:police`。
- protected public docs 不出現 3KLife / Cocos / private path。
