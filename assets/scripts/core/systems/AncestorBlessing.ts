// @spec-source → 英靈世家系統 §D-4 傳道權限、§A-3 英靈卡用途（SPI-11，PROG-2-1964）
/**
 * AncestorBlessing — 英靈卡授與祖靈加護（純邏輯，不依賴 cc）。
 *
 * - 英靈卡可對特定子嗣或血脈分支授與祖靈加護；每次消耗資源與一次授與次數。
 * - 只能授給同家族（Spirit_Family_Key 相同）的對象；同一對象不重複授與。
 * - 直接傳授專屬奧義已由 LegendaryMentoring（MENT-15，傳道令 ×1、一生一次）處理，本檔不重做。
 *
 * 暫定：每卡授與次數、每次消耗哪種資源與多少，規格未給，由呼叫端傳入。
 * Unity 對照：像有充能次數的技能，施放前檢查目標、次數、資源，成功才扣。
 */

export type AncestorBlessingTarget =
    | { kind: 'DESCENDANT'; generalUid: string }
    | { kind: 'BRANCH'; branchKey: string };

export type AncestorBlessingBlock =
    | 'NO_CHARGES'
    | 'NOT_ENOUGH_RESOURCE'
    | 'DIFFERENT_FAMILY'
    | 'ALREADY_BLESSED';

export interface AncestorBlessingInput {
    spiritCardUid: string;
    cardFamilyKey: string;
    targetFamilyKey: string;
    target: AncestorBlessingTarget;
    chargesRemaining: number;
    resource: number;
    resourceCost: number;
    /** 這張卡已授過的對象鍵（呼叫端保存，見 blessingTargetKey）。 */
    blessedTargetKeys: readonly string[];
}

export interface AncestorBlessingOutcome {
    chargesRemaining: number;
    resource: number;
    blessedTargetKeys: string[];
    targetKey: string;
}

function finiteOr0(value: number): number {
    return Number.isFinite(value) ? value : 0;
}

/** 對象鍵：子嗣與分支分開，避免撞名。 */
export function blessingTargetKey(target: AncestorBlessingTarget): string {
    return target.kind === 'DESCENDANT' ? `G:${target.generalUid}` : `B:${target.branchKey}`;
}

/** 能否授與：依序檢查家族、重複、次數、資源。 */
export function checkAncestorBlessing(input: AncestorBlessingInput): { ok: boolean; blocked?: AncestorBlessingBlock } {
    if (input.cardFamilyKey !== input.targetFamilyKey) return { ok: false, blocked: 'DIFFERENT_FAMILY' };
    if (input.blessedTargetKeys.includes(blessingTargetKey(input.target))) return { ok: false, blocked: 'ALREADY_BLESSED' };
    if (finiteOr0(input.chargesRemaining) < 1) return { ok: false, blocked: 'NO_CHARGES' };
    if (finiteOr0(input.resource) < Math.max(0, finiteOr0(input.resourceCost))) return { ok: false, blocked: 'NOT_ENOUGH_RESOURCE' };
    return { ok: true };
}

/** 執行授與（不改輸入）：通過才扣一次次數與資源並記下對象；失敗回傳 null。 */
export function grantAncestorBlessing(input: AncestorBlessingInput): AncestorBlessingOutcome | null {
    if (!checkAncestorBlessing(input).ok) return null;
    const targetKey = blessingTargetKey(input.target);
    return {
        chargesRemaining: finiteOr0(input.chargesRemaining) - 1,
        resource: finiteOr0(input.resource) - Math.max(0, finiteOr0(input.resourceCost)),
        blessedTargetKeys: [...input.blessedTargetKeys, targetKey],
        targetKey,
    };
}
