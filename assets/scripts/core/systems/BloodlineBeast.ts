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
