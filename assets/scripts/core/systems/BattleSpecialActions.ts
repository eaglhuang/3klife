// @spec-source → 因子解鎖系統.md (doc_spec_0009) §F「戰場覺醒觸發」、因子爆發系統.md (doc_spec_0010) §F「因子覺醒觸發」
/**
 * BattleSpecialActions — 戰場「特定動作」偵測，純邏輯，不依賴 cc
 *
 * 規格重點：
 * - 戰場覺醒 0.05；做出特定動作（如騎兵衝鋒 → 粉色騎兵因子）提升到 0.15
 * - 綠 / 白 = 戰場特定動作；紫 / 紅 = 高等級戰場特殊條件
 * - 討論來源列出的動作：騎兵衝鋒、水戰、背刺、絕境反擊、對應地形
 *
 * 暫定（規格沒寫判定細節，PROG-2-0048）：
 * - 只偵測我方；每場戰鬥結束時結算一次，交給 GameSession.recordBattle
 * - 騎兵衝鋒：我方騎兵擊破敵方單位累計 2 次
 * - 水戰：我方單位站在河流格擊破敵方單位累計 2 次
 * - 山地 / 林地作戰：我方單位站在山地 / 林地格擊破敵方單位累計 2 次
 * - 背刺：我方單位從敵方單位側面或背後（敵方前進方向的反側）命中 1 次
 * - 絕境反擊：我方主將血量曾降到 25% 以下，最後仍然戰勝
 * - 「高等級戰場特殊條件」= 任一特定動作；紫紅仍受 discoveryLevel 45 門檻限制
 * - 每個動作帶一組因子標籤（對應 gene-dictionary.json 的 defaultTags），
 *   覺醒時優先挑標籤相符的因子，沒有相符的才從全部候選裡挑
 *
 * Unity 對照：像掛在戰場上的 AchievementTracker，只聽 OnUnitDamaged / OnGeneralDamaged 事件累計計數，
 * 戰鬥結束時呼叫 Finish(result) 拿到本場達成的動作清單，不碰任何 MonoBehaviour。
 */
import { Faction, TerrainType, TroopType } from '../../shared/CommonEnums';

export type BattleSpecialActionId =
    | 'cavalry-charge'
    | 'naval-battle'
    | 'mountain-battle'
    | 'forest-battle'
    | 'backstab'
    | 'last-stand';

export interface BattleSpecialActionRule {
    id: BattleSpecialActionId;
    displayName: string;
    /** 本場需要累計幾次才算達成 */
    threshold: number;
    /** 覺醒時優先挑的因子標籤（gene-dictionary defaultTags） */
    factorTags: readonly string[];
}

export const BATTLE_SPECIAL_ACTION_RULES: Readonly<Record<BattleSpecialActionId, BattleSpecialActionRule>> = {
    'cavalry-charge': { id: 'cavalry-charge', displayName: '騎兵衝鋒', threshold: 2, factorTags: ['cavalry', 'charge'] },
    'naval-battle': { id: 'naval-battle', displayName: '水戰', threshold: 2, factorTags: ['naval', 'river', 'water'] },
    'mountain-battle': { id: 'mountain-battle', displayName: '山地作戰', threshold: 2, factorTags: ['mountain'] },
    'forest-battle': { id: 'forest-battle', displayName: '林地作戰', threshold: 2, factorTags: ['forest'] },
    backstab: { id: 'backstab', displayName: '背刺', threshold: 1, factorTags: ['pierce', 'pursuit', 'ambush'] },
    'last-stand': { id: 'last-stand', displayName: '絕境反擊', threshold: 1, factorTags: ['counter', 'survival'] },
};

/** 偵測結果的固定輸出順序 */
export const BATTLE_SPECIAL_ACTION_ORDER: readonly BattleSpecialActionId[] = [
    'cavalry-charge',
    'naval-battle',
    'mountain-battle',
    'forest-battle',
    'backstab',
    'last-stand',
];

/** 主將血量低於這個比例視為陷入絕境（暫定） */
export const LAST_STAND_HP_RATIO = 0.25;

const TERRAIN_KILL_ACTION: Partial<Record<TerrainType, BattleSpecialActionId>> = {
    [TerrainType.River]: 'naval-battle',
    [TerrainType.Mountain]: 'mountain-battle',
    [TerrainType.Forest]: 'forest-battle',
};

/** 一次單位受傷事件（欄位與 EVENT_NAMES.UnitDamaged 的 payload 對齊，攻方資訊由呼叫端從戰場狀態查好） */
export interface UnitHitObservation {
    attackerFaction: Faction | null;
    attackerType: TroopType | null;
    /** 攻方是否為主將單位（主將不算騎兵衝鋒等兵種動作） */
    attackerIsGeneral?: boolean;
    attackerTerrain: TerrainType | null;
    attackerLane: number | null;
    attackerDepth: number | null;
    defenderLane: number | null;
    defenderDepth: number | null;
    damage: number;
    /** 受傷後剩餘血量；≤ 0 視為擊破 */
    defenderHpAfter: number;
}

export interface GeneralHpObservation {
    faction: Faction;
    hp: number;
    maxHp: number;
}

/** EVENT_NAMES.UnitDamaged 的 payload（只列偵測需要的欄位） */
export interface UnitDamagedPayload {
    damage: number;
    hp: number;
    attackerId: string | null;
    attackerLane: number | null;
    attackerDepth: number | null;
    defenderLane: number | null;
    defenderDepth: number | null;
    attackerFaction: Faction | null;
}

/** 從戰場狀態查攻方資訊的最小介面（正式環境由 BattleState / BattleController 提供） */
export interface BattleHitLookup {
    unitType(unitId: string): TroopType | null;
    isGeneralUnit(unitId: string): boolean;
    terrainAt(lane: number, depth: number): TerrainType | null;
}

/** 把 UnitDamaged 事件轉成偵測用的觀測值；要在攻方單位還在場上時呼叫（事件當下） */
export function toUnitHitObservation(payload: UnitDamagedPayload, lookup: BattleHitLookup): UnitHitObservation {
    const attackerId = payload.attackerId;
    return {
        attackerFaction: payload.attackerFaction,
        attackerType: attackerId ? lookup.unitType(attackerId) : null,
        attackerIsGeneral: attackerId ? lookup.isGeneralUnit(attackerId) : false,
        attackerTerrain: payload.attackerLane !== null && payload.attackerDepth !== null
            ? lookup.terrainAt(payload.attackerLane, payload.attackerDepth)
            : null,
        attackerLane: payload.attackerLane,
        attackerDepth: payload.attackerDepth,
        defenderLane: payload.defenderLane,
        defenderDepth: payload.defenderDepth,
        damage: payload.damage,
        defenderHpAfter: payload.hp,
    };
}

/** 我方攻擊敵方時，攻方是否在敵方側面或背後（敵方往 depth 遞減的方向前進，背後是 depth 較大的一側） */
export function isFlankOrRearHit(hit: Pick<UnitHitObservation, 'attackerLane' | 'attackerDepth' | 'defenderLane' | 'defenderDepth'>): boolean {
    const { attackerLane, attackerDepth, defenderLane, defenderDepth } = hit;
    if (attackerLane === null || attackerDepth === null || defenderLane === null || defenderDepth === null) return false;
    if (attackerDepth > defenderDepth) return true;
    return attackerDepth === defenderDepth && attackerLane !== defenderLane;
}

export class BattleSpecialActionTracker {
    private _counts = new Map<BattleSpecialActionId, number>();
    private _playerGeneralInPeril = false;

    public reset(): void {
        this._counts.clear();
        this._playerGeneralInPeril = false;
    }

    public observeUnitHit(hit: UnitHitObservation): void {
        if (hit.attackerFaction !== Faction.Player || !(hit.damage > 0)) return;

        if (isFlankOrRearHit(hit)) this._bump('backstab');

        if (hit.defenderHpAfter > 0) return;
        if (!hit.attackerIsGeneral && hit.attackerType === TroopType.Cavalry) this._bump('cavalry-charge');
        const terrainAction = hit.attackerTerrain ? TERRAIN_KILL_ACTION[hit.attackerTerrain] : undefined;
        if (terrainAction) this._bump(terrainAction);
    }

    public observeGeneralHp(observation: GeneralHpObservation): void {
        if (observation.faction !== Faction.Player || !(observation.maxHp > 0)) return;
        if (observation.hp > 0 && observation.hp / observation.maxHp <= LAST_STAND_HP_RATIO) {
            this._playerGeneralInPeril = true;
        }
    }

    /** 本場目前累計的次數（除錯 / 測試用） */
    public count(id: BattleSpecialActionId): number {
        return this._counts.get(id) ?? 0;
    }

    /** 結算本場達成的特定動作；不會清空計數，下一場開打前請呼叫 reset() */
    public finish(result: string): BattleSpecialActionId[] {
        const done = new Set<BattleSpecialActionId>();
        for (const id of BATTLE_SPECIAL_ACTION_ORDER) {
            if (id === 'last-stand') continue;
            if (this.count(id) >= BATTLE_SPECIAL_ACTION_RULES[id].threshold) done.add(id);
        }
        if (this._playerGeneralInPeril && result === 'player-win') done.add('last-stand');
        return BATTLE_SPECIAL_ACTION_ORDER.filter((id) => done.has(id));
    }

    private _bump(id: BattleSpecialActionId): void {
        this._counts.set(id, this.count(id) + 1);
    }
}

/** 把動作清單轉成去重後的因子標籤 */
export function specialActionFactorTags(actions: readonly string[]): string[] {
    const tags = new Set<string>();
    for (const action of actions) {
        const rule = BATTLE_SPECIAL_ACTION_RULES[action as BattleSpecialActionId];
        for (const tag of rule?.factorTags ?? []) tags.add(tag);
    }
    return Array.from(tags);
}

export function specialActionDisplayName(action: string): string {
    return BATTLE_SPECIAL_ACTION_RULES[action as BattleSpecialActionId]?.displayName ?? action;
}
