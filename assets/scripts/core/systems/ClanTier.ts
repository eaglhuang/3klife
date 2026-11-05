// @spec-source → 血統傳承G4百年門閥_開宗立派與天下郡望規格書.md §E #1、§F-1、§G、§H UI_G4_CLAN_TIER_UP；PROG-2-1795
/**
 * ClanTier — 門閥四階：由家族成員算出統計與門第階級（純邏輯，不依賴 cc）
 *
 * 家族 = 有父母紀錄的人，加上他們的父母。玩家目前只有一個家族，不分姓氏與支系歸屬。
 * 亡者歸檔只留因子 id、沒有星級，所以「同持 3★ 藍因子」只算名冊上的人。
 * 高門的「2 個郡望世家滿額相性」要世交系統，目前只看獨立分支。
 *
 * Unity 對照：像一個由存檔資料即時算出的成就判定表，階級本身由 Session 保存。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import type { SpiritCard } from '../models/SpiritCard';
import { resolveFactorColor, type FactorDictionary } from './FactorInheritance';

export type ClanTier = 0 | 1 | 2 | 3;

export const CLAN_TIER_NAMES: readonly string[] = Object.freeze(['布衣寒門', '地方豪族', '郡望世家', '天下高門']);
export const CLAN_ADULT_AGE = 18;
const BLUE_STAR_THRESHOLD = 3;

export interface ClanMember {
    id: string;
    parentIds: string[];
    ep: number;
    age: number;
    /** 持有的 3★ 以上藍因子 id；亡者歸檔沒有星級，留空 */
    blueStarFactors: string[];
}

export interface ClanStats {
    adultDescendants: number;
    generations: number;
    branches: number;
    ep60: number;
    ep75: number;
    ep90: number;
    /** 同持某項 3★ 以上藍因子的最多人數 */
    sharedBlueHolders: number;
}

type LineageGeneral = GeneralConfig & { fatherId?: string; motherId?: string };

export function clanMemberOfGeneral(general: GeneralConfig, dictionary?: FactorDictionary): ClanMember {
    const lineage = general as LineageGeneral;
    return {
        id: general.id,
        parentIds: [lineage.fatherId, lineage.motherId].filter((id): id is string => !!id),
        ep: general.ep ?? 0,
        age: general.age ?? 0,
        blueStarFactors: (general.genes ?? [])
            .filter((gene) => !!gene.id && (gene.level ?? 0) >= BLUE_STAR_THRESHOLD && resolveFactorColor(gene.id, dictionary, gene) === 'blue')
            .map((gene) => gene.id as string),
    };
}

export function clanMemberOfCard(card: SpiritCard): ClanMember {
    return {
        id: card.uid,
        parentIds: (card.parentUids ?? []).filter((id) => !!id),
        ep: card.ep_snapshot ?? 0,
        age: card.ageAtDeath ?? 0,
        blueStarFactors: [],
    };
}

/** 名冊優先；已歸檔又還在名冊的人只算一次 */
export function clanMembersOf(roster: readonly GeneralConfig[], cards: readonly SpiritCard[], dictionary?: FactorDictionary): ClanMember[] {
    const members = roster.map((general) => clanMemberOfGeneral(general, dictionary));
    const seen = new Set(members.map((member) => member.id));
    for (const card of cards) {
        if (!seen.has(card.uid)) {
            seen.add(card.uid);
            members.push(clanMemberOfCard(card));
        }
    }
    return members;
}

/** 開基祖算第 1 代；父母沒有紀錄時當作開基祖的子女 */
function generationOf(member: ClanMember, byId: ReadonlyMap<string, ClanMember>, memo: Map<string, number>, visiting: Set<string>): number {
    const known = memo.get(member.id);
    if (known !== undefined) return known;
    if (visiting.has(member.id)) return 1;
    visiting.add(member.id);
    let generation = 1;
    for (const parentId of member.parentIds) {
        const parent = byId.get(parentId);
        generation = Math.max(generation, 1 + (parent ? generationOf(parent, byId, memo, visiting) : 1));
    }
    visiting.delete(member.id);
    memo.set(member.id, generation);
    return generation;
}

export function clanStatsOf(members: readonly ClanMember[]): ClanStats {
    const byId = new Map<string, ClanMember>();
    for (const member of members) byId.set(member.id, member);
    const parentIdsInUse = new Set<string>();
    for (const member of members) for (const parentId of member.parentIds) parentIdsInUse.add(parentId);
    const clan = members.filter((member) => member.parentIds.length > 0 || parentIdsInUse.has(member.id));

    const memo = new Map<string, number>();
    const visiting = new Set<string>();
    let generations = 0;
    for (const member of clan) generations = Math.max(generations, generationOf(member, byId, memo, visiting));

    // 分支：同一位祖先有幾個子女又各自開枝散葉
    const fertileChildren = new Map<string, number>();
    for (const member of clan) {
        if (!parentIdsInUse.has(member.id)) continue;
        for (const parentId of member.parentIds) fertileChildren.set(parentId, (fertileChildren.get(parentId) ?? 0) + 1);
    }
    let branches = 0;
    fertileChildren.forEach((count) => { branches = Math.max(branches, count); });

    const holders = new Map<string, number>();
    for (const member of clan) {
        const owned = member.blueStarFactors.filter((id, index, all) => all.indexOf(id) === index);
        for (const factorId of owned) holders.set(factorId, (holders.get(factorId) ?? 0) + 1);
    }
    let sharedBlueHolders = 0;
    holders.forEach((count) => { sharedBlueHolders = Math.max(sharedBlueHolders, count); });

    const countEp = (floor: number) => clan.filter((member) => member.ep >= floor).length;
    return {
        adultDescendants: clan.filter((member) => member.parentIds.length > 0 && member.age >= CLAN_ADULT_AGE).length,
        generations,
        branches,
        ep60: countEp(60),
        ep75: countEp(75),
        ep90: countEp(90),
        sharedBlueHolders,
    };
}

/** 依序檢定：下一階的條件要建立在前一階已達成上 */
export function clanTierOf(stats: ClanStats): ClanTier {
    if (stats.adultDescendants < 3 || stats.ep60 < 1) return 0;
    if (stats.generations < 3 || stats.ep75 < 4 || stats.sharedBlueHolders < 3) return 1;
    if (stats.generations < 4 || stats.branches < 2 || stats.ep90 < 2) return 2;
    return 3;
}

export function normalizeClanTier(value: unknown): ClanTier {
    return value === 1 || value === 2 || value === 3 ? value : 0;
}

/** §H UI_G4_CLAN_TIER_UP；郡望家風另發一句（ClanTradition），高門求親效果還沒做，先不提 */
export function clanTierUpLine(oldTier: ClanTier, newTier: ClanTier): string {
    return `門閥升格！家族已由【${CLAN_TIER_NAMES[oldTier]}】晉升為【${CLAN_TIER_NAMES[newTier]}】！`;
}

/** §G 晉升天下高門；{ClanTitle} 堂號目前沒有資料，先省略 */
export const CLAN_HIGH_GATE_LINE = '自太祖創業以來，我族歷四世而不衰，文武名臣輩出。今天下士林共尊我族為【天下高門】，名垂竹帛！';
