// @spec-source → 教官支援卡被動技能與碎片合成規格書 (doc_spec_0318) §1~§3（GCH-11、GCH-02，PROG-2-1944）
/**
 * MentorShardVault — 教官支援卡槽位權重、五大被動驗證、重複分解與碎片庫合成（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 最多 3 張：主位 100%、兩個客座位各 50%；客座不觸發專屬戰法傳授。
 * - 五大被動與合法範圍：STAT_TRAIN_BONUS 3~25%、VITALITY_SAVE 5~30%、EVENT_TRIGGER_RATE 5~20%、
 *   TACTIC_HINT_RATE 10~40%、COMBO_CHAIN_EXTEND 5~15%；超出或類型不在清單即拒絕。
 * - 重複卡分解：N 1、R 5、SR 20、SSR 100 碎片。
 * - 定向合成：R 30（完成新手教學）、SR 100（通關一次學府培育）、SSR 500（家族名聲 ≥ 300），無次數上限。
 *
 * 既有 MentorSupportSchema 的 PassiveEffectKind 為舊三類，本檔新增規格五類的驗證，兩者並存待整併。
 * 暫定：Player_Save 掛載、抽卡結算接線與碎片庫 UI 另卡。
 * Unity 對照：像 ScriptableObject 驗證器 + 一個純函式的碎片錢包。
 */

export type MentorSlot = 'main' | 'sub1' | 'sub2';
export const MENTOR_SLOT_WEIGHT: Readonly<Record<MentorSlot, number>> = { main: 1, sub1: 0.5, sub2: 0.5 };
export const MENTOR_SLOT_CAP = 3;

export type MentorPassiveType =
    | 'STAT_TRAIN_BONUS' | 'VITALITY_SAVE' | 'EVENT_TRIGGER_RATE' | 'TACTIC_HINT_RATE' | 'COMBO_CHAIN_EXTEND';

/** 合法範圍（比例，含端點） */
export const MENTOR_PASSIVE_RANGES: Readonly<Record<MentorPassiveType, readonly [number, number]>> = {
    STAT_TRAIN_BONUS: [0.03, 0.25],
    VITALITY_SAVE: [0.05, 0.3],
    EVENT_TRIGGER_RATE: [0.05, 0.2],
    TACTIC_HINT_RATE: [0.1, 0.4],
    COMBO_CHAIN_EXTEND: [0.05, 0.15],
};

export interface MentorPassive {
    type: string;
    value: number;
}

export class MentorPassiveValidationError extends Error {}

/** 驗證被動清單；任何一項不合法即拋 MentorPassiveValidationError。 */
export function validateMentorPassives(passives: readonly MentorPassive[]): void {
    for (const p of passives) {
        const range = (MENTOR_PASSIVE_RANGES as Record<string, readonly [number, number] | undefined>)[p.type];
        if (!range) throw new MentorPassiveValidationError(`未知的被動類型：${p.type}`);
        if (!Number.isFinite(p.value) || p.value < range[0] - 1e-9 || p.value > range[1] + 1e-9) {
            throw new MentorPassiveValidationError(`${p.type} 數值 ${p.value} 超出 ${range[0]}~${range[1]}`);
        }
    }
}

/** 被動在該槽位的實際效果值；客座位減半。 */
export function slotPassiveValue(slot: MentorSlot, value: number): number {
    return Math.round(value * MENTOR_SLOT_WEIGHT[slot] * 1e6) / 1e6;
}

/** 只有主位觸發專屬戰法傳授。 */
export function slotTeachesExclusiveTactic(slot: MentorSlot): boolean {
    return slot === 'main';
}

export type MentorRarity = 'N' | 'R' | 'SR' | 'SSR';
export const MENTOR_DUPLICATE_SHARDS: Readonly<Record<MentorRarity, number>> = { N: 1, R: 5, SR: 20, SSR: 100 };
export const MENTOR_SYNTHESIS_COST: Readonly<Record<Exclude<MentorRarity, 'N'>, number>> = { R: 30, SR: 100, SSR: 500 };
export const SSR_SYNTHESIS_CLAN_FAME = 300;

export interface MentorShardBank {
    totalShards: number;
    lastSynthesisTimestamp: number;
}

/** 重複卡分解入庫。 */
export function dismantleDuplicate(bank: MentorShardBank, rarity: MentorRarity, count = 1): MentorShardBank {
    return { ...bank, totalShards: bank.totalShards + MENTOR_DUPLICATE_SHARDS[rarity] * Math.max(0, Math.floor(count)) };
}

export interface SynthesisUnlockState {
    tutorialDone: boolean;
    academyClearedOnce: boolean;
    clanFame: number;
}

export function isSynthesisUnlocked(rarity: Exclude<MentorRarity, 'N'>, s: SynthesisUnlockState): boolean {
    if (rarity === 'R') return s.tutorialDone;
    if (rarity === 'SR') return s.academyClearedOnce;
    return s.clanFame >= SSR_SYNTHESIS_CLAN_FAME;
}

export type SynthesisResult =
    | { ok: true; bank: MentorShardBank }
    | { ok: false; reason: 'locked' | 'insufficient' };

/** 定向合成 1 張指定稀有度支援卡。 */
export function synthesizeMentorCard(
    bank: MentorShardBank, rarity: Exclude<MentorRarity, 'N'>, unlock: SynthesisUnlockState, nowMs: number,
): SynthesisResult {
    if (!isSynthesisUnlocked(rarity, unlock)) return { ok: false, reason: 'locked' };
    const cost = MENTOR_SYNTHESIS_COST[rarity];
    if (bank.totalShards < cost) return { ok: false, reason: 'insufficient' };
    return { ok: true, bank: { totalShards: bank.totalShards - cost, lastSynthesisTimestamp: nowMs } };
}
