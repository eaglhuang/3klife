# 底座組 en 短標籤縮短（PROG-2-0896）

來源：#694 寬度風險報告（`docs/i18n/overflow-report-2026-10-21.md`）。該報告的「佔位，待譯」列在 #677／#681／#687／#690 合併後已過時，因此改以當前 master 重跑 `tools_node/i18n-overflow-check.js --locale en`。

篩選條件：已有真實譯文（非 `[EN] ` 佔位）、zh-TW 寬 ≤ 8、比例 ≥ 2.0、非養成／本線前綴。

| 鍵 | zh-TW | 改前 | 改後 | 比例（改前→改後）|
|---|---|---|---|---|
| ui.general.aptitude.weather_thunder | 雷暴 | Thunderstorm | Storm | 3.00x → 1.25x |
| ui.lobby.formation | 編隊 | Formation | Lineup | 2.25x → 1.50x |
| ui.general.skill_ready | 主技能 | Primary Skill | Main Skill | 2.17x → 1.67x |
| ui.general.name | 武將名 | General Name | Name | 2.00x → 1.00x |

未處理：ratio 2.0 的 8 寬標籤（ui.settings、ui.general.vitality、ui.general.footer.favorite、ui.general.aptitude.troop_infantry、ui.general.aptitude.terrain_mountain）。ja 只剩 favorite 1.75x，未達門檻。zh-CN 本批不動。實機排版待 Codex 抽查。
