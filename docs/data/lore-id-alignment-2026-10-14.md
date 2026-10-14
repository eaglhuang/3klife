# Lore id 對齊對照表（PROG-2-0417，2026-10-14）

PM 裁定：id 以 runtime 武將 base（`master/generals-base.json`）為準。lore 側不改名、不刪條目，改用別名與棄用標記（`master/lore-id-aliases.json`）；base 缺 lore 的武將先放模板並標 `draft: true`。

實作：
- `tools_node/lore-id-resolver.js`：解析別名、略過棄用條目、同一 base id 時真實內容優先於 draft。
- `tools_node/build-generals-runtime.js`：建置時使用上述解析。
- `assets/resources/data/master/generals-lore.json`：只新增 `draft` / `deprecated` 欄位與 9 筆模板條目，原有 235 筆內容逐筆比對無變動。

## 別名（lore id → base id）

| lore id | base id | 姓名 | 說明 |
|---|---|---|---|
| cao-cao-pi | cao-pi | 曹丕 | 真實內容 |
| lu-dai | lu-yin | 陸胤 | 真實內容 |
| gong-yan | gou-fu | 句扶 | 模板內容，標 draft |
| cao-cao-junior | cao-zhang | 曹彰 | 真實內容；base id 原有的模板條目由解析優先級取代 |
| cao-cao-zhi | cao-zhi | 曹植 | 真實內容；同上 |
| quan-zong | quan-cong | 全琮 | 真實內容；同上 |

## 棄用（不進 runtime）

| lore id | 原因 |
|---|---|
| peng-yong | 與 peng-yang（彭羕）重複，其內容為模板 |
| zhang-bao-shu | 與 zhang-bao（張苞）重複，其內容為模板 |
| zheng-bing | base 無對應；待確認是否為 cheng-bing（程秉）之誤 |
| chen-shou-shu | base 無對應（陳壽非武將資料，待企劃確認） |
| hua-ge | base 無對應 |
| jing-biao | base 無對應 |

## 補模板（base 有、lore 無，標 draft）

cao-ang、cao-xiu、lu-kang、cheng-bing、huo-yi、jiang-wan、ma-liang、pan-jun、lv-kai

## 注意

- 模板判定以固定句型比對（見 `tools_node/ingest-generals-ai.js` 的 ROLE_TEMPLATES），屬啟發式。目前標記 54 筆 draft，需企劃抽查與替換。
- 本卡未重新產生 runtime 的 `generals.json` / `generals-index.json`。目前建置會丟失部分既有欄位（例如 originRegion、element、introLine、portraitKey），即使 lore 無變動的武將（如 cao-cao）也會受影響，屬建置既有問題，需另卡修復後再重產。
