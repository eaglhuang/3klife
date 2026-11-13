// @spec-source → 轉蛋系統.md §L（所有抽卡都是轉蛋系統的一池）；PROG-2-9020
import type {
    GachaConfig, GachaDisplayCurrency, GachaHeroReveal, GachaInventoryTarget, GachaPoolPresentationConfig, GachaPoolType, GachaRepullMode,
} from '../models/GachaConfig';

/** 解析後的池呈現設定：結果畫面只讀這份，不在程式裡依池別寫死文案（引擎中立）。 */
export interface GachaPoolPresentation {
    poolId: string;
    poolType: GachaPoolType | 'unknown';
    title: string;
    tenTitle: string;
    currency: GachaDisplayCurrency;
    repull: GachaRepullMode;
    heroReveal: GachaHeroReveal;
    inventory: GachaInventoryTarget;
    /** 有給才覆寫結果畫面一般文案 */
    labels: { header: string; heroSub: string; back: string; repull: string } | null;
    headerResetSuffix: string;
}

/** 設定沒寫時的保底值（只放「沒設定也要能顯示」的最小值；池別差異寫在 gacha-config.json） */
const FALLBACK: Required<Pick<GachaPoolPresentationConfig, 'title' | 'tenTitle' | 'currency' | 'repull' | 'heroReveal' | 'inventory'>> = {
    title: '單抽', tenTitle: '十連抽', currency: 'gems', repull: 'paid', heroReveal: 'side', inventory: 'roster',
};

export function resolveGachaPoolPresentation(
    pool: Readonly<GachaConfig> | null | undefined, poolId = pool?.poolId ?? '',
    /** 不在設定檔的程式註冊池（金幣召喚、召喚券）用的預設呈現 */
    fallback?: Readonly<GachaPoolPresentationConfig>,
): GachaPoolPresentation {
    const cfg: GachaPoolPresentationConfig = pool?.presentation ?? fallback ?? {};
    const hasLabels = cfg.header !== undefined || cfg.heroSub !== undefined || cfg.backLabel !== undefined || cfg.repullLabel !== undefined;
    return {
        poolId,
        poolType: pool?.poolType ?? 'unknown',
        title: cfg.title ?? FALLBACK.title,
        tenTitle: cfg.tenTitle ?? cfg.title ?? FALLBACK.tenTitle,
        currency: cfg.currency ?? FALLBACK.currency,
        repull: cfg.repull ?? FALLBACK.repull,
        heroReveal: cfg.heroReveal ?? FALLBACK.heroReveal,
        inventory: cfg.inventory ?? FALLBACK.inventory,
        labels: hasLabels ? {
            header: cfg.header ?? pool?.poolName ?? '',
            heroSub: cfg.heroSub ?? '',
            back: cfg.backLabel ?? '',
            repull: cfg.repullLabel ?? '',
        } : null,
        headerResetSuffix: cfg.headerResetSuffix ?? '',
    };
}

/** 抽數對應的標題（十連用 tenTitle） */
export function gachaPoolTitle(p: Readonly<GachaPoolPresentation>, drawCount: number): string {
    return drawCount === 10 ? p.tenTitle : p.title;
}

/** 池別標題；重轉過時接上次數後綴（宿命池） */
export function gachaPoolHeader(p: Readonly<GachaPoolPresentation>, resets: number): string {
    const base = p.labels?.header ?? '';
    return resets > 0 && p.headerResetSuffix ? base + p.headerResetSuffix.replace('{n}', String(resets)) : base;
}
