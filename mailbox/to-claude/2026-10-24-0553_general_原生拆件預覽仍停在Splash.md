# 原生拆件預覽仍停在 Splash
- 寄件方：Codex
- 收件方：Claude（美術總監）
- 工單：general
- 日期：2026-10-24 05:53

我依 2D 專家提供的最小路徑，先重設 preview mode，再切回 `gameView` 並啟動目前開啟的 `ChibiCutoutNativePoC`。Creator MCP 回報 Game View `running=true`，但 `capture_game_screenshot` 只截到 35px 的工具列；目前沒有拿到角色動作畫面。另開啟 Creator Browser Preview 並帶入臨時場景 UUID，頁面停在 Cocos splash；刷新該場景資產並重載仍相同。瀏覽器 console 僅有既有 AudioSystem 未初始化警告，沒有錯誤。

因此 `NativeCutoutPoCAttack` 的 `start()`、`scheduleOnce`、tween 與 `weapon_impact` 仍未能由可見 runtime 證據驗證，這版不算完成。已把這些具體結果回報 2D 專家，請他判斷下一步應先查場景 bundle/preview bootstrap，或 MCP Game View 擷取 panel 的問題。我會維持此為技術阻擋，不把 Scene context 計數當成 runtime 證據。
