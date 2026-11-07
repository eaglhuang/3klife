// @spec-source → 戰前情報偵查面板與戰法對策槽位容量規格書.md（doc_spec_0347）；PROG-2-2033
/**
 * ScoutIntel — 戰前偵查情報四區塊、情報防火牆與戰法槽位容量（純邏輯，不依賴 cc）
 *
 * - §1 只輸出四區塊的宏觀情資；敵軍站位、埋伏座標、AI 路徑一律不進面板。
 * - §2 三態檢核沿用 LoadoutCheck.checkRecommendedLoadout；高風險只跳確認框，不鎖出征。
 * - §3 槽位容量 min(6, 2 + floor(INT/30) + 培育 S +1 + 連環決戰通關 +1)。
 *   既有 TacticLoadout（1 + floor(INT/30)，上限 4）未改，兩者取捨待裁決。
 */
import type { LoadoutCheckState } from './LoadoutCheck';

export interface ScoutEnemyLeader {
    name: string;
    title?: string;
    powerGrade?: string;
    troopType?: string;
}

export interface ScoutPanelIntel {
    enemyLeader: ScoutEnemyLeader | null;
    coreMechanics: string[];
    riskTags: string[];
    loadoutState: LoadoutCheckState;
    loadoutGaps: string[];
}

/** §1 防火牆：關卡資料中不得帶進面板的欄位 */
export const SCOUT_FORBIDDEN_FIELDS: readonly string[] = ['formation', 'enemyPositions', 'ambushCoords', 'aiPath', 'spawnPoints'];

export interface ScoutStageSource {
    enemyLeader?: ScoutEnemyLeader | null;
    coreMechanics?: readonly string[];
    riskTags?: readonly string[];
    [field: string]: unknown;
}

/** §1 只取四區塊需要的欄位，其餘（含站位、埋伏、路徑）一律丟棄 */
export function buildScoutPanelIntel(
    stage: ScoutStageSource,
    loadout: { state: LoadoutCheckState; gaps: readonly string[] },
): ScoutPanelIntel {
    const leader = stage.enemyLeader
        ? {
            name: stage.enemyLeader.name,
            ...(stage.enemyLeader.title !== undefined ? { title: stage.enemyLeader.title } : {}),
            ...(stage.enemyLeader.powerGrade !== undefined ? { powerGrade: stage.enemyLeader.powerGrade } : {}),
            ...(stage.enemyLeader.troopType !== undefined ? { troopType: stage.enemyLeader.troopType } : {}),
        }
        : null;
    return {
        enemyLeader: leader,
        coreMechanics: Array.from(stage.coreMechanics ?? []),
        riskTags: Array.from(stage.riskTags ?? []),
        loadoutState: loadout.state,
        loadoutGaps: Array.from(loadout.gaps),
    };
}

/** 面板輸出是否夾帶禁止欄位（防回歸用） */
export function findScoutLeaks(intel: object): string[] {
    const leaks: string[] = [];
    const walk = (value: unknown): void => {
        if (!value || typeof value !== 'object') return;
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
            if (SCOUT_FORBIDDEN_FIELDS.includes(key)) leaks.push(key);
            walk(child);
        }
    };
    walk(intel);
    return leaks;
}

export type ScoutSortieAction = 'sortie' | 'confirm-then-sortie';

/** §2 高風險協議：只多一道確認框，絕不鎖死出征 */
export function scoutSortieAction(state: LoadoutCheckState): ScoutSortieAction {
    return state === 'high-risk' ? 'confirm-then-sortie' : 'sortie';
}

export type NurtureRank = 'S' | 'A' | 'B' | 'C';

export const TACTIC_SLOT_TUNING = { base: 2, intPerSlot: 30, max: 6, min: 2 };

export interface GeneralLoadoutCapacityInput {
    intelligence: number;
    nurtureRank: NurtureRank;
    stageChainCompleted: boolean;
}

/** §3 / §4 戰法槽位數，落在 2～6 */
export function computeTacticSlotCapacity(input: GeneralLoadoutCapacityInput): number {
    const t = TACTIC_SLOT_TUNING;
    const intBonus = Math.floor(Math.max(0, input.intelligence) / t.intPerSlot);
    const nurtureBonus = input.nurtureRank === 'S' ? 1 : 0;
    const stageBonus = input.stageChainCompleted ? 1 : 0;
    return Math.max(t.min, Math.min(t.max, t.base + intBonus + nurtureBonus + stageBonus));
}
