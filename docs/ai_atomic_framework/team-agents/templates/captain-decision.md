<!-- doc_id: doc_team_tmpl_captain_decision -->
# Captain Decision（隊長決策模板）

> 用途：當 Captain 在 team run 中遇到需要「拍板」的分岔點（例如：要不要拆卡、要不要升級 channel、要不要召副隊長、要不要中止），把選項、選擇、理由、風險寫下來。
> 規範：Markdown-first，未來可序列化為 `atm.captainDecision.v1` JSON schema。每筆決策應該獨立成一份，方便回查。

---

## Decision Title

> 一句話描述這次要決定什麼。

-

## Context

- Task ID：
- Channel：
- Decision time：
- Captain identity：
- Triggering signal：（是什麼事件迫使必須拍板；例：「validator 失敗」、「scope 外修改提案」、「large-script 風險超標」）

## Options Considered

> 至少 2 個選項，每個選項都要寫出代價與風險。單選項 = 不是決策，是執行。

1. Option A：
   - Pros：
   - Cons：
   - Risk：
2. Option B：
   - Pros：
   - Cons：
   - Risk：
3. Option C（可選）：
   - Pros：
   - Cons：
   - Risk：

## Chosen Option

- Chosen：（A | B | C | ...）
- One-line summary：

## Reason

> 為什麼選這個。要寫得讓下一位 Captain 三個月後讀也看得懂，不是「因為比較好」。

-

## Risk

- Accepted risk：（接受了哪些風險）
- Mitigation：（怎麼降低該風險）
- Re-evaluation trigger：（在什麼情況下要重新評估這個決策）

## Lieutenant Need

> 是否需要副隊長（Task Lieutenant）介入？

- Need lieutenant：（yes | no）
- If yes, scope：（副隊長負責的具體範圍）
- If yes, permissions to delegate：

## Next Team Shape

> 這個決策落地後，建議下一輪 team 怎麼編。

- Add roles：
- Remove roles：
- Adjust permissions：
- New stop conditions：

---

## 填寫範例（example）

```
## Decision Title
是否把 TASK-TEAM-0004 的驗證腳本拆成獨立任務卡？

## Context
- Task ID: TASK-TEAM-0004
- Channel: normal
- Decision time: 2026-05-28T02:10:00Z
- Captain identity: codex-gpt-5.5
- Triggering signal: 驗證腳本實作預估 > 300 行 TypeScript，與三份模板共處一張卡會吃掉 token

## Options Considered
1. Option A: 維持單卡，模板 + 驗證腳本一起
   - Pros: 一次到位
   - Cons: token 風險、large-script 風險
   - Risk: 高
2. Option B: 拆出 TASK-TEAM-0004b 專做 validator
   - Pros: 範圍清楚、易驗證
   - Cons: 多一張卡的治理成本
   - Risk: 低

## Chosen Option
- Chosen: B
- One-line summary: 拆出 0004b 專做 validator

## Reason
模板本身屬於 docs governance，validator 屬於 scripts，兩者 atom 不同；拆卡可保留每張卡 < 600 行的審計可讀性。

## Risk
- Accepted risk: 多一張卡的調度成本
- Mitigation: 在 0004 的 follow-up 註記 0004b 的存在
- Re-evaluation trigger: 若 0004b 工作量低於 50 行，可考慮回併

## Lieutenant Need
- Need lieutenant: no

## Next Team Shape
- Add roles: 無
- Remove roles: implementer-typescript（本輪不再需要）
- Adjust permissions: 解除 file.write lease
- New stop conditions: 無
```