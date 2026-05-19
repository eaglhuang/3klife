<!-- doc_id: doc_other_0682 -->
# APF-0031 — Source inventory and large-surface scanner contract

## 1. 目的

建立大型腳本 / 大型功能表面的語言中立 read model，預設以 1000 LOC 作為可配置門檻。

## 2. Upstream 落點

- 新增 SourceInventoryReport contract。
- 可由 CLI / governance bundle / host adapter 提供 ignore 與 threshold config。

## 3. Contract / routing

Source inventory 至少包含：

- `filePath`
- `language`
- `lineCount`
- `exportedSymbols`
- `entrypointHint`
- `legacyUri`
- `ignoredReason`

1000 LOC 只是 default policy。產品化時應提供 `maxFileLines`，並允許 adopter 設定不同門檻。

## 4. Acceptance

- 掃描只產 read model，不改 host project。
- 產物可作為 Decomposition Police input。
- fixtures 覆蓋 above threshold / below threshold / ignored generated file。

## 5. Validation

- `npm run validate:police-family`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
