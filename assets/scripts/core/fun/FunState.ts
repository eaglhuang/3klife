// @spec-source → 新手第一年樂趣四功能規格書 doc_spec_1347 §1.6、§2.4、§4.3.1、§5.2；PROG-2-10177
/**
 * FunState — 存檔欄位 funState 的型別與正規化（純邏輯，不依賴 cc）。
 *
 * 只放去重與輪替所需的最小資料；台詞本身不進存檔。空狀態不寫進存檔，舊存檔缺欄位讀回為空狀態。
 *   toddler[childId]      FUN-01：該孩子最近一次點擊的季數與當季挑到的樣板（同季固定、隔季不重複）
 *   victoryChat           FUN-03：上一位搭話者、當日計數、待播搭話（結算後、回大廳前暫存）
 *   moonParty             FUN-02：賓客名單（算出後寫入，閃退重進從頭重播但不重複入帳）
 *   recruitIntro          FUN-04：已播過自我介紹的武將
 *   dualToneAnnounced     FUN-04：古今雙口吻預告句是否已播過
 */

export interface FunToddlerEntry {
    lastSeasonNo: number;
    lastTemplateId: string;
}

export interface FunPendingVictoryChat {
    talkerId: string;
    /** 戰況參數（可缺，缺就用通用句） */
    resultBand: 'bigWin' | 'closeWin' | 'win';
    enemy?: string;
    tactic?: string;
    terrain?: string;
    /** 結算當下的季數（回大廳時若已跨季仍照播） */
    seasonNo: number;
}

export interface FunVictoryChatState {
    lastTalkerId: string;
    dayNo: number;
    dayCount: number;
    pending: FunPendingVictoryChat | null;
}

export interface FunMoonPartyState {
    childId: string;
    guestIds: string[];
    /** 已演完並結算（之後不再觸發） */
    done: boolean;
}

export interface FunState {
    v: 1;
    toddler: Record<string, FunToddlerEntry>;
    victoryChat: FunVictoryChatState;
    moonParty: FunMoonPartyState | null;
    recruitIntro: Record<string, true>;
    dualToneAnnounced: boolean;
}

export function emptyFunState(): FunState {
    return {
        v: 1,
        toddler: {},
        victoryChat: { lastTalkerId: '', dayNo: -1, dayCount: 0, pending: null },
        moonParty: null,
        recruitIntro: {},
        dualToneAnnounced: false,
    };
}

const BANDS = ['bigWin', 'closeWin', 'win'] as const;

function str(v: unknown): string {
    return typeof v === 'string' ? v : '';
}

function int(v: unknown, fallback: number): number {
    return typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : fallback;
}

/** 壞資料不丟錯：能留的欄位留下，其餘退回預設 */
export function normalizeFunState(raw: unknown): FunState {
    const out = emptyFunState();
    if (typeof raw !== 'object' || raw === null) return out;
    const src = raw as Record<string, unknown>;
    if (typeof src.toddler === 'object' && src.toddler !== null) {
        for (const [childId, value] of Object.entries(src.toddler as Record<string, unknown>)) {
            if (typeof value !== 'object' || value === null || childId === '') continue;
            const entry = value as Record<string, unknown>;
            const templateId = str(entry.lastTemplateId);
            if (templateId !== '') out.toddler[childId] = { lastSeasonNo: int(entry.lastSeasonNo, -1), lastTemplateId: templateId };
        }
    }
    if (typeof src.victoryChat === 'object' && src.victoryChat !== null) {
        const v = src.victoryChat as Record<string, unknown>;
        out.victoryChat.lastTalkerId = str(v.lastTalkerId);
        out.victoryChat.dayNo = int(v.dayNo, -1);
        out.victoryChat.dayCount = Math.max(0, int(v.dayCount, 0));
        const p = v.pending;
        if (typeof p === 'object' && p !== null) {
            const pending = p as Record<string, unknown>;
            const talkerId = str(pending.talkerId);
            if (talkerId !== '') {
                const band = BANDS.find((b) => b === pending.resultBand) ?? 'win';
                out.victoryChat.pending = {
                    talkerId,
                    resultBand: band,
                    ...(str(pending.enemy) ? { enemy: str(pending.enemy) } : {}),
                    ...(str(pending.tactic) ? { tactic: str(pending.tactic) } : {}),
                    ...(str(pending.terrain) ? { terrain: str(pending.terrain) } : {}),
                    seasonNo: int(pending.seasonNo, 0),
                };
            }
        }
    }
    if (typeof src.moonParty === 'object' && src.moonParty !== null) {
        const m = src.moonParty as Record<string, unknown>;
        const childId = str(m.childId);
        if (childId !== '') {
            const guestIds = Array.isArray(m.guestIds) ? m.guestIds.filter((g): g is string => typeof g === 'string' && g !== '') : [];
            out.moonParty = { childId, guestIds: Array.from(new Set(guestIds)).slice(0, 5), done: m.done === true };
        }
    }
    if (typeof src.recruitIntro === 'object' && src.recruitIntro !== null) {
        for (const [id, value] of Object.entries(src.recruitIntro as Record<string, unknown>)) if (value === true && id !== '') out.recruitIntro[id] = true;
    }
    out.dualToneAnnounced = src.dualToneAnnounced === true;
    return out;
}

export function isEmptyFunState(state: Readonly<FunState>): boolean {
    return Object.keys(state.toddler).length === 0
        && state.victoryChat.lastTalkerId === '' && state.victoryChat.dayNo < 0 && state.victoryChat.dayCount === 0 && state.victoryChat.pending === null
        && state.moonParty === null
        && Object.keys(state.recruitIntro).length === 0
        && !state.dualToneAnnounced;
}

export function cloneFunState(state: Readonly<FunState>): FunState {
    return normalizeFunState(JSON.parse(JSON.stringify(state)));
}
