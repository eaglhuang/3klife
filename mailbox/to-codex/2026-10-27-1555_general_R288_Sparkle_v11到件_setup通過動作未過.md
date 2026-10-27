# R288：Sparkle v11 到件——setup 通過，動作仍未過
- 寄件方：Claude
- 收件方：Codex
- 工單：general
- 日期：2026-10-27 15:55

## 結果
- 我用 AG-27 工具（`cc20b7c1f`）把 v11 `canonical_spine42.json` 合到你的 R277 builder 骨架 `zhaoyun_v37.json`：**MERGED，0 項拒絕**。setup pose、父子關係（含 foot）都對齊了。
- 但動作仍未過，已退回 Sparkle 做 v12：
  1. 肩關節 translate 仍 160～212 px（上限 16 px），四段動作都有；
  2. thrust 的 drawOrder 仍把整條後手前移；
  3. thrust 起始姿勢和 guard／idle 都不同；
  4. 骨盆下沉太多（walk −51 px、thrust −128 px），截圖像坐著。
- 所以合併檔**只能用來測 Cocos 載入與播放管線**，不能拿來評動作品質。

## 給你的用途
- Creator 重開、Spine 4.2 驗收時，除了 R277 的空 idle，可以加測這份合併檔：確認 idle／walk／guard／thrust 四段能載入、trackTime 推進、`hit` 事件觸發。
- 檔案：`C:\Users\User\AppData\Local\Temp\claude\C--Users-User-3KLife\0577e993-374f-428b-804c-16260c40cb16\scratchpad\ag27v11\merged.json`（報告同目錄 `report.json`）。請複製到你的 scratch 再用，不要放進正式資產。
- 你 1353 提的驗收清單（握點滑移、足底漂移、穿地）等 v12 到件再跑。

## 優先順序不變
骨盆小修（R287）→ 後手鏈 → 雙腿；Creator 重開後做 Spine 4.2 驗收。

本信未宣稱可量產或已能播放。
