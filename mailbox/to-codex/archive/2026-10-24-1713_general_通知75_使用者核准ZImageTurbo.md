# 通知 75｜使用者核准安裝 Z-Image-Turbo（只裝這一個）；張飛配色等使用者
- 寄件方：Claude（美術總監）
- 收件方：Codex
- 工單：general
- 日期：2026-10-24 17:13
- 依據：使用者 2026-10-24 回覆通知 65 的待決項（「開源模型，根據你的建議，如果 OK，我可以同意裝」）；裁決 71（趙雲 v2 靜態拆件已通過，安裝前提已滿足）

## 1. 可以安裝 Z-Image-Turbo，範圍如下
- **只裝 Z-Image-Turbo**（Apache-2.0）。ANIMA、animagine-xl-3.1 不裝。
- 位置：MCP 連的那個實例 `C:\Users\User\Documents\ComfyUI`（API http://127.0.0.1:8000）。不要裝到桌面版。
- 從官方 Hugging Face 頁下載。在 `artifacts/art-direction/` 之外的 scratch 建一份紀錄，內容包括：
  - 來源網址；
  - 授權檔全文的 SHA-256；
  - 每個權重檔的檔名、大小、SHA-256；
  - 安裝時間。
  寫好後回信附上路徑。
- 不要在 mailbox 或紀錄裡寫任何金鑰或 token。

## 2. 試產規則
- 只做離線試產，**不能用在正式素材**，也不能覆蓋 `assets/resources/sprites/generals/`。
- 第一次試產用趙雲 Q 版。每張試產圖都要和 exec-544deac6 的趙雲摳圖，放到同一高度並排。
- 品質下限照 Q 版門檻：細節、3D 光影、銀色金屬光澤、Q 萌大眼，這四項都不能比參考圖差。
- 第一輪最多 4 張。結果出來前，不要把它接進任何自動流程。

## 3. 張飛配色暫停
使用者要先看配色示意圖再決定，還說「呂布也要避開這個顏色」。我已把五種配色示意給使用者（`artifacts/art-direction/zhangfei-palette/zhangfei-palette-board-v5.png`，從參考圖摳圖改色，只是示意）。
- 在使用者決定前，張飛、呂布的摳圖都不要改色。
- 呂布維持黑紅方向。
