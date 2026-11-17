// @spec-source → 武將心智提案 §2、§3.2 離線實作（PROG-2-9146）
/**
 * OfflineGeneralMindService — 武將心智的離線實作：記憶體狀態＋純函式規則，沒有任何隨機（台詞索引由呼叫端 seed 決定）。
 * 事件是真相，心情由事件流現算；累計器（byTag／partners）在寫入時更新，事件被擠掉也不遺失統計。
 */
import type { IGeneralMindService } from './IGeneralMindService';
import { selectBark } from './MindBarks';
import { moodFrom, moodScore, personalityTypeOf, ruleFor } from './MindRules';
import { emptyGeneralMind, normalizeGeneralMind, trimEvents } from './MindSave';
import {
    MIND_CONFIG,
    type GeneralMindSave,
    type MindBarkPlace,
    type MindContext,
    type MindEvent,
    type MindEventInput,
    type MindEventView,
    type MindLedger,
    type MindLine,
    type MindMood,
    type MindRecordResult,
    type SeasonMindReport,
    type TaskSettlementDto,
} from './MindTypes';

function newLedger(): MindLedger {
    return { seq: 0, lastActiveSeason: -1, idleSeasons: 0, byTag: {}, partners: {} };
}

function view(e: MindEvent): MindEventView {
    return {
        id: e.id, season: e.season, kind: e.kind, valence: e.valence, weight: e.weight,
        ...(e.outcome ? { outcome: e.outcome } : {}),
        ...(e.label ? { label: e.label } : {}),
        ...(e.reason ? { reason: e.reason } : {}),
    };
}

export class OfflineGeneralMindService implements IGeneralMindService {
    private _state: GeneralMindSave = emptyGeneralMind();
    private _now = 0;

    public record(input: MindEventInput): MindRecordResult {
        const { generalId } = input;
        if (!generalId) return { recorded: false, duplicate: false, events: [] };
        const list = this._state.events[generalId] ?? [];
        const ledger = this._state.ledger[generalId] ?? newLedger();
        const id = input.id ?? `${generalId}#${ledger.seq + 1}`;
        if (list.some(e => e.id === id)) return { recorded: false, duplicate: true, events: [] };
        const rule = ruleFor(input);
        const event: MindEvent = {
            id,
            season: input.season,
            kind: input.kind,
            tags: (input.tags ?? []).slice(0, MIND_CONFIG.maxTags),
            valence: rule.valence,
            weight: rule.weight,
            ...(input.outcome ? { outcome: input.outcome } : {}),
            ...(input.label ? { label: input.label.slice(0, MIND_CONFIG.maxLabelLength) } : {}),
            ...(input.partnerId ? { partnerId: input.partnerId } : {}),
            ...(rule.reason ? { reason: rule.reason } : {}),
        };
        ledger.seq += 1;
        this._tally(ledger, event);
        this._state.events[generalId] = trimEvents([...list, event]);
        this._state.ledger[generalId] = ledger;
        this._now = Math.max(this._now, input.season);
        return { recorded: true, duplicate: false, events: [event] };
    }

    public onTaskSettled(dto: TaskSettlementDto): MindRecordResult {
        const events: MindEvent[] = [];
        let duplicate = false;
        const ids = Array.from(new Set(dto.generalIds.filter(Boolean)));
        ids.forEach((generalId, index) => {
            const res = this.record({
                generalId,
                season: dto.season,
                kind: 'TASK_DONE',
                outcome: dto.outcome,
                tags: dto.tags,
                label: dto.label,
                partnerId: ids.find(other => other !== generalId),
                intelLevel: dto.intelLevelAtDispatch,
                risk: dto.risk,
                volunteered: dto.volunteered && index === 0,
                delegated: dto.delegated && index === 0,
                isLead: index === 0,
                injured: dto.injuries?.[generalId] === 'SERIOUS',
                id: `${dto.taskId}@${dto.season}#${generalId}`,
            });
            events.push(...res.events);
            if (res.duplicate) duplicate = true;
            if (res.recorded) events.push(...this._noteTogether(generalId, ids, dto));
        });
        return { recorded: events.length > 0, duplicate, events };
    }

    public moodOf(generalId: string, ctx: MindContext = {}): MindMood {
        const now = ctx.season ?? this._now;
        const events = this._state.events[generalId] ?? [];
        return moodFrom(moodScore(events, this._state.ledger[generalId], now, ctx), events, now);
    }

    public recentMemories(generalId: string, limit = 5): MindEventView[] {
        const events = this._state.events[generalId] ?? [];
        return [...events].sort((a, b) => b.season - a.season || (b.id < a.id ? -1 : 1)).slice(0, Math.max(0, limit)).map(view);
    }

    public barkFor(generalId: string, _place: MindBarkPlace, seed: number, ctx: MindContext = {}): MindLine {
        return selectBark({
            generalId,
            type: personalityTypeOf(ctx.general),
            mood: this.moodOf(generalId, ctx),
            events: this._state.events[generalId] ?? [],
            ledger: this._state.ledger[generalId],
            now: ctx.season ?? this._now,
            seed,
            nameOf: ctx.nameOf,
        });
    }

    public onSeasonSettle(season: number, _rng: () => number, activeGeneralIds?: readonly string[]): SeasonMindReport {
        // _rng 預留給 MIND-2 的請求抽選；MIND-1 的結算完全確定性
        const report: SeasonMindReport = { season, moodChanges: [], idleGeneralIds: [] };
        if (season <= this._state.lastSeasonSettled) return report;
        const before = new Map<string, MindMood>();
        for (const id of Object.keys(this._state.ledger)) before.set(id, this.moodOf(id, { season: this._now }));
        if (activeGeneralIds && activeGeneralIds.length > 0) {
            const active = new Set(activeGeneralIds);
            for (const id of Object.keys(this._state.ledger)) {
                if (active.has(id)) continue;
                delete this._state.events[id];
                delete this._state.ledger[id];
                before.delete(id);
            }
        }
        this._now = Math.max(this._now, season);
        for (const [id, ledger] of Object.entries(this._state.ledger)) {
            // 上一季（season-1）沒有任何事件 → 又被冷落一季
            ledger.idleSeasons = ledger.lastActiveSeason < season - 1 ? ledger.idleSeasons + 1 : 0;
            if (ledger.idleSeasons >= MIND_CONFIG.idleThresholdSeasons) report.idleGeneralIds.push(id);
            const to = this.moodOf(id, { season });
            const from = before.get(id) ?? to;
            if (from !== to) report.moodChanges.push({ generalId: id, from, to });
        }
        this._state.lastSeasonSettled = season;
        return report;
    }

    public snapshot(): GeneralMindSave {
        return normalizeGeneralMind(JSON.parse(JSON.stringify(this._state)));
    }

    public restore(raw: unknown): void {
        this._state = normalizeGeneralMind(raw);
        let latest = this._state.lastSeasonSettled;
        for (const list of Object.values(this._state.events)) for (const e of list) latest = Math.max(latest, e.season);
        this._now = Math.max(0, latest);
    }

    public reset(): void {
        this._state = emptyGeneralMind();
        this._now = 0;
    }

    /** 寫入時更新累計器：任務標籤勝負／連敗、最近活躍季。 */
    private _tally(ledger: MindLedger, event: MindEvent): void {
        ledger.lastActiveSeason = Math.max(ledger.lastActiveSeason, event.season);
        ledger.idleSeasons = 0;
        const counted = (event.kind === 'TASK_DONE' || event.kind === 'BATTLE_RESULT') && event.outcome && event.outcome !== 'PARTIAL';
        if (!counted) return;
        for (const tag of event.tags) {
            const stat = ledger.byTag[tag] ?? { win: 0, loss: 0, lastSeason: event.season, streakLoss: 0 };
            if (event.outcome === 'SUCCESS') { stat.win += 1; stat.streakLoss = 0; } else { stat.loss += 1; stat.streakLoss += 1; }
            stat.lastSeason = event.season;
            ledger.byTag[tag] = stat;
        }
        const tags = Object.keys(ledger.byTag);
        if (tags.length > MIND_CONFIG.maxTagStats) {
            tags.sort((a, b) => ledger.byTag[a].lastSeason - ledger.byTag[b].lastSeason);
            for (const t of tags.slice(0, tags.length - MIND_CONFIG.maxTagStats)) delete ledger.byTag[t];
        }
    }

    /** 同一任務有搭檔時，累計並肩次數；剛好滿 3 次寫入 BOND_FORMED。 */
    private _noteTogether(generalId: string, ids: readonly string[], dto: TaskSettlementDto): MindEvent[] {
        const out: MindEvent[] = [];
        const ledger = this._state.ledger[generalId];
        if (!ledger) return out;
        for (const other of ids) {
            if (other === generalId) continue;
            const stat = ledger.partners[other] ?? { together: 0, wins: 0, lastSeason: dto.season };
            stat.together += 1;
            if (dto.outcome === 'SUCCESS') stat.wins += 1;
            stat.lastSeason = dto.season;
            ledger.partners[other] = stat;
            if (stat.together === MIND_CONFIG.bondTogether) {
                out.push(...this.record({ generalId, season: dto.season, kind: 'BOND_FORMED', partnerId: other, id: `bond:${generalId}:${other}` }).events);
            }
        }
        const partners = Object.keys(ledger.partners);
        if (partners.length > MIND_CONFIG.maxPartnerStats) {
            partners.sort((a, b) => ledger.partners[a].lastSeason - ledger.partners[b].lastSeason);
            for (const p of partners.slice(0, partners.length - MIND_CONFIG.maxPartnerStats)) delete ledger.partners[p];
        }
        return out;
    }
}
