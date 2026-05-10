# 外部網站採證模板（Evidence Seed / Evidence Card）

更新日期：`2026-05-10`  
最新檢測：`local/codex-smoke/knowledge-growth/3kweb-check-lishirenwu-r1/3kweb-check-summary.json`

本文件定義：
1. 網站頁面怎麼轉成 `EvidenceSeed` 與 `EvidenceCard`。
2. 哪些網站更適合做證據卡。
3. 目前來源排名（含中文名稱、網址、為何高分）。

## 0) 這輪來源政策變更（已執行）

- 已移除：`sinica-hanji`（需登入才能有效查詢正文，不符合「免登入可穩定採證」）。
- 已移除：`ctext-sanguozhi`、`rekowiki-musou-character-list`、`chiculture-romance-vs-history`（目前抓不到可用三國資料或持續 403）。
- 已新增：`lishirenwu-sanguorenwu`（免登入可讀，且可穩定抓到大量三國人物頁）。

## 1) 證據卡友善網站的特色

| 特徵 | 為什麼重要 | 建議門檻 |
| --- | --- | --- |
| 有可引用原文 | 沒有 quote 無法追溯 | 每張卡至少 1 句 quote |
| 有定位資訊 | 沒有 locator 難複核 | 卷/回/頁/段或穩定段落定位 |
| 人名可辨識 | 無法對人就無法入圖 | 可抽出 `generalId` 或 `candidatePersonId` |
| 句型偏事實 | 降低誤抽與幻覺 | 人物身分、關係、事件、官職句比例高 |
| 可達性穩定 | 403/登入牆會卡流程 | CLI 可達，或可明確 fallback |
| 來源層級明確 | 影響 A/B 可升級上限 | 必須標示 `history/romance/worldbuilding/...` |

## 2) 排名公式（可重算）

```text
siteCardFitScore =
  layerFitScore
+ reachabilityScore
+ termHitScore
+ accessPenalty
```

- `layerFitScore`: `history=50`、`romance=45`、`worldbuilding=32`、`encyclopedia=28`、`game=22`
- `reachabilityScore`: `ok=+20`、`http-error=-25`
- `termHitScore`: `min(termHitCount*2, 20)`
- `accessPenalty`: HTTP 403 再 `-5`

## 3) 目前網站排名（含中文名稱與網址）

說明：這是「工程採證適配度」排名，不是史學權威排名。

### A. 優先做 Evidence Card（高適配）

| 排名 | sourceId | 中文名稱 | 網址 | 分數 | 高分原因 |
| --- | --- | --- | --- | ---: | --- |
| 1 | `wikisource-houhanshu` | 維基文庫《後漢書》 | [連結](https://zh.wikisource.org/wiki/%E5%BE%8C%E6%BC%A2%E6%9B%B8) | 80 | `history`、可達、命中高 |
| 2 | `wikisource-zizhitongjian` | 維基文庫《資治通鑑》 | [連結](https://zh.wikisource.org/wiki/%E8%B3%87%E6%B2%BB%E9%80%9A%E9%91%91) | 76 | `history`、可達、事件句密度佳 |
| 3 | `wikisource-sanguozhi` | 維基文庫《三國志》 | [連結](https://zh.wikisource.org/wiki/%E4%B8%89%E5%9C%8B%E5%BF%97) | 76 | `history`、可達、身分與關係句穩定 |
| 4 | `commons-sanguozhi-scan` | Wikimedia《三國志》掃描本 | [連結](https://commons.wikimedia.org/wiki/File:NCL-01431_01_%E4%B8%89%E5%9C%8B%E5%BF%97.pdf) | 74 | 可做高可信人工複核/OCR 補證 |
| 5 | `wikisource-romance` | 維基文庫《三國演義》 | [連結](https://zh.wikisource.org/wiki/%E4%B8%89%E5%9C%8B%E6%BC%94%E7%BE%A9) | 73 | `romance` 主幹來源，支撐 `A-romance` |
| 6 | `gutenberg-sanguozhi` | Project Gutenberg《三國志》 | [連結](https://www.gutenberg.org/ebooks/25606) | 72 | 可達、適合備援互證 |
| 7 | `lishirenwu-sanguorenwu` | 歷史人物網《三國人物》 | [連結](https://www.lishirenwu.com/sanguorenwu/) | 72 | `HTTP 200`、`88,581 bytes`、`termHitCount=120`、首頁可展開並抓回 334 條人物頁 |

### B. 先 Seed 再互證（中適配）

| 排名 | sourceId | 中文名稱 | 網址 | 分數 | 使用策略 |
| --- | --- | --- | --- | ---: | --- |
| 8 | `wikipedia-romance-character-list` | 維基百科《三國演義角色列表》 | [連結](https://zh.wikipedia.org/wiki/%E4%B8%89%E5%9C%8B%E6%BC%94%E7%BE%A9%E8%A7%92%E8%89%B2%E5%88%97%E8%A1%A8) | 68 | 命中高，先當 seed 導航，不直升 A |
| 9 | `shuzi-sanguo-character-database` | 數字三國人物資料庫 | [連結](https://www.cne3online.com/biography/) | 58 | 人物索引快，適合 person bootstrap |

### C. 已降為 suggested（暫不進 approved-only）

| sourceId | 中文名稱 | 網址 | 降級原因 |
| --- | --- | --- | --- |
| `haodoo-romance-text` | 好讀（三國演義文本入口） | [連結](https://www.haodoo.net/) | 本輪 term hits 為 0，先暫停自動採證 |
| `ncl-thesis-romance-character-image-study` | 國圖論文《三國演義人物形象研究》 | [連結](https://tpl.ncl.edu.tw/NclService/JournalContentDetail?SysId=A15001724) | 本輪 term hits 為 0，先暫停自動採證 |
| `bahamut-sanguo-female-compendium` | 巴哈姆特《三國女性人物（未完）》 | [連結](https://forum.gamer.com.tw/C.php?bsn=6331&snA=19252) | 本輪 HTTP 410，先移出 approved |
| `ptt-koei-female-general-list` | PTT Koei 女性武將列表 | [連結](https://www.ptt.cc/bbs/Koei/M.1300064820.A.635.html) | 本輪 fetch-error，先移出 approved |

## 4) 外部網站轉欄位模板

### 4.1 EvidenceSeed（低門檻）

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `seedId` | 是 | `seed:<source>:<person>:<angle>:<hash>` |
| `sourceId` | 是 | 來源設定 id |
| `sourceFamily` | 是 | 來源家族 |
| `sourceLayer` | 是 | `history/romance/worldbuilding/...` |
| `sourceUrl` | 是 | 頁面 URL |
| `pageTitle` | 建議 | 頁面標題 |
| `generalId` or `candidatePersonId` | 是 | 至少一者 |
| `angleType` | 是 | `identity/relationship/event/trait/...` |
| `seedText` | 是 | 擷取句或短摘要 |
| `hasQuote` / `hasLocator` | 建議 | 是否接近可升卡 |
| `canonicalWrites` | 是 | 固定 `false` |

### 4.2 EvidenceCard（高門檻）

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `evidenceId` | 是 | `external:<source>:<hash>` |
| `sourcePolicyId` | 是 | 對應來源政策 |
| `sourceFamily/sourceLayer/trustTier` | 是 | 升級判定核心 |
| `url` | 是 | 可回跳來源 |
| `quote` | 是 | 可引用原文 |
| `locator` | 建議 | 卷/回/頁/段 |
| `textHash` | 建議 | 去重與追溯 |
| `claimType` | 是 | `identity/relationship/event/location/title/...` |
| `generalIds` | 是 | 1~N 人物 |
| `singleSourceMaxGrade` | 是 | 固定 `B`（單源不可直升 A） |
| `canonicalWrites` | 是 | 固定 `false` |

## 5) 切句規則（Page -> Claim Units）

1. 先做 HTML 清洗（script/style/註腳移除）。
2. 以 `。；！？` 主切句，保留前後 1 句上下文。
3. 條列內容（`-`、`1.`、`、`）保持原列，避免語意斷裂。
4. 同句多人物先拆成 `pair claim`（A-B 關係）與 `single claim`（人物身分）。
5. 長句（>120 字）再按逗號拆子句，但保留主語。

## 6) 優先抽取句型

| 優先 | 句型 | 抽取規則 | claimType |
| --- | --- | --- | --- |
| P1 | 身分句 | `X，字Y，Z之女/子` | `identity` |
| P1 | 親屬婚姻句 | `嫁A`、`妻/夫`、`生子女` | `relationship` |
| P1 | 事件句 | `與A戰於B`、`從A討B` | `event` + `location` |
| P2 | 官職封號句 | `拜/封/為/遷` | `title` |
| P2 | 人物特質句 | `善/剛/智/勇/謀` | `trait` |
| P3 | 生活活動句 | `好學/善舞/宴飲/習兵` | `activity` / `habit` |
| P3 | 衝突句 | `一說...一說...` | `source_conflict` |

## 7) 流程守則

- 單一來源不得直升 `A-history`。
- `romance` 可升 `A-romance`，不可冒充 `A-history`。
- 社群整理/百科/遊戲 wiki 預設 `seed -> preview`。
- 女性角色加權只影響 `worldbuildingUsabilityScore` 與優先序，不提高 `historicalTrustScore`。
- 全流程輸出維持 `canonicalWrites=false`。

## 8) 通用批抓 CLI（列表頁 -> 內頁）

第一層用 `3klife-source-health.js` 判斷網站是否可達；第二層用 `3klife-web-page-harvester.js` 把列表頁展開成內頁快取。

```bash
node tools_node/agent-clis/3klife-web-page-harvester.js \
  --source-id lishirenwu-sanguorenwu \
  --index-url https://www.lishirenwu.com/sanguorenwu/ \
  --link-include "^/sanguorenwu/[^/]+\\.html$" \
  --same-origin \
  --max-pages 500 \
  --concurrency 4 \
  --timeout-seconds 20 \
  --output-root local/codex-smoke/knowledge-growth/lishirenwu-page-harvest-r1 \
  --json
```

本輪實測結果：

| 指標 | 數值 |
| --- | ---: |
| 發現內頁連結 | 334 |
| 實際抓回內頁 | 334 |
| 相關頁面 | 334 |
| 失敗頁面 | 0 |
| 總抓取量 | 約 20 MB |

輸出檔：
- `pages.jsonl`：每個內頁一列，含 `url/title/snippet/textHash/termHitCount/relevanceLevel/textPath`。
- `page-texts/*.txt`：每個內頁的 normalized text 快取，供後續正文句 extractor 讀取。
- `fetch-errors.jsonl`：抓取失敗清單。
- `harvest-summary.json`：可重算摘要。
- `harvest-summary.zh-TW.md`：人類閱讀報告。

本次歷史人物網也有抓到女性角色或女性相關頁，例如 `diaochan.html`（貂蟬）、`zhenfu.html`（甄宓）、`sunshangxiang.html`（孫尚香）、`zhurongfuren.html`（祝融夫人）、`ganfuren.html`（甘夫人）、`bulianshi.html`（步練師）、`xiaoqiao.html`（小喬）。這類頁面適合先進 EvidenceSeed，不可單站直升 A；後續需與《三國演義》、三國志系史料或其他女性資料站互證。

## 9) 技術選型判斷

目前大多數三國資料站屬於「靜態列表頁 + 靜態內頁」，用 Node CLI 的 `fetch + link regex + JSONL cache` 已足夠。這類網站不需要 browser，也不需要額外導入 printing-press 類工具。

建議分層：

| 層級 | 工具 | 用途 |
| --- | --- | --- |
| L1 | `3klife-source-health.js` | 單頁可達性、term hit、hash |
| L2 | `3klife-web-page-harvester.js` | 列表頁展開內頁，批量抓回 cache |
| L3 | `extract_harvested_page_evidence_seeds.py` | 從 `pages.jsonl` 找 metadata，再讀 `page-texts/*.txt` 切正文句，抽 `trait / event / worldbuilding_note` |
| L4 | `benchmark_external_source.py` | 跑三段 gate，驗證 sample harvest、seed yield 與內文採樣是否真的有效 |
| L5 | Browser fallback / 人工 | vNext 正式 benchmark 預設不用 browser rescue；只有非官方探索或特殊站才升級 |

判斷一個網站是否值得留下：
- `discoveredLinkCount > 0`
- `fetchedPageCount / selectedLinkCount >= 0.9`
- `errorCount == 0` 或錯誤率低於 5%
- `relevantPageCount / fetchedPageCount >= 0.5`
- 至少能輸出 `url/title/snippet/textHash`
- 正文 seed 報表裡要看得到 `contentSource=page-text`
