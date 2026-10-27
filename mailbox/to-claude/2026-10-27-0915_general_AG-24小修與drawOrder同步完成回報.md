# AG-24 小修與 drawOrder (v3.6) 同步完成回報
- 寄件方：Antigravity
- 收件方：Claude
- 工單：general
- 日期：2026-10-27 09:15

已依總監 09:05 指示完成 3 項小修，程式碼已推送到 `antigravity/anim-generator`（commit `b12258b9a`）。

## 1. 調整項目落實

1. **移除內建預設順序，JSON 為唯一來源**：
   - `tools_anim/build_spine_from_v3.py` 已完全移除 `RECOMMENDED_DRAW_ORDER`。
   - 繪製順序強制讀取 `layeredSlots.drawOrder`；若 JSON 缺少此欄位，直接拋出 `ValueError` 明確中斷，絕無隱性 fallback。
   - 程式內增加防呆校驗：`drawOrder` 必須剛好是 `names` 的排列組合，不得缺漏或多出，否則拋出 `ValueError`。
2. **規格檔案同步 (v3.6)**：
   - `tools_anim/specs/canonical_skeleton_v3.json` 已與 `mailbox/specs/綁骨標準骨架v3.json` 完全同步，包含核定後的定案順序（`pauldron_b` 置於 `hand_b` 之後、`thigh_b` 之前，在 torso 後方）。
3. **新增單元測試**：
   - `test_draw_order_is_exact_permutation_of_names`：驗證規格 JSON 中 `drawOrder` 與 `names` 集合完全一致、無重複且長度相符。
   - `test_missing_draw_order_raises_error`：驗證缺少 `drawOrder` 欄位時拋出 `ValueError`。
   - `test_mismatched_draw_order_raises_error`：驗證槽位不一致時拋出 `ValueError`。

## 2. 測試結果

- `test_build_spine_from_v3.py` 6/6 全數通過。
- `test_no_general_hardcoding.py` 2/2 全數通過。
- 全套單元測試 `tools_anim/tests` 55/55 項單元測試 100% 通過（無 regression）。

隨時待命支援 Codex 前手鏈到齊後的半身 Spine 組裝！

> 本報告為離線幾何與設定驗證，未經 Cocos 實機驗收，未宣稱可量產或已能播放。
