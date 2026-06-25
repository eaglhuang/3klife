# ATM Manuscript v3.1 全文邏輯問題地圖

日期：2026-06-26
範圍：`paper.v3.1.md` / `paper-zh.tex`
原則：此表聚焦 reviewer 最容易圈出的邏輯、結構、敘事層問題，不含版型、字型、表格格式調整。

## P0 已修

1. `§3` reader navigation 曾同時出現舊編號 `Definitions 5–6`、`Definition 7`，且有「兩個概念群組」後又寫成「三個概念群組」的自我矛盾。
狀態：已改為 `Definitions 3.2–3.4`、`Definition 3.5` 與「兩個概念群組」。

2. `paper-zh.tex` 在 Part A / Part B 之間殘留空白 `quote` 環境，會讓稿子有明顯 patch artifact。
狀態：已移除。

3. `Appendix A.4` 同時出現兩個 `A.4.5` 標題，造成附錄內部編號衝突。
狀態：後者已改為 `A.4.6 Topology C Acceptance Conditions`。

4. `Conclusion` 過度像 evidence recap，投稿版收束力不足。
狀態：已改寫為 final-prose 版本，改以 single-domain feasibility / bounded recoverability 收束。

5. `§6.3` 與 `§6.4.5` 對 federated / cross-machine broker 有重複敘事。
狀態：已把 `§6.3` 收回四個研究主軸，並將分散式延伸明確留給 `§6.4.5`。

6. `Task-contract plane` 的 ATM mechanism 列表過窄，與前文 task contract 的治理含義不完全對齊。
狀態：已補入 `validator envelope`、`evidence obligations`、`task epoch / scope envelope`。

## P1 高優先未完

1. Abstract 雖已去重一輪，但術語密度仍偏高。
問題：前段仍在短距離內引入 governance substrate、semantic atoms、atom map、virtual atom、CID broker、seven-layer gate，對新讀者負荷偏重。
建議：再做一次術語節流，優先保留 governance substrate、CID broker、semantic atoms 三個核心名詞，其餘延後至正文。
狀態：2026-06-26 第二輪已再節流一版，移除 Abstract 對完整 seven-layer gate 列舉的依賴；仍可視需要再壓縮 evidence paragraph。

2. `§1.1` 到 `§1.3` 的問題尺度有時在 same-file、same-worktree、service domain、single governance domain 之間切換。
問題：範圍切換過快，會讓 reviewer 懷疑 claim boundary 不穩。
建議：統一成「single controlled filesystem / worktree / service domain」主句，其餘都作為例示而非平行層級。
狀態：2026-06-26 第三輪已把 `§1.2` 改為治理粒度光譜敘事，並收斂 `§1.3` 貢獻層級；仍可再做最終語氣拋光。

3. `§2` related work 仍有 inventory 感。
問題：表與 prose 有時像在列 citation catalog，而不是一步步導向「ATM 為何只做 pre-write admission」。
建議：收斂成三條線：evidence closure 動機、boundary enforcement precedent、distributed / collaboration substrate 對照。
狀態：2026-06-26 第三輪已把 `§2.4` 分成三組問題、補一句 ATM 邊界定義，並把 `§2.5` 的 cluster 邏輯收成兩個觀察面；仍可再精簡字數。

4. `§3.3` 雖已修正定義編號，但 atom / atom map / virtual atom / CID 仍有概念層級混寫感。
問題：atom 是治理單位、atom map 是對齊索引、virtual atom 是補位治理物件、CID 是衝突身分；目前段落仍偶爾把它們寫成同一層級 feature 列表。
建議：分成「object / registry / fallback / identity」四個句群重寫。
狀態：2026-06-26 第三輪已重排 `atom → CID → atom map → virtual atom` 前半段；後半段 definition 區仍可再拆成更乾淨的小節。

5. `§4` 與 `§5` 的 denominator 說明仍是 reviewer 高風險點。
問題：Table 13 / 15 / 18 / 19 / 20 周邊仍可能讓讀者分不清 comparison universe、policy-row universe、enforcement-row universe。
建議：逐表前加一句 row universe 定義，逐表後加一句該表只回答什麼、不回答什麼。
狀態：2026-06-26 第二輪已補強 Table 18 / 19 / 20 的過渡與 row-universe 邊界；Table 13 / 15 尚待後續補齊。

## P2 中優先未完

1. `§4` 多張表的分類軸混雜。
問題：benchmark / self-hosting / adopter-side / field evidence / mechanism status 有時被放在同一表的同一層比較。
建議：強化 caption 與前後過渡句，避免讀者誤讀成單一統計宇宙。

2. `§5` AdmissionBench prose 雖已補 benchmark contract，但仍有少量 `v0.1 baseline` 與 `v0.2 paper profile` 的敘事貼太近。
問題：容易出現「benchmark substrate」與「paper-facing frozen result」的角色混寫。
建議：凡提結果數字時，優先先點名 `paper profile`；凡提產生流程或產物角色時，優先先點名 `baseline / generator / audit boundary`。

3. `Appendix A.1` 與 `A.4.4 Artifact Manifest Snapshot` 有部分角色重疊。
問題：一個像 evidence index，一個像 artifact manifest，但目前界線還不夠硬。
建議：A.1 強調 evidence entry points；A.4.4 僅保留 Topology C bridge artifact scope。
狀態：2026-06-26 第三輪已在 A.1 補 canonical public anchor 與角色切分；A.4.4 尚待最後收口。

4. References 格式仍有可能殘留 argument-like commentary。
問題：若書目條目本身帶評論語氣，容易破壞學術稿一致性。
建議：把評論搬回正文或附錄註解，書目只保留 canonical metadata。
狀態：目前檢視到的正文 `References` 區已大致乾淨；仍建議最終提交前再做一次整段 citation-style consistency 掃描。

## P3 低優先可選

1. `§6.4` 的 Topology A / B / C / D 仍混有 deployment form、admission boundary、visibility scope 三種分類軸。
建議：若後續還要再修，可在 `§6.4` 開頭先明說「本節按 deployment reach 排列，而非按 formal power 排列」。

2. `Acknowledgements` 與 Appendix B transparency statement 的邊界可再壓縮。
建議：Acknowledgements 只留最短責任聲明，細節完全交給 Appendix B。

## 下一批建議掃描順序

1. Abstract
2. `§1.1`–`§1.4`
3. `§2.3`–`§2.5`
4. `§3.3`
5. Table 18 / 19 / 20 前後 prose
6. Appendix A.1 / A.4.4 / References
