# Web Desktop 頁面範本

`web-desktop/index.ejs` 與 `style.css` 由 Cocos Creator 建置時套用，避免每次生成回固定 1280×960 預覽頁面。遊戲顯示區保持既有 1920×1080 設計比例，隨視窗放大／縮小並置中，額外空間以黑邊呈現。

- 引擎 bootstrap 由 `include(cocosTemplate, {})` 產生；CSS 使用 `cssUrl`，保留建置時的檔名處理。
- `responsive-frame.js` 透過共享 `cc` 模組與 game-inited 事件，呼叫 `view.setFrameSize()`，在視窗 resize 時同步引擎緩衝區；release 不依賴 `window.cc`。
- 不改生成的 `build/`，不修改引擎或專案設定；不依賴頁面輪詢或 QA 注入樣式。
- 目前對應 Creator 3.8.8。升級 Creator 時請比對安裝目錄的 `templates/web-desktop/index.ejs`，確認 EJS 變數與 include 契約仍相容。
- `node --test tests/web-shell.test.cjs` 驗證範本契約及真實瀏覽器 CSS resize；需要 Chrome／Edge，可由 `CHROME_PATH` 指定。
- 真實引擎、滑鼠操作與同步服務仍需另外跑 Web smoke；CSS 測試不代表整個遊戲驗收通過。

參考：[Cocos 自訂建置範本](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/custom-project-build-template.html)。
