// @spec-source → 見 docs/cross-reference-index.md
import {
  EVENT_NAMES,
  Faction,
  TroopType,
  Weather,
  BattleTactic,
} from "../../core/config/Constants";
import { GeneralUnit } from "../../core/models/GeneralUnit";
import { TroopUnit } from "../../core/models/TroopUnit";
import { BattleUnitSpawner, type TroopDataTable } from '../runtime/BattleUnitSpawner';
import { BattleState, TerrainGrid } from "../models/BattleState";
import type { BattleResult } from "../BattleTypes";
import { detectWeatherTransition, validateWeatherSchedule, weatherForTurn, type WeatherScheduleEntry } from "../../core/systems/WeatherSchedule";
import { EnemyAI } from "./EnemyAI";
import { resolveBattleSkillTargetMode } from '../skills/BattleSkillProfiles';
import { BattleSkillSourceTranslator } from '../skills/adapters/BattleSkillSourceTranslator';
import { BattleSkillDispatcher, type GeneralSkillCastOptions } from '../runtime/BattleSkillDispatcher';
import { findUltimateVitalityCostPct } from '../views/BattleSceneLoader';
import { BattleFlowStateMachine } from './BattleFlowStateMachine';
import { BattleRuntimeOrchestrator } from '../orchestrators/BattleRuntimeOrchestrator';
import { executeBattleCombatPhase } from '../runtime/phases/BattleCombatPhase';
import { executeBattleAutoMovePhase } from '../runtime/phases/BattleAutoMovePhase';
import { executeBattleEnemyDeployPhase } from '../runtime/phases/BattleEnemyDeployPhase';
import { executeBattleSpecialResolvePhase } from '../runtime/phases/BattleSpecialResolvePhase';
import { executeBattleTileEffectPhase } from '../runtime/phases/BattleTileEffectPhase';
import { BattleCombatResolver } from '../runtime/BattleCombatResolver';
import { BattleGeneralDuelFlow } from '../runtime/BattleGeneralDuelFlow';
import { BattleTileBuffLifecycleManager, DEFAULT_BATTLE_TILE_BUFF_CONFIG, type BattleTileBuffConfig } from '../runtime/BattleTileBuffLifecycleManager';
import { resolveBattleVictory, resolveCampCapture } from '../runtime/BattleVictoryResolver';
import { refreshFloodAttackTerrain, resolveBattleTacticBehavior } from '../shared/BattleTacticBehavior';
import { services } from "../../core/managers/ServiceLoader";
import type { BattleRuntimeContext } from '../runtime/BattleRuntimeContext';
import type { BattleRuntimePhaseName, BattleRuntimePhaseOutcome } from '../runtime/BattleRuntimeContract';
import { createBattlePhaseExecutor, type BattlePhaseExecutor } from '../runtime/phases/BattlePhaseExecutor';
import { TurnBasedTempoController } from '../runtime/tempo/TurnBasedTempoController';
import { BattleTurnManager } from '../runtime/BattleTurnManager';
import { RETREAT_BASE_RISK, resolveRetreat, retreatNextStep, type RetreatResolution } from '../../core/systems/BattleRetreat';
import { retreatRiskOf } from '../../core/systems/RetreatRisk';
import type { VitalityBand } from '../../core/systems/VitalityBattleGate';
import type { TigerTallySkillCarrier, TigerTallyTacticRequestOptions } from '../skills/adapters/TigerTallyTacticAdapter';
import { rollLoyaltyRefusal } from '../../core/systems/TigerTallyLoyalty';
import { factorBattleEffectsOf, type FactorBattleEffectMap } from '../../core/systems/FactorTacticLinkage';
import { resolveTallyDeployMod, toTallyCommander, TallyCommanderInfo } from '../../core/systems/TallyDeployAffinity';
import { buildTallyCardCatalog, type TallyDeployRef } from '../../core/config/TallyCardCatalog';
import { starStatMultiplier } from '../../core/systems/TigerTallyStar';
import { describeActiveTallySets } from '../../core/systems/TigerTallySetBonus';
import type { TacticCondition } from '../../core/systems/TacticCondition';
import {
  BattleSkillTargetMode,
  SkillSourceType,
  buildIdMap,
  type CanonicalTacticDefinition,
  type JsonListEnvelope,
  type SkillExecutionResult,
} from '../../shared/SkillRuntimeContract';
import {
  applyDeploy,
  checkDeploy,
  createSortieState,
  finishSortie,
  getTacticTpCost,
  regenTactic,
  spendTactic,
  retireUnit,
  troopsFromHp,
  updateUnitTroops,
  type CreateSortieInput,
  type SortieDeployBlockReason,
  type SortieState,
  type SortieSummary,
} from '../../core/systems/SortieDeploy';

/**
 * [P2-N3] 部署失敗原因：food = 糧草不足（原 dp）。
 * 有出征帳本時（PROG-2-0070）另有 troops-short 軍勢不足 / food-short 糧草不足 / field-limit 場上部隊已滿。
 */
export type DeployFailReason = "food" | "occupied" | "limit" | "battle-locked" | "troops-short" | "food-short" | "field-limit" | "order-refused";

const SORTIE_BLOCK_TO_FAIL_REASON: Record<SortieDeployBlockReason, DeployFailReason> = {
  TROOPS_SHORT: "troops-short",
  FOOD_SHORT: "food-short",
  FIELD_UNIT_LIMIT: "field-limit",
};

export interface DeployOutcome {
  ok: boolean;
  unit: TroopUnit | null;
  reason?: DeployFailReason;
  /** 有出征帳本時列出全部不可部署原因（UI 可各自顯示） */
  reasons?: DeployFailReason[];
}

export type { GeneralSkillCastOptions };



async function loadJsonWithFileFallback<T>(resourcePath: string, _relativeFilePath: string): Promise<T | null> {
  try {
    return await services().resource.loadJson<T>(resourcePath);
  } catch {
    return null;
  }
}

export class BattleController {
  private readonly runtimeOrchestrator = new BattleRuntimeOrchestrator(new TurnBasedTempoController());
  private readonly turnManager = new BattleTurnManager();
  /** 主將忠誠（TRP-09）；null 表示沒有紀錄，不拒令 */
  private orderLoyalty: number | null = null;
  private orderRand: () => number = Math.random;
  /** 本回合是否拒絕部署命令（每回合擲一次） */
  private orderRefusedThisTurn = false;
  private readonly flowStateMachine = new BattleFlowStateMachine();
  private readonly skillSourceTranslator = new BattleSkillSourceTranslator(() => this.tacticDefinitionMap);
  /** 因子 → 戰場效果對應表（PROG-2-0584）；讀不到時為空表，部隊不會取得任何因子效果 */
  private factorEffectMap: FactorBattleEffectMap = { effects: {} };
  public readonly state = new BattleState();
  private readonly enemyAi = new EnemyAI();
  private pendingAdvanceTurnResult: BattleResult | null = null;
  private pendingEnemyTurnResult: BattleResult | null = null;
  private tileBuffConfig: BattleTileBuffConfig = DEFAULT_BATTLE_TILE_BUFF_CONFIG;
  private readonly tileBuffLifecycleManager = new BattleTileBuffLifecycleManager({
    state: this.state,
    getTileBuffConfig: () => this.tileBuffConfig,
    getBuffConsumedSinceLastSpawn: () => this.turnManager.buffConsumedSinceLastSpawn,
    setBuffConsumedSinceLastSpawn: (value) => {
      this.turnManager.buffConsumedSinceLastSpawn = value;
    },
    getBlockedBuffSpawnCells: () => this.turnManager.blockedBuffSpawnCells,
    randomInt: (min, max) => this.randomInt(min, max),
  });
  private readonly unitSpawner = new BattleUnitSpawner({
    state: this.state,
    getDuelRejectedFaction: () => this.duelRejectedFaction,
    getPlayerGeneralUnitId: () => this.playerGeneralUnitId,
    consumeTileBuff: (unit) => this.tileBuffLifecycleManager.consumeTileBuff(unit),
  });
  private tacticDefinitionMap = new Map<string, CanonicalTacticDefinition>();
  /** 虎符卡片實例的星級與模板 id 查詢（由場景注入玩家卡組；沒注入時一律 1★、無模板） */
  public tallyInfoOf: (tallyId: string) => { star: number; templateId: string } | null = () => null;
  /** 本場出陣過的虎符 id（PROG-2-0573：戰後依此結算戰鬥經驗） */
  private readonly _deployedTallyIds = new Set<string>();
  /** 出征軍勢 / 糧草帳本；null = 舊版 demo 戰鬥（不扣軍勢） */
  private sortie: SortieState | null = null;

  // ─── 武將單挑系統狀態 ──────────────────────────────────────────────────
  private readonly combatResolver = new BattleCombatResolver({
    state: this.state,
    turnManager: this.turnManager,
    getPlayerGeneralUnitId: () => this.playerGeneralUnitId,
    getEnemyGeneralUnitId: () => this.enemyGeneralUnitId,
    setPlayerGeneralUnitId: (unitId) => {
      this.playerGeneralUnitId = unitId;
    },
    setEnemyGeneralUnitId: (unitId) => {
      this.enemyGeneralUnitId = unitId;
    },
  });
  private readonly duelFlow = new BattleGeneralDuelFlow({
    state: this.state,
    onUnitKilled: (unit, killer, svc) => this.combatResolver.onUnitKilled(unit, killer, svc),
  });
  private readonly skillDispatcher = new BattleSkillDispatcher(
    {
      state: this.state,
      combatResolver: this.combatResolver,
      getPlayerGeneralUnitId: () => this.playerGeneralUnitId,
      getEnemyGeneralUnitId: () => this.enemyGeneralUnitId,
      getTacticConditions: (tacticId) => this.tacticDefinitionMap.get(tacticId)?.tcond as TacticCondition[] | undefined,
      getUltimateVitalityCostPct: (ultimateId) => findUltimateVitalityCostPct(ultimateId),
    },
    this.skillSourceTranslator,
  );

  /** 玩家武將化身的小兵單位 ID（null = 武將尚未出陣） */
  public get playerGeneralUnitId(): string | null {
    return this.duelFlow.playerGeneralUnitId;
  }
  public set playerGeneralUnitId(unitId: string | null) {
    this.duelFlow.playerGeneralUnitId = unitId;
  }
  /** 敵方武將化身的小兵單位 ID */
  public get enemyGeneralUnitId(): string | null {
    return this.duelFlow.enemyGeneralUnitId;
  }
  public set enemyGeneralUnitId(unitId: string | null) {
    this.duelFlow.enemyGeneralUnitId = unitId;
  }
  /** 是否正在等待玩家選擇出陣格子 */
  public get isWaitingDuelPlacement(): boolean {
    return this.duelFlow.isWaitingDuelPlacement;
  }
  public set isWaitingDuelPlacement(value: boolean) {
    this.duelFlow.isWaitingDuelPlacement = value;
  }
  /** 拒絕單挑的一方（施加懲罰用） */
  private get duelRejectedFaction(): Faction | null {
    return this.duelFlow.duelRejectedFaction;
  }
  private set duelRejectedFaction(faction: Faction | null) {
    this.duelFlow.duelRejectedFaction = faction;
  }
  /** 單挑挑戰是否已經結算過，避免每回合重複觸發 */
  private get duelChallengeResolved(): boolean {
    return this.duelFlow.duelChallengeResolved;
  }
  private set duelChallengeResolved(value: boolean) {
    this.duelFlow.duelChallengeResolved = value;
  }

  // ─── 初始化 ────────────────────────────────────────────────────────────────

  /**
   * 開始新一局戰鬥。
   * 應在呼叫此方法之前完成 loadData()。
   */
  public initBattle(
    playerGeneral: GeneralUnit,
    enemyGeneral: GeneralUnit,
    terrainGrid?: TerrainGrid,
    weather?: Weather,
    battleTactic?: BattleTactic,
  ): void {
    this.state.reset(playerGeneral, enemyGeneral, terrainGrid, weather, battleTactic);
    this.duelFlow.resetForBattle();
    this.flowStateMachine.reset();
    this.flowStateMachine.startBattle();
    this.turnManager.resetForBattle();
    this.tileBuffLifecycleManager.resetForBattle();
    this.unitSpawner.resetForBattle();
    this.pendingAdvanceTurnResult = null;
    this.pendingEnemyTurnResult = null;
    this.sortie = null;
    services().buff.clearAll(); // 清除上一場的狀態效果
    services().battle.beginBattle();
    this.applyStartOfBattleSceneGambit();
    this.tileBuffLifecycleManager.spawnTileBuffsForTurn();
  }

  /** 從 resources/data/troops.json 載入兵種數值表 */
  public async loadData(): Promise<void> {
    const troopData = await loadJsonWithFileFallback<TroopDataTable>('data/troops', 'assets/resources/data/troops.json');
    if (troopData) {
      this.unitSpawner.setTroopData(troopData);
    } else {
      this.unitSpawner.setTroopData({});
    }

    const tileBuffConfig = await loadJsonWithFileFallback<BattleTileBuffConfig>('data/tile-buffs', 'assets/resources/data/tile-buffs.json');
    if (tileBuffConfig) {
      this.tileBuffConfig = tileBuffConfig;
    }

    const factorEffectMap = await loadJsonWithFileFallback<FactorBattleEffectMap>(
      'data/master/factor-battle-effect-map',
      'assets/resources/data/master/factor-battle-effect-map.json',
    );
    this.factorEffectMap = factorEffectMap ?? { effects: {} };

    const tacticLibrary = await loadJsonWithFileFallback<JsonListEnvelope<CanonicalTacticDefinition>>(
      'data/master/tactic-library',
      'assets/resources/data/master/tactic-library.json',
    );
    if (tacticLibrary) {
      this.tacticDefinitionMap = buildIdMap(tacticLibrary.data);
    } else {
      this.tacticDefinitionMap = new Map();
    }
  }

  /**
   * 虎符部隊（TRP-13）：部隊記下虎符與主將，適性乘數每次結算時依當下格子的地形算。
   * 虎符目錄查不到或沒有適性資料時，乘數恆為 1。
   */
  private bindTallyAffinity(unit: TroopUnit, ref: TallyDeployRef): void {
    const profile = buildTallyCardCatalog().get(ref.templateId)?.affinity ?? null;
    const general = this.state.getGeneral(Faction.Player);
    const commander: TallyCommanderInfo | null = general ? toTallyCommander(general.id, general.gender) : null;
    unit.tallyId = ref.cardUid;
    const info = this.tallyInfoOf(ref.cardUid);
    unit.tallyStarMultiplier = starStatMultiplier(info?.star ?? 1);
    unit.tallyTemplateId = info?.templateId ?? null;
    this._deployedTallyIds.add(ref.cardUid);
    unit.commanderUid = commander?.uid ?? null;
    unit.tallyAffinity = (lane, depth) =>
      resolveTallyDeployMod(profile, commander, this.state.getCell(lane, depth)?.terrain ?? null);
  }

  /** 玩家在場存活的虎符部隊成立的 Set 顯示文字（戰場 UI 用，PROG-2-0575） */
  public get activePlayerTallySetLabels(): string[] {
    const ids: string[] = [];
    for (const unit of this.state.units.values()) {
      if (unit.faction === Faction.Player && unit.tallyTemplateId && unit.currentHp > 0) ids.push(unit.tallyTemplateId);
    }
    return describeActiveTallySets(ids);
  }

  /** 本場出陣過的虎符 id，戰後結算戰鬥經驗用 */
  public get deployedTallyIds(): readonly string[] {
    return [...this._deployedTallyIds];
  }

  public deployTroop(type: TroopType, lane: number, unitName?: string): TroopUnit | null {
    return this.tryDeployTroop(type, lane, unitName).unit;
  }

  public tryDeployTroop(
    type: TroopType,
    lane: number,
    unitName?: string,
    options: { militia?: boolean; tally?: TallyDeployRef } = {},
  ): DeployOutcome {
    if (!this.flowStateMachine.canDeployTroop()) {
      return { ok: false, unit: null, reason: "battle-locked" };
    }
    if (!this.turnManager.canDeployPlayer()) {
      return { ok: false, unit: null, reason: "limit" };
    }
    if (this.orderRefusedThisTurn) {
      return { ok: false, unit: null, reason: "order-refused" };
    }

    const deployDepth = 0;
    if (this.state.getCell(lane, deployDepth)?.occupantId) {
      return { ok: false, unit: null, reason: "occupied" };
    }
    if (this.combatResolver.isCellMovementBlocked(lane, deployDepth)) {
      return { ok: false, unit: null, reason: "occupied" };
    }

    if (this.sortie) {
      this.syncSortieWithField();
      const check = checkDeploy(this.sortie, { troopType: type, militia: options.militia });
      if (!check.ok) {
        const reasons = check.reasons.map((reason) => SORTIE_BLOCK_TO_FAIL_REASON[reason]);
        return { ok: false, unit: null, reason: reasons[0], reasons };
      }
    }

    const unit = this.unitSpawner.spawnUnit(type, Faction.Player, lane, deployDepth, unitName, { militia: options.militia });
    // 部隊帶上主將的因子資料（genes 已由 buildBattleConfig 展開進戰場武將），供因子戰法與地形規則讀取
    unit.factorGenes = this.state.getGeneral(Faction.Player)?.genes ?? [];
    unit.factorEffects = factorBattleEffectsOf(unit.factorGenes, this.factorEffectMap);
    if (options.tally) this.bindTallyAffinity(unit, options.tally);
    this.turnManager.notePlayerDeployment();
    if (this.sortie) {
      const applied = applyDeploy(this.sortie, unit.id, { troopType: type, militia: options.militia });
      this.sortie = applied.state;
      services().battle.spendFood(applied.check.cost.foodCost);
    }
    return { ok: true, unit };
  }

  /**
   * 啟用出征帳本（PROG-2-0070）：必須在 initBattle() 之後呼叫。
   * 我方部署改扣出征軍勢與糧草，HUD 糧草改顯示本場糧草（不再每回合補）。
   */
  public configureSortie(input: CreateSortieInput): SortieState {
    this.sortie = createSortieState(input);
    services().battle.configureFood({ initial: this.sortie.food, max: this.sortie.maxFood, perTurn: 0 });
    return this.sortie;
  }

  /**
   * 部隊撤退（PM 暫定，2026-10-14）：擲骰，命中風險即失敗。
   * 成功：脫離戰場、保留 HP、不算陣亡、不給戰功；失敗：受最大 HP 20% 傷害、留在場上、當回合不能行動。
   * 部隊沒有精力，風險的精力段由指揮武將決定（band，預設 high）。roll 可注入（測試用）。
   * 回傳 null 表示該單位不存在。
   */
  public attemptRetreat(
    unitId: string,
    band: VitalityBand = 'high',
    roll: number = services().session.randomSource(),
  ): RetreatResolution | null {
    const unit = this.state.units.get(unitId);
    if (!unit) return null;
    const result = resolveRetreat(unit.maxHp, unit.currentHp, retreatRiskOf(RETREAT_BASE_RISK, band), roll);
    switch (retreatNextStep(result)) {
      case 'escape':
        this.state.removeUnit(unitId);
        services().buff.clearUnit(unitId);
        return result;
      case 'dead':
        unit.currentHp = 0;
        this.combatResolver.onUnitKilled(unit, null, services());
        return result;
      case 'blocked':
        unit.currentHp = result.hpAfter;
        this.turnManager.markUnitActionBlocked(unitId);
        return result;
    }
  }

  /**
   * 主將忠誠對命令的影響（TRP-09）：忠誠 < 30 時每回合 25% 拒絕執行部署命令。
   * loyalty 為 null 表示沒有忠誠紀錄，不拒令。rand 可注入（測試用）。
   */
  public configureOrderLoyalty(loyalty: number | null, rand: () => number = Math.random): void {
    this.orderLoyalty = loyalty;
    this.orderRand = rand;
    this.orderRefusedThisTurn = this.rollOrderRefusal();
  }

  private rollOrderRefusal(): boolean {
    return this.orderLoyalty !== null && rollLoyaltyRefusal(this.orderLoyalty, this.orderRand);
  }

  /** 花費計謀點（PROG-2-0084）；沒有出征帳本時視為不需計謀點，直接成功 */
  public trySpendTacticPoints(cost: number): { ok: boolean; reason?: 'TACTIC_SHORT' } {
    if (!this.sortie) return { ok: true };
    const result = spendTactic(this.sortie, cost);
    this.sortie = result.state;
    return result.ok ? { ok: true } : { ok: false, reason: result.reason };
  }

  /** 目前帳本（已同步場上存活與剩餘兵力）；沒有出征帳本時回傳 null */
  public getSortieState(): SortieState | null {
    if (!this.sortie) return null;
    this.syncSortieWithField();
    return this.sortie;
  }

  /** 戰後結算：剩餘部隊返還、計算戰損與城市兵源變化；沒有出征帳本時回傳 null */
  public finishSortie(cityTroopsBefore: number, recruitRegen?: number): SortieSummary | null {
    const state = this.getSortieState();
    return state ? finishSortie(state, cityTroopsBefore, recruitRegen) : null;
  }

  /** 陣亡（已從場上移除）的部隊退場兵力 0；存活部隊依血量比例更新剩餘兵力 */
  private syncSortieWithField(): void {
    if (!this.sortie) return;
    let next = this.sortie;
    for (const record of Object.values(next.units)) {
      if (record.retired) continue;
      const unit = this.state.units.get(record.unitId);
      next = unit
        ? updateUnitTroops(next, record.unitId, troopsFromHp(record.troopCost, unit.currentHp, unit.getEffectiveMaxHp()))
        : retireUnit(next, record.unitId, 0);
    }
    this.sortie = next;
  }

  /**
   * 玩家發動武將技能（需 SP 滿能量）。
   * 回傳 true 代表技能成功發動。
   */
  public triggerGeneralSkill(options: GeneralSkillCastOptions = {}): boolean {
    if (!this.canUsePlayerSkills()) return false;
    return this.triggerPlayerSeedTactic(options);
  }

  public canAdvanceBattleTurn(): boolean {
    return this.flowStateMachine.canAdvanceTurn();
  }

  public getPlayerSeedTacticDescriptor(): { skillId: string; tacticId: string | null; targetMode: BattleSkillTargetMode } | null {
    const general = this.state.playerGeneral;
    if (!general) {
      return null;
    }

    const translated = this.skillSourceTranslator.resolvePrimarySeedTacticDescriptor(general);
    if (translated) {
      return {
        skillId: translated.battleSkillId,
        tacticId: translated.tacticId,
        targetMode: translated.targetMode,
      };
    }

    const fallbackSkillId = general.skillId ?? general.battlePrimarySkillId ?? null;
    if (!fallbackSkillId) {
      return null;
    }

    return {
      skillId: fallbackSkillId,
      tacticId: null,
      targetMode: resolveBattleSkillTargetMode(fallbackSkillId, BattleSkillTargetMode.EnemyAll),
    };
  }

  /** 本次施放實際使用的戰法 id：呼叫端指定優先，否則用主戰法；UI 預檢與施放扣點共用這一個來源。 */
  private resolveSeedTacticId(options: Pick<GeneralSkillCastOptions, 'tacticId'> = {}): string | null {
    return options.tacticId ?? this.getPlayerSeedTacticDescriptor()?.tacticId ?? null;
  }

  /** 有出征帳本時，目前計謀點是否付得起這個戰法；demo 沒有帳本時免扣點。 */
  private canAffordTactic(tacticId: string | null): boolean {
    return !this.sortie || this.sortie.tacticCurrent >= getTacticTpCost(tacticId);
  }

  /**
   * UI 與目標選取共用目前戰法的計謀點門檻；demo 沒有帳本時免扣點。
   * 傳入 options.tacticId 時以該戰法計價，與實際施放（triggerPlayerSeedTactic）同一來源。
   */
  public getPlayerTacticPointState(options: Pick<GeneralSkillCastOptions, 'tacticId'> = {}): { current?: number; max?: number; enabled: boolean } {
    const descriptor = this.getPlayerSeedTacticDescriptor();
    return { current: this.sortie?.tacticCurrent, max: this.sortie?.tacticMax,
      enabled: !!descriptor && this.canAffordTactic(this.resolveSeedTacticId(options)) };
  }

  public triggerPlayerSeedTactic(options: GeneralSkillCastOptions = {}): boolean {
    if (!this.canUsePlayerSkills()) return false;

    const general = this.state.playerGeneral;
    if (!general?.canUseSkill()) return false;

    const descriptor = this.getPlayerSeedTacticDescriptor();
    const tacticId = this.resolveSeedTacticId(options);
    // 有出征帳本時，戰法要先付計謀點（PROG-2-0085）；點數不足直接不施放、不扣精力
    const tpCost = getTacticTpCost(tacticId);
    if (!this.canAffordTactic(tacticId)) return false;

    const result = this.skillDispatcher.dispatchSeedTactic(Faction.Player, {
      ...options,
      battleSkillId: options.battleSkillId ?? descriptor?.skillId ?? null,
      tacticId,
    });
    if (!result.applied) return false;

    this.trySpendTacticPoints(tpCost);
    general.currentSp = 0;
    services().event.emit(EVENT_NAMES.GeneralSpChanged, {
      faction: Faction.Player,
      sp: general.currentSp,
      maxSp: general.maxSp,
    });
    services().event.emit(EVENT_NAMES.GeneralSkillUsed, {
      faction: Faction.Player,
      skillName: result.battleSkillId,
      skillId: result.battleSkillId,
      sourceType: SkillSourceType.SeedTactic,
    });
    return true;
  }

  public triggerPlayerBattleSkill(
    skillId: string,
    sourceType: SkillSourceType,
    options: GeneralSkillCastOptions = {},
  ): boolean {
    if (!this.canUsePlayerSkills()) return false;

    if (sourceType === SkillSourceType.SeedTactic) {
      return this.triggerPlayerSeedTactic({
        ...options,
        battleSkillId: options.battleSkillId ?? skillId,
      });
    }

    const general = this.state.playerGeneral;
    if (!general?.canUseSkill() || !skillId) return false;

    const result = this.skillDispatcher.dispatchDirectBattleSkill(skillId, sourceType, Faction.Player, options);
    if (!result.applied) return false;

    general.currentSp = 0;
    services().event.emit(EVENT_NAMES.GeneralSpChanged, {
      faction: Faction.Player,
      sp: general.currentSp,
      maxSp: general.maxSp,
    });
    services().event.emit(EVENT_NAMES.GeneralSkillUsed, {
      faction: Faction.Player,
      skillName: skillId,
      skillId,
      sourceType,
    });
    return true;
  }

  /**
   * 觸發虎符來源的戰法技能（G-1 Tiger Tally）。
   * 路徑：TigerTallyTacticAdapter → BattleSkillSourceTranslator → executeBattleSkillRequest
   * 不消耗 SP；skill profile 決定傷害、穿甲或爆擊加成。
   */
  public triggerTigerTallySkill(
    tallyCard: TigerTallySkillCarrier,
    ownerUid: string,
    options: TigerTallyTacticRequestOptions,
  ): SkillExecutionResult {
    if (!this.canUsePlayerSkills()) {
      return {
        requestId: `${ownerUid}:tiger-tally-locked`,
        battleSkillId: options.battleSkillId ?? 'unknown',
        applied: false,
        blockedReason: 'battle-locked',
        deltas: [],
        battleLogLines: ['Battle flow locked: cannot cast tiger tally skill in the current phase'],
      };
    }

    const request = this.skillSourceTranslator.buildTigerTallyRequest(tallyCard, ownerUid, options);
    if (!request) {
      return {
        requestId: `${ownerUid}:tiger-tally-invalid`,
        battleSkillId: options.battleSkillId ?? 'unknown',
        applied: false,
        blockedReason: 'invalid-tally-request',
        deltas: [],
        battleLogLines: ['TigerTally: invalid carrier or missing battleSkillId'],
      };
    }
    return this.skillDispatcher.executeBattleSkillRequest(request);
  }

  // ─── 回合推進（玩家部署完畢後由 UI 呼叫）────────────────────────────────

  /**
   * 執行一個完整的回合自動流程：
   *   敵方部署 → 自動移動 → 戰鬥結算 → 特殊行動 → 勝敗判定
   *
   * 若結果為 "ongoing"，自動推進至下一回合（補充玩家糧草）。
   */
  public advanceTurn(): BattleResult {
    if (!this.flowStateMachine.beginTurnResolution()) {
      return this.flowStateMachine.result ?? 'ongoing';
    }

    const result = this.executeRuntimeTurnPlan(this.buildTurnPhaseExecutors(), false);
    this.pendingAdvanceTurnResult = result;
    return result;
  }

  public resolvePlayerTurn(): BattleResult {
    if (!this.flowStateMachine.beginTurnResolution()) {
      return this.flowStateMachine.result ?? 'ongoing';
    }

    const result = this.executeRuntimeTurnPlan(this.buildPlayerTurnPhaseExecutors(), false);
    if (result !== 'ongoing') {
      return this.commitBattleResult(result);
    }
    // 營帳佔領（PM 暫定）：我方單位回合結束時站在營帳格上即勝利
    const campResult = resolveCampCapture(this.state);
    if (campResult) {
      return this.commitBattleResult(campResult);
    }
    return result;
  }

  public resolveEnemyTurn(): BattleResult {
    const result = this.executeRuntimeTurnPlan(this.buildEnemyTurnPhaseExecutors(), false);
    this.pendingEnemyTurnResult = result;
    return result;
  }

  public finalizeEnemyTurn(): BattleResult {
    const result = this.pendingEnemyTurnResult;
    if (result === null) {
      return this.flowStateMachine.result ?? 'ongoing';
    }

    this.pendingEnemyTurnResult = null;
    if (result === 'ongoing') {
      this.finalizeRuntimeTurnCycle();
    }
    return this.commitBattleResult(result);
  }

  public finalizeAdvanceTurn(): BattleResult {
    const result = this.pendingAdvanceTurnResult;
    if (result === null) {
      return this.flowStateMachine.result ?? 'ongoing';
    }

    this.pendingAdvanceTurnResult = null;
    if (result === 'ongoing') {
      this.finalizeRuntimeTurnCycle();
    }
    return this.commitBattleResult(result);
  }

  private createBattleRuntimeContext(): BattleRuntimeContext {
    return this.createBattleRuntimeContextWithFinalize(true);
  }

  private createBattleRuntimeContextWithFinalize(finalizeTurnCycle: boolean): BattleRuntimeContext {
    return {
      state: this.state,
      battleTactic: this.state.battleTactic,
      executePhase: (phaseName) => this.executeRuntimePhase(phaseName),
      finalizeTurnCycle: () => {
        if (finalizeTurnCycle) {
          this.finalizeRuntimeTurnCycle();
        }
      },
    };
  }

  private buildTurnPhaseExecutors(): readonly BattlePhaseExecutor[] {
    return [
      ...this.buildPlayerTurnPhaseExecutors(),
      ...this.buildEnemyTurnPhaseExecutors(),
    ];
  }

  private buildPlayerTurnPhaseExecutors(): readonly BattlePhaseExecutor[] {
    return [
      createBattlePhaseExecutor('player-auto-move', (context) => context.executePhase('player-auto-move')),
      createBattlePhaseExecutor('player-tile-effect', (context) => context.executePhase('player-tile-effect')),
      createBattlePhaseExecutor('player-combat-resolve', (context) => context.executePhase('player-combat-resolve')),
      createBattlePhaseExecutor('player-special-resolve', (context) => context.executePhase('player-special-resolve')),
      createBattlePhaseExecutor('victory-check', (context) => context.executePhase('victory-check')),
    ];
  }

  private buildEnemyTurnPhaseExecutors(): readonly BattlePhaseExecutor[] {
    return [
      createBattlePhaseExecutor('enemy-deploy', (context) => context.executePhase('enemy-deploy')),
      createBattlePhaseExecutor('enemy-auto-move', (context) => context.executePhase('enemy-auto-move')),
      createBattlePhaseExecutor('enemy-tile-effect', (context) => context.executePhase('enemy-tile-effect')),
      createBattlePhaseExecutor('enemy-combat-resolve', (context) => context.executePhase('enemy-combat-resolve')),
      createBattlePhaseExecutor('enemy-special-resolve', (context) => context.executePhase('enemy-special-resolve')),
      createBattlePhaseExecutor('victory-check', (context) => context.executePhase('victory-check')),
    ];
  }

  private executeRuntimeTurnPlan(
    phaseExecutors: readonly BattlePhaseExecutor[],
    finalizeTurnCycle: boolean,
  ): BattleResult {
    return this.runtimeOrchestrator.executeTurnCycle(
      this.createBattleRuntimeContextWithFinalize(finalizeTurnCycle),
      phaseExecutors,
    );
  }

  private executeRuntimePhase(phaseName: BattleRuntimePhaseName): BattleRuntimePhaseOutcome {
    switch (phaseName) {
      case 'enemy-deploy':
        executeBattleEnemyDeployPhase({
          state: this.state,
          enemyAi: this.enemyAi,
          turnManager: this.turnManager,
          spawnEnemyUnit: (type, lane, depth) => this.unitSpawner.spawnUnit(type, Faction.Enemy, lane, depth),
          isCellMovementBlocked: (lane, depth) => this.combatResolver.isCellMovementBlocked(lane, depth),
        });
        return {};
      case 'player-auto-move':
      case 'auto-move':
        executeBattleAutoMovePhase({
          state: this.state,
          actingFaction: Faction.Player,
          turnManager: this.turnManager,
          consumeTileBuff: (unit) => this.tileBuffLifecycleManager.consumeTileBuff(unit),
          getFactionUnits: (faction) => this.combatResolver.getFactionUnits(faction),
          isCellMovementBlocked: (lane, depth) => this.combatResolver.isCellMovementBlocked(lane, depth),
          isGeneralUnit: (unitId) => this.combatResolver.isGeneralUnit(unitId),
          getAptitudeMoveDelta: (unit) => this.combatResolver.getUnitMoveDelta(unit),
          applyForcedMoveDamage: (unit, damage) => this.combatResolver.applyUnitDamage(unit, damage, null, {
            attackerId: null,
            attackerLane: null,
            attackerDepth: null,
            damageSource: 'forced-move',
            allowDamageLink: false,
          }),
        });
        return {};
      case 'enemy-auto-move':
        executeBattleAutoMovePhase({
          state: this.state,
          actingFaction: Faction.Enemy,
          turnManager: this.turnManager,
          consumeTileBuff: (unit) => this.tileBuffLifecycleManager.consumeTileBuff(unit),
          getFactionUnits: (faction) => this.combatResolver.getFactionUnits(faction),
          isCellMovementBlocked: (lane, depth) => this.combatResolver.isCellMovementBlocked(lane, depth),
          isGeneralUnit: (unitId) => this.combatResolver.isGeneralUnit(unitId),
          getAptitudeMoveDelta: (unit) => this.combatResolver.getUnitMoveDelta(unit),
          applyForcedMoveDamage: (unit, damage) => this.combatResolver.applyUnitDamage(unit, damage, null, {
            attackerId: null,
            attackerLane: null,
            attackerDepth: null,
            damageSource: 'forced-move',
            allowDamageLink: false,
          }),
        });
        return {};
      case 'player-tile-effect':
      case 'tile-effect':
        executeBattleTileEffectPhase({
          state: this.state,
          actingFaction: Faction.Player,
          playerGeneralUnitId: this.playerGeneralUnitId,
          enemyGeneralUnitId: this.enemyGeneralUnitId,
          applyUnitDamage: (unit, damage, attackerFaction, options) => this.combatResolver.applyUnitDamage(unit, damage, attackerFaction, options),
          onGeneralUnitKilled: (faction, svc) => this.combatResolver.onGeneralUnitKilled(faction, svc),
          onUnitKilled: (unit, killer, svc) => this.combatResolver.onUnitKilled(unit, killer, svc),
        });
        return {};
      case 'enemy-tile-effect':
        executeBattleTileEffectPhase({
          state: this.state,
          actingFaction: Faction.Enemy,
          playerGeneralUnitId: this.playerGeneralUnitId,
          enemyGeneralUnitId: this.enemyGeneralUnitId,
          applyUnitDamage: (unit, damage, attackerFaction, options) => this.combatResolver.applyUnitDamage(unit, damage, attackerFaction, options),
          onGeneralUnitKilled: (faction, svc) => this.combatResolver.onGeneralUnitKilled(faction, svc),
          onUnitKilled: (unit, killer, svc) => this.combatResolver.onUnitKilled(unit, killer, svc),
        });
        return {};
      case 'player-combat-resolve':
      case 'combat-resolve':
        executeBattleCombatPhase({
          state: this.state,
          actingFaction: Faction.Player,
          playerGeneralUnitId: this.playerGeneralUnitId,
          enemyGeneralUnitId: this.enemyGeneralUnitId,
          buildAttackAction: (unit, options) => this.combatResolver.buildAttackAction(unit, options),
          damageEnemyGeneral: (attacker, svc) => this.combatResolver.damageEnemyGeneral(attacker, svc),
          resolveCombat: (attacker, defender, svc) => this.combatResolver.resolveCombat(attacker, defender, svc),
          advanceAfterKill: (attacker, svc) => this.combatResolver.advanceAfterKill(attacker, svc),
          resolveActionResetAfterAttack: (attacker, didKill, actions) => this.combatResolver.resolveActionResetAfterAttack(attacker, didKill, actions),
          onGeneralUnitKilled: (faction, svc) => this.combatResolver.onGeneralUnitKilled(faction, svc),
          onUnitKilled: (unit, killer, svc) => this.combatResolver.onUnitKilled(unit, killer, svc),
        });
        return {};
      case 'enemy-combat-resolve':
        executeBattleCombatPhase({
          state: this.state,
          actingFaction: Faction.Enemy,
          playerGeneralUnitId: this.playerGeneralUnitId,
          enemyGeneralUnitId: this.enemyGeneralUnitId,
          buildAttackAction: (unit, options) => this.combatResolver.buildAttackAction(unit, options),
          damageEnemyGeneral: (attacker, svc) => this.combatResolver.damageEnemyGeneral(attacker, svc),
          resolveCombat: (attacker, defender, svc) => this.combatResolver.resolveCombat(attacker, defender, svc),
          advanceAfterKill: (attacker, svc) => this.combatResolver.advanceAfterKill(attacker, svc),
          resolveActionResetAfterAttack: (attacker, didKill, actions) => this.combatResolver.resolveActionResetAfterAttack(attacker, didKill, actions),
          onGeneralUnitKilled: (faction, svc) => this.combatResolver.onGeneralUnitKilled(faction, svc),
          onUnitKilled: (unit, killer, svc) => this.combatResolver.onUnitKilled(unit, killer, svc),
        });
        return {};
      case 'player-special-resolve':
        executeBattleSpecialResolvePhase({
          state: this.state,
          actingFaction: Faction.Player,
          turnManager: this.turnManager,
          castEnemySeedTactic: (battleSkillId) => this.skillDispatcher.dispatchSeedTactic(Faction.Enemy, { battleSkillId }),
        });
        return {};
      case 'enemy-special-resolve':
      case 'special-resolve':
        executeBattleSpecialResolvePhase({
          state: this.state,
          actingFaction: Faction.Enemy,
          turnManager: this.turnManager,
          castEnemySeedTactic: (battleSkillId) => this.skillDispatcher.dispatchSeedTactic(Faction.Enemy, { battleSkillId }),
        });
        if (phaseName === 'enemy-special-resolve' && this.state.battleTactic === BattleTactic.FloodAttack) {
          resolveBattleTacticBehavior(this.state.battleTactic).advanceTurn(this.state, {
            turnManager: this.turnManager,
            applyUnitDamage: (unit, damage, attackerFaction, options) => this.combatResolver.applyUnitDamage(unit, damage, attackerFaction, options),
            onGeneralUnitKilled: (faction, combatSvc) => this.combatResolver.onGeneralUnitKilled(faction, combatSvc),
            onUnitKilled: (unit, killer, combatSvc) => this.combatResolver.onUnitKilled(unit, killer, combatSvc),
          });
        }
        return {};
      case 'victory-check': {
        const result = this.checkVictory();
        return { result };
      }
      default:
        return {};
    }
  }

  /** 設定天氣排程（PROG-2-0401）：第 1 回合立即套用該回合天氣，之後每回合由 finalizeRuntimeTurnCycle 切換 */
  public setWeatherSchedule(schedule: readonly WeatherScheduleEntry[]): void {
    this.state.weatherSchedule = validateWeatherSchedule(schedule);
    this.state.weather = weatherForTurn(this.state.weatherSchedule, 1);
    this.refreshFloodForWeather();
  }

  /** 水攻範圍跟著天氣即時重算（PROG-2-0407）；非水攻戰場不動 */
  private refreshFloodForWeather(): void {
    if (this.state.battleTactic === BattleTactic.FloodAttack) refreshFloodAttackTerrain(this.state);
  }

  /** 依排程套用指定回合的天氣；天氣改變時發出 WeatherChanged 事件。沒有排程時不動 */
  private applyWeatherForTurn(turn: number): void {
    const schedule = this.state.weatherSchedule;
    if (schedule.length === 0) return;
    const transition = detectWeatherTransition(schedule, turn);
    this.state.weather = transition.current;
    if (transition.changed) {
      services().event.emit(EVENT_NAMES.WeatherChanged, { turn, previous: transition.previous, current: transition.current });
      this.refreshFloodForWeather();
    }
  }

  private finalizeRuntimeTurnCycle(): void {
    const svc = services();
    svc.buff.tickBuff();
    if (this.state.battleTactic !== BattleTactic.FloodAttack) {
      resolveBattleTacticBehavior(this.state.battleTactic).advanceTurn(this.state, {
        turnManager: this.turnManager,
        applyUnitDamage: (unit, damage, attackerFaction, options) => this.combatResolver.applyUnitDamage(unit, damage, attackerFaction, options),
        onGeneralUnitKilled: (faction, combatSvc) => this.combatResolver.onGeneralUnitKilled(faction, combatSvc),
        onUnitKilled: (unit, killer, combatSvc) => this.combatResolver.onUnitKilled(unit, killer, combatSvc),
      });
    }
    if (this.sortie) this.sortie = regenTactic(this.sortie);
    svc.battle.nextTurn();
    this.applyWeatherForTurn(svc.battle.getSnapshot().turn);
    this.turnManager.refreshForNextTurn();
    this.orderRefusedThisTurn = this.rollOrderRefusal();
    this.tileBuffLifecycleManager.spawnTileBuffsForTurn();
  }

  private commitBattleResult(result: BattleResult): BattleResult {
    this.flowStateMachine.commitBattleResult(result);
    return result;
  }

  // ─── 階段：敵方部署 ───────────────────────────────────────────────────────

  /**
   * 覆寫營帳座標（夜襲／埋伏場景資料用）。需在 initBattle() 之前呼叫；null 回到預設（敵方後排中央）。
   */
  public configureSceneCamp(position: { lane: number; depth: number } | null): void {
    this.state.sceneCampPosition = position;
  }

  private applyStartOfBattleSceneGambit(): void {
    resolveBattleTacticBehavior(this.state.battleTactic).applyStartOfBattle(this.state, {
      // 施放者是場景的施放陣營（state.sceneCaster，預設敵方）；天命取其主將基因，沒有主將時為 0；亂數走戰場種子亂數源
      random: () => services().session.randomSource(),
      casterGenes: this.state.getGeneral(this.state.sceneCaster)?.genes ?? [],
    });
  }

  // ─── 階段：特殊行動 ───────────────────────────────────────────────────────

  // ─── 勝敗判定 ─────────────────────────────────────────────────────────────

  private canUsePlayerSkills(): boolean {
    return this.flowStateMachine.canUsePlayerSkills();
  }

  private canRequestGeneralDuel(): boolean {
    return this.flowStateMachine.canRequestGeneralDuel();
  }

  private checkVictory(): BattleResult {
    return resolveBattleVictory(this.state);
  }

  private randomInt(min: number, max: number): number {
    if (max <= min) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ─── 武將單挑系統 ─────────────────────────────────────────────────────────

  /**
   * 檢查玩家武將是否可以出陣（前排 depth=0 沒有我方小兵）。
   */
  public canPlayerGeneralDuel(): boolean {
    return this.duelFlow.canPlayerGeneralDuel();
  }

  /**
   * 開始武將出陣流程：進入等待玩家選擇棋盤空格的狀態。
   * @returns "ok" | "already-deployed" | "front-blocked" | "general-dead"
   */
  public startGeneralDuel(): string {
    if (this.flowStateMachine.isFinished()) {
      return 'battle-ended';
    }
    if (!this.canRequestGeneralDuel()) {
      return 'battle-locked';
    }

    const result = this.duelFlow.startGeneralDuel();
    if (result === 'ok') {
      this.flowStateMachine.beginGeneralDuelPlacement();
    }
    return result;
  }

  /**
   * 玩家武將放置到指定格子（點擊棋盤後調用）。
   * @returns 成功回傳武將化身的 TroopUnit，失敗回傳 null
   */
  public placeGeneralOnBoard(lane: number, depth: number): TroopUnit | null {
    if (!this.flowStateMachine.isGeneralDuelPlacement()) {
      return null;
    }

    const unit = this.duelFlow.placeGeneralOnBoard(lane, depth);
    if (unit) {
      this.flowStateMachine.completeGeneralDuelPlacement();
    }
    return unit;
  }

  /**
   * 判斷武將是否已到達敵將面前（可觸發單挑邀請）。
   */
  public isGeneralFacingEnemyGeneral(faction: Faction): boolean {
    return this.duelFlow.isGeneralFacingEnemyGeneral(faction);
  }

  /**
   * 處理單挑邀請結果。
   * @param challengerFaction 發起單挑的一方
   * @param accepted 對方是否接受
   */
  public resolveDuelChallenge(challengerFaction: Faction, accepted: boolean): BattleResult {
    this.duelFlow.resolveDuelChallenge(challengerFaction, accepted);
    return this.commitBattleResult(this.checkVictory());
  }

  /**
   * 取得拒絕單挑的陣營（用於新部署小兵時自動施加懲罰減半）。
   */
  public getDuelRejectedFaction(): Faction | null {
    return this.duelFlow.getDuelRejectedFaction();
  }

  public isDuelChallengeResolved(): boolean {
    return this.duelFlow.isDuelChallengeResolved();
  }

  /**
   * 單挑接受決策（由防守方視角評估）：
   * score = 0.45 * 主將血量優勢 + 0.35 * 場上兵力優勢 + 0.2 * 總戰力優勢
   */
  public evaluateDuelAcceptance(challengerFaction: Faction): {
    accepted: boolean;
    score: number;
    defenderFaction: Faction;
  } {
    return this.duelFlow.evaluateDuelAcceptance(challengerFaction);
  }
}
