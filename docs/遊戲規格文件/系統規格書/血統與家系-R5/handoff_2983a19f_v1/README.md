<!-- doc_id: doc_index_1052 -->
# 3KLife 最新版血統與出生驗證交接包 (v1, Fixed `2983a19f`)

本目錄收納 `3klife_最新驗證_單一交接包_2983a19f_20261105.zip` 之核心驗證報告、獨立探針腳本與執行結果。

## 1. 核心文件索引
- **[REPORT.md](./REPORT.md)** (`doc_spec_0301`)：《3KLife 最新版血統與出生驗證》（原生 6,213 測試全過、外戚純化反例重現與規格違背確認、EP 五錨點、戰後 EP、多樣性 D 邊界與存讀輪轉）。
- **[probe.cjs](./probe.cjs)**：5 組獨立核驗探針（含 EP 單調性、純化反例、缺譜 D=1、疲勞轉移、存讀讀回）。
- **[results/probe.json](./results/probe.json)**：獨立探針執行輸出（確認 `m-only` 規格違背：原碼目前暫以 30% ★+1 替代上限 m）。
- **[results/cli-summary.json](./results/cli-summary.json)**：原生測試集執行結果摘要（6,213 passed、0 failed、3 skipped）。

## 2. 驗證環境與執行命令
- **固定版本（Commit SHA）**：`2983a19f676e7a18c1a95aaccf34b62ce8a298fa`（提交時間 2026-11-05 13:55:58 UTC）。
- **測試命令**：
  ```bash
  ./node_modules/.bin/ts-node -r ./tests/register-cc-test-stub.js -r ./tests/register-tsconfig-test-paths.js --project tsconfig.test.json tests/run-cli.ts
  ./node_modules/.bin/tsc --project tsconfig.test.json --noEmit
  node probe.cjs
  ```
- 完整包含 3,934 檔 Git blob 與完整原始 `cli.log`（555 KB）、`compare.json`（3.2 MB）保留於隔離區 `scratch/r5_audit_20261105/handoff_2983a19f_utf8/`。
