// @spec-source → 奧義系統.md (doc_spec_0030) E-10 組合奧義（P2）：特定武將搭配施放聯合奧義（如周瑜+諸葛亮=赤壁大火）（PROG-2-1588，暫定）

export interface ComboUltimatePair {
  readonly name: string;
  readonly generals: readonly [string, string];
}

/** 組合奧義表：目前只收規格舉例的「赤壁大火」，其他組合待組合奧義子系統母規格 */
export const COMBO_ULTIMATE_PAIRS: readonly ComboUltimatePair[] = [
  { name: '赤壁大火', generals: ['zhou-yu', 'zhuge-liang'] },
];
/** 組合奧義的奧義攻擊倍率 */
export const COMBO_ULTIMATE_MULTIPLIER = 1.5;

/** 主將施放奧義時，己方場上部隊的來源武將有組合搭檔 → 回傳組合；否則 null */
export function findComboUltimate(casterGeneralId: string, allySourceGeneralIds: Iterable<string | null>): ComboUltimatePair | null {
  const allies = new Set<string>();
  for (const id of allySourceGeneralIds) if (id) allies.add(id);
  for (const pair of COMBO_ULTIMATE_PAIRS) {
    const [a, b] = pair.generals;
    if ((casterGeneralId === a && allies.has(b)) || (casterGeneralId === b && allies.has(a))) return pair;
  }
  return null;
}
