<!-- doc_id: doc_team_tmpl_memory_shard -->
# Team Memory Shard（任務知識碎片模板）

> 用途：把單次 team run 學到的、值得下次重用的具體經驗寫成一份小文件。**不是任務日誌、不是 task ledger、不是 evidence**，純諮詢性知識。
> 規範：一個 shard 對應一個可重用的 lesson，避免大雜燴；未來可序列化為 `atm.teamMemoryShard.v1` JSON schema。

---

## Shard Header

- Shard ID：（建議 `MEM-<area>-<short-slug>`，例：`MEM-team-agents-template-validator`）
- Created at：
- Created by：（Captain identity）
- Source task：（哪張任務卡催生這個 shard；例：`TASK-TEAM-0004`）
- Confidence：（low | medium | high；蒐證越紮實越高）

## Task Type

> 這個 lesson 適用於哪一類任務？避免泛化到「所有任務」。

- Channel：（fast | normal | batch | any）
- Domain：（docs | runtime | cli | infra | data-pipeline | db | ci | ...）
- Scale：（< 50 行 | 50–200 行 | 200–600 行 | > 600 行）

## Symptom

> 觸發這個 lesson 的具體情境。讓下一位 Captain 能對號入座。

-

## Lesson

> 學到了什麼。一句話講重點，再用幾行展開。

- Headline：
- Detail：

## Reuse Conditions

> 在什麼情況下可以直接套用這份 lesson？

-

## Avoid Conditions

> 在什麼情況下不要套用（避免機械式照搬）？

-

## Related Commands

> 與此 lesson 相關、值得重用的指令。

- `<command>`

## Related Files

> 與此 lesson 相關、值得保留指向的檔案。

- `path/...`

## Anti-Pattern（可選）

> 在過程中遇到的反面範例。寫下來避免下次再犯。

-

---

## 填寫範例（example）

```
## Shard Header
- Shard ID: MEM-team-agents-template-validator
- Created at: 2026-05-28T02:30:00Z
- Created by: codex-gpt-5.5
- Source task: TASK-TEAM-0004
- Confidence: high

## Task Type
- Channel: normal
- Domain: docs + scripts
- Scale: 50–200 行

## Symptom
新模板需要 deterministic 驗證，但又不能引入重量級依賴。

## Lesson
- Headline: 模板驗證用 section-title 對照表 + Markdown 解析，足夠。
- Detail: 不必引入 JSON Schema 套件；以「必填 section heading」清單比對 AST/regex 即可滿足 acceptance criteria，且維持 < 200 行 TypeScript。

## Reuse Conditions
- 模板數量 < 20、欄位結構穩定、不需要型別約束。

## Avoid Conditions
- 欄位需要型別與枚舉驗證、模板會跨 repo 分發、需要產出 IDE 補全。

## Related Commands
- `node --strip-types scripts/validate-team-agents-templates.ts --task <ID>`
- `git diff --check`

## Related Files
- docs/governance/team-agents/templates/*.md
- scripts/validate-team-agents-templates.ts

## Anti-Pattern
- 不要用 regex 比對整份 Markdown 內容，只比對 section heading 即可，否則維護成本爆炸。
```