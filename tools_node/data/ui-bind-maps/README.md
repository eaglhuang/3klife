# UI 綁定表（ui-bind-maps）

HTML 轉 UI 時替元素取固定節點名（`data-name`），讓子面板能依名稱填資料，重轉後名稱不變。
設計稿資料夾不進版控，所以名稱寫在這裡，不改原稿。

- 檔名：`<screenId>.json`，轉換流程（主畫面快照與分頁重播）自動讀取。
- 格式：`{ "bindings": [ { "name", "selector", "text"?, "index"? } ] }`
  - `selector`：CSS 選擇器；盡量限定在所屬區塊（例如 `#right-content .name`），避免跨分頁誤中。
  - `text`：選填，元素全文（空白合併後）需完全相同。
  - `index`：選填，多個符合時取第幾個（從 0 起）。
- 對不到的項目會在快照步驟印出 `bind-map unmatched`。
