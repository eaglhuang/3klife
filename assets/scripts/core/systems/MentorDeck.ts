// @spec-source → 教官系統（支援卡）規格書.md §A、§L（自有 5 格，第 6 格好友借用另做）
/**
 * MentorDeck — 培育入場的教官編成：最多 5 格，每格放一張教官卡或留空。純 TS，不依賴 cc。
 *
 * 預設：從可用教官裡挑最強的 5 位（星等高、EP 高者優先）。
 * 輪換：點某一格就換成下一位「沒放在其他格」的教官，最後一位之後回到「空」。
 * 編成只記 uid；教官卡清單變動（被別場鎖定、卡片消失）時，失效的 uid 自動視為空格。
 *
 * Unity 對照：像賽馬娘的支援卡編成槽，資料是 string[]（卡片 id），顯示時再去卡片清單查。
 */
import type { MentorCard } from '../models/MentorCard';

export const MENTOR_DECK_SIZE = 5;

export type MentorDeck = ReadonlyArray<string | null>;

/** 排序用的強度：星等優先，其次 EP */
function mentorPower(card: MentorCard): number {
    return (card.stars ?? 0) * 1000 + (card.ep_snapshot ?? 0);
}

/** 空編成 */
export function emptyMentorDeck(): MentorDeck {
    return Array.from({ length: MENTOR_DECK_SIZE }, () => null);
}

/** 預設編成：最強的前 5 位，不足的格子留空 */
export function defaultMentorDeck(cards: readonly MentorCard[]): MentorDeck {
    const sorted = [...cards].sort((a, b) => mentorPower(b) - mentorPower(a));
    return Array.from({ length: MENTOR_DECK_SIZE }, (_, i) => sorted[i]?.uid ?? null);
}

/** 把編成裡已不在可用清單的 uid 換成空格（也去除重複） */
export function sanitizeMentorDeck(deck: MentorDeck, cards: readonly MentorCard[]): MentorDeck {
    const available = new Set(cards.map((card) => card.uid));
    const seen = new Set<string>();
    return Array.from({ length: MENTOR_DECK_SIZE }, (_, i) => {
        const uid = deck[i] ?? null;
        if (!uid || !available.has(uid) || seen.has(uid)) return null;
        seen.add(uid);
        return uid;
    });
}

/** 輪換第 slot 格：依清單順序換到下一位沒放在其他格的教官；最後一位之後回到空格 */
export function cycleMentorDeckSlot(deck: MentorDeck, cards: readonly MentorCard[], slot: number): MentorDeck {
    if (slot < 0 || slot >= MENTOR_DECK_SIZE) return deck;
    const clean = sanitizeMentorDeck(deck, cards);
    const usedElsewhere = new Set(clean.filter((uid, i) => i !== slot && uid) as string[]);
    const choices: Array<string | null> = [null, ...cards.map((card) => card.uid).filter((uid) => !usedElsewhere.has(uid))];
    const current = choices.indexOf(clean[slot]);
    const next = choices[(current + 1) % choices.length];
    return clean.map((uid, i) => (i === slot ? next : uid));
}

/** 依編成順序取出教官卡（略過空格） */
export function mentorDeckCards(deck: MentorDeck, cards: readonly MentorCard[]): MentorCard[] {
    const byUid = new Map(cards.map((card) => [card.uid, card]));
    return sanitizeMentorDeck(deck, cards)
        .map((uid) => (uid ? byUid.get(uid) : undefined))
        .filter((card): card is MentorCard => !!card);
}
