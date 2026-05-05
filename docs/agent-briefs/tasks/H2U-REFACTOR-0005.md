---
doc_id: doc_task_0228
id: "H2U-REFACTOR-0005"
priority: "P2"
owner: "Unassigned"
status: "open"
type: "documentation"
phase: "G"
created: "2026-05-05"
created_by_agent: "ClaudeCode_claude-sonnet-4-6"
related_cards: []
depends: []
notes: "2026-05-05 | 狀態: open | 來源: html_skill_postmortem (doc_other_0026) §C3 | 阻塞: 無"
---

# [H2U-REFACTOR-0005] 整併 5 份 plan 文件

## 開單原因

`docs/html_skill_plan.md`、`plan2.md`、`plan3.md`、`plan4.md`、`plan5.md` 5 份計劃並列。SKILL.md 雖有「優先順序」段落但無強制；新 agent 第一次接觸極易誤讀 plan2 為 active spec。已造成的歷史問題見 postmortem §C3。

## INPUT_CONTRACT

- 5 份 plan 文件當前並存
- plan5.md 是 active execution spec
- SKILL.md 已知標明優先順序但缺 disclaimer
- `docs/html_skill_postmortem.md` 已建立（doc_other_0026），可作為單一 onboarding 入口

## OUTPUT_CONTRACT

- [ ] 在 `plan.md` / `plan2.md` / `plan3.md` / `plan4.md` 的 frontmatter 加 `[HISTORICAL]` 標記與導向 plan5.md 的指引
- [ ] `plan5.md` 加 `[ACTIVE]` 標記
- [ ] `.github/skills/html-to-ucuf/SKILL.md` 開頭加 prominent disclaimer：「Active spec is plan5.md. Older plans are HISTORICAL — do not follow without consulting postmortem.md.」
- [ ] `docs/keep.summary.md` 同步更新（若有提及 plan 文件）
- [ ] 驗證舊 plan 中的 deep-link 不被破壞（已有引用 plan2~4 的文件需更新或保留）
- [ ] 不刪除 plan2~4 的內容，只加 frontmatter 與 disclaimer

## VALIDATION_CMD

```bash
# 1. frontmatter 標記到位
head -10 docs/html_skill_plan.md docs/html_skill_plan2.md docs/html_skill_plan3.md docs/html_skill_plan4.md docs/html_skill_plan5.md
# 期望前 4 個含 [HISTORICAL]，第 5 個含 [ACTIVE]

# 2. SKILL.md disclaimer
head -30 .github/skills/html-to-ucuf/SKILL.md
# 期望開頭有 disclaimer 區塊

# 3. broken link check
grep -rn "html_skill_plan[2-4]" docs/ --include="*.md" | grep -v "html_skill_postmortem\|html_skill_plan[2-4].md:"
# 期望: 引用都還可解析

# 4. encoding gate
node tools_node/compute-gate.js --gates encoding --agent-feedback
```

## ROLLBACK_HINT

```bash
git checkout docs/html_skill_plan.md docs/html_skill_plan2.md docs/html_skill_plan3.md docs/html_skill_plan4.md docs/html_skill_plan5.md .github/skills/html-to-ucuf/SKILL.md
```

## 建議作法

1. 先 grep `html_skill_plan[2-4]` 看哪些其他文件引用這些舊 plan
2. 在 plan2~4 加 frontmatter（不刪內容）：
   ```yaml
   ---
   status: HISTORICAL
   superseded_by: docs/html_skill_plan5.md
   onboarding_doc: docs/html_skill_postmortem.md
   ---
   ```
3. plan5.md 加 frontmatter `status: ACTIVE`
4. SKILL.md 第一行下面加 callout：
   ```markdown
   > **⚠️ Spec Authority**: `docs/html_skill_plan5.md` 為唯一 active spec。
   > 若需了解規則漂移歷史，讀 `docs/html_skill_postmortem.md`（doc_other_0026）。
   > `plan.md` ~ `plan4.md` 為 HISTORICAL，禁止當實作依據。
   ```
5. 跑 broken link check 確認沒有破連結

## 交付物

- `docs/html_skill_plan.md`（加 HISTORICAL frontmatter）
- `docs/html_skill_plan2.md`（加 HISTORICAL frontmatter）
- `docs/html_skill_plan3.md`（加 HISTORICAL frontmatter）
- `docs/html_skill_plan4.md`（加 HISTORICAL frontmatter）
- `docs/html_skill_plan5.md`（加 ACTIVE frontmatter）
- `.github/skills/html-to-ucuf/SKILL.md`（加 disclaimer）
- `docs/keep.summary.md`（若有需要同步）

## 估時

1-1.5 hours
