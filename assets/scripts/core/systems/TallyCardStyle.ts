// @spec-source → 虎符卡面UI佈局與部隊卡圖備援渲染規格書.md（doc_spec_0355）、虎符名錄圖鑑收錄與委任AI出展調配規格書.md §1；PROG-2-10131 虎符卡重新設計（11/27 使用者裁決：品階 4 級、卡面乙版精簡）
/**
 * TallyCardStyle — 虎符卡「乙版精簡」卡面的純邏輯（不依賴 cc，可直接單元測試）。
 *
 * - 品階 4 級：R／SR／SSR／UR（暗銅／銀／金／赤金），與轉蛋稀有度一致；舊資料的 mythic（LR）併入 UR，N 不使用。
 * - 卡面只放重點：兵種章、名稱、品階、持有武將、星級、糧耗、共鳴；攻／防／命、投入兵力 1,500、限調 1 隊都在短按面板。
 * - 圖鑑四態：LOCKED → DISCOVERED → ACQUIRED → STAR_ENHANCED（只進不退）。
 * - 色板與素材路徑全在 resources/ui-spec/tiger-tally-card-theme.json，換主題或交件新框圖只改那份資料，不動邏輯。
 *
 * Unity 對照：像 ScriptableObject 主題資料 + 一個 ViewModel 建構器，View 只負責把欄位貼上去。
 */
import { tallyResonancePercent } from './TallyCardFace';

export type TallyTier = 'R' | 'SR' | 'SSR' | 'UR';
export const TALLY_TIERS: readonly TallyTier[] = ['R', 'SR', 'SSR', 'UR'];

export type TallyCollectionState = 'LOCKED' | 'DISCOVERED' | 'ACQUIRED' | 'STAR_ENHANCED';
export const TALLY_COLLECTION_STATES: readonly TallyCollectionState[] = ['LOCKED', 'DISCOVERED', 'ACQUIRED', 'STAR_ENHANCED'];

/** 卡面上限星數：R3／SR4／SSR5／UR5（空星顯示品質封頂） */
export const TALLY_TIER_STAR_CAP: Readonly<Record<TallyTier, number>> = { R: 3, SR: 4, SSR: 5, UR: 5 };

/** 灌注小章門檻：Lv5 銀、Lv8 金（規格 §虎符升階介面與特種軍隊強度灌注晉升） */
export const TALLY_INFUSE_BADGE_LEVELS = { silver: 5, gold: 8 } as const;
export type TallyInfuseBadge = 'lv5' | 'lv8';

/** 舊五級稀有度（TallyCardData.rarity）對應到四級品階；mythic 併入 UR */
const RARITY_TO_TIER: Readonly<Record<string, TallyTier>> = {
    normal: 'R',
    rare: 'SR',
    epic: 'SSR',
    legendary: 'UR',
    mythic: 'UR',
};

export function tallyTierOfRarity(rarity: string | null | undefined): TallyTier {
    return RARITY_TO_TIER[`${rarity ?? ''}`.trim().toLowerCase()] ?? 'R';
}

/** 虎符持有卡品質（TigerTallyQuality）字串轉品階；不認得回 null */
export function tallyTierOfQuality(quality: string | null | undefined): TallyTier | null {
    const q = `${quality ?? ''}`.trim().toUpperCase();
    return (TALLY_TIERS as readonly string[]).includes(q) ? (q as TallyTier) : null;
}

/** 卡面讀的欄位（TallyCardData 的子集，避免本檔反向依賴 UI 層） */
export interface TallyCardFaceSource {
    unitName: string;
    rarity: string;
    /** 持有卡品質（有綁到持有實例時優先採用） */
    qualityTier?: string;
    /** 目錄預設星字串（★ 的數量）；沒有持有星級時退而求其次 */
    stars?: string;
    /** 持有卡實際星級 1~5 */
    starLevel?: number;
    cost: number;
    /** 持有武將名；沒有就不顯示持有行 */
    ownerName?: string;
    /** 灌注等級（Lv5 銀章、Lv8 金章） */
    infuseLevel?: number;
    /** 圖鑑狀態；沒給時依星級推導（戰場出戰卡一定已入庫） */
    collectionState?: TallyCollectionState;
    /** 已出戰（同名限調 1 隊，出戰中改顯標籤，不做冷卻） */
    deployed?: boolean;
    /** 軍勢、糧草或條件不足而派不出去 */
    isDisabled?: boolean;
}

export function resolveTallyTier(src: Pick<TallyCardFaceSource, 'rarity' | 'qualityTier'>): TallyTier {
    return tallyTierOfQuality(src.qualityTier) ?? tallyTierOfRarity(src.rarity);
}

/** 星級：持有星級優先；否則數星字串裡的 ★；至少 1、封頂依品階 */
export function resolveTallyStarLevel(src: Pick<TallyCardFaceSource, 'rarity' | 'qualityTier' | 'stars' | 'starLevel'>): number {
    const cap = TALLY_TIER_STAR_CAP[resolveTallyTier(src)];
    const fromText = (src.stars ?? '').split('★').length - 1;
    const raw = typeof src.starLevel === 'number' && Number.isFinite(src.starLevel) ? src.starLevel : fromText;
    return Math.max(1, Math.min(cap, Math.floor(raw) || 1));
}

export function resolveTallyCollectionState(src: Pick<TallyCardFaceSource, 'collectionState' | 'rarity' | 'qualityTier' | 'stars' | 'starLevel'>): TallyCollectionState {
    if (src.collectionState && TALLY_COLLECTION_STATES.includes(src.collectionState)) return src.collectionState;
    return resolveTallyStarLevel(src) > 1 ? 'STAR_ENHANCED' : 'ACQUIRED';
}

/** 灌注小章：Lv8 金、Lv5 銀，不到 5 級沒有章 */
export function tallyInfuseBadgeOf(level: number | undefined | null): TallyInfuseBadge | null {
    const lv = Math.floor(level ?? 0);
    if (lv >= TALLY_INFUSE_BADGE_LEVELS.gold) return 'lv8';
    if (lv >= TALLY_INFUSE_BADGE_LEVELS.silver) return 'lv5';
    return null;
}

/** 卡面文字的 i18n key 與 zh-TW 預設（與 resources/i18n/zh-TW.json 同步，測試會比對） */
export const TALLY_CARD_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.tally.card.grain': '糧 {0}',
    'ui.tally.card.resonance': '共鳴 +{0}%',
    'ui.tally.card.owner': '持有 {0}',
    'ui.tally.card.unowned': '未獲得',
    'ui.tally.card.unknown_name': '？？？',
    'ui.tally.card.deployed': '出戰中',
    'ui.tally.card.infuse_lv5': '灌5',
    'ui.tally.card.infuse_lv8': '灌8',
};
export const TALLY_CARD_TEXT_KEYS = Object.keys(TALLY_CARD_TEXT_FALLBACK_ZH_TW);

export type TallyCardTextLookup = (key: string, ...args: string[]) => string;

/** 語系表未載入時 i18n.t 回傳 key 本身，這時改用 zh-TW 預設 */
export function withTallyCardTextFallback(lookup?: TallyCardTextLookup): TallyCardTextLookup {
    return (key, ...args) => {
        const localized = lookup ? lookup(key, ...args) : key;
        if (localized !== key) return localized;
        const template = TALLY_CARD_TEXT_FALLBACK_ZH_TW[key];
        if (template === undefined) return key;
        return template.replace(/\{(\d+)\}/g, (_m, i: string) => args[Number(i)] ?? '');
    };
}

export interface TallyCardFaceB {
    tier: TallyTier;
    state: TallyCollectionState;
    name: string;
    /** 持有行；LOCKED 與沒有持有武將時為空字串 */
    ownerLine: string;
    starsFilled: number;
    starsCap: number;
    /** 例：★★☆ */
    starsText: string;
    grainText: string;
    resonanceText: string;
    resonancePercent: number;
    infuseBadge: TallyInfuseBadge | null;
    infuseText: string;
    /** 已出戰標籤文字；沒出戰為空字串 */
    deployedText: string;
    /** 卡圖：normal 正常、dim 變暗、silhouette 全黑剪影 */
    artMode: 'normal' | 'dim' | 'silhouette';
    /** 整張卡的亮度倍率（0~1）：LOCKED 與派不出去的灰態變暗 */
    brightness: number;
    /** 派不出去（軍勢、糧草、條件不足）的灰態；DisabledMask 與去色都吃這個旗標 */
    grayed: boolean;
    /** 星階共鳴卡的描邊光暈 */
    enhancedGlow: boolean;
}

/** 灰態與未解鎖的亮度；灰態必須明顯比正常卡暗（玩家要一眼看出派不出去） */
export const TALLY_GRAYED_BRIGHTNESS = 0.45;
export const TALLY_LOCKED_BRIGHTNESS = 0.5;
export const TALLY_DISCOVERED_BRIGHTNESS = 0.72;

export function buildTallyCardFaceB(src: TallyCardFaceSource, t: TallyCardTextLookup = withTallyCardTextFallback()): TallyCardFaceB {
    const tier = resolveTallyTier(src);
    const state = resolveTallyCollectionState(src);
    const cap = TALLY_TIER_STAR_CAP[tier];
    const owned = state === 'ACQUIRED' || state === 'STAR_ENHANCED';
    // LOCKED 星級全空；DISCOVERED 只示意品質封頂，不示範已有星
    const filled = owned ? resolveTallyStarLevel(src) : 0;
    const percent = tallyResonancePercent(Math.max(1, filled));
    const infuseBadge = owned ? tallyInfuseBadgeOf(src.infuseLevel) : null;
    const owner = (src.ownerName ?? '').trim();
    const grayed = !!src.isDisabled;

    let brightness = 1;
    if (state === 'LOCKED') brightness = TALLY_LOCKED_BRIGHTNESS;
    else if (state === 'DISCOVERED') brightness = TALLY_DISCOVERED_BRIGHTNESS;
    if (grayed) brightness = Math.min(brightness, TALLY_GRAYED_BRIGHTNESS);

    return {
        tier,
        state,
        name: state === 'LOCKED' ? t('ui.tally.card.unknown_name') : src.unitName,
        ownerLine: state === 'LOCKED' ? '' : state === 'DISCOVERED' ? t('ui.tally.card.unowned') : (owner ? t('ui.tally.card.owner', owner) : ''),
        starsFilled: filled,
        starsCap: cap,
        starsText: '★'.repeat(filled) + '☆'.repeat(Math.max(0, cap - filled)),
        grainText: t('ui.tally.card.grain', String(Math.max(0, Math.floor(owned ? src.cost : 0)))),
        resonanceText: t('ui.tally.card.resonance', String(owned ? percent : 0)),
        resonancePercent: owned ? percent : 0,
        infuseBadge,
        infuseText: infuseBadge ? t(infuseBadge === 'lv8' ? 'ui.tally.card.infuse_lv8' : 'ui.tally.card.infuse_lv5') : '',
        deployedText: owned && src.deployed ? t('ui.tally.card.deployed') : '',
        artMode: state === 'LOCKED' ? 'silhouette' : state === 'DISCOVERED' ? 'dim' : 'normal',
        brightness,
        grayed,
        enhancedGlow: state === 'STAR_ENHANCED',
    };
}

// ── 主題資料（resources/ui-spec/tiger-tally-card-theme.json）──────────────────────

export type Rgba = readonly [number, number, number, number];

export interface TallyTierTheme {
    /** 品階中文名（暗銅／銀／金／赤金） */
    name: string;
    /** 框圖主色（白色底圖乘上它；交件正式框圖後可設成白色 255,255,255,255 不再染色） */
    frameTint: Rgba;
    /** 名稱、星級、品階字的主色 */
    accent: Rgba;
    /** 描邊（外光暈）色；null 不畫 */
    glow: Rgba | null;
    /** 品階章的底色與字色 */
    chipBg: Rgba;
    chipText: Rgba;
    /** 框圖路徑（resources 相對路徑，不含副檔名）；缺檔就用共用佔位框 */
    frame: string;
    /** 品階徽記 56×56；缺檔就只畫兵種章 */
    emblem: string;
}

export interface TallyCardTheme {
    version: number;
    /** 卡片設計尺寸（規格 287:142） */
    cardWidth: number;
    cardHeight: number;
    /** 九宮格切邊：左、上、右、下（規格 56/40/40/40） */
    sliceBorder: readonly [number, number, number, number];
    /** 共用 128×128 灰階可平鋪拉絲圖與疊上的不透明度 0~255 */
    brushed: string;
    brushedOpacity: number;
    /** 缺品階框圖時共用的佔位框（白色底圖，乘 frameTint） */
    placeholderFrame: string;
    /** 灌注小章 40×18；缺檔就用文字章 */
    infuse: { lv5: string; lv8: string; lv5Color: Rgba; lv8Color: Rgba };
    tiers: Readonly<Record<TallyTier, TallyTierTheme>>;
}

function isRgba(v: unknown): v is Rgba {
    return Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number' && n >= 0 && n <= 255);
}

/** 檢查主題資料是否完整；回傳缺漏／錯誤說明（空陣列代表合格） */
export function validateTallyCardTheme(raw: unknown): string[] {
    const problems: string[] = [];
    const theme = raw as Partial<TallyCardTheme> | null;
    if (!theme || typeof theme !== 'object') return ['theme 不是物件'];
    if (typeof theme.cardWidth !== 'number' || typeof theme.cardHeight !== 'number') problems.push('缺 cardWidth／cardHeight');
    if (!Array.isArray(theme.sliceBorder) || theme.sliceBorder.length !== 4) problems.push('sliceBorder 需 4 個數字（左上右下）');
    for (const key of ['brushed', 'placeholderFrame'] as const) {
        if (typeof theme[key] !== 'string' || !theme[key]) problems.push(`缺 ${key}`);
    }
    if (typeof theme.brushedOpacity !== 'number') problems.push('缺 brushedOpacity');
    if (!theme.infuse || !isRgba(theme.infuse.lv5Color) || !isRgba(theme.infuse.lv8Color)) problems.push('infuse 色碼不完整');
    for (const tier of TALLY_TIERS) {
        const tt = theme.tiers?.[tier];
        if (!tt) { problems.push(`缺品階 ${tier}`); continue; }
        if (!tt.name) problems.push(`${tier} 缺 name`);
        for (const key of ['frameTint', 'accent', 'chipBg', 'chipText'] as const) {
            if (!isRgba(tt[key])) problems.push(`${tier}.${key} 色碼不合法`);
        }
        if (tt.glow !== null && !isRgba(tt.glow)) problems.push(`${tier}.glow 需為色碼或 null`);
        if (!tt.frame || !tt.emblem) problems.push(`${tier} 缺 frame／emblem 路徑`);
    }
    return problems;
}
