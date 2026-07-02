# 內部人員交易報表轉媒體儲存系統
## 版本異動摘要 Change Log

## 2026-07-02：Agent Team 文件升版批次

本次新增 Agent Team 計畫書 v1.0，並將三份核心文件、任務卡 README、45 張任務卡與產卡模板同步到同一套 Agent Team 協作與簽核邊界。PDF 不在本次更新範圍，`tasks.zip` 也不重新打包。

## 新增

| 異動 | 併入文件 / 章節或任務卡 |
| --- | --- |
| 新增《Agent Team 計畫書 v1.0》，定義本任務 Agent Team 協作 source of truth。 | `內部人員交易報表轉媒體儲存系統_Agent Team計畫書.md` |
| 新增 Agent 角色：Captain / Coordinator、Implementer、Security / Permission、Audit / Evidence、QA / Validation、Reviewer。 | Agent Team 計畫書 §3 |
| 新增 M5-01 下載閘道與 M5-02 動態浮水印的 Agent 派工範例。 | Agent Team 計畫書 §4、§5 |
| 新增 Agent 違規阻擋機制：任務卡 scope、Permission Broker、lease / fencing、tool sandbox、validator / reviewer、closure gate。 | Agent Team 計畫書 §8 |
| 新增 ADR-011「Agent Team 自動決策、人類簽核與違規阻擋邊界」。 | `決策紀錄樣板ADR.md` §14 |
| 新增本 Change Log 文件，供各計畫書引用。 | `版本異動摘要ChangeLog.md` |

## 修改

| 異動 | 併入文件 / 章節或任務卡 |
| --- | --- |
| 《系統架構與治理計畫書》由 v1.3 升版為 v1.4。 | `系統架構與治理計畫書.md` 標題 |
| 加入文件權威順序：架構以系統架構文件為準，Agent Team 協作以 Agent Team 計畫書為準，功能拆解以功能里程碑與任務卡為準，決策以 ADR 為準。 | `系統架構與治理計畫書.md` §1 |
| 新增 Agent Team 相關附錄，說明協作、違規阻擋與簽核邊界。 | `系統架構與治理計畫書.md` 附錄 H |
| 《功能里程碑計畫》由 v1.0 升版為 v1.1。 | `功能里程碑計畫.md` 標題 |
| 第 0 章新增任務卡派工需依 Agent Team 計畫書 v1.0。 | `功能里程碑計畫.md` §0 |
| M5、M7、M8、M9 的驗收補強 reviewer、human sign-off 與 ADR gate 引用。 | `功能里程碑計畫.md` M5 / M7 / M8 / M9 |
| 《ADR / 決策紀錄》由 v1.0 升版為 v1.1，Top 10 擴充為 Top 11。 | `決策紀錄樣板ADR.md` §3、§15 |
| `tasks/README.md` 新增 Agent Team 派工契約。 | `tasks/README.md` |
| 45 張 `TASK-RPT-*` 任務卡新增 `agent_team_plan` frontmatter 與統一 Implementation Contract。 | `docs/ReportDemo/tasks/TASK-RPT-*.task.md` |
| 產卡模板同步新增 Agent Team 引用，避免重新產卡時遺失。 | `docs/ReportDemo/tools/generate_reportdemo_task_cards.py` |

## 刪除或取代

| 舊說法 / 舊假設 | 新說法 / 取代方式 |
| --- | --- |
| 「人類原則上不需要介入」 | 已 superseded。改為「隊長 AI 可自動處理低風險、可回復、已有規則的執行決策；資安、稽核、資料、正式切換與架構決策必須人類或 ADR 簽核」。 |
| Agent Team 可能依賴 `3KLife` 或 `AI-Atomic-Framework` 的 runtime。 | 已取代。Agent Team 計畫書明確聲明本任務與上述 repo 沒有執行依賴。 |
| 任務卡只列 validators，未明確要求 Agent role / reviewer / human gate。 | 已取代。任務卡與 README 需檢查 role、reviewer、validator、human sign-off 與 ADR gate。 |

## 改列 ADR 或人類簽核

下列事項不得由 Agent Team 自動決定，需人類簽核或 ADR：

* DB 最終選型與 Shadow DB 升格主庫。
* 舊系統正式基準、並行期限與下線條件。
* AD / LDAPS / OIDC / SAML、API session、MFA 與 signed URL 策略。
* PDF library 商用授權、數位簽章、timestamp 與 PDF 長期驗證需求。
* Golden Dataset 與正式資料 Shadow Validation 使用邊界。
* 權限模型、Admin 職責分離、Data Scope 與 break-glass。
* 稽核 fail-closed、hash chain 範圍、WORM / immutable 保存。
* Object Storage、NAS、WORM 與保存年限。
* Pilot、Go / No-Go、rollback window 與舊系統下線。
