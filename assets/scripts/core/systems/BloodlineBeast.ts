// @spec-source → 武將人物介面規格書.md §6.5（命紋靈獸與血脈奧義）；名詞定義文件.md 命紋靈獸 / 靈獸原型 / 覺醒傾向 / 血脈性格註記；GDUI-09（PROG-2-0716）
/**
 * BloodlineBeast — 命紋靈獸的資料結構與覺醒傾向判定（純邏輯，不依賴 cc）
 *
 * 規格：每個靈獸綁定 名稱、原型、2~3 個人格標籤、覺醒傾向（容易推進覺醒的事蹟類型）。
 * 靈獸原型只有六種：龍 / 虎 / 鶴 / 玄龜 / 狼 / 麒麟。
 *
 * 暫定（可逆）：
 *   - 這版只提供資料結構、驗證與傾向比對；具體靈獸清單（名稱、標籤、傾向）屬企劃內容，未寫入。
 *   - 符合傾向的事蹟只回報 true/false，額外進度的數值規格未給，留待 GDUI-07 之後再接。
 *
 * Unity 對照：像一張 ScriptableObject 的靈獸表與驗證器，Validator 檢查欄位，Matcher 回答「這件事蹟會不會推進它」。
 */

export const BEAST_ARCHETYPES = ['DRAGON', 'TIGER', 'CRANE', 'TORTOISE', 'WOLF', 'QILIN'] as const;
export type BeastArchetype = typeof BEAST_ARCHETYPES[number];

/** 規格原型名稱對照（UI 字串用） */
export const BEAST_ARCHETYPE_LABELS: Readonly<Record<BeastArchetype, string>> = {
    DRAGON: '龍',
    TIGER: '虎',
    CRANE: '鶴',
    TORTOISE: '玄龜',
    WOLF: '狼',
    QILIN: '麒麟',
};

export const BEAST_PERSONA_TAG_MIN = 2;
export const BEAST_PERSONA_TAG_MAX = 3;

export interface BloodlineBeastDefinition {
    id: string;
    name: string;
    archetype: BeastArchetype;
    /** 2~3 個人格標籤 */
    personaTags: string[];
    /** 容易推進覺醒的事蹟類型 id 清單 */
    awakeningTendency: string[];
}

/** 驗證靈獸定義；回傳錯誤訊息，空陣列代表通過。 */
export function validateBloodlineBeast(def: BloodlineBeastDefinition): string[] {
    const errors: string[] = [];
    const tag = def.id || '(無 id)';
    if (!def.id) errors.push(`${tag}: 缺少 id`);
    if (!def.name) errors.push(`${tag}: 缺少 name`);
    if (!(BEAST_ARCHETYPES as readonly string[]).includes(def.archetype)) {
        errors.push(`${tag}: archetype 不是六種原型之一`);
    }
    const tagCount = def.personaTags.length;
    if (tagCount < BEAST_PERSONA_TAG_MIN || tagCount > BEAST_PERSONA_TAG_MAX) {
        errors.push(`${tag}: personaTags 需為 ${BEAST_PERSONA_TAG_MIN}~${BEAST_PERSONA_TAG_MAX} 個`);
    }
    if (new Set(def.personaTags).size !== tagCount) errors.push(`${tag}: personaTags 有重複`);
    if (def.awakeningTendency.length === 0) errors.push(`${tag}: awakeningTendency 不可為空`);
    return errors;
}

/** 某個事蹟類型是否符合靈獸的覺醒傾向（符合才給額外進度，數值待規格）。 */
export function beastTendencyMatches(def: BloodlineBeastDefinition, incidentKind: string): boolean {
    return def.awakeningTendency.includes(incidentKind);
}

/**
 * 暫定靈獸清單：六種原型各一筆，名稱用原型名，人格標籤與覺醒傾向為暫定（PROVISIONAL，交企劃替換）。
 * 覺醒傾向的事蹟類型 id 也是暫定，待事蹟系統定案後改為正式 id。
 */
export const PROVISIONAL_BEAST_CATALOG: readonly BloodlineBeastDefinition[] = [
    { id: 'BEAST_DRAGON', name: '龍', archetype: 'DRAGON', personaTags: ['威儀', '霸氣'], awakeningTendency: ['battle-win'] },
    { id: 'BEAST_TIGER', name: '虎', archetype: 'TIGER', personaTags: ['勇猛', '剛烈'], awakeningTendency: ['duel-win'] },
    { id: 'BEAST_CRANE', name: '鶴', archetype: 'CRANE', personaTags: ['清逸', '超然'], awakeningTendency: ['event-clear'] },
    { id: 'BEAST_TORTOISE', name: '玄龜', archetype: 'TORTOISE', personaTags: ['沉穩', '守成'], awakeningTendency: ['defense-hold'] },
    { id: 'BEAST_WOLF', name: '狼', archetype: 'WOLF', personaTags: ['警覺', '野心'], awakeningTendency: ['fame-gain'] },
    { id: 'BEAST_QILIN', name: '麒麟', archetype: 'QILIN', personaTags: ['仁厚', '祥瑞'], awakeningTendency: ['event-clear', 'fame-gain'] },
];

/**
 * 暫定綁定：武將 id 雜湊後對清單取餘數，決定這位武將的命紋靈獸。
 * 正式的綁定規則（依血統、依原型）尚未定案，此函式為暫定，待 PM 裁定後替換。
 */
export function beastForGeneral(generalId: string): BloodlineBeastDefinition {
    let hash = 0;
    for (let i = 0; i < generalId.length; i++) {
        hash = (hash * 31 + generalId.charCodeAt(i)) >>> 0;
    }
    return PROVISIONAL_BEAST_CATALOG[hash % PROVISIONAL_BEAST_CATALOG.length];
}

/** 深層人格區的一行摘要：名稱、人格標籤、覺醒傾向。 */
export function formatBeastSummary(def: BloodlineBeastDefinition): string {
    return `命紋靈獸：${def.name}（${BEAST_ARCHETYPE_LABELS[def.archetype]}）\n人格：${def.personaTags.join('、')}\n覺醒傾向：${def.awakeningTendency.join('、')}`;
}
