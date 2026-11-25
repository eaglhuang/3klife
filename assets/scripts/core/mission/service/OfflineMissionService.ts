/**
 * OfflineMissionService — 離線單機的任務服務（實作 IMissionService）
 *
 * 持有 MissionSaveV2 記憶體狀態；全部規則呼叫 core/mission 的純函式；副作用以帳本交給宿主 ports 套用。
 * 日後接 server：換成 HttpMissionService 實作同一介面，投影（真相不出伺服器）自然成立。
 *
 * 規則重點（使用者裁決）：
 *  - 再探遞增 +35／+25／+15、單靠再探最高 90（MissionIntel）；等待每任務一次。
 *  - 派遣當下鎖定情報度、分支與實際成功率（lockDispatch），之後再探／等待都不影響。
 *  - 委任選將吃武將記憶：host.affinityOf → evaluateAllCandidates → pickDelegate。
 *  - 候選武將全員列出（來自 host.generals()＝真實名冊），不可派者附全部原因；不會退回任何設計稿武將。
 *  - 大失敗才受傷 1～2 季、被俘只在高難度（由 MissionResolver 的懲罰上限保證）。
 */
import { MissionBalance, DEFAULT_MISSION_BALANCE, clampNumber } from '../MissionBalance';
import { findBranch } from '../MissionBranch';
import {
    expireMissions, applyChainSpawn, refillBoards, releasePendingSpawns, wallOf, type MissionBoardsConfig,
} from '../MissionBoardRules';
import { blocksOf, evaluateAllCandidates, pickDelegate, type CandidateEval } from '../MissionFitness';
import { chainTotalOf } from '../MissionChain';
import { applyRecon, applyWait, intelBandOf, scoutIntelBonus, clampIntel } from '../MissionIntel';
import type { MissionDataBundle } from '../MissionLoader';
import { projectMission, projectRate } from '../MissionProjection';
import { deriveUnit } from '../MissionRng';
import { lockDispatch, MissionEngineError, resolveMission } from '../MissionResolver';
import { createEmptyMissionSave, normalizeMissionSave } from '../MissionSave';
import { isMissionDue } from '../MissionSpawn';
import {
    LEGACY_FLAT_BRANCH_ID, MISSION_BLOCK_TEXT, MISSION_TIER_TEXT, type MissionBlock, type MissionDefinition, type MissionGeneralFacts, type MissionInstance,
    type MissionLedgerEntry, type MissionRecord, type MissionSyncSnapshot, type MissionTier,
} from '../MissionTypes';
import type {
    AdvanceSeasonCommand, BoardQuery, CandidateView, DispatchCommand, DispatchResult, IMissionService, MissionBoardView,
    MissionCardView, MissionChangedEvent, MissionErrorCode, MissionEvent, MissionRecordView, MissionResult, MissionShortage,
    MissionUnsubscribe, ReconCommand, ReconResult, SeasonSettlementView, SettledMissionView, WaitCommand, WaitResult,
} from './IMissionService';
import type { MissionDetailView } from '../MissionTypes';
import type { MissionHostPort, MissionSettlementInfo } from './MissionPorts';

const TIER_TEXT = MISSION_TIER_TEXT;
const ERROR_TEXT: Record<MissionErrorCode, string> = {
    NO_MISSION: '此任務已不存在', NOT_OPEN: '任務已在進行中', BLOCKED: '這位武將現在不能出任務', SHORT_RESOURCE: '資源不足',
    ALREADY_WAITED: '此任務已等待過', INTEL_FULL: '情報已無法再靠再探提高', REVISION_CONFLICT: '任務資料已更新，請重新開啟',
    DUP_REQUEST: '重複的請求', NO_EXECUTOR: '目前沒有可派的武將',
};
const RESULT_CACHE_LIMIT = 64;

function fail<T>(code: MissionErrorCode, text?: string, need?: MissionShortage[]): MissionResult<T> {
    return { ok: false, code, text: text ?? ERROR_TEXT[code], ...(need ? { need } : {}) };
}

function cloneSnapshot(s: MissionSyncSnapshot): MissionSyncSnapshot {
    return JSON.parse(JSON.stringify(s)) as MissionSyncSnapshot;
}

export class OfflineMissionService implements IMissionService {
    private _snap: MissionSyncSnapshot;
    private readonly _listeners = new Set<(e: MissionChangedEvent) => void>();
    private readonly _results = new Map<string, MissionResult<unknown>>();

    constructor(
        private readonly _data: MissionDataBundle,
        private readonly _host: MissionHostPort,
        snapshot?: MissionSyncSnapshot | null,
        seed = 1,
    ) {
        this._snap = snapshot ? cloneSnapshot(snapshot) : createEmptyMissionSave(seed, _host.season());
    }

    private get _balance(): MissionBalance { return this._data.balance ?? DEFAULT_MISSION_BALANCE; }

    // ───────────────────────── 內部工具 ─────────────────────────

    private _def(inst: Pick<MissionInstance, 'defId'>): MissionDefinition | undefined { return this._data.defs.get(inst.defId); }

    private _find(missionId: string): MissionInstance | undefined { return this._snap.missions.find(m => m.id === missionId); }

    /** 真實名冊 ＋ 任務服務自己持有的阻擋（任務中、受傷、被俘） */
    private _generals(volunteers?: ReadonlySet<string>): MissionGeneralFacts[] {
        const season = this._host.season();
        const busy = new Set<string>();
        for (const m of this._snap.missions) if (m.status === 'ACTIVE' && m.dispatch) for (const id of m.dispatch.generalIds) busy.add(id);
        return this._host.generals().map(g => {
            const block: MissionBlock[] = g.block.slice();
            const st = this._snap.generalStates?.[g.id];
            if (st?.injuredUntil !== undefined && season < st.injuredUntil && block.indexOf('injured') < 0) block.push('injured');
            if (st?.capturedUntil !== undefined && season < st.capturedUntil && block.indexOf('captive') < 0) block.push('captive');
            if (busy.has(g.id) && block.indexOf('on-mission') < 0) block.push('on-mission');
            return { ...g, block, ...(volunteers?.has(g.id) ? { volunteer: true } : {}) };
        });
    }

    private _touch(reason: MissionChangedEvent['reason']): void {
        this._snap.revision += 1;
        this._host.persist?.();
        for (const cb of Array.from(this._listeners)) cb({ revision: this._snap.revision, reason });
    }

    private _ok<T>(value: T, ledger: MissionLedgerEntry[] = [], events: MissionEvent[] = []): MissionResult<T> {
        return { ok: true, value, revision: this._snap.revision, ledger, events };
    }

    /** 冪等：同 requestId 回傳第一次的結果；baseRevision 不符回報衝突 */
    private async _guard<T>(cmd: { requestId: string; baseRevision?: number }, run: () => Promise<MissionResult<T>> | MissionResult<T>): Promise<MissionResult<T>> {
        const cached = this._results.get(cmd.requestId);
        if (cached) return cached as MissionResult<T>;
        if (cmd.baseRevision !== undefined && cmd.baseRevision !== this._snap.revision) return fail('REVISION_CONFLICT');
        const result = await run();
        this._results.set(cmd.requestId, result);
        if (this._results.size > RESULT_CACHE_LIMIT) this._results.delete(this._results.keys().next().value as string);
        return result;
    }

    private _shortages(cost: { grain: number; gold: number; silver: number; troops: number }): MissionShortage[] {
        const have = this._host.stock();
        const out: MissionShortage[] = [];
        if (have.grain < cost.grain) out.push({ resource: 'grain', need: cost.grain, have: have.grain });
        if (have.troops < cost.troops) out.push({ resource: 'troops', need: cost.troops, have: have.troops });
        if (have.gold < cost.gold) out.push({ resource: 'gold', need: cost.gold, have: have.gold });
        if (have.silver < cost.silver) out.push({ resource: 'silver', need: cost.silver, have: have.silver });
        return out;
    }

    // ───────────────────────── 板子 ─────────────────────────

    /** 資料已綁定、板子是空的或不滿時補板（新局、v0 舊檔、遷移後）；回傳是否有新增任務 */
    public ensureBoards(): boolean {
        const before = this._snap.missions.length;
        this._refill(this._host.season());
        if (this._snap.missions.length !== before) { this._touch('spawned'); return true; }
        return false;
    }

    private _refill(season: number): string[] {
        const r = refillBoards(this._snap, this._data.catalog, this._data.defs, this._data.boards as MissionBoardsConfig, this._data.themes, {
            season, visibleDifficulties: this._host.visibleDifficulties(this._host.rankTier()), fame: this._host.fame(),
        });
        this._snap = r.snapshot;
        return r.spawned.map(m => m.id);
    }

    public getBoard(q: BoardQuery = {}): MissionResult<MissionBoardView> {
        const names = new Map(this._host.generals().map(g => [g.id, g.name]));
        const cards: MissionCardView[] = [];
        for (const inst of this._snap.missions) {
            if (q.status && inst.status !== q.status) continue;
            if (q.theme && inst.theme !== q.theme) continue;
            const card = this._cardOf(inst, names);
            if (card) cards.push(card);
        }
        return this._ok({ revision: this._snap.revision, season: this._host.season(), missions: cards });
    }

    private _cardOf(inst: MissionInstance, names: ReadonlyMap<string, string>): MissionCardView | null {
        const def = this._def(inst);
        const lock = inst.dispatch;
        const base = {
            id: inst.id, theme: inst.theme, intel: lock ? lock.intelAtDispatch : inst.intel,
            intelBand: intelBandOf(lock ? lock.intelAtDispatch : inst.intel, this._balance), status: inst.status, expireSeason: inst.expireSeason,
            ...(lock ? { executorName: names.get(lock.generalIds[0]) ?? lock.generalIds[0], executorId: lock.generalIds[0], returnSeason: lock.returnSeason } : {}),
            ...(inst.chainFrom && def ? { chain: { depth: inst.chainDepth ?? 2, total: chainTotalOf(this._data.defs, def.id, inst.chainDepth ?? 2) } } : {}),
        };
        if (inst.legacy && (!def || lock?.branchId === LEGACY_FLAT_BRANCH_ID)) {
            const pct = lock ? Math.round(lock.rate * 100) : 0;
            return {
                ...base, defId: inst.defId, title: inst.legacy.title, difficulty: inst.legacy.difficulty,
                rate: { state: 'exact', text: `${pct}%`, value: pct }, reward: { state: 'hidden', text: '依原定獎勵' },
            };
        }
        if (!def) return null;
        const view = this._project(inst, def, null);
        return { ...base, defId: def.id, title: def.text.title, difficulty: def.difficulty, rate: view.rate, reward: view.reward };
    }

    private _project(inst: MissionInstance, def: MissionDefinition, general: MissionGeneralFacts | null): MissionDetailView {
        return projectMission({
            def, instance: inst, saveSeed: this._snap.rng.seed, flags: this._snap.flags, general,
            executorAffinity: general ? this._host.affinityOf(general.id, def) : 0, balance: this._balance,
        });
    }

    // ───────────────────────── 詳情與候選 ─────────────────────────

    private _evalAll(inst: MissionInstance, def: MissionDefinition): { rows: CandidateEval[]; facts: MissionGeneralFacts[] } {
        const facts = this._generals(this._host.volunteerIdsFor(def));
        const affinity: Record<string, number> = {};
        for (const g of facts) affinity[g.id] = this._host.affinityOf(g.id, def);
        const rows = evaluateAllCandidates(def, inst, facts, this._snap.flags, { balance: this._balance, affinityByGeneral: affinity });
        return { rows, facts };
    }

    public getDetail(missionId: string, opts: { generalId?: string } = {}): MissionResult<MissionDetailView> {
        const inst = this._find(missionId);
        const def = inst ? this._def(inst) : undefined;
        if (!inst) return fail('NO_MISSION');
        if (!def) {
            // 舊檔進行中、對應不到新定義的任務：只給最基本的資訊（不重擲、不外洩任何真相）
            const lg = inst.legacy;
            if (!lg) return fail('NO_MISSION');
            return this._ok({
                id: inst.id, defId: inst.defId, title: lg.title, brief: '', theme: inst.theme, difficulty: lg.difficulty, intel: inst.intel,
                intelBand: intelBandOf(inst.intel, this._balance), facts: [], objective: { state: 'hidden', text: '' }, hints: [],
                rate: { state: 'exact', text: `${Math.round((inst.dispatch?.rate ?? 0) * 100)}%` }, risk: { state: 'hidden', text: '' }, riskTags: [],
                reward: { state: 'hidden', text: '' }, hiddenRewards: [], cost: { grain: 0, troops: 0, gold: 0, silver: 0, energy: 0 }, durationSeasons: 1,
                expireSeason: inst.expireSeason, status: inst.status, canRecon: false, canWait: false,
            });
        }
        let general: MissionGeneralFacts | null = null;
        if (inst.status === 'OPEN') {
            const { rows, facts } = this._evalAll(inst, def);
            const pick = opts.generalId ? opts.generalId : (pickDelegate(rows)?.generalId ?? null);
            general = pick ? facts.find(g => g.id === pick) ?? null : null;
        }
        return this._ok(this._project(inst, def, general));
    }

    public getCandidates(missionId: string): MissionResult<CandidateView[]> {
        const inst = this._find(missionId);
        const def = inst ? this._def(inst) : undefined;
        if (!inst || !def) return fail('NO_MISSION');
        const { rows } = this._evalAll(inst, def);
        return this._ok(rows.map(r => ({
            generalId: r.generalId, name: r.name, block: r.block,
            blockText: r.block.map(b => MISSION_BLOCK_TEXT[b]).join('、'),
            rate: projectRate(r.rate, inst.intel, inst.id, this._snap.rng.seed, this._balance),
            volunteer: r.volunteer, memoryHint: this._host.memoryHintOf(r.generalId, def),
        })));
    }

    public getHistory(q: { limit?: number } = {}): MissionResult<MissionRecordView[]> {
        const list = this._snap.history.slice().reverse();
        return this._ok(q.limit ? list.slice(0, q.limit) : list);
    }

    // ───────────────────────── 動作 ─────────────────────────

    public recon(cmd: ReconCommand): Promise<MissionResult<ReconResult>> {
        return this._guard(cmd, () => {
            const inst = this._find(cmd.missionId);
            const def = inst ? this._def(inst) : undefined;
            if (!inst || !def) return fail<ReconResult>('NO_MISSION');
            if (inst.status !== 'OPEN') return fail<ReconResult>('NOT_OPEN');
            const bal = this._balance;
            let scout: MissionGeneralFacts | null = null;
            if (cmd.scoutGeneralId) {
                scout = this._generals().find(g => g.id === cmd.scoutGeneralId) ?? null;
                if (!scout) return fail<ReconResult>('NO_EXECUTOR', '找不到這位斥候');
                const blocks = blocksOf(scout, bal.recon.scoutEnergy);
                if (blocks.length > 0) return fail<ReconResult>('BLOCKED', `${scout.name}${blocks.map(b => MISSION_BLOCK_TEXT[b]).join('、')}，不能當斥候`);
            }
            const r = applyRecon(def, inst, scoutIntelBonus(scout, bal), bal);
            if (r.ok === false) return fail<ReconResult>(r.code === 'NOT_OPEN' ? 'NOT_OPEN' : 'INTEL_FULL');
            const cost = { grain: bal.recon.grainCost, gold: 0, silver: 0, troops: 0 };
            const short = this._shortages(cost);
            if (short.length > 0) return fail<ReconResult>('SHORT_RESOURCE', `糧草不足，再探需要 ${cost.grain}（現有 ${short[0].have}）`, short);
            if (!this._host.spend(cost)) return fail<ReconResult>('SHORT_RESOURCE', '糧草不足', this._shortages(cost));
            if (scout) this._host.drainEnergy(scout.id, bal.recon.scoutEnergy);
            inst.intel = r.intel;
            inst.reconCount = r.reconCount;
            this._touch('recon');
            return this._ok<ReconResult>(
                { missionId: inst.id, intel: r.intel, gained: r.gained, intelBand: intelBandOf(r.intel, bal), reconCount: r.reconCount },
                [], [{ kind: 'recon', missionId: inst.id, text: `情報 +${r.gained}` }],
            );
        });
    }

    public wait(cmd: WaitCommand): Promise<MissionResult<WaitResult>> {
        return this._guard(cmd, () => {
            const inst = this._find(cmd.missionId);
            const def = inst ? this._def(inst) : undefined;
            if (!inst || !def) return fail<WaitResult>('NO_MISSION');
            const r = applyWait(def, inst, this._balance);
            if (r.ok === false) return fail<WaitResult>(r.code === 'ALREADY_WAITED' ? 'ALREADY_WAITED' : 'NOT_OPEN');
            inst.intel = r.intel;
            inst.waited = true;
            inst.expireSeason = r.expireSeason;
            this._touch('wait');
            return this._ok<WaitResult>({ missionId: inst.id, intel: r.intel, gained: r.gained, expireSeason: r.expireSeason }, [], [{ kind: 'wait', missionId: inst.id, text: `情報 +${r.gained}，期限延長` }]);
        });
    }

    public dispatch(cmd: DispatchCommand): Promise<MissionResult<DispatchResult>> {
        return this._guard(cmd, () => {
            const inst = this._find(cmd.missionId);
            const def = inst ? this._def(inst) : undefined;
            if (!inst || !def) return fail<DispatchResult>('NO_MISSION');
            if (inst.status !== 'OPEN') return fail<DispatchResult>('NOT_OPEN');
            const { rows, facts } = this._evalAll(inst, def);
            const delegated = cmd.generalIds === 'delegate';
            let general: MissionGeneralFacts | undefined;
            if (delegated) {
                const pick = pickDelegate(rows);
                if (!pick) return fail<DispatchResult>('NO_EXECUTOR');
                general = facts.find(g => g.id === pick.generalId);
            } else {
                const id = cmd.generalIds[0];
                if (!id) return fail<DispatchResult>('NO_EXECUTOR');
                const row = rows.find(r => r.generalId === id);
                if (!row) return fail<DispatchResult>('NO_EXECUTOR', '名冊裡沒有這位武將');
                if (row.block.length > 0) return fail<DispatchResult>('BLOCKED', `${row.name}${row.block.map(b => MISSION_BLOCK_TEXT[b]).join('、')}，無法出任務`);
                general = facts.find(g => g.id === id);
            }
            if (!general) return fail<DispatchResult>('NO_EXECUTOR');
            let locked: ReturnType<typeof lockDispatch>;
            try {
                locked = lockDispatch({
                    def, instance: inst, general, flags: this._snap.flags, season: this._host.season(), delegated,
                    executorAffinity: this._host.affinityOf(general.id, def), balance: this._balance,
                });
            } catch (e) {
                if (e instanceof MissionEngineError) return fail<DispatchResult>('BLOCKED', e.message);
                throw e;
            }
            const { lock, cost } = locked;
            const short = this._shortages(cost);
            if (short.length > 0) return fail<DispatchResult>('SHORT_RESOURCE', short.map(s => `${RES_NAME[s.resource]}不足（需 ${s.need}，現有 ${s.have}）`).join('、'), short);
            if (!this._host.spend({ grain: cost.grain, gold: cost.gold, silver: cost.silver, troops: cost.troops })) return fail<DispatchResult>('SHORT_RESOURCE', '資源不足', this._shortages(cost));
            this._host.drainEnergy(general.id, cost.energy);
            inst.status = 'ACTIVE';
            inst.dispatch = lock;
            this._touch('dispatch');
            return this._ok<DispatchResult>(
                { missionId: inst.id, generalIds: lock.generalIds.slice(), delegated, returnSeason: lock.returnSeason, cost },
                [], [{ kind: 'dispatch', missionId: inst.id, text: `${general.name}出發` }],
            );
        });
    }

    // ───────────────────────── 換季 ─────────────────────────

    /** 換季：到期結算 → 過期 → 延後連鎖 → 補板（呼叫時宿主的季已經是新季） */
    public advanceSeason(cmd: AdvanceSeasonCommand): Promise<MissionResult<SeasonSettlementView>> {
        return this._guard(cmd, () => {
            const season = this._host.season();
            this._snap.season = season;
            const events: MissionEvent[] = [];
            const ledgerAll: MissionLedgerEntry[] = [];
            const settled: SettledMissionView[] = [];
            const spawned: string[] = [];

            const due = this._snap.missions.filter(m => isMissionDue(m, season)).sort((a, b) => (a.id < b.id ? -1 : 1));
            const names = new Map(this._host.generals().map(g => [g.id, g.name]));
            for (const inst of due) {
                const view = this._settle(inst, season, names, ledgerAll, spawned);
                if (view) {
                    settled.push(view);
                    events.push({ kind: 'settled', missionId: inst.id, text: `${view.title}：${TIER_TEXT[view.tier]}` });
                }
            }
            this._snap.missions = this._snap.missions.filter(m => !due.some(d => d.id === m.id));

            const ex = expireMissions(this._snap, season);
            this._snap = ex.snapshot;
            const expired = ex.expired.map(m => m.id);
            for (const id of expired) events.push({ kind: 'expired', missionId: id, text: '任務已過期' });

            const rel = releasePendingSpawns(this._snap, this._data.defs, season);
            this._snap = rel.snapshot;
            spawned.push(...rel.spawned.map(m => m.id));

            // 到期的受傷／被俘狀態清掉
            const states = this._snap.generalStates ?? {};
            for (const id of Object.keys(states)) {
                const st = states[id];
                if (st.injuredUntil !== undefined && season >= st.injuredUntil) delete st.injuredUntil;
                if (st.capturedUntil !== undefined && season >= st.capturedUntil) delete st.capturedUntil;
                if (st.injuredUntil === undefined && st.capturedUntil === undefined) delete states[id];
            }

            spawned.push(...this._refill(season));
            for (const id of spawned) events.push({ kind: 'spawned', missionId: id, text: '新任務' });
            this._snap.history = this._snap.history.slice(-this._balance.recordLimit);
            this._touch('settled');
            return this._ok<SeasonSettlementView>({ season, settled, spawnedMissionIds: spawned, expiredMissionIds: expired }, ledgerAll, events);
        });
    }

    private _settle(inst: MissionInstance, season: number, names: ReadonlyMap<string, string>, ledgerAll: MissionLedgerEntry[], spawned: string[]): SettledMissionView | null {
        const lock = inst.dispatch;
        if (!lock) return null;
        const def = this._def(inst);
        const generalId = lock.generalIds[0];
        const facts = this._generals().find(g => g.id === generalId) ?? {
            id: generalId, name: names.get(generalId) ?? generalId, stats: {}, power: 0, vitality: 0, tags: [], block: [] as MissionBlock[],
        };
        const useLegacy = lock.branchId === LEGACY_FLAT_BRANCH_ID || !def || !findBranch(def, lock.branchId);
        let tier: MissionTier;
        let entries: MissionLedgerEntry[];
        let narratives: string[] = [];
        let trace: string[] = [];
        let branchId = lock.branchId;
        const title = def ? def.text.title : inst.legacy?.title ?? inst.defId;
        if (useLegacy) {
            const u = deriveUnit(this._snap.rng.seed, inst.id, 'resolve:legacy');
            const ok = u < lock.rate;
            tier = ok ? 'success' : 'fail';
            branchId = LEGACY_FLAT_BRANCH_ID;
            entries = [];
            const base = { missionId: inst.id, generalId, tier };
            if (ok && inst.legacy) {
                const rw = inst.legacy.rewards;
                if (rw.grain > 0) entries.push({ ...base, kind: 'resource', res: 'grain', amount: rw.grain });
                if (rw.gold > 0) entries.push({ ...base, kind: 'resource', res: 'gold', amount: rw.gold });
                if (rw.silver > 0) entries.push({ ...base, kind: 'resource', res: 'silver', amount: rw.silver });
                if (rw.generalExp > 0) entries.push({ ...base, kind: 'generalExp', amount: rw.generalExp });
            }
            trace = [`legacy-flat：擲值 ${u.toFixed(3)}，成功率 ${Math.round(lock.rate * 100)}%`];
        } else {
            const out = resolveMission({
                def: def as MissionDefinition, instance: inst, general: facts, saveSeed: this._snap.rng.seed, season, flags: this._snap.flags, balance: this._balance,
            });
            tier = out.tier;
            entries = out.effects;
            narratives = out.narratives;
            trace = out.trace.map(t => `${t.path}:${t.kind}${t.u !== undefined ? ` u=${t.u.toFixed(3)}` : ''}${t.p !== undefined ? ` p=${t.p.toFixed(2)}` : ''}${t.tier ? ` →${t.tier}` : ''}${t.matched ? ` [${t.matched}]` : ''}${t.note ? ` ${t.note}` : ''}`);
        }
        let injuredSeasons = 0;
        for (const e of entries) {
            injuredSeasons = Math.max(injuredSeasons, this._applyInternal(e, inst, season, spawned));
        }
        ledgerAll.push(...entries);
        const info: MissionSettlementInfo = {
            missionId: inst.id, defId: inst.defId, title, theme: inst.theme, wall: wallOf(inst, this._data.themes),
            difficulty: def ? def.difficulty : inst.legacy?.difficulty ?? 'EASY', generalId, branchId, tier, intelAtDispatch: lock.intelAtDispatch,
            delegated: lock.delegated, volunteered: facts.volunteer === true, legacy: useLegacy,
            ...(def?.sceneGambit ? { sceneGambit: def.sceneGambit } : {}), ...(def?.legacyTemplateId ? { legacyTemplateId: def.legacyTemplateId } : {}),
            season, narratives, tags: def ? def.tags.slice() : [], injuredSeasons,
        };
        this._host.applyLedger(entries, info);
        this._host.onSettled(info);
        const record: MissionRecord = {
            missionId: inst.id, defId: inst.defId, title, season, generalId, branchId, tier, intelAtDispatch: lock.intelAtDispatch, narratives,
        };
        this._snap.history.push(record);
        const gains: Record<string, number> = {};
        for (const e of entries) {
            if (e.kind === 'resource') gains[e.res] = (gains[e.res] ?? 0) + e.amount;
            else if (e.kind === 'generalExp' || e.kind === 'fame' || e.kind === 'officerExp') gains[e.kind] = (gains[e.kind] ?? 0) + e.amount;
        }
        const chain = inst.chainFrom && def
            ? { depth: inst.chainDepth ?? 2, total: chainTotalOf(this._data.defs, def.id, inst.chainDepth ?? 2), completed: (tier === 'critical' || tier === 'success') && !entries.some(e => e.kind === 'spawn') }
            : undefined;
        return { missionId: inst.id, title, generalId, generalName: facts.name, branchId, gains, tier, narratives, traceText: trace, ...(chain ? { chain } : {}) };
    }

    /** 服務自己持有的效果（旗標、連鎖、情報、解鎖、受傷／被俘）；回傳受傷季數 */
    private _applyInternal(e: MissionLedgerEntry, source: MissionInstance, season: number, spawned: string[]): number {
        switch (e.kind) {
            case 'flag': {
                if (e.set) this._snap.flags[e.set] = e.value ?? true;
                else if (e.inc) this._snap.flags[e.inc] = (Number(this._snap.flags[e.inc]) || 0) + (typeof e.value === 'number' ? e.value : 1);
                return 0;
            }
            case 'spawn': {
                const r = applyChainSpawn(this._snap, { defId: e.defId, intel: e.intel, afterSeasons: e.afterSeasons, expireSeasons: e.expireSeasons, chainFrom: source.id, chainDepth: (source.chainDepth ?? 1) + 1 }, this._data.defs, season);
                this._snap = r.snapshot;
                spawned.push(...r.spawned.map(m => m.id));
                return 0;
            }
            case 'intel': {
                const t = e.target;
                for (const m of this._snap.missions) {
                    if (m.status !== 'OPEN' || m.id === source.id) continue;
                    const d = this._def(m);
                    const hit = (t.defId !== undefined && m.defId === t.defId) || (t.tag !== undefined && !!d && d.tags.indexOf(t.tag) >= 0);
                    if (hit) m.intel = clampIntel(m.intel + e.delta);
                }
                if (t.nextSpawn) for (const p of this._snap.pending ?? []) p.intel = clampIntel((p.intel ?? 0) + e.delta);
                return 0;
            }
            case 'unlock': {
                if (!(this._snap.unlocks ?? []).includes(e.id)) (this._snap.unlocks as string[]).push(e.id);
                return 0;
            }
            case 'generalState': {
                if (e.state === 'exhausted' || !e.generalId) return 0;
                const states = (this._snap.generalStates ??= {});
                const st = (states[e.generalId] ??= {});
                if (e.state === 'injured') { st.injuredUntil = Math.max(st.injuredUntil ?? 0, season + e.seasons); return e.seasons; }
                st.capturedUntil = Math.max(st.capturedUntil ?? 0, season + e.seasons);
                return 0;
            }
            default: return 0;
        }
    }

    // ───────────────────────── 同步 ─────────────────────────

    public getSnapshot(): MissionSyncSnapshot { return cloneSnapshot(this._snap); }

    public loadSnapshot(s: MissionSyncSnapshot): void {
        const norm = normalizeMissionSave(s, this._balance.recordLimit);
        this._snap = norm ?? createEmptyMissionSave(s?.rng?.seed ?? 1, this._host.season());
        this._results.clear();
        for (const cb of Array.from(this._listeners)) cb({ revision: this._snap.revision, reason: 'load' });
    }

    public onChanged(cb: (e: MissionChangedEvent) => void): MissionUnsubscribe {
        this._listeners.add(cb);
        return () => { this._listeners.delete(cb); };
    }

    /** 武將目前被任務服務持有的阻擋（宿主查「武將在不在任務中」用） */
    public busyGeneralIds(): string[] {
        const out: string[] = [];
        for (const m of this._snap.missions) if (m.status === 'ACTIVE' && m.dispatch) out.push(...m.dispatch.generalIds);
        return out;
    }

    /** 進行中任務（宿主顯示「進行中、還有 N 季」用的最小資料） */
    public activeAssignments(): Record<string, string> {
        const out: Record<string, string> = {};
        for (const m of this._snap.missions) if (m.status === 'ACTIVE' && m.dispatch) out[m.id] = m.dispatch.generalIds[0];
        return out;
    }

    public clampForTest(v: number, lo: number, hi: number): number { return clampNumber(v, lo, hi); }
}

export const RES_NAME: Record<MissionShortage['resource'], string> = { grain: '糧草', troops: '兵源', gold: '金', silver: '銀兩', energy: '精力' };
