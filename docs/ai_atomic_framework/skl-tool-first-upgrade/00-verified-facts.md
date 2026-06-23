<!-- doc_id: doc_skl_facts_0001 -->

# SKL Tool-First 已驗證事實

Generated: 2026-06-23
Planning repo: 3KLife
Target framework: AI-Atomic-Framework / ATM

## 事實清單

1. 使用者提供的升級計畫主軸是把 ATM 從「Skill 指揮 AI 下 CLI」轉成「Skill 編排結構化 ATM Tools」。
2. 計畫書已明確列出六個連續 work packages：
   - Tool Bridge v1 規格與 result adapter
   - `next / claim / framework-mode` tools
   - `evidence / guard / governed commit` tools
   - `taskflow` operator tools
   - skill 的 tool-first orchestration 改寫
   - commit/close lane 的 residue 與 active-claim hardening
3. 計畫書要求 top-level tool result shape 至少包含 `ok / command / cwd / messages / evidence / nextAction / userNotice / runnerMode` 等欄位。
4. 計畫書明確要求保留 CLI fallback，但 tool-capable editor 應以 tool-first 為主路徑。
5. 計畫書把 runtime residue、foreign active-claim、planning repo vs framework repo cross-repo 對齊列為 P0/P1 hardening 主題。
6. 既有對照模板存在於 `C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\`，其結構包含：
   - lane root `README.md`
   - 計畫書與補充文件
   - `taskflow.profile.json`
   - `tasks/README.md`
   - 多張 `TASK-CID-*` Markdown task cards
7. `TASK-CID-0014` 類型的 opener card 採 planning-only 模式，負責回寫計畫、更新 task index、再開出後續 execution pack。

## 尚未主張的事項

- 尚未主張 v1 直接引入 remote MCP server 或跨機器共享 broker service。
- 尚未主張要廢除 CLI；CLI 在本 lane 是 fallback 與 read-only inspection 路徑。
- 尚未主張本 round 直接改寫 `.atm/**` runtime state；仍須透過 ATM CLI/tool surface 完成。
