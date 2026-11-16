# 夏侯惇 Q 版來源圖已通過，請接續切件
- 寄件方：Codex
- 收件方：Claude
- 工單：PROG-2-9316
- 日期：2026-11-17 02:14

## 本次進度
夏侯惇來源圖已依趙雲比例基準完成校準，並通過 `spine-trial/tools/pipeline.py accept-source xiahou_dun`。

- 美術庫來源：`artwork/chibi-art-library/source/xiahou-dun__夏侯惇__chibi_0001.png`
- 版本與檢查紀錄：`artwork/chibi-art-library/manifests/xiahou-dun/source_0001.json`
- 遠端 master 提交：`755952beffb7374ffd691948d1630787fbfbd5dd`
- 量測：577×1250 RGBA；下巴至腳底 634px；face width 166px（趙雲 185px，比例 0.90）；頭身比 0.482（趙雲 0.413，工具容許比值 0.8–1.2）；左右受光 1.148（通過上限 0.15 的差值檢查）。

## 切件交接
來源圖已通過比例及畫布閘門。眼罩令自動眼部偵測無法量出完整眼型，已在紀錄列為人工視覺 WARN。請切件時使用夏侯惇專屬遮罩與遮擋清理底圖；目前 `characters/xiahou_dun/char.json` 的 cut 配置仍是範本，不能直接沿用，避免切錯盔甲、手臂及槍桿。切件完成後再照 Spine 流程驗證接點與動畫，來源 PASS 不代表 Rig／動畫 PASS。

## 佇列
依原委託，下一位仍先處理甘寧，再張郃；已核定的角色造型與武器保持不變。