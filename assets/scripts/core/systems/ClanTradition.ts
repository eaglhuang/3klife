// @spec-source → 血統傳承G4百年門閥_開宗立派與天下郡望規格書.md §F-1 Tier 2 郡望家風；PROG-2-1800
/**
 * ClanTradition — 郡望家風：族人持有最多的 3★ 以上藍因子，對應維度修業效率 +10%（純邏輯，不依賴 cc）
 *
 * 暫定（可逆）：
 * - 藍因子怎麼對應五維，規格沒寫；先照字典分類與舊資料中文 type 對照，對不上就沒有家風。
 * - 只定一次，之後不換，升格時持有最多的那項就是家風。
 * - 同票取 id 排序最前面的，結果才穩定。
 *
 * Unity 對照：一筆寫進存檔的家族資料，培育公式讀它決定要不要加乘。
 */
import type { GeneralConfig, GeneralGeneConfig } from '../models/GeneralUnit';
import { clanMemberOfGeneral } from './ClanTier';
import type { FactorDictionary } from './FactorInheritance';
import type { TrainingKind } from './NurtureSystem';

export const CLAN_LINEAGE_RULES_JSON = 'data/clan-lineage-rules';
export const CLAN_TRADITION_MIN_TIER = 2;
export const CLAN_TRADITION_TRAINING_BONUS = 0.1;

export interface ClanLineageRulesConfig {
    tradition: {
        minTier: number;
        trainingBonus: number;
        seedStarLevel: number;
        maxChildFactors: number;
    };
    highClanProposal: {
        minTier: number;
        minEp: number;
        minFactorStars: number;
        synergyBonus: number;
        maxSynergy: number;
        giftMultiplier: number;
    };
}

export const DEFAULT_CLAN_LINEAGE_RULES: Readonly<ClanLineageRulesConfig> = {
    tradition: {
        minTier: 2,
        trainingBonus: 0.1,
        seedStarLevel: 1,
        maxChildFactors: 5,
    },
    highClanProposal: {
        minTier: 3,
        minEp: 70,
        minFactorStars: 2,
        synergyBonus: 2,
        maxSynergy: 15,
        giftMultiplier: 1.3,
    },
};

let _rules: ClanLineageRulesConfig = DEFAULT_CLAN_LINEAGE_RULES;

export function getClanLineageRules(): ClanLineageRulesConfig {
    return _rules;
}

export function configureClanLineageRules(raw: Partial<ClanLineageRulesConfig> | null | undefined): void {
    if (!raw) return;
    _rules = {
        tradition: { ...DEFAULT_CLAN_LINEAGE_RULES.tradition, ...(raw.tradition ?? {}) },
        highClanProposal: { ...DEFAULT_CLAN_LINEAGE_RULES.highClanProposal, ...(raw.highClanProposal ?? {}) },
    };
}

export function resetClanLineageRules(): void {
    _rules = DEFAULT_CLAN_LINEAGE_RULES;
}

const CATEGORY_KIND: Readonly<Record<string, TrainingKind>> = {
    'weapon-proficiency': 'str',
    leadership: 'lea',
    governance: 'pol',
};
const LEGACY_TYPE_KIND: Readonly<Record<string, TrainingKind>> = {
    戰鬥: 'str',
    武裝: 'str',
    統率: 'lea',
    謀略: 'int',
    內政: 'pol',
    魅力: 'cha',
};
const KIND_LABEL: Readonly<Record<TrainingKind, string>> = { str: '武力', int: '智力', lea: '統率', pol: '政治', cha: '魅力' };

export interface ClanTradition {
    factorId: string;
    displayName: string;
    kind: TrainingKind;
}

const STAT_TOKEN_PATTERNS: ReadonlyArray<{ kind: TrainingKind; tokens: readonly string[] }> = [
    { kind: 'int', tokens: ['gene_int', '_int', 'strategy', 'wisdom', '謀略', '智謀', '才思'] },
    { kind: 'cha', tokens: ['gene_cha', '_cha', 'charm', '魅力', '威儀'] },
    { kind: 'pol', tokens: ['gene_pol', '_pol', 'politics', 'governance', '內政', '治世'] },
    { kind: 'lea', tokens: ['gene_lea', '_lea', 'leadership', 'command', '統率', '統御'] },
    { kind: 'str', tokens: ['gene_str', '_str', 'might', 'weapon', '武力', '剛勇'] },
];

export function kindOfFactor(factorId: string, dictionary: FactorDictionary | undefined, gene: GeneralGeneConfig | undefined): TrainingKind | null {
    const entry = dictionary?.get(factorId);
    const haystack = [
        factorId,
        gene?.id ?? '',
        gene?.displayName ?? '',
        entry?.displayName ?? '',
        ...((entry as { defaultTags?: string[] } | undefined)?.defaultTags ?? []),
    ].join(' ').toLowerCase();
    for (const rule of STAT_TOKEN_PATTERNS) {
        if (rule.tokens.some((tk) => haystack.includes(tk.toLowerCase()))) {
            return rule.kind;
        }
    }
    const category = entry?.category;
    if (category && CATEGORY_KIND[category]) return CATEGORY_KIND[category];
    if (category === 'attribute') return 'str';
    return (gene?.type && LEGACY_TYPE_KIND[gene.type]) || null;
}

/**
 * Tier 2 宗脈常駐（Q1-A）：當家族已確立郡望家風，且新生兒因子數未達上限並未含家風因子時，
 * 保底附加 1 枚該家風對應的 1★ 藍因子種子（不修改輸入陣列）。
 */
export function applyClanTraditionSeed<T extends { id: string; level: number }>(
    factors: readonly T[],
    tradition: ClanTradition | null | undefined,
    buildSeed: (factorId: string, stars: number) => T,
    rules: ClanLineageRulesConfig = _rules,
): { factors: T[]; seeded: boolean } {
    const list = [...factors];
    if (!tradition) return { factors: list, seeded: false };
    if (list.length >= rules.tradition.maxChildFactors) return { factors: list, seeded: false };
    if (list.some((f) => f.id === tradition.factorId)) return { factors: list, seeded: false };
    list.push(buildSeed(tradition.factorId, rules.tradition.seedStarLevel));
    return { factors: list, seeded: true };
}

/** 從名冊選出家風；亡者歸檔沒有星級，只看名冊上的人（與 ClanTier 的同持藍因子一致） */
export function clanTraditionOf(roster: readonly GeneralConfig[], dictionary: FactorDictionary | undefined): ClanTradition | null {
    const holders = new Map<string, number>();
    const genes = new Map<string, GeneralGeneConfig>();
    for (const general of roster) {
        const owned = clanMemberOfGeneral(general, dictionary).blueStarFactors.filter((id, index, all) => all.indexOf(id) === index);
        for (const id of owned) {
            holders.set(id, (holders.get(id) ?? 0) + 1);
            const gene = (general.genes ?? []).find((candidate) => candidate.id === id);
            if (gene && !genes.has(id)) genes.set(id, gene);
        }
    }
    const ranked = Array.from(holders.entries())
        .filter(([id]) => kindOfFactor(id, dictionary, genes.get(id)) !== null)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (ranked.length === 0) return null;
    const factorId = ranked[0][0];
    const gene = genes.get(factorId);
    return {
        factorId,
        displayName: dictionary?.get(factorId)?.displayName ?? gene?.displayName ?? factorId,
        kind: kindOfFactor(factorId, dictionary, gene) as TrainingKind,
    };
}

/** 舊存檔或壞資料回傳 null */
export function normalizeClanTradition(raw: unknown): ClanTradition | null {
    const value = raw as ClanTradition | null | undefined;
    if (!value || typeof value.factorId !== 'string' || !(value.kind in KIND_LABEL)) return null;
    return { factorId: value.factorId, displayName: value.displayName ?? value.factorId, kind: value.kind };
}

export function clanTraditionEffectText(kind: TrainingKind): string {
    return `${KIND_LABEL[kind]}修業 +${Math.round(CLAN_TRADITION_TRAINING_BONUS * 100)}%`;
}

export function clanTraditionLine(tradition: ClanTradition): string {
    return `郡望家風確立：【${tradition.displayName}】，族人${clanTraditionEffectText(tradition.kind)}！`;
}

/** 血統樹標題用：門第名，有堂號、家風再加上去 */
export function clanTitleText(tierName: string, tradition: ClanTradition | null, hall: string | null = null, showEffect = false): string {
    const title = hall ? `${tierName}・${hall}` : tierName;
    if (!tradition) return title;
    const effect = showEffect ? `（${clanTraditionEffectText(tradition.kind)}）` : '';
    return `${title}｜家風：${tradition.displayName}${effect}`;
}
