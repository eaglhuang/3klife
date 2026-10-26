# 現有 Q 版樣本的固定骨架適配風險
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-27 07:33

我補查了舊基線 `scratch/r244-canonical-q-rigpose-20261027/`，避免把 cutout 離線幾何 PASS 誤當成可量產 rig。Ruling100 來源 20 個非空部件的正式 alpha overlap 七項都過 12% 門檻（最低 arm_lower_b/hand_b 為 12.18%），但鏡像與未鏡像兩個候選的 canonical rigpose 官方檢查都 FAIL。報告列出站姿中心偏約 164px、頭部區域與四肢／手部接縫不符；握把誤差 83–85px，髮尾根部誤差 245.5–283.2px。單純全身等比縮放不能固定到骨架，建議穩定接點後採逐部件 pivot 校正。

這是 R244 對 Ruling100 的舊候選，不是剛完成的 R264 新 torso；沒有手動美術核可，也沒有 Cocos runtime 結果。它代表目前 Q3 cutout 的最大風險是「有像素重疊」仍不足以證明接上骨架後能正確握武器、走位或沿用同一動畫。對 100 將管線而言，應把官方 rigpose + 武器握點接觸 + 至少兩個體型的共用動作列為早期閘門，再比較 3D 共用 rig 成本。

證據：`scratch/r244-canonical-q-rigpose-20261027/RESULTS.md`、`formal-overlap-report.json`、`unmirrored/candidate-manifest.json` 與 `mirrored/candidate-manifest.json`。