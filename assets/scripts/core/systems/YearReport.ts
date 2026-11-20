// @spec-source → 遊戲時間系統.md §E 功能 4「年終結算（P1）：每 4 季觸發年報」、§G 劇本「年終：一年將盡，回首今年…＋年報畫面」；WBS v8 TIME-07
/**
 * YearReport — 年終年報的資料與文字（純邏輯，不依賴 cc）
 *
 * 規格只寫「每 4 季觸發年報」與年報畫面，沒有列出年報欄位。
 * 暫定（可逆）：年報只統計能從每季老化事件推出的數字：本年歿、本年屆齡退役候選、季數。
 * 不含勝場：目前沒有逐年的戰績紀錄，要等戰績按年切分後再加。
 *
 * Unity 對照：像一個 Presenter 的資料層，把一年的事件計數好，畫面只把 lines 寫進 Label。
 */
import type { AgingEvent, AgingEventType } from './GeneralAging';
import { SEASONS_PER_YEAR } from './GameClock';

export interface YearReport {
    readonly year: number;
    readonly seasons: number;
    readonly deaths: number;
    readonly retirementCandidates: number;
    /** 年末仍適婚未結緣的武將名字（PROG-2-9173）；舊資料沒有這欄時視為空 */
    readonly unwedNames?: readonly string[];
    /** 今年年終守城的結果（PROG-2-9431：守城 → 年報 → 換年，年報要反映守城結果）；今年沒打為 undefined */
    readonly defense?: YearEndDefenseResult;
}

/** 年終守城結果：哪一年、勝敗、民心與人口變動（存於 resources.yearEndDefenseResult） */
export interface YearEndDefenseResult {
    readonly year: number;
    readonly outcome: 'victory' | 'defeat' | 'rout' | 'draw';
    readonly moraleDelta: number;
    readonly populationLost: number;
}

const DEFENSE_OUTCOMES: readonly YearEndDefenseResult['outcome'][] = ['victory', 'defeat', 'rout', 'draw'];

/** 讀檔還原年終守城結果；壞值回 null */
export function normalizeYearEndDefenseResult(raw: unknown): YearEndDefenseResult | null {
    if (!raw || typeof raw !== 'object') return null;
    const src = raw as Partial<Record<keyof YearEndDefenseResult, unknown>>;
    const int = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
    const year = int(src.year);
    if (year === null || year <= 0 || !DEFENSE_OUTCOMES.includes(src.outcome as YearEndDefenseResult['outcome'])) return null;
    return { year, outcome: src.outcome as YearEndDefenseResult['outcome'], moraleDelta: int(src.moraleDelta) ?? 0, populationLost: Math.max(0, int(src.populationLost) ?? 0) };
}

/** 這一季結束後是否為年末（第 4 季結束時觸發年報） */
const AGING_EVENT_TYPES: readonly AgingEventType[] = ['reached-retirement-age', 'died', 'entered-growth-stage'];

/**
 * 讀檔時還原本年累積的老化事件（PROG-2-0815）。
 * 舊存檔沒有這個欄位時回傳空陣列；壞掉的項目直接丟棄，不讓年報算錯。
 */
export function normalizeYearAgingEvents(raw: unknown): AgingEvent[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item): AgingEvent[] => {
        if (!item || typeof item !== 'object') return [];
        const event = item as Partial<AgingEvent>;
        if (typeof event.generalId !== 'string' || typeof event.age !== 'number' || !Number.isFinite(event.age)) return [];
        if (!AGING_EVENT_TYPES.includes(event.type as AgingEventType)) return [];
        return [{ type: event.type as AgingEventType, generalId: event.generalId, age: event.age, ...(event.stage ? { stage: event.stage } : {}) }];
    });
}

export function isYearEndSeason(season: number): boolean {
    return season === SEASONS_PER_YEAR;
}

/** 從一年內的老化事件計數出年報（事件可含多季，重複事件以事件數計） */
export function buildYearReport(year: number, events: readonly AgingEvent[], unwedNames: readonly string[] = [], defense: YearEndDefenseResult | null = null): YearReport {
    let deaths = 0;
    let retirementCandidates = 0;
    for (const event of events) {
        if (event.type === 'died') deaths++;
        else if (event.type === 'reached-retirement-age') retirementCandidates++;
    }
    return { year, seasons: SEASONS_PER_YEAR, deaths, retirementCandidates, unwedNames: [...unwedNames], ...(defense && defense.year === year ? { defense: { ...defense } } : {}) };
}

export type YearReportTextLookup = (key: string, ...args: string[]) => string;

/** 年報文字的 zh-TW 預設；與 resources/i18n/zh-TW.json 的 ui.year_report.* 同步（測試會比對） */
export const YEAR_REPORT_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.year_report.title': '第 {0} 年總結',
    'ui.year_report.intro': '一年將盡，回首今年……',
    'ui.year_report.deaths': '本年歿：{0} 人',
    'ui.year_report.retirements': '本年屆齡退役候選：{0} 人',
    'ui.year_report.unwed': '本年適婚未結緣：{0} 人（{1}）媒人快登門啦～',
    'ui.year_report.unwed_none': '本年適婚未結緣：0 人，個個名花有主，媒人都閒到打瞌睡了',
    'ui.year_report.close': '關閉',
    'ui.year_report.defense_victory': '年終守城：守住城寨，民心 {0}',
    'ui.year_report.defense_defeat': '年終守城：城寨失守，民心 {0}',
    'ui.year_report.defense_rout': '年終守城：大敗，民心 {0}、人口 −{1}',
    'ui.year_report.defense_draw': '年終守城：雙方罷兵',
};

function signed(value: number): string {
    return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '±0';
}

/** 年報守城結果那一行（PROG-2-9431）；今年沒打回空字串 */
export function buildDefenseLine(defense: YearEndDefenseResult | undefined, lookup: YearReportTextLookup): string {
    if (!defense) return '';
    return lookup(`ui.year_report.defense_${defense.outcome}`, signed(defense.moraleDelta), String(defense.populationLost));
}

function fillYearReportText(template: string, args: readonly string[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index: string) => args[Number(index)] ?? match);
}

export function fallbackYearReportText(key: string, ...args: string[]): string {
    const template = YEAR_REPORT_TEXT_FALLBACK_ZH_TW[key];
    return template === undefined ? key : fillYearReportText(template, args);
}

/** 語系表未載入時 i18n.t 會回傳 key 本身，這時改用 zh-TW 預設 */
export function withYearReportFallback(lookup: YearReportTextLookup): YearReportTextLookup {
    return (key, ...args) => {
        const localized = lookup(key, ...args);
        return localized === key ? fallbackYearReportText(key, ...args) : localized;
    };
}

/** 年報面板的全部文字，key 為面板節點 id 的候選名稱；數值以占位參數傳入 */
/** 年報最多列出幾個名字，其餘以「等」收尾，避免一行爆版 */
export const YEAR_REPORT_UNWED_NAME_LIMIT = 4;

export function buildUnwedLine(names: readonly string[], lookup: YearReportTextLookup): string {
    if (names.length === 0) return lookup('ui.year_report.unwed_none');
    const shown = names.slice(0, YEAR_REPORT_UNWED_NAME_LIMIT).join('、');
    return lookup('ui.year_report.unwed', String(names.length), names.length > YEAR_REPORT_UNWED_NAME_LIMIT ? `${shown} 等` : shown);
}

export function buildYearReportTexts(report: YearReport, lookup: YearReportTextLookup = fallbackYearReportText): Record<string, string> {
    return {
        yearReportTitle: lookup('ui.year_report.title', String(report.year)),
        yearReportYear: '',
        yearReportIntro: lookup('ui.year_report.intro'),
        yearReportDeaths: lookup('ui.year_report.deaths', String(report.deaths)),
        yearReportRetirements: lookup('ui.year_report.retirements', String(report.retirementCandidates)),
        yearReportUnwed: buildUnwedLine(report.unwedNames ?? [], lookup),
        yearReportDefense: buildDefenseLine(report.defense, lookup),
        closeYearReportLabel: lookup('ui.year_report.close'),
    };
}
