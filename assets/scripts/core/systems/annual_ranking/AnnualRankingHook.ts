/**
 * 史境天下風雲榜動態記帳 Hook 橋接器（PROG-2-9601 PR2）
 * 職責：
 * 1. 統一對接戰場（手動、極速決戰、委託代打）、治理季結與歌劇廳演藝熱度
 * 2. 嚴格落實戰場一致性（TC-RNK-02）
 * 3. 確保模組高度解耦，各子系統僅透過此 Hook 回報指標，核心引擎與戰鬥底座不形成循環依賴
 */

import { AnnualRankingManager } from './AnnualRankingManager';
import type { AnnualGeneralLedger } from './AnnualGeneralLedger';

export interface BattleRecordPayload {
  generalId: string;
  kills: number;
  enemyPower: number;
  duelTier?: 'none' | 'officer' | 'elite' | 'legend';
  isCommander?: boolean;
  battleMode?: 'manual' | 'speed' | 'delegate';
}

export interface GovernanceRecordPayload {
  generalId: string;
  quarter: number;
  taskType: string;
  output: number;
  effRate?: number;
  isVolunteered?: boolean;
}

export interface CharmRecordPayload {
  generalId: string;
  playTitle: string;
  theaterPrestige: number;
  playHeat: number;
  repeatCount?: number;
  banquetDiploHype?: number;
}

export class AnnualRankingHook {
  /**
   * 戰鬥結算記帳（保證手動、極速決戰、委託代打口徑 100% 一致）
   */
  public static recordBattle(payload: BattleRecordPayload, customLedger?: AnnualGeneralLedger): void {
    if (!payload.generalId) return;
    const ledger = customLedger || AnnualRankingManager.getInstance().ledger;
    ledger.recordBattlePerformance(
      payload.generalId,
      Math.max(0, payload.kills || 0),
      Math.max(0, payload.enemyPower || 0),
      payload.duelTier || 'none',
      !!payload.isCommander,
      payload.battleMode || 'manual'
    );
  }

  /**
   * 治理季結產出記帳
   */
  public static recordGovernance(payload: GovernanceRecordPayload, customLedger?: AnnualGeneralLedger): void {
    if (!payload.generalId) return;
    const ledger = customLedger || AnnualRankingManager.getInstance().ledger;
    ledger.recordGovernanceOutput(
      payload.generalId,
      payload.quarter || 1,
      payload.taskType || 'default',
      Math.max(0, payload.output || 0),
      payload.effRate !== undefined ? payload.effRate : 1.0,
      !!payload.isVolunteered
    );
  }

  /**
   * 演藝與宴席熱度記帳
   */
  public static recordCharm(payload: CharmRecordPayload, customLedger?: AnnualGeneralLedger): void {
    if (!payload.generalId) return;
    const ledger = customLedger || AnnualRankingManager.getInstance().ledger;
    ledger.recordCharmPerformance(
      payload.generalId,
      payload.playTitle ?? '',
      Math.max(0, payload.theaterPrestige || 0),
      Math.max(0, payload.playHeat || 0),
      Math.max(0, payload.repeatCount || 0),
      Math.max(0, payload.banquetDiploHype || 0)
    );
  }
}
