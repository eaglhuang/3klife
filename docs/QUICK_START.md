<!-- doc_id: doc_other_0099 -->
# ATM Quick Start

這份 Quick Start 對齊 `ATM-5-0001`，目標是用最短路徑重放 ATM 的核心治理驗證。

## 1) 前置需求

- Node.js 20+（建議 LTS）
- npm 10+

## 2) 安裝

```bash
npm ci
```

## 3) 10 分鐘 smoke（本 tracking repo）

```bash
node tools_node/sync-atm-stabilization-milestone.js --check --strict
node tools_node/rebuild-tasks-atm-auto-parts.js
npm.cmd run validate:atm-task-store
npm run validate:rule-guard-read-only
npm run validate:registry-backfill-sweep
```

預期：三個 task-store 命令與兩個 validator 都回傳 `status=pass` 或等價的 `passed=true`。

補充：`--check --strict` 為 check-only 模式，不會寫入任何檔案。

## 4) 30 分鐘 hello-world（上游 standalone repo）

如果你在上游 `AI-Atomic-Framework` repo，使用以下流程：

```bash
npm ci
npm run validate:bootstrap
npm run validate:self-hosting-alpha
atm init --adopt
atm test --atom hello-world
```

目標：在不依賴 3KLife / Cocos 的前提下跑通 hello-world。

## 5) 30 分鐘 evidence replay（本 tracking repo，M1 + M2）

```bash
npm run validate:usage-evidence-shadow
npm run validate:h2u-evolution-pilot
```

預期：

- `validate:usage-evidence-shadow`：strict/lenient 檢查皆通過
- `validate:h2u-evolution-pilot`：proposal/decision hash chain 通過

## 6) 任務卡最小流程（鎖卡）

```bash
node tools_node/task-lock.js check ATM-5-0001
node tools_node/task-lock.js lock ATM-5-0001 <agent-name>
node tools_node/task-lock.js unlock ATM-5-0001 <agent-name>
```

## 7) 下一步

- API 介面與指令細節：`docs/API.md`
- 任務卡/分片規格與狀態機：`docs/SPEC_GUIDE.md`
