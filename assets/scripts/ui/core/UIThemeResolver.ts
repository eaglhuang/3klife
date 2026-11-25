// @spec-source → docs/ 「UI 共用框架：主題系統與語系」章節（見 docs/cross-reference-index.md）
/**
 * UIThemeResolver — UI 主題登錄表的純邏輯（不依賴 cc）：繼承合併、啟用主題解析、skin 樣式角色組裝。
 *
 * 資料來源：assets/resources/ui-spec/themes/theme-registry.json
 *   - default 主題提供全部語意 token；其餘主題（spring/summer/…/lunar-new-year）只寫差異。
 *   - 主題疊加順序：default → rules 解出的各層（season → festival → event，依 layerOrder）。
 *   - 缺 token 一律回退 default，不會出現空值。
 * Unity 對照：像 Theme Style Sheet 疊加多份 USS，後者覆寫前者，沒寫的屬性沿用基底。
 */
import type { SkinStyleTokens, SkinStyleRole } from './ThemeSkinRestyle';

export type ThemeTokenValue = string | number;

/** 素材層：spriteFrame／圖檔路徑，可指定資源包（bundle），未指定走 resources */
export interface ThemeAssetRef {
    path: string;
    bundle?: string;
}

export interface UITheme {
    /** 顯示名稱的 i18n key（四語系字典內） */
    nameKey?: string;
    /** 繼承來源；未填：default 以外的主題繼承 default */
    extends?: string;
    /** 語意層 token，key 如 panel.bg、text.title、button.primary.bg */
    tokens?: Record<string, ThemeTokenValue>;
    /** 素材層，key 為語意名（如 hall.festival.decor） */
    assets?: Record<string, ThemeAssetRef>;
}

export interface ThemeRuleWhen {
    /** GameClock 季節序號 1 春 2 夏 3 秋 4 冬；可給單值或陣列 */
    seasonIndex?: number | number[];
    /** 進行中的節慶 id（命中任一即可） */
    festivalIds?: string[];
    /** 活動旗標（命中任一即可） */
    flags?: string[];
    /** 日期區間 MM-DD，允許跨年（如 12-20 ~ 01-05）；含頭尾 */
    dateRange?: { from: string; to: string };
}

export interface ThemeRule {
    id: string;
    /** 所屬層；同層只會有一條規則生效（priority 大者勝） */
    layer: string;
    theme: string;
    priority?: number;
    when: ThemeRuleWhen;
}

export interface ThemeStyleBinding {
    /** 要套主題樣式的 skin id */
    appliesToSkins: string[];
    /** skin 填色 → 風格角色 */
    fillRoles: Record<string, string>;
    /** slot id 後綴 → 風格角色（分節標題、分節金線、卡片底） */
    slotRoles?: Record<string, string>;
    /** 不套主題的 slot（結尾 * 為前綴比對） */
    skipSlots?: string[];
}

/**
 * 風格家族綁定（結算視窗家族 settle 等）：與 styleBinding 平行的另一組套用規則。
 * roles 的欄位值若以 @ 開頭，代表引用主題 token（如 "@settle.panel.bg"），季節／節慶主題覆寫 token 即整套換色。
 */
export interface ThemeFamilyBinding {
    appliesToSkins: string[];
    /** slot id（完整 id 或後綴，最長者優先）→ 角色名 */
    slotRoles: Record<string, string>;
    /** 角色名 → 樣式欄位（值可為 @token 引用或字面值） */
    roles: Record<string, Record<string, string | number>>;
}

export interface ThemeRegistry {
    id: string;
    version: number;
    defaultTheme: string;
    /** 疊加順序（前者在下） */
    layerOrder: string[];
    styleBinding: ThemeStyleBinding;
    /** 風格家族綁定（可選）；key 為家族名，例如 settle（戰場結算風格，大廳任務視窗共用） */
    familyBindings?: Record<string, ThemeFamilyBinding>;
    themes: Record<string, UITheme>;
    rules: ThemeRule[];
}

export interface ThemeContext {
    seasonIndex?: number;
    /** 目前日期；未給則不比對 dateRange */
    date?: Date;
    festivalIds?: readonly string[];
    flags?: readonly string[];
}

export interface ResolvedTheme {
    /** 疊加順序，第一個必為 default 主題 */
    stack: string[];
    tokens: Record<string, ThemeTokenValue>;
    assets: Record<string, ThemeAssetRef>;
}

/** 單一主題沿 extends 往上展開（祖先在前）；有循環或缺主題時略過該節點 */
function themeChain(registry: Readonly<ThemeRegistry>, id: string): string[] {
    const chain: string[] = [];
    const seen = new Set<string>();
    let cur: string | undefined = id;
    while (cur && !seen.has(cur) && registry.themes[cur]) {
        seen.add(cur);
        chain.unshift(cur);
        const parent: string | undefined = registry.themes[cur].extends;
        cur = parent ?? (cur === registry.defaultTheme ? undefined : registry.defaultTheme);
    }
    return chain;
}

/** 依疊加順序合併 token 與素材；stack 內未知的主題 id 略過；結果一定包含 default 的全部 key。 */
export function mergeThemes(registry: Readonly<ThemeRegistry>, stack: readonly string[]): ResolvedTheme {
    const ordered: string[] = [];
    for (const id of [registry.defaultTheme, ...stack]) {
        for (const link of themeChain(registry, id)) {
            if (!ordered.includes(link)) ordered.push(link);
        }
    }
    const tokens: Record<string, ThemeTokenValue> = {};
    const assets: Record<string, ThemeAssetRef> = {};
    for (const id of ordered) {
        const theme = registry.themes[id];
        Object.assign(tokens, theme.tokens);
        for (const key of Object.keys(theme.assets ?? {})) assets[key] = { ...theme.assets![key] };
    }
    return { stack: ordered, tokens, assets };
}

function mmdd(date: Date): number {
    return (date.getMonth() + 1) * 100 + date.getDate();
}

function parseMmdd(text: string): number {
    const [m, d] = text.split('-').map(Number);
    return m * 100 + d;
}

function inDateRange(date: Date, range: { from: string; to: string }): boolean {
    const now = mmdd(date);
    const from = parseMmdd(range.from);
    const to = parseMmdd(range.to);
    return from <= to ? now >= from && now <= to : now >= from || now <= to;
}

/** 條件全部成立才算命中；未寫的條件不限制，但完全沒條件的規則不命中（避免誤蓋全域）。 */
export function ruleMatches(when: Readonly<ThemeRuleWhen>, ctx: Readonly<ThemeContext>): boolean {
    let tested = 0;
    if (when.seasonIndex !== undefined) {
        tested++;
        const want = Array.isArray(when.seasonIndex) ? when.seasonIndex : [when.seasonIndex];
        if (ctx.seasonIndex === undefined || !want.includes(ctx.seasonIndex)) return false;
    }
    if (when.festivalIds) {
        tested++;
        if (!when.festivalIds.some(id => ctx.festivalIds?.includes(id))) return false;
    }
    if (when.flags) {
        tested++;
        if (!when.flags.some(f => ctx.flags?.includes(f))) return false;
    }
    if (when.dateRange) {
        tested++;
        if (!ctx.date || !inDateRange(ctx.date, when.dateRange)) return false;
    }
    return tested > 0;
}

/**
 * 依規則資料決定啟用的主題疊加順序（不含 default，default 由 mergeThemes 補）。
 * 每層取 priority 最高且命中的一條；規則指向不存在的主題則略過。
 */
export function resolveActiveTheme(registry: Readonly<ThemeRegistry>, ctx: Readonly<ThemeContext>): string[] {
    const winners = new Map<string, ThemeRule>();
    for (const rule of registry.rules) {
        if (!registry.themes[rule.theme] || !ruleMatches(rule.when, ctx)) continue;
        const cur = winners.get(rule.layer);
        if (!cur || (rule.priority ?? 0) > (cur.priority ?? 0)) winners.set(rule.layer, rule);
    }
    return registry.layerOrder.filter(layer => winners.has(layer)).map(layer => winners.get(layer)!.theme);
}

type TokenMap = Record<string, ThemeTokenValue>;

function str(tokens: TokenMap, key: string): string | undefined {
    const v = tokens[key];
    return v === undefined ? undefined : String(v);
}

function num(tokens: TokenMap, key: string): number | undefined {
    const v = tokens[key];
    return v === undefined ? undefined : Number(v);
}

/** 只放有值的欄位，避免把 undefined 蓋到 slot 上 */
function defined<T extends object>(obj: T): T {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
    return out as T;
}

function boxRole(t: TokenMap, p: string): SkinStyleRole {
    return defined({
        kind: 'color-rect',
        color: str(t, `${p}.bg`),
        alpha: num(t, `${p}.alpha`),
        cornerRadius: num(t, `${p}.cornerRadius`),
        borderWidth: num(t, `${p}.borderWidth`),
        borderColor: str(t, `${p}.border`),
    });
}

/** 語意 token → skin 套用用的風格角色表（ThemeSkinRestyle 的輸入） */
export function buildSkinStyle(tokens: TokenMap, binding: Readonly<ThemeStyleBinding>): SkinStyleTokens {
    return {
        id: 'theme-skin-style',
        version: 1,
        appliesToSkins: binding.appliesToSkins,
        fillRoles: binding.fillRoles,
        slotRoles: binding.slotRoles,
        skipSlots: binding.skipSlots,
        font: str(tokens, 'text.font') ?? '',
        titleMinFontSize: num(tokens, 'text.title.minSize') ?? 26,
        roles: {
            glassPanel: boxRole(tokens, 'panel'),
            // 子畫面（任務牆、太守府）的主面板：同樣深色玻璃，但不透明，避免後方大廳文字穿透
            glassPanelSolid: { ...boxRole(tokens, 'panel'), ...defined({ alpha: num(tokens, 'panel.solid.alpha') }) },
            // 面板內的卡片／列：淡色內嵌＋細金框，疊在不透明主面板上
            insetPanel: boxRole(tokens, 'panel.inset'),
            buttonSecondary: boxRole(tokens, 'button.secondary'),
            buttonAccent: boxRole(tokens, 'button.primary'),
            divider: defined({ kind: 'color-rect', color: str(tokens, 'divider.color'), alpha: num(tokens, 'divider.alpha') }),
            labelTitle: defined({ color: str(tokens, 'text.title') }),
            labelSection: defined({ color: str(tokens, 'text.section'), letterSpacing: num(tokens, 'text.section.letterSpacing') }),
            labelBody: defined({ color: str(tokens, 'text.body') }),
            labelButton: defined({ color: str(tokens, 'text.button') }),
        },
    };
}

/** 家族綁定 → skin 套用用的風格角色表；@token 引用在此展開，缺 token 的欄位略過（沿用 slot 原值）。 */
export function buildFamilyStyle(tokens: TokenMap, binding: Readonly<ThemeFamilyBinding>, familyId: string): SkinStyleTokens {
    const roles: Record<string, SkinStyleRole> = {};
    for (const [name, spec] of Object.entries(binding.roles)) {
        const role: Record<string, unknown> = {};
        for (const [field, raw] of Object.entries(spec)) {
            if (typeof raw === 'string' && raw.startsWith('@')) {
                const v = tokens[raw.slice(1)];
                if (v !== undefined) role[field] = v;
            } else {
                role[field] = raw;
            }
        }
        roles[name] = role as SkinStyleRole;
    }
    return {
        id: `theme-family-${familyId}`,
        version: 1,
        appliesToSkins: binding.appliesToSkins,
        fillRoles: {},
        slotRoles: binding.slotRoles,
        onlyForced: true,
        font: str(tokens, 'text.font') ?? '',
        titleMinFontSize: 9999,
        roles,
    };
}
