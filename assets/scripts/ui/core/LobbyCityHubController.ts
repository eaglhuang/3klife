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

export type LobbyCategoryId = 'sortie' | 'generals' | 'domestic' | 'nurture' | 'shop';

export type LobbyActionId =
    | 'battle' | 'rival' | 'floodBattle'
    | 'generalList' | 'mercenary' | 'bonding' | 'jobChange' | 'spiritCodex'
    | 'domestic' | 'recruitHall' | 'hallBoard' | 'sandtable' | 'governorHall'
    | 'nurture' | 'supportCard'
    | 'gacha' | 'shop' | 'warehouse';

export interface LobbyCategoryDef {
    readonly id: LobbyCategoryId;
    readonly label: string;
    readonly items: readonly { readonly id: LobbyActionId; readonly label: string }[];
}

export const LOBBY_CATEGORIES: readonly LobbyCategoryDef[] = [
    { id: 'sortie', label: '出征', items: [{ id: 'battle', label: '戰場' }, { id: 'rival', label: '外交・征伐' }, { id: 'floodBattle', label: '洪戰' }] },
    { id: 'generals', label: '武將', items: [{ id: 'generalList', label: '武將名冊' }, { id: 'mercenary', label: '傭兵結義' }, { id: 'bonding', label: '結緣' }, { id: 'jobChange', label: '成人禮' }, { id: 'spiritCodex', label: '英靈' }] },
    { id: 'domestic', label: '內政', items: [{ id: 'domestic', label: '內政' }, { id: 'recruitHall', label: '招賢館' }, { id: 'hallBoard', label: '任務牆' }, { id: 'sandtable', label: '天下沙盤' }, { id: 'governorHall', label: '太守府' }] },
    { id: 'nurture', label: '培育', items: [{ id: 'nurture', label: '開獎・培育' }, { id: 'supportCard', label: '支援卡' }] },
    { id: 'shop', label: '商城', items: [{ id: 'gacha', label: '轉蛋' }, { id: 'shop', label: '商店' }, { id: 'warehouse', label: '倉庫' }] },
];

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
 * 玩家主城。暫定：治理系統尚未存城市人口與民心，先以主城基數推算；
 * 接上治理存檔後改讀真值。
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
    readonly food: number;
    readonly cityTroops: number;
    readonly cityTroopsCap: number;
    readonly totalSeasonsElapsed: number;
    readonly fame: number;
    readonly territoryCount: number;
    readonly rivals: RivalWorld;
    readonly openCategory: LobbyCategoryId | null;
    /** 子功能的動態文字（例如天下沙盤的開放狀態），沒給就用預設名稱 */
    readonly actionLabels?: Partial<Record<LobbyActionId, string>>;
}

export interface LobbyCityHubFlowView {
    readonly texts: Record<string, string>;
    readonly actives: Record<string, boolean>;
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
        resGem: `玉 ${num(input.gems)}`,
        resFood: `糧 ${num(input.food)}`,
        resTroops: `兵 ${num(input.cityTroops)}`,
        cityName: PLAYER_HOME_CITY.name,
        cityRegion: `${PLAYER_HOME_CITY.region}・主城　領地 ${input.territoryCount}`,
        cityPopulation: `人口 ${populationText(cityPopulation(input.totalSeasonsElapsed))}`,
        cityMorale: `民心 ${cityMorale(input.fame)}`,
        cityGarrison: `守軍 ${num(input.cityTroops)} / ${num(input.cityTroopsCap)}`,
        cityFaction: `陣營　${PLAYER_HOME_CITY.faction}`,
        cityRivals: rivalSummaryText(input.rivals),
    };
    const actives: Record<string, boolean> = { subMenu: input.openCategory !== null };
    const open = LOBBY_CATEGORIES.find(c => c.id === input.openCategory);
    texts.subMenuTitle = open ? open.label : '';
    for (let i = 0; i < LOBBY_SUB_SLOTS; i++) {
        const item = open?.items[i];
        actives[`btnSub${i}`] = !!item;
        texts[`sub${i}Label`] = item ? (input.actionLabels?.[item.id] ?? item.label) : '';
    }
    for (const c of LOBBY_CATEGORIES) {
        texts[`${categoryButtonId(c.id)}Label`] = c.id === input.openCategory ? `▲ ${c.label}` : c.label;
    }
    return { texts, actives };
}
