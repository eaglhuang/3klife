// @spec-source → 大廳系統.md（doc_spec_0002）E-1 頂部狀態列；PROG-2-1148
/**
 * LobbyCityHubController — 主大廳「城池主視覺」的純邏輯：
 * 頂列（主將頭像、勢力、官職、四項資源）、都市卡（城名、人口、民心、守軍、陣營）、
 * 底部五類功能收納（點類別展開子功能，再點一次收起）。
 * 不依賴 cc；LobbyScene 只負責把 FlowView 套到 lobby-city-hub-screen、把子功能 id 接到既有流程。
 *
 * Unity 對照：像 HUD 的 Presenter，畫面只讀 ViewModel、把按鈕事件轉成指令。
 */

import { RELATION_TIER_LABEL, relationTier, type RivalWorld } from '../../core/systems/RivalNations';
import { lobbyActionLock, lockedActionLabel } from '../../core/systems/OfficerFeatureUnlocks';

export type LobbyCategoryId = 'sortie' | 'generals' | 'domestic' | 'nurture' | 'shop';

export type LobbyActionId =
    | 'battle' | 'rival' | 'floodBattle'
    | 'generalList' | 'mercenary' | 'bonding' | 'jobChange' | 'spiritCodex'
    | 'domestic' | 'recruitHall' | 'hallBoard' | 'sandtable' | 'governorHall' | 'itemBag'
    | 'nurture' | 'academy' | 'supportCard' | 'shrine' | 'relationGraph'
    | 'gacha' | 'shop' | 'warehouse' | 'seasonPass';

export interface LobbyCategoryDef {
    readonly id: LobbyCategoryId;
    readonly label: string;
    readonly items: readonly { readonly id: LobbyActionId; readonly label: string }[];
}

export const LOBBY_CATEGORIES: readonly LobbyCategoryDef[] = [
    { id: 'sortie', label: '出征', items: [{ id: 'battle', label: '戰場' }, { id: 'rival', label: '外交・征伐' }, { id: 'floodBattle', label: '洪戰' }] },
    { id: 'generals', label: '武將', items: [{ id: 'generalList', label: '武將名冊' }, { id: 'mercenary', label: '傭兵結義' }, { id: 'bonding', label: '結緣' }, { id: 'jobChange', label: '成人禮' }, { id: 'spiritCodex', label: '英靈' }] },
    { id: 'domestic', label: '內政', items: [{ id: 'domestic', label: '內政' }, { id: 'recruitHall', label: '招賢館' }, { id: 'hallBoard', label: '任務牆' }, { id: 'sandtable', label: '天下沙盤' }, { id: 'governorHall', label: '太守府' }] },
    { id: 'nurture', label: '培育', items: [{ id: 'nurture', label: '開獎・培育' }, { id: 'academy', label: '學府' }, { id: 'supportCard', label: '支援卡' }, { id: 'shrine', label: '祠堂' }, { id: 'relationGraph', label: '關係圖鑑' }] },
    { id: 'shop', label: '商城', items: [{ id: 'gacha', label: '轉蛋' }, { id: 'shop', label: '商店' }, { id: 'warehouse', label: '倉庫' }, { id: 'itemBag', label: '背包' }, { id: 'seasonPass', label: '通行證' }] },
];

/** 子功能的原始顯示名稱（不含鎖頭字樣） */
export function lobbyActionName(action: LobbyActionId): string {
    return LOBBY_CATEGORIES.flatMap(c => c.items).find(i => i.id === action)?.label ?? action;
}

/** 子選單項目點了卻沒有可開的畫面時顯示的提示（PROG-2-9121） */
export const LOBBY_ACTION_NOT_OPEN_TEXT = '此功能尚未開放';

/** 子功能槽位數＝最多子功能的類別 */
export const LOBBY_SUB_SLOTS = Math.max(...LOBBY_CATEGORIES.map(c => c.items.length));

/** 類別按鈕節點 id：btnCatSortie… */
export function categoryButtonId(id: LobbyCategoryId): string {
    return `btnCat${id[0].toUpperCase()}${id.slice(1)}`;
}

/** 再點同一類別收起，點別的類別就切換 */
export function toggleCategory(open: LobbyCategoryId | null, clicked: LobbyCategoryId): LobbyCategoryId | null {
    return open === clicked ? null : clicked;
}

/** 子功能槽位 → 動作；空槽或沒展開回傳 null */
export function actionAt(open: LobbyCategoryId | null, slot: number): LobbyActionId | null {
    const category = LOBBY_CATEGORIES.find(c => c.id === open);
    return category?.items[slot]?.id ?? null;
}

/**
 * 玩家主城。人口與民心已改讀 GameSession 存檔值（PROG-2-9138）；
 * cityPopulation／cityMorale 只剩呼叫端沒給實際值時的退路與舊存檔人口補值的算法。
 */
export const PLAYER_HOME_CITY = {
    name: '新野',
    region: '荊州',
    faction: '蜀漢舊部',
    basePopulation: 80000,
    populationPerSeason: 1500,
    baseMorale: 60,
    /** 每 20 名聲 +1 民心，最多 +30 */
    fameMoraleStep: 20,
    fameMoraleCap: 30,
} as const;

export function cityPopulation(totalSeasonsElapsed: number): number {
    return PLAYER_HOME_CITY.basePopulation + Math.max(0, totalSeasonsElapsed) * PLAYER_HOME_CITY.populationPerSeason;
}

export function cityMorale(fame: number): number {
    const bonus = Math.min(PLAYER_HOME_CITY.fameMoraleCap, Math.floor(Math.max(0, fame) / PLAYER_HOME_CITY.fameMoraleStep));
    return Math.min(100, PLAYER_HOME_CITY.baseMorale + bonus);
}

export interface LobbyCityHubInput {
    readonly leadName: string | null;
    readonly officerRank: string;
    readonly gold: number;
    readonly gems: number;
    /** 家族銀兩（PROG-2-9593）：金＝國家公庫，銀兩＝家族；沒給顯示 0 */
    readonly silver?: number;
    readonly food: number;
    readonly cityTroops: number;
    readonly cityTroopsCap: number;
    readonly totalSeasonsElapsed: number;
    readonly fame: number;
    /** 實際人口與民心（GameSession，PROG-2-9138）；沒給時退回暫定推算值 */
    readonly population?: number;
    readonly morale?: number;
    readonly territoryCount: number;
    readonly rivals: RivalWorld;
    readonly openCategory: LobbyCategoryId | null;
    /** 子功能的動態文字（例如天下沙盤的開放狀態），沒給就用預設名稱 */
    readonly actionLabels?: Partial<Record<LobbyActionId, string>>;
    /** 類別按鈕的提示記號（例如學府修業進行中時培育類別加 ●），讓玩家一眼看到有未完成的事（PROG-2-9189） */
    readonly categoryBadges?: Partial<Record<LobbyCategoryId, string>>;
    /** 官職階位（PROG-2-9151）：沒給就不鎖任何按鈕；有給時未達門檻的子功能顯示「🔒名稱・X開放」 */
    readonly officerTier?: number;
}

export interface LobbyCityHubFlowView {
    readonly texts: Record<string, string>;
    readonly actives: Record<string, boolean>;
    readonly visibleSubCount: number;
}

/** 依目前分類的可見按鈕數計算 SubMenu 緊湊寬度，避免只有 2-4 個選項時右側留下空白底板 */
export function computeSubMenuWidth(visibleCount: number): number {
    const count = Math.max(0, Math.floor(visibleCount));
    if (count <= 0) return 192;
    return Math.min(900, Math.max(192, 16 + count * 160 + (count - 1) * 12 + 16));
}

/** SubMenu 內部版面常數：與 lobby-city-hub-main.json 的 BtnSub0..4 / SubMenuTitle 保持一致 */
export const SUB_MENU_PAD = 16;
export const SUB_MENU_BTN_W = 160;
export const SUB_MENU_BTN_GAP = 12;

export interface SubMenuLayout {
    /** 面板寬度（等同 computeSubMenuWidth） */
    readonly width: number;
    /** 每顆可見按鈕左緣相對面板左緣的距離（Widget.left） */
    readonly buttonLefts: readonly number[];
    /** 標題左右邊距（Widget.left / right） */
    readonly titleInset: number;
}

/**
 * 依可見按鈕數算出 SubMenu 內部每顆按鈕的位置。按鈕群寬度 = 面板寬 - 左右邊距，
 * 因此左右邊距對稱、間距一致；隱藏的按鈕不佔位（只回傳可見數量）。純函式，只在可見數量變動時呼叫。
 */
export function computeSubMenuLayout(visibleCount: number): SubMenuLayout {
    const count = Math.max(0, Math.floor(visibleCount));
    const buttonLefts: number[] = [];
    for (let i = 0; i < count; i++) buttonLefts.push(SUB_MENU_PAD + i * (SUB_MENU_BTN_W + SUB_MENU_BTN_GAP));
    return { width: computeSubMenuWidth(count), buttonLefts, titleInset: SUB_MENU_PAD };
}

function num(value: number): string {
    return Math.max(0, Math.floor(value)).toLocaleString('zh-TW');
}

/** 人口顯示：滿萬用「萬」，一位小數 */
export function populationText(population: number): string {
    return population >= 10000 ? `${(Math.floor(population / 1000) / 10).toString()} 萬` : num(population);
}

/** 天下勢力摘要：幾方勢力、同盟與交戰數 */
export function rivalSummaryText(rivals: RivalWorld): string {
    const allied = rivals.nations.filter(n => n.allied).length;
    const atWar = rivals.nations.filter(n => n.atWar).length;
    const hostile = rivals.nations.filter(n => {
        const tier = relationTier(n);
        return tier === 'hostile' || tier === 'nemesis';
    }).length;
    return `天下 ${rivals.nations.length} 方勢力\n${RELATION_TIER_LABEL.ally} ${allied}　${RELATION_TIER_LABEL.hostile} ${hostile}　交戰 ${atWar}`;
}

export function buildLobbyCityHubView(input: LobbyCityHubInput): LobbyCityHubFlowView {
    const texts: Record<string, string> = {
        lordFaction: PLAYER_HOME_CITY.faction,
        lordSub: `${input.officerRank || '白身'}　主將 ${input.leadName ?? '未定'}`,
        resGold: `金 ${num(input.gold)}`,
        resSilver: `銀 ${num(input.silver ?? 0)}`,
        resGem: `玉 ${num(input.gems)}`,
        resFood: `糧草 ${num(input.food)}`,
        resTroops: `兵 ${num(input.cityTroops)}`,
        cityName: PLAYER_HOME_CITY.name,
        cityRegion: `${PLAYER_HOME_CITY.region}・主城　領地 ${input.territoryCount}`,
        cityPopulation: `人口 ${populationText(input.population ?? cityPopulation(input.totalSeasonsElapsed))}`,
        cityMorale: `民心 ${input.morale ?? cityMorale(input.fame)}`,
        cityGarrison: `守軍 ${num(input.cityTroops)} / ${num(input.cityTroopsCap)}`,
        cityFaction: `陣營　${PLAYER_HOME_CITY.faction}`,
        cityRivals: rivalSummaryText(input.rivals),
    };
    const actives: Record<string, boolean> = { subMenu: input.openCategory !== null };
    const open = LOBBY_CATEGORIES.find(c => c.id === input.openCategory);
    texts.subMenuTitle = open ? open.label : '';
    let visibleSubCount = 0;
    for (let i = 0; i < LOBBY_SUB_SLOTS; i++) {
        const item = open?.items[i];
        actives[`btnSub${i}`] = !!item;
        if (item) visibleSubCount++;
        const name = item ? (input.actionLabels?.[item.id] ?? item.label) : '';
        const lock = item && input.officerTier !== undefined ? lobbyActionLock(item.id, input.officerTier) : null;
        texts[`sub${i}Label`] = lock?.locked ? lockedActionLabel(item!.label, lock) : name;
    }
    for (const c of LOBBY_CATEGORIES) {
        const badge = input.categoryBadges?.[c.id] ?? '';
        texts[`${categoryButtonId(c.id)}Label`] = c.id === input.openCategory ? `▲ ${c.label}${badge}` : `${c.label}${badge}`;
    }
    return { texts, actives, visibleSubCount };
}
