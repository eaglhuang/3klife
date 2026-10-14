// @spec-source → 武將戰績系統.md §I Data Schema（BattleSnapshot）、§功能清單 #8 單場戰報快照；單場 MVP 公式為暫定（PM 2026-10-14，待定案）
/**
 * BattleSnapshot — 單場戰報快照與單場 MVP、最高傷害（純邏輯，不依賴 cc）
 *
 * 每場戰鬥每位出戰武將存一筆快照（欄位對應規格 BattleSnapshot）。
 * 單場 MVP 的公式規格未定，暫定沿用退役評分的權重（勝×3、擊殺×2、傷害與守護力各÷1000）。
 *
 * Unity 對照：像一筆只讀的戰報 DTO，寫入後不改；統計函式只讀取，不修改快照。
 */
import type { BattlePerformance } from './BattleRecordStats';

export interface BattleSnapshot {
    readonly battleId: string;
    readonly generalUid: string;
    readonly damageDealt: number;
    readonly damageTaken: number;
    readonly healingDone: number;
    readonly kills: number;
    readonly isWinner: boolean;
    /** 遊戲內季度字串，例如 "2026Q3"，規格為 string */
    readonly battleDate: string;
}

function nonNegInt(value: number): number {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** 建立一筆快照：數值無效或為負時視為 0，取整數 */
export function buildBattleSnapshot(
    battleId: string,
    generalUid: string,
    performance: BattlePerformance,
    isWinner: boolean,
    battleDate: string,
): BattleSnapshot {
    return {
        battleId,
        generalUid,
        damageDealt: nonNegInt(performance.damageDealt),
        damageTaken: nonNegInt(performance.damageTaken),
        healingDone: nonNegInt(performance.healingDone),
        kills: nonNegInt(performance.kills),
        isWinner: isWinner === true,
        battleDate,
    };
}

/** 單場 MVP 分數（暫定）：勝 +3、擊殺 ×2、傷害 ÷1000、守護力（承傷+治療）÷1000 */
export function battleMvpScore(snapshot: BattleSnapshot): number {
    const guardian = snapshot.damageTaken + snapshot.healingDone;
    return (snapshot.isWinner ? 3 : 0) + snapshot.kills * 2 + snapshot.damageDealt / 1000 + guardian / 1000;
}

export interface BattleReportSummary {
    /** 單場 MVP 的 generalUid；無快照為 null，同分取先出現者 */
    readonly mvpGeneralUid: string | null;
    /** 單場最高傷害的 generalUid；無快照為 null，同分取先出現者 */
    readonly topDamageGeneralUid: string | null;
}

/** 單場戰報摘要：MVP 與最高傷害，只讀不改 */
export function summarizeBattleReport(snapshots: readonly BattleSnapshot[]): BattleReportSummary {
    let mvp: BattleSnapshot | null = null;
    let mvpScore = -Infinity;
    let top: BattleSnapshot | null = null;
    for (const snapshot of snapshots) {
        const score = battleMvpScore(snapshot);
        if (score > mvpScore) {
            mvp = snapshot;
            mvpScore = score;
        }
        if (top === null || snapshot.damageDealt > top.damageDealt) {
            top = snapshot;
        }
    }
    return {
        mvpGeneralUid: mvp?.generalUid ?? null,
        topDamageGeneralUid: top?.generalUid ?? null,
    };
}
