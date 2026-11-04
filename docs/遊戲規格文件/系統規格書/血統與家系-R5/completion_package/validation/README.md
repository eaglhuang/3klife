<!-- doc_id: doc_index_1034 -->
# 工作包驗證說明

本目錄的檢查只處理文件結構與證據定位。它不載入遊戲、不跑產品測試，不改原repository或服務狀態。

## 本輪已執行的檢查

- 工作包必備文件及相對連結存在。
- 所有GitHub來源鎖定b35b349c01e728358a8ef9a21cbcb8fbdd9dadfe，行段不超出取回原文。
- 取回原文的Git blob SHA與聲稱SHA一致；系統目錄內來源再對固定tree清冊。
- 38功能唯一，S07/S08為未採，19DEC與17缺件維持原數。
- 原346案例ID唯一，不把新案例或歷史案例重複加總。
- 新跨玩法案例有Given/When/Then且全部NOT_RUN。
- 38功能均有新跨玩法案例直接引用，產生反向索引；這不表示每個行為或邊界均已覆蓋。
- 12組玩法、53入口、44項接口驗收期待及28項權威問題的標籤數量。
- Markdown表格列寬一致性文字結構檢查。
- 封包manifest以SHA256列出文件，不包含manifest自己的雜湊，避免自我遞迴。

實際結果以 validation_result.json 為準。PASS只表示上述文件檢查通過，不表示所有來源語義由程式證明，更不表示產品已通過。

## 重跑方式

在本工作包目錄執行：

~~~sh
python3 validation/validate_package.py
~~~

完整bytes檢核需要已授權取得的固定版本來源文字。原文工作cache位於本包外，不作交付內容；程式會讀父目錄中對應b35b349c的3klife來源cache。每筆至少含path或固定display_url、content、git blob sha。若換環境未帶來源bytes，應透過正常授權讀取固定GitHub來源，或將結果視為INCOMPLETE；不能以只剩hash就宣稱重新核過原文。

本包 evidence/source_catalog.json 保留來源路徑、永久URL、hash和行數，source_citations.json 保留已引用片段及定位，供回讀。沒有原文bytes時，這些仍可導覽，但不能替代完整hash重驗。

## 不在本檢查中的事

- 每條敘述與引用的完整語義判定，需要人工審核。
- 既有19DEC的採定、原始catalog補齊、外部完整稿取得。
- 現行產品caller、資料庫／同步原子性、UI或實機端到端。
- 正式doc_id／ATM工單／准入、repo回寫、上傳、提交、推送、合併或發布。

這些工作不因文件檢查通過而自動完成。

