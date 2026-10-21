# ui.general 武將詳情 — 寬度風險摘要（第 3 批，40 鍵）

來源：PROG-2-0889。以 zh-TW 為基礎，zh-CN 沿用前幾批的寫法（與 zh-TW 同字）。

| 鍵值群 | zh-TW（範例） | en（範例） | ja（範例） | 風險 | 備註 |
|---|---|---|---|---|---|
| ui.general.basics.* 欄位標籤（role、status、lifespan、vitality、source） | 天命值： | Destiny: | 天命値： | 低 | 欄位標籤，短 |
| ui.general.basics.lifespan_locked／unlocked | 🔒 未揭露 | 🔒 Undisclosed | 🔒 非公開 | 低 | 欄位值 |
| ui.general.basics.source_unlisted | 未登錄 | Unlisted | 未登録 | 低 | 欄位值 |
| ui.general.stats.* 六色屬性標籤 | 武力 STR： | Force STR: | 武力 STR： | 中 | 標籤含縮寫，en 的 Leadership LEA: 偏長 |
| ui.general.stats.role_summary | 定位評語： | Role Summary: | 役割評価： | 低 | 標籤 |
| ui.general.skills.primary／learned／inspired／locked | 已習得戰法： | Learned Tactics: | 習得済み戦法： | 中 | 區塊標籤，ja 偏長 |
| ui.general.skills.primary_locked／locked_reason | 🔒 因子不符或條件未滿 | 🔒 Factor mismatch or conditions unmet | 🔒 因子不一致または条件未達 | 高 | 鎖定提示，en／ja 偏長，建議多行框 |
| ui.general.skills.note_demo | 【趙雲演示】… | [Zhao Yun demo] Tap here… | 【趙雲デモ】… | 高 | 演示說明，三語長，建議多行框 |
| ui.general.skills.note_default | 狀態規則：… | Status rules: Learned = full color… | 状態ルール：… | 高 | 說明文，最長，建議多行框或縮句 |
| ui.general.aptitude.troop_* | 兵種適性：、騎兵、步兵… | Troop Aptitude:、Cavalry… | 兵種適性：、騎兵… | 低 | 短詞 |
| ui.general.aptitude.terrain_* | 地形適性：、平原… | Terrain Aptitude:、Plains… | 地形適性：、平原… | 低 | 短詞 |
| ui.general.aptitude.weather_* | 天氣適性：、晴天… | Weather Aptitude:、Sunny… | 天候適性：、晴れ… | 低 | 短詞 |

## 建議
- 兩個說明文（note_default、note_demo）與鎖定提示（locked_reason）三語偏長，正式接線時建議多行框。
- 其餘為短詞，風險低到中。以 Codex 實機截圖為準。
- 剩餘 10 鍵（aptitude.weather_thunder、pref_terrain、terrain_defense、extended.hp／sp／atk、extended.notes／notes_empty、dev_note、dev_note_default）留待下一張卡。
