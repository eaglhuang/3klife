// @spec-source → 轉蛋系統.md (doc_spec_0042)；PROG-2-2237（轉蛋畫面改用原稿固定 id 命名、各池共用同一畫面）
/**
 * 轉蛋畫面（gacha-ds3）的固定節點名與各池定義（純資料，不依賴 cc）。
 *
 * 節點名由 tools_node/data/ui-bind-maps/gacha-ds3.json 依原稿的 id／class 指定，重轉原稿不會改名；
 * 名將池、紅顏池、支援卡池共用同一個轉蛋畫面，切池時換橫幅、右側內容與該池的附加區塊。
 * 新的池（例如新手或特殊轉蛋）在 GACHA_POOLS 加一筆，不另做一套畫面。
 *
 * Unity 對照：同一個 Gacha Prefab，各池只是不同的 ScriptableObject 設定。
 */
import { buildGachaPoolGuideLines } from './GachaPoolGuidePresenter';

export const GACHA_SCREEN_ID = 'gacha-ds3';

/** 右側內容的延遲插槽（原稿 data-ucuf-tab-content 的 RightPanel）。 */
export const GACHA_CONTENT_SLOT = 'RightPanel';

export const GACHA_NODES = {
    poolPrev: 'BtnPoolPrev',
    poolNext: 'BtnPoolNext',
    /** 左上角原「卡池說明」框，改當天命商店入口（PROG-2-1158） */
    poolBrief: 'PoolBrief',
    briefTag: 'BriefTag',
    briefLine: 'BriefLine',
    history: 'BtnGachaHistory',
    pullSingle: 'BtnPullSingle',
    pullSingleLabel: 'PullSingleLabel',
    pullSingleCost: 'PullSingleCost',
    pullTen: 'BtnPullTen',
    pullTenLabel: 'PullTenLabel',
    pullTenCost: 'PullTenCost',
    goldSummon: 'BtnGoldSummon',
    goldSummonLabel: 'GoldSummonLabel',
    ticketSummon: 'BtnTicketSummon',
    ticketSummonLabel: 'TicketSummonLabel',
    /** 右側內容「我的餘額」 */
    balance: 'CostBalanceValue',
    /** 十連原價（刪除線，與現價相同時藏起來） */
    pullTenOriginalCost: 'PullTenOriginalCost',
    /** 橫幅上方「當前卡池」名稱 */
    poolNameStrip: 'PoolNameStripValue',
    /** 右側內容（各池片段同名，PROG-2-9025） */
    rpPoolName: 'RpPoolName',
    rpPoolSub: 'RpPoolSub',
    rpPoolBadge: 'RpPoolBadge',
    pityTitle: 'PityTitle',
    pityRemain: 'PityRemain',
    pityTrack: 'PityTrack',
    pityFill: 'PityFill',
    pityFillLabel: 'PityFillLabel',
} as const;

/** 右側機率格第 index 格（由稀有度高到低） */
export const GACHA_RATE_NODES = (index: number): { item: string; rarity: string; pct: string } => ({
    item: `RateItem${index}`,
    rarity: `RateRarity${index}`,
    pct: `RatePct${index}`,
});
/** 原稿各池機率格最多幾格 */
export const GACHA_RATE_ROWS = 4;

export type GachaPoolKey = 'general' | 'limited' | 'legendary' | 'support';

/** 池的附加區塊：由程式掛在該池橫幅的某個節點下，不在轉換產出裡。 */
export interface GachaPoolSection {
    /** 錨點節點名 */
    anchor: string;
    /** 版面片段 id（ui-spec/fragments/layouts 下） */
    fragment: string;
    /** 掛上時是否藏起錨點原有內容（例如「立繪佔位」字樣） */
    replaceContent: boolean;
}

export interface GachaPoolDef {
    /** 原稿的池 id（pool-panel-<key>） */
    key: GachaPoolKey;
    /** 轉蛋系統的池 id（gacha-main-pools.json 對應，PROG-2-9024） */
    poolId: string;
    /** 橫幅節點名 */
    banner: string;
    /** 右側內容片段 */
    contentFragment: string;
    /** 橫幅上的文字節點（標籤與保底是外框裡的文字，外框本身不具名） */
    eventChip: string;
    heroName: string;
    heroTitle: string;
    guarantee: string;
    /** 橫幅立繪框 */
    art: string;
    /** 原稿的池 id（分頁 key）；也是整頁配色變體鍵（gacha-ds3.skin-variants.json，轉換器依分頁產生） */
    layoutKey: string;
    section?: GachaPoolSection;
}

/** layoutKey：原稿的池 id（general／legendary＝限定黑金／heroine＝紅顏／support） */
function poolDef(key: GachaPoolKey, poolId: string, layoutKey: string, section?: GachaPoolSection): GachaPoolDef {
    const prefix = `Pool${layoutKey.charAt(0).toUpperCase()}${layoutKey.slice(1)}`;
    return {
        key,
        poolId,
        banner: `BannerSlide_${layoutKey}`,
        contentFragment: `fragments/layouts/${GACHA_SCREEN_ID}-${layoutKey}-content`,
        eventChip: `${prefix}EventChip`,
        heroName: `${prefix}HeroName`,
        heroTitle: `${prefix}HeroTitle`,
        guarantee: `${prefix}Guarantee`,
        art: `${prefix}ArtSlot`,
        layoutKey,
        section,
    };
}

/** 紅顏展示的列與詳情（節點名對應 RedFaceShowcaseController 的 flow key）。 */
export const RED_FACE_SECTION_FRAGMENT = 'fragments/layouts/gacha-pool-red-face-section';
export const RED_FACE_SECTION_ROW_BUTTON = (index: number): string => `btnRedFaceRow${index}`;

/**
 * 依輪播順序：0 名將池、1 限定池（limited-pool，黑金）、2 紅顏池（support-pool）、3 支援卡池（mentor-pool）。
 * 各池對應原稿同名橫幅與右側片段，配色走 skin 變體（PROG-2-9025）。限定池沒有開放時間窗時切池會略過它（PROG-2-9024）。
 */
export const GACHA_POOLS: readonly GachaPoolDef[] = [
    poolDef('general', 'GENERAL_STANDARD_01', 'general'),
    poolDef('limited', 'limited-pool', 'legendary'),
    poolDef('legendary', 'support-pool', 'heroine'),
    poolDef('support', 'mentor-pool', 'support'),
];

export const GACHA_POOL_INDEX = { general: 0, limited: 1, redFace: 2, support: 3 } as const;

/** 各池共用的抽卡列文字。 */
export function gachaPullBarTexts(): Record<string, string> {
    return {
        [GACHA_NODES.pullSingleLabel]: '單抽',
        [GACHA_NODES.pullSingleCost]: '150',
        [GACHA_NODES.pullTenLabel]: '十連抽',
        [GACHA_NODES.pullTenCost]: '1500',
        [GACHA_NODES.goldSummonLabel]: '×500',
    };
}

/** 各池橫幅文字（原稿是示意文字，這裡換成遊戲實際的池）。 */
export function gachaPoolBannerTexts(pool: GachaPoolDef): Record<string, string> {
    const guide = buildGachaPoolGuideLines();
    switch (pool.key) {
        case 'general':
            return { [pool.eventChip]: guide.generalSeries };
        case 'limited':
            return { [pool.eventChip]: '★ 限定召喚 · 本期限定' };
        case 'legendary':
            return { [pool.eventChip]: '★ 紅顏系列 · 常設' };
        case 'support':
            return { [pool.eventChip]: guide.supportSeries };
        default:
            return {};
    }
}
