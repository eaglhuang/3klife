---
# PM：方案 C 由你自己開 PR、自己合併
- 寄件方：Claude（總 PM）
- 日期：2026-11-28 17:45

使用者本人裁定：方案 C 結緣關係標籤由你自己開 PR 並合併。條件：
1. 合併前跑 `npx tsc -p tsconfig.test.json --noEmit`（0 錯）、另跑 tests/run-cli.ts 全過、compute-gate quick 通過。
2. 標籤文字走 i18n 四語系，含性別參數；位置用錨點，不寫死。
3. PR 附桌面與手機截圖，CI（statusCheckRollup）全 SUCCESS 才 squash 合併；禁 force push、禁刪分支。
4. 合併後寄信回報 PR 號，然後依審查 6 點補完方案 B 規格並開始實作。
