// @spec-source → 血統傳承G3三代深淵_外戚純化與世交合譜規格書.md §E #1、§H UI_G3_SAME_SURNAME_BLOCK；PROG-2-1823
/**
 * ClanMarriageRule — 同姓不婚（純邏輯，不依賴 cc）
 *
 * 同父系（父女、祖孫、兄妹、堂親）算同宗，一律擋下；不看名字，改姓或賜姓也擋得到。
 * 暫定：同母異父、母子等母系至親沿用近親封鎖；同姓但族譜查不到共祖的不擋；
 * 掃描到族譜有的 3 代（規格的 28 席是 4 代，族譜目前只存 14 席）。
 */
import type { Pedigree } from '../services/BloodlineGraph';

export type ClanMarriageBlock = 'same-clan' | 'inbreeding';

const PATRILINE_SLOTS = ['F', 'FF', 'FFF'] as const;

type PedigreeLookup = { getPedigree(uid: string): Pedigree };

function patrilineOf(uid: string, pedigree: Pedigree): string[] {
    const line = [uid];
    for (const slot of PATRILINE_SLOTS) {
        const ancestor = pedigree[slot];
        if (ancestor) line.push(ancestor);
    }
    return line;
}

function hasAncestor(pedigree: Pedigree, uid: string): boolean {
    return Object.keys(pedigree).some((slot) => pedigree[slot as keyof Pedigree] === uid);
}

/** 不能結緣的原因；可以結緣時回傳 null */
export function clanMarriageBlock(fatherId: string, motherId: string, source: PedigreeLookup): ClanMarriageBlock | null {
    if (fatherId === motherId) return null;
    const his = source.getPedigree(fatherId);
    const hers = source.getPedigree(motherId);
    const hisLine = patrilineOf(fatherId, his);
    if (patrilineOf(motherId, hers).some((uid) => hisLine.includes(uid))) return 'same-clan';
    if (hasAncestor(his, motherId) || hasAncestor(hers, fatherId)) return 'inbreeding';
    if (his.M && his.M === hers.M) return 'inbreeding';
    return null;
}
