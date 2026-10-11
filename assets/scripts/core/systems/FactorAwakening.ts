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

// ── 覺醒事件擲骰（PROG-2-0044） ─────────────────────────────────────────────
//
// 規格（因子解鎖系統 §F）：
//   培育窺探 Per_Round_Peek_Chance = 0.08 × (1 + Mentor_Rank × 0.1)
//   戰場覺醒 Per_Battle_Awakening_Chance = 0.05；特定動作提升到 0.15
// 暫定（規格沒寫）：
//   - Mentor_Rank = 本場教官最高突破星等（0~5）；沒有教官 = 0
//   - 培育只在「訓練」回合擲骰（休息不擲）；教官站在所選訓練格時，綠 / 白也可由「教官觸發」覺醒
//   - 戰場：任何已結算的戰鬥可覺醒藍 / 粉；做出特定動作（BattleSpecialActions 偵測，PROG-2-0048）的武將
//     機率 0.15，綠 / 白 / 紫 / 紅也進候選（紫紅仍受 discoveryLevel 45 門檻限制）；
//     有給動作標籤時，優先從標籤相符的因子裡挑（騎兵衝鋒 → 騎兵因子），沒有相符才從全部候選挑
//   - PROG-2-0048 起不再以「戰勝」代替特定動作
//   - 每位武將每回合 / 每場最多覺醒 1 個因子；沒有可覺醒的因子時不消耗亂數

export const NURTURE_PEEK_BASE_CHANCE = 0.08;
export const NURTURE_PEEK_RANK_STEP = 0.1;
export const BATTLE_AWAKENING_CHANCE = 0.05;
export const BATTLE_AWAKENING_SPECIAL_CHANCE = 0.15;

/** 戰場候選：一般實戰只開藍粉；滿足特定動作 / 特殊條件才開綠白紫紅 */
const BATTLE_BASIC_COLORS: readonly FactorColor[] = ['blue', 'pink'];

export interface AwakeningCandidate {
    factorId: string;
    trigger: AwakeningTrigger;
}

/** 列出在指定觸發方式下、目前等級可以覺醒的鎖定因子（依 genes 原順序） */
export function listAwakeningCandidates(
    general: GeneralConfig | undefined,
    triggers: readonly AwakeningTrigger[],
    discoveryLevel: number,
    colorFilter?: (color: FactorColor | null, trigger: AwakeningTrigger) => boolean,
): AwakeningCandidate[] {
    const out: AwakeningCandidate[] = [];
    for (const gene of general?.genes ?? []) {
        if (typeof gene.id !== 'string') continue;
        const color = normalizeFactorColor(gene.type);
        const trigger = triggers.find((t) => (!colorFilter || colorFilter(color, t)) && awakenFactor(general, gene.id as string, t, discoveryLevel).ok);
        if (trigger) out.push({ factorId: gene.id, trigger });
    }
    return out;
}

/** 有候選才擲骰：先判定是否觸發，再均勻挑一個候選；沒觸發回傳 null */
export function rollAwakening(
    general: GeneralConfig | undefined,
    candidates: readonly AwakeningCandidate[],
    chance: number,
    discoveryLevel: number,
    random: () => number,
): AwakeningResult | null {
    if (!general || candidates.length === 0) return null;
    if (!(random() < chance)) return null;
    const pick = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
    return awakenFactor(general, pick.factorId, pick.trigger, discoveryLevel);
}

export function nurturePeekChance(mentorRank: number): number {
    const rank = Math.max(0, Math.min(5, Math.floor(Number.isFinite(mentorRank) ? mentorRank : 0)));
    return NURTURE_PEEK_BASE_CHANCE * (1 + rank * NURTURE_PEEK_RANK_STEP);
}

/** 培育回合覺醒：藍粉 = 培育窺探；綠白 = 教官觸發（需有教官站在所選訓練格） */
export function rollNurtureAwakening(
    general: GeneralConfig | undefined,
    input: { discoveryLevel: number; mentorRank: number; mentorOnSlot: boolean; random: () => number },
): AwakeningResult | null {
    const triggers: AwakeningTrigger[] = input.mentorOnSlot ? ['nurture-peek', 'mentor'] : ['nurture-peek'];
    const candidates = listAwakeningCandidates(general, triggers, input.discoveryLevel);
    return rollAwakening(general, candidates, nurturePeekChance(input.mentorRank), input.discoveryLevel, input.random);
}

/** 因子 id → 因子標籤（正式環境取 gene-dictionary.json 的 defaultTags） */
export type FactorTagLookup = (factorId: string) => readonly string[] | undefined;

export interface BattleAwakeningInput {
    discoveryLevel: number;
    /** 本場做出特定動作（機率 0.15，並開放綠白紫紅候選） */
    specialAction?: boolean;
    /** 特定動作對應的因子標籤；有相符的候選時只從相符的裡面挑 */
    actionTags?: readonly string[];
    factorTags?: FactorTagLookup;
    random: () => number;
}

/** 戰後覺醒：一般實戰只開藍粉、機率 0.05；做出特定動作開綠白紫紅、機率 0.15 */
export function rollBattleAwakening(
    general: GeneralConfig | undefined,
    input: BattleAwakeningInput,
): AwakeningResult | null {
    const special = input.specialAction === true;
    let candidates = listAwakeningCandidates(
        general,
        ['battle'],
        input.discoveryLevel,
        (color) => special || (color !== null && BATTLE_BASIC_COLORS.includes(color)),
    );
    if (special && input.actionTags?.length && input.factorTags) {
        const wanted = new Set(input.actionTags);
        const matched = candidates.filter((c) => (input.factorTags!(c.factorId) ?? []).some((tag) => wanted.has(tag)));
        if (matched.length > 0) candidates = matched;
    }
    const chance = special ? BATTLE_AWAKENING_SPECIAL_CHANCE : BATTLE_AWAKENING_CHANCE;
    return rollAwakening(general, candidates, chance, input.discoveryLevel, input.random);
}
