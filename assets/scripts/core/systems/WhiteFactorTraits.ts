// @spec-source → 因子爆發系統.md (doc_spec_0010)：白色因子「抗性、性格（冷靜/暴躁）」（PROG-2-1586，數值暫定）
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
