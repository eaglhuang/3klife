/**
 * NamedParams — i18n 具名參數填入（純邏輯）。
 * 規格台詞使用 {childName}、{oathTitle} 這類具名參數；未提供的參數原樣保留，方便畫面上看出漏帶。
 */
export type NamedParams = Readonly<Record<string, string | number>>;

export type TextLookup = (key: string) => string | undefined;

export function fillNamed(template: string, params: NamedParams): string {
    return template.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** 取字串後填參數；查不到鍵時用鍵本身。 */
export function namedText(lookup: TextLookup | undefined, key: string, params: NamedParams): string {
    const raw = lookup?.(key);
    return fillNamed(raw ?? key, params);
}

export type GenderKey = 'male' | 'female';

export function genderKeyOf(gender: string | undefined): GenderKey {
    return gender === '女' || gender === 'female' ? 'female' : 'male';
}
