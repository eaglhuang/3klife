// @spec-source → 留存系統.md §K「7天玩家體驗歷程設計」關鍵留存觸發點；PROG-2-1443（RET-12）
/**
 * SevenDayJourney — 新玩家前 7 天的關鍵留存觸發點（純邏輯，不依賴 cc）。
 *
 * - 第 1 天＝首次登入當天（UTC+8 切日），之後每個登入日加 1，第 8 天起歷程結束。
 * - 觸發點是「里程碑」：在歷程第 N 天以後的第一次登入，若事實成立且尚未觸發過，就寫一則 SYSTEM 日誌。
 *   所以中間漏登也不會漏掉，只是會晚一點出現；每個觸發點只會寫一次（firedIds 記錄）。
 * - 雙軌：每個觸發點列出適用軌道。目前四個關鍵觸發點兩軌共用；課長軌的專屬內容待企劃，之後只改表。
 * - 軌道判定規則（無課／課長）規格未定義，呼叫端先用 DEFAULT_JOURNEY_TRACK（暫定：無課）。
 *
 * 暫定：觸發點文案、日誌優先度；Day 2 子嗣事實用「有子嗣誕生」，Day 7 三代用「子嗣的父母是另一位子嗣」。
 *
 * Unity 對照：像 Timeline 的 Marker 表，依遊戲日數推進，每個 Marker 只播一次（用 firedIds 當播過旗標）。
 */
import type { BreedingBirthRecord } from './BreedingBirthRecord';

export const SEVEN_DAY_JOURNEY_LENGTH = 7;
export const SEVEN_DAY_JOURNAL_PRIORITY = 60;

export const JOURNEY_TRACKS = ['NO_CLASS', 'LEADER'] as const;
export type JourneyTrack = typeof JOURNEY_TRACKS[number];
export const DEFAULT_JOURNEY_TRACK: JourneyTrack = 'NO_CLASS';

/** 觸發點需要的事實；由呼叫端（GameSession）在登入時算出來 */
export const JOURNEY_FACTS = ['DAILY_NEWS', 'CHILD_BORN', 'DAQI_BORN', 'THREE_GENERATION'] as const;
export type JourneyFact = typeof JOURNEY_FACTS[number];
export type JourneyFacts = Readonly<Record<JourneyFact, boolean>>;

export interface JourneyTrigger {
    id: string;
    /** 歷程第幾天起可觸發（含當天） */
    day: number;
    fact: JourneyFact;
    tracks: readonly JourneyTrack[];
    summary: string;
}

/** 觸發點配置（規格 §K 關鍵留存觸發點）；改數值只改這張表 */
export const SEVEN_DAY_TRIGGERS: readonly JourneyTrigger[] = [
    { id: 'DAY1_DAILY_NEWS', day: 1, fact: 'DAILY_NEWS', tracks: JOURNEY_TRACKS, summary: '三國日報首次生成，今晚的報紙記下了你的第一天。' },
    { id: 'DAY2_CHILD_BORN', day: 2, fact: 'CHILD_BORN', tracks: JOURNEY_TRACKS, summary: '子嗣誕生，天象異變，府中眾人都說這孩子不凡。' },
    { id: 'DAY4_DAQI', day: 4, fact: 'DAQI_BORN', tracks: JOURNEY_TRACKS, summary: '名士為天才子嗣寫下批語：「此子晚成，必有大器。」' },
    { id: 'DAY7_THREE_GENERATION', day: 7, fact: 'THREE_GENERATION', tracks: JOURNEY_TRACKS, summary: '血統樹已長出三代，百年世家的藍圖初現。' },
];

export interface SevenDayJourneyState {
    /** 首次登入日（YYYY-MM-DD，UTC+8）；尚未登入過為 null */
    firstLoginDay: string | null;
    /** 已觸發過的觸發點 id */
    firedIds: string[];
}

export function createSevenDayJourneyState(): SevenDayJourneyState {
    return { firstLoginDay: null, firedIds: [] };
}

const DAY_MS = 86_400_000;
const LOGIN_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 歷程第幾天（從 1 起算）；第 8 天起或日期早於首次登入回傳 null */
export function journeyDayOf(firstLoginDay: string, today: string): number | null {
    const diff = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${firstLoginDay}T00:00:00Z`)) / DAY_MS);
    return diff >= 0 && diff < SEVEN_DAY_JOURNEY_LENGTH ? diff + 1 : null;
}

/**
 * 登入時推進歷程：回傳新狀態與本次新觸發的點（呼叫端負責寫日誌）。
 * 不改傳入的狀態。
 */
export function advanceSevenDayJourney(
    state: Readonly<SevenDayJourneyState>,
    today: string,
    facts: JourneyFacts,
    track: JourneyTrack = DEFAULT_JOURNEY_TRACK,
): { state: SevenDayJourneyState; fired: JourneyTrigger[] } {
    const firstLoginDay = state.firstLoginDay ?? today;
    const next: SevenDayJourneyState = { firstLoginDay, firedIds: [...state.firedIds] };
    const day = journeyDayOf(firstLoginDay, today);
    if (day === null) return { state: next, fired: [] };
    const fired = SEVEN_DAY_TRIGGERS.filter((t) => (
        day >= t.day && t.tracks.includes(track) && facts[t.fact] && !next.firedIds.includes(t.id)
    ));
    for (const trigger of fired) next.firedIds.push(trigger.id);
    return { state: next, fired };
}

/** 從子嗣出生紀錄算出三個事實；三代＝某子嗣的父或母，是另一筆出生紀錄的子嗣。 */
export function journeyFactsOf(records: readonly BreedingBirthRecord[]): Omit<JourneyFacts, 'DAILY_NEWS'> {
    const childIds = new Set(records.map((r) => r.child.UID));
    return {
        CHILD_BORN: records.length > 0,
        DAQI_BORN: records.some((r) => r.child.Is_Daqi),
        THREE_GENERATION: records.some((r) => childIds.has(r.child.Father_ID) || childIds.has(r.child.Mother_ID)),
    };
}

/** 讀檔正規化：首次登入日不合格視為未登入；firedIds 只留已知觸發點、去重。 */
export function normalizeSevenDayJourney(raw: unknown): SevenDayJourneyState {
    if (!raw || typeof raw !== 'object') return createSevenDayJourneyState();
    const value = raw as Partial<SevenDayJourneyState>;
    const firstLoginDay = typeof value.firstLoginDay === 'string' && LOGIN_DAY_PATTERN.test(value.firstLoginDay)
        ? value.firstLoginDay
        : null;
    const known = new Set(SEVEN_DAY_TRIGGERS.map((t) => t.id));
    const firedIds = Array.isArray(value.firedIds)
        ? Array.from(new Set(value.firedIds.filter((id): id is string => typeof id === 'string' && known.has(id))))
        : [];
    return { firstLoginDay, firedIds };
}
