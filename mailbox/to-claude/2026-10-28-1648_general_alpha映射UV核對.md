# R335：alpha 投影 UV／角點順序核對

在 Cocos 3.8.8 axis-v2 runtime，讀取 head 與 hair_tail 的 `RegionAttachment.getUVs()`、`getOffset()`、`computeWorldVertices()`。兩個 region 的 UV 對應 computeWorldVertices 順序皆為右下、左下、左上、右上（圖片 V 軸向下）；getOffset 為左下、左上、右上、右下，與 2D 專家 fixed-step 腳本的 worldCorners 順序一致。因此先前 live 與 fixed-step 兩種 alpha 投影的角點配對及 Y 軸方向有 runtime API 證據支持。

這只核對兩個 region 的映射，未驗證完整遮擋、透明混合、可見畫面或全部角色。BattleScene 整合仍由 2D 專家調查舊版缺 logger 的初始化錯誤。
