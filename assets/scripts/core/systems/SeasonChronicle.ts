// @spec-source → 三國季報動態合成與市井奇遇微抉擇狀態機規格書.md (doc_spec_1171)；PROG-2-2203（LOOP-03）
/**
 * SeasonChronicle — 《三國季報》合成與市井奇遇微抉擇（純邏輯，不依賴 cc）。
 *
 * 換季時合成一份季報（規格 §二）：
 * - 天下大勢 1 則：從未滅亡、領地最多的前三個勢力隨機挑一個，套該勢力的動態文案。
 * - 世家風雲 1~2 則：名冊在役成年武將挑兩位（不足就一位），具名名將用專屬軼事，其餘依性格套模板。
 * - 市井奇遇 1 則：四選一（胡商、鐵匠、醫者、道人），二選一，當季只能抉擇一次，結果寫入存檔。
 *
 * 彈窗時機（規格 §三-2）：只在換季與真實換日首登時開；戰後回大廳一律不開（chronicleShouldOpen）。
 * 紅點（規格 §三-1）：季報開過一次即標記已讀。
 *
 * 暫定（可逆，遊戲目前沒有對應系統）：
 * - 西域良駒沒有馬匹裝備，直接把主將騎兵適性升一階（無適性時視為 C）；不放進背包。
 * - 淬火重劍直接加主將武力 +3（上限 100），不做成裝備。
 * - 「老將」暫定 50 歲以上；家族氣運不結算，只寫在文案。
 * - 沒有主將時用名冊第一位在役武將；名冊空時良駒、重劍照扣資源但沒有對象，所以改判付不起（'no-target'）。
 *
 * Unity 對照：像三張 ScriptableObject 文案表，加上換季時呼叫一次的合成函式。
 */
import { offlinePersonalityOf, type OfflineBehaviorGeneral } from './OfflinePersonalityBehavior';
import { resolveMaxLifespan } from './GeneralAging';
import type { GeneralPersonalityType } from '../models/GeneralUnit';

export type CityEncounterId = 'HU_MERCHANT' | 'BLACKSMITH' | 'ROAD_DOCTOR' | 'TAOIST';

/** 選項效果；cost 為玩家付出，皆為正數 */
export interface CityEncounterEffect {
    costGold?: number;
    costFood?: number;
    costWood?: number;
    /** 主將騎兵適性提升階數 */
    leadCavalryGrades?: number;
    /** 主將武力 */
    leadStr?: number;
    /** 全名冊精力上限 */
    maxVitality?: number;
    /** 老將壽命上限（歲） */
    elderLifespan?: number;
    fame?: number;
}

export interface CityEncounterOptionDef {
    label: string;
    effect: CityEncounterEffect;
    note: string;
}

export interface CityEncounterDef {
    id: CityEncounterId;
    title: string;
    desc: string;
    options: readonly [CityEncounterOptionDef, CityEncounterOptionDef];
}

export const SEASON_CHRONICLE_TUNING = Object.freeze({
    trendTopNations: 3,
    gossipCount: 2,
    minAge: 15,
    elderAge: 50,
    strCap: 100,
});

const NOTHING = '無事發生';

export const CITY_ENCOUNTERS: readonly CityEncounterDef[] = Object.freeze([
    {
        id: 'HU_MERCHANT', title: '西域胡商',
        desc: '西域胡商牽引一匹汗血寶馬進城，馬蹄如雷，索要重金。',
        options: [
            { label: '重金購買', effect: { costGold: 100, leadCavalryGrades: 1 }, note: '消耗 100 銅錢，主將騎兵適性升一階' },
            { label: '婉言謝絕', effect: {}, note: NOTHING },
        ],
    },
    {
        id: 'BLACKSMITH', title: '落魄鐵匠',
        desc: '落魄鐵匠自稱歐冶子後裔，攜半截古劍登門，請求資助重鑄。',
        options: [
            { label: '出資重鑄', effect: { costGold: 50, costWood: 50, leadStr: 3 }, note: '消耗 50 銅錢、50 木材，主將武力 +3' },
            { label: '打發離去', effect: {}, note: NOTHING },
        ],
    },
    {
        id: 'ROAD_DOCTOR', title: '古道逢醫',
        desc: '行腳醫者背負藥囊路過，願為府中老將調治舊傷。',
        options: [
            { label: '延請入府', effect: { costFood: 30, maxVitality: 5, elderLifespan: 1 }, note: '消耗 30 糧草，全軍精力上限 +5，老將壽命 +1 歲' },
            { label: '禮貌辭退', effect: {}, note: NOTHING },
        ],
    },
    {
        id: 'TAOIST', title: '避世道人',
        desc: '終南山道者過府，願指點府中風水陰陽。',
        options: [
            { label: '奉茶請教', effect: { costGold: 20, fame: 30 }, note: '消耗 20 銅錢，世家聲望 +30，家族氣運提升' },
            { label: '斥為荒謬', effect: {}, note: NOTHING },
        ],
    },
]);

/** 天下大勢：依勢力 id 對應的動態文案（規格 §二-1 的三則再補其餘勢力） */
export const WORLD_TRENDS: Readonly<Record<string, string>> = Object.freeze({
    wei: '曹操於許昌厲兵秣馬，廣發招賢令，中原豪傑景從。',
    shu: '劉備率部暫駐新野，秋毫不犯，江夏民望歸心。',
    wu: '孫策橫掃江東六郡，所向披靡，江東士庶皆呼小霸王。',
    lvbu: '呂布據守下邳，赤兔嘶風，四方諸侯聞之皆心生忌憚。',
    yuan: '袁紹坐擁河北四州，帳下謀士如雲，兵鋒直指黃河。',
    liuzhang: '劉璋閉關自守益州，蜀道艱險，巴蜀一隅暫享太平。',
    mateng: '馬騰縱橫西涼，鐵騎捲起漫天黃沙，羌胡皆聽號令。',
    nanman: '孟獲聚眾南中，藤甲蠻兵出沒瘴林，邊郡告急。',
});
export const WORLD_TREND_FALLBACK = '天下紛擾，群雄並起，各路諸侯皆在靜待時變。';

/** 世家風雲：具名名將的專屬軼事（規格 §二-2） */
export const NAMED_GOSSIP: Readonly<Record<string, string>> = Object.freeze({
    'zhang-fei': '三將軍昨夜在酒肆豪飲，與市井壯士角力，連震碎三張石几，圍觀者無不讚嘆。',
    'zhuge-liang': '軍師於清溪畔推演八陣圖，夜引流螢入帳，百姓傳言有仙人之姿。',
    'mi-furen': '夫人親督府內織造錦緞，分賜傷殘士卒家室，全城皆贊主公有賢內助。',
});

/** 世家風雲：依性格的軼事模板，{Name} 換成武將名 */
export const PERSONALITY_GOSSIP: Readonly<Record<GeneralPersonalityType, readonly string[]>> = Object.freeze({
    Loyal: ['{Name}每日黎明即起巡視城防，城中百姓見之，皆言主公得一忠臣。', '{Name}將俸祿分予陣亡袍澤遺孤，府中上下無不動容。'],
    Brave: ['{Name}於校場獨力舉起千斤石鼎，軍中士卒齊聲喝采。', '{Name}夜出城郊獵得猛虎一頭，扛回城門，滿城轟動。'],
    Wise: ['{Name}閉門研讀兵書三日，出關時已將沙盤推演得滴水不漏。', '{Name}與城中名士對弈論道，一局終了，對手拱手稱服。'],
    Playful: ['{Name}偷溜出府逛廟會，抱回一隻會學舌的鸚鵡，府中笑成一片。', '{Name}在後院設宴猜拳行令，輸了便扮丑角逗樂眾人。'],
});

export interface ChronicleNation {
    readonly id: string;
    readonly territories: number;
    readonly fallen?: boolean;
}

export type ChronicleGeneral = OfflineBehaviorGeneral & {
    readonly status?: string;
    readonly age?: number;
    readonly isMentorCard?: boolean;
};

export interface SeasonChronicleState {
    /** 季報所屬季（totalSeasonsElapsed）；-1 表示尚未產生 */
    season: number;
    trend: string;
    gossip: string[];
    encounterId: CityEncounterId | null;
    /** 已抉擇的選項；null 表示尚未抉擇 */
    encounterChoice: 0 | 1 | null;
    /** 季報介面已打開過一次（紅點熄滅） */
    read: boolean;
}

export const EMPTY_SEASON_CHRONICLE: Readonly<SeasonChronicleState> = Object.freeze({
    season: -1, trend: '', gossip: [], encounterId: null, encounterChoice: null, read: true,
});

export function copySeasonChronicle(state: Readonly<SeasonChronicleState>): SeasonChronicleState {
    return { ...state, gossip: [...state.gossip] };
}

export function cityEncounterDef(id: CityEncounterId | null | undefined): CityEncounterDef | undefined {
    return id ? CITY_ENCOUNTERS.find((d) => d.id === id) : undefined;
}

function pickIndex(length: number, random: () => number): number {
    return Math.min(length - 1, Math.max(0, Math.floor(random() * length)));
}

export function worldTrendOf(nations: readonly ChronicleNation[], random: () => number): string {
    const alive = nations
        .filter((n) => !n.fallen && n.territories > 0 && WORLD_TRENDS[n.id] !== undefined)
        .slice()
        .sort((a, b) => b.territories - a.territories)
        .slice(0, SEASON_CHRONICLE_TUNING.trendTopNations);
    if (alive.length === 0) return WORLD_TREND_FALLBACK;
    return WORLD_TRENDS[alive[pickIndex(alive.length, random)].id];
}

export function gossipLineOf(general: ChronicleGeneral, random: () => number): string {
    const named = Object.prototype.hasOwnProperty.call(NAMED_GOSSIP, general.id) ? NAMED_GOSSIP[general.id] : undefined;
    if (named) return named;
    const templates = PERSONALITY_GOSSIP[offlinePersonalityOf(general)];
    return templates[pickIndex(templates.length, random)].split('{Name}').join(general.name ?? general.id);
}

/** 合成季報；同一季不重複的兩位武將，不足時一位，名冊空時沒有世家風雲 */
export function synthesizeSeasonChronicle(
    input: { season: number; nations: readonly ChronicleNation[]; generals: readonly ChronicleGeneral[] }, random: () => number,
): SeasonChronicleState {
    const trend = worldTrendOf(input.nations, random);
    let pool = input.generals.filter((g) => g.status !== 'dead' && !g.isMentorCard && (g.age ?? SEASON_CHRONICLE_TUNING.minAge) >= SEASON_CHRONICLE_TUNING.minAge);
    const gossip: string[] = [];
    while (gossip.length < SEASON_CHRONICLE_TUNING.gossipCount && pool.length > 0) {
        const picked = pool[pickIndex(pool.length, random)];
        gossip.push(gossipLineOf(picked, random));
        pool = pool.filter((g) => g.id !== picked.id);
    }
    const encounter = CITY_ENCOUNTERS[pickIndex(CITY_ENCOUNTERS.length, random)];
    return { season: input.season, trend, gossip, encounterId: encounter.id, encounterChoice: null, read: false };
}

export type ChronicleTrigger = 'season-advance' | 'daily-first-login' | 'battle-return' | 'lobby-enter';

/**
 * 該不該自動彈出季報（規格 §三-2）：戰後回大廳與一般進大廳一律不彈；
 * 換季時本季季報就彈；換日首登時本季季報還沒看或奇遇還沒抉擇才彈。
 */
export function chronicleShouldOpen(state: Readonly<SeasonChronicleState>, currentSeason: number, trigger: ChronicleTrigger): boolean {
    if (state.season !== currentSeason || state.season < 0) return false;
    if (trigger === 'season-advance') return true;
    if (trigger === 'daily-first-login') return !state.read || (state.encounterId !== null && state.encounterChoice === null);
    return false;
}

/** 付不起時回傳缺少的資源名稱，付得起回傳 null */
export function cityEncounterShortfall(effect: CityEncounterEffect, stock: { gold: number; food: number; wood: number }): string | null {
    if ((effect.costGold ?? 0) > stock.gold) return '銅錢';
    if ((effect.costWood ?? 0) > stock.wood) return '木材';
    if ((effect.costFood ?? 0) > stock.food) return '糧草';
    return null;
}

const APTITUDE_RANK = ['S', 'A', 'B', 'C', 'D'];

/** 適性升階（S 為頂）；不認得或缺值時視為 C */
export function raiseAptitudeGrade(grade: string | undefined, steps: number): string {
    const index = APTITUDE_RANK.indexOf(String(grade ?? 'C').toUpperCase());
    const from = index < 0 ? APTITUDE_RANK.indexOf('C') : index;
    return APTITUDE_RANK[Math.max(0, from - Math.max(0, steps))];
}

/** 效果需要主將時，沒有對象就不成立 */
export function cityEncounterNeedsLead(effect: CityEncounterEffect): boolean {
    return (effect.leadCavalryGrades ?? 0) > 0 || (effect.leadStr ?? 0) > 0;
}

export interface EncounterRosterGeneral {
    id: string;
    str?: number;
    age?: number;
    status?: string;
    maxLifespan?: number;
    maxVitality?: number;
    redGeneLevel?: number;
    troopAptitude?: Record<string, string>;
}

/** 把奇遇效果套到名冊（只回傳新陣列，不改原物件）；陣亡者不受影響 */
export function applyEncounterToRoster<T extends EncounterRosterGeneral>(
    generals: readonly T[], leadId: string | null, effect: CityEncounterEffect, vitalityMaxOf: (general: T) => number,
): T[] {
    return generals.map((g) => {
        if (g.status === 'dead') return g;
        let next: T = g;
        if (g.id === leadId && (effect.leadCavalryGrades ?? 0) > 0) {
            const aptitude = { ...(g.troopAptitude ?? {}) };
            aptitude.CAVALRY = raiseAptitudeGrade(aptitude.CAVALRY, effect.leadCavalryGrades ?? 0);
            next = { ...next, troopAptitude: aptitude };
        }
        if (g.id === leadId && (effect.leadStr ?? 0) > 0) {
            next = { ...next, str: Math.min(SEASON_CHRONICLE_TUNING.strCap, (g.str ?? 0) + (effect.leadStr ?? 0)) };
        }
        if ((effect.maxVitality ?? 0) > 0) next = { ...next, maxVitality: vitalityMaxOf(g) + (effect.maxVitality ?? 0) };
        if ((effect.elderLifespan ?? 0) > 0 && (g.age ?? 0) >= SEASON_CHRONICLE_TUNING.elderAge) {
            next = { ...next, maxLifespan: (typeof g.maxLifespan === 'number' ? g.maxLifespan : resolveMaxLifespan(g as unknown as Parameters<typeof resolveMaxLifespan>[0])) + (effect.elderLifespan ?? 0) };
        }
        return next;
    });
}

export function normalizeSeasonChronicle(value: unknown): SeasonChronicleState {
    if (!value || typeof value !== 'object') return copySeasonChronicle(EMPTY_SEASON_CHRONICLE);
    const v = value as Partial<SeasonChronicleState>;
    const season = typeof v.season === 'number' && Number.isFinite(v.season) ? Math.floor(v.season) : -1;
    if (season < 0) return copySeasonChronicle(EMPTY_SEASON_CHRONICLE);
    const encounterId = cityEncounterDef(v.encounterId as CityEncounterId)?.id ?? null;
    const choice = v.encounterChoice === 0 || v.encounterChoice === 1 ? v.encounterChoice : null;
    return {
        season,
        trend: typeof v.trend === 'string' && v.trend.length > 0 ? v.trend : WORLD_TREND_FALLBACK,
        gossip: Array.isArray(v.gossip) ? v.gossip.filter((line): line is string => typeof line === 'string' && line.length > 0) : [],
        encounterId,
        encounterChoice: encounterId ? choice : null,
        read: v.read === true,
    };
}

/** 歷史卷軸最多保留的季數（PROG-2-2206，暫定 12 季＝3 年） */
export const CHRONICLE_ARCHIVE_LIMIT = 12;

/**
 * 新一季季報產生前，把上一季收進歷史卷軸（doc_spec_1171 狀態機「存入存檔與歷史卷軸」，PROG-2-2206）。
 * 新的在前；同季不重複；尚未產生（season < 0）或與新季同季時不收；超過上限捨棄最舊的。
 */
export function archiveSeasonChronicle(
    archive: readonly SeasonChronicleState[],
    previous: Readonly<SeasonChronicleState>,
    nextSeason: number,
): SeasonChronicleState[] {
    const kept = archive.map(copySeasonChronicle);
    if (previous.season < 0 || previous.season === nextSeason) return kept;
    const entry = { ...copySeasonChronicle(previous), read: true };
    return [entry, ...kept.filter((e) => e.season !== previous.season)]
        .sort((a, b) => b.season - a.season)
        .slice(0, CHRONICLE_ARCHIVE_LIMIT);
}

/** 讀檔正規化：濾掉壞資料與重複季，新的在前，最多 CHRONICLE_ARCHIVE_LIMIT 季 */
export function normalizeChronicleArchive(value: unknown): SeasonChronicleState[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<number>();
    const entries: SeasonChronicleState[] = [];
    for (const raw of value) {
        const entry = normalizeSeasonChronicle(raw);
        if (entry.season < 0 || seen.has(entry.season)) continue;
        seen.add(entry.season);
        entries.push({ ...entry, read: true });
    }
    return entries.sort((a, b) => b.season - a.season).slice(0, CHRONICLE_ARCHIVE_LIMIT);
}
