// @spec-source → 武將戰績系統.md §里程碑（不敗神話、守護之壁、修羅 → 隱藏白／紅因子）；REC-06 / PROG-2-0712
/**
 * HiddenFactorText — 武將血脈頁「隱藏因子」一行的文案（純邏輯，不依賴 cc）
 *
 * 只列出已覺醒（基因裡有）的隱藏因子名稱；一個都沒有時顯示「尚未覺醒」。
 * 語系表沒有 key（回傳 key 本身）時退回 zh-TW 預設，避免畫面出現原始 key。
 *
 * Unity 對照：像 LocalizedString 加上預設值，同 BreedingTexts / FateScriptTexts 的模式。
 */

/** 隱藏因子 id → 名稱的語系 key（id 來自 MilestoneRewards 的獎勵表） */
export const HIDDEN_FACTOR_NAME_KEYS: Readonly<Record<string, string>> = {
    gene_hidden_undefeated: 'ui.general.bloodline.hidden_factor.undefeated',
    gene_hidden_iron_wall: 'ui.general.bloodline.hidden_factor.iron_wall',
    gene_hidden_killing_intent: 'ui.general.bloodline.hidden_factor.killing_intent',
};

/** zh-TW 預設；與 resources/i18n/zh-TW.json 的 ui.general.bloodline.hidden_factor* 同步（測試會比對） */
export const HIDDEN_FACTOR_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.general.bloodline.hidden_factor': '隱藏因子：',
    'ui.general.bloodline.hidden_factor_none': '尚未覺醒',
    'ui.general.bloodline.hidden_factor.undefeated': '不敗',
    'ui.general.bloodline.hidden_factor.iron_wall': '鐵壁',
    'ui.general.bloodline.hidden_factor.killing_intent': '殺意',
};

export type HiddenFactorTextLookup = (key: string) => string;

function textOf(lookup: HiddenFactorTextLookup, key: string): string {
    const localized = lookup(key);
    return localized === key ? (HIDDEN_FACTOR_FALLBACK_ZH_TW[key] ?? key) : localized;
}

/** 血脈頁的隱藏因子一行：「隱藏因子：不敗、鐵壁」或「隱藏因子：尚未覺醒」 */
export function hiddenFactorLine(genes: readonly { id?: string }[] | undefined, lookup: HiddenFactorTextLookup): string {
    const names: string[] = [];
    for (const gene of genes ?? []) {
        const key = gene.id === undefined ? undefined : HIDDEN_FACTOR_NAME_KEYS[gene.id];
        if (key === undefined) continue;
        const name = textOf(lookup, key);
        if (!names.includes(name)) names.push(name);
    }
    const body = names.length > 0 ? names.join('、') : textOf(lookup, 'ui.general.bloodline.hidden_factor_none');
    return `${textOf(lookup, 'ui.general.bloodline.hidden_factor')}${body}`;
}
