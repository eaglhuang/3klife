// @spec-source → 每季小報規格書 (doc_spec_1345)；PROG-2-10150
/**
 * SeasonNews — 季末《本季大事記》搞笑小報的選事與組稿（純 TS，不依賴 cc，可直接單元測試）。
 *
 * 只吃既有數據（武將日誌、心智事件流、官職階位、名冊增減），不加新系統、不寫存檔。
 * 挑選規則（優先序、語氣、日誌／心智事件映射）全在 data/season-news-rules.json，程式不寫死種類。
 * 同輸入同輸出：沒有任何亂數，同分時以人數、種類字串排序。
 *
 * Unity 對照：像一張 ScriptableObject 規則表加上一個「事件清單 → 頭條清單」的純函式。
 */
import type { GeneralPersonalityType } from '../models/GeneralUnit';
import { fillSlots } from '../mind/MindLineTemplates';
import { voiceSlots, type VoiceProfile } from '../mind/SpeakerVoice';

export type SeasonNewsTone = 'good' | 'bad' | 'quiet';

export interface SeasonNewsKindRule {
    /** 越大越前面 */
    priority: number;
    /** 吐槽語氣：good／bad（quiet 只給「本季沒大事」用） */
    tone: Exclude<SeasonNewsTone, 'quiet'>;
}

export interface SeasonNewsRules {
    /** 頭條行數 */
    headlineCount: number;
    /** 一行最多列幾位名字，其餘寫「等 N 人」 */
    maxNames: number;
    /** 不足頭條時補行用的 filler 句數（i18n：ui.seasonNews.filler.<1..N>） */
    fillerCount: number;
    kinds: Readonly<Record<string, SeasonNewsKindRule>>;
    sources: {
        /** 日誌 entryId 前綴 → kind */
        journal: Readonly<Record<string, string>>;
        /** 心智事件 kind（且 tags 含 marriage 之類由呼叫端先篩好）→ kind */
        mind: Readonly<Record<string, string>>;
    };
}

/** 資料檔讀不到或壞掉時的內建預設（與 season-news-rules.json 首版一致） */
export const DEFAULT_SEASON_NEWS_RULES: Readonly<SeasonNewsRules> = Object.freeze({
    headlineCount: 3,
    maxNames: 3,
    fillerCount: 3,
    kinds: Object.freeze({
        marriage: Object.freeze({ priority: 90, tone: 'good' as const }),
        birth: Object.freeze({ priority: 85, tone: 'good' as const }),
        promotion: Object.freeze({ priority: 80, tone: 'good' as const }),
        battle_win: Object.freeze({ priority: 70, tone: 'good' as const }),
        recruit: Object.freeze({ priority: 65, tone: 'good' as const }),
        battle_lose: Object.freeze({ priority: 60, tone: 'bad' as const }),
        retire: Object.freeze({ priority: 55, tone: 'bad' as const }),
        dispatch_win: Object.freeze({ priority: 40, tone: 'good' as const }),
        dispatch_fail: Object.freeze({ priority: 35, tone: 'bad' as const }),
    }),
    sources: Object.freeze({
        journal: Object.freeze({
            BATTLE_WIN: 'battle_win', BATTLE_LOSE: 'battle_lose', GENERAL_BORN: 'birth',
            GENERAL_RETIRE: 'retire', DISPATCH_SUCCESS: 'dispatch_win', DISPATCH_FAIL: 'dispatch_fail',
        }),
        mind: Object.freeze({ BOND_FORMED: 'marriage' }),
    }),
});

function positiveInt(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : fallback;
}

function stringMap(value: unknown, fallback: Readonly<Record<string, string>>, knownKinds: ReadonlySet<string>): Readonly<Record<string, string>> {
    if (!value || typeof value !== 'object') return fallback;
    const out: Record<string, string> = {};
    for (const [key, target] of Object.entries(value as Record<string, unknown>)) {
        if (typeof target === 'string' && knownKinds.has(target)) out[key] = target;
    }
    return out;
}

/** 解析資料檔；不合法的欄位退回預設，不合法的種類略過，永不拋例外 */
export function parseSeasonNewsRules(raw: unknown): SeasonNewsRules {
    const src = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
    const kinds: Record<string, SeasonNewsKindRule> = {};
    if (src.kinds && typeof src.kinds === 'object') {
        for (const [kind, rule] of Object.entries(src.kinds as Record<string, unknown>)) {
            const r = rule as Partial<SeasonNewsKindRule> | null;
            if (!r || typeof r.priority !== 'number' || !Number.isFinite(r.priority)) continue;
            if (r.tone !== 'good' && r.tone !== 'bad') continue;
            kinds[kind] = { priority: r.priority, tone: r.tone };
        }
    }
    if (Object.keys(kinds).length === 0) return { ...DEFAULT_SEASON_NEWS_RULES, kinds: DEFAULT_SEASON_NEWS_RULES.kinds, sources: DEFAULT_SEASON_NEWS_RULES.sources };
    const known = new Set(Object.keys(kinds));
    const sources = (src.sources && typeof src.sources === 'object') ? src.sources as Record<string, unknown> : {};
    return {
        headlineCount: positiveInt(src.headlineCount, DEFAULT_SEASON_NEWS_RULES.headlineCount),
        maxNames: positiveInt(src.maxNames, DEFAULT_SEASON_NEWS_RULES.maxNames),
        fillerCount: positiveInt(src.fillerCount, DEFAULT_SEASON_NEWS_RULES.fillerCount),
        kinds,
        sources: {
            journal: stringMap(sources.journal, DEFAULT_SEASON_NEWS_RULES.sources.journal, known),
            mind: stringMap(sources.mind, DEFAULT_SEASON_NEWS_RULES.sources.mind, known),
        },
    };
}

// ── 事實收集 ─────────────────────────────────────────────────────────────

/** 一種大事：同 kind 的所有相關人合併；ids 與 names 同序 */
export interface SeasonNewsFact {
    kind: string;
    ids: string[];
    names: string[];
}

export interface SeasonNewsJournalRow {
    entryId: string;
    timestamp: string;
    relatedGeneralUids: readonly string[];
}

export interface SeasonNewsMindRow {
    generalId: string;
    kind: string;
    season: number;
    tags: readonly string[];
}

export interface SeasonNewsInput {
    journal: readonly SeasonNewsJournalRow[];
    /** 只取時間戳記大於等於此值的日誌（剛結束那一季的 `YYYY-SS-01T00:00:00`） */
    sinceTimestamp: string;
    mind: readonly SeasonNewsMindRow[];
    /** 只取這一季（含）之後的心智事件；對應剛結束那一季的 totalSeasonsElapsed */
    mindSinceSeason: number;
    /** 官職升階：換季前後 currentTier 變大時由呼叫端帶入 */
    promotion?: { rankName: string; generalId?: string } | null;
    /** 換季前後多出的成年武將 */
    recruits: readonly { id: string; name: string }[];
    /** id（或日誌的 uid）→ 顯示名；查不到回 undefined，該人不入報 */
    nameOf: (id: string) => string | undefined;
}

/** 日誌 entryId 去掉尾端序號即為事件前綴，例如 BATTLE_WIN-12 → BATTLE_WIN */
export function journalKindPrefix(entryId: string): string {
    return entryId.replace(/-\d+$/, '');
}

/** 與 GameSession.seasonJournalTimestamp 同格式（私有函式，這裡照抄；測試鎖住格式） */
export function seasonJournalStamp(year: number, season: number): string {
    return `${String(year).padStart(4, '0')}-${String(season).padStart(2, '0')}-01T00:00:00`;
}

class FactBook {
    private readonly _map = new Map<string, { ids: string[]; names: string[] }>();

    add(kind: string, id: string, name: string): void {
        const slot = this._map.get(kind) ?? { ids: [], names: [] };
        if (!slot.ids.includes(id)) { slot.ids.push(id); slot.names.push(name); }
        this._map.set(kind, slot);
    }

    toFacts(): SeasonNewsFact[] {
        return Array.from(this._map.entries()).map(([kind, slot]) => ({ kind, ids: slot.ids, names: slot.names }));
    }
}

/** 把既有數據整理成「本季發生了哪幾種大事」；規則表沒收錄的種類不入報 */
export function collectSeasonNewsFacts(input: Readonly<SeasonNewsInput>, rules: Readonly<SeasonNewsRules>): SeasonNewsFact[] {
    const book = new FactBook();
    const known = (kind: string | undefined): kind is string => !!kind && kind in rules.kinds;

    for (const row of input.journal) {
        if (row.timestamp < input.sinceTimestamp) continue;
        const kind = rules.sources.journal[journalKindPrefix(row.entryId)];
        if (!known(kind)) continue;
        for (const uid of row.relatedGeneralUids) {
            const name = input.nameOf(uid);
            if (name) book.add(kind, uid, name);
        }
    }
    for (const row of input.mind) {
        if (row.season < input.mindSinceSeason) continue;
        if (row.kind === 'BOND_FORMED' && !row.tags.includes('marriage')) continue;
        const kind = rules.sources.mind[row.kind];
        if (!known(kind)) continue;
        const name = input.nameOf(row.generalId);
        if (name) book.add(kind, row.generalId, name);
    }
    if (input.promotion && known('promotion')) {
        book.add('promotion', input.promotion.generalId ?? 'lord', input.promotion.rankName);
    }
    for (const recruit of input.recruits) {
        if (known('recruit')) book.add('recruit', recruit.id, recruit.name);
    }
    return book.toFacts();
}

// ── 組稿 ─────────────────────────────────────────────────────────────────

export interface SeasonNewsHeadline {
    /** null＝filler（沒事可報的補行） */
    kind: string | null;
    /** i18n 鍵：ui.seasonNews.item.<kind> 或 ui.seasonNews.filler.<n> */
    key: string;
    /** 最多 maxNames 位 */
    names: string[];
    /** 超出 maxNames 的人數 */
    more: number;
}

export interface SeasonNewsIssue {
    headlines: SeasonNewsHeadline[];
    /** 吐槽者的武將 id；沒人可用時 null（小報只顯示頭條） */
    roasterId: string | null;
    tone: SeasonNewsTone;
}

export interface SeasonNewsContext {
    /** 換季後的 totalSeasonsElapsed，用來輪流挑 filler */
    seasonIndex: number;
    /** 吐槽者候選（主將優先、其次名冊）；事實裡的相關武將仍在名冊時優先用事實裡的人 */
    fallbackRoasterIds: readonly string[];
    /** 名冊裡仍在的武將 id，用來確認吐槽者還在 */
    rosterIds: ReadonlySet<string>;
}

/** 挑頭條：priority 高者在前，同分人數多者在前，再以種類排序；不足補 filler */
export function buildSeasonNews(facts: readonly SeasonNewsFact[], rules: Readonly<SeasonNewsRules>, ctx: Readonly<SeasonNewsContext>): SeasonNewsIssue {
    const ranked = facts
        .filter((fact) => fact.kind in rules.kinds && fact.names.length > 0)
        .sort((a, b) => rules.kinds[b.kind].priority - rules.kinds[a.kind].priority
            || b.names.length - a.names.length
            || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0))
        .slice(0, rules.headlineCount);

    const headlines: SeasonNewsHeadline[] = ranked.map((fact) => ({
        kind: fact.kind,
        key: `ui.seasonNews.item.${fact.kind}`,
        names: fact.names.slice(0, rules.maxNames),
        more: Math.max(0, fact.names.length - rules.maxNames),
    }));
    for (let i = 0; headlines.length < rules.headlineCount; i += 1) {
        headlines.push({
            kind: null,
            key: `ui.seasonNews.filler.${((Math.max(0, ctx.seasonIndex) + i) % rules.fillerCount) + 1}`,
            names: [],
            more: 0,
        });
    }

    const top = ranked[0];
    const fromFact = top?.ids.find((id) => ctx.rosterIds.has(id));
    const roasterId = fromFact ?? ctx.fallbackRoasterIds.find((id) => ctx.rosterIds.has(id)) ?? null;
    return { headlines, roasterId, tone: top ? rules.kinds[top.kind].tone : 'quiet' };
}

/** 一行頭條的最終文字：名字以「、」串接，超出人數接 ui.seasonNews.etc */
export function formatSeasonNewsHeadline(headline: Readonly<SeasonNewsHeadline>, t: (key: string, ...args: string[]) => string): string {
    if (headline.kind === null) return t(headline.key);
    const joined = headline.names.join('、') + (headline.more > 0 ? t('ui.seasonNews.etc', String(headline.more)) : '');
    return t(headline.key, joined, String(headline.names.length + headline.more));
}

export const SEASON_NEWS_TYPES: readonly GeneralPersonalityType[] = ['Brave', 'Wise', 'Loyal', 'Playful'];

export function seasonNewsRoastKey(tone: SeasonNewsTone, type: GeneralPersonalityType): string {
    return `ui.seasonNews.roast.${tone}.${type}`;
}

/** 吐槽台詞：{self} 走 SpeakerVoice（性別、性格、年齡）；取不到句子回空字串，呼叫端就不畫對話框 */
export function seasonNewsRoastLine(
    tone: SeasonNewsTone,
    profile: Readonly<VoiceProfile>,
    translate: (key: string) => string,
): string {
    const key = seasonNewsRoastKey(tone, profile.type ?? 'Loyal');
    const template = translate(key);
    if (!template || template === key) return '';
    return fillSlots(template, voiceSlots(profile));
}
