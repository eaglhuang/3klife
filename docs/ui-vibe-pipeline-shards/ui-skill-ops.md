# UI Vibe Pipeline — Skill 與分工（§7 · When to Use · Procedure · References · §8–§9）

> 這是 `UI-vibe-pipeline.md` 的「Skill 與分工（§7 · When to Use · Procedure · References · §8–§9）」分片。完整索引見 `docs/ui/UI-vibe-pipeline.md`。

## 7. Skill 藍圖

### 7.1 Workspace Skill 藍圖

建議放在：

```text
.github/skills/ui-vibe-pipeline/
  SKILL.md
  references/
    pipeline.md
    checklists.md
    json-contracts.md
  assets/
    layout.example.json
    skin.example.json
    screen.example.json
    ui-task-template.md
```

#### `SKILL.md` 範例

```md
---
name: ui-vibe-pipeline
description: 'UI 自動化生產總控 SKILL — 從 UI 示意圖、參考圖、Figma snapshot 或既有頁面經驗啟動，串接參考圖分解、UCUF family/recipe 收斂、任務卡與文件產出、ui-spec 與 Panel scaffold、靜態驗證、Browser QA 自動調整，直到交付人類驗收。'
argument-hint: '提供 proofSource 或 screenId，說明風格、參考頁面，以及是否要自動產 task card / 文件 / scaffold / Browser QA。'
user-invocable: true
disable-model-invocation: false
---

# UI Vibe Pipeline

## When to Use
- Start a new UI screen directly from a reference image or Figma snapshot
- Orchestrate proof decomposition, UCUF convergence, task card/docs generation, scaffold, validation, and browser QA
- Mass-produce UI screens while keeping the workflow image-first and verification-first

## Procedure
1. Ingest a proof source and decompose it into a proof draft.
2. Use UCUF family rules and unresolved notes to generate MCQ only where needed.
3. Produce normalized recipe, task card, brief, and review/runtime skeletons.
4. Scaffold `layout / skin / screen` plus Panel framework.
5. Run strict validation before any visual QA.
6. Capture Browser QA, adjust the screen, and stop at human acceptance handoff.

## References
- [Pipeline](./references/pipeline.md)
- [Checklists](./references/checklists.md)
- [JSON Contracts](./references/json-contracts.md)
```
```

### 7.2 User-level Skill 藍圖

個人全域版 skill 只保留跨專案共通能力，不綁 repo 細節。

建議位置：

```text
~/.copilot/skills/ui-vibe-pipeline/
  SKILL.md
  references/
    nine-slice-rules.md
    atlas-strategy.md
    ai-asset-input-spec.md
```

#### User-level `SKILL.md` 範例

```md
---
name: ui-vibe-pipeline
description: 'Use for UI layout JSON design, skin manifests, 9-slice rules, atlas planning, AI art input specs, preview workflow, and repeatable UI production across projects.'
argument-hint: 'Describe the screen type and whether you need layout, atlas policy, or preview review.'
user-invocable: true
disable-model-invocation: false
---

# Cross-project UI Vibe Pipeline

## Use this skill when
- You need a repeatable UI production workflow
- You need 9-slice safe asset rules
- You need atlas grouping guidance
- You need AI-ready art generation constraints

## Do not use this skill when
- The task is a one-off runtime bug unrelated to UI production
- The task is only about editing a single prefab manually
```
```

---

## 8. Optional Custom Agent 藍圖

如果未來你希望把「畫面審查」獨立成另一個角色，可以再做 custom agent。

建議檔名：

```text
.github/agents/ui-preview-reviewer.agent.md
```

範例：

```md
---
name: ui-preview-reviewer
description: Review Cocos UI screen specs, skin manifests, atlas grouping, 9-slice correctness, and likely layout drift risks before implementation.
model: GPT-5.4
---

You are a review-focused UI planning agent.

Tasks:
1. Read UI spec, layout spec, and skin manifest.
2. Flag inconsistent atlas grouping.
3. Flag 9-slice border risks.
4. Flag likely overflow or touch-target issues.
5. Return a concise review checklist and risk list.
```
```

---

## 9. AI 與人類分工

### AI 負責

1. 依規格產出 layout spec 草案
2. 依畫面需求產出 skin manifest 草案
3. 依 Cocos 架構產生預覽生成器使用範例
4. 檢查 atlas 分組與命名規則
5. 檢查 state sprite 是否齊全
6. 檢查 UI 文字是否可能溢出

### 美術負責

1. 視覺方向與風格決策
2. 九宮格框體的四邊界確認
3. 特殊字體與材質風格
4. 最終審美判斷

### 工程負責

1. 建立 UISpec loader / preview builder / validation runner
2. 整合 UIManager, UIConfig, ResourceManager
3. 建立 atlas policy 與 build 前驗證
4. 建立 Cocos 預覽流程與匯入流程

---
