// @spec-source → 血統傳承G4百年門閥_開宗立派與天下郡望規格書.md §F-1 Tier 2 郡望堂號、§G {ClanTitle}；PROG-2-1804
/**
 * ClanHall — 郡望堂號：由開基祖的籍貫與姓氏定出堂號，例如「沛郡曹氏」（純邏輯，不依賴 cc）
 *
 * 暫定（可逆）：
 * - 開基祖是名冊裡往下傳最多代的人；同代數比 EP，再比 id，結果才穩定。
 * - 籍貫優先用 originRegion（只有少數武將有），沒有就用 resolveBirthProvince 判斷的州名。
 * - 只定一次，之後不換；玩家自創堂號還沒做。
 *
 * Unity 對照：一筆寫進存檔的家族字串，畫面與提示句都讀它。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import type { BreedingGeneral } from './BreedingSystem';
import { resolveBirthProvince, surnameOf } from './VirtualAncestorGenerator';

/** 往下傳了幾代（沒有子女為 0）；visiting 防止壞資料形成環 */
function descendantDepth(id: string, childrenOf: Map<string, string[]>, memo: Map<string, number>, visiting: string[]): number {
    const known = memo.get(id);
    if (known !== undefined) return known;
    if (visiting.indexOf(id) >= 0) return 0;
    visiting.push(id);
    const depth = (childrenOf.get(id) ?? []).reduce((max, child) => Math.max(max, 1 + descendantDepth(child, childrenOf, memo, visiting)), 0);
    visiting.pop();
    memo.set(id, depth);
    return depth;
}

export function clanFounderOf(roster: readonly GeneralConfig[]): GeneralConfig | null {
    const childrenOf = new Map<string, string[]>();
    for (const general of roster as readonly BreedingGeneral[]) {
        for (const parent of [general.fatherId, general.motherId]) {
            if (parent) childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), general.id]);
        }
    }
    const memo = new Map<string, number>();
    const ranked = roster
        .map((general) => ({ general, depth: descendantDepth(general.id, childrenOf, memo, []) }))
        .sort((a, b) => b.depth - a.depth || (b.general.ep ?? 0) - (a.general.ep ?? 0) || (a.general.id < b.general.id ? -1 : 1));
    return ranked[0]?.general ?? null;
}

export function clanHallNameOf(roster: readonly GeneralConfig[]): string | null {
    const founder = clanFounderOf(roster);
    if (!founder) return null;
    return `${founder.originRegion || resolveBirthProvince(founder)}${surnameOf(founder.name)}氏`;
}

/** 舊存檔或壞資料回傳 null */
export function normalizeClanHall(raw: unknown): string | null {
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

export function clanHallLine(hall: string): string {
    return `天下士林為我族正名，郡望堂號確立：【${hall}】！`;
}
