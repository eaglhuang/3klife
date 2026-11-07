// @spec-source → 戰場地格狀態機四態轉換與圖層資料結構規格書.md (doc_spec_0339) §2 狀態消長與相互覆蓋矩陣（PROG-2-2024）
import type { TileStateKind } from './TileStateRules';

/**
 * 同一格被施加新效果時的消長判定（純資料表＋純函式）。
 * 規則依序比對，第一條命中者生效；都沒命中時新效果直接覆蓋舊狀態。
 */

export interface TileLayer {
    readonly kind: TileStateKind;
    /** 具體標籤，例如 fire、poison、trap、forest、steam、water_surge */
    readonly tag: string;
    /** 剩餘回合；-1 為永久環境 */
    readonly durationTurns: number;
    readonly intensity: number;
}

/** 施加到格子上的效果；element 用於比對消長（水、火…），layer 是不觸發任何規則時要放上的狀態 */
export interface TileApplication {
    readonly element: string;
    readonly layer: TileLayer;
}

export interface TileInteractionRule {
    readonly id: string;
    readonly currentKind: TileStateKind;
    /** 空陣列代表任何標籤都符合 */
    readonly currentTags: readonly string[];
    readonly appliedElement: string;
    /** null 代表結果沿用施加的 layer */
    readonly result: TileLayer | null;
    /** 是否逼出格內隱匿單位 */
    readonly reveal: boolean;
}

export const TILE_INTERACTION_RULES: readonly TileInteractionRule[] = [
    // §2.1 水火互克：火海遇水即滅，留 1 回合濃霧掩體
    { id: 'water-quench-fire', currentKind: 'hazard', currentTags: ['fire'], appliedElement: 'water', result: { kind: 'stealth', tag: 'steam', durationTurns: 1, intensity: 0 }, reveal: false },
    // §2.3 燃燒焚林：密林遇火轉火海，並逼出伏兵
    { id: 'fire-burn-forest', currentKind: 'stealth', currentTags: ['forest'], appliedElement: 'fire', result: { kind: 'hazard', tag: 'fire', durationTurns: 2, intensity: 1 }, reveal: true },
    // §2.2 位移覆蓋危害：強力水淹沖刷毒沼與普通陷阱
    { id: 'surge-wash-hazard', currentKind: 'hazard', currentTags: ['poison', 'trap'], appliedElement: 'water_surge', result: null, reveal: false },
];

export interface TileInteractionOutcome {
    readonly layer: TileLayer;
    readonly reveal: boolean;
    /** 命中的規則 id；未命中為 null（直接覆蓋） */
    readonly ruleId: string | null;
}

export function resolveTileInteraction(
    current: TileLayer,
    applied: TileApplication,
    rules: readonly TileInteractionRule[] = TILE_INTERACTION_RULES,
): TileInteractionOutcome {
    for (const rule of rules) {
        if (rule.currentKind !== current.kind || rule.appliedElement !== applied.element) continue;
        if (rule.currentTags.length > 0 && !rule.currentTags.includes(current.tag)) continue;
        return { layer: { ...(rule.result ?? applied.layer) }, reveal: rule.reveal, ruleId: rule.id };
    }
    return { layer: { ...applied.layer }, reveal: current.kind === 'stealth' && applied.layer.kind !== 'stealth', ruleId: null };
}
