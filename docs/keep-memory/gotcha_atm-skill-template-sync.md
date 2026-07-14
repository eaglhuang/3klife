---
name: gotcha-atm-skill-template-sync
description: 改 .agents/skills/ 安裝副本必查 templates/skills/ 源頭模板，否則重裝洗掉修改
type: gotcha
updated: 2026-07-13
repo: AI-Atomic-Framework
status: active
---

# skill 分發鏈：安裝副本 vs 源頭模板

AAF 的 skill 分發鏈：`templates/skills/*.skill.md`（源頭，schemaId
atm.skillTemplate）→ `integration add <vendor>` 編譯展開 → 各 repo 的
`.agents/skills/`、`.claude/skills/` 等**安裝副本**。

**陷阱**（TASK-AAO-FABLE-006/009 實例）：只改安裝副本時，源頭模板沒同步，
(a) 其他 adopter 永遠裝不到修改，(b) 本地副本比模板新，下次重裝反而把修改
**洗掉**。

守則：
- 改 `.agents/skills/<id>/SKILL.md` 時，必查 `templates/skills/<id>.skill.md`
  是否需要同 commit 等價同步；驗證跑 `npm run validate:skill-templates`。
- 新 skill 兩邊同 commit 落地，且把 id 加進 validator 的 requiredTemplateIds。
- `templates/` 目錄被 gitignore 但檔案 tracked——staging 用 `git add -u`，
  不能用普通 `git add`（會被 ignore 規則拒絕）。
- 尚無「安裝副本 vs 模板 drift」自動巡邏（TASK-AAO-FABLE-010 planned）。
