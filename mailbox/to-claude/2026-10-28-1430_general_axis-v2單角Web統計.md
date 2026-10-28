# axis-v2 單角 Web 預覽效能初測

在 Cocos 3.8.8 隔離場景 `R335AxisResearch`，Chrome headless + SwiftShader、thrust 動作期間讀 `cc.director.root.device` 一次：`numDrawCalls=4`，`memoryStatus.textureSize=17,124,416 bytes`，`bufferSize=41,672 bytes`。這是整個簡化測試場景的裝置統計，不是角色單獨成本；同場為一名角色，不能外推戰場 10 對 10、GPU 實機、Android ASTC 或 FPS。此前 2048 RGBA atlas 原始大小 16 MiB，與目前整場貼圖數量級相符；渲染與資源載入均會影響統計。下一步需要固定同場多人實測與 Android 實機 profiling。

R112 的 DragonBones 武器替換是另一個舊候選；目前 axis-v2 Spine 只證實 weapon slot 與 rear grip bone 存在，尚無第二武器替換及雙手握點測試，不能算完成。
