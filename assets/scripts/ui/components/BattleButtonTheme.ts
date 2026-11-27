// @spec-source → 戰場右側 UI 重設計規格 §3.1 統一按鈕語彙；PROG-2-10133（B2）
/**
 * BattleButtonTheme — 戰場按鈕統一外觀的資料與純運算（不依賴 cc，可單測）
 *
 * 顏色、尺寸、動畫秒數都在 DEFAULT_BATTLE_BUTTON_THEME；實際可由
 * resources/ui-spec/battle-button-theme.json 覆寫（整套換季節／節慶主題時只換這份資料，不動程式）。
 * 層級只有三級：primary（朱漆＝結束回合、金漆＝出陣）、secondary（深漆木＋銅邊）、danger（次要＋偏紅邊）。
 */

/** 按鈕色系 */
export type BattleButtonVariant = 'secondary' | 'crimson' | 'gold' | 'danger';
/** 四種狀態（所有按鈕共用，不另做貼圖） */
export type BattleButtonState = 'normal' | 'pressed' | 'disabled' | 'active';

export interface BattleButtonVariantTheme {
    /** 上緣漸層色（#RRGGBB） */
    top: string;
    /** 下緣漸層色 */
    bottom: string;
    /** 外框色 */
    border: string;
    /** 說明字顏色 */
    text: string;
    /** 圖示線稿顏色 */
    icon: string;
}

export interface BattleButtonTheme {
    /** 圓角半徑（設計 px） */
    radius: number;
    /** 外框線寬 */
    borderWidth: number;
    /** 下緣厚度陰影（按下時收掉） */
    thickness: number;
    /** 內上緣金高光色 */
    highlight: string;
    /** 按下時整顆下移的距離 */
    pressedOffset: number;
    /** 按下時亮度倍率 */
    pressedBrightness: number;
    /** 禁用時透明度（0~1） */
    disabledOpacity: number;
    /** 禁用時往灰階混合的比例（0~1） */
    disabledDesaturate: number;
    /** 按下／放開的 Tween 秒數 */
    pressTweenSec: number;
    /** 啟用中（開關型）：金邊、金色圖示、外發光 */
    activeBorder: string;
    activeIcon: string;
    activeGlow: string;
    /** 外發光外擴距離 */
    glowSpread: number;
    /** 啟用中底色往暖色（金）混合的比例 */
    activeWarmMix: number;
    /** 說明字縮字下限（相對原字級），超出寬度時縮到這個比例 */
    minFontRatio: number;
    variants: Record<BattleButtonVariant, BattleButtonVariantTheme>;
}

export const DEFAULT_BATTLE_BUTTON_THEME: BattleButtonTheme = {
    radius: 12,
    borderWidth: 2,
    thickness: 3,
    highlight: '#F6DE9A',
    pressedOffset: 3,
    pressedBrightness: 0.85,
    disabledOpacity: 0.42,
    disabledDesaturate: 1,
    pressTweenSec: 0.06,
    activeBorder: '#FFE088',
    activeIcon: '#FFE088',
    activeGlow: '#FFD36A',
    glowSpread: 12,
    activeWarmMix: 0.22,
    minFontRatio: 0.7,
    variants: {
        secondary: { top: '#241C16', bottom: '#0D0A08', border: '#8A6A2F', text: '#F2E6C8', icon: '#F2E6C8' },
        crimson: { top: '#D03A30', bottom: '#6A1313', border: '#D4AF37', text: '#FFF2D6', icon: '#FFF2D6' },
        gold: { top: '#F0D27A', bottom: '#8F6A1C', border: '#FFF0B0', text: '#3A2208', icon: '#3A2208' },
        danger: { top: '#2A1814', bottom: '#0D0A08', border: '#B03A2E', text: '#F2E6C8', icon: '#F2B8AE' },
    },
};

/** 一組已算好的繪製參數（RGB 0~255） */
export interface BattleButtonVisual {
    top: [number, number, number];
    bottom: [number, number, number];
    border: [number, number, number];
    text: [number, number, number];
    icon: [number, number, number];
    highlight: [number, number, number];
    glow: [number, number, number] | null;
    /** 下緣厚度陰影；按下時為 0 */
    thickness: number;
    /** 本體 Y 位移（按下為負） */
    bodyOffsetY: number;
    /** 整顆透明度 0~1 */
    opacity: number;
}

type Rgb = [number, number, number];

/** #RGB / #RRGGBB → [r,g,b]；格式不對回傳洋紅，一眼看得出來設錯色 */
export function parseHexColor(hex: string): Rgb {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return [255, 0, 255];
    let h = m[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const clamp255 = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));

function scale(c: Rgb, k: number): Rgb { return [clamp255(c[0] * k), clamp255(c[1] * k), clamp255(c[2] * k)]; }
function mix(a: Rgb, b: Rgb, t: number): Rgb {
    return [clamp255(a[0] + (b[0] - a[0]) * t), clamp255(a[1] + (b[1] - a[1]) * t), clamp255(a[2] + (b[2] - a[2]) * t)];
}
/** 往灰階混合（去飽和）；t=1 為純灰 */
function desaturate(c: Rgb, t: number): Rgb {
    const l = clamp255(c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114);
    return mix(c, [l, l, l], t);
}

/** 依色系與狀態算出繪製參數（純函式） */
export function resolveBattleButtonVisual(theme: BattleButtonTheme, variant: BattleButtonVariant, state: BattleButtonState): BattleButtonVisual {
    const v = theme.variants[variant] ?? theme.variants.secondary;
    let top = parseHexColor(v.top);
    let bottom = parseHexColor(v.bottom);
    let border = parseHexColor(v.border);
    let text = parseHexColor(v.text);
    let icon = parseHexColor(v.icon);
    const highlight = parseHexColor(theme.highlight);
    let glow: Rgb | null = null;
    let thickness = theme.thickness;
    let bodyOffsetY = 0;
    let opacity = 1;
    if (state === 'active') {
        const warm = parseHexColor(theme.activeGlow);
        top = mix(top, warm, theme.activeWarmMix);
        bottom = mix(bottom, warm, theme.activeWarmMix * 0.6);
        border = parseHexColor(theme.activeBorder);
        icon = parseHexColor(theme.activeIcon);
        glow = parseHexColor(theme.activeGlow);
    } else if (state === 'pressed') {
        top = scale(top, theme.pressedBrightness);
        bottom = scale(bottom, theme.pressedBrightness);
        border = scale(border, theme.pressedBrightness);
        text = scale(text, theme.pressedBrightness);
        icon = scale(icon, theme.pressedBrightness);
        thickness = 0;
        bodyOffsetY = -theme.pressedOffset;
    } else if (state === 'disabled') {
        const t = theme.disabledDesaturate;
        top = desaturate(top, t); bottom = desaturate(bottom, t); border = desaturate(border, t);
        text = desaturate(text, t); icon = desaturate(icon, t);
        opacity = theme.disabledOpacity;
    }
    return { top, bottom, border, text, icon, highlight, glow, thickness, bodyOffsetY, opacity };
}

/** 開關型按鈕的狀態優先序：禁用 > 按下 > 啟用中 > 一般 */
export function pickBattleButtonState(flags: { disabled: boolean; pressed: boolean; active: boolean }): BattleButtonState {
    if (flags.disabled) return 'disabled';
    if (flags.pressed) return 'pressed';
    if (flags.active) return 'active';
    return 'normal';
}

/**
 * 以 JSON 覆寫主題（淺層合併 variants 的每一色系）；欄位型別不對就沿用預設，
 * 避免換季資料寫錯整個戰場按鈕壞掉。
 */
export function mergeBattleButtonTheme(base: BattleButtonTheme, override: unknown): BattleButtonTheme {
    const out: BattleButtonTheme = JSON.parse(JSON.stringify(base));
    if (!override || typeof override !== 'object') return out;
    const src = override as Record<string, unknown>;
    for (const key of Object.keys(out) as Array<keyof BattleButtonTheme>) {
        if (key === 'variants') continue;
        const next = src[key];
        if (typeof next === typeof out[key]) (out as unknown as Record<string, unknown>)[key] = next;
    }
    const variants = src.variants;
    if (variants && typeof variants === 'object') {
        for (const name of Object.keys(out.variants) as BattleButtonVariant[]) {
            const patch = (variants as Record<string, unknown>)[name];
            if (!patch || typeof patch !== 'object') continue;
            for (const field of Object.keys(out.variants[name]) as Array<keyof BattleButtonVariantTheme>) {
                const value = (patch as Record<string, unknown>)[field];
                if (typeof value === 'string') out.variants[name][field] = value;
            }
        }
    }
    return out;
}
