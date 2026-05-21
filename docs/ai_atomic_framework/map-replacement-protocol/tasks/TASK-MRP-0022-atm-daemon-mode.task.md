---
doc_id: doc_other_0163
task_id: TASK-MRP-0022
title: ATM Daemon Mode（背景守護進程）
milestone: M22
status: done
started_at: 2026-05-21T04:40:00Z
started_by_agent: ClaudeCode_haiku-4.5
completed_at: 2026-05-21T05:10:00Z
blocked_by: [TASK-MRP-0011, TASK-MRP-0026, TASK-MRP-0027]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0022 — ATM Daemon Mode（背景守護進程）

## 目標

解決 ATM 最痛的使用體驗問題：**每次改動代碼，都要手動跑 police gate 才知道有沒有違規**。

ATM Daemon 作為常駐後台進程，監聽 atom 和 map 相關檔案的變動，自動觸發對應的 police gate 驗證，即時通知違規——不需要人工記得跑指令。

---

## 解決的痛點

| 現況 | Daemon 後 |
|------|-----------|
| 改完 atom 忘記跑 police → silent violation | 任何 atom 檔案儲存 → 30 秒內自動觸發 |
| CI 才發現 fingerprint drift | 本機立即通知 |
| Guide session 建議後沒有主動提醒跟進 | Daemon heartbeat 定期 check 未完成任務 |

---

## ⚠️ 預設 OFF（必須使用者明確啟用）

Daemon 屬於高風險的長駐進程，**預設關閉**。使用者必須先明確啟用，且每個 repo 獨立啟用，不允許全域 auto-enable：

```bash
# 第一次必須先啟用 daemon 功能（寫入 .atm/runtime/feature-flags.json）
node atm.mjs daemon enable --json
# → { "enabled": true, "warning": "Daemon is opt-in for stability reasons. See M22 task card." }

# 未先 enable 就 start → 拒絕並提示
node atm.mjs daemon start --json
# → { "ok": false, "code": "ATM_DAEMON_NOT_ENABLED", "hint": "Run `node atm.mjs daemon enable` first." }
```

## CLI 設計

```bash
# 啟動 daemon（背景常駐，需先 enable）
node atm.mjs daemon start --json
# → { "pid": 12345, "watchPaths": ["atomic_workbench/**", "pipelines/**/*.py"], "status": "running" }

# 查看狀態
node atm.mjs daemon status --json
# → { "pid": 12345, "uptime": 3600, "lastCheckAt": "...", "violationCount": 0 }

# 停止 daemon
node atm.mjs daemon stop --json

# 查看最近 N 筆事件
node atm.mjs daemon log --tail 20 --json
```

---

## Daemon 行為規格

### Watch Targets

- `atomic_workbench/maps/**`（map.spec.json 改動 → fingerprint check）
- 每個 atom 的 source 檔案（police gate 觸發）
- `.atm/runtime/`（policy 改動 → 重新 load policy）

### Event → Action 映射

| 事件 | 觸發動作 |
|------|---------|
| atom source 檔案儲存 | `runPoliceGate` → 輸出 finding 到 daemon log |
| map.spec.json 改動 | fingerprint check（TASK-MRP-0011） |
| lineage-log.json 改動 | progression-policy check（TASK-MRP-0013） |
| `.atm/runtime/` 改動 | reload policy，不重啟 daemon |

### 通知方式（優先順序）

1. 終端機直接印出（attach 到啟動的 shell）
2. `.atm/daemon/notifications.jsonl`（append-only log）
3. OS notification（Phase 2，選配）

---

## 前置依賴

- TASK-MRP-0011（fingerprint monitor，daemon 會觸發此功能）

## 輸入

- `daemon.config.json`（watch paths、heartbeat interval）
- atom source files、map.spec.json

## 輸出

1. `node atm.mjs daemon start/stop/status/log` CLI
2. `.atm/daemon/daemon.pid`（PID 檔）
3. `.atm/daemon/notifications.jsonl`（事件記錄）
4. `schemas/daemon/daemon-config.schema.json`（新增）

## 驗收條件

- [ ] **預設 OFF**：未跑過 `daemon enable` 時，`daemon start` 拒絕並回傳 `ATM_DAEMON_NOT_ENABLED`
- [ ] `daemon enable` 寫入 `.atm/runtime/feature-flags.json`，重啟保持 enabled
- [ ] `daemon disable` 立即關閉 daemon 並清除 enable flag
- [ ] `daemon start` 後修改任意 atom source，30 秒內產出 police finding
- [ ] `daemon stop` 後不再觸發任何動作
- [ ] `daemon status` 正確回報 uptime 與最近事件
- [ ] map.spec.json 改動 → 自動觸發 fingerprint check
- [ ] daemon 意外終止後可用 `daemon start` 重啟（不會 double-start）
- [ ] `.atm/daemon/` 加入 `.gitignore`

## 影響檔案

- `packages/core/src/daemon/daemon-watcher.ts`（新增）
- `packages/core/src/cli/daemon.ts`（新增 `daemon` subcommand）
- `schemas/daemon/daemon-config.schema.json`（新增）
- `.atm/daemon/`（runtime dir，gitignored）
- `tests/daemon/daemon-watcher.test.ts`（新增）

## 穩定性護欄（必須先設計）

Daemon 是長駐進程，最容易讓 ATM 自身腐壞。以下護欄為**驗收必備**，不只是 nice-to-have：

| 風險 | 護欄 |
|------|------|
| Daemon crash 後使用者不知道 | `daemon status` 必須顯示真實 health；checksum 比對 PID 檔指向的 process 是否真是 ATM daemon（INV-RESCUE-009） |
| Daemon 與手動指令 race condition | 任何 mutation 必須走 `.atm/runtime/atm.lock`（檔案鎖）；daemon 自動 release |
| Daemon 寫亂 `.atm/runtime/` | daemon **永遠不直接寫 runtime/**，只寫 `.atm/daemon/notifications.jsonl`（append-only） |
| Daemon 失效但使用者以為驗證了 | 啟動 daemon 時必須通過 Rescue Police（M26）健康檢查，失敗則拒絕啟動 |
| 重大事件 daemon 漏掉 | 設計成「無 daemon 也可手動跑同樣檢查」，daemon 只是加速，不是唯一管道 |

## Kill Switch（緊急停用）

```bash
# 全域停用 daemon（即使啟動也立即退出）
node atm.mjs daemon disable --json
# → 寫入 .atm/runtime/daemon-disabled.flag
# → 之後 daemon start 直接拒絕

# 恢復
node atm.mjs daemon enable --json
```

## 回滾策略

**Level 1（軟回滾）**：`daemon disable` → 立即停止行為，保留所有檔案，可重新啟用。

**Level 2（移除功能）**：移除 `daemon.ts` 與 `daemon-watcher.ts`；刪除 `.atm/daemon/` 目錄；schema 移除。現有 police gate 和 fingerprint check 不受影響（因為 daemon 只是觸發器）。

**Level 3（災難恢復）**：如果 daemon 寫亂了 capsule registry 或 lineage-log，使用 TASK-MRP-0027 的 `rescue rebuild-registry` 或 `rescue replay-lineage` 還原。

## 2026-05-21 v2-r2 審查補充

- Daemon 必須晚於 M26 Rescue Police 與 M27 Disaster Recovery；否則背景流程損壞時沒有可靠救援路徑。
- 預設只能 read-only advisory，不得自動 mutate registry、map.spec 或 evidence。
- 必須具備 kill switch、single instance lock、debounce、event queue、crash recovery。
- 每個 event action 都需輸出 machine-readable finding，並標明 `action: advisory | block | route-to-rescue`。

新增驗收：
- [ ] Rescue Police critical finding 存在時 daemon start 被拒絕
- [ ] daemon 無 human command 時不會寫入 governed state
- [ ] kill switch 啟用後 daemon start/status 行為穩定
- [ ] duplicate start 不會產生第二個 watcher

## Checklist

- [ ] file watcher 實作（chokidar 或 fs.watch）
- [ ] event → action routing
- [ ] daemon start/stop/status/log CLI
- [ ] PID 管理（防 double-start）
- [ ] daemon.config.json schema
- [ ] notifications.jsonl append-only writer
- [ ] .gitignore 更新
- [ ] CHANGELOG 補記
