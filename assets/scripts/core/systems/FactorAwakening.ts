// @spec-source → 因子解鎖系統.md (doc_spec_0013) §A §F、因子爆發系統.md (doc_spec_0010) §F「因子覺醒觸發」
/**
 * FactorAwakening — 因子覺醒（解鎖）規則，純邏輯，不依賴 cc
 *
 * 規格重點：
 * - 子嗣開獎時只解鎖 Discovery_Level 1 的藍 / 粉；其餘因子保持灰色鎖頭，之後靠覺醒事件逐個點亮
 * - 三階段：Phase 1（Discovery_Level 1）藍粉、Phase 2（20）綠白、Phase 3（45）紫紅
 * - 觸發方式：藍/粉 = 培育窺探或戰場；綠/白 = 教官觸發或戰場特定動作；紫/紅 = 高等級戰場特殊條件；
 *   名士占卜三個階段都可用（因子解鎖系統「三種途徑」）
 *
 * 決策（PROG-2-0037，規格未定的部分）：
 * - 「玩家等級 / 培育等級 / 觀察能力」三處來源互相矛盾，且武將已取消 Level/EXP，
 *   所以統一成玩家層級的 discoveryLevel 數字，由呼叫端（GameSession）持有
 * - 門檻以 Discovery_Level 45 為準（程式既有常數），不是文字敘述的 Lv46
 *
 * Unity 對照：像一個 static class 的 AchievementUnlocker.TryUnlock(player, id, source)，
 * 只回傳「解鎖結果與新資料」，由 GameManager 負責存檔與廣播事件。
 */
import type { GeneralConfig, GeneralGeneConfig } from '../models/GeneralUnit';
import { FACTOR_DISCOVERY_LEVEL, FactorColor, normalizeFactorColor } from './FactorInheritance';

export type AwakeningTrigger = 'nurture-peek' | 'battle' | 'mentor' | 'sage';

export const AWAKENING_TRIGGERS_BY_COLOR: Record<FactorColor, readonly AwakeningTrigger[]> = {
    blue: ['nurture-peek', 'battle', 'sage'],
    pink: ['nurture-peek', 'battle', 'sage'],
    green: ['mentor', 'battle', 'sage'],
    white: ['mentor', 'battle', 'sage'],
    purple: ['battle', 'sage'],
    red: ['battle', 'sage'],
};

/** 依 discoveryLevel 回傳目前所在階段 1 / 2 / 3 */
export function discoveryPhase(discoveryLevel: number): 1 | 2 | 3 {
    if (discoveryLevel >= FACTOR_DISCOVERY_LEVEL.purple) return 3;
    if (discoveryLevel >= FACTOR_DISCOVERY_LEVEL.green) return 2;
    return 1;
}

export type AwakeningFailReason =
    | 'no-such-general'
    | 'no-such-factor'
    | 'already-unlocked'
    | 'level-too-low'
    | 'trigger-not-allowed';

export interface FactorAwakenedEvent {
    generalId: string;
    factorId: string;
    color: FactorColor | null;
    level: number;
    trigger: AwakeningTrigger;
    displayName: string;
}

export type AwakeningResult =
    | { ok: true; general: GeneralConfig; event: FactorAwakenedEvent }
    | { ok: false; reason: AwakeningFailReason };

/**
 * 嘗試覺醒一個因子；失敗時不改資料。
 * 門檻優先序：gene.discoveryLevel（出生時寫入）→ 色系預設門檻。
 */
export function awakenFactor(
    general: GeneralConfig | undefined,
    factorId: string,
    trigger: AwakeningTrigger,
    discoveryLevel: number,
): AwakeningResult {
    if (!general) return { ok: false, reason: 'no-such-general' };
    const genes: GeneralGeneConfig[] = general.genes ?? [];
    const index = genes.findIndex((gene) => gene.id === factorId);
    if (index < 0) return { ok: false, reason: 'no-such-factor' };

    const gene = genes[index];
    if (gene.isLocked === false) return { ok: false, reason: 'already-unlocked' };

    const color = normalizeFactorColor(gene.type);
    if (color && !AWAKENING_TRIGGERS_BY_COLOR[color].includes(trigger)) {
        return { ok: false, reason: 'trigger-not-allowed' };
    }
    const required = gene.discoveryLevel ?? (color ? FACTOR_DISCOVERY_LEVEL[color] : 1);
    if (discoveryLevel < required) return { ok: false, reason: 'level-too-low' };

    const nextGenes = genes.map((g, i) => (i === index ? { ...g, isLocked: false } : { ...g }));
    return {
        ok: true,
        general: { ...general, genes: nextGenes },
        event: {
            generalId: general.id,
            factorId,
            color,
            level: gene.level ?? 1,
            trigger,
            displayName: gene.displayName ?? factorId,
        },
    };
}
