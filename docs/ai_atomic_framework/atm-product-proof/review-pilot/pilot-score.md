# ATM-0-0023 三次試行淨成本與糾偏品質

版本：2026-09-16  
狀態：彙總完成；三次試行均未證明產品改善，資料不足處維持 UNKNOWN。  
本文件不授權 source write、publish、付費模型或新治理元件。

## 輸入 artifact 與證據邊界

| 試行 | artifact | SHA-256 | 直接結論 |
|---|---|---|---|
| 0020 | `review-pilot/pilot-1.md` | `43E0A646DC1428CCCF5446F308B7017447766901670EF39FC6A9EB79F3A77011` | control p50 74.2055／candidate 170.9220；dirty fixture，未證明減負 |
| 0021 | `review-pilot/pilot-2.md` | `F6629AD32F7388204DCFF3BCC84FEF6D846273A036D57610457DC9290AB39BB0` | 兩組 test PASS；無修前失敗／明確 patch，bug 修復 UNKNOWN |
| 0022 | `review-pilot/pilot-3.md` | `154E63D2A77FDA729D2C166E8B9D6C8B7B46D44AD832F55F6FF9770EEF6AC50C` | 四 arms 各 35 insufficient；overall inconclusive，並行能力 UNKNOWN |

三張卡的 receipts、原始輸出與 analyzer report 留在外部 sink；本摘要不複製 runtime log。

## 時間與成本彙總

| 試行 | 已取得命令 wall-clock | 實作 ms | 功能驗證 ms | 審核 ms | 等待／修正／整合 ms | human min | Token | USD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0020 | control 10×／candidate 10× receipt；task wall-clock 未定義 | UNKNOWN | 已含於命令 receipt，未拆分 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| 0021 | control 89.288／candidate 91.208 | UNKNOWN | 單次 test；未拆分 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| 0022 | control 12897.924／candidate 14185.196 | UNKNOWN | analyzer 執行；未拆分 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

不能把不同任務、不同 fixture 或單一命令時間相加成「節省」。三張卡均缺完整 task 起訖、活動區間、人工／Token／USD receipt，因此淨成本與 15% overhead 比例為 `UNKNOWN`。

## 糾偏品質

### 校準集

ATM-0-0018 只完成十個 case 的 exact payload、rubric 與停止規則設計，尚未送出第一個 case。因此：

- TP／FP／FN／TN：`UNKNOWN`；
- false block：`UNKNOWN`；
- missed drift／漏判率：`UNKNOWN`；
- 不得以「尚未看到誤擋」填 0，也不得宣稱校準通過。

### Live 三次試行

三次試行沒有完成獨立事後查核，因此不能計算 reviewer 的漏判率或 false block：

- 0020：Review001 查出並保留 dirty fixture 的可比性問題；這是審核發現，不等同校準 TP。
- 0021：Review001 接受 UNKNOWN 邊界，沒有把兩次 PASS 誤判為修復成功。
- 0022：Review001 接受四臂 insufficient／inconclusive，沒有把 validator PASS 誤判為真實多 AI。

上述只能作案例敘述，不能形成統計分母；live missed drift、false block、返工避免量均為 `UNKNOWN`。

## 可比性與淨效益裁決

- 合格固定 A/B：`0/3`。0020 candidate dirty；0021 沒有修前失敗與 patch；0022 是 insufficient fixture，沒有真實 agent outcome。
- 產品交付：三卡均 `UNKNOWN` 或未證明；沒有任何一項可宣稱 npm clean install、長期 CI 或外部 benchmark 成功。
- 審核新增成本：`UNKNOWN`，不可填 0；審核是否抵銷返工也 `UNKNOWN`。
- 淨效益：`UNKNOWN`。目前證據不支持保留或擴大獨立審核機制的產品收益主張。

## P1–P6 與反例

| 原則 | 判定 | 理由 |
|---|---|---|
| P1 產品結果 | 彙總口徑 PASS；產品結果 UNKNOWN／未證明 | 沒有把卡片／PASS 當產品完成；實際產品結果仍 UNKNOWN |
| P2 減少複雜度 | PASS | 沒有因資料不足新增 command、gate、dashboard 或永久流程 |
| P3 完整成本 | UNKNOWN | 缺 task activity union、人工／Token／USD |
| P4 可比較證據 | PASS（缺口被保留） | 不同 fixture、insufficient cells、缺 baseline 均未被強行合併 |
| P5 必要能力 | 未觀察到移除保護或串行化；能力結果 UNKNOWN | 沒刪衝突防護、沒串行化、沒刪足跡；能力本身仍未證明 |
| P6 有界修正 | PASS | 每張卡單一問題，負結果直接收口 |

反例核對：nested timer 不重複相加；缺費用不填零；失敗／不足樣本未刪除；不可比 baseline 沒有被當成因果收益。以上是報告口徑驗證，不是產品成功證明。

## 去留決策

本彙總只支持「停止目前 live pilot 擴張，先補最小缺失證據」：

1. 不開 0024 的保留決策為「保留機制」；目前資料不足以支持保留。
2. 若要重開，先補一個合格 paired candidate、一個可重現 bug reproduction、以及 supplemental real-agent conflict samples；再執行校準 reviewer 並保存成本 receipt。
3. 在補件前，不得宣稱 ATM 比 worktree＋Git 更快、更便宜、更可靠，也不得宣稱 reviewer 零漏判或零誤擋。

## 外部審核狀態

本文件待 Review001 只讀審核；若審核通過，僅代表彙總沒有製造虛假收益，不代表 ATM 產品目標完成。
