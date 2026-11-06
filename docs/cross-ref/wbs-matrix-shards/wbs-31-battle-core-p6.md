# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.1 戰鬥核心（6/7）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.1 戰鬥核心（6/7）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.1 1. 戰鬥核心系統 (Battle Core) · 第 6/7 段

> 續上段（表頭重複）。工作包 APT-12 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **APT-12** | M7 | 戰場環境偵察（出戰前顯示地形分佈與天氣預報） | ui | 3 | ✅ 已驗收 | APT-06 | 出戰前面板顯示 Terrain_Grid 與 Weather_Schedule | [v6 核對 2026-10-14] 出戰前環境偵察純邏輯（1da80662）接任務詳情面板（beb8a658，PROG-2-0403）與真實關卡資料（5890644e）；BattlefieldRecon 2 處呼叫端與 2 個測試 |  |
| **APT-13** | M9 | 競技場積分公式 Score（名將挑戰賽用） | logic | 2 | 🟡 純邏輯 | APT-02 | Score 公式單元測試與 TERRAIN_MULTIPLIER 表 | [v11 核對 2026-10-20] 競技場積分純邏輯（6594741d，PROG-2-0818）與測試；ArenaScore 無 src 呼叫端 |  |
| **APT-14** | M10 | 劇本台詞（水戰S/山地S/霧/夜，規格 §G） | content | 1.5 | 🟢 已接線 | APT-05 | 適性文案與地形格視覺差異上線 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **APT-14b** | M10 | 地形特效視覺與適性反饋（規格 §E 第 10 項） | content | 1.5 | 🟡 純邏輯 | APT-05 | 不同地形格的視覺差異與適性反饋 | [v16.4 拆分 2026-10-27] 由 APT-14 拆出；規格 §E-10 為 P2；工時 1.5 為暫估，待 PM 確認 | 未開始→純邏輯；適性反饋 AptitudeDialogue 已接 BattleController（協調線告知，待核對），地形特效視覺等美術材質 |
| **APT-15** | M8 | 適性 Server schema 與天氣道具（祈風令/祈雨符）、適性預言 | server | 3 | 🟢 已接線 | APT-06 | aptitude 表落地；道具可改變戰場天氣 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **AIS-01** | M7 | 難度等級表 AIDifficultyConfig（5 級縮放、IQ、SP 修正、單挑閾值）資料與載入 | data | 1 | 🟢 已接線 | - | ai-difficulty.json 含 EASY~HELL 全欄位並可載入 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **AIS-02** | M7 | AI 武將屬性縮放 AI_Stat / AI_EP / 精力 / 轉生次數（難度×章節×年齡） | logic | 2 | 🟢 已接線 | AIS-01 | 縮放公式單元測試，含章節與年齡修正 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **AIS-03** | M7 | AI Profile 8 種模板資料與路線策略 | data | 2 | 🟢 已接線 | AIS-01 | ai-profiles.json 含部署傾向/戰法傾向/Lane_Strategy | 無 | 未開始→已接線；#1463 AiProfiles/AiLaneStrategy 有 src 呼叫端 |
| **AIS-04** | M7 | AI 武將模板 9 個（曹操~司馬懿）+ ChapterAIConfig 武將池 | data | 3 | ⚪ 未開始 | AIS-03 | AIGeneralTemplate 與 ChapterAIConfig 資料可載入，並對位戰法/兵種 ID | 無 |  |
| **AIS-05** | M7 | AI 部署決策：相剋優先、Profile 偏好、路線選擇、部署節奏 getAIDeployCount | logic | 4 | 🟢 已接線 | AIS-03 | 依 IQ 決定剋制/隨機，部署數 min(3,1+turn/5+難度) 正確 | assets/scripts/battle/controllers/EnemyAI.ts（decideDeploy/pickCounterType/getFreeLanes，AI_COUNTER_STRATEGY_CHANCE=0.35，無 Profile/難度） | 純邏輯→已接線；#1468 AiDeployTroopPick 接 EnemyAI；#1463 AiLaneStrategy 接 EnemyAI |
| **AIS-06** | M7 | AI 戰法使用決策 AI_UseTactic（隨機/最高傷害/情境評估） | logic | 3 | 🟢 已接線 | AIS-01, TAC-09 | 三級 IQ 行為差異有測試 | 敵方自動武將技有最小回合間隔（戰法系統G-5 自述）；IQ 分級選技無 | 純邏輯→已接線；#1466 AiTacticDecision 接 BattleController |
| **AIS-07** | M7 | AI 奧義使用決策 AI_UseUltimate（斬殺線/群聚/落後觸發） | logic | 2 | 🟢 已接線 | AIS-06 | 依 IQ 與 vitality、擊殺估算決定是否施放 | 無 | 未開始→已接線；#1329/#1253 AiUltimateDecision 接 BattleController |
| **AIS-08** | M7 | AI 特殊兵種戰力 E-2b + 虎符選擇 AI_SelectTally + 屬性對照 STAT_MAPPING | logic | 4 | 🟡 純邏輯 | AIS-04 | 品質/星級/屬性/適性/共鳴乘區公式單元測試與選符邏輯測試 | 無 | 未開始→純邏輯；#1467 AiTallySelection 僅測試，無 src 呼叫端 |
| **AIS-09** | M7 | AI 戰力評估 evaluateAIPower 與難度匹配 ±20% 調整 | logic | 2 | 🟢 已接線 | AIS-08 | AI/玩家戰力差>20% 時自動調縮放 | 無 | 未開始→已接線；#1288 AiPowerMatch 接 BattleSceneLoader |
| **AIS-10** | M7 | 單挑 AI 接受判定 duel_score（0.45/0.35/0.20 + 抖動 + IQ 閾值） | logic | 1 | 🟢 已接線 | - | score>=0.58 接受；EASY 閾值 0.45；含 ±0.05 抖動 | assets/scripts/battle/runtime/BattleDuelResolver.ts（0.45/0.35/0.2 權重與 0.58 已有；無抖動、無 IQ 閾值） | 純邏輯→已接線；#1283 AiDuelDecision 接 BattleController／BattleGeneralDuelFlow |
| **AIS-11** | M7 | 難度自適應（連勝/連敗 ±0.1、clamp）與提示文案 | logic | 1 | 🟢 已接線 | AIS-01 | 連3勝+0.1、連3敗-0.1 並限制範圍，文案顯示 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **AIS-12** | M7 | AI SP 充能難度修正（×0.8~1.5） | logic | 1 | ⚪ 未開始 | AIS-01 | SP 每擊殺獲取依難度倍率 | 無（SP_PER_KILL 常數存在於 Constants，無難度倍率） |  |
| **AIS-13** | M9 | 回合結束 AI 全軍強度重算 AI_TurnEndRecalculate（年齡/虎符升星/戰力/國力指數/策略調整） | logic | 5 | ⚪ 未開始 | AIS-08, AIS-09 | 每季批次重算五階段，單元測試覆蓋 | 無（core/models/AIPopulationConfig.ts 僅人口管控，無強度重算） |  |
| **AIS-14** | M10 | AI 出場台詞/難度提示文案 與戰報整合 + AI 戰鬥 Server log schema | content | 2 | 🟢 已接線 | AIS-04 | 出場台詞/戰法奧義宣告顯示；battle_ai_log 表落地 | 無 | 純邏輯→已接線；#1285 AiEntranceLines 接 BattleScene／BattleSceneFlow（battle_ai_log 定義同 PR） |
| **FORM-01** | M3 | 培育屬性增長總公式與乘區（2.1，傾囊相授連乘） | logic | 3 | 🟡 純邏輯 | NUM-11 | 加法區/資質/運勢/陪伴/傾囊相授(連乘)/人數補正乘區有單測且傾囊為唯一連乘 | [master fb02ff9 重估] NurtureSystem.ts 培育增長公式（部分） |  |
| **FORM-02** | M3 | 疲勞度與失敗率曲線（2.2） | logic | 1 | 🟡 純邏輯 | FORM-01 | 體力≥70%失敗0%、30~70%爬升5~35%、<30%為40~99% | [master fb02ff9 重估] NurtureSystem.ts 疲勞/失敗率（部分） |  |
| **FORM-03** | M3 | 教官卡詞條 Schema 與得意率權重（第3章） | data | 3 | 🟢 已接線 | - | Mentor 卡含 Teaching_Rate/Starting_Bond/Mentor_Burst_Bonus 等欄位並過 schema 驗證 | [master fb02ff9 重估] MentorCard.ts 詞條 schema | 純邏輯→已接線；協調線指示：已由現有 SupportCardDef／passive 覆蓋，結案 |
| **FORM-04** | M8 | 教官卡四大原型與戰法組合矩陣（第6章） | content | 4 | ⚪ 未開始 | FORM-03 | 四原型各有範例卡與公式干預點 | 無實作；MentorTacticAdapter.ts 僅為戰法來源轉換 |  |
| **FORM-05** | M7 | INT 戰法發動率檢核器（4.1） | logic | 1 | 🟡 純邏輯 | NUM-04 | 發動率=1−9000/INT，INT300≈70%、1200≈92.5%，支援 Success_Bonus | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（純邏輯）；待 QA／實機驗收 |  |
| **FORM-06** | M7 | 破釜沉舟殘局模式與 STR 軟上限（4.2） | logic | 3 | ⚪ 未開始 | FORM-05 | 第5回合切 Last_Spurt_Mode，STR>1200 溢出係數×0.5 | 無實作 |  |
| **FORM-07** | M7 | 體力池/燃燒率/根性減免（4.3） | logic | 3 | ⚪ 未開始 | FORM-06 | 總體力庫與每秒（每回合）消耗、WILL 減免有單測 | 無實作；規格用 VIT/WILL 屬性，專案六維無此二者 | 未開始→未開始；v16.9 協調線回報：缺基準速度、常數 C、WILL 減免公式（待企劃），狀態不變 |
| **FORM-08** | M2 | 因子繼承機率：藍色3星機率與世代相性（第5章） | logic | 2 | 🟢 已接線 | NUM-06 | <600:0%、600~1100:6%、≥1100:10%；相性影響白/紅因子 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
