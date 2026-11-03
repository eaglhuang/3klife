<!-- 分片：cross-ref-進度 / spec-audit-lifespan -->
# 規格逐條比對：武將壽命系統.md (doc_spec_0018)

> 入口：[cross-ref-進度.md](../cross-ref-進度.md)｜比對卡 PROG-2-1618（2026-10-29）｜方法：規格每一條對到程式符號與測試，判定 ✅ 已實作／🟡 部分／❌ 缺。

## 結論

E／F／K／L／M 段所有邏輯條目都有程式與測試，**沒有邏輯缺口**。D-1「接線 🟡」只剩畫面類：L 段「頭像旁精力常駐提示（火苗／能量環）」未做；武將詳情已有壽命與精力條。

## 逐條對照

| 規格條目 | 規格要點 | 程式（符號） | 測試 | 判定 |
|---|---|---|---|:-:|
| E-1／F 壽命上限 | 65 + 紅因子 ×3 + 隨機 −5~+10 | `GeneralAging.resolveMaxLifespan`、`BASE_LIFESPAN`、`LIFESPAN_VARIANCE_MIN/MAX` | GeneralAging | ✅ |
| E-1 戰傷減損 | 戰傷降低壽命上限 | `WarInjury.applyWarInjury`（血 ≤25% 重傷，上限 −1 年，暫定） | WarInjury | ✅ |
| E-2／F 年齡階段 | 幼兒 0~5 不可用、少年 ×0.6、青年 ×1.0、壯年 ×1.1、老年 ×0.8、超齡 ×0.5 | `GeneralGrowth.agePhaseOf`／`ageStatMultiplier`／`applyAgeToStats`；AI 端 `AiStatScaling.AI_AGE_MODIFIER` | GeneralGrowth、GeneralAgingGrowthStage | ✅ |
| E-3 退役判定 | 65 歲以上可退役轉教官 | `GeneralAging.RETIREMENT_AGE`、事件 `reached-retirement-age` | GeneralAging | ✅ |
| E-4／F 死亡判定 | 超齡每季死亡率 min(0.8, 超齡 ×0.1) | `GeneralAging.deathChancePerSeason`、`ageGeneralsOneSeason` | LifespanDeathSeason、LifespanDeathPersist | ✅ |
| E-5／F 演武聖境 | 死後精華快照 TP ×0.5 | `LegacyService`（legacyEssence）、`GeneralArchiver`、`SpiritCard.legacyEssence` | LegacyService 相關 | ✅ |
| E-6 延壽道具 | 延壽丹效果與限制 | `LongevityPill.useLongevityPill`（+3 年）、`GameSession` 使用入口 | LongevityPill、LongevityPillController | ✅ |
| E-7 壽命 UI | 年齡／壽命進度條 | `LifeVitalityPresenter.describeLifespan`、`GeneralDetailBasicsChild`、`CharacterDs3StatsChild` | — | ✅ |
| E-8／M 身後傳承 | 死亡同步結算英靈卡＋虎符卡；退役者死亡仍補發 | `LegacyService`、`TigerTallySpecTactics.resolveTallyTemplateId`（死亡傳承虎符） | NamedTallyDeath | ✅ |
| K 壽命消耗 | 放置 0、培育 1 月、攻城 3 月、結緣 6 月 | `LifespanCost.LIFESPAN_COST_MONTHS`、`GameSession` 主動指令入口 | LifespanCost、SiegeLifespan | ✅ |
| K 精力回復 | 每時段自然回復 | `BattleRoster.recoverVitalityOneSeason`（出陣 10%／待命 30%，以季為單位） | VitalityBattleChain | ✅（單位改季） |
| K 結緣後女方精力凍結 | 3 治理月 | `BreedingSystem` 待產期保留精力（`pregnancySeasonsLeft`，`PREGNANCY_LOCK_SEASONS = 4`） | Breeding 相關 | ✅（以待產期實作） |
| K 一生結緣上限 | 3~5 次 | `BreedingQuotaEnforcer`（breedingCap ≤ 5） | BreedingQuota 相關 | ✅ |
| K 精力不足受孕率 | <30% ×0.1 | `BreedingSystem` Vitality_Factor（>50% 1.0／30~50% 0.5／<30% 0.1） | Breeding 相關 | ✅ |
| L 戰場精力軟懲罰 | >50% 全開、10~50% 禁終極、<10% 禁主動且撤退風險升 | `VitalityBattleGate.vitalityBandOf`／`canPerformAction`／`spendUltimateVitality`、`RetreatRisk.retreatRiskOf` | VitalityBattleGate、RetreatRisk | ✅ |
| L UI 精力常駐提示 | 頭像旁火苗／能量環 | 戰場 HUD 有精力條（`VitalityBarView`）；頭像旁常駐圖示未做 | — | 🟡 |
