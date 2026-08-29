---
doc_id: pending
title: Agent Mailbox 最小治理通訊計畫書
status: active
family_dir: agent-mailbox
createdByCommand: atm plan doc create
---

# Agent Mailbox 最小治理通訊計畫書

## 規劃權威

- Planning repository: `C:/Users/User/3KLife/docs/ai_atomic_framework`
- Target and closure repository: `C:/Users/User/AI-Atomic-Framework`
- Registered series: `MBX` / `TASK-MBX`

## 第一性原理決策

獨立 Editor 對話群要安全交換訊息，只需要五個原語：唯一收件地址、可辨識的收件者身分、完成才可見的原子投遞、可決定的收件列舉，以及可追蹤的處理完成。共用檔案系統已提供持久化與人工檢視能力，因此第一版是檔案協議，不是服務。

協議是原生對話群直連不存在時的可攜路由，包含 Cursor 的不同對話群。當同一 Editor 有原生直連時，原生功能仍是優先路徑；信箱不取代、不鏡像原生訊息，但保留為明確的可攜後備。

## 範圍

- 可設定的共用信箱根目錄與固定地址格式：`atm-mail://<host>/<editor>/<session>`。
- 對話群以 `register` 註冊後取得私有目錄與 `identity.md` 草稿；註冊為冪等且不覆寫既有自述。該對話群可自行補充文件中的 AI 角色、任務與職權範圍；machine-readable front matter 固定記錄地址、opaque `editor` 與 `sessionId`，讓其他對話群可先認識收件者再聯絡。
- 每個私有目錄固定只有 `new/`、`going/`、`done/` 三個信件子目錄；不建立中央參與者 registry。
- 具 machine-readable front matter 的 Markdown 訊息；檔名為 UTC 日期時間、寄件者單調流水號與 opaque message id，例如 `20260829T133830441Z-000042-msg-7fa2.md`。寄件者先以 `.partial` 建立後再 atomic rename 發布到 `new/`。
- 收件者用 atomic move 將信件由 `new/` 領取至 `going/`；處理完成後移至 `done/`，保留原檔名以供人工追蹤。訊息內容仍只作 context，不是執行授權。
- 一份通用的 onboarding skill：新對話群依序註冊、補完自我身分、唯讀認識既有同儕、選擇地址並在允許邊界檢查收件匣；先投影到 Claude Code、Codex、Cursor、Antigravity。
- `peers`／`identity show` 對信箱根目錄下的 `identity.md` 做唯讀、容錯掃描，產生即時同儕名冊；它不是持久化的中央 registry。
- `retire` 是對話群的退出工具：只在 `new/` 與 `going/` 均為空時，把 identity 標記為 `retired` 並保留 `done/` 歷史。寄信與活躍同儕名冊必須排除 retired 地址。
- 驗證地址隔離、完整目錄建立、身份草稿與自述保留、同儕名冊、未完成投遞排除、一次處理、跨 Editor 互通與無授權邊界。

## 明確非目標

- 重做或鏡像原生同 Editor 訊息功能。
- daemon、輪詢服務、桌面通知、MCP server、A2A endpoint、雲端傳輸或跨主機探索。
- 訊息、身分文件、同儕名冊或退出事件觸發的自動改碼、任務 claim、lock、commit 或派工。
- 第二套 ATM task、actor 或 AtomicRegistry lifecycle。
- 修改現有 captain/worker dispatch mailbox；它的 queue 與 stop-loss 語義是不同問題。

## 協議邊界

`editor` 是 opaque metadata，不是 allowlist。加入 Cursor、Antigravity 或未來 Editor，只需要同一份通用 adapter projection 與新對話群註冊；核心協議不可依產品名稱分支。

訊息可攜帶 `taskId`、`scope` 與 evidence reference 作為 context，不能授予權限；接收 Agent 在任何 mutation 前仍須獨立執行適用的 ATM route。

## 投遞序列

1. 新對話群執行 `register <editor> <session>`；工具建立 `identity.md` 草稿與 `new/going/done/`，並回傳地址。既有地址的重複註冊只能驗證，不能覆寫自述。
2. 對話群補完自己的角色、任務與職權範圍後，透過 `peers` 讀取其他有效 `identity.md` 的公開資料；技能提示它選擇合適對象與地址，但不替它自動派工。
3. 寄件者先讀取收件者的 `identity.md` 以確認角色、任務與職權範圍，再把 Markdown 訊息以帶有 UTC 時間與流水號的暫存檔寫入 `new/`，最後 atomic rename 發布。
4. 收件者只列舉 `new/` 的最終檔，逐封 atomic move 到 `going/` 後處理；成功後移到 `done/`。回覆是帶有 `inReplyTo` 的新訊息，不建立背景迴圈。
5. 對話群退出前先清空或完成 `new/going` 的信件；再執行 `retire`。工具只標記 retired、保留 identity 與 `done/`，不刪除目錄；未來 `peers` 預設不再提供該地址作為可投遞對象。

## 分期任務卡

| Phase | 任務卡 | 依賴 | 產出 |
| --- | --- | --- | --- |
| 1 | `TASK-MBX-0001` | 無 | editor-neutral 協議、CLI、生命週期測試與 map。 |
| 2 | `TASK-MBX-0006` | 0001 | 身分文件、`new/going/done` 狀態轉移與可排序信件名稱。 |
| 3 | `TASK-MBX-0002` | 0001、0006 | 單一 source template 與 Claude Code／Codex projection。 |
| 4A | `TASK-MBX-0003` | 0002 | Cursor projection；即使同 Editor 沒有原生對話群直連也可收發。 |
| 4B | `TASK-MBX-0004` | 0002 | Antigravity projection；沿用同一 opaque `editor` contract。 |
| 5 | `TASK-MBX-0005` | 0003、0004 | 多 Editor 互通、信件生命週期與「訊息不是授權」的端到端驗證。 |

`TASK-MBX-0003` 與 `TASK-MBX-0004` 可平行。未來 Editor 不預先建立空白卡；它們在需要時複製 0003／0004 的投影契約並新增一張同系列卡，不改核心協議。

## 回復

每張卡可獨立 revert。移除 adapter projection 只停止後續檢查，保留使用者建立的信箱檔案；移除核心協議只移除 framework code 與 tests，絕不刪除使用者的 mailbox root。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-08-29T10:40:48.641Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"agent-mailbox/agent-mailbox-plan.md","contentDigest":"sha256:127e6f467e1bdf41a1b01248ef86f717d3f1d05efb30ba4f13b5a01baa490b81"} -->
