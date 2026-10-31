// @spec-source → 見 docs/cross-reference-index.md
import type { AiDifficulty } from '../../core/systems/AiSpCharge';
import type { AiIqLevel } from '../../core/systems/AiDifficultyTable';
import { Faction, GAME_CONFIG, Weather, BattleTactic } from "../../core/config/Constants";
import { TerrainType, TerrainGrid } from "../../shared/CommonEnums";
export type { TerrainGrid };
import { GeneralUnit } from "../../core/models/GeneralUnit";
import { TroopUnit } from "../../core/models/TroopUnit";
import type { FormationZone } from "../shared/FormationZone";
import type { SelfBurstWindow } from "../shared/SelfBurstWindow";
import type { UnitDot } from "../shared/UnitDot";
import type { WeatherScheduleEntry } from "../../core/systems/WeatherSchedule";
import type { SalvageTotals } from "../../core/systems/StrategistHud";

export interface GridCell {
  lane: number;
  depth: number;
  terrain: TerrainType;
  occupantId: string | null;
}

export interface TileBuff {
  id: string;
  lane: number;
  depth: number;
  stat: "attack" | "hp";
  op: "mul" | "div";
  factor: number;
  text: string;
  rarity: "normal" | "rare";
}

export type TileEffectState = 'hazard-fire' | 'hazard-rock' | 'river-current' | 'ambush-field' | 'night-raid' | 'scene-camp';
export type TileEffectMoveDirection = 'forward' | 'backward';

export interface TileEffect {
  id: string;
  lane: number;
  depth: number;
  state: TileEffectState;
  damagePerTurn?: number;
  blocksMovement?: boolean;
  forcedMoveDirection?: TileEffectMoveDirection;
  forcedMoveSteps?: number;
  moveRangeDelta?: number;
  notes?: string;
}

export interface SceneBattleFlags {
  stealthOpenTurns: number;
  nightRaid: boolean;
  nightRaidOpenTurns: number;
}

export interface DamageLinkState {
  primaryUnitUid: string;
  linkedUnitUids: string[];
  shareRatio: number;
  battleSkillId: string;
}

export interface CounterReactionState {
  unitUid: string;
  battleSkillId: string;
  counterRatio: number;
  statusTurns: number;
  remainingTriggers: number;
  meleeOnly: boolean;
}

export interface ActionResetState {
  unitUid: string;
  battleSkillId: string;
  firstHitMultiplier: number;
  firstHitPending: boolean;
  remainingExtraActions: number;
}


export class BattleState {
  public readonly cells: GridCell[] = [];
  public readonly units = new Map<string, TroopUnit>();
  public readonly tileBuffs = new Map<string, TileBuff>();
  public readonly tileEffects = new Map<string, TileEffect>();
  /** 單位持續傷害（毒箭）：以 unitId 為鍵（PROG-2-0766） */
  public readonly unitDots = new Map<string, UnitDot>();
  /** 持續防禦區獨立成表：可與同格的火場等格子狀態共存（PROG-2-0761） */
  public readonly formationZones = new Map<string, FormationZone>();
  /** 奧義自身爆發窗口（SYS-SKILL-ULT-0001）：以施放者陣營為鍵，整支軍隊共用（PM 暫定） */
  public readonly selfBursts = new Map<Faction, SelfBurstWindow>();
  public readonly damageLinks = new Map<string, DamageLinkState>();
  public readonly counterReactions = new Map<string, CounterReactionState>();
  public readonly actionResets = new Map<string, ActionResetState>();

  public playerGeneral: GeneralUnit | null = null;
  public enemyGeneral: GeneralUnit | null = null;
  public playerFortressHp = 500;
  public enemyFortressHp = 500;
  /** 水攻淹沒前各格的原地形（key = "lane,depth"），重算範圍時用來還原（PROG-2-0407） */
  public readonly floodOriginalTerrain = new Map<string, TerrainType>();
  /** 營曜天氣（影響戰場修正預留欄位） */
  public weather: Weather = Weather.Clear;
  /** 天氣排程（PROG-2-0401）；空陣列代表整場維持 weather */
  public weatherSchedule: readonly WeatherScheduleEntry[] = [];
  /** 場景戰法（特殊戰場規則預留欄位） */
  public battleTactic: BattleTactic = BattleTactic.Normal;
  public sceneFlags: SceneBattleFlags = { stealthOpenTurns: 0, nightRaid: false, nightRaidOpenTurns: 0 };
  /** 場景戰法的施放方（落石等）：天命取此陣營主將的基因，沒有主將時天命為 0；預設敵方（PM 暫定） */
  public sceneCaster: Faction = Faction.Enemy;
  /** 營帳格座標覆寫（夜襲／埋伏）；null 時用預設：敵方後排中央（PM 暫定） */
  public sceneCampPosition: { lane: number; depth: number } | null = null;
  /** 本局是否已對外發出 BattleEnded（勝負判定可重複呼叫，事件只發一次） */
  public battleEndAnnounced = false;
  /** 關卡級回收累計（關卡設計系統 §I，PROG-2-1462）：戰中只累計，戰鬥結束隨 BattleEnded 帶出 */
  public stageSalvage: SalvageTotals = { stone: 0, wood: 0, supply: 0, intel: 0, weaponMaterial: 0, instructorExp: 0 };
  /** 已被掠奪的火攻格（"lane,depth"），每格只掠奪一次 */
  public plunderedTiles = new Set<string>();
  /** AI 擊殺充能難度（PROG-2-0920）；只影響敵方擊殺的 SP，玩家擊殺仍是固定值 */
  public aiDifficulty: AiDifficulty = 'normal';
  /** AI 單挑接受閾值（ai-difficulty.json duelAcceptThreshold）；null 表示未設定難度表，退回一般閾值（PROG-2-1325） */
  public aiDuelAcceptThreshold: number | null = null;
  /** AI 擊殺充能倍率（ai-difficulty.json spGainModifier）；預設 1.0 = 普通（AIS-12） */
  public aiSpGainModifier = 1;
  /** AI 難度加成（ai-difficulty.json difficultyBonus）：敵方每回合部署數（F-2）用；預設 0 = 普通 */
  public aiDifficultyBonus = 0;
  /** AI 智力等級（ai-difficulty.json aiIq）：敵方奧義施放決策用（AIS-07） */
  public aiIq: AiIqLevel = 'LOW';
  /** AI 是否可施放奧義（ai-difficulty.json canUseUltimate）；預設 false，未設定難度表時敵方不放奧義（AIS-07） */
  public aiCanUseUltimate = false;
  /** AI 戰法用的智力等級（PROG-2-1466）；null = 未套難度表，沿用情境打分 */
  public aiTacticIq: AiIqLevel | null = null;
  /** AI 是否可用戰法（ai-difficulty.json canUseTactics）；預設 true */
  public aiCanUseTactics = true;
  /** 挾天子令控制中的兵（PROG-2-1335）：unitId → 原陣營與剩餘回合 */
  public controlledUnits = new Map<string, { originalFaction: Faction; turnsLeft: number }>();
  /** 陣亡兵紀錄（PROG-2-1334 唯才是舉復活用）：依陣亡先後排序，只保留單位參照 */
  public fallenUnits: TroopUnit[] = [];
  /** 殘局模式（FORM-10）：第 5 回合或存活低於 50% 時進入，進入後不退出 */
  public lastSpurtMode = false;
  /** 戰場上出現過的最高合計兵力（FORM-10 存活比例分母） */
  public peakTroopCount = 0;
  /** 軍師智謀能量（SCN-10，WisdomMeter）：每回合 INT×0.5 累積，滿 100 觸發後歸零 */
  public wisdomMeter = 0;
  /** 智謀能量本場觸發次數 */
  public wisdomTriggerCount = 0;

  constructor() {
    for (let lane = 0; lane < GAME_CONFIG.GRID_LANES; lane++) {
      for (let depth = 0; depth < GAME_CONFIG.GRID_DEPTH; depth++) {
        this.cells.push({ lane, depth, terrain: TerrainType.Plain, occupantId: null });
      }
    }
  }

  /** 為新一局戰鬥重置所有狀態 */
  public reset(
    playerGeneral: GeneralUnit,
    enemyGeneral: GeneralUnit,
    terrainGrid?: TerrainGrid,
    weather?: Weather,
    battleTactic?: BattleTactic,
  ): void {
    this.units.clear();
    this.tileBuffs.clear();
    this.tileEffects.clear();
    this.unitDots.clear();
    this.formationZones.clear();
    this.selfBursts.clear();
    this.damageLinks.clear();
    this.counterReactions.clear();
    this.actionResets.clear();
    this.floodOriginalTerrain.clear();
    this.cells.forEach(cell => {
      cell.occupantId = null;
      cell.terrain = TerrainType.Plain;
    });

    this.playerGeneral = playerGeneral;
    this.enemyGeneral  = enemyGeneral;
    this.playerFortressHp = 500;
    this.enemyFortressHp  = 500;
    this.weather     = weather     ?? Weather.Clear;
    this.weatherSchedule = [];
    this.battleTactic = battleTactic ?? BattleTactic.Normal;
    this.sceneFlags = { stealthOpenTurns: 0, nightRaid: false, nightRaidOpenTurns: 0 };
    this.controlledUnits.clear();
    this.fallenUnits = [];
    this.lastSpurtMode = false;
    this.peakTroopCount = 0;
    this.wisdomMeter = 0;
    this.wisdomTriggerCount = 0;
    this.battleEndAnnounced = false;
    this.stageSalvage = { stone: 0, wood: 0, supply: 0, intel: 0, weaponMaterial: 0, instructorExp: 0 };
    this.plunderedTiles = new Set<string>();

    // 重置武將狀態
    playerGeneral.currentHp = playerGeneral.maxHp;
    playerGeneral.currentSp = 0;
    enemyGeneral.currentHp  = enemyGeneral.maxHp;
    enemyGeneral.currentSp  = 0;

    // 套用地形配置
    if (terrainGrid) {
      for (let lane = 0; lane < GAME_CONFIG.GRID_LANES; lane++) {
        for (let depth = 0; depth < GAME_CONFIG.GRID_DEPTH; depth++) {
          const t = terrainGrid[lane]?.[depth];
          if (t) {
            const cell = this.getCell(lane, depth);
            if (cell) cell.terrain = t;
          }
        }
      }
    }
  }

  /** O(1) 索引直算取格 */
  public getCell(lane: number, depth: number): GridCell | null {
    if (lane < 0 || lane >= GAME_CONFIG.GRID_LANES || depth < 0 || depth >= GAME_CONFIG.GRID_DEPTH) {
      return null;
    }
    return this.cells[lane * GAME_CONFIG.GRID_DEPTH + depth];
  }

  public getGeneral(faction: Faction): GeneralUnit | null {
    return faction === Faction.Player ? this.playerGeneral : this.enemyGeneral;
  }

  public addUnit(unit: TroopUnit): void {
    this.units.set(unit.id, unit);
    const cell = this.getCell(unit.lane, unit.depth);
    if (cell) cell.occupantId = unit.id;
  }

  public removeUnit(unitId: string): void {
    const unit = this.units.get(unitId);
    if (!unit) return;
    const cell = this.getCell(unit.lane, unit.depth);
    if (cell?.occupantId === unitId) cell.occupantId = null;
    // 受控兵離場：陣營換回原陣營，陣亡紀錄才不會把敵兵當成我方陣亡兵（PROG-2-1482）
    const control = this.controlledUnits.get(unitId);
    if (control) unit.faction = control.originalFaction;
    // 只有陣亡（血量歸零）才進紀錄；撤退脫離不算陣亡
    if (unit.currentHp <= 0) this.fallenUnits.push(unit);
    this.units.delete(unitId);
    this.controlledUnits.delete(unitId);
    this.removeDamageLinksForUnit(unitId);
    this.removeCounterReaction(unitId);
    this.removeActionReset(unitId);
  }

  /** 控制敵兵 turns 回合（PROG-2-1335 挾天子令）：陣營改為施放者陣營，期滿由 tickControlledUnits 換回 */
  public controlUnit(unit: TroopUnit, casterFaction: Faction, turns: number): boolean {
    if (unit.faction === casterFaction || this.controlledUnits.has(unit.id)) return false;
    this.controlledUnits.set(unit.id, { originalFaction: unit.faction, turnsLeft: turns });
    unit.faction = casterFaction;
    return true;
  }

  /** 每回合結束呼叫：剩餘回合減 1，歸零的單位換回原陣營（若已陣亡則只清紀錄） */
  public tickControlledUnits(): void {
    for (const [unitId, record] of this.controlledUnits) {
      record.turnsLeft -= 1;
      if (record.turnsLeft > 0) continue;
      this.controlledUnits.delete(unitId);
      const unit = this.units.get(unitId);
      if (unit) unit.faction = record.originalFaction;
    }
  }

  /**
   * 復活一名指定陣營的陣亡兵（PROG-2-1334）：依陣亡先後取第一個，放回原格；原格被占就放最近的空格。
   * 沒有可復活的兵或沒有空格時回傳 null，紀錄保留。
   */
  public reviveFallenUnit(faction: Faction, hpRatio: number): TroopUnit | null {
    const index = this.fallenUnits.findIndex(unit => unit.faction === faction);
    if (index < 0) return null;
    const unit = this.fallenUnits[index];
    const cell = this.nearestEmptyCell(unit.lane, unit.depth);
    if (!cell) return null;
    this.fallenUnits.splice(index, 1);
    unit.moveTo(cell.lane, cell.depth);
    unit.currentHp = Math.max(1, Math.floor(unit.maxHp * hpRatio));
    this.addUnit(unit);
    return unit;
  }

  /** 以曼哈頓距離找最近的空格（原格若空則就是原格） */
  private nearestEmptyCell(lane: number, depth: number): { lane: number; depth: number } | null {
    let best: { lane: number; depth: number } | null = null;
    let bestDistance = Infinity;
    for (const cell of this.cells) {
      if (cell.occupantId !== null) continue;
      const distance = Math.abs(cell.lane - lane) + Math.abs(cell.depth - depth);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { lane: cell.lane, depth: cell.depth };
      }
    }
    return best;
  }

  public setTileBuff(buff: TileBuff): void {
    this.tileBuffs.set(`${buff.lane},${buff.depth}`, buff);
  }

  public getTileBuff(lane: number, depth: number): TileBuff | null {
    return this.tileBuffs.get(`${lane},${depth}`) ?? null;
  }

  public removeTileBuff(lane: number, depth: number): TileBuff | null {
    const key = `${lane},${depth}`;
    const buff = this.tileBuffs.get(key) ?? null;
    if (buff) {
      this.tileBuffs.delete(key);
    }
    return buff;
  }

  public setFormationZone(zone: FormationZone): void {
    this.formationZones.set(`${zone.lane},${zone.depth}`, zone);
  }

  public getSelfBurst(faction: Faction): SelfBurstWindow | null {
    return this.selfBursts.get(faction) ?? null;
  }

  public setSelfBurst(faction: Faction, window: SelfBurstWindow | null): void {
    if (window) this.selfBursts.set(faction, window);
    else this.selfBursts.delete(faction);
  }

  public getFormationZone(lane: number, depth: number): FormationZone | null {
    return this.formationZones.get(`${lane},${depth}`) ?? null;
  }

  public setTileEffect(effect: TileEffect): void {
    this.tileEffects.set(`${effect.lane},${effect.depth}`, effect);
  }

  public getTileEffect(lane: number, depth: number): TileEffect | null {
    return this.tileEffects.get(`${lane},${depth}`) ?? null;
  }

  public removeTileEffect(lane: number, depth: number): TileEffect | null {
    const key = `${lane},${depth}`;
    const effect = this.tileEffects.get(key) ?? null;
    if (effect) {
      this.tileEffects.delete(key);
    }
    return effect;
  }

  public setDamageLink(link: DamageLinkState): void {
    this.damageLinks.set(link.primaryUnitUid, link);
  }

  public getDamageLink(primaryUnitUid: string): DamageLinkState | null {
    return this.damageLinks.get(primaryUnitUid) ?? null;
  }

  public removeDamageLinksForUnit(unitId: string): void {
    this.damageLinks.delete(unitId);
    for (const [primaryUnitUid, link] of this.damageLinks.entries()) {
      if (!link.linkedUnitUids.includes(unitId)) {
        continue;
      }
      const remainingLinked = link.linkedUnitUids.filter((linkedUid) => linkedUid !== unitId);
      if (!remainingLinked.length) {
        this.damageLinks.delete(primaryUnitUid);
        continue;
      }
      this.damageLinks.set(primaryUnitUid, {
        ...link,
        linkedUnitUids: remainingLinked,
      });
    }
  }

  public setCounterReaction(state: CounterReactionState): void {
    this.counterReactions.set(state.unitUid, state);
  }

  public getCounterReaction(unitUid: string): CounterReactionState | null {
    return this.counterReactions.get(unitUid) ?? null;
  }

  public removeCounterReaction(unitUid: string): void {
    this.counterReactions.delete(unitUid);
  }

  public setActionReset(state: ActionResetState): void {
    this.actionResets.set(state.unitUid, state);
  }

  public getActionReset(unitUid: string): ActionResetState | null {
    return this.actionResets.get(unitUid) ?? null;
  }

  public removeActionReset(unitUid: string): void {
    this.actionResets.delete(unitUid);
  }

  /** 取得指定路線上指定陣營的所有單位，依 depth 排序 */
  public getUnitsInLane(lane: number, faction: Faction): TroopUnit[] {
    const result: TroopUnit[] = [];
    this.units.forEach(unit => {
      if (unit.lane === lane && unit.faction === faction) result.push(unit);
    });
    result.sort((a, b) => a.depth - b.depth);
    return result;
  }
}
