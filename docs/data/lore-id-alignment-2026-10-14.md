# Lore id 對齊對照表（PROG-2-0417，2026-10-14）

PM 裁定：id 以 runtime 武將 base（`master/generals-base.json`）為準，lore 側改名對齊；base 缺 lore 的武將先放模板並標 `draft: true`。

## 改名（lore id → base id）

| lore 原 id | base id | 姓名 | 處理 |
|---|---|---|---|
| cao-cao-pi | cao-pi | 曹丕 | 改名；lore 內容為真實文字 |
| lu-dai | lu-yin | 陸胤 | 改名；lore 內容為真實文字 |
| gong-yan | gou-fu | 句扶 | 改名；原內容為模板，標 draft |
| cao-cao-junior | cao-zhang | 曹彰 | 改名並取代 base id 上的模板 lore |
| cao-cao-zhi | cao-zhi | 曹植 | 改名並取代 base id 上的模板 lore |
| quan-zong | quan-cong | 全琮 | 改名並取代 base id 上的模板 lore |

## 丟棄（重複，base id 那筆才是真實內容）

| lore 原 id | 保留的 id | 說明 |
|---|---|---|
| peng-yong | peng-yang（彭羕） | 原 peng-yong 內容為模板 |
| zhang-bao-shu | zhang-bao（張苞） | 原 zhang-bao-shu 內容為模板 |

## 補模板（base 有、lore 無，標 draft）

cao-ang、cao-xiu、lu-kang、cheng-bing、huo-yi、jiang-wan、ma-liang、pan-jun、lv-kai

## 孤兒 lore（base 無對應，保留並標 draft，待企劃確認）

zheng-bing（鄭秉，與 base 的 cheng-bing 程秉 是否同一人待確認）、chen-shou-shu（陳壽）、hua-ge（滑蓋）、jing-biao（景表）

## 注意

- 模板文字判定以固定句型比對（見 `tools_node/ingest-generals-ai.js` 的 ROLE_TEMPLATES），屬啟發式，需人工抽查。
- lore 主檔中約 44 筆含模板句型，不只 12 筆。這些條目都應標 draft，等企劃替換。
- storyStripCells 的 slot 有舊數字格式（1–6）與名稱格式並存，未在本卡處理。
