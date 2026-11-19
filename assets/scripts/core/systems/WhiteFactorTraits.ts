// @spec-source → 因子爆發系統.md (doc_spec_0010)：白色因子「抗性、性格（冷靜/暴躁）」；血統理論系統.md (doc_spec_0011) 生平閱歷白因子折扣（PROG-2-1586、PROG-2-9162）
import type { GeneralStatsConfig } from '../models/GeneralUnit';
import type { FateHeldGene } from './FateBlessing';

/** 冷靜：每級減少 10% 恐懼與士氣下降效果 */
export const CALM_GENE_ID = 'gene_calm';
export const CALM_REDUCTION_PER_LEVEL = 0.1;
/** 暴躁：每級攻擊 +3%、防禦 −3% */
export const FURY_GENE_ID = 'gene_fury';
export const FURY_PER_LEVEL = 0.03;

function geneLevel(genes: readonly FateHeldGene[] | undefined, id: string): number {
  let best = 0;
  for (const gene of genes ?? []) {
    if (gene.isLocked || gene.id !== id) continue;
    best = Math.max(best, gene.level ?? 0);
  }
  return best;
}

/** 冷靜減免比例（0~1）：恐懼光環的攻擊懲罰與扣士氣量都乘上 (1 − 此值) */
export function calmReductionOf(genes: readonly FateHeldGene[] | undefined): number {
  return Math.min(1, geneLevel(genes, CALM_GENE_ID) * CALM_REDUCTION_PER_LEVEL);
}

/** 暴躁攻防乘數 */
export function furyModifiersOf(genes: readonly FateHeldGene[] | undefined): { attack: number; defense: number } {
  const level = geneLevel(genes, FURY_GENE_ID);
  return { attack: 1 + level * FURY_PER_LEVEL, defense: Math.max(0, 1 - level * FURY_PER_LEVEL) };
}

/** 套用冷靜後的恐懼攻擊乘數：懲罰部分 (1 − aura) 依減免比例縮小 */
export function calmAdjustedAura(aura: number, genes: readonly FateHeldGene[] | undefined): number {
  if (aura >= 1) return aura;
  return 1 - (1 - aura) * (1 - calmReductionOf(genes));
}

// ── 生平閱歷白因子凝練與技能點折扣（PROG-2-9162）──────────────────────────────

export interface WhiteAchievementCriteria {
  minBattles?: number;
  minWinRate?: number;
  minDuelsWon?: number;
  minGovernanceSeasons?: number;
  minDiplomacyCount?: number;
  minStr?: number;
  minLea?: number;
  minInt?: number;
  minPol?: number;
  minCha?: number;
}

export interface WhiteAchievementDefinition {
  geneId: string;
  name: string;
  category: 'battle' | 'strategy' | 'governance' | 'diplomacy';
  targetTags: readonly string[];
  criteria: WhiteAchievementCriteria;
  starThresholds: { '2': number; '3': number };
}

export interface WhiteFactorAchievementsConfig {
  starDiscounts: Record<string, number>;
  maxDiscountRate: number;
  minDiscountedCost: number;
  achievements: readonly WhiteAchievementDefinition[];
}

export const WHITE_FACTOR_ACHIEVEMENTS_JSON = 'data/white-factor-achievements';

const DEFAULT_WHITE_CONFIG: WhiteFactorAchievementsConfig = {
  starDiscounts: { '1': 0.15, '2': 0.2, '3': 0.25 },
  maxDiscountRate: 0.25,
  minDiscountedCost: 1,
  achievements: [
    {
      geneId: 'gene_white_baoma',
      name: '白馬從義',
      category: 'battle',
      targetTags: ['騎兵', '突擊', '先鋒'],
      criteria: { minBattles: 5, minWinRate: 0.6, minStr: 75 },
      starThresholds: { '2': 10, '3': 18 },
    },
    {
      geneId: 'gene_white_xiandeng',
      name: '百戰先登',
      category: 'battle',
      targetTags: ['破陣', '步兵', '攻城'],
      criteria: { minBattles: 6, minWinRate: 0.55, minStr: 70 },
      starThresholds: { '2': 12, '3': 20 },
    },
    {
      geneId: 'gene_white_shoucheng',
      name: '守城如鐵',
      category: 'battle',
      targetTags: ['盾兵', '防禦', '堅守'],
      criteria: { minBattles: 4, minWinRate: 0.5, minLea: 75 },
      starThresholds: { '2': 8, '3': 15 },
    },
    {
      geneId: 'gene_white_jiuzhu',
      name: '單騎救主',
      category: 'battle',
      targetTags: ['突圍', '護衛', '騎兵'],
      criteria: { minDuelsWon: 2, minStr: 80 },
      starThresholds: { '2': 4, '3': 7 },
    },
    {
      geneId: 'gene_white_weimo',
      name: '運籌帷幄',
      category: 'strategy',
      targetTags: ['謀略', '計策', '火攻'],
      criteria: { minBattles: 4, minInt: 80 },
      starThresholds: { '2': 8, '3': 14 },
    },
    {
      geneId: 'gene_white_tuntian',
      name: '安民屯田',
      category: 'governance',
      targetTags: ['內政', '糧草', '治安'],
      criteria: { minGovernanceSeasons: 6, minPol: 75 },
      starThresholds: { '2': 12, '3': 20 },
    },
    {
      geneId: 'gene_white_lianzong',
      name: '合縱連橫',
      category: 'diplomacy',
      targetTags: ['外交', '名望', '說服'],
      criteria: { minDiplomacyCount: 3, minCha: 78 },
      starThresholds: { '2': 6, '3': 10 },
    },
    {
      geneId: 'gene_white_zhishi',
      name: '治世能臣',
      category: 'governance',
      targetTags: ['內政', '人事', '政令'],
      criteria: { minGovernanceSeasons: 8, minPol: 82 },
      starThresholds: { '2': 14, '3': 24 },
    },
  ],
};

let _whiteConfig: WhiteFactorAchievementsConfig = DEFAULT_WHITE_CONFIG;

export function defaultWhiteFactorAchievements(): WhiteFactorAchievementsConfig {
  return DEFAULT_WHITE_CONFIG;
}

export function configureWhiteFactorAchievements(raw: Partial<WhiteFactorAchievementsConfig> | null | undefined): void {
  if (!raw) return;
  _whiteConfig = {
    starDiscounts: raw.starDiscounts ?? DEFAULT_WHITE_CONFIG.starDiscounts,
    maxDiscountRate: raw.maxDiscountRate ?? DEFAULT_WHITE_CONFIG.maxDiscountRate,
    minDiscountedCost: raw.minDiscountedCost ?? DEFAULT_WHITE_CONFIG.minDiscountedCost,
    achievements: raw.achievements ?? DEFAULT_WHITE_CONFIG.achievements,
  };
}

export function resetWhiteFactorAchievements(): void {
  _whiteConfig = DEFAULT_WHITE_CONFIG;
}

export interface GeneralCareerRecord {
  battles?: number;
  wins?: number;
  duelsWon?: number;
  governanceSeasons?: number;
  diplomacyCount?: number;
}

export interface CondensedWhiteFactor {
  id: string;
  name: string;
  level: 1 | 2 | 3;
  category: WhiteAchievementDefinition['category'];
  targetTags: readonly string[];
}

function meetsAchievement(
  def: WhiteAchievementDefinition,
  stats: GeneralStatsConfig | undefined,
  career: GeneralCareerRecord,
): { matched: boolean; progressMetric: number } {
  const c = def.criteria;
  const battles = career.battles ?? 0;
  const wins = career.wins ?? 0;
  const winRate = battles > 0 ? wins / battles : 0;
  const duelsWon = career.duelsWon ?? 0;
  const governanceSeasons = career.governanceSeasons ?? 0;
  const diplomacyCount = career.diplomacyCount ?? 0;

  if (c.minBattles !== undefined && battles < c.minBattles) return { matched: false, progressMetric: 0 };
  if (c.minWinRate !== undefined && winRate < c.minWinRate) return { matched: false, progressMetric: 0 };
  if (c.minDuelsWon !== undefined && duelsWon < c.minDuelsWon) return { matched: false, progressMetric: 0 };
  if (c.minGovernanceSeasons !== undefined && governanceSeasons < c.minGovernanceSeasons) return { matched: false, progressMetric: 0 };
  if (c.minDiplomacyCount !== undefined && diplomacyCount < c.minDiplomacyCount) return { matched: false, progressMetric: 0 };
  if (c.minStr !== undefined && (stats?.str ?? 0) < c.minStr) return { matched: false, progressMetric: 0 };
  if (c.minLea !== undefined && (stats?.lea ?? 0) < c.minLea) return { matched: false, progressMetric: 0 };
  if (c.minInt !== undefined && (stats?.int ?? 0) < c.minInt) return { matched: false, progressMetric: 0 };
  if (c.minPol !== undefined && (stats?.pol ?? 0) < c.minPol) return { matched: false, progressMetric: 0 };
  if (c.minCha !== undefined && (stats?.cha ?? 0) < c.minCha) return { matched: false, progressMetric: 0 };

  let metric = battles;
  if (c.minDuelsWon !== undefined) metric = duelsWon;
  else if (def.category === 'governance') metric = governanceSeasons;
  else if (def.category === 'diplomacy') metric = diplomacyCount;

  return { matched: true, progressMetric: metric };
}

/** 依武將生平功勳凝練可遺傳之生平閱歷白因子 */
export function condenseLifeWhiteFactors(
  stats: GeneralStatsConfig | undefined,
  career: GeneralCareerRecord,
): CondensedWhiteFactor[] {
  const out: CondensedWhiteFactor[] = [];
  for (const def of _whiteConfig.achievements) {
    const check = meetsAchievement(def, stats, career);
    if (!check.matched) continue;
    let level: 1 | 2 | 3 = 1;
    if (check.progressMetric >= def.starThresholds['3']) level = 3;
    else if (check.progressMetric >= def.starThresholds['2']) level = 2;
    out.push({
      id: def.geneId,
      name: def.name,
      level,
      category: def.category,
      targetTags: def.targetTags,
    });
  }
  return out;
}

/** 依白因子星等 S ∈ {1,2,3} 取得單項技能點折扣率（上限 25%） */
export function whiteFactorDiscountRate(starLevel: number): number {
  const clamped = Math.max(0, Math.min(3, Math.floor(starLevel)));
  if (clamped <= 0) return 0;
  const raw = _whiteConfig.starDiscounts[String(clamped)] ?? 0;
  return Math.min(_whiteConfig.maxDiscountRate, Math.max(0, raw));
}

export interface DiscountedTpResult {
  finalCost: number;
  discountRate: number;
  matchedGeneId: string | null;
  matchedLevel: number;
}

/**
 * 計算子嗣習得對應戰法／政令之折後技能點成本：
 * TP_cost = max(1, floor(TP_base * (1 - discount(S))))
 */
export function computeDiscountedTpCost(
  baseTpCost: number,
  genes: readonly FateHeldGene[] | undefined,
  targetTags: readonly string[],
): DiscountedTpResult {
  const safeBase = Math.max(0, Math.floor(baseTpCost));
  if (safeBase === 0) {
    return { finalCost: 0, discountRate: 0, matchedGeneId: null, matchedLevel: 0 };
  }

  let bestDiscount = 0;
  let bestGeneId: string | null = null;
  let bestLevel = 0;
  const tagSet = new Set(targetTags);

  for (const gene of genes ?? []) {
    if (gene.isLocked || !gene.id) continue;
    const def = _whiteConfig.achievements.find((a) => a.geneId === gene.id);
    if (!def) continue;
    const hasOverlap = def.targetTags.some((t) => tagSet.has(t));
    if (!hasOverlap) continue;
    const lvl = gene.level ?? 1;
    const rate = whiteFactorDiscountRate(lvl);
    if (rate > bestDiscount) {
      bestDiscount = rate;
      bestGeneId = gene.id;
      bestLevel = lvl;
    }
  }

  const discounted = Math.floor(safeBase * (1 - bestDiscount));
  const finalCost = Math.max(_whiteConfig.minDiscountedCost, discounted);
  return {
    finalCost,
    discountRate: bestDiscount,
    matchedGeneId: bestGeneId,
    matchedLevel: bestLevel,
  };
}

const TACTIC_TAG_MAP: Readonly<Record<string, readonly string[]>> = {
  'tiger-charge': ['騎兵', '突擊', '先鋒'],
  'shield-wall-slam': ['盾兵', '防禦', '堅守'],
  'fortress-line': ['盾兵', '防禦', '堅守'],
  'volley-barrage': ['破陣', '步兵', '攻城'],
  'fire-strategy': ['謀略', '計策', '火攻'],
};

/** 依戰法 id 推導可用於匹配生平閱歷白因子折扣的標籤 */
export function tacticTagsOf(tacticId: string): readonly string[] {
  const mapped = TACTIC_TAG_MAP[tacticId];
  if (mapped) return mapped;
  const lower = tacticId.toLowerCase();
  if (lower.includes('cavalry') || lower.includes('charge')) return ['騎兵', '突擊', '先鋒'];
  if (lower.includes('shield') || lower.includes('fort') || lower.includes('guard')) return ['盾兵', '防禦', '堅守'];
  if (lower.includes('fire') || lower.includes('scheme') || lower.includes('strategy')) return ['謀略', '計策', '火攻'];
  if (lower.includes('siege') || lower.includes('infantry') || lower.includes('break')) return ['破陣', '步兵', '攻城'];
  return [];
}
