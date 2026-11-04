<!-- doc_id: doc_index_1035 -->
# 3KLife 全玩法盤點第一階段

固定commit：96a83124094d3b2485bfb749ef37d567ad834559

先讀「全玩法覆蓋清單.md」。42個暫定玩法域＋4共同關卡，完整玩法驗收0/42；沒有新增遊戲測試。852個TS清冊中773未讀。

驗盤點本身：
```sh
python verify_inventory.py
```
此命令不執行產品，也不能作為玩法通過證據。

來源快照43份，各有Git blob SHA及SHA256；既交14個原碼探針請參照 3klife-gameplay-validation-20261104.zip，本包不重複把它們計為新結果。

`build_inventory.py` 可利用本包tree與來源metadata重建JSON分流清冊；verify腳本亦完全自足。檔名分流多對多，僅用於查找，仍需語義核對。
