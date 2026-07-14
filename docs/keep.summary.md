# P0 ATM Bug / Optimization Backlog

- Every ATM Captain / framework agent must check and update `C:/Users/User/3KLife/docs/ai_atomic_framework/ATM_BUG_OPTIMIZATION_BACKLOG.md` when encountering ATM bugs, confusing workflow, governance drift, validator gaps, runner-sync friction, or process optimizations.
- Record each issue with: encountered problem, reproduce / detect, impact, possible optimization, and related task / commit.
- Do not rely on chat memory for ATM workflow defects. If it can affect future agents, put it in the backlog.

<!-- doc_id: doc_index_0012 -->

# Keep Consensus 摘要

> 本檔是 `docs/keep.md (doc_index_0011)` 的精簡入口。每次開始工作先讀這份；若涉及規則、架構、資料流、fallback、人物敘事或跨 repo 邊界，再回讀 `docs/keep.md` 與對應分片。
> 更新日期：2026-05-28

## P0. Context Budget
- 預設先讀本摘要，不整份灌入 `docs/keep.md`、大型 notes、compare board、批次圖片。
- 大檔一律優先讀 shard：`docs/keep-shards/keep-core.md`、`keep-workflow.md`、`keep-ui-arch.md`、`keep-status.md`。
- 修改分片後重建索引：`node tools_node/shard-manager.js rebuild-index docs/keep-shards`
- 本摘要只做導流與高風險提醒；正文規則放 `docs/keep-shards/*.md`，不要把 shard 內容複製成第三份主文。

## §1. Repo 邊界
- `3KLife`：Cocos 主遊戲 repo，負責前端、互動、UI、規格、資料工具鏈。
- `3klife-npc-brain`：NPC Brain 獨立服務 repo，負責人物知識、關係、證據、scene-director、對話與檢索。
- `AI-Atomic-Framework`：ATM 治理框架 repo，不是遊戲主內容真相來源。
- `AI-learning-notes`：對外筆記與知識整理 repo，不是 runtime 真相來源。

## §2. Pre-flight
- 全程使用繁體中文與台灣慣用術語。
- 先讀本摘要；若本輪會改共識，必讀 `docs/keep.md`。
- 先判斷工作屬於哪個 repo，再讀對應 keep 與執行對應命令。
- 新決策要補回 keep；規格異動要回寫母規格與索引。

## §3. 資料與敘事原則
- 人物、關係、角度、證據、條件、台詞、用字不得為單一人物或 demo case 寫死。
- fallback 不是敘事腦；資料不足時可回空字串、`無資料` 或 unavailable，不可用模板句、萬用句、舊 stock phrase 硬補。
- 原文太短時，先補上下文並抽 `人 / 事 / 時 / 地 / 物 / 情感` 種子，再交給 renderer / LLM。
- 遊戲平衡靠公式層實現，不直接扭曲基礎史實屬性。

## §4. Scene 責任區分
- Scene 的正式責任區分與 A/B/C 角色分工，收在 `docs/keep-shards/keep-core.md` 的 `§2 Pre-flight`；本摘要只保留索引提醒，不重複維護全文。

## §5. 工具與安全
- `get_changed_files` 禁用；改用 `git status --short`。
- 修改文字檔維持 UTF-8 without BOM；必要時跑編碼檢查工具。
- 大圖檢視遵守 thumbnail-first：`125 -> 250 -> 500`。

## §6. Cocos / UI 工作流
- Editor 入口：`http://localhost:7456`
- 不手改 `library/`、`temp/`、`profiles/`
- `assets/scripts/` 禁用裸 `console.log`，一律使用 `UCUFLogger`
- Fail-fast：開發期 / Preview / QA 遇核心元件、節點、spec、資產缺失時優先 `throw` 或 `Error log`

## §7. 任務卡協作
- 拿卡先鎖卡：
  - `node tools_node/task-lock.js check <task-id>`
  - `node tools_node/task-lock.js lock <task-id> <agent>`
- 同步更新任務卡 frontmatter：`status`、`started_at`、`started_by_agent`
- 收工解鎖：`node tools_node/task-lock.js unlock <task-id> <agent>`

## §8. UI 契約
- 三層 JSON：`layouts / skins / screens`
- Design Token 引用制；禁止 hex 硬編碼
- 所有 screen spec / task card 必須附 `Component Sizing Table`
- 正式 runtime 資產與 `artifacts/ui-library/` 候選素材分層管理

## §9. 影像檢視守則
- `view_image` 預設先看 `125px` 縮圖，不足才升 `250px`、`500px`
- Browser / Editor / compare board 截圖先裁主區域，再套同樣放大流程
- 只有使用者明確允許時，才看 `>500px` 原圖

## §10. 近期下游共識
- 人物頁仍維持 `將 / 屬 / 命 / 技 / 寶 / 兵` 六頁結構。
- `StoryDock` 正式落在 `命 / Bloodline` 頁，不再固定掛在 `將` 頁。
- Battle 與 UI 維持 Interface-first Bridge：`battle/` 不直接引用 `ui/` 具體元件。

## §11. UI Skeleton 量產入口
- 詳細規則見 `docs/keep-shards/keep-ui-arch.md` §11；本摘要只保留入口，不複製 scaffold 流程。

## §12. Proof Mapping Contract
- 詳細規則見 `docs/keep-shards/keep-ui-arch.md` §12；本摘要只保留入口，不複製 proof / mapping contract。

## §13. AI 角色與工作模式索引
- §13.1 Subagent Token Rule → `docs/keep-shards/keep-workflow.md` §13.1
- §13.2 Project Captain Mode → `docs/keep-shards/keep-workflow.md` §13.2；觸發：隊長 / 領導者 / 指揮AI / Captain / 派工
- §13.3 Publishing Director Mode → `docs/keep-shards/keep-workflow.md` §13.3；觸發：寫文章 / 技術文章 / 部落格 / 英文版 / 預覽 / 出版
- §13.4 Role Skill Model → `docs/keep-shards/keep-workflow.md` §13.4；本機人類召喚入口：`C:\Users\User\.codex\skills\ai-role-router\SKILL.md`

## §M. keep-memory 記憶索引
> 事實粒度記憶筆記層（沉澱層）。契約見 `docs/keep-memory/README.md (doc_index_keep_memory)`；本段由 memory-manager rebuild-index 維護，預算 30 行。
<!-- keep-memory-index:start -->
- [gotcha-atm-claim-session-traps](docs/keep-memory/gotcha_atm-claim-session-traps.md) — claim/session 三陷阱——auto-intent 誤判、role-provider 空段解析、session 過期要重 claim
- [gotcha-atm-close-sequence](docs/keep-memory/gotcha_atm-close-sequence.md) — ATM 任務收口標準序——每步的失敗只會在下一步爆，跳步等於延後踩雷
- [gotcha-atm-skill-template-sync](docs/keep-memory/gotcha_atm-skill-template-sync.md) — 改 .agents/skills/ 安裝副本必查 templates/skills/ 源頭模板，否則重裝洗掉修改
- [gotcha-atm-two-captain-concurrency](docs/keep-memory/gotcha_atm-two-captain-concurrency.md) — 雙隊長同工作樹並行——lease TTL、對方 staged 檔、repair-claim diagnose-first 三守則
<!-- keep-memory-index:end -->
