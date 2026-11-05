<!-- doc_id: doc_index_1040 -->
# Nation Fall & Save Chain Verification Package (v1, Fixed `106f053d`)

本目錄收納 `3klife-nation-fall-save-106f053d-20261104_(1).zip` 之完整驗證報告、探針腳本、來源證明與有界觀測結果分片。

## 1. 核心文件索引
- **[REPORT.md](./REPORT.md)** (`doc_spec_0298`)：《原生出征 → 零領地 → 滅亡 → 保存／讀回》（NF01 正常滅亡鏈、NF02 第 12 季主存寫入前拒絕與雙分支續行、單次 Campaign 兩次不同 Payload 保存拆解）。
- **[INDEPENDENT_REVIEW.md](./INDEPENDENT_REVIEW.md)** (`doc_spec_0299`)：獨立複核報告（含 6 組負向控制驗證與邊界聲明）。
- **[provenance/prior-birth-coverage/REPORT.md](./provenance/prior-birth-coverage/REPORT.md)** (`doc_spec_0300`)：《原出生 → 原 20 季增齡 → 開獎／宿命 → 育成入場》（BN01–BN04，含 `RivalPlayerEvents` 22 次呼叫證據與 BN04 Fresh Load 未掛 `factorDictionary` 導致 5 歲開獎推薦靜默退化對照）。

## 2. 驗證與探針結構
- **固定版本（Commit SHA）**：`106f053db7b7d7af8d800722158c4a35bb65d3aa`（由 `eff5c260` 完整 15,580 檔 Git tree → `f4eca818` 7 路徑 bridge → 4 個線性 commit / 27 變更路徑演進）。
- **離線重播命令**：
  - 完整封包（含 `sources/` 211 檔與 `probes/vendor/typescript.js`）保留於隔離區 `scratch/r5_audit_20261104/nation_fall_save_utf8/`，可直接執行 `node probes/run.mjs <new_external_output_dir>`。
- **大型結果檔分片說明**：
  - 原始 `results/results.json`（14.18 MB）於本目錄拆分為索引摘要檔 `results/results.json` 及兩個高訊號分片：
    - `results/results-shards/part-01.json`：NF01 初始名冊 fixture、第 11 季原生 Campaign 雙次非原子保存（Primary Save #1 vs #2）差異、第 12 季滅亡與南蠻襲擊結算及 Fresh Load 對照。
    - `results/results-shards/part-02.json`：NF02 第 12 季主存寫入前故障（Before-Write Fault）、Fresh Load 重跑第 12 季 vs 原 Live 實例推進第 13 季延後通知對照，以及完整 `trace`（361 筆）、`logs`（1 筆）與 `resolutions`（26 筆）。
  - 原始 `provenance/prior-birth-coverage/results/module-call-trace.json`（1.55 MB）壓縮為呼叫統計摘要檔（保留完整 SHA-256 校驗資訊與 `RivalPlayerEvents.resolveRivalPlayerEvents` 22 次呼叫分布 `BN01: 20, BN03: 1, BN04: 1`）。
