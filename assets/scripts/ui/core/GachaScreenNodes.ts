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
} as const;

export type GachaPoolKey = 'general' | 'legendary' | 'support';

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
    /** 橫幅節點名 */
    banner: string;
    /** 右側內容片段 */
    contentFragment: string;
    /** 橫幅上的文字節點（標籤與保底是外框裡的文字，外框本身不具名） */
    eventChip: string;
    heroName: string;
    heroTitle: string;
    guarantee: string;
    section?: GachaPoolSection;
}

function poolDef(key: GachaPoolKey, section?: GachaPoolSection): GachaPoolDef {
    const prefix = `Pool${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    return {
        key,
        banner: `BannerSlide_${key}`,
        contentFragment: `fragments/layouts/${GACHA_SCREEN_ID}-${key}-content`,
        eventChip: `${prefix}EventChip`,
        heroName: `${prefix}HeroName`,
        heroTitle: `${prefix}HeroTitle`,
        guarantee: `${prefix}Guarantee`,
        section,
    };
}

/** 紅顏展示的列與詳情（節點名對應 RedFaceShowcaseController 的 flow key）。 */
export const RED_FACE_SECTION_FRAGMENT = 'fragments/layouts/gacha-pool-red-face-section';
export const RED_FACE_SECTION_ROW_BUTTON = (index: number): string => `btnRedFaceRow${index}`;

/** 依輪播順序：0 名將池、1 紅顏池（support-pool）、2 支援卡池（mentor-pool）。 */
export const GACHA_POOLS: readonly GachaPoolDef[] = [
    poolDef('general'),
    poolDef('legendary', { anchor: 'PoolLegendaryArt', fragment: RED_FACE_SECTION_FRAGMENT, replaceContent: true }),
    poolDef('support'),
];

export const GACHA_POOL_INDEX = { general: 0, redFace: 1, support: 2 } as const;

/** 各池共用的抽卡列文字。 */
export function gachaPullBarTexts(): Record<string, string> {
    return {
        [GACHA_NODES.pullSingleLabel]: '單 抽 ×1',
        [GACHA_NODES.pullSingleCost]: '150',
        [GACHA_NODES.pullTenLabel]: '十 連 ×10',
        [GACHA_NODES.pullTenCost]: '1500',
        [GACHA_NODES.goldSummonLabel]: '金幣召喚（500）',
        [GACHA_NODES.ticketSummonLabel]: '使用召喚券（1）',
    };
}

/** 各池橫幅文字（原稿是示意文字，這裡換成遊戲實際的池）。 */
export function gachaPoolBannerTexts(pool: GachaPoolDef): Record<string, string> {
    const guide = buildGachaPoolGuideLines();
    switch (pool.key) {
        case 'general':
            return { [pool.eventChip]: guide.generalSeries };
        case 'legendary':
            return {
                [pool.eventChip]: '★ 紅顏池 · 召喚券 1 張抽 1 位',
                [pool.heroName]: '紅 顏',
                [pool.heroTitle]: '大喬、小喬、甄姬、黃月英、蔡琰',
                [pool.guarantee]: '抽到的武將入名冊，成年後可到「結緣」配對',
            };
        case 'support':
            return { [pool.eventChip]: guide.supportSeries };
        default:
            return {};
    }
}
