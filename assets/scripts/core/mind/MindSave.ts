// @spec-source → 武將心智提案 §3.4 存檔欄位與遷移（PROG-2-9146）
/**
 * generalMind 存檔欄位的正規化，純 TS。選填欄位，舊檔缺值或壞值一律視為空心智，不拋例外；版號自帶（v）。
 */
import {
    MIND_CONFIG,
    MIND_EVENT_KINDS,
    type GeneralMindSave,
    type MindEvent,
    type MindLedger,
    type MindOutcome,
    type MindValence,
    type MindWeight,
} from './MindTypes';

export function emptyGeneralMind(): GeneralMindSave {
    return { v: 1, events: {}, ledger: {}, lastSeasonSettled: -1 };
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function intIn(v: unknown, min: number, max: number): number | null {
    return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;
}

function nonNeg(v: unknown): number {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

const OUTCOMES: readonly MindOutcome[] = ['SUCCESS', 'PARTIAL', 'FAIL'];

function normalizeEvent(raw: unknown): MindEvent | null {
    if (!isRecord(raw)) return null;
    const valence = intIn(raw.valence, -3, 3);
    const weight = intIn(raw.weight, 1, 5);
    const season = intIn(raw.season, -1, 1_000_000);
    if (valence === null || weight === null || season === null) return null;
    if (typeof raw.id !== 'string' || raw.id.length === 0 || raw.id.length > 96) return null;
    if (typeof raw.kind !== 'string' || !(MIND_EVENT_KINDS as readonly string[]).includes(raw.kind)) return null;
    const tags = Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string').slice(0, MIND_CONFIG.maxTags) : [];
    const event: MindEvent = {
        id: raw.id,
        season,
        kind: raw.kind as MindEvent['kind'],
        tags,
        valence: valence as MindValence,
        weight: weight as MindWeight,
    };
    if (typeof raw.outcome === 'string' && (OUTCOMES as readonly string[]).includes(raw.outcome)) event.outcome = raw.outcome as MindOutcome;
    if (typeof raw.label === 'string' && raw.label) event.label = raw.label.slice(0, MIND_CONFIG.maxLabelLength);
    if (typeof raw.partnerId === 'string' && raw.partnerId) event.partnerId = raw.partnerId;
    if (typeof raw.reason === 'string' && raw.reason) event.reason = raw.reason.slice(0, 40);
    return event;
}

function normalizeLedger(raw: unknown): MindLedger | null {
    if (!isRecord(raw)) return null;
    const byTag: MindLedger['byTag'] = {};
    if (isRecord(raw.byTag)) {
        for (const [tag, s] of Object.entries(raw.byTag)) {
            if (!isRecord(s)) continue;
            byTag[tag] = { win: nonNeg(s.win), loss: nonNeg(s.loss), lastSeason: nonNeg(s.lastSeason), streakLoss: nonNeg(s.streakLoss) };
        }
    }
    const partners: MindLedger['partners'] = {};
    if (isRecord(raw.partners)) {
        for (const [id, s] of Object.entries(raw.partners)) {
            if (!isRecord(s)) continue;
            partners[id] = { together: nonNeg(s.together), wins: nonNeg(s.wins), lastSeason: nonNeg(s.lastSeason) };
        }
    }
    return {
        seq: nonNeg(raw.seq),
        lastActiveSeason: typeof raw.lastActiveSeason === 'number' && Number.isFinite(raw.lastActiveSeason) ? Math.floor(raw.lastActiveSeason) : -1,
        idleSeasons: nonNeg(raw.idleSeasons),
        byTag,
        partners,
    };
}

/** 一般事件超出容量時，丟最舊且最不重要者；里程碑（weight 5）另有上限，超出丟最舊。 */
export function trimEvents(events: MindEvent[]): MindEvent[] {
    const milestones = events.filter(e => e.weight >= MIND_CONFIG.milestoneWeight);
    let normal = events.filter(e => e.weight < MIND_CONFIG.milestoneWeight);
    while (normal.length > MIND_CONFIG.normalEventCap) {
        let drop = 0;
        for (let i = 1; i < normal.length; i++) {
            const a = normal[i];
            const b = normal[drop];
            if (a.weight < b.weight || (a.weight === b.weight && a.season < b.season)) drop = i;
        }
        normal = normal.filter((_, i) => i !== drop);
    }
    const keptMilestones = milestones.slice(-MIND_CONFIG.milestoneCap);
    const keep = new Set<MindEvent>([...normal, ...keptMilestones]);
    return events.filter(e => keep.has(e));
}

export function normalizeGeneralMind(raw: unknown): GeneralMindSave {
    const out = emptyGeneralMind();
    if (!isRecord(raw) || raw.v !== 1) return out;
    if (isRecord(raw.events)) {
        for (const [id, list] of Object.entries(raw.events)) {
            if (!Array.isArray(list)) continue;
            const seen = new Set<string>();
            const events: MindEvent[] = [];
            for (const item of list) {
                const e = normalizeEvent(item);
                if (!e || seen.has(e.id)) continue;
                seen.add(e.id);
                events.push(e);
            }
            if (events.length > 0) out.events[id] = trimEvents(events);
        }
    }
    if (isRecord(raw.ledger)) {
        for (const [id, l] of Object.entries(raw.ledger)) {
            const ledger = normalizeLedger(l);
            if (ledger) out.ledger[id] = ledger;
        }
    }
    out.lastSeasonSettled = typeof raw.lastSeasonSettled === 'number' && Number.isFinite(raw.lastSeasonSettled) ? Math.floor(raw.lastSeasonSettled) : -1;
    return out;
}

/** 沒有任何內容時不必寫進存檔（與其他選填欄位一致） */
export function isEmptyGeneralMind(save: Readonly<GeneralMindSave>): boolean {
    return Object.keys(save.events).length === 0 && Object.keys(save.ledger).length === 0;
}
