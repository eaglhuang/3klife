// @spec-source → 可結緣女性來源系統.md §E #7（送禮好感）、§G、§H；PROG-2-1789
/**
 * PrisonerGift — 對女俘虜送禮（純邏輯，不依賴 cc）
 *
 * 規格沒給禮物道具與價格；美酒以外也沒有禮物的道具定義，暫定用黃金買一份「珍寶」。
 *
 * Unity 對照：像一個靜態工具類，只算數字和組句，存檔與扣款由呼叫端負責。
 */
import { applyGiftAffection, conversionBonusOf, GIFT_AFFECTION_MAX } from './GiftAffection';

/** 暫定：一份禮物的黃金價格 */
export const PRISONER_GIFT_GOLD = 200;
/** 暫定：一份禮物加多少好感 */
export const PRISONER_GIFT_AFFECTION = 10;
/** 暫定：§G 句子的 {ItemName} */
export const PRISONER_GIFT_ITEM_NAME = '珍寶';

export type PrisonerGiftResult =
    | { ok: true; goldSpent: number; affectionGained: number; affection: number; persuadeRate: number }
    | { ok: false; reason: 'GOLD_SHORT' | 'AFFECTION_FULL' };

/** 好感從 before 變 after 時的勸降成功率（百分比，封頂 100） */
export function persuadeRateAfterGift(rate: number, before: number, after: number): number {
    const gained = (conversionBonusOf(after) - conversionBonusOf(before)) * 100;
    return Math.min(100, Math.round(rate + gained));
}

/** 只判斷金額與好感；俘虜是否可送由呼叫端先擋 */
export function resolvePrisonerGift(rate: number, affection: number, gold: number): PrisonerGiftResult {
    if (affection >= GIFT_AFFECTION_MAX) return { ok: false, reason: 'AFFECTION_FULL' };
    if (gold < PRISONER_GIFT_GOLD) return { ok: false, reason: 'GOLD_SHORT' };
    const next = applyGiftAffection(affection, PRISONER_GIFT_AFFECTION);
    return {
        ok: true,
        goldSpent: PRISONER_GIFT_GOLD,
        affectionGained: next - affection,
        affection: next,
        persuadeRate: persuadeRateAfterGift(rate, affection, next),
    };
}

/** §G 送禮好感＋§H UI_GIFT_SUCCESS */
export function prisonerGiftLine(name: string, gained: number): string {
    return `${name} 收下了你的${PRISONER_GIFT_ITEM_NAME}，態度似乎軟化了幾分。${name} 好感度 +${gained}`;
}

/** §H UI_GIFT_FAIL */
export function prisonerGiftFailLine(name: string): string {
    return `${name} 不為所動`;
}
