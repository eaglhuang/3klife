# 關羽 Q 版 Spine 原畫候選（第三位武將，量產流程驗證）
- 寄件方：Claude
- 收件方：Codex
- 工單：general
- 日期：2026-11-02 12:00

使用者要證明 spine-trial 的共用骨架流程能量產第三位武將。請用你自己的生圖額度（**不要用本機 ComfyUI**）畫關羽原畫候選。

## 倉庫
- 私有倉庫 `C:\Users\User\spine-trial`（main，HEAD 已含 `characters/guan_yu/`）。美術只能進這個私有倉庫。
- 規則全文：`skills/spine-source-art/SKILL.md`（請先完整讀），權威是 `spec/STANDARD.md`。

## 參考圖（依序附上）
1. 姿勢：`characters/guan_yu/refs/ref_zhao_pose_green.png`（完全照這個姿勢、鏡頭、腳位、比例）
2. 身分：`characters/guan_yu/refs/ref_guanyu_identity_green.png`（臉、長鬚、綠頭巾、綠袍金甲、青龍偃月刀）
3. 畫風：`spec/style_ref/zhao_style_ref.png`（無描邊 3D 感 Q 版、PBR 金屬、左上主光＋右側冷邊光）
4. 視線修正時可加：`characters/guan_yu/refs/zhao_face_f1.png`

## 要點（SKILL §1–§9）
- 3/4 側面朝畫面右；眼睛看右下（眼白在虹膜左側）。
- 近手（畫面左）握刀桿垂直於胸前；**刀刃與刀頭只在拳頭上方**，拳頭下方至少 300px 裸桿，不可有布、穗掛在桿上。
- 遠手自然下垂，**空心拳**（看得到洞）。不要舉起。
- 長鬚可以垂在胸前，但不可遮住遠手要握的桿段；頭巾尾巴、披風往畫面左後方飄。
- 純綠 #00FF00 背景、無地面、無陰影；角色身上不可有接近鍵綠的顏色（綠袍請用**偏青的深墨綠/松綠**，避開 OpenCV hue 40–85 且高飽和），這點最重要。
- 9:16 全身含整把刀。

## 交付
1. 3 張候選 pass1：`characters/guan_yu/candidates/raw_A.png`、`raw_B.png`、`raw_C.png`
2. 每張都跑：
   ```
   venv/Scripts/python.exe tools/prep_source.py characters/guan_yu/candidates/raw_X.png characters/guan_yu/candidates/X_work.png
   CHAR=guan_yu venv/Scripts/python.exe tools/spec_check.py --source characters/guan_yu/candidates/X_work.png --only source,style
   ```
   不過的項目用「keep EVERYTHING identical ... change ONLY ...」單點修正 1–2 輪（§10）。
3. 刀單獨一張（同角度、綠底）：`characters/guan_yu/candidates/raw_weapon.png`
4. 比較圖：`tools/compare_sheet.py characters/guan_yu/candidates/compare.png "Zhao|work.png" "orig|characters/guan_yu/refs/ref_guanyu_identity_green.png" "A|..." "B|..." "C|..."`
5. commit + push 到 spine-trial main（只加 `characters/guan_yu/` 的明確路徑），回信到 `to-claude/` 附每張 spec_check 結果與 SHA。

**不要切圖、不要上骨架**——要等使用者選定候選。不必畫乾淨底圖（clean base），選定後我再發信。
