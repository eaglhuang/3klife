// @spec-source → 武將心智提案 §2、§3.2 離線實作（PROG-2-9146）
/**
 * OfflineGeneralMindService — 武將心智的離線實作：記憶體狀態＋純函式規則，沒有任何隨機（台詞索引由呼叫端 seed 決定）。
 * 事件是真相，心情由事件流現算；累計器（byTag／partners）在寫入時更新，事件被擠掉也不遺失統計。
 */
import type { IGeneralMindService } from './IGeneralMindService';
import { selectBark } from './MindBarks';
import { moodFrom, moodScore, personalityTypeOf, personalityVector, ruleFor } from './MindRules';
import { emptyGeneralMind, normalizeGeneralMind, trimEvents, trimRequests } from './MindSave';
import { experienceWeightOf, latestEventWithTag, shouldDefy, successDeltaOf, willingnessOf } from './MindLearning';
import { citeOf, opinionLine } from './MindLineTemplates';
import { buildDefyLetter, effectsOfResolution, expiryIgnoresPlayer, isMajorKind, nextAllowedAfterDenied, nextAllowedAfterGrantedMajor, nextAllowedAfterIssue, planRequests } from './MindRequests';
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
    type MindOpinion,
    type MindRecordResult,
    type MindRequest,
    type MindResolveResult,
    type MindTaskProfile,
    type SeasonMindReport,
    type TaskSettlementDto,
} from './MindTypes';

function newLedger(): MindLedger {
    return { seq: 0, lastActiveSeason: -1, idleSeasons: 0, byTag: {}, partners: {}, grudges: [], lastPraiseSeason: -1 };
}

/** 代表武將真的被派上用場（做事、受傷、被俘）的事件種類 */
const ACTIVE_KINDS: ReadonlySet<string> = new Set(['TASK_DONE', 'TASK_ABORTED', 'BATTLE_RESULT', 'DUEL', 'KILL_GENERAL', 'WOUNDED', 'CAPTURED', 'RESCUED']);

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
        const tags = (input.tags ?? []).slice(0, MIND_CONFIG.maxTags);
        // 雪恥：玩家答應過請再戰的類型，成功時衝擊加倍並寫成里程碑（提案 2.4）
        const redeemed = ledger.redeemTag !== undefined && tags.includes(ledger.redeemTag)
            && (input.kind === 'TASK_DONE' || input.kind === 'BATTLE_RESULT') && input.outcome === 'SUCCESS';
        if (redeemed) {
            rule.valence = Math.max(-3, Math.min(3, rule.valence * MIND_CONFIG.learning.redeemWinValenceMultiplier)) as typeof rule.valence;
            rule.weight = MIND_CONFIG.milestoneWeight;
            rule.reason = 'REDEEMED';
            delete ledger.redeemTag;
        }
        const event: MindEvent = {
            id,
            season: input.season,
            kind: input.kind,
            tags,
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

    public onSeasonSettle(season: number, rng: () => number, activeGeneralIds?: readonly string[], contextOf?: (generalId: string) => MindContext): SeasonMindReport {
        const report: SeasonMindReport = { season, moodChanges: [], idleGeneralIds: [], newRequests: [], expiredRequests: [] };
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
            this._state.requests = this._state.requests.filter(r => active.has(r.generalId));
            for (const id of Object.keys(this._state.cooldowns)) if (!active.has(id)) delete this._state.cooldowns[id];
        }
        this._now = Math.max(this._now, season);
        for (const [id, ledger] of Object.entries(this._state.ledger)) {
            // 上一季（season-1）沒有任何事件 → 又被冷落一季
            ledger.idleSeasons = ledger.lastActiveSeason < season - 1 ? ledger.idleSeasons + 1 : 0;
            if (ledger.idleSeasons >= MIND_CONFIG.idleThresholdSeasons) report.idleGeneralIds.push(id);
        }
        // 過期未回應：玩家無視了他（需要回應的請求才算），同類冷卻拉長
        for (const req of this._state.requests) {
            if (req.status !== 'PENDING' || req.expiresSeason >= season) continue;
            req.status = 'EXPIRED';
            req.read = true;
            report.expiredRequests.push({ ...req });
            if (expiryIgnoresPlayer(req.kind)) {
                this.record({ generalId: req.generalId, season, kind: 'PASSED_OVER', label: '無回音', tags: [`req:${req.kind}`], id: `${req.id}:expired` });
                this._setCooldown(req.generalId, req.kind, nextAllowedAfterDenied(req.season));
            }
        }
        // 主動請求（MIND-2）：全隊整季只從 rng 抽一次，之後的取捨都由這顆種子與武將／種類雜湊決定
        const seed = Math.floor(rng() * 0x100000000) >>> 0;
        const ids = activeGeneralIds && activeGeneralIds.length > 0 ? activeGeneralIds : Object.keys(this._state.ledger);
        const ctxOf = contextOf ?? ((): MindContext => ({ season }));
        const withSeason = (generalId: string): MindContext => ({ ...ctxOf(generalId), season });
        const issued = this._state.requests.filter(r => r.season === season).length;
        const planned = planRequests({
            season, seed, generalIds: ids,
            events: this._state.events, ledger: this._state.ledger, cooldowns: this._state.cooldowns,
            pending: this._state.requests.filter(r => r.status === 'PENDING'),
            issuedThisSeason: issued,
            contextOf: withSeason,
            moodOf: (generalId, ctx) => this.moodOf(generalId, ctx),
        });
        for (const req of planned) {
            if (this._state.requests.some(r => r.id === req.id)) continue;
            this._state.requests.push(req);
            this._setCooldown(req.generalId, req.kind, nextAllowedAfterIssue(season));
            report.newRequests.push({ ...req });
        }
        this._state.requests = trimRequests(this._state.requests);
        for (const id of Object.keys(this._state.ledger)) {
            const to = this.moodOf(id, withSeason(id));
            const from = before.get(id) ?? to;
            if (from !== to) report.moodChanges.push({ generalId: id, from, to });
        }
        this._state.lastSeasonSettled = season;
        return report;
    }

    public queryOpinion(generalId: string, profile: MindTaskProfile, ctx: MindContext = {}, opts: { partnerIds?: readonly string[] } = {}): MindOpinion {
        const now = ctx.season ?? this._now;
        const events = this._state.events[generalId] ?? [];
        const ledger = this._state.ledger[generalId];
        const type = personalityTypeOf(ctx.general);
        const vector = personalityVector(ctx.general ?? { id: generalId });
        const mood = this.moodOf(generalId, ctx);
        const r = willingnessOf({ tags: profile.tags, intelLevel: profile.intelLevel, partnerIds: opts.partnerIds, mood, type, vector, ledger, events, now });
        const negative = r.stance === 'DISSUADE' || r.stance === 'CAUTIOUS';
        const cause = r.cause;
        let key: Parameters<typeof opinionLine>[0] = 'NONE';
        if (cause && (cause.kind === 'CAUTION' || cause.kind === 'GRUDGE' || cause.kind === 'REDEEM')) key = cause.kind;
        else if (negative) key = mood === 'LOW' ? 'MOOD_LOW' : 'NONE';
        else if (cause) key = cause.kind;
        const partnerId = cause?.partnerId ?? opts.partnerIds?.[0];
        const refEvent = cause?.tag ? latestEventWithTag(events, cause.tag) : undefined;
        const line = opinionLine(key, type, {
            name: ctx.nameOf?.(generalId) ?? ctx.general?.name ?? generalId,
            cite: citeOf(cause?.label ?? profile.label ?? refEvent?.label, cause?.season ?? refEvent?.season, ctx.seasonLabel),
            n: String(cause?.streak ?? 0),
            win: String(cause?.win ?? 0),
            partner: partnerId ? (ctx.nameOf?.(partnerId) ?? partnerId) : '',
        }, now);
        return { stance: r.stance, willingness: r.willingness, line, reasonCodes: r.reasonCodes, successDelta: successDeltaOf(r.stance) };
    }

    public maybeDefy(generalId: string, ctx: MindContext = {}): MindRequest | null {
        const now = ctx.season ?? this._now;
        const events = this._state.events[generalId] ?? [];
        const ledger = this._state.ledger[generalId];
        if (!ledger || !shouldDefy(events, ledger, now, ctx)) return null;
        const id = `mind-req:${now}:${generalId}:DEFY_LETTER`;
        if (this._state.requests.some(r => r.id === id)) return null;
        const lastInsult = [...events].reverse().find(e => e.kind === 'SCOLDED' || e.kind === 'PASSED_OVER' || e.kind === 'REQUEST_DENIED');
        const letter = buildDefyLetter({
            generalId, name: ctx.nameOf?.(generalId) ?? ctx.general?.name ?? generalId, season: now,
            seed: now, type: personalityTypeOf(ctx.general),
            ...(lastInsult ? { refEvent: { ...lastInsult, label: lastInsult.label ?? '被冷遇' } } : {}),
            ...(ctx.seasonLabel ? { seasonLabel: ctx.seasonLabel } : {}),
        });
        ledger.defiedSeason = now;
        this._state.requests = trimRequests([...this._state.requests, letter]);
        return { ...letter };
    }

    public mailbox(): MindRequest[] {
        const rank = (r: MindRequest): number => (r.status === 'PENDING' ? 0 : 1);
        // 走 snapshot 取得深拷貝與固定欄位順序（與存檔來回後逐字相同）
        return [...this.snapshot().requests].sort((a, b) => rank(a) - rank(b) || b.season - a.season || (a.id < b.id ? -1 : 1));
    }

    public pendingRequests(): MindRequest[] {
        return this.mailbox().filter(r => r.status === 'PENDING');
    }

    public unreadRequestCount(): number {
        return this._state.requests.filter(r => !r.read && r.status === 'PENDING').length;
    }

    public markRequestRead(id: string): void {
        const req = this._state.requests.find(r => r.id === id);
        if (req) req.read = true;
    }

    public resolveRequest(id: string, accept: boolean, ctx: MindContext = {}): MindResolveResult {
        const req = this._state.requests.find(r => r.id === id);
        if (!req || req.status !== 'PENDING') return { ok: false, reply: '', events: [] };
        const season = ctx.season ?? this._now;
        const eff = effectsOfResolution(req, accept, season, ctx, season);
        const events: MindEvent[] = [];
        for (const input of eff.events) events.push(...this.record(input).events);
        req.status = eff.status;
        req.reply = eff.reply;
        req.read = true;
        if (eff.denied) this._setCooldown(req.generalId, req.kind, nextAllowedAfterDenied(req.season));
        else if (accept && isMajorKind(req.kind)) this._setCooldown(req.generalId, req.kind, nextAllowedAfterGrantedMajor(req.season));
        if (eff.redeemTag) {
            const ledger = this._state.ledger[req.generalId];
            if (ledger) ledger.redeemTag = eff.redeemTag;
        }
        this._now = Math.max(this._now, season);
        return { ok: true, request: { ...req }, reply: eff.reply, events, ...(eff.hook ? { hook: eff.hook } : {}) };
    }

    public grantedBattleRequests(): MindRequest[] {
        return this.mailbox().filter(r => r.kind === 'ASK_BATTLE' && r.status === 'GRANTED' && !r.consumed);
    }

    public consumeBattleRequest(requestId: string): boolean {
        const req = this._state.requests.find(r => r.id === requestId);
        if (!req || req.kind !== 'ASK_BATTLE' || req.status !== 'GRANTED' || req.consumed) return false;
        req.consumed = true;
        return true;
    }

    public experienceWeights(generalIds: readonly string[], season?: number): Record<string, number> {
        const now = season ?? this._now;
        const out: Record<string, number> = {};
        for (const id of generalIds) out[id] = experienceWeightOf(this._state.events[id] ?? [], this._state.ledger[id], now);
        return out;
    }

    private _setCooldown(generalId: string, kind: string, nextAllowed: number): void {
        const row = this._state.cooldowns[generalId] ?? {};
        row[kind] = Math.max(row[kind] ?? -1, nextAllowed);
        this._state.cooldowns[generalId] = row;
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
        // 請求往來（稱讚、被罵、無視、批准）不算「被派上用場」，不會解除冷落
        if (ACTIVE_KINDS.has(event.kind)) {
            ledger.lastActiveSeason = Math.max(ledger.lastActiveSeason, event.season);
            ledger.idleSeasons = 0;
        }
        if (event.kind === 'PRAISED') ledger.lastPraiseSeason = Math.max(ledger.lastPraiseSeason, event.season);
        if (event.kind === 'DUEL' && event.outcome === 'FAIL' && event.partnerId && !ledger.grudges.includes(event.partnerId)) {
            ledger.grudges = [...ledger.grudges, event.partnerId].slice(-MIND_CONFIG.learning.grudgeCap);
        }
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
