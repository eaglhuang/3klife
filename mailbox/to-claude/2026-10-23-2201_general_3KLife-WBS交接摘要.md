# 3KLife 未結 WBS 交接摘要
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-23 22:01

## 盤點基準與接手前注意
- 本機 `C:\Users\User\3KLife` 的工作樹在 `master`，相對 `origin/master` 落後 1,575 個提交；已 fetch 到 `origin/master=19079568a`，但沒有同步或重置主工作目錄。
- 本機任務 JSON 分片、索引與多項程式／資產均有未提交或未追蹤變更。以 90 個 `docs/tasks` / `docs/ui-quality-tasks` JSON 分片、及 `docs/agent-briefs/tasks`、`docs/tasks` 任務卡 frontmatter 去重盤點：161 項非結案（39 in-progress、1 in_progress、81 open、32 planned、2 blocked、5 in-review、1 not-started）。這是本機工作樹快照，不可當成遠端最新總數。
- 遠端 `docs/agent-briefs/tasks_index.md`（generated 2026-10-20）另有 56 項 UI Quality Index：35 done、4 in-progress、17 open；其中 `TASK-UI-9001` 標示 in-progress，但目前本機工作樹找不到其正式任務卡。這份索引與本機 manifests/card statuses 有差異，以上兩組數字不能相加。接手者先從遠端重新盤點、核對卡片與 PR，再按規定 check/lock/claim；不要在髒的主工作目錄上 reset、覆寫或切換分支，請用隔離工作樹。

## 主要工作線
- **角色動畫原型／戰場整合**：`UI-1-0017`（Cocos Q 版分層 2D 動畫與兵器光效）、`BAT-1-0001`（戰鬥場景接入）、`SYS-1-0001`（角色分片 Rig 規格與 AI 貼圖提示詞產線）均在進行中。使用者共識是尋找可低成本量產百名武將、可商用、AI 可參與且品質穩定的 2D 管線；偏好 Q 版。面片／節點原型仍需修正武器錨點、角色部件銜接、攻擊方向與動作流暢度；先前 DragonBones/LoongBones 僅作技術與參數研究。未取得 Cocos runtime 可播放且畫面驗收通過的證據，不要宣稱原型完成。
- **UI 與美術量產**：戰場 UI 規格、portrait/icon/card art/fallback、BattleScene capture、style profile、人物/命鏡視覺契約、血脈/虎符、ArtRecipe、Golden Preview、正式框體與 UI runtime QA 持續中；需依任務卡流程補齊 family/content/skin/smoke/docs 證據。
- **開場／培育／資料流程**：`PROG-1` 尚有繼承、開場流程/設定、倒數、抽卡、屬性面板與整合驗證；`PROG-2` 有 Scene Quality Pipeline、scene-director metadata、HTML fallback 清理、關係/readiness、Web build，以及多筆實機驗收卡；`DC-6-0012` 是 LineageSeedStore 滅絕血脈種子保存。
- **戰法與奧義**：`SYS-SKILL-TAC-0001..0006` 涵蓋投射、增益治療減益、位移棋盤、反應連鎖、場景障礙及量產驗收；`SYS-SKILL-ULT-0001..0008` 涵蓋自身爆發、隊伍增益/回復、敵方減益/傷害、範圍爆發與特殊規則。
- **ATM／治理工具**：`TASK-AAO-0092`（adapter 規格）與 `TASK-AAO-0101`（map formation）標為 blocked；AAO 另有 plugin/shadow、tasks.ts 拆分、MRP atomization、registry/route/runner/claim guard 等進行中或待辦；`TASK-DGB-0007/0010` 是 scope/dirty-tree validator 與 upgrade/rollback 驗證。MAO、TEAM 尚有 planned 的 runner 發佈/提交/恢復、跨供應商 agent orchestration、permission、observability、Claude/Gemini bridges 等工作；HARN 尚有 capability boundary、collaboration 規則、效能閘門與 UI-QA pilot。

## 161 項未結 ID 清單（按狀態）
- **blocked (2)**：`TASK-AAO-0092`, `TASK-AAO-0101`。
- **in-progress (39)**：`BAT-1-0001`, `PROG-2-0013`, `PROG-2-0015`, `PROG-2-0017`, `PROG-2-0022`, `SYS-1-0001`, `TASK-AAO-0093`, `TASK-AAO-0095`, `TASK-AAO-0097`, `TASK-AAO-0098`, `TASK-AAO-0099`, `TASK-AAO-0100`, `TASK-AAO-0114`, `TASK-AAO-0116`, `UI-1-0017`, `UI-2-0026`, `UI-2-0027`, `UI-2-0028`, `UI-2-0029`, `UI-2-0030`, `UI-2-0031`, `UI-2-0035`, `UI-2-0037`, `UI-2-0038`, `UI-2-0039`, `UI-2-0040`, `UI-2-0044`, `UI-2-0045`, `UI-2-0046`, `UI-2-0053`, `UI-2-0054`, `UI-2-0057`, `UI-2-0077`, `UI-2-0084`, `UI-2-0087`, `UI-2-0089`, `UI-2-0093`, `UI-2-0108`, `UI-2-0109`。
- **in_progress (1)**：`TASK-AAO-0157`（manifest 狀態拼法需正規化）。
- **in-review (5)**：`UI-2-0032`, `UI-2-0094`, `UI-2-0095`, `UI-2-0096`, `UI-2-0097`。
- **not-started (1)**：`UI-1-0004`。
- **planned (32)**：`TASK-AAO-0104`, `TASK-AAO-0158`, `TASK-AAO-0159`, `TASK-AAO-0160`, `TASK-MAO-0014`, `TASK-MAO-0015`, `TASK-MAO-0016`, `TASK-MAO-0017`, `TASK-MAO-0018`, `TASK-MAO-0019`, `TASK-MAO-0020`, `TASK-MAO-0021`, `TASK-MAO-0022`, `TASK-MAO-0043`, `TASK-MAO-0044`, `TASK-MAO-0045`, `TASK-MAO-0046`, `TASK-MAO-0047`, `TASK-MAO-0048`, `TASK-TEAM-0037`, `TASK-TEAM-0038`, `TASK-TEAM-0039`, `TASK-TEAM-0040`, `TASK-TEAM-0041`, `TASK-TEAM-0042`, `TASK-TEAM-0043`, `TASK-TEAM-0044`, `TASK-TEAM-0045`, `TASK-TEAM-0072`, `TASK-TEAM-0073`, `TASK-TEAM-0074`, `TASK-TEAM-0076`。
- **open (81)**：`DC-6-0012`, `HARN-GOV-0001`, `HARN-GOV-0002`, `HARN-PERF-0001`, `HARN-PILOT-0003`, `PROG-1-0003`, `PROG-1-0004`, `PROG-1-0006`, `PROG-1-0007`, `PROG-1-0008`, `PROG-1-0009`, `PROG-1-0011`, `PROG-1-0012`, `PROG-1-0013`, `PROG-1-0014`, `PROG-1-0015`, `PROG-1-0016`, `PROG-2-0007`, `PROG-2-0012`, `PROG-2-0014`, `PROG-2-0016`, `SYS-SKILL-CORE-0001`, `SYS-SKILL-TAC-0001`, `SYS-SKILL-TAC-0002`, `SYS-SKILL-TAC-0003`, `SYS-SKILL-TAC-0004`, `SYS-SKILL-TAC-0005`, `SYS-SKILL-TAC-0006`, `SYS-SKILL-ULT-0001`, `SYS-SKILL-ULT-0002`, `SYS-SKILL-ULT-0003`, `SYS-SKILL-ULT-0004`, `SYS-SKILL-ULT-0005`, `SYS-SKILL-ULT-0006`, `SYS-SKILL-ULT-0007`, `SYS-SKILL-ULT-0008`, `TASK-AAO-0096`, `TASK-AAO-0102`, `TASK-AAO-0105`, `TASK-AAO-0107`, `TASK-AAO-0108`, `TASK-AAO-0109`, `TASK-AAO-0110`, `TASK-AAO-0117`, `TASK-AAO-0118`, `TASK-AAO-0119`, `TASK-AAO-0122`, `TASK-AAO-0123`, `TASK-AAO-0125`, `TASK-AAO-0126`, `TASK-AAO-0128`, `TASK-AAO-0130`, `TASK-AAO-0131`, `TASK-AAO-0132`, `UI-2-0041`, `UI-2-0042`, `UI-2-0066`, `UI-2-0067`, `UI-2-0068`, `UI-2-0069`, `UI-2-0070`, `UI-2-0071`, `UI-2-0072`, `UI-2-0078`, `UI-2-0079`, `UI-2-0081`, `UI-2-0082`, `UI-2-0085`, `UI-2-0086`, `UI-2-0088`, `UI-2-0091`, `UI-2-0092`, `UI-2-0098`, `UI-2-0099`, `UI-2-0100`, `UI-2-0102`, `UI-2-0103`, `UI-2-0104`, `UI-2-0105`, `UI-2-0106`, `UI-2-0111`。

## 另外需接續核對的項目
- 遠端索引的 `TASK-UI-9001`（in-progress）和草稿 PR #689：本輪只做 WBS 盤點，未重查 PR 最新 CI/review；接手後應先核實任務卡是否已移位、PR 是否仍 draft、必要檢查與正式交付證據，再決定後續動作，不要自行合併 master。
- `TASK-TEAM-0088`：先前使用者已明確同意釋放舊租約；本機 ATM history 仍是髒狀態且含 running/active 歷史。先對照 ATM canonical lease/event 證據確認釋放是否已正式完成，勿僅憑歷史快照宣告收工。
- 所有新認領照 repo `AGENTS.md`：採用身份、依 ATM 路由、先 check/lock 任務卡，再更新狀態；完成後依流程附證據、解鎖並開 PR。不要把上述快照當作接卡或驗收授權。
