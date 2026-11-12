# 武將立繪來源庫

此目錄保存可追溯的立繪版本，位於 assets/resources 外，不會直接進入 Cocos/Web build。每張圖使用「UID__繁體中文名__類型_四位版本號」命名，例如 sun_shang_xiang__孫尚香__standing_0001.png。新版本另存遞增版號，不覆蓋舊檔。

## 子目錄

- standing：站立／介紹立繪
- battle：戰鬥瞬間立繪
- avatars：大頭像
- small_avatars：小頭像

## 狀態與接入

以 catalog.json 為版本索引。review-pending 代表候選稿，尚未核定、不可當成正式遊戲資源；核定後由正式整合流程複製到 assets/resources 並更新遊戲引用。新圖只從核定站立圖裁大頭像及小頭像，依 general-portrait-style 比例與水平置中規範分別製作。
