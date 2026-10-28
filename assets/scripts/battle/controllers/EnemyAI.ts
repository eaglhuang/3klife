// @spec-source → 見 docs/cross-reference-index.md
import {
  Faction,
  GAME_CONFIG,
  TroopType,
  TROOP_COUNTER_MAP,
  TROOP_DEPLOY_COST,
} from "../../core/config/Constants";
import { BattleState } from "../models/BattleState";
import { pickDeployLane } from "../../core/systems/AiLaneStrategy";
import type { AiLaneStrategy } from "../../core/systems/AiProfiles";
import type { AiIqLevel } from "../../core/systems/AiDifficultyTable";
import { pickAiDeployTroop, type AiDeployPreference } from "../../core/systems/AiDeployTroopPick";

export interface DeployDecision {
  type: TroopType;
  lane: number;
}

/** AI 可使用的兵種池（從 MVP 三兵種開始） */
const AI_USABLE_TYPES: TroopType[] = [
  TroopType.Cavalry,
  TroopType.Infantry,
  TroopType.Shield,
  TroopType.Archer,
  TroopType.Pikeman,
];

export class EnemyAI {
  /** random：部署位置與兵種的擲骰來源；正式環境傳存檔亂數源（Q25） */
  constructor(private readonly _random: () => number = Math.random) {}

  /** Profile 路線策略（E-4，PROG-2-1463）；null 時隨機選路 */
  public laneStrategy: AiLaneStrategy | null = null;
  /** AI 智力（難度表 aiIq，PROG-2-1468）；null = 未套難度表，沿用既有剋制機率 */
  public iq: AiIqLevel | null = null;
  /** Profile 部署兵種偏好（E-3，PROG-2-1468）；null 時全兵種隨機 */
  public deployPreference: AiDeployPreference | null = null;

  /**
   * 根據當前棋盤狀態與可用 DP 決定本回合部署。
   * deployCount：本回合部署數上限，由呼叫端依 getAIDeployCount（F-2）算出。
   * 策略：以計數器兵種對抗玩家最多的兵種；無對手時隨機。
   */
  public decideDeploy(state: BattleState, availableDp: number, deployCount: number): DeployDecision[] {
    const decisions: DeployDecision[] = [];
    const deployDepth = GAME_CONFIG.GRID_DEPTH - 1;
    const chosenLanes = new Set<number>();
    const occupancy = this.getLaneOccupancy(state);
    let remaining = availableDp;

    for (let i = 0; i < deployCount; i++) {
      // 決定階段尚未真正生成，同回合已選過的線要排除，否則多支會擠在同一條線
      const freeLanes = this.getFreeLanes(state, deployDepth).filter((lane) => !chosenLanes.has(lane));
      if (freeLanes.length === 0) break;

      const type = this.pickCounterType(state, remaining);
      if (!type) break;

      const cost = TROOP_DEPLOY_COST[type];
      if (remaining < cost) break;
      remaining -= cost;

      const lane = pickDeployLane(this.laneStrategy, freeLanes, occupancy, this._random)!;
      chosenLanes.add(lane);
      occupancy.own[lane] += 1;
      decisions.push({ type, lane });
    }

    return decisions;
  }

  /** 挑本支要出的兵種：先看玩家最多的兵種，再交給 pickAiDeployTroop 依 IQ 與偏好決定 */
  private pickCounterType(state: BattleState, availableDp: number): TroopType | null {
    const affordable = AI_USABLE_TYPES.filter((t) => TROOP_DEPLOY_COST[t] <= availableDp);
    if (affordable.length === 0) return null;

    // 統計玩家各兵種數量
    const counts = new Map<TroopType, number>();
    state.units.forEach(unit => {
      if (unit.faction === Faction.Player) {
        counts.set(unit.type, (counts.get(unit.type) ?? 0) + 1);
      }
    });

    // 找出玩家最多的兵種
    let mostCommon: TroopType | null = null;
    let maxCount = 0;
    counts.forEach((count, type) => {
      if (count > maxCount) { mostCommon = type; maxCount = count; }
    });

    // 依 IQ 與 Profile 偏好挑兵種（E-4 AI_Deploy，PROG-2-1468）；將軍不是全知全能，剋制仍有機率
    return pickAiDeployTroop({
      iq: this.iq,
      affordable,
      playerMostCommon: mostCommon,
      counterMap: TROOP_COUNTER_MAP,
      preference: this.deployPreference,
      counterChance: GAME_CONFIG.AI_COUNTER_STRATEGY_CHANCE,
      random: this._random,
    });
  }

  /** 各線部隊數（AI 己方 / 玩家），同回合已決定的部署會再累加到 own */
  private getLaneOccupancy(state: BattleState): { own: number[]; opponent: number[] } {
    const own = new Array<number>(GAME_CONFIG.GRID_LANES).fill(0);
    const opponent = new Array<number>(GAME_CONFIG.GRID_LANES).fill(0);
    state.units.forEach((unit) => {
      if (unit.isDead() || unit.lane < 0 || unit.lane >= GAME_CONFIG.GRID_LANES) return;
      if (unit.faction === Faction.Enemy) own[unit.lane] += 1;
      else opponent[unit.lane] += 1;
    });
    return { own, opponent };
  }

  private getFreeLanes(state: BattleState, deployDepth: number): number[] {
    const free: number[] = [];
    for (let lane = 0; lane < GAME_CONFIG.GRID_LANES; lane++) {
      if (!state.getCell(lane, deployDepth)?.occupantId) free.push(lane);
    }
    return free;
  }
}
