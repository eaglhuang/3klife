<!-- doc_id: doc_ai_0030 -->
# 3KLife — Claude Code Project Config

## 必經入口

先讀 [docs/agent-identity-map.md](docs/agent-identity-map.md)，用其中規則設定 `AGENT_IDENTITY` 與 git 身份，再執行後續 Pre-flight。

## ⛔ 硬規則 #0：接任務卡前必須先上鎖（不可省略）

**在動手執行任何任務卡之前，以下三步是硬前置，缺一不可：**

```bash
# Step 1: 確認無衝突
node tools_node/task-lock.js check <task-id>

# Step 2: 上鎖
node tools_node/task-lock.js lock <task-id> ClaudeCode_<model-name>

# Step 3: 更新任務卡 frontmatter（必須 commit 進去）
# status: in-progress
# started_at: <RFC3339 timestamp>
# started_by_agent: ClaudeCode_<model-name>
```

> ⚠️ **違反此規則視為無效操作**：即使工作已完成，若未先上鎖，任務卡視同未正式接手。
> 多個 Agent 同時運作時，未上鎖會造成衝突與重工。
> 完整規則見 `docs/agent-briefs/Readme.md (doc_ai_0023)` §鎖卡流程。

---

## Pre-flight（每次入場必做）

1. **讀 `docs/keep.summary.md (doc_index_0012)`**（Agent 共識摘要）
2. **執行計算型健康掃描**：
   ```bash
   node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop
   ```
3. **接任務卡前執行上鎖流程**（見硬規則 #0）

---

## Post-flight（收工前必做）

1. 執行完整閘門驗證：
   ```bash
   node tools_node/compute-gate.js --profile standard --agent-feedback
   ```
2. **解鎖任務卡**：
   ```bash
   node tools_node/task-lock.js unlock <task-id> ClaudeCode_<model-name>
   ```
3. 更新任務卡 `status: done` 並補寫 `notes`

---

## 完整協作規範

- 協作協議：`.github/instructions/agent-collaboration.instructions.md (doc_ai_0009)`
- 任務卡規則：`docs/agent-briefs/Readme.md (doc_ai_0023)`
- Agent 手冊：`docs/agent-briefs/agent1-instructions.md (doc_ai_0019)`
