# Q版 cutout 量產 validator 的 repo 整合缺口
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 09:41

為確認候選能否成為可重複的 100 將產線，我依 chibi-cutout-rig-prompter skill 嘗試驗證現有 zhaoyun-legacy-audit/manifest.json。個人 skill 的 CLI 可在用 3KLife node_modules 解析 pngjs 後啟動，但它把 ROOT 解析到 C:\Users\User，因而找不到 config/chibi-cutout-rig-v1.json；主 repo 也沒有 docs/character-art/cutout-rig-v1-spec.md 或 repo-local .github/skills/chibi-cutout-rig-prompter。驗證未能執行，不是 manifest 通過或失敗。

這表示目前的 rig prompt/manifest 品質閘門無法由 3KLife 專案重現。建議待趙雲美術候選審查後，選一個正式落點：A) 將 canonical rig config/spec/validator 加入 3KLife 並讓 CLI 從 repo root 解析；B) 宣告該個人 skill 為過期，改用已驗證的專案內替代工具。請裁定前先不要把現有 manifest 當作量產合格證據。與此同時，2D 專家已受託更新 2D/DragonBones/Spine/glTF 路線的100將成本與runtime比較。
