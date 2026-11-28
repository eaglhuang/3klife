// @spec-source → 家族子嗣與血統總規格書 shard-d「義叔／義母贈禮」（PROG-2-10223）
/**
 * BloodlineOathGift — 子嗣誕生／抓周時，雙親的結義兄弟姊妹贈禮（純邏輯，不依賴 cc）。
 * 數值在 data/master/bloodline-oath-gift-config.json；結義關係讀 SwornPact。
 */
import giftJson from '../../../resources/data/master/bloodline-oath-gift-config.json';
import { swornBrothersOf, type SwornState } from './SwornPact';
import { genderKeyOf, namedText, type TextLookup } from './NamedParams';

export type GiftStage = 'birth' | 'zhouzhua';
export type GiftStatKey = 'str' | 'int' | 'lea' | 'pol' | 'cha' | 'luk';
export const GIFT_STAT_KEYS: readonly GiftStatKey[] = ['str', 'int', 'lea', 'pol', 'cha', 'luk'];

export interface OathGiftConfig {
    giftTriggerChance: number;
    statBonus: number;
    statVsTagWeight: number;
    triggerStages: string[];
    maxGiftsPerChild: number;
}

function num(v: unknown, d: number): number {
    return typeof v === 'number' && Number.isFinite(v) ? v : d;
}

export function normalizeOathGiftConfig(raw: unknown): OathGiftConfig {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
        giftTriggerChance: Math.min(1, Math.max(0, num(r.giftTriggerChance, 0.65))),
        statBonus: num(r.statBonus, 1),
        statVsTagWeight: Math.min(1, Math.max(0, num(r.statVsTagWeight, 0.5))),
        triggerStages: Array.isArray(r.triggerStages) ? r.triggerStages.filter((s): s is string => typeof s === 'string') : ['birth', 'zhouzhua'],
        maxGiftsPerChild: Math.max(0, Math.floor(num(r.maxGiftsPerChild, 1))),
    };
}

export const OATH_GIFT_CONFIG: OathGiftConfig = normalizeOathGiftConfig(giftJson);

export interface OathGift {
    kind: 'stat' | 'tag';
    giverId: string;
    stage: GiftStage;
    stat?: GiftStatKey;
    bonus?: number;
}

/** 雙親的結義兄弟姊妹（去重、不含雙親本人）。 */
export function oathKinOfParents(state: SwornState, fatherId: string | null, motherId: string | null): string[] {
    const out = new Set<string>();
    for (const pid of [fatherId, motherId]) {
        if (!pid) continue;
        for (const id of swornBrothersOf(state, pid)) out.add(id);
    }
    if (fatherId) out.delete(fatherId);
    if (motherId) out.delete(motherId);
    return Array.from(out);
}

/**
 * 擲贈禮：階段不符／已達上限／無結義親屬／機率沒中 → null。
 * 亂數順序固定：觸發機率、擇一結義親屬、屬性或小名、（屬性時）抽屬性。
 */
export function rollOathGift(input: { stage: GiftStage; oathKinIds: readonly string[]; giftsGiven: number; random: () => number }, cfg: OathGiftConfig = OATH_GIFT_CONFIG): OathGift | null {
    if (!cfg.triggerStages.includes(input.stage)) return null;
    if (input.giftsGiven >= cfg.maxGiftsPerChild) return null;
    if (input.oathKinIds.length === 0) return null;
    if (input.random() >= cfg.giftTriggerChance) return null;
    const giverId = input.oathKinIds[Math.min(input.oathKinIds.length - 1, Math.floor(input.random() * input.oathKinIds.length))];
    if (input.random() < cfg.statVsTagWeight) {
        const stat = GIFT_STAT_KEYS[Math.min(GIFT_STAT_KEYS.length - 1, Math.floor(input.random() * GIFT_STAT_KEYS.length))];
        return { kind: 'stat', giverId, stage: input.stage, stat, bonus: cfg.statBonus };
    }
    return { kind: 'tag', giverId, stage: input.stage };
}

/** 贈禮祝詞：稱謂（義叔／義母）與自稱依贈禮者性別。 */
export function oathGiftLine(lookup: TextLookup | undefined, gift: OathGift, giverGender: string | undefined, childName: string): string {
    const g = genderKeyOf(giverGender);
    return namedText(lookup, `ui.bloodline.oath_gift.${gift.kind}`, {
        oathTitle: namedText(lookup, `ui.bloodline.oath_gift.title.${g}`, {}),
        selfPronoun: namedText(lookup, `ui.bloodline.oath_gift.pronoun.${g}`, {}),
        childName,
        statLabel: gift.stat ? gift.stat.toUpperCase() : '',
        bonus: gift.bonus ?? 0,
    });
}
