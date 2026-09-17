# ATM 獨立審核試行一頁操作單

版本：2026-09-16  
目前決策：停止 live pilot 擴張；只保留人工、review-only、可逆 opt-in。這不是 npm、CI、bundle 或外部 A/B 完成證明。

## 目標與下一張卡

目標是用最低額外成本抓到可證實的產品／量測偏移，不讓治理取代交付。下一張只能選既有 PRF 卡；若沒有明確 bug、paired baseline 或真實並行 fixture，先停，不新增 command、gate、SDK、registry、dashboard 或 Team SDK。

## 觸發時機

只在三個時機送 Review001：

1. 動手前短方案；
2. 第一個有效 patch 或出現範圍／量測／驗收偏移；
3. 整合前。

不逐命令輪詢，不宣稱可自動中斷其他 AI。

## 最小輸入

提供：原始目標與卡號、允許／禁止範圍、revision、dirty diff digest、exact test／benchmark command、直接輸出與 artifact path、前後量測條件、需要裁決的單一問題。缺資料只標 `UNKNOWN`；不要貼整個 repo 或整段對話。

## 審核回覆與停止條件

Review001 只回覆「通過／需修正／證據不足」，最多三項發現，每項含原則、直接證據、產品／成本影響、最小修正、重驗方式。兩輪仍不收斂就交 Owner。下列任一成立立即停止該輪：payload／digest 洩漏、缺必要證據、hard false block、不可比 runner／輸入、把卡片 PASS 當產品完成、成本／Token／USD 未知卻填零。

## 證據入口與目前狀態

| Artifact | Digest | 狀態 |
|---|---|---|
| `review-calibration.md` | `2C2359DF26139AE3744A69DED1BA5470273A23C4916B69FE937CA8B092A36E7C` | 10-case 設計通過；尚未實測 TP/FP/FN/TN |
| `cost-baseline.md` | `6AF22CA1AFA9EF7314EF05EDB09F91D94643AC692C42BF76FFE2BAB6C16027E8` | 量測契約通過；成本仍 UNKNOWN |
| `pilot-score.md` | `D11C4CD3964CAD77B0BFC4D60757363CA67387D07B1066970F9FA8BD35228B57` | 0/3 合格 paired A/B；停止擴張 |
| `adoption-decision.md` | `B5B7A41D4DDE56AB5A0722939C2F6F99EC856EAFB19AAE461F83C05BC1F966C0` | review-only opt-in；不整合 Team SDK |

原始 receipts／raw logs：`C:/Users/User/atm-benchmark-sink/ATM-REVIEW-PLANNING-20260915/`。Git 只保存上述摘要，不保存 runtime log。

**Digest validity rule：** 每份 review／裁決只適用於表中 digest 對應的 exact bytes。若 artifact、receipt、payload、runner、輸入、revision、host、cold/warm 或量測條件任一改變，舊結論立即失效；只重審受影響部分，不沿用舊的「通過」、停止或 UNKNOWN 裁決。若無法取得新 digest，先標 `UNKNOWN`，不得假設內容未變。

## 走讀正例與偏移例

- 正例：已有 exact command、固定 control/candidate、原始失敗與修後成功、diff digest、rollback；可送一次 review，完成後跑原卡驗收。
- 偏移例：只有 `--version`、dirty fixture、單一 gate 變快、validator PASS 或四臂 insufficient；必須標 UNKNOWN／停止，不得宣稱產品完成。

## 尚未授權與成功定義

尚未授權：付費模型、npm publish、ATM source write、Team SDK、長期 CI 或外部 benchmark。ATM 只有在外部使用者能乾淨安裝、重跑並以固定 A/B 證明淨效益後，才可宣稱成功；目前三項產品證明仍未完成。
