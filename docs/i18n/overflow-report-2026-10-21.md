# i18n 寬度風險報告（2026-10-21）

- 範圍：`assets/resources/i18n/en.json`、`ja.json`，對照 `zh-TW.json`，共 257（en）與 233（ja）筆風險項。
- 工具：`node tools_node/i18n-overflow-check.js --locale en|ja --threshold 1.0`，以字元數估算寬度（比例 = 譯文寬 ÷ zh-TW 寬）。
- 基準：master 於 2026-10-21 的語系檔。其中 `（佔位，待譯）` 代表 master 仍是佔位字串，寬度為佔位字長，不代表實際譯文寬度。
- 等級：高 ≥ 2.0 倍、中 1.5–2.0 倍、低 < 1.5 倍（與 `/tmp/claude-parse.js` 的判定一致）。
- 快照性質：本表是 2026-10-21 產生時的 master 狀態。#674、#676 合併後，`ui.result.*`、`toast.deploy_*`、`toast.no_grain`、`toast.cooldown` 已有譯文，表中仍標「佔位，待譯」的列已過期，請以重跑工具的結果為準。
- 未做實機排版驗證，待 Codex 在 Web 建置中抽查。

## 分工

- 本線（戰場／季節／官職／戰報／導覽）：#674 已合併；#676 待合併，處理 ui.result、toast.deploy_*、toast.no_grain、toast.cooldown。其餘列於下表。
- 養成線：`ui.general.{bloodline,nurture,mentor,factor,ultimate}`，見各節「養成」。
- 底座：系統／大廳／存檔／抽卡與其餘 `ui.general.*`，見「底座」。


## en（257 項）

等級：高 112、中 83、低 62（比例 = 譯文寬度 ÷ zh-TW 寬度）

### 底座（系統／大廳／存檔／抽卡等）或其他（163 項）

| 等級 | 鍵值 | zh-TW 寬 | 譯文寬 | 比例 | 譯文 |
|---|---|---|---|---|---|
| 高 | ui.general.basics.age_unit | 2 | 31 | 15.50x | （佔位，待譯） |
| 高 | ui.general.aptitude.weather_thunder | 4 | 40 | 10.00x | （佔位，待譯） |
| 高 | ui.general.footer.favorite | 4 | 31 | 7.75x | （佔位，待譯） |
| 高 | ui.general.footer.compare | 4 | 30 | 7.50x | （佔位，待譯） |
| 高 | ui.general.footer.share | 4 | 28 | 7.00x | （佔位，待譯） |
| 高 | ui.general.footer.lock | 4 | 27 | 6.75x | （佔位，待譯） |
| 高 | ui.general.vitality | 4 | 24 | 6.00x | （佔位，待譯） |
| 高 | ui.lobby.formation | 4 | 23 | 5.75x | （佔位，待譯） |
| 高 | ui.general.faction | 4 | 23 | 5.75x | （佔位，待譯） |
| 高 | ui.general.basics.uid | 5 | 26 | 5.20x | （佔位，待譯） |
| 高 | ui.general.basics.faction | 6 | 30 | 5.00x | （佔位，待譯） |
| 高 | ui.general.extended.notes | 6 | 30 | 5.00x | （佔位，待譯） |
| 高 | ui.general.basics.gender | 6 | 29 | 4.83x | （佔位，待譯） |
| 高 | ui.general.age | 4 | 19 | 4.75x | （佔位，待譯） |
| 高 | ui.general.basics.title | 6 | 28 | 4.67x | （佔位，待譯） |
| 高 | ui.lobby.shop | 4 | 18 | 4.50x | （佔位，待譯） |
| 高 | ui.general.hp | 4 | 18 | 4.50x | （佔位，待譯） |
| 高 | ui.general.sp | 4 | 18 | 4.50x | （佔位，待譯） |
| 高 | ui.general.skill_ready | 6 | 27 | 4.50x | （佔位，待譯） |
| 高 | ui.general.basics.name | 6 | 27 | 4.50x | （佔位，待譯） |
| 高 | ui.general.basics.age | 6 | 26 | 4.33x | （佔位，待譯） |
| 高 | ui.settings | 4 | 16 | 4.00x | （佔位，待譯） |
| 高 | ui.confirm | 4 | 15 | 3.75x | （佔位，待譯） |
| 高 | UI_CONFIRM | 4 | 15 | 3.75x | （佔位，待譯） |
| 高 | ui.general.aptitude.pref_terrain | 10 | 37 | 3.70x | （佔位，待譯） |
| 高 | ui.cancel | 4 | 14 | 3.50x | （佔位，待譯） |
| 高 | ui.general.tab.aptitude | 8 | 28 | 3.50x | （佔位，待譯） |
| 高 | ui.general.tab.extended | 8 | 28 | 3.50x | （佔位，待譯） |
| 高 | ui.general.basics.title_locked | 10 | 35 | 3.50x | （佔位，待譯） |
| 高 | UI_CANCEL | 4 | 14 | 3.50x | （佔位，待譯） |
| 高 | ui.general.basics.template | 9 | 31 | 3.44x | （佔位，待譯） |
| 高 | ui.general.name | 6 | 20 | 3.33x | （佔位，待譯） |
| 高 | network.offline | 6 | 20 | 3.33x | （佔位，待譯） |
| 高 | ui.general.extended.dev_note | 10 | 33 | 3.30x | （佔位，待譯） |
| 高 | ui.close | 4 | 13 | 3.25x | （佔位，待譯） |
| 高 | ui.retry | 4 | 13 | 3.25x | （佔位，待譯） |
| 高 | ui.lobby.general_list | 8 | 26 | 3.25x | （佔位，待譯） |
| 高 | ui.lobby.enter_battle | 8 | 26 | 3.25x | （佔位，待譯） |
| 高 | ui.general.tab.basics | 8 | 26 | 3.25x | （佔位，待譯） |
| 高 | UI_CLOSE | 4 | 13 | 3.25x | （佔位，待譯） |
| 高 | network.online | 6 | 19 | 3.17x | （佔位，待譯） |
| 高 | record.milestone.KILL_10000 | 6 | 19 | 3.17x | Ten-Thousand Slayer |
| 高 | ui.general.tab.stats | 8 | 25 | 3.13x | （佔位，待譯） |
| 高 | ui.back | 4 | 12 | 3.00x | （佔位，待譯） |
| 高 | ui.save | 4 | 12 | 3.00x | （佔位，待譯） |
| 高 | ui.exit | 4 | 12 | 3.00x | （佔位，待譯） |
| 高 | ui.general.ep | 6 | 18 | 3.00x | （佔位，待譯） |
| 高 | ui.general.sixStats | 8 | 24 | 3.00x | （佔位，待譯） |
| 高 | ui.general.extended.hp | 9 | 27 | 3.00x | （佔位，待譯） |
| 高 | ui.general.extended.sp | 9 | 27 | 3.00x | （佔位，待譯） |
| 高 | ui.general.extended.notes_empty | 12 | 36 | 3.00x | （佔位，待譯） |
| 高 | toast.sync_complete | 8 | 24 | 3.00x | （佔位，待譯） |
| 高 | ui.general.tab.bloodline | 10 | 29 | 2.90x | （佔位，待譯） |
| 高 | ui.style_check.secondary | 10 | 29 | 2.90x | （佔位，待譯） |
| 高 | ui.style_check.parchment | 10 | 29 | 2.90x | （佔位，待譯） |
| 高 | ui.general.terrain | 8 | 23 | 2.88x | （佔位，待譯） |
| 高 | ui.general.details | 8 | 23 | 2.88x | （佔位，待譯） |
| 高 | ui.general.aptitude.terrain_defense | 14 | 40 | 2.86x | （佔位，待譯） |
| 高 | ui.general.extended.atk | 10 | 28 | 2.80x | （佔位，待譯） |
| 高 | ui.breed.daqi | 36 | 98 | 2.72x | A scholar sighs: this child is a dragon |
| 高 | ui.style_check.primary | 10 | 27 | 2.70x | （佔位，待譯） |
| 高 | ui.year_report.intro | 20 | 53 | 2.65x | The year draws to a close. Looking back |
| 高 | ui.general.skill | 8 | 21 | 2.63x | （佔位，待譯） |
| 高 | ui.general.tab.skills | 10 | 26 | 2.60x | （佔位，待譯） |
| 高 | network.connecting | 9 | 23 | 2.56x | （佔位，待譯） |
| 高 | life.script.afterlife | 38 | 97 | 2.55x | {0}'s Spirit Card and Tiger Tally have b |
| 高 | ui.start_battle | 8 | 20 | 2.50x | （佔位，待譯） |
| 高 | UI_OK | 4 | 10 | 2.50x | （佔位，待譯） |
| 高 | record.milestone.KILL_1000 | 6 | 15 | 2.50x | Thousand Slayer |
| 高 | ui.lobby.title | 8 | 19 | 2.38x | （佔位，待譯） |
| 高 | ui.general.atk | 8 | 19 | 2.38x | （佔位，待譯） |
| 高 | record.milestone.KILL_100 | 6 | 14 | 2.33x | Hundred Slayer |
| 高 | ui.fate.script.retire_weapon | 34 | 79 | 2.32x | {0} laid down the blade and became a tig |
| 高 | life.script.retire | 36 | 82 | 2.28x | {0} has hung up their armor and retired, |
| 高 | life.script.elder | 26 | 59 | 2.27x | {0} has grown frail with age, yet their |
| 高 | ui.start_game | 8 | 18 | 2.25x | （佔位，待譯） |
| 高 | toast.offline | 8 | 18 | 2.25x | （佔位，待譯） |
| 高 | life.script.death | 30 | 66 | 2.20x | {0} passed away at the age of {1}; a leg |
| 高 | ui.breed.child_born | 31 | 67 | 2.16x | Congratulations, my lord! {0} and {1} ha |
| 高 | record.milestone.UNDEFEATED_50 | 8 | 17 | 2.13x | Undefeated Legend |
| 高 | record.milestone.GUARDIAN_WALL | 8 | 17 | 2.13x | Wall of Guardians |
| 高 | life.script.grow_up | 26 | 53 | 2.04x | {0} is growing up and beginning to show |
| 高 | ui.general.aptitude.troop_infantry | 4 | 8 | 2.00x | Infantry |
| 高 | ui.general.aptitude.terrain_mountain | 4 | 8 | 2.00x | Mountain |
| 高 | toast.syncing | 9 | 18 | 2.00x | （佔位，待譯） |
| 高 | ui.fate.script.reveal | 38 | 76 | 2.00x | Heaven's guidance: {0} is born with {1}, |
| 中 | ui.vit.script.hint_late_bloomer | 29 | 57 | 1.97x | {0} is frail, yet there is a strange lig |
| 中 | ui.fate.script.retire_scroll | 38 | 75 | 1.97x | {0} set down the bamboo slips; their wis |
| 中 | ui.breed.preg_status | 39 | 76 | 1.95x | {0} has entered the expecting period; th |
| 中 | life.script.prime | 24 | 46 | 1.92x | {0} is in their prime, and armies flee i |
| 中 | ui.year_report.title | 12 | 23 | 1.92x | Year {0} Annual Summary |
| 中 | ui.fate.retire_weapon | 13 | 25 | 1.92x | Received tiger tally: {0} |
| 中 | ui.fate.retire_scroll | 13 | 25 | 1.92x | Received bamboo slip: {0} |
| 中 | ui.general.skills.primary | 8 | 15 | 1.88x | Primary Tactic: |
| 中 | ui.general.skills.locked_reason | 20 | 37 | 1.85x | 🔒 Factor mismatch or conditions unmet |
| 中 | life.phase.prime | 6 | 11 | 1.83x | Young Adult |
| 中 | life.phase.elder | 6 | 11 | 1.83x | Elder Years |
| 中 | life.death_notify | 21 | 37 | 1.76x | {0} has passed away at the age of {1} |
| 中 | ui.general.title | 12 | 21 | 1.75x | （佔位，待譯） |
| 中 | ui.general.aptitude.troop_cavalry | 4 | 7 | 1.75x | Cavalry |
| 中 | ui.fate.script.job_change | 41 | 71 | 1.73x | At the coming-of-age ceremony at 20, {0} |
| 中 | ui.general.coreTags | 14 | 24 | 1.71x | （佔位，待譯） |
| 中 | ui.general.aptitude.terrain | 10 | 17 | 1.70x | Terrain Aptitude: |
| 中 | ui.general.aptitude.weather | 10 | 17 | 1.70x | Weather Aptitude: |
| 中 | ui.vit.script.pill_used | 26 | 44 | 1.69x | {0} took a Vitality Pill. Vitality resto |
| 中 | ui.loading | 9 | 15 | 1.67x | （佔位，待譯） |
| 中 | ui.general.skills.locked | 12 | 20 | 1.67x | Undisclosed Tactics: |
| 中 | ui.fate.accept | 22 | 36 | 1.64x | Accept heaven's will (normal growth) |
| 中 | ui.general.basics.lifespan_locked | 8 | 13 | 1.63x | 🔒 Undisclosed |
| 中 | ui.general.basics.unlocked | 8 | 13 | 1.63x | 🔒 Undisclosed |
| 中 | ui.general.extended.hidden_flags_list | 30 | 49 | 1.63x | 🔒 Destiny value / Full genealogy / Hidd |
| 中 | legacy.essence_line | 13 | 21 | 1.62x | Essence snapshot: {0} |
| 中 | ui.gene.tag.blue | 10 | 16 | 1.60x | 🔵 Attribute Gene |
| 中 | ui.general.skills.inspired | 12 | 19 | 1.58x | Inspirable Tactics: |
| 中 | ui.breed.unveil_5 | 28 | 44 | 1.57x | Destiny unveiled! Five-stat results for |
| 中 | ui.fate.job_change | 30 | 47 | 1.57x | Consume 1 Career Writ; adds secondary ro |
| 中 | ui.fate.script.defy | 39 | 61 | 1.56x | My lord defies heaven! The road ahead fo |
| 中 | ui.vit.script.pregnancy_lock | 29 | 45 | 1.55x | {0} is pregnant. Vitality recovery is pa |
| 中 | ui.general.skills.note_default | 67 | 101 | 1.51x | Status rules: Learned = full color; Insp |
| 中 | ui.general.basics.vitality | 6 | 9 | 1.50x | Vitality: |
| 中 | ui.general.stats.lea | 10 | 15 | 1.50x | Leadership LEA: |
| 中 | ui.general.skills.primary_locked | 8 | 12 | 1.50x | 🔒 Unassigned |
| 中 | ui.general.skills.note_demo | 42 | 63 | 1.50x | [Zhao Yun demo] Tap here to preview skil |
| 中 | ui.general.aptitude.troop | 10 | 15 | 1.50x | Troop Aptitude: |
| 中 | ui.general.aptitude.troop_archer | 4 | 6 | 1.50x | Archer |
| 中 | ui.general.aptitude.terrain_plain | 4 | 6 | 1.50x | Plains |
| 中 | ui.general.aptitude.terrain_forest | 4 | 6 | 1.50x | Forest |
| 中 | ui.general.aptitude.terrain_desert | 4 | 6 | 1.50x | Desert |
| 中 | ui.general.extended.hidden_flags | 10 | 15 | 1.50x | Hidden fields: |
| 中 | ui.year_report.deaths | 14 | 21 | 1.50x | Deaths this year: {0} |
| 中 | ui.year_report.retirements | 24 | 36 | 1.50x | Retirement candidates this year: {0} |
| 中 | ui.gene.tag.pink | 10 | 15 | 1.50x | 💗 Aptitude Gene |
| 中 | ui.gene.tag.red | 10 | 15 | 1.50x | 🔴 Physique Gene |
| 低 | ui.vit.script.exhausted | 28 | 40 | 1.43x | {0} is exhausted and cannot act for now. |
| 低 | ui.general.stats.int | 10 | 14 | 1.40x | Intellect INT: |
| 低 | ui.fate.reveal | 13 | 18 | 1.38x | Destiny split: {0} |
| 低 | ui.general.extended.dev_note_default | 30 | 41 | 1.37x | （佔位，待譯） |
| 低 | ui.general.basics.source_unlisted | 6 | 8 | 1.33x | Unlisted |
| 低 | ui.general.skills.learned | 12 | 16 | 1.33x | Learned Tactics: |
| 低 | life.lifespan_bar | 13 | 17 | 1.31x | Lifespan: {0}/{1} |
| 低 | ui.general.stats.pol | 10 | 13 | 1.30x | Politics POL: |
| 低 | ui.general.stats.role_summary | 10 | 13 | 1.30x | Role Summary: |
| 低 | ui.gene.tag.green | 10 | 13 | 1.30x | 🟢 Tactic Seed |
| 低 | ui.gene.tag.white | 10 | 13 | 1.30x | ⚪ Talent Gene |
| 低 | ui.breed.confirm | 45 | 57 | 1.27x | Spend {0} vigor {1} and {2} vigor {3}. C |
| 低 | ui.fate.defy | 39 | 49 | 1.26x | Defy heaven (growth -20%, a chance to bl |
| 低 | ui.general.aptitude.troop_siege | 4 | 5 | 1.25x | Siege |
| 低 | ui.general.aptitude.terrain_water | 4 | 5 | 1.25x | Water |
| 低 | ui.general.aptitude.weather_sunny | 4 | 5 | 1.25x | Sunny |
| 低 | ui.general.aptitude.weather_night | 4 | 5 | 1.25x | Night |
| 低 | record.milestone.ASURA | 4 | 5 | 1.25x | Asura |
| 低 | ui.year_report.close | 4 | 5 | 1.25x | Close |
| 低 | ui.breed.ep_display | 22 | 26 | 1.18x | Estimated burst: {0} ({1}) |
| 低 | ui.general.basics.status | 6 | 7 | 1.17x | Status: |
| 低 | ui.general.basics.source | 6 | 7 | 1.17x | Source: |
| 低 | ui.style_check.title | 22 | 25 | 1.14x | （佔位，待譯） |
| 低 | ui.gene.tag.purple | 10 | 11 | 1.10x | 🟣 Fate Gene |
| 低 | ui.general.basics.lifespan | 8 | 8 | 1.00x | Destiny: |
| 低 | ui.general.stats.str | 10 | 10 | 1.00x | Force STR: |
| 低 | ui.general.stats.cha | 10 | 10 | 1.00x | Charm CHA: |
| 低 | ui.general.aptitude.weather_rainy | 4 | 4 | 1.00x | Rain |
| 低 | ui.general.aptitude.weather_windy | 4 | 4 | 1.00x | Wind |
| 低 | life.age_display | 13 | 13 | 1.00x | {0} (age {1}) |

### 本線（戰場／季節／官職／戰報／導覽）（79 項）

| 等級 | 鍵值 | zh-TW 寬 | 譯文寬 | 比例 | 譯文 |
|---|---|---|---|---|---|
| 高 | ui.result.victory | 4 | 22 | 5.50x | （佔位，待譯） |
| 高 | ui.result.defeat | 4 | 21 | 5.25x | （佔位，待譯） |
| 高 | ui.result.reward | 4 | 21 | 5.25x | （佔位，待譯） |
| 高 | ui.result.score | 4 | 20 | 5.00x | （佔位，待譯） |
| 高 | ui.result.draw | 4 | 19 | 4.75x | （佔位，待譯） |
| 高 | ui.result.back_to_lobby | 8 | 28 | 3.50x | （佔位，待譯） |
| 高 | ui.result.enemies_defeated | 10 | 31 | 3.10x | （佔位，待譯） |
| 高 | toast.deploy_failed | 8 | 24 | 3.00x | （佔位，待譯） |
| 高 | ui.result.units_deployed | 10 | 29 | 2.90x | （佔位，待譯） |
| 高 | ui.result.title | 8 | 20 | 2.50x | （佔位，待譯） |
| 高 | ui.result.turns_used | 10 | 25 | 2.50x | （佔位，待譯） |
| 高 | ui.result.retry | 8 | 20 | 2.50x | （佔位，待譯） |
| 高 | toast.deploy_success | 10 | 25 | 2.50x | （佔位，待譯） |
| 高 | toast.no_grain | 8 | 19 | 2.38x | （佔位，待譯） |
| 高 | ui.retire_review.grant_weapon | 11 | 26 | 2.36x | Received Tiger Talisman ×1 |
| 高 | UI_NAV_FLOOD | 4 | 9 | 2.25x | Flood War |
| 高 | ui.season.winter | 12 | 26 | 2.17x | Winter — Siege in the Snow |
| 高 | ui.retire_review.title | 8 | 17 | 2.13x | Retirement Review |
| 高 | ui.retire_review.grant_scroll | 11 | 23 | 2.09x | Received Bamboo Slip ×1 |
| 高 | ui.season.autumn | 12 | 25 | 2.08x | Autumn — Galloping Charge |
| 高 | UI_NAV_GENERALS | 4 | 8 | 2.00x | Generals |
| 中 | duel.accepted | 14 | 27 | 1.93x | {0} accepted the challenge! |
| 中 | duel.rejected | 14 | 27 | 1.93x | {0} declined the challenge! |
| 中 | ui.retire_review.report_title | 12 | 23 | 1.92x | Quarterly Battle Report |
| 中 | toast.cooldown | 10 | 19 | 1.90x | （佔位，待譯） |
| 中 | UI_ULTIMATE_TITLE | 8 | 15 | 1.88x | Choose Ultimate |
| 中 | ui.season.effect.conception | 11 | 20 | 1.82x | Conception rate ×{0} |
| 中 | status.stun | 4 | 7 | 1.75x | Stunned |
| 中 | UI_DUEL_REJECT | 4 | 7 | 1.75x | Decline |
| 中 | UI_NAV_SUPPORT | 4 | 7 | 1.75x | Support |
| 中 | ui.season.summer | 12 | 21 | 1.75x | Summer — Beacon Fires |
| 中 | battle.dp | 8 | 13 | 1.63x | Deploy Points |
| 中 | ui.retire_review.quarterly | 30 | 49 | 1.63x | Quarterly report: {0} has {1}% vitality |
| 中 | duel.challenge | 18 | 29 | 1.61x | {0} has challenged to a duel! |
| 中 | ui.season.effect.training | 17 | 26 | 1.53x | Training stamina cost ×{0} |
| 中 | ui.retire_review.script | 49 | 74 | 1.51x | Looking back: {0} wins, {1} enemies slai |
| 中 | status.poison | 4 | 6 | 1.50x | Poison |
| 中 | status.shield | 4 | 6 | 1.50x | Shield |
| 中 | status.curse | 4 | 6 | 1.50x | Cursed |
| 中 | battle.deploy | 4 | 6 | 1.50x | Deploy |
| 中 | battle.strategy | 4 | 6 | 1.50x | Tactic |
| 中 | duel.challenge_title | 10 | 15 | 1.50x | Duel Challenge! |
| 中 | duel.reject | 8 | 12 | 1.50x | Decline Duel |
| 中 | duel.penalty | 12 | 18 | 1.50x | Army morale shaken |
| 中 | UI_ULTIMATE_CANCEL | 4 | 6 | 1.50x | Cancel |
| 中 | UI_NAV_BATTLE | 4 | 6 | 1.50x | Battle |
| 中 | ui.retire_review.bond_ok | 12 | 18 | 1.50x | ready for bonding. |
| 中 | ui.retire_review.bond_no | 16 | 24 | 1.50x | bonding not recommended. |
| 中 | ui.spirit_codex.title | 8 | 12 | 1.50x | Spirit Codex |
| 中 | ui.spirit_codex.empty | 48 | 72 | 1.50x | No Spirit Cards yet. Generals who qualif |
| 低 | ui.retire_review.report | 19 | 28 | 1.47x | Battle damage: vitality {0}% |
| 低 | battle.deploy_failed | 8 | 11 | 1.38x | No supplies |
| 低 | battle.skill_ready | 8 | 11 | 1.38x | Skill ready |
| 低 | duel.accept | 8 | 11 | 1.38x | Accept Duel |
| 低 | UI_DUEL_ACCEPT | 8 | 11 | 1.38x | Accept Duel |
| 低 | ui.season.effect.food | 13 | 18 | 1.38x | Supply income ×{0} |
| 低 | ui.retire_review.career | 29 | 39 | 1.34x | Career: {0} wins, {1} losses, {2} kills |
| 低 | ui.season.spring | 12 | 16 | 1.33x | Spring — Renewal |
| 低 | battle.round | 4 | 5 | 1.25x | Round |
| 低 | battle.skill | 4 | 5 | 1.25x | Skill |
| 低 | battle.pause | 4 | 5 | 1.25x | Pause |
| 低 | battle.grain | 4 | 5 | 1.25x | Grain |
| 低 | battle.turn_end | 8 | 10 | 1.25x | Turn ended |
| 低 | UI_NAV_GACHA | 4 | 5 | 1.25x | Gacha |
| 低 | ui.retire_review.close | 4 | 5 | 1.25x | Close |
| 低 | ui.spirit_codex.close | 4 | 5 | 1.25x | Close |
| 低 | duel.challenge_desc | 23 | 28 | 1.22x | {0} challenges {1} to a duel |
| 低 | UI_DUEL_TITLE | 14 | 17 | 1.21x | ⚔ Duel Invitation |
| 低 | ui.season.effect.travel | 14 | 17 | 1.21x | Travel +{0} turns |
| 低 | ui.season.effect.none | 14 | 16 | 1.14x | No season effect |
| 低 | ui.spirit_codex.more | 17 | 18 | 1.06x | {0} more not shown |
| 低 | battle.end_turn | 8 | 8 | 1.00x | End Turn |
| 低 | battle.duel | 4 | 4 | 1.00x | Duel |
| 低 | battle.deploy_success | 8 | 8 | 1.00x | Deployed |
| 低 | battle.damage.receive | 15 | 15 | 1.00x | Took {0} damage |
| 低 | battle.heal.receive | 15 | 15 | 1.00x | Restored {0} HP |
| 低 | UI_ULTIMATE_CAST | 4 | 4 | 1.00x | Cast |
| 低 | UI_NAV_SHOP | 4 | 4 | 1.00x | Shop |
| 低 | ui.spirit_codex.count | 11 | 11 | 1.00x | {0} Spirits |

### 養成（15 項）

| 等級 | 鍵值 | zh-TW 寬 | 譯文寬 | 比例 | 譯文 |
|---|---|---|---|---|---|
| 高 | ui.general.bloodline.hidden_factor.killing_intent | 4 | 19 | 4.75x | （佔位，待譯） |
| 高 | ui.general.bloodline.hidden_factor.undefeated | 4 | 15 | 3.75x | （佔位，待譯） |
| 高 | ui.general.bloodline.hidden_factor.iron_wall | 4 | 14 | 3.50x | （佔位，待譯） |
| 高 | ui.general.bloodline.awakening_locked | 8 | 18 | 2.25x | 🔒 Not yet awakened |
| 高 | ui.general.bloodline_hint | 58 | 125 | 2.16x | The bloodline summary and factor slots s |
| 中 | ui.general.bloodline.ancestors | 11 | 20 | 1.82x | 14-ancestor matrix: |
| 中 | ui.general.bloodline.ep_locked | 8 | 13 | 1.63x | 🔒 Undisclosed |
| 中 | ui.general.bloodline.parents | 10 | 16 | 1.60x | Parent summary: |
| 中 | ui.general.bloodline.awakening | 10 | 16 | 1.60x | Awakened title: |
| 中 | ui.general.bloodline.id | 9 | 14 | 1.56x | Bloodline ID: |
| 中 | ui.general.bloodline.hidden_factor | 10 | 15 | 1.50x | Hidden factor: |
| 中 | ui.general.bloodline.hidden_factor_none | 8 | 12 | 1.50x | Not awakened |
| 低 | ui.general.bloodline.ancestors_hint | 28 | 41 | 1.46x | 🔒 Tap to expand the full bloodline matr |
| 低 | ui.general.bloodline.parents_collapsed | 18 | 26 | 1.44x | 🔒 Parent data not expanded |
| 低 | ui.general.bloodline.ep_rating | 12 | 14 | 1.17x | Burst rating: |


## ja（233 項）

等級：高 87、中 7、低 139（比例 = 譯文寬度 ÷ zh-TW 寬度）

### 底座（系統／大廳／存檔／抽卡等）或其他（154 項）

| 等級 | 鍵值 | zh-TW 寬 | 譯文寬 | 比例 | 譯文 |
|---|---|---|---|---|---|
| 高 | ui.general.basics.age_unit | 2 | 31 | 15.50x | （佔位，待譯） |
| 高 | ui.general.aptitude.weather_thunder | 4 | 40 | 10.00x | （佔位，待譯） |
| 高 | ui.general.footer.favorite | 4 | 31 | 7.75x | （佔位，待譯） |
| 高 | ui.general.footer.compare | 4 | 30 | 7.50x | （佔位，待譯） |
| 高 | ui.general.footer.share | 4 | 28 | 7.00x | （佔位，待譯） |
| 高 | ui.general.footer.lock | 4 | 27 | 6.75x | （佔位，待譯） |
| 高 | ui.general.vitality | 4 | 24 | 6.00x | （佔位，待譯） |
| 高 | ui.lobby.formation | 4 | 23 | 5.75x | （佔位，待譯） |
| 高 | ui.general.faction | 4 | 23 | 5.75x | （佔位，待譯） |
| 高 | ui.general.basics.uid | 5 | 26 | 5.20x | （佔位，待譯） |
| 高 | ui.general.basics.faction | 6 | 30 | 5.00x | （佔位，待譯） |
| 高 | ui.general.extended.notes | 6 | 30 | 5.00x | （佔位，待譯） |
| 高 | ui.general.basics.gender | 6 | 29 | 4.83x | （佔位，待譯） |
| 高 | ui.general.age | 4 | 19 | 4.75x | （佔位，待譯） |
| 高 | ui.general.basics.title | 6 | 28 | 4.67x | （佔位，待譯） |
| 高 | ui.lobby.shop | 4 | 18 | 4.50x | （佔位，待譯） |
| 高 | ui.general.hp | 4 | 18 | 4.50x | （佔位，待譯） |
| 高 | ui.general.sp | 4 | 18 | 4.50x | （佔位，待譯） |
| 高 | ui.general.skill_ready | 6 | 27 | 4.50x | （佔位，待譯） |
| 高 | ui.general.basics.name | 6 | 27 | 4.50x | （佔位，待譯） |
| 高 | ui.general.basics.age | 6 | 26 | 4.33x | （佔位，待譯） |
| 高 | ui.settings | 4 | 16 | 4.00x | （佔位，待譯） |
| 高 | ui.confirm | 4 | 15 | 3.75x | （佔位，待譯） |
| 高 | UI_CONFIRM | 4 | 15 | 3.75x | （佔位，待譯） |
| 高 | ui.general.aptitude.pref_terrain | 10 | 37 | 3.70x | （佔位，待譯） |
| 高 | ui.cancel | 4 | 14 | 3.50x | （佔位，待譯） |
| 高 | ui.general.tab.aptitude | 8 | 28 | 3.50x | （佔位，待譯） |
| 高 | ui.general.tab.extended | 8 | 28 | 3.50x | （佔位，待譯） |
| 高 | ui.general.basics.title_locked | 10 | 35 | 3.50x | （佔位，待譯） |
| 高 | UI_CANCEL | 4 | 14 | 3.50x | （佔位，待譯） |
| 高 | ui.general.basics.template | 9 | 31 | 3.44x | （佔位，待譯） |
| 高 | ui.general.name | 6 | 20 | 3.33x | （佔位，待譯） |
| 高 | network.offline | 6 | 20 | 3.33x | （佔位，待譯） |
| 高 | ui.general.extended.dev_note | 10 | 33 | 3.30x | （佔位，待譯） |
| 高 | ui.close | 4 | 13 | 3.25x | （佔位，待譯） |
| 高 | ui.retry | 4 | 13 | 3.25x | （佔位，待譯） |
| 高 | ui.lobby.general_list | 8 | 26 | 3.25x | （佔位，待譯） |
| 高 | ui.lobby.enter_battle | 8 | 26 | 3.25x | （佔位，待譯） |
| 高 | ui.general.tab.basics | 8 | 26 | 3.25x | （佔位，待譯） |
| 高 | UI_CLOSE | 4 | 13 | 3.25x | （佔位，待譯） |
| 高 | network.online | 6 | 19 | 3.17x | （佔位，待譯） |
| 高 | ui.general.tab.stats | 8 | 25 | 3.13x | （佔位，待譯） |
| 高 | ui.back | 4 | 12 | 3.00x | （佔位，待譯） |
| 高 | ui.save | 4 | 12 | 3.00x | （佔位，待譯） |
| 高 | ui.exit | 4 | 12 | 3.00x | （佔位，待譯） |
| 高 | ui.general.ep | 6 | 18 | 3.00x | （佔位，待譯） |
| 高 | ui.general.sixStats | 8 | 24 | 3.00x | （佔位，待譯） |
| 高 | ui.general.extended.hp | 9 | 27 | 3.00x | （佔位，待譯） |
| 高 | ui.general.extended.sp | 9 | 27 | 3.00x | （佔位，待譯） |
| 高 | ui.general.extended.notes_empty | 12 | 36 | 3.00x | （佔位，待譯） |
| 高 | toast.sync_complete | 8 | 24 | 3.00x | （佔位，待譯） |
| 高 | ui.general.tab.bloodline | 10 | 29 | 2.90x | （佔位，待譯） |
| 高 | ui.style_check.secondary | 10 | 29 | 2.90x | （佔位，待譯） |
| 高 | ui.style_check.parchment | 10 | 29 | 2.90x | （佔位，待譯） |
| 高 | ui.general.terrain | 8 | 23 | 2.88x | （佔位，待譯） |
| 高 | ui.general.details | 8 | 23 | 2.88x | （佔位，待譯） |
| 高 | ui.general.aptitude.terrain_defense | 14 | 40 | 2.86x | （佔位，待譯） |
| 高 | ui.general.extended.atk | 10 | 28 | 2.80x | （佔位，待譯） |
| 高 | ui.style_check.primary | 10 | 27 | 2.70x | （佔位，待譯） |
| 高 | ui.general.skill | 8 | 21 | 2.63x | （佔位，待譯） |
| 高 | ui.general.tab.skills | 10 | 26 | 2.60x | （佔位，待譯） |
| 高 | network.connecting | 9 | 23 | 2.56x | （佔位，待譯） |
| 高 | ui.start_battle | 8 | 20 | 2.50x | （佔位，待譯） |
| 高 | UI_OK | 4 | 10 | 2.50x | （佔位，待譯） |
| 高 | ui.lobby.title | 8 | 19 | 2.38x | （佔位，待譯） |
| 高 | ui.general.atk | 8 | 19 | 2.38x | （佔位，待譯） |
| 高 | ui.start_game | 8 | 18 | 2.25x | （佔位，待譯） |
| 高 | toast.offline | 8 | 18 | 2.25x | （佔位，待譯） |
| 高 | toast.syncing | 9 | 18 | 2.00x | （佔位，待譯） |
| 中 | ui.general.title | 12 | 21 | 1.75x | （佔位，待譯） |
| 中 | ui.general.coreTags | 14 | 24 | 1.71x | （佔位，待譯） |
| 中 | ui.loading | 9 | 15 | 1.67x | （佔位，待譯） |
| 低 | life.script.elder | 26 | 36 | 1.38x | {0} は年老いて力は衰えたが、経験は今も健在だ。 |
| 低 | ui.general.extended.dev_note_default | 30 | 41 | 1.37x | （佔位，待譯） |
| 低 | life.script.retire | 36 | 48 | 1.33x | {0} は鎧を掛けて田園に帰り、生涯の学びを後世へ伝えたいと願った。 |
| 低 | legacy.essence_line | 13 | 17 | 1.31x | 精華スナップショット：{0} |
| 低 | ui.general.skills.inspired | 12 | 15 | 1.25x | 啓発可能な戦法： |
| 低 | ui.vit.script.hint_late_bloomer | 29 | 36 | 1.24x | {0}は弱っているが、その瞳には不思議な光が宿っている… |
| 低 | ui.year_report.deaths | 14 | 17 | 1.21x | 今年の死去：{0} 人 |
| 低 | ui.general.extended.hidden_flags | 10 | 12 | 1.20x | 非表示項目： |
| 低 | ui.breed.daqi | 36 | 43 | 1.19x | 名士は嘆く：この子は深淵に潜む龍。天機は漏らしてはならぬ。 |
| 低 | life.script.grow_up | 26 | 31 | 1.19x | {0} は少しずつ成長し、頭角を現し始めた！ |
| 低 | ui.vit.script.pill_used | 26 | 31 | 1.19x | {0}は補元散を服用し、精力が回復した！ |
| 低 | ui.breed.unveil_5 | 28 | 33 | 1.18x | 天命の開示！{0} の五維の資質が明らかに： |
| 低 | life.script.prime | 24 | 28 | 1.17x | {0} は壮年の盛り、千の軍勢も退く！ |
| 低 | record.milestone.KILL_100 | 6 | 7 | 1.17x | 百人斬り |
| 低 | record.milestone.KILL_1000 | 6 | 7 | 1.17x | 千人斬り |
| 低 | record.milestone.KILL_10000 | 6 | 7 | 1.17x | 万人斬り |
| 低 | ui.breed.child_born | 31 | 36 | 1.16x | おめでとうございます！{0} と {1} に{2}が授かりました！ |
| 低 | ui.general.skills.locked_reason | 20 | 23 | 1.15x | 🔒 因子不一致または条件未達 |
| 低 | ui.year_report.intro | 20 | 23 | 1.15x | 一年が暮れ、今年を振り返る…… |
| 低 | ui.style_check.title | 22 | 25 | 1.14x | （佔位，待譯） |
| 低 | ui.vit.script.exhausted | 28 | 32 | 1.14x | {0}は精力を使い果たし、しばらく行動できない。 |
| 低 | ui.vit.script.pregnancy_lock | 29 | 33 | 1.14x | {0}は懐妊中のため、精力の回復が止まっている… |
| 低 | ui.fate.job_change | 30 | 34 | 1.13x | 転職令 ×1 を消費し、副職能を追加：{0} |
| 低 | ui.fate.script.retire_weapon | 34 | 38 | 1.12x | {0}は刃を置き、虎符となった。その戦技は永く伝わる。 |
| 低 | ui.general.skills.learned | 12 | 13 | 1.08x | 習得済み戦法： |
| 低 | ui.general.skills.locked | 12 | 13 | 1.08x | 非公開の戦法： |
| 低 | ui.fate.script.reveal | 38 | 41 | 1.08x | 天命の導き：{0}は{1}として生まれ、{2}の道が向いている。 |
| 低 | ui.fate.script.retire_scroll | 38 | 41 | 1.08x | {0}は竹簡を置いた。その知恵は墨香となって後世に伝わる。 |
| 低 | ui.fate.reveal | 13 | 14 | 1.08x | 天命の分岐：{0} |
| 低 | ui.fate.retire_weapon | 13 | 14 | 1.08x | 虎符を獲得：{0} |
| 低 | ui.fate.retire_scroll | 13 | 14 | 1.08x | 竹簡を獲得：{0} |
| 低 | ui.breed.confirm | 45 | 48 | 1.07x | {0} の気力 {1} と {2} の気力 {3} を消費し、結縁しますか？ |
| 低 | ui.fate.accept | 22 | 23 | 1.05x | 天命に順う（成長率は通常） |
| 低 | ui.general.extended.hidden_flags_list | 30 | 31 | 1.03x | 🔒 天命値 / 完全家系図 / 隠し戦法 |
| 低 | ui.breed.preg_status | 39 | 40 | 1.03x | {0} は懐妊期に入りました。{1} 季後に子が生まれます。 |
| 低 | life.script.afterlife | 38 | 39 | 1.03x | {0} の英霊カードと虎符カードは宗祠と軍府に納められた。 |
| 低 | ui.fate.defy | 39 | 40 | 1.03x | 天に逆らう（成長率 -20%、大器晩成の見込みあり） |
| 低 | ui.general.basics.role | 6 | 6 | 1.00x | 職能： |
| 低 | ui.general.basics.status | 6 | 6 | 1.00x | 状態： |
| 低 | ui.general.basics.lifespan | 8 | 8 | 1.00x | 天命値： |
| 低 | ui.general.basics.lifespan_locked | 8 | 8 | 1.00x | 🔒 非公開 |
| 低 | ui.general.basics.vitality | 6 | 6 | 1.00x | 精力： |
| 低 | ui.general.basics.source | 6 | 6 | 1.00x | 出典： |
| 低 | ui.general.basics.source_unlisted | 6 | 6 | 1.00x | 未登録 |
| 低 | ui.general.basics.unlocked | 8 | 8 | 1.00x | 🔒 非公開 |
| 低 | ui.general.stats.str | 10 | 10 | 1.00x | 武力 STR： |
| 低 | ui.general.stats.int | 10 | 10 | 1.00x | 知力 INT： |
| 低 | ui.general.stats.lea | 10 | 10 | 1.00x | 統率 LEA： |
| 低 | ui.general.stats.pol | 10 | 10 | 1.00x | 政治 POL： |
| 低 | ui.general.stats.cha | 10 | 10 | 1.00x | 魅力 CHA： |
| 低 | ui.general.stats.role_summary | 10 | 10 | 1.00x | 役割評価： |
| 低 | ui.general.skills.primary | 8 | 8 | 1.00x | 主戦法： |
| 低 | ui.general.skills.primary_locked | 8 | 8 | 1.00x | 🔒 未配置 |
| 低 | ui.general.aptitude.troop | 10 | 10 | 1.00x | 兵種適性： |
| 低 | ui.general.aptitude.troop_cavalry | 4 | 4 | 1.00x | 騎兵 |
| 低 | ui.general.aptitude.troop_infantry | 4 | 4 | 1.00x | 歩兵 |
| 低 | ui.general.aptitude.troop_archer | 4 | 4 | 1.00x | 弓兵 |
| 低 | ui.general.aptitude.troop_siege | 4 | 4 | 1.00x | 攻城 |
| 低 | ui.general.aptitude.terrain | 10 | 10 | 1.00x | 地形適性： |
| 低 | ui.general.aptitude.terrain_plain | 4 | 4 | 1.00x | 平原 |
| 低 | ui.general.aptitude.terrain_mountain | 4 | 4 | 1.00x | 山岳 |
| 低 | ui.general.aptitude.terrain_water | 4 | 4 | 1.00x | 水域 |
| 低 | ui.general.aptitude.terrain_forest | 4 | 4 | 1.00x | 森林 |
| 低 | ui.general.aptitude.terrain_desert | 4 | 4 | 1.00x | 砂漠 |
| 低 | ui.general.aptitude.weather | 10 | 10 | 1.00x | 天候適性： |
| 低 | ui.general.aptitude.weather_windy | 4 | 4 | 1.00x | 強風 |
| 低 | ui.general.aptitude.weather_night | 4 | 4 | 1.00x | 夜戦 |
| 低 | ui.breed.ep_display | 22 | 22 | 1.00x | 推定爆発力：{0}（{1}） |
| 低 | life.phase.youth | 6 | 6 | 1.00x | 少年期 |
| 低 | life.phase.prime | 6 | 6 | 1.00x | 青年期 |
| 低 | life.phase.peak | 14 | 14 | 1.00x | 壮年期（絶頂） |
| 低 | life.phase.elder | 6 | 6 | 1.00x | 老年期 |
| 低 | life.lifespan_bar | 13 | 13 | 1.00x | 寿命：{0}/{1} |
| 低 | life.script.death | 30 | 30 | 1.00x | {0} は享年{1}歳、ひとりの名将が散った… |
| 低 | record.milestone.UNDEFEATED_50 | 8 | 8 | 1.00x | 不敗神話 |
| 低 | record.milestone.ASURA | 4 | 4 | 1.00x | 修羅 |
| 低 | ui.year_report.close | 4 | 4 | 1.00x | 閉じる |
| 低 | ui.gene.tag.blue | 10 | 10 | 1.00x | 🔵 属性因子 |
| 低 | ui.gene.tag.pink | 10 | 10 | 1.00x | 💗 適性因子 |
| 低 | ui.gene.tag.purple | 10 | 10 | 1.00x | 🟣 天命因子 |
| 低 | ui.gene.tag.white | 10 | 10 | 1.00x | ⚪ 天賦因子 |
| 低 | ui.gene.tag.red | 10 | 10 | 1.00x | 🔴 体魄因子 |

### 本線（戰場／季節／官職／戰報／導覽）（69 項）

| 等級 | 鍵值 | zh-TW 寬 | 譯文寬 | 比例 | 譯文 |
|---|---|---|---|---|---|
| 高 | ui.result.victory | 4 | 22 | 5.50x | （佔位，待譯） |
| 高 | ui.result.defeat | 4 | 21 | 5.25x | （佔位，待譯） |
| 高 | ui.result.reward | 4 | 21 | 5.25x | （佔位，待譯） |
| 高 | ui.result.score | 4 | 20 | 5.00x | （佔位，待譯） |
| 高 | ui.result.draw | 4 | 19 | 4.75x | （佔位，待譯） |
| 高 | ui.result.back_to_lobby | 8 | 28 | 3.50x | （佔位，待譯） |
| 高 | ui.result.enemies_defeated | 10 | 31 | 3.10x | （佔位，待譯） |
| 高 | toast.deploy_failed | 8 | 24 | 3.00x | （佔位，待譯） |
| 高 | ui.result.units_deployed | 10 | 29 | 2.90x | （佔位，待譯） |
| 高 | ui.result.title | 8 | 20 | 2.50x | （佔位，待譯） |
| 高 | ui.result.turns_used | 10 | 25 | 2.50x | （佔位，待譯） |
| 高 | ui.result.retry | 8 | 20 | 2.50x | （佔位，待譯） |
| 高 | toast.deploy_success | 10 | 25 | 2.50x | （佔位，待譯） |
| 高 | toast.no_grain | 8 | 19 | 2.38x | （佔位，待譯） |
| 高 | battle.pause | 4 | 8 | 2.00x | 一時停止 |
| 中 | toast.cooldown | 10 | 19 | 1.90x | （佔位，待譯） |
| 中 | battle.duel | 4 | 7 | 1.75x | 一騎打ち |
| 中 | duel.accept | 8 | 12 | 1.50x | 一騎打ちを受ける |
| 中 | UI_DUEL_ACCEPT | 8 | 12 | 1.50x | 一騎打ちを受ける |
| 低 | duel.challenge_title | 10 | 14 | 1.40x | 一騎打ちの挑戦！ |
| 低 | battle.skill_ready | 8 | 11 | 1.38x | スキル発動可能 |
| 低 | duel.reject | 8 | 11 | 1.38x | 一騎打ちを断る |
| 低 | UI_ULTIMATE_CANCEL | 4 | 5 | 1.25x | キャンセル |
| 低 | ui.spirit_codex.more | 17 | 21 | 1.24x | 他 {0} 体は表示されていません |
| 低 | ui.retire_review.grant_scroll | 11 | 13 | 1.18x | 竹簡 ×1 を獲得 |
| 低 | ui.retire_review.grant_weapon | 11 | 13 | 1.18x | 虎符 ×1 を獲得 |
| 低 | duel.challenge | 18 | 21 | 1.17x | {0} が一騎打ちを仕掛けた！ |
| 低 | duel.penalty | 12 | 14 | 1.17x | 全軍の士気が低下 |
| 低 | duel.accepted | 14 | 16 | 1.14x | {0} が挑戦を受けた！ |
| 低 | duel.rejected | 14 | 16 | 1.14x | {0} が挑戦を断った！ |
| 低 | ui.season.effect.none | 14 | 16 | 1.14x | 今季の特別効果はなし |
| 低 | duel.challenge_desc | 23 | 26 | 1.13x | {0} が {1} に一騎打ちを申し込んだ |
| 低 | duel.reject_penalty | 24 | 27 | 1.13x | 断ると全軍の攻撃・防御が半減する！ |
| 低 | UI_ULTIMATE_TITLE | 8 | 9 | 1.13x | 奥義を選択 |
| 低 | ui.retire_review.quarterly | 30 | 33 | 1.10x | 今季戦報：{0} の精力は残り {1}%。{2} |
| 低 | ui.spirit_codex.empty | 48 | 50 | 1.04x | 英霊カードはまだありません。死後に資格を満たした武将がここに記録されます。 |
| 低 | status.shield | 4 | 4 | 1.00x | シールド |
| 低 | status.buff_atk | 8 | 8 | 1.00x | 攻撃強化 |
| 低 | battle.deploy | 4 | 4 | 1.00x | 配置 |
| 低 | battle.strategy | 4 | 4 | 1.00x | 計略 |
| 低 | battle.dp | 8 | 8 | 1.00x | 配置ポイント |
| 低 | battle.grain | 4 | 4 | 1.00x | 兵糧 |
| 低 | battle.deploy_success | 8 | 8 | 1.00x | 配置成功 |
| 低 | battle.deploy_failed | 8 | 8 | 1.00x | 兵糧不足 |
| 低 | UI_DUEL_TITLE | 14 | 14 | 1.00x | ⚔ 一騎打ちの招待 |
| 低 | UI_ULTIMATE_CAST | 4 | 4 | 1.00x | 発動 |
| 低 | UI_NAV_BATTLE | 4 | 4 | 1.00x | 戦場 |
| 低 | UI_NAV_GENERALS | 4 | 4 | 1.00x | 武将 |
| 低 | UI_NAV_SUPPORT | 4 | 4 | 1.00x | 支援 |
| 低 | UI_NAV_SHOP | 4 | 4 | 1.00x | ショップ |
| 低 | UI_NAV_FLOOD | 4 | 4 | 1.00x | 洪戦 |
| 低 | ui.retire_review.title | 8 | 8 | 1.00x | 退役回顧 |
| 低 | ui.retire_review.close | 4 | 4 | 1.00x | 閉じる |
| 低 | ui.retire_review.report_title | 12 | 12 | 1.00x | 季次戦損報告 |
| 低 | ui.retire_review.career | 29 | 29 | 1.00x | 生涯戦績：{0}勝 {1}敗 斬{2}人 |
| 低 | ui.retire_review.script | 49 | 49 | 1.00x | 回想の旅路：{0}勝、敵{1}人を斬り、守護力{2}。悔いなし。 |
| 低 | ui.retire_review.report | 19 | 19 | 1.00x | 戦損報告：精力 {0}% |
| 低 | ui.retire_review.bond_ok | 12 | 12 | 1.00x | 結縁を行えます。 |
| 低 | ui.retire_review.bond_no | 16 | 16 | 1.00x | 結縁は推奨されません。 |
| 低 | ui.spirit_codex.title | 8 | 8 | 1.00x | 英霊図鑑 |
| 低 | ui.spirit_codex.close | 4 | 4 | 1.00x | 閉じる |
| 低 | ui.spirit_codex.count | 11 | 11 | 1.00x | 英霊 {0} 体 |
| 低 | ui.season.spring | 12 | 12 | 1.00x | 春——万物復甦 |
| 低 | ui.season.summer | 12 | 12 | 1.00x | 夏——烽火連天 |
| 低 | ui.season.autumn | 12 | 12 | 1.00x | 秋——騎馬疾走 |
| 低 | ui.season.winter | 12 | 12 | 1.00x | 冬——雪夜駐兵 |
| 低 | ui.season.effect.training | 17 | 17 | 1.00x | 訓練スタミナ消費 ×{0} |
| 低 | ui.season.effect.food | 13 | 13 | 1.00x | 兵糧補給 ×{0} |
| 低 | ui.season.effect.conception | 11 | 11 | 1.00x | 受胎率 ×{0} |

### 養成（10 項）

| 等級 | 鍵值 | zh-TW 寬 | 譯文寬 | 比例 | 譯文 |
|---|---|---|---|---|---|
| 高 | ui.general.bloodline.hidden_factor.undefeated | 4 | 9 | 2.25x | （佔位，待譯） |
| 高 | ui.general.bloodline.hidden_factor.iron_wall | 4 | 9 | 2.25x | （佔位，待譯） |
| 高 | ui.general.bloodline.hidden_factor.killing_intent | 4 | 9 | 2.25x | （佔位，待譯） |
| 低 | ui.general.bloodline_hint | 58 | 84 | 1.45x | 既定では血統の概要と因子スロットを表示します。14人分の完全な系譜マトリクスは、 |
| 低 | ui.general.bloodline.parents | 10 | 11 | 1.10x | 両親の概要： |
| 低 | ui.general.bloodline.ancestors | 11 | 11 | 1.00x | 14人マトリクス： |
| 低 | ui.general.bloodline.ep_rating | 12 | 12 | 1.00x | 爆発力評価： |
| 低 | ui.general.bloodline.ep_locked | 8 | 8 | 1.00x | 🔒 非公開 |
| 低 | ui.general.bloodline.awakening | 10 | 10 | 1.00x | 覚醒称号： |
| 低 | ui.general.bloodline.awakening_locked | 8 | 8 | 1.00x | 🔒 未覚醒 |
