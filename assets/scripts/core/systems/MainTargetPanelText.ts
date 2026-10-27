// @spec-source → 血統樹14人UI規格書 §2.3 底部主角與詳細屬性區（SkillDetails 詞條列）（PROG-2-1301，BUI-05 cc 綁定）
/**
 * MainTargetPanelText — 主角區詞條列的文字格式（純邏輯，不依賴 cc）
 *
 * 把 MainTargetPanelView 的覺醒／未解鎖標籤合成一行顯示文字；沒有詞條時回傳佔位字。
 *
 * Unity 對照：像 TextMeshPro 前面先過一層字串格式化，Prefab 只接收組好的字串。
 */

export const TRAIT_SEPARATOR = '、';
export const TRAIT_EMPTY_TEXT = '—';

/** 詞條列合成一行；空陣列回傳佔位字；略過空字串與只有空白的項目。 */
export function formatTraitList(
    traits: readonly string[],
    separator: string = TRAIT_SEPARATOR,
    emptyText: string = TRAIT_EMPTY_TEXT,
): string {
    const visible = traits.filter((trait) => trait.trim().length > 0);
    return visible.length > 0 ? visible.join(separator) : emptyText;
}
