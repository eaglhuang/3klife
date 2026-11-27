// @spec-source → 傳世名酒宴飲結義與割袍斷義狀態機規格書 doc_spec_0743 §3（桃園結義 2~3 人）、§4（割袍斷義：好感鎖死 -100、宿敵）；好感門檻一律 60（PM 裁定，寫在 oath-config.json）；PROG-2-10207
/**
 * SwornPact — 桃園結義盟約與割袍斷義的狀態與規則（純邏輯，不依賴 cc）。
 *
 * - 結成盟約：2~3 位武將、兩兩好感達門檻（oath-config.json affinityThreshold，預設 60）、尚未身在其他生效盟約、兩兩未被割袍斷義。
 * - 割袍斷義：同盟約的兩位武將，其一犯下悖德大罪；該對好感鎖死 -100、互為宿敵，盟約瓦解（isPactActive=false）。
 * - 戰場光環（+25%）、千里奔援、宿敵 50% 暴擊屬戰場核心規則，這裡不接線，只提供「誰與誰是結義兄弟／宿敵」查詢。
 *
 * 只回傳新狀態與要套用的好感變動，不碰好感表與存檔；呼叫端（GameSession）負責套用。
 * Unity 對照：像一張關係表的純資料操作，Controller 才去改 Friendship。
 */
import type { OathConfig } from './OathConfig';

export interface SwornPact {
    pactId: string;
    swornBrotherIds: string[];
    isPactActive: boolean;
    createdSeason: number;
    /** 瓦解時記下：誰犯下大罪、對誰割袍 */
    severedBy?: { offenderId: string; victimId: string; season: number };
}

export interface SwornState {
    pacts: SwornPact[];
    /** 被割袍斷義的配對（pairKey 排序後以 | 連接），好感永久鎖死、互為宿敵 */
    severedPairs: string[];
}

export function emptySwornState(): SwornState {
    return { pacts: [], severedPairs: [] };
}

export function isEmptySwornState(state: SwornState): boolean {
    return state.pacts.length === 0 && state.severedPairs.length === 0;
}

function clonePact(p: SwornPact): SwornPact {
    return { ...p, swornBrotherIds: [...p.swornBrotherIds], ...(p.severedBy ? { severedBy: { ...p.severedBy } } : {}) };
}

export function cloneSwornState(state: SwornState): SwornState {
    return { pacts: state.pacts.map(clonePact), severedPairs: [...state.severedPairs] };
}

/** 存檔讀回：壞資料略過、成員去重、同 pactId 只留第一筆；非物件回傳空狀態。 */
export function normalizeSwornState(raw: unknown): SwornState {
    if (!raw || typeof raw !== 'object') return emptySwornState();
    const src = raw as { pacts?: unknown; severedPairs?: unknown };
    const pacts: SwornPact[] = [];
    const seen = new Set<string>();
    for (const item of Array.isArray(src.pacts) ? src.pacts : []) {
        if (!item || typeof item !== 'object') continue;
        const p = item as Partial<SwornPact>;
        if (typeof p.pactId !== 'string' || !p.pactId || seen.has(p.pactId) || !Array.isArray(p.swornBrotherIds)) continue;
        const ids = Array.from(new Set(p.swornBrotherIds.filter((id): id is string => typeof id === 'string' && id.length > 0)));
        if (ids.length < 2 || ids.length > 3) continue;
        seen.add(p.pactId);
        const sb = p.severedBy;
        pacts.push({
            pactId: p.pactId,
            swornBrotherIds: ids,
            isPactActive: p.isPactActive !== false,
            createdSeason: typeof p.createdSeason === 'number' && Number.isFinite(p.createdSeason) ? Math.max(0, Math.trunc(p.createdSeason)) : 0,
            ...(sb && typeof sb.offenderId === 'string' && typeof sb.victimId === 'string'
                ? { severedBy: { offenderId: sb.offenderId, victimId: sb.victimId, season: typeof sb.season === 'number' ? sb.season : 0 } }
                : {}),
        });
    }
    const pairs = Array.isArray(src.severedPairs) ? src.severedPairs.filter((k): k is string => typeof k === 'string' && k.includes('|')) : [];
    return { pacts, severedPairs: Array.from(new Set(pairs)) };
}

export function pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function isSeveredPair(state: SwornState, a: string, b: string): boolean {
    return state.severedPairs.includes(pairKey(a, b));
}

/** 武將目前所在的生效盟約；沒有回傳 null。 */
export function activePactOf(state: SwornState, generalId: string): SwornPact | null {
    return state.pacts.find((p) => p.isPactActive && p.swornBrotherIds.includes(generalId)) ?? null;
}

/** 生效盟約中的結義兄弟（不含本人）。 */
export function swornBrothersOf(state: SwornState, generalId: string): string[] {
    const pact = activePactOf(state, generalId);
    return pact ? pact.swornBrotherIds.filter((id) => id !== generalId) : [];
}

/** 宿敵（被割袍斷義的對象）。 */
export function nemesesOf(state: SwornState, generalId: string): string[] {
    const out: string[] = [];
    for (const key of state.severedPairs) {
        const [a, b] = key.split('|');
        if (a === generalId) out.push(b);
        else if (b === generalId) out.push(a);
    }
    return out;
}

export type PactRejectReason = 'member-count' | 'duplicate-member' | 'already-in-pact' | 'severed-pair' | 'affinity-too-low';

export type PactCheck = { ok: true } | { ok: false; reason: PactRejectReason; a?: string; b?: string };

/** 檢查能否結盟：人數、重複、已在其他盟約、被割袍、好感門檻（兩兩都要達標）。 */
export function checkPactFormation(
    state: SwornState,
    memberIds: readonly string[],
    pairAffinity: (a: string, b: string) => number,
    config: OathConfig,
): PactCheck {
    if (memberIds.length < config.pact.minMembers || memberIds.length > config.pact.maxMembers) return { ok: false, reason: 'member-count' };
    if (new Set(memberIds).size !== memberIds.length) return { ok: false, reason: 'duplicate-member' };
    for (const id of memberIds) if (activePactOf(state, id)) return { ok: false, reason: 'already-in-pact', a: id };
    for (let i = 0; i < memberIds.length; i += 1) {
        for (let j = i + 1; j < memberIds.length; j += 1) {
            const a = memberIds[i];
            const b = memberIds[j];
            if (isSeveredPair(state, a, b)) return { ok: false, reason: 'severed-pair', a, b };
            if (pairAffinity(a, b) < config.affinityThreshold) return { ok: false, reason: 'affinity-too-low', a, b };
        }
    }
    return { ok: true };
}

export type FormPactResult = { ok: true; state: SwornState; pact: SwornPact } | { ok: false; reason: PactRejectReason; a?: string; b?: string };

/** 結成盟約；失敗不改狀態。pactId 由季序與排序後成員組成。 */
export function formPact(
    state: SwornState,
    memberIds: readonly string[],
    season: number,
    pairAffinity: (a: string, b: string) => number,
    config: OathConfig,
): FormPactResult {
    const check = checkPactFormation(state, memberIds, pairAffinity, config);
    if (!check.ok) return check;
    const sorted = [...memberIds].sort();
    const pact: SwornPact = { pactId: `PACT-${season}-${sorted.join('+')}`, swornBrotherIds: sorted, isPactActive: true, createdSeason: season };
    const next = cloneSwornState(state);
    next.pacts.push(pact);
    return { ok: true, state: next, pact };
}

export type SeverRejectReason = 'same-general' | 'not-sworn' | 'already-severed';

export type SeverResult =
    | { ok: true; state: SwornState; lockedAffinity: number; pairKey: string; pactId: string }
    | { ok: false; reason: SeverRejectReason };

/** 割袍斷義：兩人須在同一生效盟約；該對鎖死、盟約瓦解。失敗不改狀態。 */
export function severTies(state: SwornState, offenderId: string, victimId: string, season: number, config: OathConfig): SeverResult {
    if (!offenderId || !victimId || offenderId === victimId) return { ok: false, reason: 'same-general' };
    const key = pairKey(offenderId, victimId);
    if (state.severedPairs.includes(key)) return { ok: false, reason: 'already-severed' };
    const pact = state.pacts.find((p) => p.isPactActive && p.swornBrotherIds.includes(offenderId) && p.swornBrotherIds.includes(victimId));
    if (!pact) return { ok: false, reason: 'not-sworn' };
    const next = cloneSwornState(state);
    const target = next.pacts.find((p) => p.pactId === pact.pactId)!;
    target.isPactActive = false;
    target.severedBy = { offenderId, victimId, season };
    next.severedPairs.push(key);
    return { ok: true, state: next, lockedAffinity: config.severance.lockedAffinity, pairKey: key, pactId: pact.pactId };
}
