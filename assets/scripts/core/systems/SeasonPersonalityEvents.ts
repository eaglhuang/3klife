// @spec-source → 大廳季度推進時間發動機與武將性格事件狀態機規格書.md (doc_spec_1169) §二-2；PROG-2-2201（LOOP-01）
/**
 * SeasonPersonalityEvents — 換季時依武將性格抽 1~2 起自發事件，玩家二選一（純邏輯，不依賴 cc）。
 *
 * 事件池（規格 §二-2）：豪爽→軍中索酒、謀士→預修水利、戰狂→校場苦練、仁者→撫恤遺孤。
 * 性格判定沿用 offlinePersonalityOf（Brave／Wise／Loyal）；戰狂沒有對應的性格型別，用具名名將表（呂布、魏延）。
 * 貪玩（Playful）規格沒有事件，不會被抽中。
 *
 * 暫定（可逆，遊戲目前沒有對應系統）：
 * - 士氣、治安、步騎適性 +5 不結算，只寫在文案。
 * - 木材改扣等量銅錢；民心折成等量名聲；武力經驗每 10 點折 1 點武力（上限 100）。
 * - 好感用忠誠度（轉蛋名將忠誠鎖定 100，不變）。
 * - 沒回應的事件下一季換季時作廢，視同第二個選項（無影響）。
 * - 抽 2 起的機率 50%；同一季同一事件只出一次。
 *
 * Unity 對照：像一張 ScriptableObject 事件表，加上換季時呼叫一次的抽籤函式。
 */
import type { GeneralPersonalityType } from '../models/GeneralUnit';
import { offlinePersonalityOf, type OfflineBehaviorGeneral } from './OfflinePersonalityBehavior';

export type SeasonPersonalityEventId = 'FEAST_REQUEST' | 'LEVEE_REPAIR' | 'DRILL_TRAINING' | 'ORPHAN_RELIEF';
export type SeasonEventArchetype = 'Brave' | 'Wise' | 'Warlike' | 'Benevolent';

/** 選項效果；數量皆為正數，cost 由玩家付出 */
export interface SeasonEventEffect {
    costGold?: number;
    costFood?: number;
    loyalty?: number;
    fame?: number;
    strExp?: number;
    /** 本季農耕產出倍率 */
    farmMultiplier?: number;
    /** 本季免受天災（治理事件作廢） */
    disasterImmune?: boolean;
}

export interface SeasonEventOptionDef {
    label: string;
    effect: SeasonEventEffect;
    /** 效果說明（含暫不結算的項目） */
    note: string;
}

export interface SeasonPersonalityEventDef {
    id: SeasonPersonalityEventId;
    archetype: SeasonEventArchetype;
    title: string;
    /** {Name} 會換成武將名 */
    desc: string;
    options: readonly [SeasonEventOptionDef, SeasonEventOptionDef];
}

export const SEASON_PERSONALITY_TUNING = Object.freeze({
    minAge: 15,
    secondEventChance: 0.5,
    maxEvents: 2,
    strExpPerPoint: 10,
    strCap: 100,
    loyaltyMax: 100,
});

/** 戰狂／剛毅：性格型別沒有這一類，用具名名將表 */
export const WARLIKE_GENERAL_IDS: readonly string[] = Object.freeze(['lu-bu', 'wei-yan']);

const ARCHETYPE_OF_PERSONALITY: Readonly<Record<GeneralPersonalityType, SeasonEventArchetype | null>> = {
    Brave: 'Brave',
    Wise: 'Wise',
    Loyal: 'Benevolent',
    Playful: null,
};

export const SEASON_PERSONALITY_EVENTS: readonly SeasonPersonalityEventDef[] = Object.freeze([
    {
        id: 'FEAST_REQUEST', archetype: 'Brave', title: '軍中索酒',
        desc: '{Name}：「主公，操演方畢，弟兄們辛苦，可否撥款犒賞全軍？」',
        options: [
            { label: '撥款犒賞（銅錢 -50）', effect: { costGold: 50, loyalty: 10 }, note: '忠誠 +10（士氣 +15 暫不結算）' },
            { label: '嚴詞拒絕', effect: {}, note: '無影響（士氣 -5 暫不結算）' },
        ],
    },
    {
        id: 'LEVEE_REPAIR', archetype: 'Wise', title: '預修水利',
        desc: '{Name}：「臣夜觀星象，恐有水患，請修築堤防以保收成。」',
        options: [
            { label: '批准（銅錢 -100）', effect: { costGold: 100, farmMultiplier: 1.15, disasterImmune: true }, note: '本季免受天災，農耕產出 +15%' },
            { label: '暫緩', effect: {}, note: '無影響' },
        ],
    },
    {
        id: 'DRILL_TRAINING', archetype: 'Warlike', title: '校場苦練',
        desc: '{Name}：「在下筋骨發癢，自往校場閉門苦練十日！」',
        options: [
            { label: '親往校閱', effect: { strExp: 20 }, note: '武力經驗 +20（步騎適性 +5 暫不結算）' },
            { label: '由他自練', effect: { strExp: 10 }, note: '武力經驗 +10' },
        ],
    },
    {
        id: 'ORPHAN_RELIEF', archetype: 'Benevolent', title: '撫恤遺孤',
        desc: '{Name}：「臣巡視城鄉，見陣亡士卒家屬困苦，請開倉施粥。」',
        options: [
            { label: '撥糧施粥（糧草 -50）', effect: { costFood: 50, fame: 15 }, note: '民心 +15 折為名聲（治安 +10 暫不結算）' },
            { label: '庫存吃緊', effect: {}, note: '無影響' },
        ],
    },
]);

export interface SeasonEventInstance {
    eventId: SeasonPersonalityEventId;
    generalId: string;
    generalName: string;
}

/** 一季的事件紀錄：pending 待玩家回應；farmMultiplier／disasterImmune 是本季已批准的效果 */
export interface SeasonPersonalityState {
    season: number;
    pending: SeasonEventInstance[];
    farmMultiplier: number;
    disasterImmune: boolean;
}

export const EMPTY_SEASON_PERSONALITY_STATE: Readonly<SeasonPersonalityState> = Object.freeze({
    season: -1, pending: [], farmMultiplier: 1, disasterImmune: false,
});

export interface SeasonEventCandidate extends OfflineBehaviorGeneral {
    status?: string;
    isMentorCard?: boolean;
}

export function seasonEventDef(id: string): SeasonPersonalityEventDef | undefined {
    return SEASON_PERSONALITY_EVENTS.find((def) => def.id === id);
}

export function seasonEventArchetypeOf(general: SeasonEventCandidate): SeasonEventArchetype | null {
    if (WARLIKE_GENERAL_IDS.includes(general.id)) return 'Warlike';
    return ARCHETYPE_OF_PERSONALITY[offlinePersonalityOf(general)];
}

/** 換季抽事件：在役、成年、非教官卡、有對應事件的武將才可被抽；同一季同一事件只出一次 */
export function rollSeasonPersonalityEvents(
    generals: readonly SeasonEventCandidate[], season: number, random: () => number,
): SeasonPersonalityState {
    const pool = generals
        .filter((g) => g.status !== 'dead' && !g.isMentorCard && (g.age ?? SEASON_PERSONALITY_TUNING.minAge) >= SEASON_PERSONALITY_TUNING.minAge)
        .map((g) => ({ general: g, def: SEASON_PERSONALITY_EVENTS.find((d) => d.archetype === seasonEventArchetypeOf(g)) }))
        .filter((entry): entry is { general: SeasonEventCandidate; def: SeasonPersonalityEventDef } => entry.def !== undefined);
    const wanted = random() < SEASON_PERSONALITY_TUNING.secondEventChance ? SEASON_PERSONALITY_TUNING.maxEvents : 1;
    const pending: SeasonEventInstance[] = [];
    let candidates = pool;
    while (pending.length < wanted && candidates.length > 0) {
        const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
        const picked = candidates[index];
        pending.push({ eventId: picked.def.id, generalId: picked.general.id, generalName: picked.general.name ?? picked.general.id });
        candidates = candidates.filter((entry) => entry.def.id !== picked.def.id);
    }
    return { season, pending, farmMultiplier: 1, disasterImmune: false };
}

export function seasonEventDesc(instance: SeasonEventInstance): string {
    return (seasonEventDef(instance.eventId)?.desc ?? '').split('{Name}').join(instance.generalName);
}

/** 付不起時回傳缺的資源名；付得起回傳 null */
export function seasonEventShortfall(effect: SeasonEventEffect, stock: { gold: number; food: number }): string | null {
    if ((effect.costGold ?? 0) > stock.gold) return '銅錢';
    if ((effect.costFood ?? 0) > stock.food) return '糧草';
    return null;
}

/** 武力經驗折武力點數（每 10 點經驗 1 點，上限 100）；回傳新武力 */
export function strAfterExp(str: number, strExp: number): number {
    const gain = Math.floor(Math.max(0, strExp) / SEASON_PERSONALITY_TUNING.strExpPerPoint);
    return Math.max(str, Math.min(SEASON_PERSONALITY_TUNING.strCap, str + gain));
}

/** 本季已批准效果的農耕倍率；其他季為 1 */
export function seasonEventFarmMultiplier(state: Readonly<SeasonPersonalityState>, taskId: string, season: number): number {
    return state.season === season && taskId === 'farming' ? state.farmMultiplier : 1;
}

/** 讀檔：壞資料與未知事件丟掉；舊存檔沒有此欄時為空狀態 */
export function normalizeSeasonPersonalityState(raw: unknown): SeasonPersonalityState {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_SEASON_PERSONALITY_STATE, pending: [] };
    const r = raw as Record<string, unknown>;
    const season = typeof r.season === 'number' && Number.isInteger(r.season) ? r.season : -1;
    const pending: SeasonEventInstance[] = [];
    for (const entry of Array.isArray(r.pending) ? r.pending : []) {
        const e = entry as Partial<SeasonEventInstance> | null;
        if (!e || typeof e.eventId !== 'string' || !seasonEventDef(e.eventId) || typeof e.generalId !== 'string') continue;
        pending.push({ eventId: e.eventId, generalId: e.generalId, generalName: typeof e.generalName === 'string' ? e.generalName : e.generalId });
    }
    const farm = typeof r.farmMultiplier === 'number' && Number.isFinite(r.farmMultiplier) && r.farmMultiplier > 0 ? r.farmMultiplier : 1;
    return { season, pending, farmMultiplier: farm, disasterImmune: r.disasterImmune === true };
}
