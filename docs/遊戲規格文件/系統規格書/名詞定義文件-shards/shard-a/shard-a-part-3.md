> **現行資料差異（2026-10-14，PM 暫定）**：runtime 武將資料的 `templateId` 為 `GEN_{陣營}_{姓}_{名}`（例 `GEN_WEI_CAO_CAO`），與第 3 條 `{Name}_V{n}` 不符（235/235）；因子 id 為 `gene_strategy` 小寫格式，與第 5 條 `{COLOR}_{ATTR}_{NN}` 不符（20 筆）。`bloodlineId` 符合第 4 條。PM 暫定：維持現有資料 id（改動會影響存檔與引用），命名統一以本文件為目標，差異待使用者確認後再定案。驗證工具：`tools_node/validate-id-contract.js`（報告模式）。

---
