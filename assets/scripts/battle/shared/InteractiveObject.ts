// @spec-source → 戰場視覺四層渲染與互動戰術物件狀態機規格書.md（doc_spec_0350）；PROG-2-2036
/**
 * InteractiveObject — 戰場四大互動物件的 HP 狀態機與連動效果描述（純邏輯，不依賴 cc）
 *
 * - §2 Normal →（受擊／踩踏）→ Damaged →（HP 歸零）→ Triggered／Destroyed；終態不再變化。
 * - 只回傳「該觸發什麼」（地格效果、士氣、糧草、日誌事件），實際套用由戰場流程負責。
 * - §1 四層 Z 值常數一併放這裡，供畫面端排序。
 * 既有 BattleTileEffectPhase 的水閘佔領、伏擊陷阱（地格效果版）未改，兩者如何合併另卡。
 */

/** §1 四層渲染 Z 值區間 */
export const BATTLE_RENDER_LAYERS = {
    background: { min: 0, max: 0 },
    decal: { min: 10, max: 20 },
    standee: { min: 100, max: 200 },
    hud: { min: 1000, max: Number.MAX_SAFE_INTEGER },
} as const;

export enum InteractiveObjectType {
    Rockfall = 'Rockfall_Node',
    Floodgate = 'Floodgate',
    CampTarget = 'Camp_Target',
    TrapCluster = 'Trap_Cluster',
}

export enum ObjectLifecycleState {
    Normal = 'Normal',
    Damaged = 'Damaged',
    Triggered = 'Triggered',
    Destroyed = 'Destroyed',
}

export interface InteractiveObjectEntity {
    objectId: string;
    type: InteractiveObjectType;
    tileCoord: { x: number; y: number };
    maxHp: number;
    currentHp: number;
    state: ObjectLifecycleState;
    targetHazardEffect?: string;
}

/** §2 物件表：基礎 HP、終態、連動效果 */
export const INTERACTIVE_OBJECT_TABLE: Readonly<Record<InteractiveObjectType, { hp: number; endState: ObjectLifecycleState }>> = {
    [InteractiveObjectType.Rockfall]: { hp: 800, endState: ObjectLifecycleState.Triggered },
    [InteractiveObjectType.Floodgate]: { hp: 1200, endState: ObjectLifecycleState.Triggered },
    [InteractiveObjectType.CampTarget]: { hp: 2000, endState: ObjectLifecycleState.Destroyed },
    [InteractiveObjectType.TrapCluster]: { hp: 1, endState: ObjectLifecycleState.Triggered },
};

export const INTERACTIVE_OBJECT_EFFECTS = {
    rockfall: { tileEffect: 'Hazard(Rock)', tiles: 3, durationTurns: 2 },
    floodgate: { tileEffect: 'ForceMove(Water)', pushTiles: 4 },
    camp: { enemyMoraleDelta: -20, salvageGrain: 500, logEvent: 'camp-target-destroyed' },
    trap: { troopLossRatio: 0.15, rootTurns: 1 },
};

export type InteractiveObjectOutcome =
    | { kind: 'tile-effect'; tileEffect: string; tiles: number; durationTurns?: number; pushTiles?: number }
    | { kind: 'camp-destroyed'; enemyMoraleDelta: number; salvageGrain: number; logEvent: string }
    | { kind: 'trap-sprung'; troopLossRatio: number; rootTurns: number };

export function createInteractiveObject(
    objectId: string,
    type: InteractiveObjectType,
    tileCoord: { x: number; y: number },
    targetHazardEffect?: string,
): InteractiveObjectEntity {
    const hp = INTERACTIVE_OBJECT_TABLE[type].hp;
    return { objectId, type, tileCoord: { ...tileCoord }, maxHp: hp, currentHp: hp, state: ObjectLifecycleState.Normal, ...(targetHazardEffect ? { targetHazardEffect } : {}) };
}

export function isObjectSpent(entity: InteractiveObjectEntity): boolean {
    return entity.state === ObjectLifecycleState.Triggered || entity.state === ObjectLifecycleState.Destroyed;
}

function outcomeOf(entity: InteractiveObjectEntity): InteractiveObjectOutcome {
    const fx = INTERACTIVE_OBJECT_EFFECTS;
    switch (entity.type) {
        case InteractiveObjectType.Rockfall:
            return { kind: 'tile-effect', tileEffect: entity.targetHazardEffect ?? fx.rockfall.tileEffect, tiles: fx.rockfall.tiles, durationTurns: fx.rockfall.durationTurns };
        case InteractiveObjectType.Floodgate:
            return { kind: 'tile-effect', tileEffect: entity.targetHazardEffect ?? fx.floodgate.tileEffect, tiles: fx.floodgate.pushTiles, pushTiles: fx.floodgate.pushTiles };
        case InteractiveObjectType.CampTarget:
            return { kind: 'camp-destroyed', enemyMoraleDelta: fx.camp.enemyMoraleDelta, salvageGrain: fx.camp.salvageGrain, logEvent: fx.camp.logEvent };
        case InteractiveObjectType.TrapCluster:
            return { kind: 'trap-sprung', troopLossRatio: fx.trap.troopLossRatio, rootTurns: fx.trap.rootTurns };
    }
}

export interface InteractiveObjectHitResult {
    entity: InteractiveObjectEntity;
    outcome: InteractiveObjectOutcome | null;
}

/** 受擊扣血；歸零時進入終態並回傳連動效果。已終態的物件不再反應。 */
export function damageInteractiveObject(entity: InteractiveObjectEntity, damage: number): InteractiveObjectHitResult {
    if (isObjectSpent(entity) || !(damage > 0)) return { entity, outcome: null };
    const currentHp = Math.max(0, entity.currentHp - Math.floor(damage));
    if (currentHp > 0) return { entity: { ...entity, currentHp, state: ObjectLifecycleState.Damaged }, outcome: null };
    const next = { ...entity, currentHp: 0, state: INTERACTIVE_OBJECT_TABLE[entity.type].endState };
    return { entity: next, outcome: outcomeOf(next) };
}

/** 直接觸發：陷阱被踏入、水閘被水系戰法引動、糧倉被近戰佔領 */
export function triggerInteractiveObject(entity: InteractiveObjectEntity): InteractiveObjectHitResult {
    if (isObjectSpent(entity)) return { entity, outcome: null };
    return damageInteractiveObject(entity, entity.currentHp);
}
