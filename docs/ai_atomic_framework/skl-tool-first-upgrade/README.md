<!-- doc_id: doc_skl_index_0001 -->

# SKL Tool-First 升級計畫

> 本 lane 是 ATM 從「Skill 教 AI 走 CLI」升級到「Skill 編排結構化 ATM Tools」的 planning source of truth。
> 任務卡索引見 [tasks/README.md](./tasks/README.md)。
> 計畫正文見 [SKL-tool-first-upgrade-plan.md](./SKL-tool-first-upgrade-plan.md)。
> 已驗證事實見 [00-verified-facts.md](./00-verified-facts.md)。

## 目的

- 定義 repo-local ATM Tool Bridge v1 的輸入/輸出形狀與 lane 邊界。
- 將 `next / claim / evidence / close / commit` 等治理能力從 shell 指令優先，轉成 tool-first orchestration。
- 補齊 governed commit / close lane 在 runtime residue、foreign active-claim、cross-repo planning 對齊上的 hardening。

## 範圍

- planning source of truth 位於 `3KLife`。
- 目標框架實作位於 `AI-Atomic-Framework`。
- 本 lane 的 planning 卡可以寫 `3KLife/docs/ai_atomic_framework/skl-tool-first-upgrade/**`。
- execution 卡只定義後續 `AI-Atomic-Framework` 的 bounded source-write scope，不直接授權本 lane 之外的 planning 變更。

## 建議工作流

1. 先閱讀計畫書與 `tasks/README.md`，確認 wave、依賴與 target repo。
2. 用 `TASK-SKL-*` 匯入 ATM task store，再由 `node atm.mjs next --prompt "<intent>" --json` 路由實作工作。
3. execution 卡在 `AI-Atomic-Framework` 實作，planning lane 只維護任務定義、索引與補充說明。

## Cross References

- 參考 lane: [../cid-hardening/README.md](../cid-hardening/README.md)
- 來源計畫摘錄: `C:\Users\User\.codex\attachments\8284c9f2-2886-4e37-83e7-e69b2b9651c9\pasted-text.txt`
