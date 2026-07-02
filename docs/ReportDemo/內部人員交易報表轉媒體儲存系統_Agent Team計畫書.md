# 內部人員交易報表轉媒體儲存系統
## Agent Team 計畫書 v1.0

## 1. 文件定位

本文件是本任務 Agent Team 協作、派工、review、違規阻擋與人類決策邊界的最新 source of truth。後續任務卡派工、Agent 角色分配、reviewer 指派、validator 執行與 human / ADR gate 判定，均應以本文件為準。

本文件只服務 ReportDemo 計畫與後續實作派工，與 `3KLife` repo、`AI-Atomic-Framework` repo 或任何既有 Team Agents runtime 沒有執行依賴。上述 repo 可作為目前工作區、文件位置或概念參考，但不得被視為本任務 Agent Team 的必要執行平台。

系統架構與治理仍以《系統架構與治理計畫書》為架構 source of truth；功能拆解仍以《功能里程碑計畫》與任務卡為功能 source of truth；人類決策與正式取捨仍以《ADR / 決策紀錄》為決策 source of truth。

本文件修正「人類不需要介入」這類過度自動化表述。正式原則如下：

> 隊長 AI 可自動處理低風險、可回復、已有規則且不改變治理邊界的執行決策；涉及資安、稽核、資料、正式切換、權限模型、供應商與架構取捨者，必須由人類或 ADR 簽核。

## 2. 協作原則

* 保守穩定優先：任何自動化派工不得犧牲資料安全性、權限管理度與系統穩定度。
* 舊系統涵蓋優先：任務卡不得假設從零重寫；需先對照舊系統行為、輸入、輸出、例外與驗證基準。
* 權限最小化：Agent 只處理任務卡 scope 內檔案與操作，不得自行擴權。
* 證據導向：完成定義必須包含 command-backed evidence、review 記錄或可重跑驗證。
* 人類可監督：所有關鍵決策、例外處理與 gate 結果要能被人類讀懂、追蹤、覆核與否決。

## 3. Agent 角色與責任

| 角色 | 主要責任 | 不可自行決定 |
| --- | --- | --- |
| Captain / Coordinator | 任務切分、scope 控制、派工、風險升級、review routing、closure gate 彙整。 | 不得覆蓋資安、稽核、資料治理或 ADR 要求。 |
| Implementer Agent | 在任務卡 scope 內實作程式碼、migration、測試、文件與 implementation notes。 | 不得擴大資料權限、跳過 review、改變已簽核架構。 |
| Security / Permission Agent | 檢查 RBAC、Data Scope、下載閘道、break-glass、network/tool policy 與越權風險。 | 不得降低既有資安標準或把例外改成常態。 |
| Audit / Evidence Agent | 確認稽核事件、hash、log、evidence、closure report、fail-closed 條件。 | 不得接受沒有證據的完成聲明。 |
| QA / Validation Agent | 負責 Golden Dataset、Shadow Validation、新舊系統比對、回歸測試與差異報告。 | 不得使用未核准正式資料做一般開發或測試。 |
| Reviewer Agent | 獨立 review 設計、程式、測試與證據；blocking finding 可退回 rework。 | 不得自行放行安全或稽核衝突。 |

## 4. M5-01 下載閘道派工範例

| Agent | 輸入 | 輸出 | 完成定義 | 驗收方式 | Reviewer |
| --- | --- | --- | --- | --- | --- |
| Captain / Coordinator | M5-01 任務卡、M4 PDF metadata、M8 權限模型、ADR 狀態。 | 派工單、scope 邊界、依賴與 gate 清單。 | 下載閘道拆工完成，human / ADR gate 標示清楚。 | 檢查任務卡、依賴、風險與 reviewer 指派。 | 人類 PM / Tech Lead |
| Implementer Agent | 下載 API 契約、PDF 儲存介面、稽核寫入介面。 | Download Gateway 程式、短期下載 token、測試。 | 所有下載都必須經 Gateway，不得直接暴露儲存路徑。 | 單元測試、整合測試、權限測試、失敗案例測試。 | Reviewer Agent |
| Security / Permission Agent | RBAC、Data Scope、session / token 政策。 | 權限檢查報告、越權測試案例、需 ADR 項目。 | 未授權、跨部門、過期 token、重放攻擊均被拒絕。 | 權限矩陣測試與負向測試。 | Security Lead / Reviewer Agent |
| Audit / Evidence Agent | 稽核事件規格、download_id、hash 欄位。 | 下載稽核事件、log 分級、evidence 檢核。 | 每次下載具下載人、時間、IP、User-Agent、報表版本、hash 或查核碼。 | 稽核查詢、hash 檢核、log routing 檢查。 | Audit Lead / Reviewer Agent |
| QA / Validation Agent | Golden Dataset、測試帳號、舊系統下載案例。 | 新舊下載行為比對與回歸報告。 | 合法下載成功，非法下載被拒，錯誤訊息不洩漏敏感資訊。 | 自動化測試與人工抽核。 | QA Lead |

## 5. M5-02 動態浮水印派工範例

| Agent | 輸入 | 輸出 | 完成定義 | 驗收方式 | Reviewer |
| --- | --- | --- | --- | --- | --- |
| Captain / Coordinator | M5-02 任務卡、PDF 分級政策、PDF library ADR。 | 浮水印任務切分、密級對應與 gate 清單。 | 一般、機密、高機密處理差異明確。 | 檢查任務切分與 ADR 依賴。 | 人類 PM / Tech Lead |
| Implementer Agent | PDF 產製介面、下載人資訊、報表版本與查核碼規格。 | 動態浮水印、QR / 查核碼、下載副本 hash 程式與測試。 | 浮水印包含下載人、部門、時間、來源 IP、序號、報表版本。 | PDF 產物抽驗、中文字型、頁面旋轉、多頁報表測試。 | Reviewer Agent |
| Security / Permission Agent | 機密等級分類、PDF permission / encryption 政策。 | 浮水印繞過風險檢查與高機密控制建議。 | 文件不得宣稱 100% 防竄改；需以追蹤、嚇阻、竄改偵測與舉證為定位。 | 風險審查與高機密下載限制測試。 | Security Lead |
| Audit / Evidence Agent | Hash、timestamp、簽章、下載稽核欄位。 | 竄改偵測證據、查核碼反查流程與驗證報告。 | 外流文件可反查下載紀錄；簽章或 hash 異常可被偵測。 | hash 驗證、查核碼反查、稽核報表抽測。 | Audit Lead |
| QA / Validation Agent | Golden PDF、舊系統範例、跨平台 PDF 產出基準。 | Windows / Linux PDF 產出比對、效能與回歸報告。 | 大量產製不造成不可接受延遲，產物差異可解釋。 | 批次產生測試、視覺抽驗、效能測試。 | QA Lead |

## 6. 隊長 AI 可自動決定的範圍

隊長 AI 可在不改變治理邊界的前提下，自動決定下列事項：

* 任務卡內部的工作順序、子任務拆分與 Agent 初步分派。
* 低風險、可回復、已由文件明定的實作細節。
* 測試、lint、格式檢查、文件交叉引用與 evidence 收集方式。
* 明確不涉及正式資料、正式切換、權限升級或架構選型的文件修補。
* blocking issue 的初步分類與回報草案。

## 7. 必須人類或 ADR 簽核的範圍

下列事項不得由 Agent Team 自行決定，必須人類簽核或建立 ADR：

* DB 最終選型、Shadow DB 升格主庫、CDC / ETL / Outbox / 批次同步策略。
* PDF library 商用授權、數位簽章等級、PAdES-LTV 或 timestamp 採購。
* Object Storage、NAS、WORM / Immutable Archive 與保存年限政策。
* AD / LDAPS / OIDC / SAML、API session、token TTL、signed URL 與 MFA 策略。
* Golden Dataset 與正式資料 Shadow Validation 的使用邊界、脫敏方式與核准流程。
* Admin 角色、Role / Permission / Data Scope 模型、雙人覆核與 break-glass 權限。
* 稽核 fail-closed 邊界、hash chain 範圍、稽核資料隔離與保存政策。
* Pilot 範圍、Go / No-Go、rollback window、舊系統下線或長期並行。
* 任何與資安、稽核、法遵、正式資料、正式環境、供應商或跨系統架構有關的取捨。

## 8. 違規阻擋機制

Agent 違規或越權時，應由多層機制阻擋，而不是只依賴 Agent 自律：

* 任務卡 scope：每張卡定義可碰觸路徑、交付物、out-of-scope 與 non-goals。
* Permission Broker 概念：正式實作時，敏感操作需經統一授權介面，不讓 Agent 或服務直接繞過。
* lease / fencing：批次、轉檔、下載、稽核寫入等互斥操作需有租約或 fencing token，避免重複寫入與競態。
* tool sandbox：開發與 CI 階段限制網路、檔案、secret、正式資料與部署權限。
* validator / reviewer：自動測試、scope check、權限測試、稽核測試與獨立 review 必須通過。
* closure gate：未附 command-backed evidence、review 結論與 human / ADR gate 狀態者，不得標示完成。

第一版若尚未具備完整 runtime 阻擋機制，至少需用人工 review、CI scope check、command-backed evidence、任務卡簽核欄位與 closure checklist 補位。

## 9. 衝突處理

若 Agent 自動決策與資安、稽核、資料治理或既有 ADR 衝突，處理順序如下：

1. 立即停止相關變更擴散，不得以「已完成」或「低風險」理由繼續推進。
2. Captain / Coordinator 彙整衝突內容、受影響任務卡、已產生證據與 rollback 建議。
3. Security / Permission Agent 與 Audit / Evidence Agent 先做初步風險分級。
4. 若涉及正式資料、正式環境、權限升級、稽核完整性或架構取捨，升級人類簽核或 ADR。
5. 未取得決策前，任務卡維持 blocked 或 rework，不得進入 closure gate。

## 10. 任務卡使用規則

每張任務卡在正式派工前，至少需確認：

* `agent_team_plan` 已指向本文件。
* Agent role、reviewer、validator、human sign-off 與 ADR gate 已依風險標示。
* scopePaths、deliverables、outOfScope、nonGoals 與 rollback 沒有互相矛盾。
* 若任務涉及 M5、M7、M8、M9 或正式資料，必須補上 Security / Audit / QA 角色與人類簽核條件。
* 完成後需留下 implementation notes、validation result、review result 與必要的 ADR / sign-off reference。
