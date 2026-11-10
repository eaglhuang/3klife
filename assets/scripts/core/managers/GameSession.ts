// @spec-source → 遊戲時間系統.md (doc_spec_0034)、武將壽命系統.md (doc_spec_0018)、MVP遊戲驗證規格書.md (doc_spec_0045) §E #13 #14
/**
 * GameSession — 長局主迴圈（季度推進 + 增齡 + 存檔），純邏輯，不依賴 cc
 *
 * 一次 advanceSeason() 依序做：
 *   1. GameClock 推進 1 季（含模式輪轉、跨年判斷）
 *   2. 名冊中所有存活武將增齡、判定退役候選與死亡
 *   3. 年滿 5 歲的子嗣自動開獎（揭曉五維與初始因子，產生宿命建議）
 *   3.5 武將精力回補（出征 +25%、待命 +50%）
 *   3.6 母方待產倒數 −1；待產中的母方精力不回補（Pregnancy_Lock）
   4. 透過注入的名冊來源寫回名冊
 *   5. 若有掛 SeasonLifecycle（LegacyService）：死亡武將歸檔成英靈卡並移出名冊，
 *      再跑季結 / 年底資料壓縮與清掃
 *   6. 若有掛存檔服務，自動存檔（含進行中的培育會話）
 *   7. 廣播事件給 UI / 其他系統
 *
 * 退役是玩家的決定，不會自動發生：UI 收到 GeneralReachedRetirementAge 後讓玩家選，
 * 再呼叫 retireGeneral()。
 *
 * 名冊來源與事件匯流排都用介面注入，因此可以在 headless 測試直接跑完整迴圈。
 *
 * Unity 對照：像一個 DontDestroyOnLoad 的 GameManager 持有 TimeManager 與 SaveSystem，
 * 每季呼叫一次 AdvanceSeason()，再用 C# event 通知 UI 更新「第 N 年 M 季」。
 */
import { addTemplateCard, templateCardStarUpProgress } from '../systems/BloodlineFeatStages';
import type { NurtureRiteResult } from '../systems/EnrollmentRites';
import { resolveRivalPlayerEvents } from '../systems/RivalPlayerEvents';
import { respondToRivalProposal, type ProposalResponse } from '../systems/RivalProposals';
import { resolveTallyName, troopNameOf } from '../systems/TallySlotView';
import { tallyProducedSpec, tallyStarUpSpec } from '../systems/TallyScripts';
import { formatTallyLine, type TallyLine, type TallyTranslate } from '../systems/TallyLineSpec';
import { UCUFLogger, LogCategory } from '../utils/UCUFLogger';
import { normalizeOfficerSnapshot, officerUnlocksOf, type OfficerUnlocks } from '../systems/OfficerSnapshot';
import { addOfficerExp, BATTLE_MERIT_OFFICER_TASK, applyEraShiftToOfficerState, calcOfficerExpGain, initialOfficerState, normalizeOfficerState, toOfficerSnapshot, type OfficerState, type OfficerTaskResult } from '../systems/OfficerState';
import { officerPermissionsOf, type OfficerPermissions } from '../systems/OfficerPermissions';
import { FRESH_OPENING_OFFER_STATE, nextOpeningOffer, normalizeOpeningOfferState, resolveOpeningOffer, type OpeningOffer, type OpeningOfferOutcome, type OpeningOfferState, type OpeningOfferTable } from '../systems/OpeningOffer';
import { activeOfficerTrial, boostedOfficerExp, effectiveOfficerState, grantOfficerTrial, normalizeOfficerTrial, type OfficerTrial, type OfficerTrialGrant } from '../systems/OfficerCommerce';
import { canPlaceSandtableMarker, remainingSandtableMarkers } from '../systems/SandtableMarkers';
import { buildStartingSpiritTalisman, normalizeStartingTalisman, type StartingSpiritTalisman, type TeachingSpiritInput } from '../systems/TeachingSpiritTalisman';
import { normalizeOpeningPhaseId } from '../systems/OpeningProgress';
import { dailyFreeEnrollCount, isNewEnrollGrantDay, normalizeEnrollGrantDay } from '../systems/DailyFreeEnroll';
import { appendAcquisitions, diffAcquisitions, normalizeAcquisitionLog, queryAcquisitions, type ItemAcquisitionQuery, type ItemAcquisitionRecord, type ItemSource } from '../systems/ItemAcquisitionLog';
import { EMPTY_AI_ADAPTIVE_STREAK, nextAiAdaptiveStreak, normalizeAiAdaptiveStreak, type AiAdaptiveStreak } from '../systems/AiAdaptiveDifficulty';
import { effectiveSandtableStage, normalizeUnlockHistory, recordSandtableUnlock, sandtableShortCodeOf, sandtableStageIdOf, type SandtableStageId } from '../systems/SandtableProgress';
import { isSandtableTerritory } from '../systems/SandtableTerritories';
import { hallMissionToOfficerTask, type HallMissionOutcome } from '../systems/HallMissionSettlement';
import { battleFameGain, gainGeneralFame, generalRankTitle, hallMissionFameGain } from '../systems/GeneralRankProgress';
import { resolveHallDispatch, type HallDispatchResult } from '../systems/HallMissionDispatch';
import type { HallBoardKey, HallGateTask, HallPlayerState } from '../systems/HallMissionBoard';
import { battleIntelligenceOf, outcomeOf } from '../systems/BattleRoster';
import { pvpSeasonIdOf } from '../systems/BattleSeasonStats';
import { hasMatchingGreenFactor, learnTacticInto, type TacticLearnCheck } from '../systems/TacticLearning';
import { canStartAutoNurture, consumeAutoNurtureTicket, isAutoNurtureUnlocked, resolveAutoSchedule, runAutoNurtureSeason, type AutoNurtureBlockReason } from '../systems/AutoNurture';
import { inspiredTacticIds, type NurtureAction, type NurtureRoundLog } from '../systems/NurtureSystem';
import { learnTpCost } from '../systems/FactorTacticLinkage';
import { applyPassiveSave, totalTacticTpDiscount } from '../systems/MentorPassiveSavings';
import type { GeneralConfig } from '../models/GeneralUnit';
import { advanceDaughtersOneYear, assignDaughterRoute, daughtersAwaitingRoute, type AssignDaughterResult, type DaughterRecord, type DaughterRoute } from '../systems/DaughterComingOfAge';
import { formatSeasonLabel, GameClock, GameTimeState, SeasonAdvanceResult, SEASONS_PER_YEAR } from '../systems/GameClock';
import { buildYearReport, normalizeYearAgingEvents, YearReport } from '../systems/YearReport';
import { backfillTallyTroopTypes, mainTroopTypeOf } from '../systems/TigerTally';
import { normalizeCountdownState, createCountdown, OPENING_TRAVEL_DURATION_MS, OPENING_TRAVEL_TARGET_ID, type CountdownState } from '../systems/CountdownManager';
import { createTravelCountdown, normalizeTravelCountdown, tickTravelCountdown, type TravelCountdown } from '../systems/TravelCountdown';
import { ageGeneralsOneSeason, AgingEvent, isGeneralDead, RandomSource, RETIREMENT_AGE } from '../systems/GeneralAging';
import { applyWarInjury } from '../systems/WarInjury';
import { settleStageSalvage } from '../systems/StageSalvageSettlement';
import type { SalvageTotals } from '../systems/StrategistHud';
import { applyActiveLifespanToRoster, ActiveLifespanResult, preLifespanBaseline } from '../systems/LifespanWiring';
import { applyJobChangeToRoster, JobWiringGeneral } from '../systems/JobChangeWiring';
import type { JobChangeResult, JobClass } from '../systems/JobChange';
import type { LifespanCommand } from '../systems/LifespanCost';
import type { LifecycleSettlement, SeasonLifecycle } from '../services/LegacyService';
import type { SpiritCard } from '../models/SpiritCard';
import type { MentorCard } from '../models/MentorCard';
import { normalizeDeck, toggleDeckCard, DeckToggleOutcome } from '../services/PlayerDeckRules';
import { SeededRandom, LEGACY_RANDOM_SEED } from '../systems/SeededRandom';
import { applyAcademyGraduation, type AcademyGraduationResult } from '../systems/nurture/AcademyGraduation';
import type { AcademyStateSnapshot } from '../systems/nurture/AcademyTypes';
import { calculatePrestigeGain, clanPrestigeTierOf } from '../systems/GenerationalLegacy';
import { clanPrestigeBenefitOf } from '../systems/MvpLoopController';
import { ITEM_VITALITY_PILL } from '../systems/ItemDef';
import { createEmptyMercenaryBundle, normalizeMercenaryBundle, serializeMercenaryBundle, type MercenarySaveBundle } from '../systems/MercenarySaveModel';
import { bondMercenaryToRoster, rarityOfTemplate, statsOfTemplate, type RosterBondResult } from '../systems/MercenaryRoster';
import { useTrialTicket, type TrialTicketRejectReason, type TrialTicketResult } from '../systems/MercenaryTrialTicket';
import { createUpkeepState } from '../systems/MercenaryUpkeep';
import { advanceTrialDay } from '../systems/MercenaryTrialDay';
import { reachedTrialDayThree, reachedTrustStage } from '../systems/MercenaryScripts';
import { recordTrialBattle } from '../systems/MercenaryBattleRecord';
import { settleTrialRollover, type DepartureEvent } from '../systems/MercenaryDeparture';
import { appendFarewellLetter, createFarewellLetter, FarewellLetter, farewellJournalEntry, markFarewellLetterRead } from '../systems/FarewellLetterInbox';
import { EMPTY_LOGIN_STREAK, LoginStreakState, loginDayOf, recordLogin } from '../systems/LoginStreak';
import { dailySubsidyOf, type SubsidyResourceKey } from '../systems/DailySubsidy';
import { activateMonthlyCard, claimMonthlyCardDaily, isMonthlyCardExpiring, monthlyCardDaysLeft, monthlyCardVitalityMultiplier, normalizeMonthlyCard, type MonthlyCardState } from '../systems/MonthlyCard';
import {
    appendPlayerLog, EMPTY_DAILY_NEWS, markDailyNewsRead, normalizeDailyNewsState, normalizePlayerLogs, refreshDailyNews, revengeRecoverAmount,
    type DailyNewsState, type PlayerLogEntry, type PlayerLogType,
} from '../systems/DailyNewsEngine';
import { shouldTriggerOfflineInteraction } from '../systems/OfflineInteractionTrigger';
import {
    applySpeedCards, claimReadyWishes, createWishPoolState, normalizeWishPoolState, speedCardsNeeded, startWish,
    type ActiveWish, type WishPoolState, type WishStartReason,
} from '../systems/WishPool';
import {
    normalizeOfflineInteractionLog, offlineInteractionCandidates, offlineInteractionTags, pickOfflineInteraction,
    type OfflineInteractionCandidate,
} from '../systems/OfflineInteractionEvents';
import { buildJournalEvent, type JournalEventKind, type JournalEventSubject } from '../systems/JournalEvents';
import { journalReactionLine } from '../systems/JournalReaction';
import {
    EMPTY_MORNING_REPORT, copyMorningReport, markJournalHubSeen, markMorningReportRead, morningReportLines, normalizeMorningReportState, pendingMorningJournalCount, refreshMorningReport,
    unreadMorningReportCount, type MorningReportState,
} from '../systems/MorningReport';
import {
    DISPATCH_JOURNAL_PRIORITY, dispatchRewardAmount, EMPTY_DISPATCH_STATE, normalizeDispatchState, settleDueDispatches, startDispatch,
    type CompletedDispatchJob, type DispatchJobDef, type DispatchStartReason, type DispatchStartResult, type DispatchState,
} from '../systems/DispatchJobs';
import {
    DISPATCH_COMPLETE_KEY, dispatchCompleteArgs, dispatchCompleteLine, getDispatchScore, type DispatchGeneral, type DispatchStatKey,
} from '../systems/DispatchQuality';
import {
    appendOfflineBattleSnapshot, nextOfflineBattleSnapshotId, normalizeOfflineBattleSnapshots, offlineRaidJournal, CAMPAIGN_BATTLE_JOURNAL, type OfflineBattleInput, type OfflineBattleJournal, type OfflineBattleSnapshot,
} from '../systems/OfflineBattleSnapshot';
import {
    claimTournamentRewards, createTournamentState, normalizeTournamentState, pendingTournamentRewards, playTournamentSeries, registerTournamentTeam,
    rolloverTournament, tournamentStatus, type TournamentEntrant, type TournamentSeasonReward, type TournamentEntryReason, type TournamentRegisterReason, type TournamentSeasonHistory, type TournamentSeriesResult,
    type TournamentState, type TournamentStatus,
} from '../systems/TournamentLocal';
import { playMonthlyScenario, type MonthlyScenarioHistoryEntry, type MonthlyScenarioPlayResult } from '../systems/MonthlyScenarioCup';
import { DISPATCH_JOB_CATALOG, dispatchBoardRows, findDispatchJob, type DispatchCatalogRow, type DispatchPreview } from '../systems/DispatchCatalog';
import { buildMercenaryPoolRows, filterPoolGeneralIds, type MercenaryPoolRow } from '../systems/MercenaryPoolPresenter';
import { fallenOfficerOrigins } from '../systems/FallenOfficerMarket';
import { acknowledgeOnboardingSegment, FRESH_ONBOARDING, normalizeOnboardingState, OnboardingResult, OnboardingState } from '../systems/OnboardingTutorial';
import { FRESH_OPENING_LETTER, markOpeningLetterSeen, normalizeOpeningLetterState, OpeningLetterState } from '../systems/OpeningLetter';
import { remarkRandomOf } from '../systems/SageRemarks';
import { FOOD_LOW_LINE } from '../systems/ResourceCap';
import { ITEM_DISPLAY_NAMES } from '../systems/PlayerInventory';
import { prisonTreasureLine } from '../systems/PrisonerOfWar';
import { governanceBoostMultiplier, normalizeGovernanceBoosts, planGovernanceBoost, type ActiveGovernanceBoost, type GovernanceBoostRejectReason } from '../systems/GovernanceEfficiencyItem';
import { applyEncounterToRoster, chronicleShouldOpen, cityEncounterDef, cityEncounterNeedsLead, cityEncounterShortfall, copySeasonChronicle, EMPTY_SEASON_CHRONICLE, normalizeSeasonChronicle, synthesizeSeasonChronicle, type ChronicleTrigger, type SeasonChronicleState } from '../systems/SeasonChronicle';
import { ITEM_WOOD } from '../systems/ItemDef';
import { EMPTY_SEASON_PERSONALITY_STATE, normalizeSeasonPersonalityState, rollSeasonPersonalityEvents, seasonEventDef, seasonEventFarmMultiplier, seasonEventShortfall, strAfterExp, SEASON_PERSONALITY_TUNING, type SeasonEventInstance, type SeasonPersonalityState } from '../systems/SeasonPersonalityEvents';
import { governanceEventLine, governanceOutputMultiplier, governanceReportLine, normalizeGovernanceEvent, rollGovernanceEvent, type ActiveGovernanceEvent } from '../systems/GovernanceEvents';
import { EMPTY_DOMESTIC_LOG, normalizeDomesticLog, runDomesticTask, type DomesticSeasonLog, type DomesticStats, type DomesticTaskResult } from '../systems/DomesticTasks';
import type { HallCandidate } from '../systems/HallCharacterRoll';
import { buildHallSpotRows, EMPTY_HALL_SPOT_STATE, HallSpotRow, HallSpotState, refreshHallCharacterSpots } from '../systems/HallCharacterPresenter';
import { buildHallStageFeed, type HallStageFeed, type HallStageProfile } from '../systems/HallStageFeed';
import type { HallVolunteerTask } from '../systems/HallVolunteer';
import { createPlayerSaveSnapshot, normalizeInfusionRecords, normalizeGachaMentorJournal, normalizeHallAssignLog, type GachaMentorJournalEntry, normalizeSandtableMarkerTerritories, normalizeSortiePresets, normalizeGachaWalletSave, type GachaWalletSave, normalizeDailySubsidyRecord, type DailySubsidyRecord, normalizeClearedStageIds, normalizeFavoriteGeneralIds, normalizeHallAssignments, normalizeFame, normalizeScorePoints, normalizeAutoNurtureTickets, normalizeFlag, normalizeTallyCardsMap, normalizeTallyHoldingsMap, normalizeTallyLoyaltyMap, PlayerSaveService, PlayerSaveSnapshot, normalizeClanPrestige, normalizeShrineOfferingDay } from '../services/PlayerSaveService';
import { appendAssignRecord, autoAssignHallTask, listAssignRecords, settleLatestAssign, settleOpenAssignsForSeason, type HallAssignOutcome, type HallAutoAssignRecord, type HallAutoAssignResult, type HallAutoAssignTaskInput } from '../systems/HallAutoAssign';
import type { HallTaskIntelInput } from '../systems/HallTaskIntel';
import { estimateSortiePower } from '../systems/SortiePrediction';
import { BASE_RESOURCE_CAPS, clampResource } from '../systems/ResourceCap';
import { computeDeathBattleScore, settleDeathTallies, TALLY_DEATH_SCORE_TUNING } from '../systems/TallyDeathSettlement';
import { settleDeathSpiritCards, spiritCardNoticeSpec } from '../systems/SpiritCardDeathSettlement';
import { buildDualCardSettlements, dualCardSettlementSpecs, type DualCardSettlementPayload } from '../systems/DualCardSettlement';
import type { TigerTallyCard } from '../models/TigerTallyCard';
import { applyBattleExpToCard, readCardStarState, tallyBattleOutcome, addTallyExp } from '../systems/TigerTallyStar';
import { resolveTallyBreakthrough, type TallyBreakthroughResult } from '../systems/TigerTallyBreakthrough';
import { countGeneralBagSlots } from '../systems/BagDomain';
import { confiscateFrom, createTallyHoldings, equipTally, onGeneralDeath, takeTallyAway, tallyOfGeneral, transferTally, unequipTally, type TallyHoldingsResult, type TallyHoldings } from '../systems/TigerTallyHoldings';
import { deriveInventoryViews, type InventoryRecord, type InventoryViews } from '../systems/InventoryProjection';
import { buildTallyInventoryRecords, normalizeInventoryRecords } from '../systems/InventoryRecordBridge';
import { sweepExpiredRecords } from '../systems/ItemExpiry';
import { applyTallyConfiscation, applyTallyLoyaltyChange, createTallyLoyaltyState, type TallyLoyaltyAction, type TallyLoyaltyResult, type TallyLoyaltyState } from '../systems/TigerTallyLoyalty';
import type { TigerTallyQuality } from '../models/TigerTallyCard';
import type { NurtureState } from '../services/NurtureService';
import {
    awakenFactor,
    AwakeningFailReason,
    AwakeningTrigger,
    FactorAwakenedEvent,
    rollBattleAwakening,
} from '../systems/FactorAwakening';
import {
    awakenBloodlineUltimate,
    raiseBloodlineUltimateCap,
} from '../systems/BloodlineUltimateRoster';
import type { UltimateAwakenReason } from '../systems/BloodlineTransmissionUltimate';
import { ultimateProgressFromBattleRecord } from '../systems/UltimateProgress';
import {
    battleExpSource,
    DiscoveryExpSource,
    DiscoveryGain,
    gainDiscoveryExp,
    normalizeDiscoveryProgress,
} from '../systems/DiscoveryProgress';
import type { NurtureAwakeningHooks } from '../services/NurtureService';
import { buildStarterRoster, STARTER_CORE_GENERAL_ID, StarterRosterOptions } from '../services/StarterRosterService';
import { resolveFactorColor } from '../systems/FactorInheritance';
import { insertSpiritCard, replaceSpiritCard, setPrimarySpiritCard, unequipSpiritCard, type SpiritSlotFlowResult } from '../systems/SpiritSlotFlow';
import type { FactorColor, FactorDefinition, FactorDictionary } from '../systems/FactorInheritance';
import { visibleFactorColors as factorColorsVisibleAtLevel } from '../systems/FactorMask';
import { specialActionFactorTags } from '../systems/BattleSpecialActions';
import { applyDuplicatePull, RebirthPullResult } from '../systems/Rebirth';
import { applyInfusionStats, bloodlineInfusionGrant, tallyInfusionLevelOf, type InfusionRecord } from '../systems/DuplicatePullRouting';
import { bondedMercenaryGeneralIds, duplicatePopupGeneralIds, mercenaryRebirthStatCap } from '../systems/MercenaryRebirth';
import { randomizePulledTactics } from '../systems/TacticRandomization';
import { resolveReleaseEpiphanyWithTactic, type ReleaseEpiphanyTacticResult } from '../systems/ReleaseEpiphany';
import { withUltimateUnlockState } from '../systems/UltimateSlotUnlock';
import { offlineBehaviorJournalEntry } from '../systems/OfflinePersonalityBehavior';
import { MentorDuplicateOutcome, overflowToastText, resolveMentorDuplicate } from '../systems/MentorOverflow';
import { normalizeBondPoints, overflowBondPoints, overflowRarityOf } from '../systems/OverflowBond';
import { borrowCandidateOf, type NpcFriendMentor } from '../systems/NpcFriendMentor';
import { canBorrow, createBorrow, normalizeBorrowLedger, type BorrowBlockReason, type BorrowLedger, type BorrowRequest } from '../systems/FriendBorrow';
import { emptySoulFragmentLedger, injectFromLedger, normalizeSoulFragmentLedger, recordDeathFragment, type SoulFragmentLedger } from '../systems/SoulFragmentLedger';
import { apparitionForDivination } from '../systems/SageApparitionLineage';
import { divineFactor, getSage, predictOffspring, ProphecyKeywordSource, ProphecyResult, SageDivinationResult } from '../systems/SageDivination';
import type { FactorPoolEntry } from '../systems/BreedingSystem';
import { planBloodlineMergeForGenerals, type BloodlineMergeRejectReason } from '../systems/BloodlineMerge';
import { addItem, consumeItem, grantSeasonalOracleTokens, ITEM_ADMISSION_TOKEN, ITEM_BAMBOO_SLIP, ITEM_FERTILITY_ARMED, ITEM_JOB_CHANGE_ORDER, ITEM_LEGENDARY_MENTORING_TICKET, ITEM_MERGE_TOKEN, ITEM_ORACLE_TOKEN, ITEM_TRIAL_TICKET, ITEM_TREASURE, ITEM_WISH_SPEED_CARD, itemCount, normalizeInventory, PlayerInventory, STARTER_INVENTORY } from '../systems/PlayerInventory';
import { useItem as useItemFlow, type ItemUseResult } from '../systems/ItemUseFlow';
import { equipGear as equipGearFlow, unequipGear as unequipGearFlow, transferGearToHeir, type GearEquipResult } from '../systems/GearEquipFlow';
import { decomposeGearRecord, setRecordLocked, type GearDecomposeResult } from '../systems/GearLockDecompose';
import { gearDefinitionOf } from '../systems/GearDefinitions';
import { isSageAvailable } from '../systems/SageFavor';
import type { EquipSlot } from '../systems/GeneralBackpack';
import { checkLegendaryMentoring, LegendaryMentoringBlock, performLegendaryMentoring } from '../systems/LegendaryMentoring';
import type { BreedingBirthRecord } from '../systems/BreedingBirthRecord';
import { normalizeBreedingBirthRecords } from '../systems/BreedingBirthRecordSave';
import { useVitalityPill, type VitalityPillKind, type VitalityPillUseResult } from '../systems/VitalityPill';
import { longevityPillsUsed, useLongevityPill, type LongevityPillUseResult } from '../systems/LongevityPill';
import { baseVitalityMaxOf } from '../systems/VitalityCap';
import { EVENT_NAMES, Faction } from '../config/Constants';
import { services } from './ServiceLoader';
import { type CampaignStageDef, enabledCampaignStages, getCampaignStage, isCampaignStagePlayable } from '../config/CampaignStages';
import { phaseFactorColors, phaseForLevel, type UnlockPhase } from '../systems/UnlockPhase';
import { protectedAfterLoss, CELLAR_PROTECTION } from '../systems/CellarProtection';
import { applySortieResult, MilitaryReserve, normalizeMilitaryReserve, regenMilitaryOneSeason, STARTER_MILITARY } from '../systems/MilitaryReserve';
import { buildGovernorSnapshot, type GovernorSnapshot } from '../systems/GovernorHallView';
import { buildEraResetEvent } from '../systems/EraReset';
import { buildQuarterlyBattleReportRows, type QuarterlyBattleReportRow } from '../systems/RetireReviewCopy';
import { withLifeImprints } from '../systems/LifeImprint';
import { clanMembersOf, clanStatsOf, clanTierOf, normalizeClanTier, type ClanTier } from '../systems/ClanTier';
import { displayMilestoneStage, kinMilestoneLine, kinMilestoneStage, milestoneStageOfClan, milestoneUnlockLines, normalizeMilestoneStage, type MilestoneStage } from '../systems/FamilyMilestone';
import { buildSuitorGeneral, normalizeMarriageProposal, rollMarriageProposal, type MarriageProposal } from '../systems/MarriageProposal';
import { emptyFamilySynergyLedger, finalizeAdultChildren, fullSynergyAlliesOf, normalizeFamilySynergy, type FamilySynergyLedger } from '../systems/FamilySynergy';
import { forgeCustomGold, mergeCustomFactors, normalizeCustomFactors } from '../systems/CustomGoldFactor';
import { HIDDEN_LINEAGE_COST, normalizePedigreeProbes, PEDIGREE_PROBE_COST, pedigreeProbeKey, STAT_PROBE_COST, statProbeKey } from '../systems/PedigreeProbe';
import type { RumorStatKey } from '../systems/MatchRumor';
import { yuedanBannerLines } from '../systems/YuedanReview';
import { dueChildOmens, epitaphJournalEntry } from '../systems/ChildUnveiling';
import { clanHallNameOf, normalizeClanHall } from '../systems/ClanHall';
import { CLAN_TRADITION_MIN_TIER, clanTraditionOf, normalizeClanTradition, type ClanTradition } from '../systems/ClanTradition';
import { seasonModifiersOf } from '../systems/SeasonModifiers';
import { computeCommandCapacity, getDeputyFoodBonus, getStrategistBonus, getTacticTpCost, TALLY_SHORTAGE_FOOD_THRESHOLD, validateSortieLoadout, type CreateSortieInput, type DeputyFoodBonus, type SortieLoadoutCheck, type SortieMember, type StrategistBonus, type SortieSummary } from '../systems/SortieDeploy';
import { EMPTY_PERFORMANCE, type BattlePerformance, type BattleRecordLike } from '../systems/BattleRecordStats';
import { buildBattleSnapshot, type BattleSnapshot } from '../systems/BattleSnapshot';
import { leaderboardEntryOf, rankLeaderboard, type LeaderboardMetric, type LeaderboardEntry } from '../systems/BattleLeaderboard';
import { grantTacticNotes, rewardsForMilestones } from '../systems/MilestoneRewards';
import { awakenHiddenFactors } from '../systems/HiddenFactorAwakening';
import { captiveFemaleSourceOf, createPowRecord, createPrisonState, normalizePrisonState, prisonCapacityOf, prisonYieldOneSeason, resolvePowDecision, rollFutureReturns, rollPrisonTreasureDonors, type PowDecision, type PowRecord, type PowResolution, type PrisonState } from '../systems/PrisonerOfWar';
import { createFemaleSource, normalizeFemaleSource, normalizeFemaleSourcesMap, type FemaleSource } from '../systems/FemaleSource';
import { normalizeGachaPityBook, type GachaPityBook } from '../systems/GachaDraw';
import { withFamousClanBonus } from '../systems/FamousClan';
import { drawFemalePool, femalePoolRemainingMs, isFemalePoolRefreshDue, type PoolCandidate } from '../systems/FemalePoolRefresh';
import { resolvePrisonerGift, type PrisonerGiftResult } from '../systems/PrisonerGift';
import { isRescueRefreshDue, rollDungeonRescue, type RescueOutcome, buildRescuedGeneral, RESCUE_QUALITY, rescueRefreshRemainingMs } from '../systems/DungeonRescue';
import { giftToFemale, normalizeFemaleSystemState, type FemaleSystemState } from '../systems/FemaleSystemState';
import { unveilDueGenerals, UnveilingEvent, UnveilingGeneral, UNVEILING_AGE, GENERAL_STATUS_UNVEILED } from '../systems/Unveiling';
import { injectCatalystFactor, markCatalystUsed, type CatalystGeneral } from '../systems/GeneCatalyst';
import { advanceBreedingSeason, holdPregnancyVigor } from '../systems/BreedingSystem';
import { DynamicRelationBook, battleComradePairs, type DynamicRelationResult } from '../systems/KinDynamicRelations';
import { claimAllSeasonPass, createSeasonPassState, isDefaultSeasonPassState, mockSeasonPassLevelUp, normalizeSeasonPassState, type SeasonPassReward, type SeasonPassState } from '../systems/SeasonPass';
import { normalizePendingSceneGambit, pendingSceneGambitOfTask, resolveSceneGambit, type PendingSceneGambit, type SceneGambitOutcome } from '../systems/HallSceneGambit';
import { ITEM_EXTREME_CHALLENGE_ORDER, createExtremeTaskState, extremeFreeAttemptsLeft, extremeStageOfWeek, extremeWeekIndexOf, isExtremeStage, normalizeExtremeTaskState, startExtremeTask, type ExtremeTaskState } from '../systems/ExtremeTaskBoard';
import { rollExtremeTaskDrop, type ExtremeTaskDrop } from '../systems/ExtremeTaskDrop';
import { SALARY_ARREARS_PENALTY, createSalaryLedger, normalizeSalaryLedger, settleSalaries, type SalaryLedger, type SalarySettlement } from '../systems/GeneralSalary';
import { RelationEventLedger } from '../systems/RelationEvents';
import { cloneNpcMemory, createNpcMemory, normalizeNpcMemory, normalizeNpcPlayerId, npcPlayerIdFromSeed, type NpcMemoryRecord } from '../systems/NpcMemoryReadModel';
import { NpcInteractionLimiter } from '../systems/NpcUtilityAI';
import { advanceSevenDayJourney, createSevenDayJourneyState, DEFAULT_JOURNEY_TRACK, journeyFactsOf, normalizeSevenDayJourney, SEVEN_DAY_JOURNAL_PRIORITY, type SevenDayJourneyState } from '../systems/SevenDayJourney';
import { grantLegacyRewards, normalizeLegacyCount, type LegacyAchievement } from '../systems/LegacyAchievement';
import { STARTER_GACHA_WALLET } from '../services/GachaWalletRules';
import type { DynamicRelation } from '../systems/KinRelation';
import { normalizeRosterRoles } from '../systems/RosterRoleLoad';
import {
    assignGovernanceGeneral,
    removeGovernanceAssignment,
    type GovernanceAssignment,
    type GovernanceResult,
} from '../systems/GovernanceAssignment';
import { planAutoGovernance } from '../systems/DomesticAutoGovernance';
import { CHILD_ASSIGNMENT_AGE, checkAwakeningQuota, domesticAssignmentFor } from '../systems/SpiritMcqRules';
import { isDescendant, magistrateGoldBonus } from '../systems/ChildMagistrate';
import {
    maxTaskSlotsForLevel,
    planTerritoryUpgrade,
    type TerritoryUpgradePlan,
} from '../systems/TerritoryUpgrade';
import {
    attemptTerritoryLoss,
    lastStandModifiers,
    type KeepTerritory,
    type LastStandModifiers,
    type TerritoryLossResult,
} from '../systems/HereditaryKeep';
import {
    appendJournalEntry,
    createEmptyJournal,
    queryJournal,
    type JournalEntry,
    type JournalEntryInput,
    type JournalQuery,
    type JournalState,
    type JournalWriteResult,
} from '../systems/JournalLog';
import type { DomesticTaskId } from '../systems/DomesticTasks';
import { refreshRivalTrade as refreshRivalTradePure, TRADE_RESOURCE_NAMES, tradeWithRival as tradeWithRivalPure, type TradeResult } from '../systems/RivalTrade';
import { sendGiftWithLetter } from '../systems/RivalNations';
import { ITEM_DIPLOMACY_LETTER } from '../systems/ItemDef';
import { consumePaidFeatureUse, EMPTY_PAID_FEATURE_QUOTA, normalizePaidFeatureQuota, previewPaidFeatureUse, QUOTA_FEATURE_OFC_REFRESH, type PaidFeatureQuotaState, type QuotaPreview } from '../systems/PaidFeatureQuota';
import { newAiHegemonOf } from '../systems/RivalHegemony';
import type { RivalNationRoster } from '../systems/RivalOfficers';
import type { RivalPowerContext } from '../systems/RivalOfficerSeason';
import { advanceRivalSeason, applyEraShift, attachRivalOfficers, autoResolveBattle, createRivalWorld, dropOwnedRivalOfficers, generalPower, nationDef, normalizeRivalWorld, type AutoBattleResult, type BattleGeneral, type RivalWorld } from '../systems/RivalNations';
import {
    defaultKeepTerritories,
    normalizeGovernanceAssignments,
    normalizeFarewellLetters,
    normalizeJournalEntries,
    normalizeLoginStreak,
    normalizeKeepTerritories,
    normalizePendingTerritoryLevel,
    normalizeTerritoryLevel,
} from '../systems/LifespanSave';
import {
    BattleResult,
    BattleSettlement,
    buildBattleConfig,
    checkDeployable,
    DeployCheck,
    listDeployable,
    recoverVitalityOneSeason,
    settleBattle,
} from '../systems/BattleRoster';

/** 倉庫擴容次數的庫存標記道具 id（PROG-2-1103） */
export const WAREHOUSE_EXPANSION_ITEM = 'warehouse.expansion';

/** 本季他國事件（依發生順序）；kind 與 RivalNations.SeasonEvent 相同，playerWon 為自動迎戰結果。 */
export interface RivalSeasonEventsPayload {
    events: Array<{ nationId: string; kind: string; playerWon: boolean }>;
}

export type DungeonRescueResult =
    | { ok: true; outcome: RescueOutcome; general: GeneralConfig; source: FemaleSource }
    | { ok: false; remainingMs: number };

/** 等待選路線的女兒：女兒清單沒存名字，名字取自名冊 */
export interface DaughterAwaitingRoute {
    id: string;
    name: string;
}

export const GAME_SESSION_EVENTS = {
    /** payload: SeasonAdvancedPayload */
    SeasonAdvanced: 'game-session-season-advanced',
    /** payload: { tiers: number[] }（大廳任務結算後官職晉升，OFC-08 提示用） */
    OfficerPromoted: 'game-session-officer-promoted',
    /** payload: GeneralRankPromotedPayload（武將名聲達門檻升將階，PROG-2-1898） */
    GeneralRankPromoted: 'game-session-general-rank-promoted',
    /** payload: YearReport（第 4 季結束時發出；養成線 FEM-06 等年度掛點接在這裡） */
    YearEnded: 'game-session-year-ended',
    /** payload: DaughterAwaitingRoute[]（年末剛滿 14 歲、還活著的女兒，PROG-2-1787） */
    DaughterComingOfAge: 'game-session-daughter-coming-of-age',
    MarriageProposal: 'game-session-marriage-proposal',
    /** payload: AgingEvent（type = reached-retirement-age） */
    GeneralReachedRetirementAge: 'game-session-general-retirement-age',
    /** payload: AgingEvent（type = died） */
    GeneralDied: 'game-session-general-died',
    /** payload: AgingEvent（type = entered-growth-stage，stage 為 grow-up / prime / elder） */
    GeneralGrowthStage: 'game-session-general-growth-stage',
    /** payload: AgingEvent（type = passed-peak）；培育武將剛過巔峰窗（PROG-2-1822） */
    GeneralPassedPeak: 'game-session-general-passed-peak',
    /** payload: EraResetEvent（每 60 月一次；目前只發訊號，領土/外交/AI 重置待世界沙盤接入，TIME-10） */
    EraReset: 'game-session-era-reset',
    /** payload: { nationId: string }（他國新成為霸主，G-1 稱霸提示，PROG-2-1710） */
    RivalHegemonRose: 'game-session-rival-hegemon-rose',
    /** payload: RivalSeasonEventsPayload（本季他國來犯與迎戰結果；大廳勢力圖據此逐州聚焦，UI-2-0130） */
    RivalSeasonEvents: 'game-session-rival-season-events',
    /** payload: UnveilingEvent（UI 在此播放血脈命鏡開獎演出，再讓玩家選宿命） */
    GeneralUnveiled: 'game-session-general-unveiled',
    /** payload: MentorCard */
    GeneralRetired: 'game-session-general-retired',
    /** payload: { generalId, name, imprints }（退役或去世凝練生平印記，PROG-2-1794） */
    LifeImprinted: 'game-session-life-imprinted',
    /** payload: ClanTierUpPayload（門第升格；季度檢定時發出） */
    ClanTierUp: 'game-session-clan-tier-up',
    /** payload: MilestoneUpPayload（家族揭露階段上升） */
    MilestoneUp: 'game-session-milestone-up',
    /** payload: CustomGoldFactorBornPayload（退役時凝練宗脈家傳金因子） */
    CustomGoldFactorBorn: 'game-session-custom-gold-factor-born',
    /** payload: { childId, injectedFactorId, consumed }（退役時因子媒介注入，PROG-2-0865） */
    GeneCatalystInjected: 'game-session-gene-catalyst-injected',
    /** payload: SpiritCard（每位死亡武將一張） */
    SpiritCardCreated: 'game-session-spirit-card-created',
    /** payload: BattleSettlement（戰後精力、戰績、功勳已寫回名冊） */
    BattleSettled: 'game-session-battle-settled',
    /** payload: string | null（出戰主將 id） */
    LeadGeneralChanged: 'game-session-lead-general-changed',
    /** payload: CountdownState | null（趕路倒數開始或清除；OPEN-11） */
    CountdownChanged: 'game-session-countdown-changed',
    /** payload: TravelCountdown | null（回合制趕路；存檔欄位 travelCountdown） */
    TravelChanged: 'game-session-travel-changed',
    /** payload: SortieSupport（參謀官 / 後勤官，PROG-2-0083） */
    SortieSupportChanged: 'game-session-sortie-support-changed',
    /** payload: PlayerSaveSnapshot */
    Saved: 'game-session-saved',
    /** 祠堂軍功聲望變動（PROG-2-1910/1912）；payload: ClanPrestigeChangedPayload */
    ClanPrestigeChanged: 'game-session-clan-prestige-changed',
    /** payload: GeneralConfig[]（本次新加入名冊的武將） */
    RosterChanged: 'game-session-roster-changed',
    /** payload: undefined（第一次打贏戰鬥；新手開場第四幕紅顏的觸發點，只發一次） */
    FirstBattleCleared: 'game-session-first-battle-cleared',
    /** payload: PlayerSaveSnapshot */
    Loaded: 'game-session-loaded',
    /** payload: PlayerSaveSnapshot（主檔損壞、改從備份讀回時在 Loaded 之後發出；UI 據此提示玩家進度退回上一份，DS-14） */
    LoadRecoveredFromBackup: 'game-session-load-recovered-from-backup',
    /** payload: string[]（新的出戰卡組） */
    DeckChanged: 'game-session-deck-changed',
    /** payload: FactorAwakenedEvent */
    FactorAwakened: 'game-session-factor-awakened',
    /** payload: PlayerInventory（道具數量變動後的庫存） */
    InventoryChanged: 'game-session-inventory-changed',
    /** payload: DiscoveryGain（只在升級時廣播；phaseAfter > phaseBefore 時 UI 播放新色階解鎖提示） */
    DiscoveryLevelChanged: 'game-session-discovery-level-changed',
    /** payload: BloodlineStageCapRaisedPayload（升星確實提高五階奧義上限時廣播，升星過場用；BML-06，PROG-2-2056） */
    BloodlineStageCapRaised: 'game-session-bloodline-stage-cap-raised',
    /** payload: BloodlineStageAwakenedPayload（五階奧義覺醒成功時廣播，覺醒過場用；BML-06，PROG-2-2056） */
    BloodlineStageAwakened: 'game-session-bloodline-stage-awakened',
} as const;

export interface BloodlineStageCapRaisedPayload {
    generalId: string;
    stageCapBefore: number;
    stageCap: number;
}

export interface BloodlineStageAwakenedPayload {
    generalId: string;
    awakenedStage: number;
}

/** 季度增齡事件的廣播頻道：死亡、成長階段、過峰、退役候選四種 */
function agingEventChannel(event: AgingEvent): string {
    if (event.type === 'died') return GAME_SESSION_EVENTS.GeneralDied;
    if (event.type === 'entered-growth-stage') return GAME_SESSION_EVENTS.GeneralGrowthStage;
    if (event.type === 'passed-peak') return GAME_SESSION_EVENTS.GeneralPassedPeak;
    return GAME_SESSION_EVENTS.GeneralReachedRetirementAge;
}

/** 名冊來源；正式環境接 PlayerRosterService，測試接記憶體陣列 */
export interface RosterStore {
    getAll(): GeneralConfig[];
    replaceAll(generals: GeneralConfig[]): void;
}

/** 只需要 emit 的最小事件介面，正式環境傳入 EventSystem */
export interface SessionEventEmitter {
    emit(eventName: string, payload?: unknown): void;
}

export interface SeasonAdvancedPayload {
    advance: SeasonAdvanceResult;
    /** 本季滿 65 歲被系統強制轉教官卡的武將 id（SPI-01 退役雙軌，PROG-2-1994）；沒有時省略 */
    forcedRetirements?: string[];
    /** 與 forcedRetirements 同序的姓名，供通知顯示 */
    forcedRetirementNames?: string[];
    /** 季度治理報告句（領地治理 §G，PROG-2-1773）；本季沒有任何產出時沒有 */
    governanceReport?: string;
    /** 新一季發生治理事件時的提示句 */
    governanceEventLine?: string;
    /** 季末糧草見底的提示（經濟系統 §G，PROG-2-1774） */
    foodLowLine?: string;
    /** 本季交出傳家寶物的俘虜提示（道具系統 §G，PROG-2-1774） */
    prisonTreasureLines?: string[];
    /** 年度月旦評放榜句（血統傳承 G4 §G，PROG-2-1803）；只有跨年進春季、榜上有人時才有 */
    yuedanLines?: string[];
    /** 立春子嗣天象（doc_spec_0312 §2，PROG-2-2106）；只有跨年進入春季且有符合門檻的子嗣才有 */
    omenLines?: string[];
    agingEvents: AgingEvent[];
    /** 本季新開獎的子嗣 */
    unveilings: UnveilingEvent[];
    /** 有掛 SeasonLifecycle 才有；包含本季新建的英靈卡與季結 / 年底排程結果 */
    lifecycle?: LifecycleSettlement;
    /** 本季免費發放的求籤令（已達免費上限時為 0） */
    oracleTokensGranted?: number;
    /** 本季是年末時才有：本年的年報（TIME-07） */
    yearReport?: YearReport;
    /** 本季每位名冊武將的季度戰報（REC-08）；沒有精力資料的武將不列 */
    quarterlyReports?: QuarterlyBattleReportRow[];
    /** 本季他國 AI 來犯、以名冊前 3 強自動迎戰的結算（PROG-2-1088） */
    rivalBattles?: AutoBattleResult[];
    /** 本季（＝傭兵一日，MVP 定案）試用期滿未結義而離隊的傭兵 uid（PROG-2-1154） */
    mercenaryDepartures?: string[];
    /** 本季走到試用第 3 日的傭兵 uid（傭兵 §G 日常互動，PROG-2-1771） */
    mercenaryDayThree?: string[];
    /** 本季剛進插畫第 4 階段「信任」的傭兵 uid（留存 §G，PROG-2-1777） */
    mercenaryTrust?: string[];
}

/** 進行中的培育會話存取介面；正式環境為 NurtureService，讓存檔帶著培育進度 */
export interface NurtureStatePort {
    getState(): NurtureState;
    restoreState(state: NurtureState | null | undefined): void;
    /** 補上到期的開蒙禮、加冠禮；太傅代管也要演（G1 §E） */
    performDueRites?(childId: string, random?: RandomSource): NurtureRiteResult[];
}

/** 戰後結算結果：名冊結算 + 覺醒經驗 + 本場覺醒的因子 */
export interface BattleRecordResult extends BattleSettlement {
    /** 有給經驗才有（ongoing 或名冊沒人出戰時省略） */
    discovery?: DiscoveryGain;
    awakenings: FactorAwakenedEvent[];
    /** 有出征帳本才有：寫回後的城市兵源與糧草（PROG-2-0072） */
    military?: MilitaryReserve;
}

export interface RecordBattleOptions {
    /** 在戰場完成「特定動作」的武將（覺醒機率 0.05 → 0.15，並視同滿足特殊條件），不指定是哪個動作 */
    specialActionIds?: readonly string[];
    /** 武將 id → 本場完成的特定動作（BattleSpecialActionId）；會用動作標籤優先挑相符的因子 */
    specialActions?: Readonly<Record<string, readonly string[]>>;
    /** 出征帳本結算（戰損回扣城市兵源、糧草消耗）；沒有時城市兵源與糧草不變 */
    sortie?: Pick<SortieSummary, 'lostTroops' | 'foodSpent'> | null;
    /** 武將 id → 本場表現（擊殺 / 傷害 / 承傷 / 治療），累加進戰績 */
    performance?: Readonly<Record<string, BattlePerformance>>;
    /** 本場的關卡 id；勝利時記入通關紀錄（連環破，PROG-2-0215） */
    stageId?: string;
    /** 本場出陣的虎符卡片 id；戰後各自累積戰鬥經驗並可能升星（PROG-2-0573） */
    deployedTallyIds?: readonly string[];
    /** 武將 id → 戰鬥結束時的精力（已扣奧義成本）；結算以此為基準再扣戰後精力 */
    vitalityAfterBattle?: Readonly<Record<string, number>>;
    /** 武將 id → 戰鬥結束時的血量比例（0~1）；重傷扣壽命上限（戰傷減損，PROG-2-1570） */
    hpRatioAfterBattle?: Readonly<Record<string, number>>;
    /** 本場戰場撿拾累計（Stage_Salvage）；勝利或平手時戰後一次入帳（PROG-2-1571） */
    stageSalvage?: Readonly<SalvageTotals>;
    /** 英靈夢回教學戰的傳說英靈；勝利時產出初始虎符（OPEN-13），沒有時不做任何事 */
    teachingSpirit?: TeachingSpiritInput | null;
}

export interface GeneralRankPromotedPayload {
    generalId: string;
    /** 新將階 1~5；一次跨多階時每一階各發一次 */
    rank: number;
    title: string;
}

export interface AddGeneralsResult {
    added: GeneralConfig[];
    duplicates: GeneralConfig[];
    /** 重複抽到且啟用轉生時，每位被轉生的武將結果（GCH-05） */
    rebirths: Array<RebirthPullResult & { id: string }>;
    /** 滿轉溢出換得的結義點數（GCH-06） */
    bondPointsGained: number;
}

export interface AddGeneralsOptions {
    /** 轉蛋抽到重複同名武將時改為轉生（+1 轉）；預設關閉，俘虜招募等來源維持原行為 */
    rebirthOnDuplicate?: boolean;
    /** 轉蛋入冊：新武將寫入轉蛋旗標（忠誠鎖定 100）；已有忠誠紀錄的武將不覆寫；舊存檔無此紀錄時維持原值 */
    fromGacha?: boolean;
}

/** 季結日誌的排序優先級（PROG-2-0976）；低於戰鬥與派駐條目，不會擠掉它們 */
const SEASON_JOURNAL_PRIORITY = 50;
/** 子嗣天象一輩子只報一次，比季結日誌優先 */
const CHILD_OMEN_JOURNAL_PRIORITY = 60;

/**
 * 季結日誌的時間戳只作排序鍵（PROG-2-0976，暫定）：以「年-季序號-01」表示，
 * 讓同年較後的季排在較前面。尚未對應遊戲內實際日期。
 */
function seasonJournalTimestamp(current: GameTimeState): string {
    const year = String(current.currentYear).padStart(4, '0');
    const season = String(current.currentSeason).padStart(2, '0');
    return `${year}-${season}-01T00:00:00`;
}

export class InMemoryRosterStore implements RosterStore {
    private _generals: GeneralConfig[];

    constructor(initial: GeneralConfig[] = []) {
        this._generals = initial.map((general) => ({ ...general }));
    }

    getAll(): GeneralConfig[] {
        return this._generals.map((general) => ({ ...general }));
    }

    replaceAll(generals: GeneralConfig[]): void {
        this._generals = generals.map((general) => ({ ...general }));
    }
}

/** 出征支援：參謀官 / 後勤官（PROG-2-0083） */
export interface SortieSupport {
    strategistUid: string | null;
    deputyUid: string | null;
}

export interface SortieSupportSummary {
    strategist: GeneralConfig | null;
    deputy: GeneralConfig | null;
    strategistBonus: StrategistBonus;
    deputyBonus: DeputyFoodBonus;
}

function toSortieMember(g: GeneralConfig): SortieMember {
    return {
        id: g.id,
        int: g.int ?? g.stats?.int,
        pol: g.pol ?? g.stats?.pol,
        lea: g.lea ?? g.stats?.lea,
        ...(g.bloodlineId ? { bloodlineId: g.bloodlineId } : {}),
    };
}

/** 虎符忠誠度初始值（規格未定，暫定）；武將沒有紀錄時以此起算 */
const TALLY_LOYALTY_INITIAL = 50;

/** 試用券招募結果：沿用 TrialTicketResult，另加上 uid 重複的拒絕原因。 */
export type HireTrialResult = Omit<TrialTicketResult, 'reason'> & { reason?: TrialTicketRejectReason | 'uid-taken' };

/** 退役或去世凝練生平印記（PROG-2-1794） */
export interface ClanPrestigeChangedPayload {
    generalId: string;
    gain: number;
    prestige: number;
    tier: number;
    tierUp: boolean;
}

export interface MilestoneUpPayload {
    oldStage: MilestoneStage;
    newStage: MilestoneStage;
    lines: string[];
}

export interface ClanTierUpPayload {
    oldTier: ClanTier;
    newTier: ClanTier;
}

export interface CustomGoldFactorBornPayload {
    generalId: string;
    name: string;
    ep: number;
    factorName: string;
}

export interface LifeImprintedPayload {
    generalId: string;
    name: string;
    imprints: string[];
}

/** 單一遊戲日的傭兵結算結果：日序與本日產生的離隊事件（告別信等）。 */
export interface MercenaryDayReport {
    day: number;
    events: DepartureEvent[];
    /** 本日走到試用第 3 日的傭兵 uid（PROG-2-1771） */
    dayThreeUids: string[];
    /** 本日剛進插畫第 4 階段的傭兵 uid（PROG-2-1777） */
    trustUids: string[];
}

/** 派遣板點列派遣結果（PROG-2-1181） */
export interface DispatchClickResult {
    ok: boolean;
    reason?: DispatchStartReason | 'unknown-job' | 'no-general';
    jobName?: string;
    generalName?: string;
}

export class GameSession {
    private _clock = new GameClock();
    /** 單場戰報快照（PROG-2-0951）：只保留最近一場，記憶體內，不寫入存檔 */
    private _battleSerial = 0;
    private _lastBattleSnapshots: BattleSnapshot[] = [];
    /** 動態關係表（KIN-10）：目前只在記憶體中，存檔欄位另卡接線 */
    public readonly dynamicRelations = new DynamicRelationBook();
    /** 關係組合事件一次性紀錄（KIN-08，PROG-2-1412）：同季同對只播一次，隨存檔保存 */
    public readonly relationEvents = new RelationEventLedger();
    /** NPC 記憶擁有者 id 與 NPC_Memory read model（NPC-09）：新局由種子決定，讀檔缺欄位時補產 */
    private _npcPlayerId: string | null = null;
    private _npcMemory: NpcMemoryRecord | null = null;
    /** 離線互動的高權重限流（F-1 第 3 點）：同一登入窗內每位武將只排一則高權重互動；本次不寫入存檔 */
    private readonly _npcInteractionLimiter = new NpcInteractionLimiter();
    /** 七天歷程進度（RET-12）：首次登入日與已觸發的觸發點；寫入存檔 */
    private _sevenDayJourney: SevenDayJourneyState = createSevenDayJourneyState();
    public get sevenDayJourney(): SevenDayJourneyState {
        return { firstLoginDay: this._sevenDayJourney.firstLoginDay, firedIds: [...this._sevenDayJourney.firedIds] };
    }
    /** 目前 NPC_Memory read model（唯讀；寫入由之後的 NPC 對話線負責） */
    public get npcMemory(): Readonly<NpcMemoryRecord> | null {
        return this._npcMemory;
    }
    private _roster: RosterStore = new InMemoryRosterStore();
    private _save: PlayerSaveService | null = null;
    private _events: SessionEventEmitter | null = null;
    private _lifecycle: SeasonLifecycle | null = null;
    private _seeded: SeededRandom;
    private _random: RandomSource = () => this._seeded.next();
    /** 主動指令造成的死亡事件；下一次季結時併入 aging 事件交給季結結算（不寫入存檔，見 PROG-2-0221） */
    private _pendingLifespanEvents: AgingEvent[] = [];
    /** 本年度累積的老化事件（年末產出年報後清空，不存檔；年中讀檔時從 0 起算） */
    private _yearAgingEvents: AgingEvent[] = [];
    /** 本季第一次主動扣壽命前的名冊；季結時當作陣亡虎符結算的「之前」基準，結算後清掉（不存檔） */
    private _preLifespanRoster: GeneralConfig[] | null = null;
    /** 共用入口保持同一函式身分，讀檔恢復游標後既有服務會立即使用新狀態。 */
    public readonly randomSource: RandomSource = () => this._random();

    private _autoSave = true;
    private _nurture: NurtureStatePort | null = null;
    private _factorDictionary: FactorDictionary | undefined;
    private _baseFactorDictionary: FactorDictionary | undefined;
    /** 玩家自創的因子定義（G4 §E #2）；隨存檔保存，併進 _factorDictionary */
    private _customFactors: FactorDefinition[] = [];
    private _deck: string[] = [];
    private _leadGeneralId: string | null = null;
    /** 出征支援（參謀官 / 後勤官）；暫定只存在本次遊玩，不寫存檔 */
    private _sortieSupport: SortieSupport = { strategistUid: null, deputyUid: null };
    /** 編制預設（DEP-14）：主將 id → 參謀官 / 後勤官，會寫入存檔 */
    private _sortiePresets: Record<string, SortieSupport> = {};
    /** 趕路倒數（OPEN-11）；目前未存檔，讀檔後為 null。 */
    private _countdown: CountdownState | null = null;
    /** 回合制趕路（PROG-2-0475）：每季遞減，歸零即到達並清除；存檔欄位 travelCountdown。 */
    private _travel: TravelCountdown | null = null;
    private _discoveryLevel = 1;
    private _discoveryExp = 0;
    private _inventory: PlayerInventory = { ...STARTER_INVENTORY };
    private _oracleCount = 0;
    private _onboarding: OnboardingState = { ...FRESH_ONBOARDING };
    /** 開場信件已讀狀態；存檔欄位 openingLetter（PROG-2-1304） */
    private _openingLetter: OpeningLetterState = { ...FRESH_OPENING_LETTER };
    /** 結義點數（轉蛋滿轉溢出獲得，傭兵轉永久用）；存檔欄位 bondPoints */
    private _bondPoints = 0;
    /** NPC 好友教官清單（MENT-14 MVP）；由 ServiceLoader 從資料表載入 */
    private _npcFriendMentors: NpcFriendMentor[] = [];
    /** 好友借用紀錄（MENT-14）；目前只存在記憶體，尚未寫入存檔 */
    private _borrowLedger: BorrowLedger = { records: [] };
    /** 戰魂碎片帳本（以亡者 uid 為鍵）；超齡死亡時產生，寄宿後消耗（SAME-08，PROG-2-1056） */
    private _soulFragments: SoulFragmentLedger = emptySoulFragmentLedger();
    /** 門第階級，只升不降（G4 §F-1） */
    private _clanTier: ClanTier = 0;
    private _milestoneStage: MilestoneStage = 1;
    private _expertView = false;
    private _marriageProposal: MarriageProposal | null = null;
    private _familySynergy: FamilySynergyLedger = emptyFamilySynergyLedger();
    private _pedigreeProbes: string[] = [];
    private _hiddenLineageProbes: string[] = [];
    private _statProbes: string[] = [];
    private _clanTradition: ClanTradition | null = null;
    private _clanHall: string | null = null;
    /** 已通關的關卡 id（連環破，PROG-2-0215） */
    private _clearedStageIds: string[] = [];
    /** 收藏武將 id（HALL-07 收藏權重，PROG-2-0453） */
    private _favoriteGeneralIds: string[] = [];
    /** 大廳任務指派：任務 id → 指派武將 id（HALL-07 已派任務權重，PROG-2-0453） */
    private _hallAssignments: Record<string, string> = {};
    /** 大廳武將點位的目前狀態（HALL-07，不存檔：讀檔後重新抽） */
    private _hallSpotState: HallSpotState = EMPTY_HALL_SPOT_STATE;
    /** 武將 id → 虎符忠誠度狀態（TRP-09） */
    private _tallyLoyalty: Record<string, TallyLoyaltyState> = {};
    /** 虎符持有關係（TRP-08）：虎符 uid → 持有武將 id（null 為君主） */
    private _tallyHoldings: TallyHoldings = createTallyHoldings([]);
    /** 虎符卡資料（uid → 卡）；陣亡產出的卡會登記到這裡 */
    private _tallyCards: Record<string, TigerTallyCard> = {};
    /** 統一物件庫列（DS-08 canonical，PROG-2-1021）；過渡期虎符寫入後同步重算 TALLY 列 */
    private _inventoryRecords: InventoryRecord[] = [];
    /** 最近一次登入切日時被回收的限時道具列（PROG-2-1364）；供 UI 顯示 UI_ITEM_EXPIRE */
    private _lastExpiredInventory: InventoryRecord[] = [];
    /** 女性武將來源（uid → 來源，FEM-01）；戰俘女將歸入名冊時寫入（PROG-2-0245） */
    /** 官職狀態（OFC-03）：階位、經驗與解鎖歷史；存檔為扁平欄位 officerState */
    private _officerState: OfficerState = initialOfficerState();
    /** 高階官職試用（OFC-12）：只影響有效階位，不覆寫正式官職 */
    private _officerTrial: OfficerTrial | null = null;
    /** 世界沙盤標記所在的領地 id（OFC-06 / PROG-2-0965）；每領地最多一個，數量上限由官職階段決定 */
    private _sandtableMarkerTerritories: readonly string[] = [];
    /** 世界沙盤解鎖歷史（HALL-08）：只增不減，天下重組後不倒退 */
    private _sandtableUnlockHistory: SandtableStageId[] = [];
    /** 英靈夢回教學戰的初始虎符（OPEN-13）：只寫一次，之後的教學戰完成不覆蓋 */
    private _startingTalisman: StartingSpiritTalisman | null = null;
    /** 抽卡待補教官卡日誌（PROG-2-1004）：與扣款、入冊同批存檔 */
    private _gachaMentorJournal: GachaMentorJournalEntry[] = [];
    /** 大廳任務 AI 委任紀錄（PROG-2-1006） */
    private _hallAssignLog: HallAutoAssignRecord[] = [];
    private _femaleSources: Record<string, FemaleSource> = {};
    /** 轉蛋各池保底計數（PROG-2-0337）；由轉蛋服務寫入，存檔時一併保存 */
    private _gachaPity: GachaPityBook = {};
    private _femaleSystem: FemaleSystemState = normalizeFemaleSystemState(undefined);
    /** 轉蛋錢包（PROG-2-0338）；null 代表存檔沒有，讀舊 localStorage 或用預設 */
    private _gachaWallet: GachaWalletSave | null = null;
    /** 轉蛋資料（保底、錢包）的版本號：每次被改動就加一；轉蛋服務靠它得知自己的快取過期（PROG-2-0608） */
    private _gachaRevision = 0;
    /** Legacy_Count（RET-07）：玩家層級的跨世代成就次數 */
    private _legacyCount = 0;
    /** 已傳道過的名將 id（MENT-15 一生一次） */
    private _legendaryMentoringUsedIds: string[] = [];
    /** 結緣成功的本機端紀錄（BRD-12）；隨既有玩家存檔保存（PROG-2-1146） */
    private _breedingBirthRecords: BreedingBirthRecord[] = [];
    /** 世家系統解鎖旗標（PM 暫定）：第一位子嗣誕生時寫入；舊檔以出生紀錄推導。 */
    private _familySystemUnlockedFlag = false;
    /** 新玩家開場進行中的幕 id（PROG-2-1371）；開場結束為 null */
    private _postLoadHook: (() => void | Promise<void>) | null = null;
    private _openingPhase: string | null = null;
    /** 開場商業序列的回應紀錄（OPEN-12）；存檔欄位 openingOffers */
    private _openingOffers: OpeningOfferState = { ...FRESH_OPENING_OFFER_STATE };
    /** 已發放免費入學令的最大登入日（YYYY-MM-DD，高水位）；從未發過為 null（PROG-2-1374 修正，PM 裁定） */
    private _enrollGrantDay: string | null = null;
    // ---- 道具取得來源紀錄（ITM-05，PROG-2-1383）：與數量分開存放，隨 lifespanSaveFields 存檔 ----
    private _itemAcquisitionLog: ItemAcquisitionRecord[] = [];

    /** 道具取得來源紀錄（唯讀副本）；沒有紀錄為空陣列。 */
    public get itemAcquisitionLog(): ItemAcquisitionRecord[] {
        return this._itemAcquisitionLog.slice();
    }

    /** 依道具與來源查詢取得紀錄（ITM-05）。 */
    public queryItemAcquisitions(query: ItemAcquisitionQuery = {}): ItemAcquisitionRecord[] {
        return queryAcquisitions(this._itemAcquisitionLog, query);
    }
    /** 玩家連勝／連敗計數（AIS-11 E-8）：敵方自適應縮放用；讀檔缺值為 0 */
    private _aiAdaptiveStreak: AiAdaptiveStreak = { ...EMPTY_AI_ADAPTIVE_STREAK };
    /** 祠堂軍功聲望（與 ClanTier 血統階層雙軌並存） */
    private _clanPrestige = 0;
    private _infusionRecords: InfusionRecord[] = [];
    private _salaryLedger: SalaryLedger = createSalaryLedger();
    private _extremeTask: ExtremeTaskState = createExtremeTaskState();
    private _pendingSceneGambit: PendingSceneGambit | null = null;
    /** 祠堂每日供奉最後領取日（UTC+8，YYYY-MM-DD）；從未領為 null（PROG-2-1915） */
    private _shrineOfferingDay: string | null = null;
    private _seasonPass: SeasonPassState = createSeasonPassState();
    private _military: MilitaryReserve = { ...STARTER_MILITARY };
    private _prison: PrisonState<GeneralConfig> = createPrisonState<GeneralConfig>();
    /** 來投時依 uid 查回的武將配置（generals.json）；大廳載入後由 setGeneralTemplates 注入 */
    private _generalTemplates: readonly GeneralConfig[] = [];
    /** 名聲（暫定：存於 resources.fame） */
    private _fame = 0;
    /** 點數（溢出轉化積分，MENT-07）；存於 resources.scorePoints */
    private _scorePoints = 0;
    /** 自動培育券數（NUR-14）；存於 resources.autoNurtureTickets */
    private _autoNurtureTickets = 0;
    /** 主線第一次通過培育季後為 true（解鎖自動培育）；存於 resources.mainlineNurtureClearedOnce */
    private _mainlineNurtureClearedOnce = false;
    /** 第一次打贏戰鬥後為 true（新手開場第四幕觸發）；舊檔依既有通關紀錄推算，存於 resources.firstBattleCleared */
    private _firstBattleCleared = false;
    /** 新手開場第四幕（紅顏登場）已展示過；舊檔已有通關紀錄者視為看過，不補彈。存於 resources.openingRedFaceShown */
    private _openingRedFaceShown = false;
    /** 內政本季紀錄：同季只能選一項 */
    private _domesticLog: DomesticSeasonLog = { ...EMPTY_DOMESTIC_LOG };
    /** 治理事件（PROG-2-1773）：只在發生那一季有效 */
    private _governanceEvent: ActiveGovernanceEvent | null = null;
    private _governanceBoosts: ActiveGovernanceBoost[] = [];
    private _governanceEventRandom: RandomSource | null = null;
    /** 換季武將性格事件（LOOP-01，PROG-2-2201） */
    private _seasonPersonality: SeasonPersonalityState = { ...EMPTY_SEASON_PERSONALITY_STATE, pending: [] };
    private _seasonEventRandom: RandomSource | null = null;
    // 三國季報（LOOP-03，PROG-2-2203）：換季合成，奇遇抉擇與已讀隨存檔
    private _seasonChronicle: SeasonChronicleState = copySeasonChronicle(EMPTY_SEASON_CHRONICLE);
    private _chronicleRandom: RandomSource | null = null;
    /** 最近一次 recordLoginAt 是不是換日後第一次登入（季報首登彈窗用，不存檔） */
    private _loginStartedNewDay = false;
    private _rivals: RivalWorld = createRivalWorld();
    /** 付費功能的每日額度（裁決第 19 項）；存檔欄位 paidFeatureQuota */
    private _paidFeatureQuota: PaidFeatureQuotaState = EMPTY_PAID_FEATURE_QUOTA;
    /** 他國逐將名冊與重算情境（E-9，PROG-2-1714）；未設定時他國照舊以兵力計軍力 */
    private _rivalOfficers: { rosters: Readonly<Record<string, RivalNationRoster>>; context: RivalPowerContext } | null = null;
    private _rivalRulerIds: Readonly<Record<string, string>> = {};
    /** 季末糧不足標記（TRP-12）；只給下一場出征用，不進存檔 */
    private _tallyFoodDiscountArmed = false;
    /** 傭兵存檔包（試用、薪水、冷卻）；隨存檔保存（MERC-01 接線） */
    private _mercenaries: MercenarySaveBundle = createEmptyMercenaryBundle();

    constructor(seed: number = Math.floor(Math.random() * 4294967296)) {
        this._seeded = new SeededRandom(seed);
        this._npcPlayerId = npcPlayerIdFromSeed(seed);
        this._npcMemory = createNpcMemory(this._npcPlayerId);
    }

    public get gameTime(): GameTimeState {
        return this._clock.state;
    }

    /** 最近一場戰鬥的單場戰報快照（唯讀；尚未有戰鬥時為空） */
    public get lastBattleSnapshots(): readonly BattleSnapshot[] {
        return this._lastBattleSnapshots;
    }

    /** 本機戰績排行：依指定指標排序，取前 N 名（REC-11，PROG-2-0955；好友與全服尚未接） */
    public rankBattleLeaderboard(metric: LeaderboardMetric, limit: number): LeaderboardEntry[] {
        const entries = this._roster.getAll().map((general) => leaderboardEntryOf(general));
        return rankLeaderboard(entries, metric, limit);
    }

    public get roster(): GeneralConfig[] {
        return this._roster.getAll();
    }

    /** 玩家出戰卡組（複本）；空陣列 = 尚未選卡，戰場端會退回預設卡組 */
    /** 玩家指定的出戰主將 id（可能已不能出戰，取用請走 resolveLeadGeneralId） */
    public get leadGeneralId(): string | null {
        return this._leadGeneralId;
    }

    public get deck(): string[] {
        return [...this._deck];
    }

    /** 因子覺醒用的玩家層級（決定能解鎖到哪個色階） */
    public get discoveryLevel(): number {
        return this._discoveryLevel;
    }

    /** 目前玩家層級已開放的因子色（LUK-04），依 ALL_FACTOR_COLORS 順序；Lv1 藍粉綠 */
    public visibleFactorColors(): FactorColor[] {
        return factorColorsVisibleAtLevel(this._discoveryLevel);
    }

    /** 目前的因子解鎖階段（FUL-06）：由玩家層級換算，Lv1~20 為 Phase 1 */
    public get unlockPhase(): UnlockPhase {
        return phaseForLevel(this._discoveryLevel);
    }

    /** 目前階段已解鎖的因子色（FUL-06）；尚未接到結緣參與色 */
    public unlockedFactorColors(): FactorColor[] {
        return phaseFactorColors(this.unlockPhase);
    }

    /** 目前等級內累積的覺醒經驗 */
    public get discoveryExp(): number {
        return this._discoveryExp;
    }

    /** 道具庫存（唯讀副本） */
    /** 新手引導進度（只讀副本）；讀檔後由存檔還原 */
    /** 結義點數餘額（GCH-06） */
    public get bondPoints(): number {
        return this._bondPoints;
    }

    public get onboarding(): OnboardingState {
        return { ...this._onboarding };
    }

    public get openingLetter(): OpeningLetterState {
        return { ...this._openingLetter };
    }

    /**
     * 玩家關閉開場信件後呼叫：記為已讀並自動存檔，之後不再自動開啟。
     * 已讀時重複呼叫不會再存檔。
     */
    public async markOpeningLetterSeen(): Promise<void> {
        if (this._openingLetter.seen) return;
        this._openingLetter = markOpeningLetterSeen(this._openingLetter);
        if (this._autoSave && this._save) await this.save();
    }

    /**
     * 確認一段新手引導已看過。依序確認，跳段或重複被拒（回傳 ok=false 且不存檔）。
     * 成功時自動存檔，讓關掉遊戲再開也不會重看。
     */
    public async acknowledgeOnboarding(segmentId: 'fate' | 'growth' | 'legacy'): Promise<OnboardingResult> {
        const result = acknowledgeOnboardingSegment(this._onboarding, segmentId);
        if (!result.ok) return result;
        this._onboarding = result.state;
        if (this._autoSave && this._save) await this.save();
        return result;
    }

    public get inventory(): PlayerInventory {
        return { ...this._inventory };
    }

    /** 累計名士占卜次數（覺醒占卜與子嗣預言都算，決定名士解鎖） */
    public get oracleCount(): number {
        return this._oracleCount;
    }

    /** 已通關的關卡 id（連環破，唯讀副本） */
    public get clearedStageIds(): readonly string[] {
        return [...this._clearedStageIds];
    }

    /** 虎符忠誠度狀態（唯讀副本）；沒有紀錄的武將不在表內 */
    public get tallyLoyalty(): Readonly<Record<string, TallyLoyaltyState>> {
        return { ...this._tallyLoyalty };
    }

    /** 虎符持有關係（唯讀副本）；uid → 持有武將 id，null 為君主 */
    public get tallyHoldings(): Readonly<Record<string, string | null>> {
        return { ...this._tallyHoldings.holders };
    }

    /** 虎符卡資料（唯讀副本）；uid → 卡 */
    /** 傭兵存檔包的副本；改動需透過 setMercenaries。 */
    public get mercenaries(): MercenarySaveBundle {
        return serializeMercenaryBundle(this._mercenaries);
    }

    /** 傭兵系統目前的遊戲日（從 0 起算）。 */
    public get mercenaryDay(): number {
        return this._mercenaries.day ?? 0;
    }

    /**
     * 推進一個遊戲日：試用中傭兵倒數 −1、好感 +10。
     * 倒數已在前一日歸零且仍未結義者，本日離隊、寫入告別事件並開始 30 天冷卻。
     * 遊戲日觸發：MVP 定案每推進一季過一日（PROG-2-1154，2026-10-27 使用者裁定；規格原為真實每日登入，改版只需換觸發點）。
     */
    public async advanceMercenaryDay(): Promise<MercenaryDayReport> {
        const report = this._tickMercenaryDay();
        if (this._autoSave && this._save) {
            await this.save();
        }
        return report;
    }

    /** 傭兵日推進的狀態變更（不存檔）；advanceMercenaryDay 與季度推進共用 */
    private _tickMercenaryDay(): MercenaryDayReport {
        const today = this.mercenaryDay + 1;
        const events: DepartureEvent[] = [];
        const departed = new Set<string>();
        const letters: FarewellLetter[] = [];
        const dayThreeUids: string[] = [];
        const trustUids: string[] = [];
        let cooldowns = this._mercenaries.cooldowns;
        const mercenaries = this._mercenaries.mercenaries.map((merc) => {
            const settled = settleTrialRollover(merc, today, cooldowns);
            cooldowns = settled.cooldowns;
            if (settled.departed) {
                departed.add(merc.uid);
                events.push(...settled.events);
                const letter = createFarewellLetter({ uid: merc.uid, generalName: this.generalNameOf(merc.generalId, merc.uid), affection: merc.affection ?? 0, day: today });
                if (letter) letters.push(letter);
                return { ...merc, status: settled.record.status };
            }
            const next = advanceTrialDay(merc).state;
            if (reachedTrialDayThree(merc, next)) dayThreeUids.push(merc.uid);
            if (reachedTrustStage(merc, next)) trustUids.push(merc.uid);
            return next;
        });
        for (const letter of letters) {
            const isNew = !this._farewellLetters.some((item) => item.id === letter.id);
            this._farewellLetters = appendFarewellLetter(this._farewellLetters, letter);
            if (isNew) this.recordJournal(farewellJournalEntry(letter, seasonJournalTimestamp(this._clock.state)));
        }
        this._mercenaries = {
            ...this._mercenaries,
            mercenaries,
            upkeep: this._mercenaries.upkeep.filter((u) => !departed.has(u.uid)),
            cooldowns,
            day: today,
        };
        return { day: today, events, dayThreeUids, trustUids };
    }

    /** 告別信用的武將名：名冊查得到用名字，否則用傭兵 uid。 */
    private generalNameOf(generalId: string | undefined, fallback: string): string {
        if (!generalId) return fallback;
        return this._roster.getAll().find(g => g.id === generalId)?.name ?? fallback;
    }

    /** 傭兵池可出現的武將：過濾掉 30 天冷卻中的武將 id，保留原順序。 */
    public availablePoolGeneralIds(generalIds: readonly string[]): string[] {
        return filterPoolGeneralIds(generalIds, this.mercenaryDay, this._mercenaries.cooldowns);
    }

    /** 試用招募池：名將池加滅亡國殘餘武將，扣掉已擁有、已是傭兵與冷卻中的武將（PROG-2-1848） */
    public trialHirePoolIds(heroPoolIds: readonly string[]): string[] {
        const taken = new Set<string>(this._mercenaries.mercenaries.map((m) => m.generalId).filter((id): id is string => !!id));
        for (const general of this._roster.getAll()) {
            taken.add(general.id);
            if (general.templateId) taken.add(general.templateId);
        }
        const pool = new Set<string>(heroPoolIds);
        fallenOfficerOrigins(this._rivals.nations, this._rivalRulerIds).forEach((_nationId, generalId) => pool.add(generalId));
        return this.availablePoolGeneralIds(Array.from(pool).filter((id) => !taken.has(id)));
    }

    /** 武將目前屬於哪個滅亡國的殘部；不是殘部回傳 null（PROG-2-1848） */
    public fallenOfficerNationName(generalId: string | undefined): string | null {
        const nationId = generalId ? fallenOfficerOrigins(this._rivals.nations, this._rivalRulerIds).get(generalId) : undefined;
        return nationId ? nationDef(nationId)?.name ?? nationId : null;
    }

    /** 傭兵列表的顯示列（倒數、結義進度、按鈕可否）；由目前存檔包推導，不改狀態。 */
    public mercenaryPoolRows(): MercenaryPoolRow[] {
        return buildMercenaryPoolRows(this._mercenaries);
    }

    /** 以校正後的副本取代傭兵存檔包；不寫存檔，由呼叫端決定何時 save。 */
    public setMercenaries(bundle: MercenarySaveBundle): void {
        this._mercenaries = normalizeMercenaryBundle(bundle);
    }

    /** 登記或覆寫一位武將的女性來源；格式不合法時回傳 false 且不變動。不寫存檔，由呼叫端決定何時 save。 */
    public setFemaleSource(generalId: string, source: FemaleSource): boolean {
        const normalized = normalizeFemaleSource(source);
        if (generalId.length === 0 || normalized === null) return false;
        this._femaleSources = { ...this._femaleSources, [generalId]: normalized };
        return true;
    }

    /**
     * 結義入名冊：傭兵結義轉永久（好感滿 60 為門檻，扣結義點數）、寫入武將名冊、進入 30 天冷卻、移除欠薪紀錄，並自動存檔。
     * 失敗時不改任何狀態。結義點數從 GCH-06 的餘額（bondPoints）扣除。
     */
    public async bondMercenaryToRoster(uid: string, template: GeneralConfig): Promise<RosterBondResult & { rosterAdded?: boolean }> {
        const mercenary = this._mercenaries.mercenaries.find((m) => m.uid === uid);
        if (!mercenary) {
            return { ok: false, reason: 'not-found', pointsSpent: 0 };
        }
        const result = bondMercenaryToRoster(mercenary, template, this._bondPoints, this._mercenaries.cooldowns, this.mercenaryDay);
        if (!result.ok || !result.mercenary || !result.general || !result.cooldowns) {
            return result;
        }
        this._mercenaries = {
            mercenaries: this._mercenaries.mercenaries.map((m) => (m.uid === uid ? result.mercenary! : m)),
            upkeep: this._mercenaries.upkeep.filter((u) => u.uid !== uid),
            cooldowns: result.cooldowns,
            day: this.mercenaryDay,
        };
        this._bondPoints -= result.pointsSpent;
        if (template.gender === '女' && !this._roster.getAll().some((g) => g.id === template.id)) {
            // §F 傭兵結義的女將品質為 SR~N，稀有度更高的模板也不超過 SR
            const quality = rarityOfTemplate(template) === 'R' ? 'R' : 'SR';
            this._femaleSources = { ...this._femaleSources, [template.id]: createFemaleSource('MERCENARY', quality, this._clock.state.totalSeasonsElapsed) };
        }
        const { added } = await this.addGenerals([result.general]);
        if (added.length > 0) await this.recordMercenaryOath(result.general.id);
        return { ...result, rosterAdded: added.length > 0 };
    }

    /**
     * 對武將使用補元散（PROG-2-0444）：扣道具、回復精力、寫回名冊並存檔。
     * 精力已滿或沒有道具時整體拒絕，背包與名冊都不變；查無武將回傳 no-general。
     * 上限沿用名冊上的 maxVitality，缺值時用性別基礎值（與 VitalityCap 一致）。
     */
    public async usePillOnGeneral(generalId: string, kind: VitalityPillKind): Promise<VitalityPillUseResult | { readonly ok: false; readonly reason: 'no-general' }> {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general) return { ok: false, reason: 'no-general' };
        const max = general.maxVitality ?? general.vitality ?? baseVitalityMaxOf(general.gender);
        const current = general.vitality ?? max;
        const result = useVitalityPill(this._inventory, current, max, kind);
        if (!result.ok) return result;
        this._inventory = result.inventory;
        this._roster.replaceAll(this._roster.getAll().map((g) => (g.id === generalId ? { ...g, vitality: result.vitality, maxVitality: max } : g)));
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        if (this._autoSave && this._save) {
            await this.save();
        }
        return result;
    }

    /**
     * 學府結業寫回名冊並自動存檔（PROG-2-1909）：五維、戰法、特質一起落地。
     * 查無武將回傳 null；快照未結業或不屬於該武將時由 applyAcademyGraduation 拋錯，名冊不變。
     */
    public async graduateFromAcademy(generalId: string, snapshot: Readonly<AcademyStateSnapshot>): Promise<AcademyGraduationResult | null> {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general) return null;
        const result = applyAcademyGraduation(general, snapshot);
        this._roster.replaceAll(this._roster.getAll().map((g) => (g.id === generalId ? result.general : g)));
        if (this._autoSave && this._save) {
            await this.save();
        }
        return result;
    }

    /** 對武將使用延壽丹（E-6，PROG-2-1347）：壽命上限 +3 與已服顆數寫回名冊並自動存檔；不成立時不扣道具 */
    public async useLongevityPillOnGeneral(generalId: string): Promise<LongevityPillUseResult | { readonly ok: false; readonly reason: 'no-general' }> {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general) return { ok: false, reason: 'no-general' };
        const result = useLongevityPill(this._inventory, general);
        if (!result.ok) return result;
        this._inventory = result.inventory;
        this._roster.replaceAll(this._roster.getAll().map((g) => (g.id === generalId ? { ...g, maxLifespan: result.maxLifespan, longevityPillCount: longevityPillsUsed(general) + 1 } : g)));
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        if (this._autoSave && this._save) {
            await this.save();
        }
        return result;
    }

    /**
     * 結義傭兵成功（KIN-06 / 事件 mercenary-oath）：與出戰主將記為義兄弟（DYNAMIC_SWORN）。
     * 暫定：規格未寫結義對象，先以出戰主將為對象；沒有主將或就是同一人時回傳 null。有新增才自動存檔。
     */
    public async recordMercenaryOath(generalUid: string): Promise<DynamicRelationResult | null> {
        const lead = this._leadGeneralId;
        if (!lead || lead === generalUid) return null;
        const result = this.dynamicRelations.record('mercenary-oath', generalUid, lead, this._clock.state.totalSeasonsElapsed);
        if (result.ok && result.created && this._autoSave && this._save) {
            await this.save();
        }
        return result;
    }

    /** 轉蛋各池保底計數（唯讀副本） */
    /** 子嗣女兒清單（唯讀副本，FEM-06） */
    public get daughters(): DaughterRecord[] {
        return [...this.femaleSystemState.daughters];
    }

    /** 新增一位子嗣女兒；id 重複回傳 false、不改狀態。 */
    public async addDaughter(record: DaughterRecord): Promise<boolean> {
        if (!this._appendDaughter(record)) return false;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return true;
    }

    private _appendDaughter(record: DaughterRecord): boolean {
        const current = this.femaleSystemState;
        if (current.daughters.some((d) => d.id === record.id)) return false;
        this._femaleSystem = { ...current, daughters: [...current.daughters, { ...record }] };
        return true;
    }

    /** 已滿 14 歲、尚未選路線、還活著的女兒（PROG-2-1787）；名字取自名冊 */
    public get daughtersAwaitingChoice(): DaughterAwaitingRoute[] {
        return this._liveDaughters(daughtersAwaitingRoute(this.daughters));
    }

    private _liveDaughters(records: readonly DaughterRecord[]): DaughterAwaitingRoute[] {
        const roster = this._roster.getAll();
        const result: DaughterAwaitingRoute[] = [];
        for (const record of records) {
            const general = roster.find((g) => g.id === record.id);
            if (general && !isGeneralDead(general)) result.push({ id: record.id, name: general.name });
        }
        return result;
    }

    /** 女兒滿 14 歲後選路線；成功才寫回並存檔，失敗回傳原因且不改狀態。 */
    public async assignDaughterRouteFor(daughterId: string, route: DaughterRoute): Promise<AssignDaughterResult | { ok: false; reason: 'NOT_FOUND' }> {
        const current = this.femaleSystemState;
        const target = current.daughters.find((d) => d.id === daughterId);
        if (!target) return { ok: false, reason: 'NOT_FOUND' };
        const result = assignDaughterRoute(target, route);
        if (!result.ok) return result;
        this._femaleSystem = {
            ...current,
            daughters: current.daughters.map((d) => (d.id === daughterId ? result.daughter : d)),
        };
        // 暫定：選路線才定職能，同步到名冊武將；後宮女官職能待裁決，維持出生時的職能（PROG-2-1787）
        const role = result.daughter.role;
        if (role) {
            this._roster.replaceAll(this._roster.getAll().map((g) => (g.id === daughterId ? { ...g, role } : g)));
        }
        if (this._autoSave && this._save) {
            await this.save();
        }
        return result;
    }

    /**
     * 年度掛點（FEM-06）：女兒每年長一歲，回傳本年剛滿 14 歲的女兒（給 UI 排分流提示）。
     * 季度推進的年末結算走 _tickDaughtersOneYear；本函式只改女兒年齡，不發事件。
     */
    public async onYearAdvanced(): Promise<DaughterRecord[]> {
        const hadDaughters = this.femaleSystemState.daughters.length > 0;
        const newlyOfAge = this._tickDaughtersOneYear();
        if (hadDaughters && this._autoSave && this._save) {
            await this.save();
        }
        return newlyOfAge;
    }

    private _tickDaughtersOneYear(): DaughterRecord[] {
        const current = this.femaleSystemState;
        const { daughters, newlyOfAge } = advanceDaughtersOneYear(current.daughters);
        if (daughters.length > 0) this._femaleSystem = { ...current, daughters };
        return newlyOfAge;
    }

    /** 女性來源系統狀態的唯讀副本（傭兵池／救美刷新時間、送禮好感） */
    public get femaleSystemState(): FemaleSystemState {
        return normalizeFemaleSystemState(this._femaleSystem);
    }

    /** 送禮：回傳該武將更新後的好感（0~100） */
    public giftFemale(uid: string, giftValue: number): number {
        this._femaleSystem = giftToFemale(this._femaleSystem, uid, giftValue);
        return this._femaleSystem.giftAffection[uid] ?? 0;
    }

    /** 傭兵池到期才刷新：未到期回傳 null；到期則記下時間戳並抽出女性池 */
    public refreshFemalePoolIfDue(candidates: readonly PoolCandidate[], nowMs: number, random: () => number, size = 4): string[] | null {
        const last = this._femaleSystem.poolRefreshedAtMs;
        if (last !== null && !isFemalePoolRefreshDue(last, nowMs)) return null;
        const poolIds = drawFemalePool(candidates, size, random);
        this._femaleSystem = { ...this._femaleSystem, poolRefreshedAtMs: nowMs, poolIds };
        return poolIds;
    }

    /**
     * 傭兵女將池（PROG-2-1790）：到期就重抽一批，回傳本批還能招的人與刷新倒數。
     * 只收 §F 的 SR~N；已在名冊、已是傭兵或還在冷卻的武將不列入。武將資料還沒載入時不刷新，避免空池鎖 8 小時。
     */
    public femalePoolStatus(generals: readonly GeneralConfig[], nowMs: number): { ids: string[]; remainingMs: number } {
        const taken = new Set([...this._roster.getAll().map((g) => g.id), ...this._mercenaries.mercenaries.map((m) => m.generalId)]);
        const open = (ids: readonly string[]): string[] => this.availablePoolGeneralIds(ids.filter((id) => !taken.has(id)));
        if (generals.length > 0) {
            const eligible = generals.filter((g) => {
                const rarity = rarityOfTemplate(g);
                return rarity === 'R' || rarity === 'SR';
            });
            const openIds = new Set(open(eligible.map((g) => g.id)));
            this.refreshFemalePoolIfDue(eligible.filter((g) => openIds.has(g.id)), nowMs, this._random);
        }
        const last = this._femaleSystem.poolRefreshedAtMs;
        return { ids: open(this._femaleSystem.poolIds), remainingMs: last === null ? 0 : femalePoolRemainingMs(last, nowMs) };
    }

    /** 地下城救美：未到 8 小時回傳 null；到期則記下時間戳並擲出結果 */
    public rollDungeonRescueIfDue(nowMs: number, random: () => number): RescueOutcome | null {
        const last = this._femaleSystem.rescueRefreshedAtMs;
        if (last !== null && !isRescueRefreshDue(last, nowMs)) return null;
        this._femaleSystem = { ...this._femaleSystem, rescueRefreshedAtMs: nowMs };
        return rollDungeonRescue(random);
    }

    /**
     * 民間尋訪（PROG-2-1788）：到期才擲結果，救回的女將入名冊並記 DUNGEON 來源；
     * 還沒刷新時回傳剩餘時間，不改任何狀態。
     */
    public async performDungeonRescue(nowMs: number): Promise<DungeonRescueResult> {
        const last = this._femaleSystem.rescueRefreshedAtMs;
        const outcome = this.rollDungeonRescueIfDue(nowMs, this._random);
        if (!outcome) return { ok: false, remainingMs: rescueRefreshRemainingMs(last as number, nowMs) };
        const general = buildRescuedGeneral(outcome, `rescue-${nowMs}`, this._random);
        const source = createFemaleSource('DUNGEON', RESCUE_QUALITY[outcome], this._clock.state.totalSeasonsElapsed);
        this._femaleSources = { ...this._femaleSources, [general.id]: source };
        this.enrollGenerals([general]);
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { ok: true, outcome, general, source };
    }

    public get gachaPityBook(): Readonly<GachaPityBook> {
        return normalizeGachaPityBook(this._gachaPity);
    }

    /** 轉蛋資料版本號；任何寫入（含讀檔、新遊戲、世代成就入帳）都會讓它改變 */
    public get gachaRevision(): number {
        return this._gachaRevision;
    }

    /** 轉蛋錢包（唯讀副本）；null 代表存檔沒有 */
    public get gachaWalletSave(): Readonly<GachaWalletSave> | null {
        return this._gachaWallet ? { ...this._gachaWallet } : null;
    }

    /** 覆寫轉蛋錢包；不寫存檔，由呼叫端決定何時 save */
    public setGachaWalletSave(wallet: Readonly<GachaWalletSave>): void {
        this._gachaWallet = normalizeGachaWalletSave(wallet);
        this._gachaRevision += 1;
    }

    /** 覆寫轉蛋保底表；不寫存檔，由呼叫端決定何時 save */
    public setGachaPityBook(book: Readonly<GachaPityBook>): void {
        this._gachaPity = normalizeGachaPityBook(book);
        this._gachaRevision += 1;
    }

    /**
     * 試用券招募（MERC-02）：消耗背包 1 張試用券，產生 Trial 傭兵並建立薪水紀錄，自動存檔。
     * uid 已存在、無試用券或武將 id 為空時拒絕，失敗不改任何狀態。uid 由呼叫端提供。
     */
    public async hireTrialMercenary(uid: string, template: GeneralConfig): Promise<HireTrialResult> {
        const wallet = { trialTickets: this.itemCount(ITEM_TRIAL_TICKET) };
        if (this._mercenaries.mercenaries.some((m) => m.uid === uid)) {
            return { ok: false, reason: 'uid-taken', wallet };
        }
        const result = useTrialTicket(wallet, uid, statsOfTemplate(template), template.id);
        if (!result.ok || !result.mercenary) {
            return result;
        }
        const inventory = consumeItem(this._inventory, ITEM_TRIAL_TICKET);
        if (!inventory) {
            return { ok: false, reason: 'no-ticket', wallet };
        }
        this._inventory = inventory;
        this._mercenaries = {
            ...this._mercenaries,
            mercenaries: [...this._mercenaries.mercenaries, result.mercenary],
            upkeep: [...this._mercenaries.upkeep, createUpkeepState(uid)],
        };
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        return result;
    }

    public get femaleSources(): Readonly<Record<string, FemaleSource>> {
        return normalizeFemaleSourcesMap(this._femaleSources);
    }

    public get tallyCards(): Readonly<Record<string, TigerTallyCard>> {
        return { ...this._tallyCards };
    }

    /** 統一物件庫的原始列（唯讀副本）；寶頁依武將 uid 篩出一般裝備 */
    public get inventoryRecords(): readonly InventoryRecord[] {
        return this._inventoryRecords.map((record) => ({ ...record }));
    }

    /** 最近一次回收的限時道具列（唯讀副本）；沒有回收時為空陣列。 */
    public get lastExpiredInventory(): readonly InventoryRecord[] {
        return this._lastExpiredInventory.map((record) => ({ ...record }));
    }

    /**
     * 回收已過期的限時道具列（PROG-2-1364）。永久列與格式不合的 expiresAt 保留。
     * @returns 本次被回收的列；同時更新 lastExpiredInventory。
     */
    public sweepExpiredInventory(nowMs: number): InventoryRecord[] {
        const { kept, expired } = sweepExpiredRecords(this._inventoryRecords, nowMs);
        if (expired.length > 0) this._inventoryRecords = kept;
        this._lastExpiredInventory = expired;
        return expired.map((record) => ({ ...record }));
    }

    /** 穿戴一般裝備（PROG-2-1040）：可否放入由一般裝備定義表的槽位判斷；成功才寫回物件庫列 */
    public equipGear(gearUid: string, generalUid: string, slotId: EquipSlot): GearEquipResult {
        const result = equipGearFlow(this._inventoryRecords, gearUid, generalUid, slotId, (record, slot) => gearDefinitionOf(record.Gear_ID)?.slot === slot);
        if (result.ok) this._inventoryRecords = result.records;
        return result;
    }

    /** 卸下武將指定格的一般裝備（PROG-2-1040）；裝備回到倉庫 */
    public unequipGear(generalUid: string, slotId: EquipSlot): GearEquipResult {
        const result = unequipGearFlow(this._inventoryRecords, generalUid, slotId);
        if (result.ok) this._inventoryRecords = result.records;
        return result;
    }

    /** 鎖定或解鎖一件物件庫列（BAG-07）；鎖定列不可分解，不影響穿戴 */
    public setInventoryLocked(inventoryId: string, locked: boolean): boolean {
        const result = setRecordLocked(this._inventoryRecords, inventoryId, locked);
        if (result.ok) this._inventoryRecords = result.records;
        return result.ok;
    }

    /** 分解一件未鎖定、未裝備的一般裝備（BAG-07）：移除該列並給 1 件竹簡（取得來源記 DECOMPOSE） */
    public decomposeGear(inventoryId: string): GearDecomposeResult {
        const before = this._inventory;
        const result = decomposeGearRecord(this._inventoryRecords, this._inventory, inventoryId);
        if (!result.ok) return result;
        this._inventoryRecords = result.records;
        this._inventory = result.inventory;
        this._recordGain(before, 'DECOMPOSE');
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        return result;
    }

    /** 卸下命槽英靈卡回倉庫（PROG-2-1280）；戰鬥鎖定由呼叫端傳入 */
    public unequipSpiritCard(generalUid: string, battleLocked: boolean): SpiritSlotFlowResult {
        const result = unequipSpiritCard(this._inventoryRecords, generalUid, battleLocked);
        if (result.ok) this._inventoryRecords = result.records;
        return result;
    }

    /** 命槽英靈卡設為主卡（PROG-2-1280）；戰鬥鎖定由呼叫端傳入 */
    public setPrimarySpiritCard(generalUid: string, battleLocked: boolean): SpiritSlotFlowResult {
        const result = setPrimarySpiritCard(this._inventoryRecords, generalUid, battleLocked);
        if (result.ok) this._inventoryRecords = result.records;
        return result;
    }

    /** 把倉庫英靈卡插入空命槽（PROG-2-1285）；戰鬥鎖定由呼叫端傳入 */
    public insertSpiritCard(generalUid: string, spiritId: string, battleLocked: boolean): SpiritSlotFlowResult {
        const result = insertSpiritCard(this._inventoryRecords, generalUid, spiritId, battleLocked);
        if (result.ok) this._inventoryRecords = result.records;
        return result;
    }

    /** 以倉庫英靈卡替換命槽現有英靈卡（PROG-2-1285）；戰鬥鎖定由呼叫端傳入 */
    public replaceSpiritCard(generalUid: string, spiritId: string, battleLocked: boolean): SpiritSlotFlowResult {
        const result = replaceSpiritCard(this._inventoryRecords, generalUid, spiritId, battleLocked);
        if (result.ok) this._inventoryRecords = result.records;
        return result;
    }

    /** 使用道具（PROG-2-1038）：刷新券寫回傭兵池與救美冷卻；安胎藥記下 armed，等下一次結緣才生效 */
    public useItem(itemId: string, nowMs: number): ItemUseResult {
        const result = useItemFlow(this._inventory, itemId, nowMs);
        if (!result.ok) return result;
        this._inventory = result.inventory;
        if (result.refresh) {
            this._femaleSystem = {
                ...this._femaleSystem,
                poolRefreshedAtMs: result.refresh.femalePoolLastRefreshMs,
                rescueRefreshedAtMs: result.refresh.dungeonRescueLastRefreshMs,
            };
        }
        return result;
    }

    /** 結緣實際執行後清除安胎藥的 armed 標記（PROG-2-1038）；沒有標記時不動背包 */
    public clearFertilityArm(): void {
        this._inventory = consumeItem(this._inventory, ITEM_FERTILITY_ARMED, 1) ?? this._inventory;
    }

    /** 統一物件庫推導的虎符與英靈卡視圖（DS-08）；讀取一律走這裡，不直接讀 _tallyCards */

    public get inventoryViews(): InventoryViews {
        return deriveInventoryViews(this._inventoryRecords);
    }

    /** 陣亡、退役或不在名冊的武將身上的一般裝備回到倉庫（兩欄清為 null），避免裝備掛在已離開的武將名下（PROG-2-0681） */
    private _releaseGearOfInactiveGenerals(): void {
        const active = new Set(this._roster.getAll()
            .filter((g) => g.status !== 'dead' && !(g as { isMentorCard?: boolean }).isMentorCard)
            .map((g) => g.id));
        let changed = false;
        const next = this._inventoryRecords.map((record): InventoryRecord => {
            if ((record.Item_Type !== 'OTHER' && record.Item_Type !== 'SPIRIT_CARD') || !record.equippedBy || active.has(record.equippedBy)) return record;
            changed = true;
            return record.Item_Type === 'SPIRIT_CARD'
                ? { ...record, equippedBy: null, slotId: null, isPrimary: null }
                : { ...record, equippedBy: null, slotId: null };
        });
        if (changed) this._inventoryRecords = next;
    }

    /** 過渡期 dual-write（DS-08）：虎符寫入後重算 TALLY 列，其他類型的列保留 */
    private _syncInventoryRecords(): void {
        const others = this._inventoryRecords.filter((r) => r.Item_Type !== 'TALLY');
        this._inventoryRecords = [...others, ...buildTallyInventoryRecords(this._tallyCards, this._tallyHoldings.holders)];
    }

    private _tallyNotices: TallyLine[] = [];
    /** 名將陣亡的雙卡結算彈窗資料（SPI-12）；不存檔，顯示端取走一次 */
    private _dualCardSettlements: DualCardSettlementPayload[] = [];

    /** 取走尚未顯示的雙卡結算（英靈卡＋虎符，PROG-2-2083） */
    public consumeDualCardSettlements(): DualCardSettlementPayload[] {
        const payloads = this._dualCardSettlements;
        this._dualCardSettlements = [];
        return payloads;
    }

    /** 取走雙卡結算並組成文字列（PROG-2-2084）；沒給 translate 用繁中保底 */
    public consumeDualCardSettlementLines(translate?: TallyTranslate): string[] {
        return this.consumeDualCardSettlements().flatMap(dualCardSettlementSpecs).map((line) => formatTallyLine(line, translate));
    }


    /** 取走尚未顯示的虎符提示（產出、升星，PROG-2-1768）；戰場結算或大廳換季時顯示一次 */
    public consumeTallyNotices(translate?: TallyTranslate): string[] {
        const notices = this._tallyNotices;
        this._tallyNotices = [];
        // PROG-2-1987：存 Key＋參數，取走時由顯示端的 i18n 組字；沒給 translate 用繁中保底
        return notices.map((line) => formatTallyLine(line, translate));
    }

    private _tallyNameOf(card: TigerTallyCard): string {
        return resolveTallyName(card, (id) => this._roster.getAll().find((g) => g.id === id || g.templateId === id)?.name);
    }

    /**
     * 戰後把戰鬥經驗寫回出陣的虎符卡片實例（PROG-2-0573）。
     * 只有有結果的戰鬥會結算（ongoing 不結算）；卡片不存在的 id 略過。回傳是否有卡片被改動。
     */
    private _settleTallyBattleExp(deployedTallyIds: readonly string[], result: string): boolean {
        const outcome = tallyBattleOutcome(result);
        if (!outcome) return false;
        let changed = false;
        const nextCards = { ...this._tallyCards };
        for (const uid of deployedTallyIds) {
            const card = nextCards[uid];
            if (!card) continue;
            const applied = applyBattleExpToCard(card, outcome);
            if (applied.stars > readCardStarState(card).star) {
                this.recordPlayerLog('TALLY_UPGRADE');
                this._tallyNotices.push(tallyStarUpSpec(this._tallyNameOf(card), applied.stars, troopNameOf(card)));
            }
            nextCards[uid] = { ...card, ...applied };
            changed = true;
        }
        if (changed) {
            this._tallyCards = nextCards;
            this._syncInventoryRecords();
        }
        return changed;
    }

    /** 登記君主持有的虎符卡（新取得的卡）；已登記的 uid 不會被覆蓋 */
    public async registerTallyCards(cards: readonly TigerTallyCard[]): Promise<void> {
        const holders = { ...this._tallyHoldings.holders };
        const stored = { ...this._tallyCards };
        for (const card of cards) {
            if (card.uid.length === 0 || card.uid in holders) continue;
            holders[card.uid] = null;
            stored[card.uid] = card;
        }
        this._tallyHoldings = { holders };
        this._tallyCards = stored;
        this._syncInventoryRecords();
        await this._autoSaveAfterTallyChange();
    }

    /** 把君主持有的虎符裝到武將身上；武將不在名冊、虎符不存在、已被持有或武將已有虎符時回傳失敗 */
    public async equipTally(cardUid: string, generalId: string): Promise<TallyHoldingsResult | null> {
        if (!this._roster.getAll().some((g) => g.id === generalId)) return null;
        const card = this._tallyCards[cardUid];
        const result = equipTally(this._tallyHoldings, cardUid, generalId);
        const committed = await this._commitTallyResult(result);
        // 插卡演出（TRP-18）：紋樣 id 暫定用虎符 templateId；只有真的插上才發事件
        if (committed.ok && card) {
            services().event.emit(EVENT_NAMES.TallySpiritInserted, { cardUid, generalId, sigilPatternId: card.templateId });
        }
        return committed;
    }

    /**
     * 虎符精華突破（TRP-11 / PROG-2-1318）：3★→4★、4★→5★，成敗由外部傳入的 roll 決定。
     * 金幣與精華由呼叫端依回傳的 goldSpent、essenceSpent 扣款（失敗時扣一半材料，星級不變）。
     * 只要突破判定有效（ok:true）就存檔，包含失敗扣材料的情況，避免重新載入後材料回復；
     * 成功才寫回星級。卡不存在或條件不合時回傳 null 或 ok:false，不改動資料。
     */
    public async breakthroughTally(
        cardUid: string,
        roll: number,
        wallet: { gold: number; essence: number; guaranteeTokens: number },
    ): Promise<TallyBreakthroughResult | null> {
        const card = this._tallyCards[cardUid];
        if (!card) return null;
        const result = resolveTallyBreakthrough({
            quality: card.quality,
            star: readCardStarState(card).star,
            gold: wallet.gold,
            essence: wallet.essence,
            guaranteeTokens: wallet.guaranteeTokens,
            roll,
        });
        if (!result.ok) return result;
        if (result.success) this._tallyCards = { ...this._tallyCards, [cardUid]: { ...card, stars: result.star } };
        this._syncInventoryRecords();
        await this._autoSaveAfterTallyChange();
        return result;
    }

    /**
     * 君主沒收武將身上的虎符（TRP-08 / PROG-2-0239）：忠誠大幅下降，虎符退回君主並存檔。
     * 武將未持有虎符時回傳 null；武將不在名冊時也回傳 null。
     */
    public async confiscateTally(generalId: string, isGachaHero = false): Promise<{ cardUid: string; loyalty: number } | null> {
        if (!this._roster.getAll().some((g) => g.id === generalId)) return null;
        const cardUid = tallyOfGeneral(this._tallyHoldings, generalId);
        if (cardUid === null) return null;
        const quality = this._tallyCards[cardUid]?.quality ?? 'R';
        const current = this._tallyLoyalty[generalId] ?? createTallyLoyaltyState(TALLY_LOYALTY_INITIAL, isGachaHero);
        const next = applyTallyConfiscation(current);
        this._tallyLoyalty = { ...this._tallyLoyalty, [generalId]: next };
        if (next.loyalty < current.loyalty) this.recordPlayerLog('LOYALTY_DROP');
        this._tallyHoldings = confiscateFrom(this._tallyHoldings, generalId).state;
        this._syncInventoryRecords();
        await this._autoSaveAfterTallyChange();
        return { cardUid, loyalty: next.loyalty };
    }

    /** 把虎符從武將身上拔回君主 */
    public async unequipTally(cardUid: string): Promise<TallyHoldingsResult> {
        return this._commitTallyResult(unequipTally(this._tallyHoldings, cardUid));
    }

    /** 武將目前持有的虎符 uid（沒有則 null） */
    public tallyOf(generalId: string): string | null {
        return tallyOfGeneral(this._tallyHoldings, generalId);
    }

    private async _commitTallyResult(result: TallyHoldingsResult): Promise<TallyHoldingsResult> {
        if (result.ok) {
            this._tallyHoldings = result.state;
            this._syncInventoryRecords();
            await this._autoSaveAfterTallyChange();
        }
        return result;
    }

    private async _autoSaveAfterTallyChange(): Promise<void> {
        if (this._autoSave && this._save) await this.save();
    }

    /**
     * 陣亡事件的虎符結算（TRP-08 / PROG-2-0236）：只處理這次才變成陣亡的武將，
     * 手上的虎符退回君主，符合條件者產出一張陣亡虎符（君主持有）。只改記憶體狀態，由呼叫端的存檔一併寫入。
     */
    /** 超齡死亡（ageGeneralsOneSeason 的 died 事件）產生戰魂碎片；亡者在季前名冊內才找得到 */
    private _recordSoulFragmentsFor(before: readonly GeneralConfig[], events: readonly AgingEvent[]): void {
        for (const event of events) {
            if (event.type !== 'died') continue;
            const dead = before.find((g) => g.id === event.generalId);
            if (!dead) continue;
            const templateId = dead.templateId ?? dead.id;
            const totalTp = (dead as GeneralConfig & { totalTp?: number }).totalTp;
            this._soulFragments = recordDeathFragment(this._soulFragments, dead.id, { templateId, bloodlineId: dead.bloodlineId ?? '', totalTp }).ledger;
        }
    }

    /** 目前戰魂碎片帳本的副本（寄宿面板列候選用，PROG-2-1058） */
    public soulFragmentLedger(): SoulFragmentLedger {
        return { ...this._soulFragments };
    }

    /**
     * 把亡者的戰魂碎片寄宿到目標武將（同 Bloodline_ID、不同版本）。成功時目標的 totalTp 增加並消耗碎片，自動存檔。
     * 目標不在名冊、或碎片不存在時回傳原因；不合規時不改任何狀態。
     */
    public async injectSoulFragment(targetId: string, deadUid: string):
        Promise<{ ok: true; amount: number } | { ok: false; reason: 'TARGET_NOT_FOUND' | 'NO_FRAGMENT' | 'SAME_TEMPLATE' | 'BLOODLINE_MISMATCH' }> {
        const roster = this._roster.getAll();
        const index = roster.findIndex((g) => g.id === targetId);
        if (index < 0) return { ok: false, reason: 'TARGET_NOT_FOUND' };
        const target = roster[index];
        const current = (target as GeneralConfig & { totalTp?: number }).totalTp ?? 0;
        const result = injectFromLedger(this._soulFragments, deadUid, {
            templateId: target.templateId ?? target.id,
            bloodlineId: target.bloodlineId ?? '',
            tp: current,
        });
        if (!result.ok) return { ok: false, reason: (result as { ok: false; reason: 'NO_FRAGMENT' | 'SAME_TEMPLATE' | 'BLOODLINE_MISMATCH' }).reason };
        this._soulFragments = result.ledger;
        const next = [...roster];
        next[index] = { ...target, totalTp: result.target.tp } as GeneralConfig;
        this._roster.replaceAll(next);
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { ok: true, amount: result.amount };
    }

    private _settleDeaths(before: readonly GeneralConfig[], after: readonly GeneralConfig[], season: number): void {
        // 死亡產卡的兵種：武將資料沒有 troopType 時，由適性推出主兵種（PROG-2-0582）
        const withTroop = (general: GeneralConfig) => ({ troopType: mainTroopTypeOf(general.troopAptitude), ...general });
        const result = settleDeathTallies({ holdings: this._tallyHoldings, cards: this._tallyCards }, before.map(withTroop), after.map(withTroop), season);
        // 名將陣亡同步產英靈卡（SPI-02；同模板覆蓋不新增，非 TALLY 列不受下方同步影響）
        const spirit = settleDeathSpiritCards(this._inventoryRecords, before, after);
        // 虎符與英靈卡兩條線先都算完再一起寫入（PROG-2-1993：先退役後死亡的補發要嘛都發要嘛都不發）
        this._tallyHoldings = result.holdings;
        this._tallyCards = { ...result.cards };
        this._inventoryRecords = spirit.records;
        for (const uid of result.produced) {
            const card = this._tallyCards[uid];
            const source = after.find((g) => g.id === card?.sourceGeneralUid);
            if (card) this._tallyNotices.push(tallyProducedSpec(source?.name ?? card.sourceGeneralUid, this._tallyNameOf(card)));
        }
        // 英靈卡產出／覆蓋也進同一提示佇列，戰場結算與大廳換季時一起顯示（SPI-12 雙卡結算）
        const nameOfTemplate = (id: string) => after.find((g) => (g.templateId ?? g.id) === id)?.name ?? id;
        for (const id of spirit.produced) this._tallyNotices.push(spiritCardNoticeSpec(nameOfTemplate(id), false));
        for (const id of spirit.merged) this._tallyNotices.push(spiritCardNoticeSpec(nameOfTemplate(id), true));
        // 雙卡結算彈窗資料：兩條產出線各自獨立，只產其一時另一半為 null
        // fallen 傳全名冊即可：只有這次產出卡的武將會被列入
        this._dualCardSettlements.push(...buildDualCardSettlements({
            fallen: after,
            spiritTemplateIds: [...spirit.produced, ...spirit.merged],
            spiritRecords: this._inventoryRecords,
            producedTallies: result.produced.map((uid) => this._tallyCards[uid]).filter((card) => !!card),
        }));
        this._syncInventoryRecords();
    }

    /**
     * 虎符拔除 / 裝上對武將忠誠度的影響（TRP-09）。季編碼用 totalSeasonsElapsed（每季 +1）。
     * 只改忠誠狀態並自動存檔；虎符本身的歸屬由呼叫端決定。武將不在名冊時回傳 null。
     * 初始忠誠規格未定，暫定 50（記入待辦暫定設計）。
     */
    public async changeTallyLoyalty(
        generalId: string,
        action: TallyLoyaltyAction,
        quality: TigerTallyQuality,
        isGachaHero = false,
    ): Promise<TallyLoyaltyResult | null> {
        if (!this._roster.getAll().some((g) => g.id === generalId)) return null;
        const current = this._tallyLoyalty[generalId] ?? createTallyLoyaltyState(TALLY_LOYALTY_INITIAL, isGachaHero);
        const result = applyTallyLoyaltyChange(current, action, quality, this._clock.state.totalSeasonsElapsed);
        if (result.ok) {
            this._tallyLoyalty = { ...this._tallyLoyalty, [generalId]: result.state };
            if (result.state.loyalty < current.loyalty) this.recordPlayerLog('LOYALTY_DROP');
            if (this._autoSave && this._save) {
                await this.save();
            }
        }
        return result;
    }

    /** 目前存檔亂數的狀態種子（唯讀，不推進亂數）；天象異變以此確定性抽選 */
    public omenSeed(): number {
        return this._seeded.snapshot().state;
    }

    /** 出生紀錄以子嗣 UID 去重並複製；結緣確認流程會在此之後呼叫既有 save。 */
    public recordBreedingBirth(record: BreedingBirthRecord): void {
        this._breedingBirthRecords = normalizeBreedingBirthRecords([...this._breedingBirthRecords, record]);
        this._familySystemUnlockedFlag = true;
        this.recordPlayerLog('GENERAL_BORN');
        this._recordEventJournal('GENERAL_BORN', this._journalSubjects([record.session.Father_UID, record.session.Mother_UID]));
    }

    /** 世家系統是否已解鎖：第一位子嗣誕生後為真；讀取舊檔時有出生紀錄也視為已解鎖。 */
    public get familySystemUnlocked(): boolean {
        return this._familySystemUnlockedFlag || this._breedingBirthRecords.length > 0;
    }

    /** 本局已記下的結緣子嗣紀錄（回傳複本，外部改動不影響內部） */
    public breedingBirthRecords(): BreedingBirthRecord[] {
        return normalizeBreedingBirthRecords(this._breedingBirthRecords);
    }

    /** 解析全球征途階段（MVP-13）：指定階段已啟用就用它；未知或未啟用則回到第一個可玩階段 */
    public resolveCampaignStage(requestedId: string | undefined): CampaignStageDef {
        if (requestedId !== undefined && isCampaignStagePlayable(requestedId)) {
            return getCampaignStage(requestedId)!;
        }
        return enabledCampaignStages()[0];
    }

    /** 名士是否可用：累計占卜次數或劇情錨點（官階／遊戲年份）任一達成（PROG-2-1951） */
    public isSageUnlocked(sageId: string): boolean {
        return isSageAvailable(sageId, { divinationCount: this._oracleCount, officerTier: this._officerState.currentTier, year: this._clock.state.currentYear });
    }

    public itemCount(itemId: string): number {
        return itemCount(this._inventory, itemId);
    }

    /** 主城倉庫擴容次數（倉庫系統 §倉庫容量）；存成庫存標記道具，沿用既有庫存存檔 */
    public get warehouseExpansions(): number {
        return this.itemCount(WAREHOUSE_EXPANSION_ITEM);
    }

    /**
     * 主城倉庫已用格數：持有量 > 0 的道具種類數（不含擴容標記），加上統一物件庫中一般倉庫列的格數。
     * 已裝在武將身上的列（equippedBy）在武將背包，不計入倉庫（PROG-2-1360，BAG-10）。
     */
    public get warehouseUsedSlots(): number {
        const flat = Object.keys(this._inventory).filter((id) => id !== WAREHOUSE_EXPANSION_ITEM && itemCount(this._inventory, id) > 0).length;
        const stored = this._inventoryRecords.filter((record) => !record.equippedBy);
        return flat + countGeneralBagSlots(stored);
    }

    /** 入庫後把數量增加的部分寫進取得紀錄（ITM-05）；只記增加，不記扣除。 */
    private _recordGain(before: PlayerInventory, source: ItemSource): void {
        this._itemAcquisitionLog = appendAcquisitions(this._itemAcquisitionLog, diffAcquisitions(before, this._inventory, source));
    }

    /** 增加道具（商城購買、活動獎勵）並自動存檔；source 為取得來源（ITM-05），不給為 UNKNOWN */
    public async addItem(itemId: string, amount: number, source: ItemSource = 'UNKNOWN'): Promise<number> {
        const before = this._inventory;
        this._inventory = addItem(this._inventory, itemId, amount);
        this._recordGain(before, source);
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        return this.itemCount(itemId);
    }

    public get hasSaveService(): boolean {
        return this._save !== null;
    }

    public setRosterStore(store: RosterStore): void {
        this._roster = store;
    }

    public setEventEmitter(emitter: SessionEventEmitter | null): void {
        this._events = emitter;
    }

    public setLifecycle(lifecycle: SeasonLifecycle | null): void {
        this._lifecycle = lifecycle;
    }

    /**
     * 讀檔完成後要補做的事（例如把名冊裡的子嗣補回血統圖）：任何讀檔入口都會經過，呼叫端不必記得另外補。
     * 失敗只記警告，不讓讀檔失敗。
     */
    public setPostLoadHook(hook: (() => void | Promise<void>) | null): void {
        this._postLoadHook = hook;
    }

    public setSaveService(service: PlayerSaveService | null): void {
        this._save = service;
    }

    /** 測試替身：外部 callback 的內部狀態不納入存檔。 */
    public setRandomSource(random: RandomSource): void {
        this._random = random;
    }

    /** 測試替身：指定治理事件的擲骰來源 */
    public setGovernanceEventRandom(random: RandomSource | null): void {
        this._governanceEventRandom = random;
    }

    /** 測試替身：指定換季性格事件的擲骰來源 */
    public setSeasonEventRandom(random: RandomSource | null): void {
        this._seasonEventRandom = random;
    }

    /** 測試替身：指定三國季報合成的擲骰來源 */
    public setChronicleRandom(random: RandomSource | null): void {
        this._chronicleRandom = random;
    }

    public setAutoSave(enabled: boolean): void {
        this._autoSave = enabled;
    }

    public setNurtureStatePort(port: NurtureStatePort | null): void {
        this._nurture = port;
    }

    /** 開獎的宿命建議要靠因子字典分武 / 文；沒有字典時只看五維 */
    public get factorDictionary(): FactorDictionary | undefined {
        return this._factorDictionary;
    }

    /** 世交相性 K 的滑動窗（G3 §F-2，PROG-2-1812） */
    public get familySynergy(): FamilySynergyLedger {
        return this._familySynergy;
    }

    /** 待回覆的名門提親（G4 §E #4，PROG-2-1811） */
    public get marriageProposal(): MarriageProposal | null {
        return this._marriageProposal;
    }

    /** 回覆提親：應允時對象進名冊、聘禮走 grantGold；婉拒只清掉提親。成功時存檔（若有開啟） */
    public async respondMarriageProposal(accept: boolean, grantGold: (amount: number) => void): Promise<{ ok: boolean; general?: GeneralConfig }> {
        const proposal = this._marriageProposal;
        if (!proposal) return { ok: false };
        this._marriageProposal = null;
        const general = accept ? buildSuitorGeneral(proposal) : undefined;
        if (general) {
            this.enrollGenerals([general]);
            grantGold(proposal.giftGold);
        }
        if (this._autoSave && this._save) await this.save();
        return { ok: true, general };
    }

    public get clanTier(): ClanTier {
        return this._clanTier;
    }

    /** 家族揭露階段 M_stage；只升不降 */
    public get milestoneStage(): MilestoneStage {
        return this._milestoneStage;
    }

    /** 畫面揭露看這個；功能解鎖看 milestoneStage */
    public get displayStage(): MilestoneStage {
        return displayMilestoneStage(this._milestoneStage, this._expertView);
    }

    public get expertView(): boolean {
        return this._expertView;
    }

    public async setExpertView(enabled: boolean): Promise<void> {
        this._expertView = enabled;
        await this.save();
    }

    /** G3-M1：玩家選中有共祖的表親；已到 G3 以上時不再出句 */
    public noteKinPair(fatherName: string, motherName: string, ancestorName: string): void {
        this._raiseMilestone(kinMilestoneStage(), kinMilestoneLine(fatherName, motherName, ancestorName));
    }

    private _raiseMilestone(reached: MilestoneStage, kinLine = ''): void {
        if (reached <= this._milestoneStage) return;
        const oldStage = this._milestoneStage;
        this._milestoneStage = reached;
        const payload: MilestoneUpPayload = { oldStage, newStage: reached, lines: milestoneUnlockLines(oldStage, reached, kinLine) };
        this._emit(GAME_SESSION_EVENTS.MilestoneUp, payload);
    }

    public get clanHall(): string | null {
        return this._clanHall;
    }

    public get clanTradition(): ClanTradition | null {
        return this._clanTradition;
    }

    public setFactorDictionary(dictionary: FactorDictionary | undefined): void {
        this._baseFactorDictionary = dictionary;
        this._factorDictionary = mergeCustomFactors(dictionary, this._customFactors);
    }

    private _setCustomFactors(custom: FactorDefinition[]): void {
        this._customFactors = custom;
        this._factorDictionary = mergeCustomFactors(this._baseFactorDictionary, custom);
    }

        /** 開新局：時鐘與卡組歸零，名冊不動（由開場流程決定初始武將） */
    public startNewGame(seed: number = Math.floor(Math.random() * 4294967296)): void {
        this._seeded = new SeededRandom(seed);
        this._preLifespanRoster = null;
        this._clock = new GameClock();
        this._deck = [];
        this._leadGeneralId = null;
        this._sortieSupport = { strategistUid: null, deputyUid: null };
        this._sortiePresets = {};
        this._travel = null;
        this._countdown = null;
        this._discoveryLevel = 1;
        this._discoveryExp = 0;
        this._inventory = { ...STARTER_INVENTORY };
        this._oracleCount = 0;
        this._clearedStageIds = [];
        this._favoriteGeneralIds = [];
        this._hallAssignments = {};
        this.dynamicRelations.restore([]);
        this.relationEvents.restore([]);
        this._npcPlayerId = npcPlayerIdFromSeed(seed);
        this._npcMemory = createNpcMemory(this._npcPlayerId);
        this._tallyLoyalty = {};
        this._tallyHoldings = createTallyHoldings([]);
        this._tallyCards = {};
        this._inventoryRecords = [];
        this._femaleSources = {};
        this._gachaPity = {};
        this._femaleSystem = normalizeFemaleSystemState(undefined);
        this._hallSpotState = EMPTY_HALL_SPOT_STATE;
        this._gachaWallet = null;
        this._gachaRevision += 1;
        this._legacyCount = 0;
        this._legendaryMentoringUsedIds = [];
        this._breedingBirthRecords = [];
        this._familySystemUnlockedFlag = false;
        this._openingPhase = null;
        this._openingOffers = { ...FRESH_OPENING_OFFER_STATE };
        this._enrollGrantDay = null;
        this._itemAcquisitionLog = [];
        this._aiAdaptiveStreak = { ...EMPTY_AI_ADAPTIVE_STREAK };
        this._clanPrestige = 0;
        this._infusionRecords = [];
        this._salaryLedger = createSalaryLedger();
        this._extremeTask = createExtremeTaskState();
        this._pendingSceneGambit = null;
        this._shrineOfferingDay = null;
        this._seasonPass = createSeasonPassState();
        this._sevenDayJourney = createSevenDayJourneyState();
        this._officerState = initialOfficerState();
        this._officerTrial = null;
        this._paidFeatureQuota = EMPTY_PAID_FEATURE_QUOTA;
        this._sandtableMarkerTerritories = [];
        this._sandtableUnlockHistory = [];
        this._startingTalisman = null;
        this._governance = [];
        this._autoGovernance = false;
        this._magistrateUid = null;
        this._territoryLevel = 1;
        this._pendingTerritoryLevel = null;
        this._territories = defaultKeepTerritories();
        this._journal = createEmptyJournal();
        this._farewellLetters = [];
        this._loginStreak = { ...EMPTY_LOGIN_STREAK };
        this._dailySubsidy = null;
        this._monthlyCard = null;
        this._playerLogs = [];
        this._dailyNews = { ...EMPTY_DAILY_NEWS, news: [] };
        this._morningReport = { ...EMPTY_MORNING_REPORT, items: [] };
        this._dispatch = normalizeDispatchState(EMPTY_DISPATCH_STATE);
        this._offlineBattleSnapshots = [];
        this._offlineInteractionLog = [];
        this._tournament = null;
        this._wishPool = null;
        this._gachaMentorJournal = [];
        this._hallAssignLog = [];
        // 上一局的進度不能帶進新局（PROG-2-0660）
        this._soulFragments = emptySoulFragmentLedger();
        this._clanTier = 0;
        this._milestoneStage = 1;
        this._expertView = false;
        this._marriageProposal = null;
        this._familySynergy = emptyFamilySynergyLedger();
        this._pedigreeProbes = [];
        this._hiddenLineageProbes = [];
        this._statProbes = [];
        this._clanTradition = null;
        this._clanHall = null;
        this._setCustomFactors([]);
        this._pendingLifespanEvents = [];
        this._bondPoints = 0;
        this._borrowLedger = { records: [] };
        this._onboarding = { ...FRESH_ONBOARDING };
        this._openingLetter = { ...FRESH_OPENING_LETTER };
        this._military = { ...STARTER_MILITARY };
        this._yearAgingEvents = [];
        this._prison = createPrisonState<GeneralConfig>();
        this._fame = 0;
        this._scorePoints = 0;
        this._autoNurtureTickets = 0;
        this._mainlineNurtureClearedOnce = false;
        this._firstBattleCleared = false;
        this._openingRedFaceShown = false;
        this._domesticLog = { ...EMPTY_DOMESTIC_LOG };
        this._governanceEvent = null;
        this._governanceBoosts = [];
        this._seasonPersonality = { ...EMPTY_SEASON_PERSONALITY_STATE, pending: [] };
        this._seasonChronicle = copySeasonChronicle(EMPTY_SEASON_CHRONICLE);
        this._loginStartedNewDay = false;
        this._rivals = this._withRivalOfficers(createRivalWorld());
        this._mercenaries = createEmptyMercenaryBundle();
    }

    /** 開場流程選用：先驗證資料，再開新局並以六位名將替換名冊；既有 startNewGame 不變。 */
    public async startNewGameWithStarters(seed: number, generals: readonly GeneralConfig[], options: StarterRosterOptions = {}): Promise<void> {
        const starters = buildStarterRoster(generals, options);
        const coreId = options.coreGeneralId ?? STARTER_CORE_GENERAL_ID;
        const core = starters.find(general => general.id === coreId)!;
        if (!checkDeployable(core, { nurturingIds: this._nurturingIds() }).eligible) throw new Error('[GameSession] 初始核心主將不可出戰');
        this.startNewGame(seed);
        this._roster.replaceAll(normalizeRosterRoles(starters));
        if (!await this.setLeadGeneral(coreId)) throw new Error('[GameSession] 無法設定初始核心主將');
        this._emit(GAME_SESSION_EVENTS.RosterChanged, this.roster);
    }

    /** 玩家累積情報（PROG-2-1759）：目前來源為監獄產出，大廳軍事任務以此判定 Required_Intel */
    public get intel(): number {
        return this._prison.intel;
    }

    /** 俘虜與監獄（PROG-2-0073）：待處置俘虜、關押中、名聲、情報 */
    public get prison(): PrisonState<GeneralConfig> {
        return {
            ...this._prison,
            pending: this._prison.pending.map((p) => ({ record: { ...p.record }, target: { ...p.target }, ...(p.tallyId ? { tallyId: p.tallyId } : {}) })),
            prisoners: this._prison.prisoners.map((p) => ({ ...p })),
        };
    }

    /**
     * 戰勝後俘虜敗將：產生 POW_Record 放進待處置清單並存檔。
     * 試用傭兵豁免、已在名冊 / 已被俘 / 已關押的武將不重複俘虜，回傳 null。
     * 勸降率以出戰主將（沒有時用名冊第一位可出戰武將）的魅力與運氣計算。
     */
    public async capturePrisoner(target: GeneralConfig, tallyId?: string): Promise<PowRecord | null> {
        const taken = new Set([
            ...this._roster.getAll().map((g) => g.id),
            ...this._prison.pending.map((p) => p.record.targetUid),
            ...this._prison.prisoners.map((p) => p.targetUid),
        ]);
        if (taken.has(target.id)) return null;
        const persuaderId = this._leadGeneralId ?? this.getDeployableGenerals()[0]?.id ?? null;
        const persuader = persuaderId ? this._roster.getAll().find((g) => g.id === persuaderId) : undefined;
        const record = createPowRecord(
            { ...target, cha: target.cha ?? target.stats?.cha, luk: target.luk ?? target.stats?.luk, int: target.int ?? target.stats?.int, pol: target.pol ?? target.stats?.pol } as Parameters<typeof createPowRecord>[0],
            { cha: persuader?.cha ?? persuader?.stats?.cha ?? 0, luk: persuader?.luk ?? persuader?.stats?.luk ?? 0 },
        );
        if (!record) return null;
        this._prison = { ...this._prison, pending: [...this._prison.pending, { record, target: { ...target }, ...(tallyId ? { tallyId } : {}) }] };
        if (this._autoSave && this._save) {
            await this.save();
        }
        return record;
    }

    /**
     * 處置待處置俘虜（勸降 / 招募 / 無期徒刑 / 放走）。
     * 加入麾下 → 寫進名冊；招募扣城市兵源（黃金由呼叫端依 goldSpent 從錢包扣）；關押進監獄；放走加名聲。
     * 勸降失敗俘虜仍留在待處置清單（不能再勸降，可改關押或放走）；資源不足時什麼都不扣。
     */
    /**
     * 對待處置的女俘虜送禮（PROG-2-1789）：好感與勸降成功率都寫回；非女俘虜或勸降已失敗回傳 null。
     * 黃金由呼叫端從錢包扣（與 resolvePrisoner 相同）。
     */
    public async giftPrisoner(targetUid: string, gold: number): Promise<PrisonerGiftResult | null> {
        const pending = this._prison.pending.find((p) => p.record.targetUid === targetUid);
        if (!pending || pending.target.gender !== '女' || pending.record.decision !== null) return null;
        const affection = this.femaleSystemState.giftAffection[targetUid] ?? 0;
        const result = resolvePrisonerGift(pending.record.options.persuadeRate, affection, gold);
        if (!result.ok) return result;
        this.giftFemale(targetUid, result.affectionGained);
        const record = { ...pending.record, options: { ...pending.record.options, persuadeRate: result.persuadeRate } };
        this._prison = {
            ...this._prison,
            pending: this._prison.pending.map((p) => (p === pending ? { ...p, record } : p)),
        };
        if (this._autoSave && this._save) {
            await this.save();
        }
        return result;
    }

    public async resolvePrisoner(targetUid: string, decision: PowDecision, options: { gold?: number } = {}): Promise<(PowResolution & { epiphany?: ReleaseEpiphanyTacticResult }) | null> {
        const pending = this._prison.pending.find((p) => p.record.targetUid === targetUid);
        if (!pending) return null;
        const resolution = resolvePowDecision(pending.record, decision, {
            random: this._random,
            gold: options.gold ?? 0,
            cityTroops: this._military.cityTroops,
            prisonUsed: this._prison.prisoners.length,
            prisonSlots: prisonCapacityOf(this._territoryLevel),
        });
        const others = this._prison.pending.filter((p) => p !== pending);
        const done = resolution.joined || resolution.imprisoned || resolution.released;
        this._prison = {
            ...this._prison,
            pending: done ? others : this._prison.pending.map((p) => (p === pending ? { ...p, record: resolution.record } : p)),
            prisoners: resolution.imprisoned
                ? [...this._prison.prisoners, {
                    targetUid,
                    targetName: pending.record.targetName,
                    imprisonedSeason: this._clock.state.totalSeasonsElapsed,
                    yieldPerSeason: { ...pending.record.options.prisonYield },
                }]
                : this._prison.prisoners,
            fame: this._prison.fame + resolution.fameGained,
            released: resolution.released
                ? [...this._prison.released, {
                    targetUid,
                    targetName: pending.record.targetName,
                    releasedSeason: this._clock.state.totalSeasonsElapsed,
                }]
                : this._prison.released,
        };
        if (resolution.cityTroopsSpent > 0) {
            this._military = { ...this._military, cityTroops: Math.max(0, this._military.cityTroops - resolution.cityTroopsSpent) };
        }
        // 虎符轉移（POW-08 暫定）：勸降／招募成功 → 轉給俘虜；放走 → 虎符跟著他離開。沒有 tallyId 不動。
        // 已被我方武將持有的虎符兩者都不動（PROG-2-1336）
        const tallyHeldByGeneral = pending.tallyId !== undefined && this._tallyHoldings.holders[pending.tallyId] != null;
        if (pending.tallyId && !tallyHeldByGeneral && (resolution.joined || resolution.released)) {
            const moved = resolution.joined
                ? transferTally(this._tallyHoldings, pending.tallyId, targetUid)
                : takeTallyAway(this._tallyHoldings, pending.tallyId);
            if (moved.ok) {
                this._tallyHoldings = moved.state;
                if (resolution.released) {
                    const { [pending.tallyId]: _gone, ...rest } = this._tallyCards;
                    this._tallyCards = rest;
                }
                this._syncInventoryRecords();
            }
        }
        if (resolution.joined) {
            // 女俘虜歸入名冊時記下 CAPTIVE 來源（FEM-05 / FEM-01）
            const captiveSource = captiveFemaleSourceOf({ ...pending.target }, this._clock.state.totalSeasonsElapsed);
            if (captiveSource) {
                const giftAffinity = this.femaleSystemState.giftAffection[pending.target.id] ?? 0;
                this._femaleSources = { ...this._femaleSources, [pending.target.id]: { ...createFemaleSource('CAPTIVE', captiveSource.Quality_Grade, captiveSource.Acquired_Season), Gift_Affinity: giftAffinity } };
            }
            // addGenerals 廣播 RosterChanged；監獄狀態另外存檔
            await this.addGenerals([{ ...pending.target }]);
        }
        // 放走敵將頓悟（LVL-13，PROG-2-1996）：軍資 = 呼叫端傳入的黃金；實際花費併入 goldSpent 讓呼叫端照扣
        const epiphany = resolution.released ? this._applyReleaseEpiphany(options.gold ?? 0) : null;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return epiphany ? { ...resolution, goldSpent: resolution.goldSpent + epiphany.suppliesSpent, epiphany } : resolution;
    }

    /**
     * 放走敵將的頓悟（LVL-13）：我方存活的非教官卡武將 >= 10 人且軍資足夠時，隨機一名武將習得教官專屬戰法，
     * 專屬戰法都學會了才改為既有戰法 Level +1。沒觸發回傳 null，不動任何資料。
     */
    private _applyReleaseEpiphany(supplies: number): ReleaseEpiphanyTacticResult | null {
        const all = this._roster.getAll();
        const isMentor = (g: GeneralConfig): boolean => (g as GeneralConfig & { isMentorCard?: boolean }).isMentorCard === true;
        const living = all.filter((g) => !isGeneralDead(g) && !isMentor(g));
        const mentorExclusive = Array.from(new Set(all.filter(isMentor).flatMap((g) => g.learnedTactics ?? [])));
        const result = resolveReleaseEpiphanyWithTactic({
            candidates: living.map((g) => ({ id: g.id, learned: g.learnedTactics ?? [], exp: g.tacticExp ?? {} })),
            mentorExclusive,
            supplies,
            rng: this._random,
        });
        if (!result.triggered || !result.gain || !result.winnerId) return null;
        const gain = result.gain;
        this._roster.replaceAll(all.map((g) => {
            if (g.id !== result.winnerId) return g;
            return gain.kind === 'learn'
                ? { ...g, learnedTactics: [...(g.learnedTactics ?? []), gain.tacticId] }
                : { ...g, tacticExp: { ...(g.tacticExp ?? {}), [gain.tacticId]: gain.expAfter } };
        }));
        return result;
    }

    /** 注入武將配置（generals.json），供俘虜來投時依 uid 重建武將 */
    public setGeneralTemplates(generals: readonly GeneralConfig[]): void {
        this._generalTemplates = generals;
    }

    /** 城市兵源與糧草儲備（PROG-2-0072） */
    public get fame(): number {
        return this._fame;
    }

    /** 他國 AI 勢力（邦交、兵力、領地）；外交畫面讀這份（PROG-2-1088） */
    public get rivals(): RivalWorld {
        return this._rivals;
    }

    /**
     * 設定他國逐將名冊與重算情境（E-9，PROG-2-1714）：尚未有名冊的勢力立即掛上，
     * 之後每季推進會逐將重算軍力。讀檔與新遊戲也會補掛。
     */
    public setRivalOfficerContext(
        rosters: Readonly<Record<string, RivalNationRoster>>,
        context: RivalPowerContext,
        rulerIds: Readonly<Record<string, string>> = {},
    ): void {
        this._rivalOfficers = { rosters, context };
        this._rivalRulerIds = rulerIds;
        this._rivals = this._withRivalOfficers(this._rivals);
    }

    private _withRivalOfficers(world: RivalWorld): RivalWorld {
        return this._rivalOfficers ? attachRivalOfficers(world, this._rivalOfficers.rosters, this._rivalOfficers.context) : world;
    }

    /** 外交指令或出征結算後寫回勢力狀態並存檔 */
    public async setRivals(world: RivalWorld): Promise<void> {
        this._rivals = normalizeRivalWorld(world);
        if (this._save) {
            await this.save();
        }
    }

    /** 通商節鉞刷新令的價格預覽（OFC-12）：每日免費 1 次，超額 60 玉璧 */
    public previewRivalTradeRefresh(gems: number, epochMs: number = Date.now()): QuotaPreview {
        return previewPaidFeatureUse(this._paidFeatureQuota, QUOTA_FEATURE_OFC_REFRESH, epochMs, gems);
    }

    /** 使用通商節鉞刷新令（OFC-12）：先確認這次刷新有效才計費，失敗不扣額度也不扣玉璧 */
    public async refreshRivalTrade(nationId: string, wallet: { gems: number; spend: (n: number) => void }, epochMs: number = Date.now()): Promise<TradeResult> {
        const result = refreshRivalTradePure(this._rivals, nationId, this._clock.state.totalSeasonsElapsed);
        if (!result.ok) return result;
        const quota = consumePaidFeatureUse(this._paidFeatureQuota, QUOTA_FEATURE_OFC_REFRESH, epochMs, wallet.gems);
        if (!quota.ok) return { ok: false, world: this._rivals, message: '玉璧不足，無法刷新通商' };
        if (quota.gemsSpent > 0) wallet.spend(quota.gemsSpent);
        this._paidFeatureQuota = quota.state;
        this._rivals = result.world;
        if (this._autoSave && this._save) await this.save();
        return result;
    }

    /** 附外交拜帖錦囊送禮（OFC-12）：沒有道具或本季次數用完時不扣金幣也不扣道具 */
    public async sendRivalGiftWithLetter(nationId: string, wallet: { gold: number; spend: (n: number) => void }): Promise<{ ok: boolean; message: string }> {
        const inventory = consumeItem(this._inventory, ITEM_DIPLOMACY_LETTER);
        if (!inventory) return { ok: false, message: '沒有外交拜帖錦囊' };
        const result = sendGiftWithLetter(this._rivals, nationId, wallet.gold, this._clock.state.totalSeasonsElapsed);
        if (!result.ok) return { ok: false, message: result.message };
        wallet.spend(result.goldSpent);
        this._inventory = inventory;
        this._rivals = result.world;
        if (this._autoSave && this._save) await this.save();
        return { ok: true, message: result.message };
    }

    /**
     * 與他國交易（治理模式 E-6，PROG-2-1358）：付出資源先扣，收到資源入帳；黃金走錢包（gold 為餘額、spend／grant 為扣入）。
     * 收到後超過倉庫上限則拒絕、不變動任何資源。成功時寫回交易計數並存檔（若有開啟）。
     */
    public async tradeWithRival(nationId: string, routeId: string, amount: number, wallet: { gold: number; spend: (n: number) => void; grant: (n: number) => void }): Promise<TradeResult> {
        const stock = { food: this._military.food, gold: wallet.gold, troops: this._military.cityTroops, fame: this._fame };
        const result = tradeWithRivalPure(this._rivals, nationId, routeId, amount, stock, this._clock.state.totalSeasonsElapsed);
        if (!result.ok || !result.give || !result.get) return result;
        const caps = { food: this._military.foodCap, gold: Infinity, troops: this._military.cityTroopsCap, fame: BASE_RESOURCE_CAPS.fame };
        const after = { ...stock, [result.give.resource]: stock[result.give.resource] - result.give.amount };
        after[result.get.resource] += result.get.amount;
        if (after[result.get.resource] > caps[result.get.resource]) {
            return { ok: false, world: this._rivals, message: `${TRADE_RESOURCE_NAMES[result.get.resource]}倉庫已滿，無法收下` };
        }
        this._military = { ...this._military, food: after.food, cityTroops: after.troops };
        this._fame = after.fame;
        if (result.give.resource === 'gold') wallet.spend(result.give.amount);
        if (result.get.resource === 'gold') wallet.grant(result.get.amount);
        this._rivals = result.world;
        if (this._autoSave && this._save) await this.save();
        return result;
    }

    /** 回覆他國提議（§G-1，PROG-2-1770）：同意商隊時扣糧草、黃金走 grantGold；成功時存檔（若有開啟） */
    public async respondRivalProposal(nationId: string, accept: boolean, grantGold: (amount: number) => void): Promise<ProposalResponse> {
        const result = respondToRivalProposal(this._rivals, nationId, accept, this._military.food, this._clock.state.totalSeasonsElapsed);
        if (!result.ok) return result;
        this._rivals = result.world;
        this._military = { ...this._military, food: this._military.food - result.foodSpent };
        if (result.goldGained > 0) grantGold(result.goldGained);
        if (this._autoSave && this._save) await this.save();
        return result;
    }

    /** 名冊中戰力最高的 3 位在世武將：出征與迎戰的預設陣容 */
    public rivalBattleSquad(): BattleGeneral[] {
        return this._roster.getAll()
            .filter((g) => g.status !== 'dead')
            .map((g) => ({ name: g.name, str: g.str ?? 0, int: g.int ?? 0, lea: g.lea ?? 0 }))
            .sort((a, b) => generalPower(b) - generalPower(a))
            .slice(0, 3);
    }

    /** 季度推進：勢力成長、邦交回歸；來犯的勢力用名冊前 3 強自動迎戰 */
    private _rivalNotices: string[] = [];

    /** 取走尚未顯示的他國事件句（背叛、掠奪、滅亡，PROG-2-1769）；大廳換季時顯示一次 */
    public consumeRivalNotices(): string[] {
        const notices = this._rivalNotices;
        this._rivalNotices = [];
        return notices;
    }

    /** 玩家永久擁有的武將 id：名冊（含模板 id）與已結義傭兵；試用傭兵可能離隊，不算（PROG-2-1849） */
    private _permanentlyOwnedGeneralIds(): Set<string> {
        const owned = new Set<string>();
        for (const general of this._roster.getAll()) {
            owned.add(general.id);
            if (general.templateId) owned.add(general.templateId);
        }
        for (const merc of this._mercenaries.mercenaries) {
            if (merc.status === 'Bonded' && merc.generalId) owned.add(merc.generalId);
        }
        return owned;
    }

    private _tickRivals(): AutoBattleResult[] {
        this._rivals = dropOwnedRivalOfficers(this._rivals, this._permanentlyOwnedGeneralIds());
        // 玩家金幣不在 GameSession 內（錢包由呼叫端持有），RAI-05 暫傳 0（暫定）
        const holdersOf = (w: typeof this._rivals) => [...w.nations.map((n) => ({ id: n.id, territories: n.territories })), { id: 'player', territories: this._territories.length }];
        const beforeHolders = holdersOf(this._rivals);
        const tick = advanceRivalSeason(this._rivals, this._random, { troops: this._military.cityTroops, food: this._military.food, gold: 0, territories: this._territories.length }, this._rivalOfficers?.context);
        let world = tick.world;
        const battles: AutoBattleResult[] = [];
        for (const event of tick.events) {
            const squad = this.rivalBattleSquad();
            const battle = autoResolveBattle(world, event.nationId, squad, this._random);
            world = battle.world;
            battles.push(battle);
            this._recordOfflineBattle(squad, event.nationId, battle, battles.length);
        }
        if (tick.events.length > 0) {
            const payload: RivalSeasonEventsPayload = {
                events: tick.events.map((event, i) => ({ nationId: event.nationId, kind: event.kind, playerWon: battles[i].win })),
            };
            this._emit(GAME_SESSION_EVENTS.RivalSeasonEvents, payload);
        }
        // RAI-12：年度天下大亂評估；玩家領土數取守城領地清單長度
        this._rivals = applyEraShift(world, this._clock.state.totalSeasonsElapsed, this._territories.length);
        const events = resolveRivalPlayerEvents(this._rivals, this._clock.state.totalSeasonsElapsed, { troops: this._military.cityTroops, food: this._military.food }, this._random);
        this._rivals = events.world;
        this._military = { ...this._military, food: this._military.food - events.foodLost, cityTroops: this._military.cityTroops - events.troopsLost };
        this._rivalNotices.push(...events.notices);
        const risen = newAiHegemonOf(beforeHolders, holdersOf(this._rivals), 'player');
        if (risen) this._emit(GAME_SESSION_EVENTS.RivalHegemonRose, { nationId: risen });
        return battles;
    }

    private _offlineBattleSnapshots: OfflineBattleSnapshot[] = [];
    /** 離線互動紀錄 key（PROG-2-1193） */
    private _offlineInteractionLog: string[] = [];
    private _tournament: TournamentState | null = null;

    /** 名將挑戰賽：首次存取時開季，過季自動結算 rollover（PROG-2-1190，doc_spec_0007 §F） */
    private _tournamentAt(nowMs: number): TournamentState {
        this._tournament = rolloverTournament(this._tournament ?? createTournamentState(nowMs), nowMs);
        return this._tournament;
    }

    /** 月度場景賽歷史（PROG-2-1754）：同月只留最高分，不計入主賽積分 */
    public get monthlyScenarioHistory(): MonthlyScenarioHistoryEntry[] {
        return (this._tournament?.monthlyHistory ?? []).map((h) => ({ ...h }));
    }

    /** 打一場當月場景賽：名冊存活武將排除不合格者後取前 3；成功才寫回歷史 */
    public playMonthlyScenario(nowMs: number): MonthlyScenarioPlayResult {
        const state = this._tournamentAt(nowMs);
        const generals = this._roster.getAll().filter((g) => g.status !== 'dead');
        const result = playMonthlyScenario(state.monthlyHistory ?? [], generals, nowMs);
        if (result.ok) this._tournament = { ...state, monthlyHistory: result.history };
        return result;
    }

    /** 出戰陣容：名冊存活武將戰力前 3（與敵襲迎戰同一套戰力） */
    private _tournamentEntrants(): TournamentEntrant[] {
        return this._roster.getAll()
            .filter((g) => g.status !== 'dead')
            .map((g) => ({ id: g.id, power: generalPower({ name: g.name, str: g.str ?? 0, int: g.int ?? 0, lea: g.lea ?? 0 }) }))
            .sort((a, b) => b.power - a.power)
            .slice(0, 3);
    }

    public tournamentStatus(nowMs: number): TournamentStatus {
        return tournamentStatus(this._tournamentAt(nowMs), nowMs);
    }

    public get tournamentHistory(): TournamentSeasonHistory[] {
        return (this._tournament?.history ?? []).map((h) => ({ ...h }));
    }

    /** 待領賽季獎勵（PROG-2-1194） */
    public pendingTournamentRewards(nowMs: number): TournamentSeasonReward[] {
        return pendingTournamentRewards(this._tournamentAt(nowMs));
    }

    /** 領取賽季獎勵：每季金錢交給 grant 入帳；不自動存檔 */
    public claimTournamentRewards(nowMs: number, grant: (gold: number) => void): TournamentSeasonReward[] {
        const claimed = claimTournamentRewards(this._tournamentAt(nowMs));
        if (claimed.rewards.length === 0) return [];
        this._tournament = claimed.state;
        for (const reward of claimed.rewards) grant(reward.gold);
        return claimed.rewards;
    }

    /** 報名／重登錄：凍結目前陣容為鏡像快照（培育期每日 1 次、競賽期整季可替換 1 次）；不自動存檔 */
    public registerTournament(nowMs: number): { ok: boolean; reason?: TournamentRegisterReason } {
        const result = registerTournamentTeam(this._tournamentAt(nowMs), this._tournamentEntrants(), nowMs);
        if ('reason' in result) return { ok: false, reason: result.reason };
        this._tournament = result.state;
        return { ok: true };
    }

    /** 參戰一次（五戰三勝）；免費次數用完時由 payExtra 決定是否付費；不自動存檔 */
    public playTournament(nowMs: number, payExtra?: (cost: number) => boolean): { ok: boolean; reason?: TournamentEntryReason; result?: TournamentSeriesResult } {
        const played = playTournamentSeries(this._tournamentAt(nowMs), this._tournamentEntrants(), nowMs, this._random, payExtra);
        if ('reason' in played) return { ok: false, reason: played.reason };
        this._tournament = played.state;
        return { ok: true, result: played.result };
    }

    /** 許願池（PROG-2-1198）；從未許願為 null */
    private _wishPool: WishPoolState | null = null;

    /** 許願池狀態（深拷貝） */
    public get wishPool(): WishPoolState {
        return JSON.parse(JSON.stringify(this._wishPool ?? createWishPoolState())) as WishPoolState;
    }

    /** 許願：本巡與同時進行上限內才成立；不自動存檔 */
    public startWish(itemId: string, nowMs: number): { ok: boolean; reason?: WishStartReason; wish?: ActiveWish } {
        const result = startWish(this._wishPool ?? createWishPoolState(), itemId, nowMs);
        if ('reason' in result) return { ok: false, reason: result.reason };
        this._wishPool = result.state;
        return { ok: true, wish: { ...result.wish } };
    }

    /** 使用加速卡（背包扣卡，只扣實際需要的張數）；回傳用掉幾張；不自動存檔 */
    public speedUpWish(wishId: string, cards: number, nowMs: number): number {
        if (!this._wishPool) return 0;
        const used = Math.min(speedCardsNeeded(this._wishPool, wishId, cards, nowMs), itemCount(this._inventory, ITEM_WISH_SPEED_CARD));
        const inventory = used > 0 ? consumeItem(this._inventory, ITEM_WISH_SPEED_CARD, used) : null;
        if (!inventory) return 0;
        this._inventory = inventory;
        this._wishPool = applySpeedCards(this._wishPool, wishId, used);
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        return used;
    }

    /** 領取所有已實現的許願並入背包；不自動存檔 */
    public claimWishes(nowMs: number): ActiveWish[] {
        if (!this._wishPool) return [];
        const result = claimReadyWishes(this._wishPool, nowMs);
        if (result.claimed.length === 0) return [];
        this._wishPool = result.state;
        const beforeWish = this._inventory;
        for (const wish of result.claimed) this._inventory = addItem(this._inventory, wish.itemId, wish.amount);
        this._recordGain(beforeWish, 'EVENT');
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        return result.claimed.map((w) => ({ ...w }));
    }

    /** 離線戰鬥快照（複本，JRN-05） */
    public get offlineBattleSnapshots(): OfflineBattleSnapshot[] {
        return this._offlineBattleSnapshots.map((s) => ({ ...s }));
    }

    /** 敵襲自動迎戰：留 AUTO_RESOLVE 快照並寫 BATTLE 日誌，日誌以 snapshotRef 指向快照（§F-4，PROG-2-1184） */
    private _recordOfflineBattle(squad: readonly unknown[], nationId: string, battle: AutoBattleResult, order: number): void {
        const clock = this._clock.state;
        this.recordAutoResolveBattle({
            battleType: 'AUTO_RESOLVE',
            seed: `${clock.currentYear}-${clock.currentSeason}-${order}`,
            lineup: squad,
            tileState: { nationId },
            tactics: [],
            win: battle.win,
            playerStrength: battle.playerStrength,
            enemyStrength: battle.enemyStrength,
        }, offlineRaidJournal(battle.win, (squad[0] as { name?: string } | undefined)?.name), []);
    }

    /** 外交出征結算：留 AUTO_RESOLVE 快照並寫 BATTLE 日誌（§F-4，PROG-2-1189）；不自動存檔，由出征後的 setRivals 帶走 */
    public recordRivalCampaign(squad: readonly unknown[], nationId: string, battle: AutoBattleResult): OfflineBattleSnapshot {
        const clock = this._clock.state;
        const rule = battle.win ? CAMPAIGN_BATTLE_JOURNAL.win : CAMPAIGN_BATTLE_JOURNAL.lose;
        return this.recordAutoResolveBattle({
            battleType: 'AUTO_RESOLVE',
            seed: `${clock.currentYear}-${clock.currentSeason}-C${nationId}`,
            lineup: squad,
            tileState: { nationId },
            tactics: [],
            win: battle.win,
            playerStrength: battle.playerStrength,
            enemyStrength: battle.enemyStrength,
        }, { priority: rule.priority, summary: rule.summary.replace('{Nation}', nationDef(nationId)?.name ?? nationId) }, []);
    }

    /**
     * 自動解決的戰果：快照接到同一條鏈尾，再寫一筆 BATTLE 日誌以 snapshotRef 指向快照（§F-4）。
     * 季度敵襲與戰場「自動」鈕（PROG-2-1185）共用；不自動存檔，由呼叫端的既有存檔帶走。
     */
    public recordAutoResolveBattle(input: Readonly<OfflineBattleInput>, journal: Readonly<OfflineBattleJournal>, relatedGeneralUids: readonly string[]): OfflineBattleSnapshot {
        const id = nextOfflineBattleSnapshotId(this._offlineBattleSnapshots);
        const appended = appendOfflineBattleSnapshot(this._offlineBattleSnapshots, id, input);
        this._offlineBattleSnapshots = appended.snapshots;
        this.recordJournal({
            entryId: `OFFLINE_BATTLE-${this._journal.entries.length + 1}`,
            timestamp: seasonJournalTimestamp(this._clock.state),
            category: 'BATTLE',
            relatedGeneralUids: Array.from(relatedGeneralUids),
            priority: journal.priority,
            summary: journal.summary,
            ...(journal.summaryKey !== undefined ? { summaryKey: journal.summaryKey } : {}),
            ...(journal.summaryArgs !== undefined ? { summaryArgs: [...journal.summaryArgs] } : {}),
            snapshotRef: appended.snapshot.snapshotId,
        });
        return { ...appended.snapshot };
    }

    public get domesticLog(): Readonly<DomesticSeasonLog> {
        return { ...this._domesticLog };
    }

    /** 本季生效中的治理事件；過季的事件不算 */
    public get activeGovernanceEvent(): ActiveGovernanceEvent | null {
        const event = this._governanceEvent;
        const season = this._clock.state.totalSeasonsElapsed;
        // 批准預修水利的那一季免受天災（PROG-2-2201）
        if (this._seasonPersonality.season === season && this._seasonPersonality.disasterImmune) return null;
        return event && event.season === season ? event : null;
    }

    /** 內政任務本季的產出倍率（治理事件 × 治理效率道具） */
    public domesticOutputMultiplier(taskId: string): number {
        const season = this._clock.state.totalSeasonsElapsed;
        const event = this.activeGovernanceEvent;
        return governanceOutputMultiplier(event, taskId, season)
            * governanceBoostMultiplier(this._governanceBoosts, taskId, season)
            * seasonEventFarmMultiplier(this._seasonPersonality, taskId, season);
    }

    /** 本季還沒回應的第一起武將性格事件；沒有時為 null（PROG-2-2201） */
    public get pendingSeasonEvent(): SeasonEventInstance | null {
        const state = this._seasonPersonality;
        return state.season === this._clock.state.totalSeasonsElapsed && state.pending.length > 0 ? { ...state.pending[0] } : null;
    }

    /**
     * 回應本季第一起性格事件（0 = 第一個選項，1 = 第二個）。付不起時拒絕且不變動任何資源。
     * 銅錢走傳入的錢包（LocalGachaService），糧草、名聲、忠誠、武力在 session 內結算；成功時自動存檔。
     */
    public async resolveSeasonEvent(
        optionIndex: 0 | 1, wallet: { gold: () => number; spendGold: (amount: number) => boolean },
    ): Promise<{ ok: true; line: string } | { ok: false; reason: 'none' | 'shortfall'; resource?: string }> {
        const instance = this.pendingSeasonEvent;
        const def = instance ? seasonEventDef(instance.eventId) : undefined;
        if (!instance || !def) return { ok: false, reason: 'none' };
        const option = def.options[optionIndex];
        const effect = option.effect;
        const missing = seasonEventShortfall(effect, { gold: wallet.gold(), food: this._military.food });
        if (missing) return { ok: false, reason: 'shortfall', resource: missing };
        if ((effect.costGold ?? 0) > 0 && !wallet.spendGold(effect.costGold ?? 0)) return { ok: false, reason: 'shortfall', resource: '銅錢' };
        if (effect.costFood) this._military = { ...this._military, food: this._military.food - effect.costFood };
        if (effect.fame) this._fame = Math.min(BASE_RESOURCE_CAPS.fame, this._fame + effect.fame);
        const general = this._roster.getAll().find((g) => g.id === instance.generalId);
        if (general && effect.loyalty) {
            const isGacha = this._tallyLoyalty[general.id]?.isGachaHero === true || general.loyaltyState?.sourceType === 'Gacha';
            if (!isGacha) {
                const current = this._tallyLoyalty[general.id] ?? createTallyLoyaltyState(TALLY_LOYALTY_INITIAL, false);
                this._tallyLoyalty = { ...this._tallyLoyalty, [general.id]: { ...current, loyalty: Math.min(SEASON_PERSONALITY_TUNING.loyaltyMax, current.loyalty + effect.loyalty) } };
            }
        }
        if (general && effect.strExp) {
            const str = strAfterExp(general.str ?? 0, effect.strExp);
            if (str !== (general.str ?? 0)) this._roster.replaceAll(this._roster.getAll().map((g) => (g.id === general.id ? { ...g, str } : g)));
        }
        const state = this._seasonPersonality;
        this._seasonPersonality = {
            ...state,
            pending: state.pending.slice(1),
            farmMultiplier: state.farmMultiplier * (effect.farmMultiplier ?? 1),
            disasterImmune: state.disasterImmune || effect.disasterImmune === true,
        };
        if (this._autoSave && this._save) await this.save();
        return { ok: true, line: `${def.title}・${instance.generalName}：${option.label}，${option.note}` };
    }

    private _synthesizeChronicle(season: number): SeasonChronicleState {
        const random = this._chronicleRandom ?? remarkRandomOf(`chronicle|${season}|${this._seeded.snapshot().state}`);
        return synthesizeSeasonChronicle({ season, nations: this._rivals.nations, generals: this._roster.getAll() }, random);
    }

    /** 本季三國季報（PROG-2-2203）；season 為 -1 表示還沒有 */
    public get seasonChronicle(): SeasonChronicleState {
        return copySeasonChronicle(this._seasonChronicle);
    }

    /** 最近一次登入是不是換日後第一次 */
    public get loginStartedNewDay(): boolean {
        return this._loginStartedNewDay;
    }

    /** 本季季報還沒打開過（大廳紅點） */
    public get seasonChronicleUnread(): boolean {
        return this._seasonChronicle.season === this._clock.state.totalSeasonsElapsed && this._seasonChronicle.season >= 0 && !this._seasonChronicle.read;
    }

    /** 依時機判斷要不要自動彈出季報；戰後回大廳一律 false（規格 §三-2） */
    public chronicleShouldOpen(trigger: ChronicleTrigger): boolean {
        return chronicleShouldOpen(this._seasonChronicle, this._clock.state.totalSeasonsElapsed, trigger);
    }

    /** 季報打開過一次即已讀，紅點熄滅；有變動才存檔 */
    public async markSeasonChronicleRead(): Promise<void> {
        if (this._seasonChronicle.read) return;
        this._seasonChronicle = { ...copySeasonChronicle(this._seasonChronicle), read: true };
        if (this._autoSave && this._save) await this.save();
    }

    /**
     * 市井奇遇抉擇（0 = 積極行動，1 = 放棄）；當季只能一次，付不起時拒絕且不變動資源。
     * 銅錢走傳入的錢包，糧草、木材、名聲與名冊在 session 內結算；成功時自動存檔。
     */
    public async resolveCityEncounter(
        optionIndex: 0 | 1, wallet: { gold: () => number; spendGold: (amount: number) => boolean },
    ): Promise<{ ok: true; line: string } | { ok: false; reason: 'none' | 'shortfall' | 'no-target'; resource?: string }> {
        const state = this._seasonChronicle;
        const def = cityEncounterDef(state.encounterId);
        if (!def || state.season !== this._clock.state.totalSeasonsElapsed || state.encounterChoice !== null) return { ok: false, reason: 'none' };
        const option = def.options[optionIndex];
        const effect = option.effect;
        const roster = this._roster.getAll();
        const leadId = roster.some((g) => g.id === this._leadGeneralId && g.status !== 'dead')
            ? this._leadGeneralId
            : roster.find((g) => g.status !== 'dead')?.id ?? null;
        if (cityEncounterNeedsLead(effect) && !leadId) return { ok: false, reason: 'no-target' };
        const missing = cityEncounterShortfall(effect, { gold: wallet.gold(), food: this._military.food, wood: itemCount(this._inventory, ITEM_WOOD) });
        if (missing) return { ok: false, reason: 'shortfall', resource: missing };
        if ((effect.costGold ?? 0) > 0 && !wallet.spendGold(effect.costGold ?? 0)) return { ok: false, reason: 'shortfall', resource: '銅錢' };
        if (effect.costFood) this._military = { ...this._military, food: this._military.food - effect.costFood };
        if (effect.costWood) {
            this._inventory = consumeItem(this._inventory, ITEM_WOOD, effect.costWood) ?? this._inventory;
            this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        }
        if (effect.fame) this._fame = Math.min(BASE_RESOURCE_CAPS.fame, this._fame + effect.fame);
        if (effect.leadCavalryGrades || effect.leadStr || effect.maxVitality || effect.elderLifespan) {
            this._roster.replaceAll(applyEncounterToRoster(roster, leadId, effect, (g) => g.maxVitality ?? g.vitality ?? baseVitalityMaxOf(g.gender)));
        }
        this._seasonChronicle = { ...copySeasonChronicle(state), encounterChoice: optionIndex, read: true };
        if (this._autoSave && this._save) await this.save();
        const leadName = leadId ? roster.find((g) => g.id === leadId)?.name ?? leadId : '';
        const target = cityEncounterNeedsLead(effect) && leadName ? `（${leadName}）` : '';
        return { ok: true, line: `${def.title}：${option.label}，${option.note}${target}` };
    }

    /** 使用治理效率道具（GOV-14）：本季該任務產出提升；同任務同季不重複，被拒絕時不扣道具 */
    public async useGovernanceEfficiencyItem(itemId: string): Promise<{ ok: true } | { ok: false; reason: GovernanceBoostRejectReason | 'no-item' }> {
        const plan = planGovernanceBoost(this._governanceBoosts, itemId, this._clock.state.totalSeasonsElapsed);
        if (!plan.ok) return plan;
        const inventory = consumeItem(this._inventory, itemId);
        if (!inventory) return { ok: false, reason: 'no-item' };
        this._inventory = inventory;
        this._governanceBoosts = plan.boosts;
        if (this._autoSave && this._save) await this.save();
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        return { ok: true };
    }

    /** 本季治理事件的提示句；沒有事件回傳 null */
    public get governanceEventNotice(): string | null {
        const event = this.activeGovernanceEvent;
        return event ? governanceEventLine(event) : null;
    }

    /**
     * 選一項內政任務，依規格當下入帳：糧草、城市兵源寫進軍備，名聲寫進 fame，黃金交給 grantGold（沿用 LocalGachaService 錢包）。
     * 同季已選過則拒絕且不變動任何資源。成功時自動存檔（若有開啟）。
     * 該任務格有指派武將時，產出依武將屬性計算（領地治理系統 §F，PROG-2-1159）。
     */
    public async chooseDomesticTask(taskId: string, grantGold: (amount: number) => void = () => {}): Promise<DomesticTaskResult> {
        const season = this._clock.state.totalSeasonsElapsed;
        const result = runDomesticTask(
            { food: this._military.food, gold: 0, fame: this._fame, cityTroops: this._military.cityTroops },
            this._domesticLog,
            season,
            taskId,
            { food: this._military.foodCap, gold: Infinity, fame: BASE_RESOURCE_CAPS.fame, cityTroops: this._military.cityTroopsCap },
            this.domesticGovernorStats(taskId),
            this.magistrateGoldBonus,
            this.domesticOutputMultiplier(taskId),
        );
        if (!result.ok) return result;
        this._military = { ...this._military, food: result.stock.food, cityTroops: result.stock.cityTroops };
        this._fame = result.stock.fame;
        this._domesticLog = result.log;
        if (result.output?.resource === 'gold' && result.granted > 0) grantGold(result.granted);
        if (this._autoSave && this._save) await this.save();
        return result;
    }

    /**
     * 取出並清除「季末糧不足，下一場虎符打 8 折」的標記（兵種（虎符）系統 TRP-12）。
     * 只在戰場真正開局時呼叫一次；預覽出征編制不呼叫，避免吃掉折扣。
     * 暫定：標記只存在記憶體，讀檔後不保留（規格未定，之後若要保留再進存檔）。
     */
    public consumeTallyFoodDiscount(): boolean {
        const armed = this._tallyFoodDiscountArmed;
        this._tallyFoodDiscountArmed = false;
        return armed;
    }

    public get military(): MilitaryReserve {
        return { ...this._military };
    }

    /** 太守府的治理快照：季節倍率取目前季節，與季結入帳一致 */
    public governorSnapshot(): GovernorSnapshot {
        return buildGovernorSnapshot(this._military, seasonModifiersOf(this._clock.state.currentSeason).foodMultiplier);
    }

    /** 最近一場出征結算被地窖保護保住的糧草（PROG-2-1341）；沒觸發為 0，不存檔 */
    private _lastCellarProtectedFood = 0;

    public get lastCellarProtectedFood(): number {
        return this._lastCellarProtectedFood;
    }

    /**
     * 名冊武將出戰的出征帳本設定：帶兵上限由戰場統率推算，城市兵源與糧草取目前儲備。
     * 不在名冊或不能出戰時回傳 null（戰場維持舊版不扣軍勢）。
     */
    public getSortieInput(generalId: string, stageSortieCap?: number): CreateSortieInput | null {
        const config = this.getBattleConfig(generalId, Faction.Player);
        if (!config) return null;
        const support = this.getSortieSupportSummary(generalId);
        const foodBonus = support.deputyBonus.startingFoodBonus;
        const commander = this._roster.getAll().find((g) => g.id === generalId);
        return {
            commandCapacity: computeCommandCapacity({ lea: config.lea ?? config.stats?.lea ?? 0, generalRank: commander?.generalRank, fameBonus: commander?.generalFame }),
            cityTroops: this._military.cityTroops,
            ...(stageSortieCap !== undefined ? { stageSortieCap } : {}),
            food: this._military.food,
            ...(foodBonus > 0 ? { foodBonus } : {}),
            strategistBonus: support.strategistBonus,
            formationBloodlineIds: [commander?.bloodlineId, support.strategist?.bloodlineId, support.deputy?.bloodlineId],
        };
    }

    /** 指定出戰主將；必須是目前可出戰的名冊武將，否則回傳 false 且不變 */
    public async setLeadGeneral(generalId: string | null): Promise<boolean> {
        if (generalId !== null && !this.checkDeployable(generalId).eligible) {
            return false;
        }
        this._leadGeneralId = generalId;
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.LeadGeneralChanged, generalId);
        return true;
    }

    /** 收藏武將 id 清單（唯讀副本）。 */
    public get favoriteGeneralIds(): readonly string[] {
        return [...this._favoriteGeneralIds];
    }

    /** 官職狀態（唯讀副本）：階位、累積經驗與解鎖歷史（OFC-03）。 */
    public get officerState(): OfficerState {
        return { ...this._officerState, unlockHistory: [...this._officerState.unlockHistory] };
    }

    /** 官職權限快照（唯讀，OFC-04）：大廳、領地、沙盤與他國 AI 只經此取得權限。 */
    public get officerPermissions(): Readonly<OfficerPermissions> {
        return officerPermissionsOf(this._effectiveOfficerState());
    }

    /** 目前官職解鎖（唯讀）：由官職階位推得任務難度上限、欄位數、沙盤階段、熱點數。 */
    public get officerUnlocks(): OfficerUnlocks {
        return officerUnlocksOf(normalizeOfficerSnapshot(toOfficerSnapshot(this._effectiveOfficerState())));
    }

    /** 進行中的高階官職試用（OFC-12）；沒有或已到期為 null */
    public get activeOfficerTrial(): OfficerTrial | null {
        return activeOfficerTrial(this._officerTrial, Date.now());
    }

    /** 開始假節鉞試用（活動呼叫，OFC-12）：高一階 24 小時，到期後權限自動回到正式階位；不自動存檔 */
    public grantOfficerTrial(epochMs: number = Date.now()): OfficerTrialGrant {
        const grant = grantOfficerTrial(this._officerTrial, this._officerState.currentTier, epochMs);
        if (grant.ok) this._officerTrial = grant.trial;
        return grant;
    }

    private _effectiveOfficerState(): OfficerState {
        return effectiveOfficerState(this._officerState, this._officerTrial, Date.now());
    }

    /** 世界沙盤已放置標記數（唯讀，OFC-06）。 */
    public get sandtableMarkersPlaced(): number {
        return this._sandtableMarkerTerritories.length;
    }

    /** 已放置標記的領地 id（PROG-2-0965） */
    /** 初始虎符（OPEN-13）：回傳複本，沒有時為 null。 */
    /** 新玩家開場進行中的幕 id（PROG-2-1371）：讀檔後從該幕接續；開場結束為 null。 */
    public get openingPhase(): string | null {
        return this._openingPhase;
    }

    /** 玩家連勝／連敗計數（AIS-11）：回傳複本，開戰時給 loadEnemyScale 算自適應倍率。 */
    /** 祠堂軍功聲望累積值 */
    public get clanPrestige(): number {
        return this._clanPrestige;
    }

    /** 祠堂聲望等級 1~5 */
    public get clanPrestigeTier(): number {
        return clanPrestigeTierOf(this._clanPrestige);
    }

    /** 祠堂每日供奉數量（PM 暫定：補元散 1 顆） */
    public static readonly SHRINE_OFFERING_PILLS = 1;

    /** 今天能否領祠堂供奉：祠堂福祉含每日靈丹（Lv.5）且今天尚未領 */
    public canClaimShrineOffering(epochMs: number): boolean {
        return clanPrestigeBenefitOf(this.clanPrestigeTier).dailyShrinePill && this._shrineOfferingDay !== loginDayOf(epochMs);
    }

    /**
     * 領祠堂每日供奉（doc_spec_0310 §3 Lv.5，PROG-2-1915）：UTC+8 切日、同日一次，發補元散入背包並自動存檔。
     * 不符資格或今天已領回傳 0。
     */
    public async claimShrineOffering(epochMs: number): Promise<number> {
        if (!this.canClaimShrineOffering(epochMs)) return 0;
        const before = this._inventory;
        this._inventory = addItem(this._inventory, ITEM_VITALITY_PILL, GameSession.SHRINE_OFFERING_PILLS);
        this._recordGain(before, 'DROP');
        this._shrineOfferingDay = loginDayOf(epochMs);
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        if (this._autoSave && this._save) await this.save();
        return GameSession.SHRINE_OFFERING_PILLS;
    }

    /** 季度通行證（ECO-13 Mock，裁決 11/09 第 12 題） */
    public get seasonPass(): SeasonPassState {
        return { ...this._seasonPass, claimedFree: this._seasonPass.claimedFree.slice(), claimedPremium: this._seasonPass.claimedPremium.slice() };
    }

    /** Mock 升 1 級：軍功任務追蹤尚未接上 */
    public async mockSeasonPassLevelUp(): Promise<void> {
        this._seasonPass = mockSeasonPassLevelUp(this._seasonPass);
        if (this._autoSave && this._save) await this.save();
    }

    /** Mock 解鎖黃金戰令：不扣款 */
    public async mockUnlockSeasonPassPremium(): Promise<void> {
        this._seasonPass = { ...this._seasonPass, premium: true };
        if (this._autoSave && this._save) await this.save();
    }

    /** 一鍵領取（ECO-13 §5）：有道具的進背包，遊戲還沒有的內容只記錄已領 */
    public async claimAllSeasonPass(): Promise<SeasonPassReward[]> {
        const { state, rewards } = claimAllSeasonPass(this._seasonPass);
        if (rewards.length === 0) return rewards;
        const before = this._inventory;
        for (const reward of rewards) {
            if (reward.itemId) this._inventory = addItem(this._inventory, reward.itemId, reward.count);
        }
        this._recordGain(before, 'DROP');
        this._seasonPass = state;
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        if (this._autoSave && this._save) await this.save();
        return rewards;
    }

    public get aiAdaptiveStreak(): AiAdaptiveStreak {
        return { ...this._aiAdaptiveStreak };
    }

    /** 現在該出的開場商品（OPEN-12）；選定主將前或教學在前景時為 null */
    public nextOpeningOffer(table: Readonly<OpeningOfferTable>, tutorialBlocking: boolean, now?: number): OpeningOffer | null {
        return nextOpeningOffer(table, this._openingOffers, { leadSelected: this._leadGeneralId !== null, tutorialBlocking, now });
    }

    /** 已模擬購買的開場商品（OPEN-12 Mock 發貨紀錄） */
    public get purchasedOpeningOffers(): string[] {
        return [...this._openingOffers.purchased];
    }

    /** 記下玩家對開場商品的回應（OPEN-12）：只記結果，不收款也不發貨；不自動存檔 */
    public resolveOpeningOffer(table: Readonly<OpeningOfferTable>, offerId: string, outcome: OpeningOfferOutcome, now?: number): boolean {
        const result = resolveOpeningOffer(table, this._openingOffers, offerId, outcome, this._leadGeneralId !== null, now);
        if (result.ok) this._openingOffers = result.state;
        return result.ok;
    }

    /** 記下目前開場幕（PROG-2-1371）；有存檔服務時自動存檔，關遊戲後才接得回來。 */
    public async setOpeningPhase(phaseId: string | null): Promise<void> {
        this._openingPhase = normalizeOpeningPhaseId(phaseId);
        if (this._autoSave && this._save) await this.save();
    }

    public get startingTalisman(): StartingSpiritTalisman | null {
        return this._startingTalisman === null ? null : { ...this._startingTalisman, geneIds: [...this._startingTalisman.geneIds] };
    }

    /**
     * 英靈夢回教學戰完成（OPEN-13）：產出初始虎符並寫入會話；已有虎符時不覆蓋，回傳既有的那一張。
     * 教學戰未完成時不產生，回傳 null。
     */
    public completeTeachingBattle(spirit: TeachingSpiritInput): StartingSpiritTalisman | null {
        if (this._startingTalisman !== null) return this.startingTalisman;
        this._startingTalisman = buildStartingSpiritTalisman(spirit, true);
        return this.startingTalisman;
    }

    /** 世界沙盤解鎖歷史（HALL-08）：回傳複本，只增不減。 */
    public get sandtableUnlockHistory(): readonly SandtableStageId[] {
        return [...this._sandtableUnlockHistory];
    }

    /** 沙盤有效階段代碼（HALL-08）：官職階段與解鎖歷史中較高者，天下重組後不倒退。 */
    public get sandtableEffectiveStage(): SandtableStageId | null {
        const official = this.officerUnlocks.sandtableStage;
        return effectiveSandtableStage(official ? sandtableStageIdOf(official) : null, this._sandtableUnlockHistory);
    }

    /** 沙盤有效階段短代碼（S1/S2/S3）：標記上限、按鈕文字與開牆判定都讀這個，不讀官職原值。 */
    public get sandtableStage(): OfficerUnlocks['sandtableStage'] {
        const effective = this.sandtableEffectiveStage;
        return effective ? sandtableShortCodeOf(effective) : null;
    }

    /** 官職階段達到時寫入解鎖歷史；只增不減，重複呼叫不會產生重複階段。 */
    private _recordSandtableUnlockReached(): void {
        // 只看正式階位：試用階位不能留下永久的沙盤解鎖紀錄
        const official = officerUnlocksOf(normalizeOfficerSnapshot(toOfficerSnapshot(this._officerState))).sandtableStage;
        if (!official) return;
        this._sandtableUnlockHistory = recordSandtableUnlock(this._sandtableUnlockHistory, sandtableStageIdOf(official));
    }

    public get sandtableMarkerTerritories(): readonly string[] {
        return this._sandtableMarkerTerritories;
    }

    /** 世界沙盤還能再放的標記數（OFC-06）；未解鎖沙盤時為 0。 */
    public get sandtableRemaining(): number {
        return remainingSandtableMarkers(this.sandtableMarkersPlaced, this.sandtableStage);
    }

    /** 在指定領地放置一個標記（OFC-06 / PROG-2-0965）；上限已滿、未解鎖、領地不存在或已有標記時回傳 false，不改動狀態。 */
    public placeSandtableMarker(territoryId: string): boolean {
        if (!canPlaceSandtableMarker(this.sandtableMarkersPlaced, this.sandtableStage)) return false;
        if (!isSandtableTerritory(territoryId)) return false;
        if (this._sandtableMarkerTerritories.includes(territoryId)) return false;
        this._sandtableMarkerTerritories = [...this._sandtableMarkerTerritories, territoryId];
        return true;
    }

    // ---- 領地治理接線（GOV-04 指派 / GOV-09 主城保護 / JRN-01 日誌，PROG-2-0974）：指派隨 lifespanSaveFields 寫入存檔 ----
    private _governance: GovernanceAssignment[] = [];
    /** 太守府等級（GOV-08，Lv1–5） */
    private _territoryLevel = 1;
    /** 已下單、等季結生效的升級目標等級（GOV-08） */
    private _pendingTerritoryLevel: number | null = null;
    private _territories: KeepTerritory[] = defaultKeepTerritories();
    private _journal: JournalState = createEmptyJournal();
    // ---- 傭兵告別信收件匣（RET-03 接線，PROG-2-0985）：離隊時寫入，隨 lifespanSaveFields 存檔 ----
    private _farewellLetters: FarewellLetter[] = [];
    // ---- 連續登入統計（RET-09，PROG-2-0987）：隨 lifespanSaveFields 存檔 ----
    private _loginStreak: LoginStreakState = { ...EMPTY_LOGIN_STREAK };

    /** 連續登入統計（唯讀副本）。 */
    public get loginStreak(): LoginStreakState {
        return { ...this._loginStreak };
    }

    /** 讀檔時的存檔時間（毫秒）；沒有讀檔為 null。 */
    private _loadedSavedAtMs: number | null = null;

    /**
     * 離線互動觸發（JRN-04）：離線時長＝現在減讀檔時的存檔時間。
     * 未讀晨報數未傳時用實際未讀數（PROG-2-1174）；衝突標籤未傳時用名冊武將間的動態關係類型（PROG-2-1193）。
     */
    public offlineInteractionDue(nowMs: number, context: { unreadMorningReport?: number; activeConflictTags?: readonly string[] } = {}): boolean {
        const savedAt = this._loadedSavedAtMs;
        if (savedAt === null || nowMs < savedAt) return false;
        return shouldTriggerOfflineInteraction({
            offlineHours: (nowMs - savedAt) / 3_600_000,
            unreadMorningReport: context.unreadMorningReport ?? unreadMorningReportCount(this._morningReport),
            activeConflictTags: context.activeConflictTags ?? offlineInteractionTags(this._offlineInteractionCandidates()),
            cooldowns: [],
        });
    }

    /** 性格離線行為（HUM-03，PROG-2-2104）：挑一位在世武將寫進日誌，晨報與人物頁氣泡都讀得到 */
    private _recordOfflineBehavior(): void {
        const entry = offlineBehaviorJournalEntry(this._roster.getAll().filter((g) => g.status !== 'dead'), this._random,
            this._journal.entries.length + 1, seasonJournalTimestamp(this._clock.state));
        if (entry) this.recordJournal(entry);
    }

    /** 離線互動候選：名冊在世武將之間的動態關係 */
    private _offlineInteractionCandidates(): OfflineInteractionCandidate[] {
        const generals = this._roster.getAll().filter((g) => g.status !== 'dead').map((g) => ({ id: g.id, name: g.name }));
        return offlineInteractionCandidates(this.dynamicRelations.snapshot(), generals);
    }

    /** 離線互動紀錄（唯讀副本） */
    public get offlineInteractionLog(): string[] {
        return this._offlineInteractionLog.slice();
    }

    /**
     * 離線互動（JRN-04，PROG-2-1193）：觸發成立時挑一組角色寫 INTERACTION 日誌；
     * 登入窗以讀檔時的存檔時間識別，同窗同一對角色只排 1 則。回傳寫入的摘要，沒寫回 null。
     */
    public runOfflineInteraction(nowMs: number): string | null {
        if (!this.offlineInteractionDue(nowMs)) return null;
        const event = pickOfflineInteraction(this._offlineInteractionCandidates(), this._offlineInteractionLog, `W${this._loadedSavedAtMs}`,
            this._random, this._journal.entries.length + 1, seasonJournalTimestamp(this._clock.state), this._npcInteractionLimiter);
        if (!event || !this.recordJournal(event.entry).ok) return null;
        this._offlineInteractionLog = event.log;
        return event.entry.summary;
    }

    /** 每日補貼紀錄（PROG-2-1340）；從未領過為 null */
    private _dailySubsidy: DailySubsidyRecord | null = null;

    public get dailySubsidy(): DailySubsidyRecord | null {
        return this._dailySubsidy ? { ...this._dailySubsidy } : null;
    }

    /**
     * 每日補貼（ECO-06，PROG-2-1340）：UTC+8 切日，同日只領一次；糧草、城市兵源寫進軍備（依軍備上限夾制），
     * 黃金交給 grantGold（錢包）。沒有資源低於門檻時不算領取。回傳本次各項補量（沒補為空物件）；不自動存檔。
     */
    public claimDailySubsidy(epochMs: number, goldBalance: number, grantGold: (amount: number) => void = () => {}): Partial<Record<SubsidyResourceKey, number>> {
        const day = loginDayOf(epochMs);
        const dayIndex = (d: string): number => Math.floor(Date.parse(`${d}T00:00:00Z`) / 86_400_000);
        const last = this._dailySubsidy ? dayIndex(this._dailySubsidy.lastClaimDay) : null;
        const result = dailySubsidyOf({ food: this._military.food, gold: goldBalance, troops: this._military.cityTroops }, last, dayIndex(day));
        if (!result.claimed) return {};
        const food = Math.max(0, Math.min(this._military.foodCap, result.resources.food) - this._military.food);
        const troops = Math.max(0, Math.min(this._military.cityTroopsCap, result.resources.troops) - this._military.cityTroops);
        const gold = result.grants.gold ?? 0;
        this._military = { ...this._military, food: this._military.food + food, cityTroops: this._military.cityTroops + troops };
        if (gold > 0) grantGold(gold);
        this._dailySubsidy = { lastClaimDay: day, foodGranted: food, goldGranted: gold, troopsGranted: troops };
        const grants: Partial<Record<SubsidyResourceKey, number>> = {};
        if (food > 0) grants.food = food;
        if (gold > 0) grants.gold = gold;
        if (troops > 0) grants.troops = troops;
        return grants;
    }

    /** 月卡（PROG-2-1359）；從未開通為 null */
    private _monthlyCard: MonthlyCardState | null = null;

    /** 月卡現況：剩餘天數（含今天）、是否即將到期、今天是否已領 */
    public monthlyCardStatus(epochMs: number): { daysLeft: number; expiring: boolean; claimedToday: boolean } {
        return {
            daysLeft: monthlyCardDaysLeft(this._monthlyCard, epochMs),
            expiring: isMonthlyCardExpiring(this._monthlyCard, epochMs),
            claimedToday: this._monthlyCard?.lastClaimDay === loginDayOf(epochMs),
        };
    }

    /** 開通或續約月卡（付費流程由呼叫端負責）；回傳剩餘天數；不自動存檔 */
    public activateMonthlyCard(epochMs: number): number {
        this._monthlyCard = activateMonthlyCard(this._monthlyCard, epochMs);
        return monthlyCardDaysLeft(this._monthlyCard, epochMs);
    }

    /** 月卡每日領取（經濟系統 F，PROG-2-1359）：效期內同日一次，加速卡進背包；回傳本次張數；不自動存檔 */
    public claimMonthlyCardDaily(epochMs: number): number {
        const claim = claimMonthlyCardDaily(this._monthlyCard, epochMs);
        if (claim.speedCards <= 0) return 0;
        this._monthlyCard = claim.state;
        const beforeMonthlyCard = this._inventory;
        this._inventory = addItem(this._inventory, ITEM_WISH_SPEED_CARD, claim.speedCards);
        this._recordGain(beforeMonthlyCard, 'SHOP');
        return claim.speedCards;
    }

    /** 記錄一次登入（UTC+8 切日）；同日重複登入不增加天數。 */
    public recordLoginAt(epochMs: number, grantGold: (amount: number) => void = () => {}): void {
        this._loginStreak = recordLogin(this._loginStreak, epochMs);
        // 掛機產出：今天的登入日超過已發放的最大日才發一次免費入學令（PROG-2-1374，張數依太守府等級；高水位防止回撥時鐘重領）
        const today = loginDayOf(epochMs);
        // 三國季報：換日首登才算（晨報一天只產生一次，用它的產生日判斷）；本季還沒有季報（新局、舊檔）時補合成
        this._loginStartedNewDay = this._morningReport.day !== today;
        if (this._loginStartedNewDay && this._seasonChronicle.season !== this._clock.state.totalSeasonsElapsed) {
            this._seasonChronicle = this._synthesizeChronicle(this._clock.state.totalSeasonsElapsed);
        }
        // 性格離線行為（HUM-03）：隔天第一次登入才有「昨晚」可寫；沿用入學令的切日高水位，回撥時鐘不會重發
        const offlineBehaviorDue = this._enrollGrantDay !== null && isNewEnrollGrantDay(this._enrollGrantDay, today);
        if (isNewEnrollGrantDay(this._enrollGrantDay, today)) {
            const beforeEnroll = this._inventory;
            this._inventory = addItem(this._inventory, ITEM_ADMISSION_TOKEN, dailyFreeEnrollCount(this._territoryLevel));
            this._recordGain(beforeEnroll, 'TASK');
            this._enrollGrantDay = today;
        }
        // 限時道具：登入切日時回收已過期的物件庫列（PROG-2-1364）
        this.sweepExpiredInventory(epochMs);
        // 三國日報：當天第一次登入依前 24h 行為紀錄生成（PROG-2-1170）
        this._dailyNews = refreshDailyNews(this._dailyNews, this._playerLogs, this._roster.getAll().map((g) => ({ name: g.name })), epochMs, this._random);
        // 七天歷程（RET-12）：依登入日與事實寫入觸發點日誌；每個觸發點只寫一次
        const journey = advanceSevenDayJourney(this._sevenDayJourney, today, {
            DAILY_NEWS: this._dailyNews.lastGeneratedDay !== null,
            ...journeyFactsOf(this.breedingBirthRecords()),
        }, DEFAULT_JOURNEY_TRACK);
        this._sevenDayJourney = journey.state;
        for (const trigger of journey.fired) {
            this.recordJournal({
                entryId: `SEVEN_DAY-${this._journal.entries.length + 1}`,
                timestamp: seasonJournalTimestamp(this._clock.state),
                category: 'SYSTEM',
                relatedGeneralUids: [],
                priority: SEVEN_DAY_JOURNAL_PRIORITY,
                summary: trigger.summary,
            });
        }
        // 派遣：離線期間到期的任務先結算寫日誌，才會進這次晨報（PROG-2-1178）
        this.settleDispatchJobs(epochMs, grantGold);
        // 離線互動：寫進日誌後才產生晨報，讓晨報可挑到（PROG-2-1193）
        this.runOfflineInteraction(epochMs);
        if (offlineBehaviorDue) this._recordOfflineBehavior();
        // 晨報：上次登入後新增的日誌挑高優先條目（PROG-2-1174）；一天只產生一次，當天新日誌留到隔天（裁決 11/09 第 7 題）
        this._morningReport = refreshMorningReport(this._morningReport, this._journal.entries, this._officerState.currentTier, today);
    }

    private _playerLogs: PlayerLogEntry[] = [];
    private _dailyNews: DailyNewsState = { ...EMPTY_DAILY_NEWS, news: [] };
    private _morningReport: MorningReportState = { ...EMPTY_MORNING_REPORT, items: [] };
    private _dispatch: DispatchState = normalizeDispatchState(EMPTY_DISPATCH_STATE);

    /** 派遣狀態（複本）：進行中、已完成、冷卻 */
    public get dispatchState(): DispatchState {
        return normalizeDispatchState(this._dispatch);
    }

    /** 大廳派遣板列（暫定清單，PROG-2-1179）：進行中在前，名冊外的武將顯示 id */
    /**
     * 派遣板列。preview 為 true 時，未進行的任務預覽人選與分數（PROG-2-1188）：
     * 帶 generalId 預覽該武將（須可派），否則預覽自動挑將的人選。
     */
    public dispatchBoardRows(nowMs: number, options: { preview?: boolean; generalId?: string } = {}): DispatchCatalogRow[] {
        const roster = this._roster.getAll();
        const preview = options.preview ? (job: Readonly<DispatchJobDef>): DispatchPreview | null => {
            if (!options.generalId) return this._bestDispatchGeneral(job, nowMs);
            const chosen = this.dispatchIdleGenerals(nowMs).find((g) => g.id === options.generalId);
            const general = chosen ? roster.find((g) => g.id === chosen.id) : undefined;
            return general ? { generalName: general.name, score: getDispatchScore(job, this._dispatchGeneralOf(general)) } : null;
        } : undefined;
        return dispatchBoardRows(this._dispatch, DISPATCH_JOB_CATALOG, (id) => roster.find((g) => g.id === id)?.name ?? id, nowMs, preview);
    }

    /** 自動挑將：分數最高、不忙碌也不在冷卻的武將（同分取名冊順序）；點列派遣與預覽共用 */
    private _bestDispatchGeneral(job: Readonly<DispatchJobDef>, nowMs: number): { id: string; generalName: string; score: number } | null {
        const idleIds = new Set(this.dispatchIdleGenerals(nowMs).map((g) => g.id));
        let best: { id: string; generalName: string; score: number } | null = null;
        for (const g of this._roster.getAll().filter((r) => idleIds.has(r.id))) {
            const score = getDispatchScore(job, this._dispatchGeneralOf(g));
            if (!best || score > best.score) best = { id: g.id, generalName: g.name, score };
        }
        return best;
    }

    /**
     * 派遣武將執行任務（JRN-03）：以 §F-2 評分快照分數；auto 為 AI 代勞時擋下高風險任務。
     * 角色標籤取 careerClass／role，日誌標籤取該武將日誌的類別（暫定）。名冊外的武將不可派遣。
     */
    public startDispatchJob(job: DispatchJobDef, generalId: string, nowMs: number, auto = false): DispatchStartResult | null {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general || !this._isDispatchable(general)) return null;
        const result = startDispatch(this._dispatch, job, generalId, this._dispatchGeneralOf(general), nowMs, auto);
        if (result.ok) this._dispatch = result.state;
        return result;
    }

    /** 派遣評分用的武將資料：角色標籤取 careerClass／role，日誌標籤取該武將日誌類別（暫定） */
    private _dispatchGeneralOf(general: { id: string }): DispatchGeneral {
        const raw = general as unknown as Record<string, unknown>;
        const stats: Partial<Record<DispatchStatKey, number>> = {};
        for (const key of ['str', 'int', 'lea', 'pol', 'cha'] as DispatchStatKey[]) {
            if (typeof raw[key] === 'number') stats[key] = raw[key] as number;
        }
        const roleTags = [raw.careerClass, raw.role].filter((t): t is string => typeof t === 'string' && t.length > 0);
        const journalTags = Array.from(new Set(queryJournal(this._journal, { generalUid: general.id }).map((e) => e.category as string)));
        return { roleTags, stats, journalTags };
    }

    /** 已陣亡或退役（導師卡）的武將不可派遣（PROG-2-0686） */
    private _isDispatchable(general: { status?: string }): boolean {
        return general.status !== 'dead' && !(general as { isMentorCard?: boolean }).isMentorCard;
    }

    /** 目前可派遣（不忙碌也不在冷卻）的武將，名冊順序（PROG-2-1186 選將列用） */
    public dispatchIdleGenerals(nowMs: number): { id: string; name: string }[] {
        return this._roster.getAll()
            .filter((g) => this._isDispatchable(g) && !this._dispatch.active.some((a) => a.generalId === g.id) && (this._dispatch.cooldowns[g.id] ?? 0) <= nowMs)
            .map((g) => ({ id: g.id, name: g.name }));
    }

    /**
     * 派遣板點列派遣（PROG-2-1181）：從暫定清單找任務，自動挑分數最高、不忙碌也不在冷卻的武將（同分取名冊順序）。
     * 帶 generalId 時改派指定武將（PROG-2-1186），忙碌或冷卻中回報原因與姓名。
     * 玩家親自點選視同親自決策，高風險任務可派。
     */
    public dispatchJobById(jobId: string, nowMs: number, generalId?: string): DispatchClickResult {
        const job = findDispatchJob(jobId);
        if (!job) return { ok: false, reason: 'unknown-job' };
        const running = this._dispatch.active.find((a) => a.jobId === jobId);
        if (running) {
            const name = this._roster.getAll().find((g) => g.id === running.generalId)?.name ?? running.generalId;
            return { ok: false, reason: 'job-active', jobName: job.name, generalName: name };
        }
        if (generalId) {
            const chosen = this._roster.getAll().find((g) => g.id === generalId);
            if (!chosen) return { ok: false, reason: 'no-general', jobName: job.name };
            const result = this.startDispatchJob(job, chosen.id, nowMs);
            if (!result?.ok) return { ok: false, reason: result?.reason ?? 'no-general', jobName: job.name, generalName: chosen.name };
            return { ok: true, jobName: job.name, generalName: chosen.name };
        }
        const best = this._bestDispatchGeneral(job, nowMs);
        if (!best) return { ok: false, reason: 'no-general', jobName: job.name };
        const result = this.startDispatchJob(job, best.id, nowMs);
        if (!result?.ok) return { ok: false, reason: result?.reason ?? 'no-general', jobName: job.name };
        return { ok: true, jobName: job.name, generalName: best.generalName };
    }

    /** 結算到期的派遣，每筆寫 DISPATCH 日誌（§G 完成句）；回傳本次完成的任務。 */
    public settleDispatchJobs(nowMs: number, grantGold: (amount: number) => void = () => {}): CompletedDispatchJob[] {
        const settled = settleDueDispatches(this._dispatch, nowMs);
        this._dispatch = settled.state;
        const roster = this._roster.getAll();
        for (const job of settled.completed) {
            const name = roster.find((g) => g.id === job.generalId)?.name ?? job.generalId;
            this.recordJournal({
                entryId: `DISPATCH_JOB-${this._journal.entries.length + 1}`,
                timestamp: seasonJournalTimestamp(this._clock.state),
                category: 'DISPATCH',
                relatedGeneralUids: [job.generalId],
                priority: DISPATCH_JOURNAL_PRIORITY[job.quality],
                summary: dispatchCompleteLine(name, job.name, job.rewardText),
                summaryKey: DISPATCH_COMPLETE_KEY,
                summaryArgs: dispatchCompleteArgs(name, job.name, job.rewardText),
            });
            this._grantDispatchReward(job, grantGold);
        }
        return settled.completed;
    }

    /** 派遣完成發獎（PROG-2-1182）：糧草、名聲有上限直接入帳；金幣交呼叫端錢包（同內政任務）。 */
    private _grantDispatchReward(job: CompletedDispatchJob, grantGold: (amount: number) => void): void {
        const reward = findDispatchJob(job.jobId)?.reward;
        if (!reward) return;
        const amount = dispatchRewardAmount(reward, job.quality);
        if (amount <= 0) return;
        if (reward.resource === 'food') {
            this._military = { ...this._military, food: Math.min(this._military.foodCap, this._military.food + amount) };
        } else if (reward.resource === 'fame') {
            this._fame = Math.min(BASE_RESOURCE_CAPS.fame, this._fame + amount);
        } else {
            grantGold(amount);
        }
    }

    /** 記一筆玩家行為（三國日報的素材，只留 24h 內）；其他系統的採集點也走這裡。時間預設為最近一次登入時間（未登入為 0）。 */
    public recordPlayerLog(type: PlayerLogType, resource?: string, atMs: number = this._dailyNews.lastLoginMs ?? 0, amount?: number): void {
        const entry: PlayerLogEntry = { type, at: atMs };
        if (resource) entry.resource = resource;
        if (amount !== undefined && amount > 0) entry.amount = Math.floor(amount);
        this._playerLogs = appendPlayerLog(this._playerLogs, entry);
    }

    /** 目前可復仇取回的缺口數量（RET-05）；沒有可取回的紀錄時為 0 */
    public get revengeRecoverable(): number {
        const index = this._shortageLogIndex();
        return index < 0 ? 0 : this._playerLogs[index].amount ?? 0;
    }

    /** 最近一筆帶數量的缺糧紀錄索引（RET-05），沒有時回 -1 */
    private _shortageLogIndex(): number {
        for (let i = this._playerLogs.length - 1; i >= 0; i--) {
            const log = this._playerLogs[i];
            if (log.type === 'RESOURCE_LOW' && log.amount !== undefined) return i;
        }
        return -1;
    }

    /**
     * 復仇取回（RET-05）：消耗最近一筆帶數量的缺糧紀錄，依 pct（5~20）取回糧草，不超過糧草上限。
     * 沒有可取回的紀錄時回傳 0；被消耗的紀錄不會再取回第二次。
     */
    public claimRevengeRecovery(pct: number): number {
        const index = this._shortageLogIndex();
        if (index < 0) return 0;
        const recovered = revengeRecoverAmount(this._playerLogs[index].amount ?? 0, pct);
        this._playerLogs = this._playerLogs.filter((_, i) => i !== index);
        this._military = { ...this._military, food: Math.min(this._military.foodCap, this._military.food + recovered) };
        return recovered;
    }

    /** 前 24h 的行為紀錄（複本） */
    public get playerLogs(): PlayerLogEntry[] {
        return this._playerLogs.map((log) => ({ ...log }));
    }

    /** 今日三國日報（複本） */
    public get dailyNews(): DailyNewsState {
        return { lastGeneratedDay: this._dailyNews.lastGeneratedDay, lastLoginMs: this._dailyNews.lastLoginMs, news: this._dailyNews.news.map((n) => ({ ...n })) };
    }

    public markDailyNewsRead(): void {
        this._dailyNews = markDailyNewsRead(this._dailyNews);
    }

    /** 晨報（複本） */
    public get morningReport(): MorningReportState {
        return copyMorningReport(this._morningReport);
    }

    /** 今天晨報之後新增、留到隔天晨報的日誌數；大廳晨報入口的紅點（裁決 11/09 第 7 題） */
    public get pendingMorningJournalCount(): number {
        return pendingMorningJournalCount(this._morningReport, this._journal.entries);
    }

    /** 打開晨報派遣板：紅點熄滅（PROG-2-2203 修正看過不熄）；不存檔，下次存檔一併寫入 */
    public markJournalHubSeen(): void {
        this._morningReport = markJournalHubSeen(this._morningReport, this._journal.entries);
    }

    /** 未讀時為 [開頭句, 每則摘要]，否則空陣列 */
    public get morningReportLines(): string[] {
        return morningReportLines(this._morningReport);
    }

    public markMorningReportRead(): void {
        this._morningReport = markMorningReportRead(this._morningReport);
    }

    /** 告別信收件匣（唯讀副本）。 */
    public get farewellLetters(): FarewellLetter[] {
        return this._farewellLetters.map(l => ({ ...l }));
    }

    /** 標記告別信已讀；找不到 ID 時不變動。 */
    public readFarewellLetter(id: string): void {
        this._farewellLetters = markFarewellLetterRead(this._farewellLetters, id);
    }

    /** 內政任務格的武將指派（唯讀副本，GOV-04）。 */
    public get governanceAssignments(): GovernanceAssignment[] {
        return this._governance.map(a => ({ ...a }));
    }

    /** 指派武將到內政任務格（GOV-04）；被拒絕時不改動狀態。 */
    public assignGovernor(task: string, generalUid: string, maxSlots: number = this.maxTaskSlots): GovernanceResult {
        const general = this._roster.getAll().find((g) => g.id === generalUid);
        if (!general) return { ok: false, reason: 'invalid-general', assignments: this.governanceAssignments };
        // SPI-13 Q51：未滿 15 歲只能做低效內政
        if (!domesticAssignmentFor(general.age, task).ok) return { ok: false, reason: 'child-only-low-efficiency', assignments: this.governanceAssignments };
        const result = assignGovernanceGeneral(this._governance, task, generalUid, maxSlots);
        if (result.ok) this._governance = result.assignments;
        return result;
    }

    /** 內政任務格指派武將的屬性（§F 產出公式用）；未指派或武將已不在名冊時回傳 null。 */
    public domesticGovernorStats(task: string): DomesticStats | null {
        const uid = this._governance.find((a) => a.task === task)?.generalUid;
        const general = uid ? this._roster.getAll().find((g) => g.id === uid) : undefined;
        if (!general) return null;
        const stats = this.domesticStatsOf(general);
        const assignment = domesticAssignmentFor(general.age, task);
        const efficiency = assignment.ok ? assignment.efficiency : 0;
        if (efficiency === 1) return stats;
        // 幼兒做低效內政：屬性打折後再進產出公式
        return { str: stats.str * efficiency, int: stats.int * efficiency, pol: stats.pol * efficiency, cha: stats.cha * efficiency };
    }

    /** 武將的內政用屬性（頂層欄位優先，舊資料退回 stats 子物件）。 */
    public domesticStatsOf(general: GeneralConfig): DomesticStats {
        return {
            str: general.str ?? general.stats?.str ?? 0,
            int: general.int ?? general.stats?.int ?? 0,
            pol: general.pol ?? general.stats?.pol ?? 0,
            cha: general.cha ?? general.stats?.cha ?? 0,
        };
    }

    // ---- 子嗣郡城縣令（領地治理 §E #9，PROG-2-1162）----
    private _magistrateUid: string | null = null;

    /** 擔任郡城縣令的子嗣 id；沒有時為 null */
    public get magistrateUid(): string | null {
        return this._magistrateUid;
    }

    /** 指派或卸下郡城縣令；只有名冊中存活的子嗣可擔任，失敗時不改狀態 */
    public setMagistrate(uid: string | null): boolean {
        if (uid === null) {
            this._magistrateUid = null;
            return true;
        }
        const general = this._roster.getAll().find((g) => g.id === uid);
        if (!general || general.status === 'dead' || !isDescendant(general as GeneralConfig & { fatherId?: string; motherId?: string })) return false;
        this._magistrateUid = uid;
        return true;
    }

    /** 目前縣令的黃金產出加成比例（沒有縣令時為 0） */
    public get magistrateGoldBonus(): number {
        const general = this._magistrateUid ? this._roster.getAll().find((g) => g.id === this._magistrateUid) : undefined;
        return general ? magistrateGoldBonus(this.domesticStatsOf(general).pol) : 0;
    }

    // ---- 自動治理（領地治理 §E #4/#7 Auto_Mode，PROG-2-1161）----
    private _autoGovernance = false;

    /** 自動治理是否開啟；開啟時每季結算後自動補上空的內政任務格 */
    public get autoGovernance(): boolean {
        return this._autoGovernance;
    }

    /** 切換自動治理；開啟時立即補一次空格。回傳這次補了幾格 */
    public setAutoGovernance(on: boolean): number {
        this._autoGovernance = on;
        return on ? this._fillAutoGovernance() : 0;
    }

    /** 空格依 §F 親和度補上閒置武將（PROG-2-1160 同一規則）；已有主事的格子不動 */
    private _fillAutoGovernance(): number {
        const candidates = this._roster.getAll()
            // 自動治理不派幼兒（Q51 只許低效內政，留給玩家手動指派）
            .filter((general) => general.status !== 'dead' && !(typeof general.age === 'number' && general.age < CHILD_ASSIGNMENT_AGE))
            .map((general) => ({ id: general.id, stats: this.domesticStatsOf(general) }));
        const picks = planAutoGovernance(candidates, (task) => this._governance.find((a) => a.task === task)?.generalUid ?? null);
        let filled = 0;
        for (const pick of picks) {
            const result = assignGovernanceGeneral(this._governance, pick.task, pick.generalUid, this.maxTaskSlots);
            if (!result.ok) continue;
            this._governance = result.assignments;
            filled += 1;
        }
        return filled;
    }

    /** 卸下內政任務格的武將（GOV-04）。 */
    public unassignGovernor(task: DomesticTaskId): void {
        this._governance = removeGovernanceAssignment(this._governance, task).assignments;
    }

    /** 太守府等級（GOV-08）。 */
    public get territoryLevel(): number {
        return this._territoryLevel;
    }

    /** 已下單、季結後生效的升級目標等級；沒有時為 null（GOV-08）。 */
    public get pendingTerritoryLevel(): number | null {
        return this._pendingTerritoryLevel;
    }

    /** 目前等級的內政任務格數（GOV-08）。 */
    public get maxTaskSlots(): number {
        return maxTaskSlotsForLevel(this._territoryLevel);
    }

    /**
     * 太守府升級下單（GOV-08）：先檢查等級、待生效與糧草，再請呼叫端錢包扣金錢；
     * 全部成功才扣糧草並記為待生效，季結時升級。被拒絕時不改動狀態。
     */
    public orderTerritoryUpgrade(spendGold: (amount: number) => boolean): TerritoryUpgradePlan {
        const plan = planTerritoryUpgrade(this._territoryLevel, this._pendingTerritoryLevel, this._military.food);
        if (!plan.ok) return plan;
        if (!spendGold(plan.cost.gold)) return { ...plan, ok: false, reason: 'insufficient-gold' };
        this._military = { ...this._military, food: this._military.food - plan.cost.food };
        this._pendingTerritoryLevel = plan.targetLevel;
        return plan;
    }

    /** 季結時套用待生效的升級（GOV-08）。 */
    private applyPendingTerritoryUpgrade(): void {
        if (this._pendingTerritoryLevel === null) return;
        this._territoryLevel = this._pendingTerritoryLevel;
        this._pendingTerritoryLevel = null;
    }

    /** 設定領地清單（含主城），供領地資料載入或測試使用（GOV-09）。 */
    public setTerritories(territories: readonly KeepTerritory[]): void {
        this._territories = territories.map(t => ({ ...t }));
    }

    /** 領地清單（唯讀副本，GOV-09）。 */
    public get territories(): KeepTerritory[] {
        return this._territories.map(t => ({ ...t }));
    }

    /** 外圍領地失守（GOV-09）；主城拒絕，被拒絕時不改動狀態。 */
    public loseTerritory(territoryId: string): TerritoryLossResult {
        const result = attemptTerritoryLoss(this._territories, territoryId);
        if (result.ok) this._territories = result.territories;
        return result;
    }

    /** 背水一戰加成（GOV-09）：領地只剩主城時防禦 ×2、兵力生產 +50%。 */
    public get lastStand(): LastStandModifiers {
        return lastStandModifiers(this._territories);
    }

    /**
     * 季結自動寫日誌（PROG-2-0976）：每個結束的季寫一筆 SYSTEM 條目，列出該季有戰損報告的武將。
     * 同一季重複結算時 ID 重複，寫入會被拒絕，不會寫兩筆。
     */
    private recordSeasonJournal(ended: GameTimeState, reports: readonly QuarterlyBattleReportRow[]): void {
        this.recordJournal({
            entryId: `SEASON-${ended.totalSeasonsElapsed}`,
            timestamp: seasonJournalTimestamp(ended),
            category: 'SYSTEM',
            relatedGeneralUids: reports.map(r => r.generalId),
            priority: SEASON_JOURNAL_PRIORITY,
            summary: `${formatSeasonLabel(ended)}結算。`,
        });
    }

    /** 名冊內的武將轉成日誌主體；名冊外（例如內建 demo 武將）略過。 */
    private _journalSubjects(uids: readonly string[]): JournalEventSubject[] {
        const roster = this._roster.getAll();
        return uids.flatMap((uid) => {
            const general = roster.find((g) => g.id === uid);
            return general ? [{ uid, name: general.name }] : [];
        });
    }

    /** 老死與燃壽死亡都算入祀絕筆（doc_spec_0312 §5.3，PROG-2-2107）；亡者要從季結移除前的名冊找 */
    private _recordDeathEpitaphs(before: readonly GeneralConfig[], events: readonly AgingEvent[]): void {
        for (const event of events) {
            const dead = event.type === 'died' ? before.find((g) => g.id === event.generalId) : undefined;
            if (dead) this._recordEpitaph(dead, 'natural');
        }
    }

    private _recordEpitaph(general: GeneralConfig, cause: 'retire' | 'natural'): void {
        const entry = epitaphJournalEntry(general, cause, this._journal.entries.length + 1, seasonJournalTimestamp(this._clock.state));
        if (entry) this.recordJournal(entry);
    }

    /** 立春名士占卜（doc_spec_0312 §2，PROG-2-2106）：符合門檻的子嗣各寫一則日誌，回傳換季通知要顯示的台詞 */
    private _recordChildOmens(): string[] {
        return dueChildOmens(this._roster.getAll(), this._factorDictionary).map((notice) => {
            this.recordJournal({
                entryId: `CHILD_OMEN-${this._journal.entries.length + 1}`,
                timestamp: seasonJournalTimestamp(this._clock.state),
                category: 'GROWTH',
                relatedGeneralUids: [notice.childId],
                priority: CHILD_OMEN_JOURNAL_PRIORITY,
                summary: notice.line,
            });
            return notice.line;
        });
    }

    /** 事件寫入日誌（PROG-2-1175）：時間沿用季度日誌的遊戲時間，ID 用目前條目數 +1。 */
    private _recordEventJournal(kind: JournalEventKind, subjects: readonly JournalEventSubject[]): void {
        const seq = this._journal.entries.length + 1;
        const input = buildJournalEvent(kind, subjects, seq, seasonJournalTimestamp(this._clock.state));
        if (!input) return;
        // 日誌反應（JRN-04，PROG-2-1404）：以第一位相關武將的名字與條目序號決定台詞，失敗時回退
        const reaction = journalReactionLine(input, subjects[0].name ?? '', seq);
        this.recordJournal({ ...input, reaction });
    }

    /** 寫入武將日誌（JRN-01）；被拒絕時不改動狀態。 */
    public recordJournal(input: JournalEntryInput): JournalWriteResult {
        const result = appendJournalEntry(this._journal, input);
        if (result.ok) this._journal = result.state;
        return result;
    }

    /** 依武將與類別查詢日誌（JRN-01），新到舊。 */
    public queryJournal(query: JournalQuery = {}): JournalEntry[] {
        return queryJournal(this._journal, query);
    }

    /**
     * 官職經驗入帳（OFC-03）：依任務結果算經驗（F-1）並晉升，回傳這次新解鎖的階位（由低到高）。
     * 只升不降；天下大亂不會動到官職（F-3）。
     */
    public gainOfficerExp(task: OfficerTaskResult, epochMs: number = Date.now()): number[] {
        const monthlyCardActive = monthlyCardDaysLeft(this._monthlyCard, epochMs) > 0;
        const result = addOfficerExp(this._officerState, boostedOfficerExp(calcOfficerExpGain(task), monthlyCardActive));
        this._officerState = result.state;
        this._recordSandtableUnlockReached();
        return result.promotedTiers;
    }

    /**
     * 大廳任務結算（OFC-08）：任務完成或失敗都會入帳官職經驗；晉升時發出 OfficerPromoted。
     * 無法對應的任務（未知難度或無對應牆）不入帳，回傳空陣列。
     */
    public settleHallMission(outcome: HallMissionOutcome): number[] {
        const task = hallMissionToOfficerTask(outcome);
        if (!task) return [];
        const promoted = this.gainOfficerExp(task);
        if (promoted.length > 0) {
            this._emit(GAME_SESSION_EVENTS.OfficerPromoted, { tiers: promoted });
        }
        return promoted;
    }

    /**
     * 大廳任務派遣（暫定即時結算）：通過派遣條件後指派武將，再依成敗結算官職經驗。
     * 阻擋時不指派、不結算。
     */
    public async dispatchHallTask(
        task: HallGateTask,
        board: HallBoardKey,
        player: Readonly<HallPlayerState>,
        generalId: string | null,
        generalPower: number,
    ): Promise<HallDispatchResult> {
        const result = resolveHallDispatch(task, player, board, generalId, generalPower);
        if (!result.ok || generalId === null) return result;
        const assigned = await this.assignHallTask(task.Task_ID, generalId);
        if (!assigned) return { ok: false, reason: 'NO_GENERAL' };
        this.settleHallMission(result.outcome);
        // 場景戰法唯一來源是軍事任務（doc_spec_0039 B-1）：任務成功才記，下一場戰鬥判定
        const sceneGambit = result.outcome.success ? pendingSceneGambitOfTask(task) : null;
        if (sceneGambit) this._pendingSceneGambit = sceneGambit;
        this._awardGeneralFame(generalId, hallMissionFameGain(result.outcome));
        this._recordEventJournal(result.outcome.success ? 'DISPATCH_SUCCESS' : 'DISPATCH_FAIL', this._journalSubjects([generalId]));
        // 任務結束：同一任務若有未結算的委任紀錄，一併結清（PROG-2-1008）
        await this.settleHallAssign(task.Task_ID, result.outcome.success ? 'success' : 'failure', new Date().toISOString());
        return result;
    }

    /** 等下一場戰鬥判定的場景戰法（SCN-04）；沒有時為 null */
    public get pendingSceneGambit(): PendingSceneGambit | null {
        return this._pendingSceneGambit ? { ...this._pendingSceneGambit } : null;
    }

    /** 出征編制的「任務戰法加成」勾選（裁決 11/09 第 12 題）；沒有待發動時回傳 false */
    public async setPendingSceneGambitArmed(armed: boolean): Promise<boolean> {
        const pending = this._pendingSceneGambit;
        if (!pending) return false;
        if (armed) delete pending.disarmed;
        else pending.disarmed = true;
        if (this._autoSave && this._save) await this.save();
        return true;
    }

    /**
     * 開戰前判定場景戰法（SCN-04）：未達門檻保留到下一場，擲過骰就用掉。
     * 取消勾選時不判定、不用掉，視同本場沒有。
     * 發動者是本場主將；情報用玩家目前的情報值。沒有待發動時回傳 null。
     */
    public async resolvePendingSceneGambit(generalId: string, roll: () => number = Math.random): Promise<SceneGambitOutcome | null> {
        const pending = this._pendingSceneGambit;
        if (!pending || pending.disarmed) return null;
        const general = this._roster.getAll().find((g) => g.id === generalId);
        const outcome = resolveSceneGambit(pending.tactic, general?.int ?? general?.stats?.int ?? 0, this.intel, roll());
        if (outcome.kind === 'blocked') return outcome;
        this._pendingSceneGambit = null;
        if (this._autoSave && this._save) await this.save();
        return outcome;
    }

    /** 大廳任務指派（唯讀副本）：任務 id → 指派武將 id。 */
    public get hallAssignments(): Readonly<Record<string, string>> {
        return { ...this._hallAssignments };
    }

    /**
     * 切換收藏。武將不在名冊時不變更，回傳 ok: false。
     * 回傳的 favorite 為切換後的狀態。
     */
    public async toggleFavorite(generalId: string): Promise<{ ok: boolean; favorite: boolean }> {
        if (!this._roster.getAll().some((g) => g.id === generalId)) {
            return { ok: false, favorite: this._favoriteGeneralIds.includes(generalId) };
        }
        const favorite = !this._favoriteGeneralIds.includes(generalId);
        this._favoriteGeneralIds = favorite
            ? normalizeFavoriteGeneralIds([...this._favoriteGeneralIds, generalId])
            : this._favoriteGeneralIds.filter((id) => id !== generalId);
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { ok: true, favorite };
    }

    /**
     * 大廳任務接取：把任務指派給名冊內的武將（同一任務重派會覆蓋）。
     * 武將不在名冊或任務 id 為空時回傳 false，不變更。
     */
    public async assignHallTask(taskId: string, generalId: string): Promise<boolean> {
        if (taskId.length === 0 || !this._roster.getAll().some((g) => g.id === generalId)) return false;
        this._hallAssignments = { ...this._hallAssignments, [taskId]: generalId };
        if (this._autoSave && this._save) {
            await this.save();
        }
        return true;
    }

    /** 放棄或完成任務時解除指派；原本沒有指派時回傳 false。 */
    public async releaseHallTask(taskId: string): Promise<boolean> {
        if (!(taskId in this._hallAssignments)) return false;
        const next = { ...this._hallAssignments };
        delete next[taskId];
        this._hallAssignments = next;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return true;
    }

    /** 目前大廳點位的列資料；沒刷新過時為空陣列。 */
    public get hallSpotRows(): HallSpotRow[] {
        return buildHallSpotRows(this._hallSpotState.spotIds, this.hallCandidates());
    }

    /**
     * 大廳點位刷新：未滿 60 秒沿用舊點位，到期才依收藏與指派重抽（HALL-07）。
     * nowSec 由呼叫端傳入（秒），random 回傳 [0,1)。回傳最新列資料。
     */
    public refreshHallSpots(nowSec: number, random: () => number, count = 4): HallSpotRow[] {
        this._hallSpotState = refreshHallCharacterSpots(this._hallSpotState, nowSec, this.hallCandidates(), count, random);
        return this.hallSpotRows;
    }

    /**
     * HALL-07 點位候選清單：收藏與已派任務由 GameSession 既有狀態推導，不另存一份。
     * 只列名冊內的武將；指派給已離開名冊的武將不計入。
     */
    public hallCandidates(): HallCandidate[] {
        const favorites = new Set(this._favoriteGeneralIds);
        const assigned = new Set(Object.values(this._hallAssignments));
        return this._roster.getAll().map((g) => ({
            id: g.id,
            favorite: favorites.has(g.id),
            assigned: assigned.has(g.id),
        }));
    }

    /**
     * 大廳舞台用的武將檔案（UI-2-0140）：姓名、稱號、角色標籤（careerClass／role，同派遣評分）與情緒。
     * 名冊目前沒有情緒欄位時以 NORMAL 處理，自告奮勇標記（需 EAGER）不會出現。
     */
    public hallStageProfile(generalId: string): HallStageProfile | null {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general) return null;
        const raw = general as unknown as Record<string, unknown>;
        const roleTags = [raw.careerClass, raw.role].filter((t): t is string => typeof t === 'string' && t.length > 0);
        const mood = typeof raw.mood === 'string' && raw.mood.length > 0 ? raw.mood : 'NORMAL';
        return { name: general.name, title: general.title ?? null, roleTags, mood };
    }

    /** 目前點位上的在場名單與任務標記（不觸發刷新；先呼叫 refreshHallSpots）。 */
    public hallStageCast(openTasks: readonly HallVolunteerTask[]): HallStageFeed {
        return buildHallStageFeed(this.hallSpotRows, (id) => this.hallStageProfile(id), openTasks);
    }

    /**
     * 培育學戰法（PM 2026-10-14 裁定）：TP 為武將培育中的個人 TP（NurtureSession.tp）。
     * 綠因子相符時成本 ×0.5 再 ceil；門檻 = 實際成本 ×2；通過後扣實際成本並寫入 learnedTactics。
     */
    public async learnTactic(generalId: string, tacticId: string): Promise<TacticLearnCheck> {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general) return { ok: false, blocked: 'INVALID_TACTIC', learned: [] };
        const state = this._nurture?.getState();
        const session = state?.sessions.find((s) => s.childId === generalId);
        if (!state || !session) return { ok: false, blocked: 'NOT_NURTURING', learned: [...(general.learnedTactics ?? [])] };
        // 教官系統 §F-3／§J：TP 只在畢業時兌換本場靈感觸發的戰法（PROG-2-1134）
        if (session.status !== 'completed') return { ok: false, blocked: 'NOT_GRADUATING', learned: [...(general.learnedTactics ?? [])] };
        if (!inspiredTacticIds(session).includes(tacticId)) return { ok: false, blocked: 'NOT_INSPIRED', learned: [...(general.learnedTactics ?? [])] };
        const green = hasMatchingGreenFactor(general.genes, tacticId);
        // 教官卡 TP_Bonus：帶著的教官戰法 TP 消耗減免相加（封頂），乘算後進位（PROG-2-1999，暫定）
        const tpCost = Math.ceil(applyPassiveSave(learnTpCost(getTacticTpCost(tacticId), green), totalTacticTpDiscount(session.mentors)));
        const check = learnTacticInto(general.learnedTactics ?? [], tacticId, battleIntelligenceOf(general), session.tp, tpCost);
        if (!check.ok) return check;
        this._nurture!.restoreState({
            ...state,
            sessions: state.sessions.map((s) => (s.childId === generalId ? { ...s, tp: s.tp - tpCost } : s)),
        });
        this._roster.replaceAll(this._roster.getAll().map((g) => (g.id === generalId ? { ...g, learnedTactics: check.learned } : g)));
        if (this._autoSave && this._save) {
            await this.save();
        }
        return check;
    }

    /** 目前的趕路倒數（複本）；沒有趕路中的角色時為 null。 */
    public get countdown(): CountdownState | null {
        return this._countdown ? { ...this._countdown } : null;
    }

    /** 目前的回合制趕路（複本）；沒有趕路中的角色時為 null。 */
    public get travel(): TravelCountdown | null {
        return this._travel ? { ...this._travel } : null;
    }

    /** 開始回合制趕路（接取天下沙盤遠征等事件呼叫）；會覆蓋目前的趕路。 */
    public startTravel(targetId: string, turns: number): void {
        this._travel = createTravelCountdown(targetId, turns + seasonModifiersOf(this._clock.state.currentSeason).travelTurnsDelta);
        this._emit(GAME_SESSION_EVENTS.TravelChanged, this.travel);
    }

    /** 推進一季：趕路回合減一，歸零即到達並清除。沒有趕路時不動作。 */
    private _tickTravel(): void {
        if (!this._travel) return;
        const next = tickTravelCountdown(this._travel);
        this._travel = next.remainingTurns > 0 ? next : null;
        this._emit(GAME_SESSION_EVENTS.TravelChanged, this.travel);
    }

    /** 開始趕路倒數（由行軍 / 招募事件呼叫）；會覆蓋目前的倒數。 */
    public startCountdown(state: Readonly<CountdownState>): void {
        this._countdown = { ...state };
        this._emit(GAME_SESSION_EVENTS.CountdownChanged, this.countdown);
    }

    /** 清除趕路倒數（角色已抵達並由畫面確認後呼叫）。 */
    public clearCountdown(): void {
        this._countdown = null;
        this._emit(GAME_SESSION_EVENTS.CountdownChanged, null);
    }

    public get sortieSupport(): SortieSupport {
        return { ...this._sortieSupport };
    }

    /** 編制預設（DEP-14）的目前內容；回傳副本 */
    public get sortiePresets(): Record<string, SortieSupport> {
        return { ...this._sortiePresets };
    }

    /** 整批寫入編制預設（DEP-14）；有存檔服務時立刻存檔，不等下一次存檔（PROG-2-0791） */
    public async setSortiePresets(store: Readonly<Record<string, SortieSupport>>): Promise<void> {
        this._sortiePresets = { ...store };
        if (this._autoSave && this._save) await this.save();
    }

    /**
     * 指定出征支援（參謀官 / 後勤官，null = 不派）。
     * 角色鎖、同名血統、可出戰檢查不通過時不變更並回傳問題清單（PROG-2-0083）。
     */
    public setSortieSupport(strategistUid: string | null, deputyUid: string | null, commanderUid: string | null = this._leadGeneralId): SortieLoadoutCheck {
        const check = this._checkSortieSupport(commanderUid, strategistUid, deputyUid);
        if (!check.ok) return check;
        this._sortieSupport = { strategistUid, deputyUid };
        this._emit(GAME_SESSION_EVENTS.SortieSupportChanged, this.sortieSupport);
        return check;
    }

    /** 某主將出征時實際生效的支援與加成；失效的支援（不能出戰、與主將撞角色或血統）視為不派 */
    public getSortieSupportSummary(commanderUid: string): SortieSupportSummary {
        const deployable = this.getDeployableGenerals();
        const members = deployable.map(toSortieMember);
        const byId = new Map(deployable.map((g) => [g.id, g]));
        const pick = (uid: string | null): GeneralConfig | null => (uid && uid !== commanderUid ? byId.get(uid) ?? null : null);
        const fits = (st: GeneralConfig | null, dp: GeneralConfig | null): boolean =>
            validateSortieLoadout({ commanderUid, strategistUid: st?.id ?? null, deputyUid: dp?.id ?? null }, members).ok;
        let strategist = pick(this._sortieSupport.strategistUid);
        if (strategist && !fits(strategist, null)) strategist = null;
        let deputy = pick(this._sortieSupport.deputyUid);
        if (deputy && !fits(strategist, deputy)) deputy = null;
        return {
            strategist,
            deputy,
            strategistBonus: getStrategistBonus(strategist ? toSortieMember(strategist) : null),
            deputyBonus: getDeputyFoodBonus(deputy ? toSortieMember(deputy) : null, this._military.food),
        };
    }

    private _checkSortieSupport(commanderUid: string | null, strategistUid: string | null, deputyUid: string | null): SortieLoadoutCheck {
        const members = this.getDeployableGenerals().map(toSortieMember);
        return validateSortieLoadout({ commanderUid: commanderUid ?? '', strategistUid, deputyUid }, members);
    }

    /** 進戰場的我軍主將：指定的主將還能出戰就用它，否則用 fallbackId（遭遇戰預設） */
    public resolveLeadGeneralId(fallbackId: string): string {
        const lead = this._leadGeneralId;
        return lead && this.checkDeployable(lead).eligible ? lead : fallbackId;
    }

    /** 戰場建立我軍主將時查詢：名冊內可出戰才回傳戰場用設定，否則 null（沿用內建 / JSON 武將） */
    public getBattleConfig(generalId: string, faction: GeneralConfig['faction']): GeneralConfig | null {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general || !this.checkDeployable(generalId).eligible) {
            return null;
        }
        return buildBattleConfig(general, faction);
    }

    /** 直接指定等級（除錯 / 劇情獎勵）；等級內經驗歸零 */
    public async setDiscoveryLevel(level: number): Promise<void> {
        const progress = normalizeDiscoveryProgress(level, 0);
        this._discoveryLevel = progress.level;
        this._discoveryExp = progress.exp;
        if (this._autoSave && this._save) {
            await this.save();
        }
    }

    /** 加覺醒經驗（戰場結算、培育畢業）；升級時廣播 DiscoveryLevelChanged，並自動存檔 */
    public async gainDiscoveryExp(source: DiscoveryExpSource, amount?: number): Promise<DiscoveryGain> {
        const gain = this._applyDiscoveryExp(source, amount);
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emitDiscoveryGain(gain);
        return gain;
    }

    /**
     * 給 NurtureService 的覺醒掛鉤：讀目前 discoveryLevel，覺醒成功時廣播 FactorAwakened。
     * 名冊已由 NurtureService 寫回，存檔交給培育流程每回合的存檔。
     */
    public nurtureAwakeningHooks(): NurtureAwakeningHooks {
        return {
            discoveryLevel: () => this._discoveryLevel,
            onAwakened: (event) => this._emit(GAME_SESSION_EVENTS.FactorAwakened, event),
        };
    }

    /**
     * 血脈歸宗（BLT-11）：V1 取得 V2 的一個因子，V2 記為已歸宗；成功扣 1 張歸宗令（PROG-2-0862）。
     * 失敗回傳原因、不改名冊、不扣歸宗令；成功才改名冊、扣令、存檔。
     */
    public async mergeBloodlineFor(
        v1Id: string,
        v2Id: string,
    ): Promise<{ ok: true; transferredFactor: string } | { ok: false; reason: BloodlineMergeRejectReason | 'NOT_FOUND' | 'NO_MERGE_TOKEN' }> {
        const roster = this._roster.getAll();
        const v1 = roster.find((g) => g.id === v1Id);
        const v2 = roster.find((g) => g.id === v2Id);
        if (!v1 || !v2) return { ok: false, reason: 'NOT_FOUND' };
        const plan = planBloodlineMergeForGenerals(v1, v2);
        if (!plan.ok) return plan;
        const inventory = consumeItem(this._inventory, ITEM_MERGE_TOKEN);
        if (!inventory) return { ok: false, reason: 'NO_MERGE_TOKEN' };
        const v2Gene = (v2.genes ?? []).find((g) => g.id === plan.transferredFactor);
        const updated = roster.map((g) => {
            if (g.id === v1Id) return { ...g, genes: [...(g.genes ?? []), ...(v2Gene ? [{ ...v2Gene }] : [])] };
            if (g.id === v2Id) return { ...g, mergedOutFactors: plan.v2MergedOut };
            return g;
        });
        this._roster.replaceAll(updated);
        this._inventory = inventory;
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { ok: true, transferredFactor: plan.transferredFactor };
    }

    /** 重複卡升星進度（PROG-2-2194）；不在名冊或已滿 ★5 回 null */
    public starUpProgress(generalId: string): { stars: number; cards: number; need: number } | null {
        const target = this._roster.getAll().find((g) => g.id === generalId);
        if (!target) return null;
        return templateCardStarUpProgress(target.bloodlineUltimate?.stageCap ?? 1, target.starUpCards ?? 0);
    }

    /** 投入一張同名卡升星（PROG-2-2194）；集滿就提高星級並廣播上限提升。無法升星回 null。 */
    public async addStarUpCard(generalId: string): Promise<{ stars: number; cards: number; raised: boolean } | null> {
        const progress = this.starUpProgress(generalId);
        if (!progress) return null;
        const next = addTemplateCard(progress.stars, progress.cards);
        this._roster.replaceAll(this._roster.getAll().map((g) => (g.id === generalId ? { ...g, starUpCards: next.cards } : g)));
        if (next.raised) await this.raiseBloodlineUltimateCap(generalId, next.stars);
        else if (this._autoSave && this._save) await this.save();
        return next;
    }

    /** 升星後提高某位武將五階奧義的 Stage_Cap（PROG-2-0718）；找不到武將回傳 false，成功才改名冊並存檔；上限確實提高才廣播過場事件 */
    public async raiseBloodlineUltimateCap(generalId: string, stars: number): Promise<boolean> {
        const roster = this._roster.getAll();
        const target = roster.find((g) => g.id === generalId);
        if (!target) return false;
        const raised = raiseBloodlineUltimateCap(target, stars);
        this._roster.replaceAll(roster.map((g) => (g.id === generalId ? raised : g)));
        if (this._autoSave && this._save) {
            await this.save();
        }
        const stageCapBefore = target.bloodlineUltimate?.stageCap ?? 1;
        const stageCap = raised.bloodlineUltimate?.stageCap ?? 1;
        if (stageCap > stageCapBefore) {
            const payload: BloodlineStageCapRaisedPayload = { generalId, stageCapBefore, stageCap };
            this._emit(GAME_SESSION_EVENTS.BloodlineStageCapRaised, payload);
        }
        return true;
    }

    /** 覺醒某位武將的五階奧義下一階（PROG-2-0718）；條件不足回傳原因且不改名冊，成功才改名冊並存檔 */
    public async awakenBloodlineUltimate(
        generalId: string,
    ): Promise<{ ok: true; awakenedStage: number } | { ok: false; reason: UltimateAwakenReason | 'GENERAL_NOT_FOUND' }> {
        const roster = this._roster.getAll();
        const target = roster.find((g) => g.id === generalId);
        if (!target) return { ok: false, reason: 'GENERAL_NOT_FOUND' };
        const progress = ultimateProgressFromBattleRecord((target as { battleRecord?: BattleRecordLike }).battleRecord);
        const result = awakenBloodlineUltimate(target, progress);
        if (result.ok === false) return result;
        this._roster.replaceAll(roster.map((g) => (g.id === generalId ? result.general : g)));
        if (this._autoSave && this._save) {
            await this.save();
        }
        const payload: BloodlineStageAwakenedPayload = { generalId, awakenedStage: result.awakenedStage };
        this._emit(GAME_SESSION_EVENTS.BloodlineStageAwakened, payload);
        return { ok: true, awakenedStage: result.awakenedStage };
    }

    /** 設定 NPC 好友教官清單（MENT-14 MVP）；ServiceLoader 載入資料表後呼叫 */
    public setNpcFriendMentors(list: readonly NpcFriendMentor[]): void {
        this._npcFriendMentors = [...list];
    }

    public get npcFriendMentors(): readonly NpcFriendMentor[] {
        return this._npcFriendMentors;
    }

    /**
     * 借用好友的教官（MENT-14 MVP）：找不到好友回 UNKNOWN_FRIEND；規則不過回傳原因且不改紀錄；
     * 成功寫入借用紀錄並回傳原主結義點數（由呼叫端決定如何入帳）。day 由呼叫端傳入（YYYY-MM-DD）。
     */
    /** 借將畫面的可借性檢查：與 borrowFriendMentor 用同一組規則，回傳 null 代表可借，否則是擋下原因（不改紀錄） */
    public borrowBlockFor(friend: NpcFriendMentor, sessionId: string): BorrowBlockReason | null {
        const check = canBorrow(this._borrowLedger, {
            day: `S${this._clock.state.totalSeasonsElapsed}`,
            borrowerId: 'player',
            ownerId: friend.friendId,
            candidate: borrowCandidateOf(friend),
            sessionId,
            recordId: '',
        });
        if (check.ok === false) return check.blocked;
        return null;
    }

    public async borrowFriendMentor(request: { friendId: string; sessionId: string; recordId: string }):
        Promise<{ ok: true; ownerBondReward: number } | { ok: false; blocked: BorrowBlockReason | 'UNKNOWN_FRIEND' }> {
        const friend = this._npcFriendMentors.find((f) => f.friendId === request.friendId);
        if (!friend) return { ok: false, blocked: 'UNKNOWN_FRIEND' };
        const borrowRequest: BorrowRequest = {
            // 借用日由遊戲時鐘提供（PROG-2-0745，暫定：以季為一日）
            day: `S${this._clock.state.totalSeasonsElapsed}`,
            borrowerId: 'player',
            ownerId: friend.friendId,
            candidate: borrowCandidateOf(friend),
            sessionId: request.sessionId,
            recordId: request.recordId,
        };
        const check = canBorrow(this._borrowLedger, borrowRequest);
        if (check.ok === false) return { ok: false, blocked: check.blocked };
        const outcome = createBorrow(this._borrowLedger, borrowRequest);
        if (!outcome) throw new Error('canBorrow 通過後 createBorrow 不應回傳 null');
        this._borrowLedger = outcome.ledger;
        this._bondPoints += outcome.ownerBondReward;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { ok: true, ownerBondReward: outcome.ownerBondReward };
    }

    /** 覺醒名冊中某位武將的鎖定因子；失敗回傳原因，成功才改名冊、存檔並廣播 */
    public async awakenFactor(
        generalId: string,
        factorId: string,
        trigger: AwakeningTrigger,
    ): Promise<{ ok: true; event: FactorAwakenedEvent } | { ok: false; reason: AwakeningFailReason }> {
        const roster = this._roster.getAll();
        const result = awakenFactor(roster.find((g) => g.id === generalId), factorId, trigger, this._discoveryLevel);
        if (!result.ok) {
            return result;
        }
        this._roster.replaceAll(roster.map((g) => (g.id === generalId ? result.general : g)));
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.FactorAwakened, result.event);
        return { ok: true, event: result.event };
    }

    /**
     * 名士占卜：依名士偏好與準確率覺醒名冊中某位武將的一個鎖定因子。
     * 沒有求籤令時不擲骰（outcome = no-token）；有擲骰（consumed）才扣 1 張求籤令並存檔，
     * 覺醒成功才改名冊並廣播 FactorAwakened。
     */
    public async divineFactor(generalId: string, sageId: string): Promise<SageDivinationResult> {
        if (!this.isSageUnlocked(sageId)) {
            return { sageId, outcome: getSage(sageId) ? 'sage-locked' : 'no-such-sage', hintColor: null, consumed: false };
        }
        if (this.itemCount(ITEM_ORACLE_TOKEN) < 1) {
            return { sageId, outcome: 'no-token', hintColor: null, consumed: false };
        }
        const roster = this._roster.getAll();
        const result = divineFactor(roster.find((g) => g.id === generalId), sageId, this._discoveryLevel, this._random);
        if (result.outcome === 'awakened' && result.general) {
            const general = result.general;
            this._roster.replaceAll(roster.map((g) => (g.id === generalId ? general : g)));
        }
        if (result.consumed) {
            await this._spendOracleToken();
        }
        if (result.event) {
            this._emit(GAME_SESSION_EVENTS.FactorAwakened, result.event);
        }
        // 祖輩顯靈（ORAC-08，PROG-2-1981）：擲骰之後才附上，純敘事、不動準確率與擲骰順序
        if (result.consumed) {
            return { ...result, apparition: apparitionForDivination(roster.find((g) => g.id === generalId), roster) };
        }
        return result;
    }

    /**
     * 名士預言：結緣前依父母祖譜的因子池（BreedingService.previewFactorPool）預測子嗣的色彩傾向與關鍵詞。
     * 名士未解鎖或沒有求籤令時不擲骰；有預言才扣 1 張求籤令、累計占卜次數並存檔。
     */
    public async predictOffspring(pool: readonly FactorPoolEntry[], sageId: string): Promise<ProphecyResult> {
        if (!this.isSageUnlocked(sageId)) {
            return { sageId, outcome: getSage(sageId) ? 'sage-locked' : 'no-such-sage', consumed: false };
        }
        if (this.itemCount(ITEM_ORACLE_TOKEN) < 1) {
            return { sageId, outcome: 'no-token', consumed: false };
        }
        const result = predictOffspring(pool, sageId, this._random, this._prophecyKeywordSources());
        if (result.consumed) {
            await this._spendOracleToken();
        }
        return result;
    }

    /** 扣 1 張求籤令、累計占卜次數、存檔並廣播庫存變動 */
    private async _spendOracleToken(): Promise<void> {
        this._inventory = consumeItem(this._inventory, ITEM_ORACLE_TOKEN) ?? this._inventory;
        this._oracleCount += 1;
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
    }

    public isPedigreeProbed(fatherId: string, motherId: string): boolean {
        return this._pedigreeProbes.indexOf(pedigreeProbeKey(fatherId, motherId)) >= 0;
    }

    /** 譜牒密考：同一對只收一次；不是占卜，不累計占卜次數。求籤令不足時回傳 false */
    public async probePedigree(fatherId: string, motherId: string): Promise<boolean> {
        if (this.isPedigreeProbed(fatherId, motherId)) return true;
        return this._payOracleProbe(PEDIGREE_PROBE_COST, () => {
            this._pedigreeProbes = [...this._pedigreeProbes, pedigreeProbeKey(fatherId, motherId)];
        });
    }

    public isHiddenLineageProbed(fatherId: string, motherId: string): boolean {
        return this._hiddenLineageProbes.indexOf(pedigreeProbeKey(fatherId, motherId)) >= 0;
    }

    /** 隱藏血脈：與譜牒密考各自收費；同一對只收一次。求籤令不足時回傳 false（PROG-2-1833） */
    public async probeHiddenLineage(fatherId: string, motherId: string): Promise<boolean> {
        if (this.isHiddenLineageProbed(fatherId, motherId)) return true;
        return this._payOracleProbe(HIDDEN_LINEAGE_COST, () => {
            this._hiddenLineageProbes = [...this._hiddenLineageProbes, pedigreeProbeKey(fatherId, motherId)];
        });
    }

    public isStatProbed(generalId: string, stat: RumorStatKey): boolean {
        return this._statProbes.indexOf(statProbeKey(generalId, stat)) >= 0;
    }

    /** 單維細查：同一人同一維只收一次；求籤令不足時回傳 false（PROG-2-1834） */
    public async probeStat(generalId: string, stat: RumorStatKey): Promise<boolean> {
        if (this.isStatProbed(generalId, stat)) return true;
        return this._payOracleProbe(STAT_PROBE_COST, () => {
            this._statProbes = [...this._statProbes, statProbeKey(generalId, stat)];
        });
    }

    private async _payOracleProbe(cost: number, record: () => void): Promise<boolean> {
        const inventory = consumeItem(this._inventory, ITEM_ORACLE_TOKEN, cost);
        if (!inventory) return false;
        this._inventory = inventory;
        record();
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        return true;
    }

    /** 扭曲預言借用關鍵詞的因子：字典裡可判定色系的因子 */
    private _prophecyKeywordSources(): ProphecyKeywordSource[] {
        const out: ProphecyKeywordSource[] = [];
        for (const def of Array.from(this._factorDictionary?.values() ?? [])) {
            const color = resolveFactorColor(def.id, this._factorDictionary);
            if (color) out.push({ id: def.id, color, displayName: def.displayName });
        }
        return out;
    }

    /** 整組覆寫出戰卡組（以 catalogIds 過濾未知 ID、去重、截到上限）並自動存檔 */
    public async setDeck(ids: readonly string[], catalogIds?: readonly string[]): Promise<string[]> {
        this._deck = normalizeDeck(ids, catalogIds);
        await this._commitDeck();
        return this.deck;
    }

    /** 選卡 UI 點一張卡：在卡組內就移除，否則加入（滿了不變）；有變動才存檔並廣播 */
    public async toggleDeckCard(cardId: string, catalogIds: readonly string[]): Promise<DeckToggleOutcome> {
        const result = toggleDeckCard(this._deck, cardId, catalogIds);
        if (result.outcome === 'added' || result.outcome === 'removed') {
            this._deck = result.deck;
            await this._commitDeck();
        }
        return result.outcome;
    }

    /**
     * 主動指令（培育／攻城／結緣）的壽命消耗入口：更新名冊但不存檔，由呼叫端的 persist 一併存。
     * 死亡事件暫存到下一次季結。找不到武將回傳 null。
     */
    /**
     * 20 歲轉職：扣轉職令 ×1、設定副職並存檔（PROG-2-0226）。
     * 名冊找不到武將或沒有主職資料時回傳 null；條件不符時回傳 ok=false 且不扣轉職令。
     */
    public async changeJob(generalId: string, targetSubClass: JobClass): Promise<JobChangeResult | null> {
        const orders = itemCount(this._inventory, ITEM_JOB_CHANGE_ORDER);
        const applied = applyJobChangeToRoster(this._roster.getAll() as JobWiringGeneral[], generalId, targetSubClass, orders);
        if (!applied) return null;
        if (applied.result.ok) {
            this._roster.replaceAll(applied.roster);
            this._inventory = consumeItem(this._inventory, ITEM_JOB_CHANGE_ORDER) ?? this._inventory;
            this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        }
        if (this._autoSave && this._save) {
            await this.save();
        }
        return applied.result;
    }

    public spendLifespan(generalId: string, command: LifespanCommand): ActiveLifespanResult | null {
        const current = this._roster.getAll();
        const applied = applyActiveLifespanToRoster(current, generalId, command, this._random);
        if (!applied) return null;
        this._preLifespanRoster ??= current;
        this._roster.replaceAll(applied.roster);
        for (const event of applied.result.events) {
            if (event.type === 'died') {
                this._pendingLifespanEvents.push({ type: 'died', generalId: event.generalId, age: event.age });
            }
        }
        return applied.result;
    }

    /** 動態關係互動（KIN-10）：回補親密度，有變動才自動存檔；沒有該對關係回傳空陣列 */
    public async interactDynamicRelation(uidA: string, uidB: string): Promise<DynamicRelation[]> {
        const updated = this.dynamicRelations.interact(uidA, uidB);
        if (updated.length > 0 && this._autoSave && this._save) {
            await this.save();
        }
        return updated;
    }

    /**
     * 結緣受孕後的動態關係（KIN-06 / KIN-10）：父母記為夫妻（bonding），父與母各與子嗣記為親子（parentage）。
     * 同一對同一型別只留第一筆；有新增才自動存檔。回傳三筆記錄結果（順序：夫妻、父子、母子）。
     */
    public async recordBreedingRelations(fatherUid: string, motherUid: string, childUid: string): Promise<DynamicRelationResult[]> {
        const season = this._clock.state.totalSeasonsElapsed;
        const results = [
            this.dynamicRelations.record('bonding', fatherUid, motherUid, season),
            this.dynamicRelations.record('parentage', fatherUid, childUid, season),
            this.dynamicRelations.record('parentage', motherUid, childUid, season),
        ];
        // 生下女兒時登記，年末才會長大並走及笄分流（PROG-2-1787）；子嗣出生時已在名冊
        const child = this._roster.getAll().find((g) => g.id === childUid);
        const daughterAdded = child?.gender === '女' && this._appendDaughter({ id: childUid, age: child.age ?? 0, role: null });
        if ((daughterAdded || results.some((r) => r.ok && r.created)) && this._autoSave && this._save) {
            await this.save();
        }
        return results;
    }

    /** Legacy_Count（RET-07）：跨世代成就次數，唯讀 */
    public get legacyCount(): number {
        return this._legacyCount;
    }

    /**
     * 世代成就入帳（RET-07）：獎勵加到轉蛋錢包的靈玉，次數累加，有成就才自動存檔。
     * 錢包為 null（存檔沒有）時以 STARTER_GACHA_WALLET 為基底，避免入帳後起始資源歸零。
     */
    public async applyLegacyAchievements(achievements: readonly LegacyAchievement[]): Promise<{ granted: number; legacyCount: number }> {
        if (achievements.length === 0) return { granted: 0, legacyCount: this._legacyCount };
        const { wallet, granted } = grantLegacyRewards(this._gachaWallet ?? STARTER_GACHA_WALLET, achievements);
        this._gachaWallet = normalizeGachaWalletSave(wallet);
        this._gachaRevision += 1;
        this._legacyCount += achievements.length;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { granted, legacyCount: this._legacyCount };
    }

    /** 攻城戰開戰的壽命消耗（PROG-2-0237）：扣完即存檔；武將不在名冊時回傳 null */
    public async spendSiegeLifespan(generalId: string): Promise<ActiveLifespanResult | null> {
        const result = this.spendLifespan(generalId, 'siege');
        if (result && this._autoSave && this._save) {
            await this.save();
        }
        return result;
    }

    /** 季度治理報告（領地治理 §G）：上一季內政入帳加上季結算增加的糧草與城市兵源 */
    private _buildGovernanceReport(before: MilitaryReserve, previousSeason: number): string | null {
        const gains: Partial<Record<'food' | 'gold' | 'fame' | 'cityTroops', number>> = {
            food: Math.max(0, this._military.food - before.food),
            cityTroops: Math.max(0, this._military.cityTroops - before.cityTroops),
        };
        const grant = this._domesticLog.lastSeason === previousSeason ? this._domesticLog.lastGrant : undefined;
        if (grant) gains[grant.resource] = (gains[grant.resource] ?? 0) + grant.amount;
        return governanceReportLine(gains);
    }

    /** epochMs 用來判斷月卡是否有效（月卡期間精力回復 ×1.2，VIT-08）；預設現在時間 */
    public async advanceSeason(epochMs: number = Date.now()): Promise<SeasonAdvancedPayload> {
        const advance = this._clock.advanceSeason();
        this._tickTravel();
        // 動態關係每季衰退（KIN-10）：親密度歸 0 只是加成歸零，關係保留
        this.dynamicRelations.decaySeason();
        const beforeRoster = this._roster.getAll();
        // 主動扣壽命致死的武將在 beforeRoster 已是陣亡；虎符結算要用扣壽命之前的名冊才認得出「這次才死」
        const deathBaseline = this._preLifespanRoster ?? beforeRoster;
        this._preLifespanRoster = null;
        const aging = ageGeneralsOneSeason(beforeRoster, this._random);
        const agingEvents = [...this._pendingLifespanEvents, ...aging.events];
        this._pendingLifespanEvents = [];
        const unveil = unveilDueGenerals(aging.roster as UnveilingGeneral[], {
            season: advance.current.totalSeasonsElapsed,
            dictionary: this._factorDictionary,
        });
        const recovered = recoverVitalityOneSeason(unveil.roster, advance.current.totalSeasonsElapsed - 1,
            monthlyCardVitalityMultiplier(this._monthlyCard, epochMs));
        let roster: GeneralConfig[] = advanceBreedingSeason(holdPregnancyVigor(unveil.roster, recovered)).generals;
        let lifecycle: LifecycleSettlement | undefined;
        // 生平印記要在季結歸檔前寫入，歸檔快照才帶得到（G2 §E #7）
        const newlyDead = roster
            .filter((general) => isGeneralDead(general) && !deathBaseline.some((before) => before.id === general.id && isGeneralDead(before)))
            .map((general) => general.id);
        const deathImprints = this._imprintLives(roster, newlyDead);
        roster = deathImprints.roster;
        // 季結會把死者從名冊移除，所以陣亡虎符要用移除前的名冊結算，否則真實 lifecycle 下一個都抓不到
        const rosterBeforeLifecycle = roster;
        if (this._lifecycle) {
            const settled = await this._lifecycle.settleSeason(roster, advance, agingEvents);
            roster = settled.roster;
            lifecycle = settled.settlement;
        }
        this._roster.replaceAll(roster);
        this._emitLifeImprints(deathImprints.imprinted);
        this._clearLeadIfGone();
        this._releaseGearOfInactiveGenerals();
        this._settleOpenHallAssigns(formatSeasonLabel(advance.previous));
        this._settleDeaths(deathBaseline, rosterBeforeLifecycle, advance.current.totalSeasonsElapsed);
        // 退役雙軌（SPI-01）：60 歲可主動榮譽退役；滿 65 歲仍在位的由系統強制轉教官卡
        const forcedRetirements = await this._forceRetireOverAge();
        // 陣亡或退休的武將不再佔著內政任務格
        this._governance = this._governance.filter((a) => roster.some((general) => general.id === a.generalUid && general.status !== 'dead'));
        if (this._autoGovernance) this._fillAutoGovernance();
        if (this._magistrateUid && !roster.some((general) => general.id === this._magistrateUid && general.status !== 'dead')) this._magistrateUid = null;
        this._recordSoulFragmentsFor(beforeRoster, agingEvents);
        const clanTierUp = await this._refreshClanTier();
        const beforeTokens = this._inventory;
        const tokens = grantSeasonalOracleTokens(this._inventory);
        this._inventory = tokens.inventory;
        this._recordGain(beforeTokens, 'EVENT');
        this._tallyFoodDiscountArmed = this._military.food < TALLY_SHORTAGE_FOOD_THRESHOLD;
        // 三國日報素材：缺糧（與虎符缺糧同一門檻，暫定）
        // 缺口 = 門檻 − 目前糧草（RET-05 復仇取回的基數，暫定）
        if (this._tallyFoodDiscountArmed) this.recordPlayerLog('RESOURCE_LOW', '糧草', undefined, TALLY_SHORTAGE_FOOD_THRESHOLD - this._military.food);
        const reserveBeforeSettle = this._military;
        this._military = regenMilitaryOneSeason(this._military, 1, seasonModifiersOf(advance.previous.currentSeason).foodMultiplier);
        // 監獄產出：情報累積；資源暫定折成糧草（不超過糧草上限）
        const prisonYield = prisonYieldOneSeason(this._prison.prisoners);
        this._prison = { ...this._prison, intel: this._prison.intel + prisonYield.intel };
        this._military = { ...this._military, food: Math.min(this._military.foodCap, this._military.food + prisonYield.resource) };
        const governanceReport = this._buildGovernanceReport(reserveBeforeSettle, advance.previous.totalSeasonsElapsed);
        // 無期徒刑傳家寶物掉落（EQP-09，機率暫定）
        const treasures = rollPrisonTreasureDonors(this._prison.prisoners, this._random);
        if (treasures.length > 0) {
            const beforeTreasure = this._inventory;
            this._inventory = addItem(this._inventory, ITEM_TREASURE, treasures.length);
            this._recordGain(beforeTreasure, 'DROP');
        }
        // 放走俘虜的未來來投（5%）：依 uid 查配置以初始狀態入冊；查不到配置就略過並記警告
        const futureReturns = rollFutureReturns(this._prison, advance.current.totalSeasonsElapsed, this._random);
        this._prison = futureReturns.state;
        const returning: GeneralConfig[] = [];
        for (const entry of futureReturns.returned) {
            const template = this._generalTemplates.find((general) => general.id === entry.targetUid);
            if (template) returning.push({ ...template });
            else console.warn(`[prison] 來投武將 ${entry.targetUid} 查無配置，略過`);
        }
        if (returning.length > 0) this.enrollGenerals(returning);

        this._yearAgingEvents.push(...agingEvents);
        let yearReport: YearReport | undefined;
        if (advance.yearEnded) {
            yearReport = buildYearReport(advance.previous.currentYear, this._yearAgingEvents);
            this._yearAgingEvents = [];
        }
        const comingOfAge = advance.yearEnded ? this._liveDaughters(this._tickDaughtersOneYear()) : [];
        this.applyPendingTerritoryUpgrade();
        const quarterlyReports = buildQuarterlyBattleReportRows(this._roster.getAll());
        this.recordSeasonJournal(advance.previous, quarterlyReports);
        const rivalBattles = this._tickRivals();
        // MVP 定案：一季＝傭兵一日（PROG-2-1154，使用者裁定）
        const mercenaryDay = this._tickMercenaryDay();
        const departedUids = mercenaryDay.events.filter((e) => e.type === 'departed').map((e) => e.uid);
        // 用另一條由季數與目前亂數狀態導出的序列，不消耗主亂數，既有結算的結果不變
        const governanceSeason = advance.current.totalSeasonsElapsed;
        const governanceRandom = this._governanceEventRandom ?? remarkRandomOf(`governance|${governanceSeason}|${this._seeded.snapshot().state}`);
        this._governanceEvent = rollGovernanceEvent(governanceSeason, governanceRandom);
        // 武將性格自發事件（LOOP-01）：同樣用另一條序列，不消耗主亂數；上一季沒回應的作廢
        const personalityRandom = this._seasonEventRandom ?? remarkRandomOf(`personality|${governanceSeason}|${this._seeded.snapshot().state}`);
        this._seasonPersonality = rollSeasonPersonalityEvents(this._roster.getAll(), governanceSeason, personalityRandom);
        // 三國季報（LOOP-03）：同樣用另一條序列；上一季沒抉擇的奇遇作廢
        this._seasonChronicle = this._synthesizeChronicle(governanceSeason);
        const eventNotice = this.governanceEventNotice;
        const yuedanLines = advance.yearEnded ? yuedanBannerLines(this._roster.getAll()) : [];
        const omenLines = advance.yearEnded ? this._recordChildOmens() : [];
        this._recordDeathEpitaphs(rosterBeforeLifecycle, agingEvents);
        // 新提親取代去年沒回覆的；同樣不消耗主亂數
        if (advance.yearEnded) {
            this._familySynergy = finalizeAdultChildren(this._familySynergy, this._roster.getAll());
            this._marriageProposal = rollMarriageProposal(this._roster.getAll(), this._clanTier, `suitor-${governanceSeason}`, remarkRandomOf(`marriage|${governanceSeason}|${this._seeded.snapshot().state}`), this._familySynergy);
        }
        const payload: SeasonAdvancedPayload = { ...(forcedRetirements.length > 0 ? { forcedRetirements, forcedRetirementNames: forcedRetirements.map((id) => rosterBeforeLifecycle.find((general) => general.id === id)?.name ?? id) } : {}), ...(yuedanLines.length > 0 ? { yuedanLines } : {}), ...(omenLines.length > 0 ? { omenLines } : {}), ...(this._tallyFoodDiscountArmed ? { foodLowLine: FOOD_LOW_LINE } : {}), ...(treasures.length > 0 ? { prisonTreasureLines: treasures.map((entry) => prisonTreasureLine(entry.targetName, ITEM_DISPLAY_NAMES[ITEM_TREASURE])) } : {}), ...(governanceReport ? { governanceReport } : {}), ...(eventNotice ? { governanceEventLine: eventNotice } : {}), advance, agingEvents, unveilings: unveil.events, lifecycle, oracleTokensGranted: tokens.granted, yearReport, quarterlyReports, ...(rivalBattles.length > 0 ? { rivalBattles } : {}), ...(departedUids.length > 0 ? { mercenaryDepartures: departedUids } : {}), ...(mercenaryDay.dayThreeUids.length > 0 ? { mercenaryDayThree: mercenaryDay.dayThreeUids } : {}), ...(mercenaryDay.trustUids.length > 0 ? { mercenaryTrust: mercenaryDay.trustUids } : {}) };
        if (this._autoSave && this._save) {
            await this.save();
        }

        this._emit(GAME_SESSION_EVENTS.SeasonAdvanced, payload);
        if (clanTierUp) this._emit(GAME_SESSION_EVENTS.ClanTierUp, clanTierUp);
        const eraReset = buildEraResetEvent(advance.current.totalSeasonsElapsed);
        if (eraReset) {
            // 天下大亂：官職階位、經驗與解鎖歷史保留（OFC-09，F-3）
            this._officerState = applyEraShiftToOfficerState(this._officerState);
            this._recordSandtableUnlockReached();
            this._emit(GAME_SESSION_EVENTS.EraReset, eraReset);
        }
        for (const event of unveil.events) {
            this._emit(GAME_SESSION_EVENTS.GeneralUnveiled, event);
        }
        for (const event of aging.events) {
            const source = rosterBeforeLifecycle.find((general) => general.id === event.generalId);
            this._emit(agingEventChannel(event), source ? { ...event, generalName: source.name, generalTitle: source.title } : event);
        }
        for (const card of lifecycle?.spiritCards ?? []) {
            this._emit(GAME_SESSION_EVENTS.SpiritCardCreated, card);
        }
        if (yearReport) {
            this._emit(GAME_SESSION_EVENTS.YearEnded, yearReport);
        }
        if (comingOfAge.length > 0) {
            this._emit(GAME_SESSION_EVENTS.DaughterComingOfAge, comingOfAge);
        }
        if (advance.yearEnded && this._marriageProposal) {
            this._emit(GAME_SESSION_EVENTS.MarriageProposal, this._marriageProposal);
        }
        return payload;
    }

    /** 天下征鋒現況：本週免費次數、挑戰令、本週 BOSS 關卡、待領獎勵（PROG-2-2101） */
    public extremeTaskStatus(nowMs: number): { freeLeft: number; orders: number; stageId: string; activeStageId: string | null; pendingRewards: ExtremeTaskDrop[] } {
        return {
            freeLeft: extremeFreeAttemptsLeft(this._extremeTask, nowMs),
            orders: this.itemCount(ITEM_EXTREME_CHALLENGE_ORDER),
            stageId: extremeStageOfWeek(extremeWeekIndexOf(nowMs)),
            activeStageId: this._extremeTask.activeStageId,
            pendingRewards: this._extremeTask.rewards.map((drop) => ({ ...drop })),
        };
    }

    /** 開戰：先用每週免費次數，用完消耗 1 張極限挑戰令；開戰即扣，輸了不退。 */
    public async startExtremeTask(nowMs: number): Promise<{ ok: true; stageId: string; usedOrder: boolean } | { ok: false; reason: 'NO_ATTEMPTS' }> {
        const result = startExtremeTask(this._extremeTask, nowMs, this.itemCount(ITEM_EXTREME_CHALLENGE_ORDER));
        if (!result.ok) return result;
        if (result.usedOrder) {
            const next = consumeItem(this._inventory, ITEM_EXTREME_CHALLENGE_ORDER, 1);
            if (next === null) return { ok: false, reason: 'NO_ATTEMPTS' };
            this._inventory = next;
            this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        }
        this._extremeTask = result.state;
        if (this._autoSave && this._save) await this.save();
        return { ok: true, stageId: result.stageId, usedOrder: result.usedOrder };
    }

    /** 領走待領獎勵：金幣交給呼叫端的錢包，道具進背包；回傳領到的內容。 */
    public async claimExtremeTaskRewards(grantGold: (amount: number) => void): Promise<ExtremeTaskDrop[]> {
        const drops = this._extremeTask.rewards;
        if (drops.length === 0) return [];
        this._extremeTask = { ...this._extremeTask, rewards: [] };
        for (const drop of drops) {
            if (drop.kind === 'gold') grantGold(drop.amount);
            else await this.addItem(drop.itemId, drop.count, 'DROP');
        }
        if (this._autoSave && this._save) await this.save();
        return drops.map((drop) => ({ ...drop }));
    }

    /** 戰鬥結算時收尾進行中的極限戰：通關抽一次掉落，其他結果只清狀態；別的關卡不影響。 */
    private _settleExtremeTask(result: BattleResult, stageId: string | undefined): void {
        const active = this._extremeTask.activeStageId;
        if (active === null || stageId !== active) return;
        const rewards = [...this._extremeTask.rewards];
        if (result === 'player-win') {
            // 另開序列，不消耗主亂數，既有結算的結果不受影響
            rewards.push(rollExtremeTaskDrop(remarkRandomOf(`extreme|${this._extremeTask.weekIndex}|${this._extremeTask.attempts}|${active}`)));
        }
        this._extremeTask = { ...this._extremeTask, activeStageId: null, rewards };
    }

    /** 武將連續欠薪季數（沒有欠薪回 0） */
    public salaryArrearsOf(generalId: string): number {
        return this._salaryLedger.arrears[generalId] ?? 0;
    }

    /**
     * 每季武將薪資（RET-10）：薪資從國庫扣，欠薪者忠誠與親密各 -15，連續欠薪滿 2 季起 30% 下野。
     * 同一季只結算一次，重複呼叫回傳 null。傭兵由傭兵維持費負責，退役與陣亡者不領薪。
     *
     * 暫定：親密扣該將所有動態關係；轉蛋名將與主將不下野；下野者直接離開名冊，虎符收回。
     */
    public async settleGeneralSalaries(
        wallet: { gold: () => number; spendGold: (amount: number) => boolean },
        rollOf?: (generalId: string) => number,
    ): Promise<(SalarySettlement & { departedNames: string[] }) | null> {
        const season = this._clock.state.totalSeasonsElapsed;
        if (this._salaryLedger.lastSettledSeason === season) return null;
        const mercenaryIds = new Set<string>();
        for (const merc of this._mercenaries.mercenaries) {
            mercenaryIds.add(merc.uid);
            if (merc.generalId) mercenaryIds.add(merc.generalId);
        }
        const isGacha = (general: GeneralConfig): boolean =>
            this._tallyLoyalty[general.id]?.isGachaHero === true || general.loyaltyState?.sourceType === 'Gacha';
        const roster = this._roster.getAll();
        const payees = roster
            .filter((g) => !isGeneralDead(g) && !(g as { isMentorCard?: boolean }).isMentorCard && !mercenaryIds.has(g.id))
            .map((g) => ({ id: g.id, rank: g.generalRank ?? 0, canDesert: !isGacha(g) && g.id !== this._leadGeneralId }));
        // 下野判定另開序列，不消耗主亂數，既有結算的結果不受影響
        const roll = rollOf ?? ((id: string): number => remarkRandomOf(`salary|${season}|${id}`)());
        let settlement = settleSalaries(payees, wallet.gold(), this._salaryLedger, season, roll);
        if (settlement.totalPaid > 0 && !wallet.spendGold(settlement.totalPaid)) {
            settlement = settleSalaries(payees, 0, this._salaryLedger, season, roll);
        }
        this._salaryLedger = settlement.ledger;
        let loyaltyDropped = false;
        for (const id of settlement.unpaid) {
            this.dynamicRelations.weakenFor(id, SALARY_ARREARS_PENALTY);
            const general = roster.find((g) => g.id === id);
            if (!general || isGacha(general)) continue;
            const current = this._tallyLoyalty[id] ?? createTallyLoyaltyState(TALLY_LOYALTY_INITIAL, false);
            this._tallyLoyalty = { ...this._tallyLoyalty, [id]: { ...current, loyalty: Math.max(0, current.loyalty - SALARY_ARREARS_PENALTY) } };
            loyaltyDropped = true;
        }
        if (loyaltyDropped) this.recordPlayerLog('LOYALTY_DROP');
        const gone = new Set(settlement.departed);
        const departedNames = roster.filter((g) => gone.has(g.id)).map((g) => g.name);
        if (gone.size > 0) {
            this._roster.replaceAll(roster.filter((g) => !gone.has(g.id)));
            for (const id of settlement.departed) this._tallyHoldings = confiscateFrom(this._tallyHoldings, id).state;
            this._syncInventoryRecords();
            this._releaseGearOfInactiveGenerals();
        }
        if (this._autoSave && this._save) await this.save();
        return { ...settlement, departedNames };
    }

    /**
     * 年度推進：一直推進季，直到本年年末（第 4 季結束）為止，回傳年報。
     * 從第 1 季開始會跑滿 4 季；從中間季開始則跑到該年年末。最多推進 SEASONS_PER_YEAR 季。
     */
    public async advanceYear(): Promise<YearReport> {
        for (let i = 0; i < SEASONS_PER_YEAR; i++) {
            const payload = await this.advanceSeason();
            if (payload.yearReport) return payload.yearReport;
        }
        // 季數與 GameClock 不一致時才會走到這裡；不靜默回傳假資料
        throw new Error('advanceYear：未在 4 季內遇到年末');
    }

    /**
     * 主將已退役（變教官卡）、陣亡或不在名冊時，清掉出戰主將指派，避免大廳／出征／大廳榜單繼續指向一個出不了戰的人。
     * 只處理「永久離場」；精力不足、培育中這類暫時不能出戰的不清，玩家回來還是原主將。
     */
    /**
     * 退役功業換祠堂聲望（doc_spec_0310 §3，PROG-2-1912）：將階×500＋斬敵×50＋勝場×100。
     * 斬敵暫用戰績 kills（擊破敵部隊數），規格的「斬將」尚無獨立計數。
     */
    private _addRetirePrestige(general: GeneralConfig | undefined): ClanPrestigeChangedPayload | null {
        if (!general) return null;
        const record = (general as { battleRecord?: { wins?: number; kills?: number } }).battleRecord;
        const gain = calculatePrestigeGain({ finalRank: general.generalRank ?? 0, totalKills: record?.kills ?? 0, totalWins: record?.wins ?? 0 });
        if (gain <= 0) return null;
        const before = clanPrestigeTierOf(this._clanPrestige);
        this._clanPrestige += gain;
        const tier = clanPrestigeTierOf(this._clanPrestige);
        return { generalId: general.id, gain, prestige: this._clanPrestige, tier, tierUp: tier > before };
    }

    private _clearLeadIfGone(): boolean {
        const leadId = this._leadGeneralId;
        if (!leadId) return false;
        const lead = this._roster.getAll().find((g) => g.id === leadId) as (GeneralConfig & { isMentorCard?: boolean }) | undefined;
        if (lead && !lead.isMentorCard && !isGeneralDead(lead)) return false;
        this._leadGeneralId = null;
        this._emit(GAME_SESSION_EVENTS.LeadGeneralChanged, null);
        return true;
    }

    /**
     * 退役雙軌的系統強制線（SPI-01，PROG-2-1994）：存活、尚未退役、年齡 >= 65 的武將轉教官卡。
     * 沿用 retireGeneral（不帶因子媒介與傳家裝備對象）；單一武將退役失敗不影響其他人。回傳實際退役的 id。
     */
    private async _forceRetireOverAge(): Promise<string[]> {
        if (!this._lifecycle) return [];
        const due = this._roster.getAll()
            .filter((g) => !isGeneralDead(g) && !(g as GeneralConfig & { isMentorCard?: boolean }).isMentorCard && (g.age ?? 0) >= RETIREMENT_AGE)
            .map((g) => g.id);
        const retired: string[] = [];
        for (const id of due) {
            try {
                await this.retireGeneral(id);
                retired.push(id);
            } catch (error) {
                console.warn(`[retire] 強制退役 ${id} 失敗：${(error as Error).message}`);
            }
        }
        return retired;
    }

    /**
     * 玩家讓 60 歲以上的武將榮譽退役，轉成教官傳承資料、功業換祠堂聲望並立即存檔。
     * 可選擇一位 0~5 歲、尚未開獎的子嗣，退役時注入因子媒介（PROG-2-0865）；不選則行為與原本相同。
     * 可選擇一位存活的子嗣接收一般裝備（EQP-07，PM 暫定）；不選時裝備照舊回倉庫。
     */
    public async retireGeneral(generalId: string, options?: { catalystChildId?: string; heirChildId?: string }): Promise<MentorCard> {
        if (!this._lifecycle) {
            throw new Error('[GameSession] 尚未設定 SeasonLifecycle（setLifecycle）');
        }
        const childId = options?.catalystChildId;
        if (childId !== undefined) this._assertCatalystChild(generalId, childId);
        const heirId = options?.heirChildId;
        if (heirId !== undefined) this._assertHeir(generalId, heirId);
        const retiredSubjects = this._journalSubjects([generalId]);
        // 生平印記要在產生教官卡前寫入，卡片的因子才帶得到（G2 §E #7）
        const retireImprints = this._imprintLives(this._roster.getAll(), [generalId]);
        const forged = this._forgeCustomGold(retireImprints.roster, generalId);
        const result = await this._lifecycle.retireGeneral(forged.roster, generalId, this._clock.state);
        let roster = result.roster;
        let injection: { childId: string; injectedFactorId: string | null; consumed: boolean } | null = null;
        if (childId !== undefined) {
            const retired = roster.find((g) => g.id === generalId)! as GeneralConfig & CatalystGeneral;
            const child = roster.find((g) => g.id === childId)!;
            const outcome = injectCatalystFactor(retired, child, () => this._random());
            roster = roster.map((g): GeneralConfig => {
                if (g.id === childId) return outcome.child;
                if (g.id === generalId && outcome.consumed) return markCatalystUsed(g as GeneralConfig & CatalystGeneral);
                return g;
            });
            injection = { childId, injectedFactorId: outcome.injectedFactorId, consumed: outcome.consumed };
        }
        this._roster.replaceAll(roster);
        this._clearLeadIfGone();
        if (heirId !== undefined) this._inventoryRecords = transferGearToHeir(this._inventoryRecords, generalId, heirId);
        this._releaseGearOfInactiveGenerals();
        const reason = result.card.mentorRoute?.reason;
        if (reason === 'SCHOLAR' || reason === 'DUAL_CLASS') {
            // 文職與雙職能退役發 1 份竹簡（PM 暫定）；虎符只在死亡結算發，退役不發
            const beforeSlip = this._inventory;
            this._inventory = addItem(this._inventory, ITEM_BAMBOO_SLIP, 1);
            this._recordGain(beforeSlip, 'DROP');
        }
        // 退役不產虎符（規格 Q61=C 明文禁止，PROG-2-1020）；虎符只在陣亡結算產生
        const prestige = this._addRetirePrestige(roster.find((g) => g.id === generalId));
        if (this._autoSave && this._save) {
            await this.save();
        }
        this.recordPlayerLog('GENERAL_RETIRE');
        this._recordEventJournal('GENERAL_RETIRE', retiredSubjects);
        const retired = roster.find((g) => g.id === generalId);
        if (retired) this._recordEpitaph(retired, 'retire');
        this._emit(GAME_SESSION_EVENTS.GeneralRetired, result.card);
        if (prestige) this._emit(GAME_SESSION_EVENTS.ClanPrestigeChanged, prestige);
        this._emitLifeImprints(retireImprints.imprinted);
        if (forged.born) this._emit(GAME_SESSION_EVENTS.CustomGoldFactorBorn, forged.born);
        if (injection) this._emit(GAME_SESSION_EVENTS.GeneCatalystInjected, injection);
        return result.card;
    }

    /** 退役時凝練宗脈家傳金因子（G4 §E #2）：要在產生教官卡前寫入，卡片的因子才帶得到 */
    private _forgeCustomGold(roster: GeneralConfig[], generalId: string): { roster: GeneralConfig[]; born: CustomGoldFactorBornPayload | null } {
        const target = roster.find((general) => general.id === generalId);
        const forged = target ? forgeCustomGold(target, this._factorDictionary, this._clanTier) : null;
        if (!target || !forged) return { roster, born: null };
        this._setCustomFactors([...this._customFactors, forged.definition]);
        return {
            roster: roster.map((general) => (general.id === generalId ? forged.general : general)),
            born: { generalId, name: target.name, ep: target.ep ?? 0, factorName: forged.definition.displayName ?? forged.definition.id },
        };
    }

    /** 蓋棺論定：把生平印記寫進這些武將，回傳新名冊與要發的事件內容（G2 §E #7） */
    private _imprintLives(roster: readonly GeneralConfig[], generalIds: readonly string[]): { roster: GeneralConfig[]; imprinted: LifeImprintedPayload[] } {
        const imprinted: LifeImprintedPayload[] = [];
        const next = roster.map((general) => {
            if (!generalIds.includes(general.id)) return general;
            const result = withLifeImprints(general);
            if (result.added.length > 0) imprinted.push({ generalId: general.id, name: general.name, imprints: result.added });
            return result.general;
        });
        return { roster: next, imprinted };
    }

    /** 門第檢定：只升不降；回傳要發的升格事件，由呼叫端存檔後再發 */
    private async _refreshClanTier(): Promise<ClanTierUpPayload | null> {
        const archiver = this._lifecycle?.getArchiver?.();
        const cards = await archiver?.getAllSpiritCards() ?? [];
        const compact = await archiver?.getCompactAncestors?.() ?? [];
        const members = clanMembersOf(this._roster.getAll(), cards, this._factorDictionary, compact);
        const stats = clanStatsOf(members);
        this._raiseMilestone(milestoneStageOfClan(stats));
        const reached = clanTierOf({ ...stats, fullSynergyAllies: fullSynergyAlliesOf(this._familySynergy) });
        const payload: ClanTierUpPayload | null = reached > this._clanTier ? { oldTier: this._clanTier, newTier: reached } : null;
        if (payload) this._clanTier = reached;
        // 家風只定一次；舊存檔已是郡望世家時也在這裡補上
        if (this._clanTier >= CLAN_TRADITION_MIN_TIER && !this._clanTradition) {
            this._clanTradition = clanTraditionOf(this._roster.getAll(), this._factorDictionary);
        }
        // 堂號與家風同一階確立，也只定一次
        if (this._clanTier >= CLAN_TRADITION_MIN_TIER && !this._clanHall) {
            this._clanHall = clanHallNameOf(this._roster.getAll());
        }
        return payload;
    }

    private _emitLifeImprints(imprinted: readonly LifeImprintedPayload[]): void {
        for (const payload of imprinted) this._emit(GAME_SESSION_EVENTS.LifeImprinted, payload);
    }

    /** 裝備傳承的接收者：名冊內存活、非導師卡，且 fatherId／motherId 指向退役者（與血統圖同源） */
    private _assertHeir(generalId: string, heirId: string): void {
        const heir = this._roster.getAll().find((g) => g.id === heirId) as (GeneralConfig & { isMentorCard?: boolean; fatherId?: string; motherId?: string }) | undefined;
        const eligible = !!heir && heirId !== generalId && !heir.isMentorCard && !isGeneralDead(heir)
            && (heir.fatherId === generalId || heir.motherId === generalId);
        if (!eligible) throw new Error('[GameSession] 裝備只能傳給退役武將的存活子嗣');
    }

    /** 因子媒介的子嗣必須存在、不是退役武將本人、年齡 0~UNVEILING_AGE 且尚未開獎；不合法時拋錯，不改任何狀態 */
    private _assertCatalystChild(generalId: string, childId: string): void {
        const child = this._roster.getAll().find((g) => g.id === childId);
        const eligible = !!child
            && childId !== generalId
            && typeof child.age === 'number'
            && child.age >= 0
            && child.age <= UNVEILING_AGE
            && child.status !== GENERAL_STATUS_UNVEILED;
        if (!eligible) throw new Error('[GameSession] 因子媒介只能注入 0~5 歲、尚未開獎的子嗣');
    }

    /**
     * 抽卡 / 招募入口：把新武將寫進名冊（以 id 去重）並自動存檔。
     * 已持有的武將不會重複加入，回傳 duplicates 供 UI 提示（之後可換算成碎片）。
     */
    /** 大廳任務委任紀錄，新到舊（唯讀副本）；taskId 缺省時回傳全部 */
    public listHallAssignRecords(taskId?: string): HallAutoAssignRecord[] {
        return listAssignRecords(this._hallAssignLog, taskId);
    }

    /**
     * 委任大廳任務：由 AI 從可出戰武將中選將，寫入委任紀錄並存檔（HALL-05 / PROG-2-1006）。
     * 未開啟委任或沒有可選武將時拒絕，不寫紀錄、不存檔。
     */
    public async autoAssignHallMission(
        task: HallAutoAssignTaskInput,
        assignedAt: string,
    ): Promise<HallAutoAssignResult> {
        const candidates = this.getDeployableGenerals().map((general) => ({
            generalId: general.id,
            power: estimateSortiePower(general),
        }));
        const result = autoAssignHallTask(task, candidates, assignedAt, this._hallAssignLog);
        if (!result.ok) return result;
        this._hallAssignLog = appendAssignRecord(this._hallAssignLog, result.record);
        if (this._autoSave && this._save) {
            await this.save();
        }
        return result;
    }

    /**
     * 季結自動結算所有未結的大廳委任（PROG-2-1015，暫定）：依武將戰力判定成敗、釋放武將；
     * 紀錄帶有難度與任務牆時，同時入帳官職經驗（比照派遣即結算）。武將已不在名冊時戰力為 0，判為失敗。
     */
    private _settleOpenHallAssigns(settledAt: string): void {
        const roster = this._roster.getAll();
        const settled = settleOpenAssignsForSeason(
            this._hallAssignLog,
            (generalId) => {
                const general = roster.find((g) => g.id === generalId);
                return general ? estimateSortiePower(general) : 0;
            },
            settledAt,
        );
        this._hallAssignLog = settled.log;
        for (const entry of settled.settled) {
            this._recordEventJournal(entry.success ? 'DISPATCH_SUCCESS' : 'DISPATCH_FAIL', this._journalSubjects([entry.generalId]));
            if (entry.difficulty === undefined || entry.board === undefined) continue;
            this.settleHallMission({ difficulty: entry.difficulty, board: entry.board, success: entry.success });
            this._awardGeneralFame(entry.generalId, hallMissionFameGain({ difficulty: entry.difficulty, success: entry.success }));
        }
    }

    /** 結算同一任務最新一筆未結算的委任紀錄（結算結果由戰後系統傳入）；沒有未結算紀錄時回傳 false。 */
    public async settleHallAssign(taskId: string, outcome: HallAssignOutcome, settledAt: string): Promise<boolean> {
        const settled = settleLatestAssign(this._hallAssignLog, taskId, outcome, settledAt);
        if (!settled.ok) return false;
        this._hallAssignLog = settled.log;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return true;
    }

    /** 抽卡待補教官卡的日誌（唯讀副本） */
    public get gachaMentorJournal(): readonly GachaMentorJournalEntry[] {
        return normalizeGachaMentorJournal(this._gachaMentorJournal);
    }

    /** 抽卡入冊時登記待補的教官卡；不存檔，由呼叫端與扣款、入冊同批存檔（PROG-2-1004） */
    public queueGachaMentorDraw(entry: Omit<GachaMentorJournalEntry, 'id'>): void {
        const id = `${entry.poolId ?? ''}|${entry.time.currentYear}Q${entry.time.currentSeason}|${entry.drawn.map((general) => general.id).join(',')}`;
        this._gachaMentorJournal = [...this._gachaMentorJournal, ...normalizeGachaMentorJournal([{ ...entry, id }])];
    }

    /** 教官卡已寫入：移除一筆同 id 的日誌（只移除第一筆，同批重複抽到時逐筆處理） */
    public completeGachaMentorDraw(id: string): void {
        const index = this._gachaMentorJournal.findIndex((entry) => entry.id === id);
        if (index < 0) return;
        this._gachaMentorJournal = this._gachaMentorJournal.filter((_, i) => i !== index);
    }

    /** 重複卡要跳分流彈窗的武將 id：已結義傭兵自動二轉，不在其中（MERC-09） */
    public duplicatePopupOwnedIds(): Set<string> {
        return duplicatePopupGeneralIds(
            this._roster.getAll().map((general) => general.id),
            bondedMercenaryGeneralIds(this._mercenaries.mercenaries),
        );
    }

    public async addGenerals(generals: GeneralConfig[], options: AddGeneralsOptions = {}): Promise<AddGeneralsResult> {
        const result = this.enrollGenerals(generals, options);
        if (result.added.length > 0 || result.rebirths.length > 0) {
            if (this._autoSave && this._save) {
                await this.save();
            }
        }
        return result;
    }

    /**
     * 同步入冊（不存檔）：轉蛋要把「扣款、保底、入冊」併進同一次存檔時使用，呼叫端負責存檔。
     * 入冊有新武將時發出 RosterChanged。
     */
    public enrollGenerals(generals: GeneralConfig[], options: AddGeneralsOptions = {}): AddGeneralsResult {
        const owned = new Set(this._roster.getAll().map((general) => general.id));
        const added: GeneralConfig[] = [];
        const duplicates: GeneralConfig[] = [];
        const rebirths: Array<RebirthPullResult & { id: string }> = [];
        let bondPointsGained = 0;
        for (const general of normalizeRosterRoles(generals)) {
            if (!general || typeof general.id !== 'string') {
                continue;
            }
            if (owned.has(general.id)) {
                duplicates.push(general);
                continue;
            }
            owned.add(general.id);
            const enrolled = withFamousClanBonus(general);
            added.push(options.rebirthOnDuplicate ? this._withPulledTactics({ ...enrolled }) : { ...enrolled });
        }

        if (options.rebirthOnDuplicate && duplicates.length > 0) {
            // 同一批可能抽到同名多次，逐筆依序累加轉數
            // 同一批先抽到的新武將還在 added 裡、尚未進名冊，批內第二張也要算重複（與跨批一致）
            const roster = this._roster.getAll();
            const byId = new Map([...roster, ...added].map((general) => [general.id, general]));
            const bondedMercenaries = bondedMercenaryGeneralIds(this._mercenaries.mercenaries);
            for (const duplicate of duplicates) {
                const target = byId.get(duplicate.id);
                if (!target) continue;
                const pull = applyDuplicatePull(target.rebirthCount);
                byId.set(duplicate.id, {
                    ...this._withPulledTactics(target),
                    rebirthCount: pull.rebirthCount,
                    ultimateSlots: withUltimateUnlockState(target.ultimateSlots ?? [], pull.rebirthCount),
                });
                rebirths.push(bondedMercenaries.has(duplicate.id)
                    ? { id: duplicate.id, ...pull, mercenaryStatCap: mercenaryRebirthStatCap(pull.rebirthCount) }
                    : { id: duplicate.id, ...pull });
                if (pull.overflow) {
                    bondPointsGained += overflowBondPoints(overflowRarityOf(target));
                }
            }
            if (rebirths.length > 0) {
                this._roster.replaceAll(roster.map((general) => byId.get(general.id) ?? general));
                for (let i = 0; i < added.length; i++) added[i] = byId.get(added[i].id) ?? added[i];
            }
            this._bondPoints += bondPointsGained;
        }

        if (options.fromGacha) {
            for (const general of added) {
                if (this._tallyLoyalty[general.id]) continue;
                this._tallyLoyalty = { ...this._tallyLoyalty, [general.id]: createTallyLoyaltyState(TALLY_LOYALTY_INITIAL, true) };
            }
        }
        if (added.length > 0) {
            this._roster.replaceAll([...this._roster.getAll(), ...added]);
        }
        if (added.length > 0) {
            this._emit(GAME_SESSION_EVENTS.RosterChanged, added);
        }
        // 三國日報素材（暫定判定）：轉蛋抽到新武將算成功，全是重複算失敗
        if (options.rebirthOnDuplicate && (added.length > 0 || duplicates.length > 0)) {
            this.recordPlayerLog(added.length > 0 ? 'GACHA_SUCCESS' : 'GACHA_FAIL');
        }
        return { added, duplicates, rebirths, bondPointsGained };
    }

    /** 轉蛋戰法隨機化（PROG-2-1168）：每次抽到同名武將擲第 2、第 3 戰法，重複轉戰法經驗 */
    private _withPulledTactics(general: GeneralConfig): GeneralConfig {
        const pulled = randomizePulledTactics(general, this._random);
        return { ...general, tacticSlots: pulled.tacticSlots, tacticExp: pulled.tacticExp };
    }

    /** 目前名冊中可以出戰的武將（排除死亡、退役教官、未畢業子嗣、精力不足、培育中） */
    public getDeployableGenerals(): GeneralConfig[] {
        return listDeployable(this._roster.getAll(), { nurturingIds: this._nurturingIds() });
    }

    public checkDeployable(generalId: string): DeployCheck {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general) {
            return { eligible: false, reasons: [] };
        }
        return checkDeployable(general, { nurturingIds: this._nurturingIds() });
    }

    /** 試用傭兵出戰：deployedIds 內的試用傭兵寫入場數與勝場；結義或到期的傭兵不動，ongoing 不計。 */
    private _recordTrialMercenaryBattles(deployedIds: readonly string[], result: BattleResult): boolean {
        const outcome = outcomeOf(result);
        if (!outcome) return false;
        let changed = false;
        const mercenaries = this._mercenaries.mercenaries.map((m) => {
            if (!deployedIds.includes(m.uid)) return m;
            const next = recordTrialBattle(m, outcome);
            if (next !== m) changed = true;
            return next;
        });
        if (changed) this._mercenaries = { ...this._mercenaries, mercenaries };
        return changed;
    }

    /**
     * 戰後結算：出戰武將扣精力、記戰績與功勳，給玩家覺醒經驗，再為每位出戰武將擲一次戰場覺醒；
     * 寫回名冊並存檔。名冊裡找不到的 id（例如內建 demo 武將）略過；ongoing 不結算。
     * 覺醒用的是加完經驗後的 discoveryLevel。
     */
    public async recordBattle(
        deployedIds: readonly string[],
        result: BattleResult,
        options: RecordBattleOptions = {},
    ): Promise<BattleRecordResult> {
        // 連勝連敗計數（AIS-11）：每場正式戰鬥結算一次
        if (result === 'player-win' || result === 'enemy-win' || result === 'draw') {
            this._aiAdaptiveStreak = nextAiAdaptiveStreak(this._aiAdaptiveStreak, result);
        }
        // 勝利才記通關；同一關重複通關不會重複記入
        const clearedBefore = this._clearedStageIds.length;
        const beforeRoster = this._roster.getAll();
        this._settleExtremeTask(result, options.stageId);
        if (result === 'player-win' && options.stageId && !isExtremeStage(options.stageId)) {
            this._clearedStageIds = normalizeClearedStageIds([...this._clearedStageIds, options.stageId]);
        }
        const clearChanged = this._clearedStageIds.length !== clearedBefore;
        if (result === 'player-win' && options.teachingSpirit) this.completeTeachingBattle(options.teachingSpirit);
        const firstClear = result === 'player-win' && !this._firstBattleCleared;
        if (firstClear) this._firstBattleCleared = true;
        const tallyChanged = this._settleTallyBattleExp(options.deployedTallyIds ?? [], result);
        // 戰功入帳官職經驗（官職系統 E-2，PROG-2-1619 暫定）：正式勝敗以「一般難度軍事任務」計，勝 19、敗 7
        let officerChanged = false;
        if (result === 'player-win' || result === 'enemy-win') {
            const promoted = this.gainOfficerExp({ ...BATTLE_MERIT_OFFICER_TASK, success: result === 'player-win' });
            officerChanged = true;
            if (promoted.length > 0) this._emit(GAME_SESSION_EVENTS.OfficerPromoted, { tiers: promoted });
        }
        if (result === 'player-win' || result === 'enemy-win') {
            this.recordPlayerLog(result === 'player-win' ? 'BATTLE_WIN' : 'BATTLE_LOSE');
            this._recordEventJournal(result === 'player-win' ? 'BATTLE_WIN' : 'BATTLE_LOSE', this._journalSubjects(deployedIds));
        }
        const comradeChanged = this._recordBattleComrades(result, Boolean(options.sortie));
        const mercenaryChanged = this._recordTrialMercenaryBattles(deployedIds, result);
        const settlement = settleBattle(this._roster.getAll(), {
            deployedIds,
            result,
            season: this._clock.state.totalSeasonsElapsed,
            seasonId: pvpSeasonIdOf(this._clock.state.totalSeasonsElapsed),
            performance: options.performance,
            vitalityAfterBattle: options.vitalityAfterBattle,
        });
        // 新達成的里程碑發獎勵（千人斬等戰法筆記，GEN-13 / PROG-2-0817）；每個里程碑只在首次達成時發
        const milestoneRewards = settlement.entries.flatMap((entry) => rewardsForMilestones(entry.newMilestones));
        if (settlement.entries.length > 0) {
            const battleId = `B${++this._battleSerial}`;
            const battleDate = `${this.gameTime.currentYear}Q${this.gameTime.currentSeason}`;
            this._lastBattleSnapshots = settlement.entries.map((entry) =>
                buildBattleSnapshot(battleId, entry.generalId, entry.performance ?? EMPTY_PERFORMANCE, entry.outcome === 'win', battleDate));
        }
        const beforeMilestone = this._inventory;
        this._inventory = grantTacticNotes(this._inventory, milestoneRewards);
        this._recordGain(beforeMilestone, 'TASK');
        if (settlement.entries.length === 0) {
            if ((clearChanged || firstClear || tallyChanged || comradeChanged || mercenaryChanged || officerChanged) && this._autoSave && this._save) {
                await this.save();
            }
            if (firstClear) this._emit(GAME_SESSION_EVENTS.FirstBattleCleared, undefined);
            return { ...settlement, awakenings: [] };
        }
        if (options.sortie) {
            const foodBefore = this._military.food;
            this._military = applySortieResult(this._military, options.sortie);
            // 地窖保護（ECO-06，PROG-2-1341）：戰敗時糧草不扣到 min(戰前, 保底) 以下
            this._lastCellarProtectedFood = 0;
            if (result === 'enemy-win' && CELLAR_PROTECTION.triggerAfterFailedDefense) {
                const kept = protectedAfterLoss(foodBefore, this._military.food, CELLAR_PROTECTION.foodFloor);
                this._military = { ...this._military, food: kept.after };
                this._lastCellarProtectedFood = kept.saved;
            }
        }

        // 戰場撿拾戰後入帳（關卡設計 §I-2，PROG-2-1571）：補給轉糧草、其餘轉背包材料，戰敗不入帳
        if (options.stageSalvage) {
            const beforeSalvage = this._inventory;
            const salvage = settleStageSalvage(options.stageSalvage, result !== 'enemy-win',
                this._military.food, this._military.foodCap, this._inventory);
            this._military = { ...this._military, food: salvage.food };
            this._inventory = salvage.inventory;
            this._recordGain(beforeSalvage, 'TASK');
        }

        const source = battleExpSource(result);
        const discovery = source ? this._applyDiscoveryExp(source) : undefined;
        const special = new Set(options.specialActionIds ?? []);
        const dictionary = this._factorDictionary;
        const factorTags = dictionary ? (factorId: string) => dictionary.get(factorId)?.defaultTags : undefined;
        const awakenings: FactorAwakenedEvent[] = [];
        let roster = settlement.roster;
        // 里程碑隱藏因子（REC-06 / PROG-2-0711）：新達成的不敗／鐵壁／殺意，把白、紅因子寫進武將基因
        roster = roster.map((g) => {
            const entry = settlement.entries.find((e) => e.generalId === g.id);
            return entry ? awakenHiddenFactors(g, entry.newMilestones) : g;
        });
        // 戰傷減損（武將壽命系統 §E-1，PROG-2-1570）：重傷的出陣武將壽命上限扣 1 年
        const hpRatios = options.hpRatioAfterBattle;
        if (hpRatios) {
            roster = roster.map((g) => (g.id in hpRatios ? applyWarInjury(g, hpRatios[g.id]) : g));
        }
        // 武將名聲與將階（官職系統覆寫裁定，PROG-2-1898 暫定）：出陣武將勝 +15、敗 +5，達門檻自動升階
        const rankPromotions: GeneralRankPromotedPayload[] = [];
        const fameGain = battleFameGain(result);
        if (fameGain > 0) {
            roster = roster.map((g) => {
                if (!settlement.entries.some((e) => e.generalId === g.id)) return g;
                const gained = gainGeneralFame(g, fameGain);
                gained.promotedRanks.forEach((rank) => rankPromotions.push({ generalId: g.id, rank, title: generalRankTitle(rank) }));
                return gained.general;
            });
        }
        for (const entry of settlement.entries) {
            // Q52：單場戰鬥最多覺醒 1 個因子（PROG-2-1991）；額度用完後不再擲，也不消耗亂數
            if (!checkAwakeningQuota(awakenings.length)) break;
            const index = roster.findIndex((g) => g.id === entry.generalId);
            const actions = options.specialActions?.[entry.generalId] ?? [];
            const rolled = rollBattleAwakening(roster[index], {
                discoveryLevel: this._discoveryLevel,
                specialAction: special.has(entry.generalId) || actions.length > 0,
                actionTags: specialActionFactorTags(actions),
                factorTags,
                random: this._random,
            });
            if (rolled?.ok) {
                roster = roster.map((g, i) => (i === index ? rolled.general : g));
                awakenings.push(rolled.event);
            }
        }

        const record: BattleRecordResult = { ...settlement, roster, discovery, awakenings, ...(options.sortie ? { military: this.military } : {}) };
        this._roster.replaceAll(roster);
        this._clearLeadIfGone();
        this._settleDeaths(beforeRoster, roster, this._clock.state.totalSeasonsElapsed);
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.BattleSettled, record);
        if (firstClear) this._emit(GAME_SESSION_EVENTS.FirstBattleCleared, undefined);
        if (discovery) this._emitDiscoveryGain(discovery);
        for (const event of awakenings) {
            this._emit(GAME_SESSION_EVENTS.FactorAwakened, event);
        }
        rankPromotions.forEach((payload) => this._emit(GAME_SESSION_EVENTS.GeneralRankPromoted, payload));
        return record;
    }

    /** 名聲入帳並依門檻升將階（PROG-2-1898）；不在名冊或沒有名聲時不動。存檔由呼叫端負責。 */
    private _awardGeneralFame(generalId: string, gain: number): void {
        if (gain <= 0) return;
        const all = this._roster.getAll();
        const general = all.find((g) => g.id === generalId);
        if (!general) return;
        const gained = gainGeneralFame(general, gain);
        this._roster.replaceAll(all.map((g) => (g.id === generalId ? gained.general : g)));
        for (const rank of gained.promotedRanks) {
            this._emit(GAME_SESSION_EVENTS.GeneralRankPromoted, { generalId, rank, title: generalRankTitle(rank) });
        }
    }

    /**
     * 共鬥（戰後）：本場有使用出征編制（options.sortie）時，出征主將與參謀官／後勤官各記一筆戰友（battle-comrade）。
     * 不等多武將出戰；未出征或 ongoing 不記。回傳是否新增了任何關係（呼叫端負責存檔）。
     */
    private _recordBattleComrades(result: BattleResult, usedSortie: boolean): boolean {
        const commander = this._leadGeneralId;
        if (!usedSortie || !commander || result === 'ongoing') return false;
        const support = this.getSortieSupportSummary(commander);
        const pairs = battleComradePairs(commander, [support.strategist?.id ?? null, support.deputy?.id ?? null]);
        const season = this._clock.state.totalSeasonsElapsed;
        let changed = false;
        for (const [a, b] of pairs) {
            const recorded = this.dynamicRelations.record('battle-comrade', a, b, season);
            if (recorded.ok && recorded.created) changed = true;
        }
        return changed;
    }

    /** 點數（溢出轉化積分）唯讀值 */
    public get scorePoints(): number {
        return this._scorePoints;
    }

    /** 自動培育券數唯讀值（NUR-14） */
    public get autoNurtureTickets(): number {
        return this._autoNurtureTickets;
    }

    /** 第一次打贏戰鬥後為 true，之後不會再變回 false */
    public get firstBattleCleared(): boolean {
        return this._firstBattleCleared;
    }

    /** 第四幕紅顏該不該彈：首戰已通過且還沒展示過 */
    public get shouldShowOpeningRedFace(): boolean {
        return this._firstBattleCleared && !this._openingRedFaceShown;
    }

    /** 第四幕紅顏已展示：記下並存檔，之後不再自動彈出 */
    public async markOpeningRedFaceShown(now: number = Date.now()): Promise<void> {
        if (this._openingRedFaceShown) return;
        this._openingRedFaceShown = true;
        // 紅顏趕來：首次展示時開始趕路倒數（OPEN-11），之後離線也照常計時
        if (!this._countdown) {
            this.startCountdown(createCountdown(OPENING_TRAVEL_TARGET_ID, now, OPENING_TRAVEL_DURATION_MS, true));
        }
        if (this._autoSave && this._save) {
            await this.save();
        }
    }

    /** 主線第一次通過培育季後為 true，之後不會再變回 false */
    public get mainlineNurtureClearedOnce(): boolean {
        return this._mainlineNurtureClearedOnce;
    }

    /**
     * 自動培育（NUR-14 接線）：解鎖 → 券 → 會話（須進行中）→ 解析排程 → 扣券 → 跑完整季 → 寫回培育狀態並自動存檔。
     * 畢業仍由玩家呼叫 graduate；自動會話的評級上限已在結算時套用。
     * manualSchedule 為上一次手動排程（缺值時平均分配到最低屬性）；random 預設走存檔亂數源（Q25）。
     */
    public async runAutoNurture(
        childId: string,
        manualSchedule?: readonly NurtureAction[],
        random: RandomSource = () => this._random(),
    ): Promise<{ ok: true; logs: NurtureRoundLog[]; rites: NurtureRiteResult[] } | { ok: false; blocked: AutoNurtureBlockReason | 'NOT_NURTURING' | 'SESSION_ENDED' }> {
        const gate = canStartAutoNurture(isAutoNurtureUnlocked(this._mainlineNurtureClearedOnce), this._autoNurtureTickets);
        if (!gate.ok) return { ok: false, blocked: gate.blocked! };
        const state = this._nurture?.getState();
        const session = state?.sessions.find((s) => s.childId === childId);
        if (!state || !session) return { ok: false, blocked: 'NOT_NURTURING' };
        if (session.status !== 'active') return { ok: false, blocked: 'SESSION_ENDED' };
        const schedule = resolveAutoSchedule(session.prowess, manualSchedule);
        const run = runAutoNurtureSeason(session, schedule, random, {
            trainingVigorMultiplier: seasonModifiersOf(this._clock.state.currentSeason).trainingStaminaMultiplier,
        });
        const next = consumeAutoNurtureTicket(this._autoNurtureTickets);
        this._autoNurtureTickets = next ?? this._autoNurtureTickets;
        this._nurture!.restoreState({
            ...state,
            sessions: state.sessions.map((s) => (s.childId === childId ? run.session : s)),
        });
        const rites = this._nurture!.performDueRites?.(childId, random) ?? [];
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { ok: true, logs: run.logs, rites };
    }

    /** 入帳自動培育券（只收正整數，自動存檔） */
    public async grantAutoNurtureTickets(amount: number): Promise<number> {
        if (!Number.isInteger(amount) || amount <= 0) return this._autoNurtureTickets;
        this._autoNurtureTickets += amount;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return this._autoNurtureTickets;
    }

    /** 扣一張自動培育券（NUR-14）；券不足回傳 false 且不扣。 */
    public async consumeAutoNurtureTicket(): Promise<boolean> {
        const next = consumeAutoNurtureTicket(this._autoNurtureTickets);
        if (next === null) return false;
        this._autoNurtureTickets = next;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return true;
    }

    /** 主線通過培育季（NUR-14 解鎖）；已解鎖時不重複存檔 */
    public async markMainlineNurtureSeasonCleared(): Promise<boolean> {
        if (this._mainlineNurtureClearedOnce) return true;
        this._mainlineNurtureClearedOnce = true;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return true;
    }

    /** 入帳點數（MENT-07 溢出轉化）；負數與非整數不入帳，自動存檔時寫回 */
    public async grantScorePoints(amount: number): Promise<number> {
        if (!Number.isInteger(amount) || amount <= 0) return this._scorePoints;
        this._scorePoints += amount;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return this._scorePoints;
    }

    /**
     * 教官卡重複抽中（MENT-07）：未滿 ★5 → 突破（不入帳）；已滿 ★5 → 溢出，依稀有度入帳積分。
     * 只做判定與入帳，不改寫教官卡星等（星等由呼叫端依 result.star 保存）。
     */
    public async resolveMentorDuplicateCard(currentStar: number | undefined, rarity: string, cardName: string): Promise<MentorDuplicateOutcome & { toast: string | null }> {
        const outcome = resolveMentorDuplicate(currentStar, rarity);
        if (outcome.scoreGain > 0) await this.grantScorePoints(outcome.scoreGain);
        const toast = outcome.result.kind === 'overflow' ? overflowToastText(cardName, outcome.scoreGain) : null;
        return { ...outcome, toast };
    }

    public createSnapshot(now?: Date): PlayerSaveSnapshot {
        const pending = this._pendingLifespanEvents.map((event) => ({ generalId: event.generalId, age: event.age }));
        return {
            ...this._createBaseSnapshot(now),
            ...(this._legendaryMentoringUsedIds.length > 0 ? { legendaryMentoringUsedIds: [...this._legendaryMentoringUsedIds] } : {}),
            military: this.military,
            yearAgingEvents: this._yearAgingEvents.map((event) => ({ ...event })),
            resources: {
                fame: this._fame,
                scorePoints: this._scorePoints,
                autoNurtureTickets: this._autoNurtureTickets,
                mainlineNurtureClearedOnce: this._mainlineNurtureClearedOnce,
                firstBattleCleared: this._firstBattleCleared,
                openingRedFaceShown: this._openingRedFaceShown,
            },
            domestic: { ...this._domesticLog },
            ...(this._governanceEvent ? { governanceEvent: { ...this._governanceEvent } } : {}),
            ...(this._governanceBoosts.length > 0 ? { governanceBoosts: this._governanceBoosts.map((boost) => ({ ...boost })) } : {}),
            ...(this._seasonChronicle.season >= 0 ? { seasonChronicle: copySeasonChronicle(this._seasonChronicle) } : {}),
            ...(this._seasonPersonality.season >= 0 ? { seasonPersonality: { ...this._seasonPersonality, pending: this._seasonPersonality.pending.map((e) => ({ ...e })) } } : {}),
            rivals: this._rivals,
            prison: this.prison,
            ...(pending.length > 0 ? { pendingLifespanDeaths: pending } : {}),
            onboarding: { ...this._onboarding },
            openingLetter: { ...this._openingLetter },
            bondPoints: this._bondPoints,
            friendBorrowLedger: { records: [...this._borrowLedger.records] },
            soulFragments: { ...this._soulFragments },
            clanTier: this._clanTier,
            milestoneStage: this._milestoneStage,
            expertView: this._expertView || undefined,
            marriageProposal: this._marriageProposal ?? undefined,
            familySynergy: this._familySynergy.finalizedIds.length > 0 ? this._familySynergy : undefined,
            pedigreeProbes: this._pedigreeProbes.length > 0 ? [...this._pedigreeProbes] : undefined,
            hiddenLineageProbes: this._hiddenLineageProbes.length > 0 ? [...this._hiddenLineageProbes] : undefined,
            statProbes: this._statProbes.length > 0 ? [...this._statProbes] : undefined,
            clanTradition: this._clanTradition ?? undefined,
            clanHall: this._clanHall ?? undefined,
            customFactors: this._customFactors.map((def) => ({ ...def })),
            femaleSystem: this.femaleSystemState,
            ...(this._travel ? { travelCountdown: { ...this._travel } } : {}),
            sortiePresets: { ...this._sortiePresets },
            ...(this._breedingBirthRecords.length > 0 ? { breedingBirthRecords: this.breedingBirthRecords() } : {}),
        };
    }

    private _createBaseSnapshot(now?: Date): PlayerSaveSnapshot {
        const base = createPlayerSaveSnapshot(this._clock.state, this._roster.getAll(), now, this._nurture?.getState(), this._deck, this._leadGeneralId, this._discoveryLevel, this._seeded.snapshot(), this._discoveryExp, this._inventory, this._oracleCount, this._clearedStageIds, this._tallyLoyalty, this._tallyHoldings.holders, this._tallyCards, this._mercenaries, this._femaleSources, this._gachaPity, this._gachaWallet, this._favoriteGeneralIds, this._hallAssignments, this.dynamicRelations.snapshot(), this._legacyCount, this._officerState, this.sandtableMarkersPlaced, this._sandtableMarkerTerritories);
        const withJournal = this._gachaMentorJournal.length > 0 ? { ...base, gachaMentorJournal: normalizeGachaMentorJournal(this._gachaMentorJournal) } : base;
        const withHallLog = this._hallAssignLog.length > 0 ? { ...withJournal, hallAssignLog: normalizeHallAssignLog(this._hallAssignLog) } : withJournal;
        // 統一物件庫列只在非空時寫入；舊檔與空狀態不多一個欄位（PROG-2-1021）
        const withInventory = this._inventoryRecords.length > 0 ? { ...withHallLog, inventoryRecords: normalizeInventoryRecords(this._inventoryRecords) } : withHallLog;
        const relationEventKeys = this.relationEvents.snapshot();
        return {
            ...withInventory,
            ...this.lifespanSaveFields(),
            ...(relationEventKeys.length > 0 ? { relationEventKeys } : {}),
            ...(this._npcPlayerId ? { npcPlayerId: this._npcPlayerId } : {}),
            ...(this._npcMemory ? { npcMemory: cloneNpcMemory(this._npcMemory) } : {}),
            ...(this._countdown ? { countdown: { ...this._countdown } } : {}),
        };
    }

    /** 領地治理欄位（PROG-2-0975）：只寫入非預設值，舊檔格式與預設狀態的快照不變。 */
    private lifespanSaveFields(): Pick<PlayerSaveSnapshot, 'governanceAssignments' | 'autoGovernance' | 'magistrateUid' | 'territories' | 'journalEntries' | 'territoryLevel' | 'territoryUpgradePending' | 'farewellLetters' | 'loginStreak' | 'dailySubsidy' | 'monthlyCard' | 'officerTrial' | 'paidFeatureQuota' | 'openingOffers' | 'playerLogs' | 'dailyNews' | 'morningReport' | 'generalDispatch' | 'offlineBattleSnapshots' | 'tournament' | 'wishPool' | 'offlineInteractionLog' | 'sandtableUnlockHistory' | 'startingTalisman' | 'familySystemUnlocked' | 'openingPhase' | 'enrollGrantDay' | 'aiAdaptiveStreak' | 'itemAcquisitionLog' | 'sevenDayJourney' | 'clanPrestige' | 'infusionRecords' | 'salaryLedger' | 'extremeTask' | 'pendingSceneGambit' | 'shrineOfferingDay' | 'seasonPass'> {
        const fields: Pick<PlayerSaveSnapshot, 'governanceAssignments' | 'autoGovernance' | 'magistrateUid' | 'territories' | 'journalEntries' | 'territoryLevel' | 'territoryUpgradePending' | 'farewellLetters' | 'loginStreak' | 'dailySubsidy' | 'monthlyCard' | 'officerTrial' | 'paidFeatureQuota' | 'openingOffers' | 'playerLogs' | 'dailyNews' | 'morningReport' | 'generalDispatch' | 'offlineBattleSnapshots' | 'tournament' | 'wishPool' | 'offlineInteractionLog' | 'sandtableUnlockHistory' | 'startingTalisman' | 'familySystemUnlocked' | 'openingPhase' | 'enrollGrantDay' | 'aiAdaptiveStreak' | 'itemAcquisitionLog' | 'sevenDayJourney' | 'clanPrestige' | 'infusionRecords' | 'salaryLedger' | 'extremeTask' | 'pendingSceneGambit' | 'shrineOfferingDay' | 'seasonPass'> = {};
        if (this._magistrateUid) fields.magistrateUid = this._magistrateUid;
        if (this._territoryLevel > 1) fields.territoryLevel = this._territoryLevel;
        if (this._pendingTerritoryLevel !== null) fields.territoryUpgradePending = this._pendingTerritoryLevel;
        if (this._governance.length > 0) fields.governanceAssignments = this.governanceAssignments;
        if (this._autoGovernance) fields.autoGovernance = true;
        if (JSON.stringify(this._territories) !== JSON.stringify(defaultKeepTerritories())) fields.territories = this.territories;
        if (this._journal.entries.length > 0) {
            fields.journalEntries = this._journal.entries.map(e => ({ ...e, relatedGeneralUids: [...e.relatedGeneralUids] }));
        }
        if (this._farewellLetters.length > 0) fields.farewellLetters = this.farewellLetters;
        if (this._loginStreak.lastLoginDay !== null) fields.loginStreak = this.loginStreak;
        if (this._dailySubsidy) fields.dailySubsidy = this.dailySubsidy!;
        if (this._monthlyCard) fields.monthlyCard = { ...this._monthlyCard };
        const trial = this.activeOfficerTrial;
        if (trial) fields.officerTrial = trial;
        if (this._paidFeatureQuota.day !== null) fields.paidFeatureQuota = this._paidFeatureQuota;
        if (this._playerLogs.length > 0) fields.playerLogs = this.playerLogs;
        if (this._dailyNews.lastLoginMs !== null) fields.dailyNews = this.dailyNews;
        if (this._sevenDayJourney.firstLoginDay !== null) fields.sevenDayJourney = this.sevenDayJourney;
        if (this._morningReport.journalMark > 0 || this._morningReport.items.length > 0) fields.morningReport = this.morningReport;
        if (this._dispatch.active.length > 0 || this._dispatch.completed.length > 0 || Object.keys(this._dispatch.cooldowns).length > 0) {
            fields.generalDispatch = this.dispatchState;
        }
        if (this._offlineBattleSnapshots.length > 0) fields.offlineBattleSnapshots = this.offlineBattleSnapshots;
        if (this._tournament) fields.tournament = JSON.parse(JSON.stringify(this._tournament)) as TournamentState;
        if (this._wishPool) fields.wishPool = this.wishPool;
        if (this._offlineInteractionLog.length > 0) fields.offlineInteractionLog = this._offlineInteractionLog.slice();
        if (this._sandtableUnlockHistory.length > 0) fields.sandtableUnlockHistory = [...this._sandtableUnlockHistory];
        if (this._startingTalisman !== null) fields.startingTalisman = this.startingTalisman!;
        if (this._familySystemUnlockedFlag) fields.familySystemUnlocked = true;
        if (this._openingPhase !== null) fields.openingPhase = this._openingPhase;
        if (this._openingOffers.declined.length > 0 || this._openingOffers.purchased.length > 0) {
            fields.openingOffers = { declined: [...this._openingOffers.declined], purchased: [...this._openingOffers.purchased] };
            if (this._openingOffers.snoozeUntil !== undefined) fields.openingOffers.snoozeUntil = this._openingOffers.snoozeUntil;
        }
        if (this._enrollGrantDay !== null) fields.enrollGrantDay = this._enrollGrantDay;
        if (this._itemAcquisitionLog.length > 0) fields.itemAcquisitionLog = this._itemAcquisitionLog.slice();
        if (this._aiAdaptiveStreak.consecutiveWins > 0 || this._aiAdaptiveStreak.consecutiveLosses > 0) fields.aiAdaptiveStreak = { ...this._aiAdaptiveStreak };
        if (this._clanPrestige > 0) fields.clanPrestige = this._clanPrestige;
        if (this._infusionRecords.length > 0) fields.infusionRecords = this._infusionRecords.map((record) => ({ ...record }));
        if (this._pendingSceneGambit) fields.pendingSceneGambit = { ...this._pendingSceneGambit };
        if (this._extremeTask.weekIndex >= 0 || this._extremeTask.rewards.length > 0) fields.extremeTask = { ...this._extremeTask, rewards: this._extremeTask.rewards.map((drop) => ({ ...drop })) };
        if (this._salaryLedger.lastSettledSeason !== null) fields.salaryLedger = { arrears: { ...this._salaryLedger.arrears }, lastSettledSeason: this._salaryLedger.lastSettledSeason };
        if (this._shrineOfferingDay) fields.shrineOfferingDay = this._shrineOfferingDay;
        if (!isDefaultSeasonPassState(this._seasonPass)) fields.seasonPass = this.seasonPass;
        return fields;
    }

    /** 讀檔時還原領地治理狀態（PROG-2-0975）；缺欄位回到預設值。 */
    public restoreLifespanState(snapshot: PlayerSaveSnapshot): void {
        this._governance = normalizeGovernanceAssignments(snapshot.governanceAssignments);
        this._autoGovernance = snapshot.autoGovernance === true;
        this._magistrateUid = typeof snapshot.magistrateUid === 'string' && snapshot.magistrateUid ? snapshot.magistrateUid : null;
        this._territories = normalizeKeepTerritories(snapshot.territories);
        this._journal = { entries: normalizeJournalEntries(snapshot.journalEntries) };
        this._territoryLevel = normalizeTerritoryLevel(snapshot.territoryLevel);
        this._pendingTerritoryLevel = normalizePendingTerritoryLevel(snapshot.territoryUpgradePending) ?? null;
        this._farewellLetters = normalizeFarewellLetters(snapshot.farewellLetters);
        this._loginStreak = normalizeLoginStreak(snapshot.loginStreak);
        this._sevenDayJourney = normalizeSevenDayJourney(snapshot.sevenDayJourney);
        this._dailySubsidy = normalizeDailySubsidyRecord(snapshot.dailySubsidy);
        this._monthlyCard = normalizeMonthlyCard(snapshot.monthlyCard);
        this._playerLogs = normalizePlayerLogs(snapshot.playerLogs);
        this._dailyNews = normalizeDailyNewsState(snapshot.dailyNews);
        this._morningReport = normalizeMorningReportState(snapshot.morningReport);
        this._dispatch = normalizeDispatchState(snapshot.generalDispatch);
        this._offlineBattleSnapshots = normalizeOfflineBattleSnapshots(snapshot.offlineBattleSnapshots);
        this._tournament = normalizeTournamentState(snapshot.tournament);
        this._wishPool = normalizeWishPoolState(snapshot.wishPool);
        this._offlineInteractionLog = normalizeOfflineInteractionLog(snapshot.offlineInteractionLog);
        this._sandtableUnlockHistory = normalizeUnlockHistory(snapshot.sandtableUnlockHistory);
        this._familySystemUnlockedFlag = snapshot.familySystemUnlocked === true;
        this._recordSandtableUnlockReached();
        this._startingTalisman = normalizeStartingTalisman(snapshot.startingTalisman);
        this._openingPhase = normalizeOpeningPhaseId(snapshot.openingPhase);
        this._openingOffers = normalizeOpeningOfferState(snapshot.openingOffers);
        this._paidFeatureQuota = normalizePaidFeatureQuota(snapshot.paidFeatureQuota);
        this._enrollGrantDay = normalizeEnrollGrantDay(snapshot.enrollGrantDay);
        this._itemAcquisitionLog = normalizeAcquisitionLog(snapshot.itemAcquisitionLog);
        this._aiAdaptiveStreak = normalizeAiAdaptiveStreak(snapshot.aiAdaptiveStreak);
        this._clanPrestige = normalizeClanPrestige(snapshot.clanPrestige);
        this._infusionRecords = normalizeInfusionRecords(snapshot.infusionRecords);
        this._salaryLedger = normalizeSalaryLedger(snapshot.salaryLedger);
        this._extremeTask = normalizeExtremeTaskState(snapshot.extremeTask);
        this._pendingSceneGambit = normalizePendingSceneGambit(snapshot.pendingSceneGambit);
        this._shrineOfferingDay = normalizeShrineOfferingDay(snapshot.shrineOfferingDay);
        this._seasonPass = normalizeSeasonPassState(snapshot.seasonPass);
    }

    /**
     * 名將傳道（MENT-15）：通過判定才扣 1 張傳道令、名將記入一生一次、子嗣培育紀錄 mentoringModeLog 寫一筆。
     * 專屬奧義 id 由呼叫端提供（名將資料模型目前沒有專屬奧義欄位）。判定失敗不扣令、不寫入。
     */
    public async performLegendaryMentoringFor(
        generalId: string,
        childId: string,
        exclusiveSkillId: string | undefined,
    ): Promise<{ ok: true; skillId: string } | { ok: false; blocked: LegendaryMentoringBlock }> {
        const state = this._nurture?.getState();
        const input = {
            generalId,
            exclusiveSkillId,
            tickets: itemCount(this._inventory, ITEM_LEGENDARY_MENTORING_TICKET),
            usedGeneralIds: this._legendaryMentoringUsedIds,
            session: state?.sessions.find((s) => s.childId === childId),
        };
        const check = checkLegendaryMentoring(input);
        if (!check.ok) return { ok: false, blocked: check.blocked ?? 'NOT_NURTURING' };
        const outcome = performLegendaryMentoring(input);
        if (!state || !outcome) return { ok: false, blocked: 'NOT_NURTURING' };
        this._nurture!.restoreState({
            ...state,
            sessions: state.sessions.map((s) => (s.childId === childId ? outcome.session : s)),
        });
        this._inventory = consumeItem(this._inventory, ITEM_LEGENDARY_MENTORING_TICKET) ?? this._inventory;
        this._legendaryMentoringUsedIds = outcome.usedGeneralIds;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { ok: true, skillId: outcome.skillId };
    }

    /**
     * 血脈灌注（PROG-2-1074）：把重複卡灌入既有英靈卡。沒有掛 SeasonLifecycle（或其 archiver）時回傳 null。
     * 灌注數值由呼叫端傳入（規格未定）。不產生新本體。
     * 裁決 2026-11-08 第 16 項：同時給現役武將全屬性 +5%、專屬虎符經驗 +150、宗族聲望 +50，並寫入 INFUSION_RECORD。
     * generalId 是拿到加成的現役武將；缺值時用英靈卡 uid 對名冊。
     */
    public async infuseSpiritCard(uid: string, duplicateCardValue: number, generalId?: string): Promise<SpiritCard | null> {
        const archiver = this._lifecycle?.getArchiver?.();
        if (!archiver) return null;
        const infused = await archiver.infuseSpiritCard(uid, duplicateCardValue);
        this._applyInfusionGrant(infused, generalId ?? uid);
        if (this._autoSave && this._save) await this.save();
        return infused;
    }

    /** 武將模板目前的虎符層級 0~5（同步，戰場端用）；來自灌注帳本 */
    public tallyInfusionLevelOf(templateId: string): number {
        return tallyInfusionLevelOf(this._infusionRecords, templateId);
    }

    public get infusionRecords(): readonly InfusionRecord[] {
        return this._infusionRecords.map((record) => ({ ...record }));
    }

    private _applyInfusionGrant(card: SpiritCard, generalId: string): void {
        const roster = this._roster.getAll();
        const general = roster.find((entry) => entry.id === generalId);
        const templateId = general?.templateId ?? generalId;
        const tally = Object.values(this._tallyCards).find((entry) => entry.templateId === templateId);
        const cardHash = `${card.uid}#${card.bloodlineLevel ?? 0}`;
        const grant = bloodlineInfusionGrant(templateId, !!tally, cardHash, Date.now());

        if (general) {
            this._roster.replaceAll(roster.map((entry) => (entry === general ? applyInfusionStats(entry) : entry)));
        }
        if (tally) {
            const before = readCardStarState(tally);
            const next = addTallyExp(before, grant.tallyExp);
            if (next.star > before.star) {
                this.recordPlayerLog('TALLY_UPGRADE');
                this._tallyNotices.push(tallyStarUpSpec(this._tallyNameOf(tally), next.star, troopNameOf(tally)));
            }
            this._tallyCards = { ...this._tallyCards, [tally.uid]: { ...tally, stars: next.star, battleExp: next.exp } };
            this._syncInventoryRecords();
        }
        const tierBefore = clanPrestigeTierOf(this._clanPrestige);
        this._clanPrestige += grant.clanReputation;
        const tier = clanPrestigeTierOf(this._clanPrestige);
        this._infusionRecords = [...this._infusionRecords, { ...grant.record, linkedTallyLevel: card.linkedTallyLevel ?? 0 }];
        this._emit(GAME_SESSION_EVENTS.ClanPrestigeChanged, {
            generalId, gain: grant.clanReputation, prestige: this._clanPrestige, tier, tierUp: tier > tierBefore,
        } satisfies ClanPrestigeChangedPayload);
    }

    public async save(): Promise<PlayerSaveSnapshot> {
        const service = this._requireSave();
        const snapshot = this.createSnapshot();
        await service.save(snapshot);
        this._emit(GAME_SESSION_EVENTS.Saved, snapshot);
        return snapshot;
    }

    /** 讀取存檔並套用；沒有存檔時回傳 false，狀態維持不變 */
    public async load(): Promise<boolean> {
        const snapshot = await this._requireSave().load();
        if (!snapshot) {
            return false;
        }
        const savedAtMs = Date.parse(snapshot.savedAt);
        this._loadedSavedAtMs = Number.isFinite(savedAtMs) ? savedAtMs : null;
        this._preLifespanRoster = null;
        this._clock.restore(snapshot.gameTime);
        this._seeded.restore(snapshot.randomState ?? { algorithm: 'mulberry32-v1', state: LEGACY_RANDOM_SEED });
        this._roster.replaceAll(normalizeRosterRoles(snapshot.roster));
        this._pendingLifespanEvents = (snapshot.pendingLifespanDeaths ?? []).map((death) => ({ type: 'died', generalId: death.generalId, age: death.age }));
        // 讀檔後沒有記憶體中的季結前名冊；待季結死亡者還原為非陣亡，虎符結算才認得出「這次才死」（PROG-2-0223）
        this._preLifespanRoster = preLifespanBaseline(snapshot.roster, (snapshot.pendingLifespanDeaths ?? []).map((death) => death.generalId));
        this._nurture?.restoreState(snapshot.nurture);
        this._onboarding = normalizeOnboardingState(snapshot.onboarding);
        this._openingLetter = normalizeOpeningLetterState(snapshot.openingLetter);
        this._bondPoints = normalizeBondPoints(snapshot.bondPoints);
        this._borrowLedger = normalizeBorrowLedger(snapshot.friendBorrowLedger);
        this._soulFragments = normalizeSoulFragmentLedger(snapshot.soulFragments);
        this._clanTier = normalizeClanTier(snapshot.clanTier);
        this._milestoneStage = normalizeMilestoneStage(snapshot.milestoneStage);
        this._expertView = snapshot.expertView === true;
        this._marriageProposal = normalizeMarriageProposal(snapshot.marriageProposal);
        this._familySynergy = normalizeFamilySynergy(snapshot.familySynergy);
        this._pedigreeProbes = normalizePedigreeProbes(snapshot.pedigreeProbes);
        this._hiddenLineageProbes = normalizePedigreeProbes(snapshot.hiddenLineageProbes);
        this._statProbes = normalizePedigreeProbes(snapshot.statProbes);
        this._clanTradition = normalizeClanTradition(snapshot.clanTradition);
        this._clanHall = normalizeClanHall(snapshot.clanHall);
        this._setCustomFactors(normalizeCustomFactors(snapshot.customFactors));
        this._deck = [...snapshot.deck];
        this._leadGeneralId = snapshot.leadGeneralId ?? null;
        this._sortieSupport = { strategistUid: null, deputyUid: null };
        this._sortiePresets = normalizeSortiePresets(snapshot.sortiePresets);
        this._breedingBirthRecords = normalizeBreedingBirthRecords(snapshot.breedingBirthRecords);
        this._travel = normalizeTravelCountdown(snapshot.travelCountdown);
        this._countdown = normalizeCountdownState(snapshot.countdown);
        const progress = normalizeDiscoveryProgress(snapshot.discoveryLevel, snapshot.discoveryExp);
        this._discoveryLevel = progress.level;
        this._discoveryExp = progress.exp;
        this._inventory = normalizeInventory(snapshot.inventory);
        this._legendaryMentoringUsedIds = (snapshot.legendaryMentoringUsedIds ?? []).filter((id) => typeof id === 'string');
        this._oracleCount = snapshot.oracleCount ?? 0;
        this._clearedStageIds = normalizeClearedStageIds(snapshot.clearedStageIds);
        this._favoriteGeneralIds = normalizeFavoriteGeneralIds(snapshot.favoriteGeneralIds);
        this._hallAssignments = normalizeHallAssignments(snapshot.hallAssignments);
        this.dynamicRelations.restore(snapshot.dynamicRelations ?? []);
        this.relationEvents.restore(snapshot.relationEventKeys);
        // 舊檔沒有擁有者 id：先補產，讀檔尾端存回，之後每次讀檔都是同一個 id
        const savedNpcPlayerId = normalizeNpcPlayerId(snapshot.npcPlayerId);
        const npcIdBackfilled = savedNpcPlayerId === null;
        this._npcPlayerId = savedNpcPlayerId ?? npcPlayerIdFromSeed(Math.floor(Math.random() * 4294967296));
        this._npcMemory = normalizeNpcMemory(snapshot.npcMemory, this._npcPlayerId) ?? createNpcMemory(this._npcPlayerId);
        this._legacyCount = normalizeLegacyCount(snapshot.legacyCount);
        this._officerState = normalizeOfficerState(snapshot.officerState);
        this._officerTrial = normalizeOfficerTrial(snapshot.officerTrial);
        this._sandtableMarkerTerritories = normalizeSandtableMarkerTerritories(snapshot.sandtableMarkerTerritories);
        this.restoreLifespanState(snapshot);
        this._gachaMentorJournal = normalizeGachaMentorJournal(snapshot.gachaMentorJournal);
        this._hallAssignLog = normalizeHallAssignLog(snapshot.hallAssignLog);
        this._hallSpotState = EMPTY_HALL_SPOT_STATE;
        this._tallyLoyalty = normalizeTallyLoyaltyMap(snapshot.tallyLoyalty);
        this._tallyHoldings = { holders: normalizeTallyHoldingsMap(snapshot.tallyHoldings) };
        // 讀檔回填：舊存檔的虎符卡可能缺 troopType，依名冊武將的主兵種補上（PROG-2-0582）
        this._tallyCards = backfillTallyTroopTypes(normalizeTallyCardsMap(snapshot.tallyCards), this._roster.getAll());
        // 統一物件庫：有存列就以列為準；舊存檔沒有列時由虎符卡與持有表重建（PROG-2-1021）
        this._inventoryRecords = snapshot.inventoryRecords !== undefined
            ? normalizeInventoryRecords(snapshot.inventoryRecords)
            : buildTallyInventoryRecords(this._tallyCards, this._tallyHoldings.holders);
        this._femaleSources = normalizeFemaleSourcesMap(snapshot.femaleSources);
        this._gachaPity = normalizeGachaPityBook(snapshot.gachaPity);
        this._gachaRevision += 1;
        this._femaleSystem = normalizeFemaleSystemState(snapshot.femaleSystem);
        this._gachaWallet = snapshot.gachaWallet ? normalizeGachaWalletSave(snapshot.gachaWallet) : null;
        this._military = normalizeMilitaryReserve(snapshot.military);
        this._yearAgingEvents = normalizeYearAgingEvents(snapshot.yearAgingEvents);
        this._prison = normalizePrisonState<GeneralConfig>(snapshot.prison);
        this._fame = clampResource('fame', normalizeFame(snapshot.resources?.fame));
        this._scorePoints = normalizeScorePoints(snapshot.resources?.scorePoints);
        this._autoNurtureTickets = normalizeAutoNurtureTickets(snapshot.resources?.autoNurtureTickets);
        this._mainlineNurtureClearedOnce = normalizeFlag(snapshot.resources?.mainlineNurtureClearedOnce);
        // 舊檔沒有旗標：已有通關紀錄視為打過首戰，否則 false
        this._firstBattleCleared = normalizeFlag(snapshot.resources?.firstBattleCleared) || this._clearedStageIds.length > 0;
        this._openingRedFaceShown = normalizeFlag(snapshot.resources?.openingRedFaceShown)
            || (snapshot.resources?.firstBattleCleared === undefined && this._clearedStageIds.length > 0);
        this._domesticLog = normalizeDomesticLog(snapshot.domestic);
        this._governanceEvent = normalizeGovernanceEvent(snapshot.governanceEvent);
        this._governanceBoosts = normalizeGovernanceBoosts(snapshot.governanceBoosts);
        this._seasonPersonality = normalizeSeasonPersonalityState(snapshot.seasonPersonality);
        this._seasonChronicle = normalizeSeasonChronicle(snapshot.seasonChronicle);
        this._rivals = this._withRivalOfficers(normalizeRivalWorld(snapshot.rivals));
        this._mercenaries = normalizeMercenaryBundle(snapshot.mercenaries);
        if (this._postLoadHook) {
            try {
                await this._postLoadHook();
            } catch (error) {
                UCUFLogger.warn(LogCategory.DATA, '[GameSession] 讀檔後處理失敗，略過:', error);
            }
        }
        if (npcIdBackfilled) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.Loaded, snapshot);
        if (this._requireSave().lastLoadRecoveredFromBackup()) {
            this._emit(GAME_SESSION_EVENTS.LoadRecoveredFromBackup, snapshot);
        }
        return true;
    }

    private async _commitDeck(): Promise<void> {
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.DeckChanged, this.deck);
    }

    private _applyDiscoveryExp(source: DiscoveryExpSource, amount?: number): DiscoveryGain {
        const gain = gainDiscoveryExp({ level: this._discoveryLevel, exp: this._discoveryExp }, source, amount);
        this._discoveryLevel = gain.after.level;
        this._discoveryExp = gain.after.exp;
        return gain;
    }

    private _emitDiscoveryGain(gain: DiscoveryGain): void {
        if (gain.levelsGained > 0) {
            this._emit(GAME_SESSION_EVENTS.DiscoveryLevelChanged, gain);
        }
    }

    private _nurturingIds(): string[] {
        return (this._nurture?.getState().sessions ?? []).map((session) => session.childId);
    }

    private _requireSave(): PlayerSaveService {
        if (!this._save) {
            throw new Error('[GameSession] 尚未設定存檔服務（setSaveService）');
        }
        return this._save;
    }

    private _emit(eventName: string, payload: unknown): void {
        this._events?.emit(eventName, payload);
    }
}
