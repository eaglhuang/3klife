// @spec-source → 奧義系統.md (doc_spec_0030)「傳承系特殊奧義：英靈附體」（PROG-2-1587，數值暫定）
import { Faction } from '../../core/config/Constants';

/** 兵力劣勢：我方存活部隊數少於敵方此比例 */
export const ANCESTRAL_SPIRIT_OUTNUMBERED_RATIO = 0.7;
/** 祖先虛影同步施放的威力比例 */
export const ANCESTRAL_SPIRIT_POWER = 0.5;
export const ANCESTRAL_SPIRIT_LOG = '英靈附體：祖先虛影同步施放奧義（威力 50%）';

interface CountableUnit {
  faction: Faction;
  isDead?(): boolean;
}

/** 兵力劣勢判定：敵方有部隊且我方存活數 < 敵方 × 比例 */
export function isOutnumbered(units: Iterable<CountableUnit>, faction: Faction): boolean {
  let own = 0;
  let foe = 0;
  for (const unit of units) {
    if (unit.isDead?.()) continue;
    if (unit.faction === faction) own += 1;
    else foe += 1;
  }
  return foe > 0 && own < foe * ANCESTRAL_SPIRIT_OUTNUMBERED_RATIO;
}

/** 虛影的奧義攻擊基準；本體沒有奧義攻擊基準時不觸發（回 null） */
export function ancestralSpiritAttackOf(ultimateAttack: number | null | undefined): number | null {
  if (ultimateAttack === null || ultimateAttack === undefined) return null;
  return Math.max(1, Math.floor(ultimateAttack * ANCESTRAL_SPIRIT_POWER));
}

interface SignatureUltimateDef {
  templateId?: string;
  slot?: number;
  exclusive?: boolean;
  battleSkillId?: string | null;
}

/** 祖先的成名奧義戰法（PROG-2-1603）：取祖先模板的專屬奧義、槽位最小者；查不到回 null，沿用本體奧義 */
export function ancestorSignatureSkillOf(ancestorTemplateId: string | null | undefined, defs: Iterable<SignatureUltimateDef>): string | null {
  if (!ancestorTemplateId) return null;
  let best: SignatureUltimateDef | null = null;
  for (const def of defs) {
    if (def.templateId !== ancestorTemplateId || def.exclusive !== true || !def.battleSkillId) continue;
    if (!best || (def.slot ?? 99) < (best.slot ?? 99)) best = def;
  }
  return best?.battleSkillId ?? null;
}
