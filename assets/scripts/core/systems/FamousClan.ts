// @spec-source → 血統理論系統.md §E #7（史實名門加成）、§G 史實名門；PROG-2-1791
/**
 * FamousClan — 史實名門武將的初始 EP 加成與登場句（純邏輯，不依賴 cc）
 *
 * 規格只點名袁紹、曹操「等」，也沒給加成數值；名單與 +5 都是暫定。
 * 只在武將第一次入名冊時套用一次，不改 generals.json 的原始數值。
 *
 * Unity 對照：像一張 ScriptableObject 查表，入隊時把修正值寫進角色資料。
 */
import type { GeneralConfig } from '../models/GeneralUnit';

const EP_MAX = 100;

/** generals.json 的字母評級區間（由現有資料歸納；S 與 S- 的分界 85 暫定，資料裡沒有 81~86） */
const EP_GRADES: ReadonlyArray<readonly [number, string]> = Object.freeze([
    [90, 'S+'], [85, 'S'], [80, 'S-'], [75, 'A+'], [70, 'A'], [65, 'A-'], [60, 'B+'], [55, 'B'],
]);

/** 名將模板用的字母評級；子嗣的文字評級（epRatingLabel）是另一套，這裡不用 */
export function epGradeOf(ep: number): string {
    return EP_GRADES.find(([min]) => ep >= min)?.[1] ?? 'C';
}

export const FAMOUS_CLANS: ReadonlyArray<{ memberIds: readonly string[]; epBonus: number; line: string }> = Object.freeze([
    { memberIds: ['yuan-shao', 'yuan-shu'], epBonus: 5, line: '四世三公之後，天生帶有名門因子！' },
    { memberIds: ['cao-cao'], epBonus: 5, line: '譙沛曹氏之後，天生帶有名門因子！' },
]);

function clanOf(generalId: string) {
    return FAMOUS_CLANS.find((clan) => clan.memberIds.includes(generalId));
}

/** 名門武將回傳加過 EP 的複本；其他武將或沒有 EP 的資料原樣回傳 */
export function withFamousClanBonus(general: GeneralConfig): GeneralConfig {
    const clan = clanOf(general.id);
    if (!clan || typeof general.ep !== 'number') return general;
    const ep = Math.min(EP_MAX, general.ep + clan.epBonus);
    return { ...general, ep, epRating: epGradeOf(ep) };
}

/** 新入名冊的名門武將登場句；只算新入名冊的 */
export function famousClanLines(added: ReadonlyArray<{ id: string }>): string[] {
    return added.flatMap((general) => {
        const clan = clanOf(general.id);
        return clan ? [clan.line] : [];
    });
}
