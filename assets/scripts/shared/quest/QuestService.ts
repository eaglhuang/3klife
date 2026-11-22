// @spec-source → 任務系統 Base 框架規格書 (doc_spec_1185) §4 共用 API、§9 驗收；共用框架總綱 (doc_spec_1182) §12 QST-M；PROG-2-9209
/**
 * QuestService — 任務實例的領域邏輯（零依賴、同步、不碰存檔與其他框架）。
 *
 * 一次命令的做法：由命令層用存檔狀態建一個 QuestService，呼叫方法、全部成功後才把 snapshot() 寫回；
 * 中途丟 QuestError 就整筆放棄（狀態不變）。占用（occupancy.*）與獎勵（reward.claim）是非同步的跨框架呼叫，
 * 由命令層夾在 begin／finish 之間處理，本服務完全不認識它們。
 *
 * 規則重點：
 * - 步驟：advance 帶 fromStep，已超過的重送回「沒推進」不報錯；跳級回 STEP_MISMATCH。
 * - 閘門：推進到 gate.at 就停，清閘（clearGate）前 gate.blocks 內的動作（預設 advance、settle）都被擋。
 * - 暫離：PAUSED 不能推進、不遞減倒數；tick 只扣 ACTIVE。
 * - 結算：beginSettle 判成敗等級、查獎勵套件；finishSettle 落帳。已結算重送回原結果。
 */
import type { Condition } from '../foundation/Condition';
import { findQuestDef } from './QuestConfig';
import {
    QUEST_LOG_LIMIT, QUEST_SETTLED_KEEP, QuestError,
    type QuestConfigV1, type QuestDef, type QuestGateDef, type QuestGateStatus, type QuestInstance, type QuestInstanceView,
    type QuestLogEntry, type QuestResultRecord, type QuestStateV1, type QuestTier,
} from './QuestTypes';

/** 任務種類 adapter：宿主（學府、大廳任務…）註冊，決定成敗等級；不寫任何資源 */
export interface QuestKindAdapter {
    taskKind: string;
    /** 步數滿且閘門都清之後判成敗等級；未提供＝success */
    judge?(instance: Readonly<QuestInstance>, def: Readonly<QuestDef>): QuestTier;
}

export interface QuestServiceDeps {
    config: QuestConfigV1;
    /** 條件評估（宿主以權威存檔評估）；定義有條件而這裡沒給就視為不成立 */
    evaluate?: (condition: Condition, instance: Readonly<QuestInstance> | null, def: Readonly<QuestDef>) => boolean;
    kinds?: Readonly<Record<string, QuestKindAdapter>>;
    /** 目前季序（宿主時鐘）；沒給就用 tick 的高水位 */
    nowIndex?: () => number;
}

export function emptyQuestState(): QuestStateV1 {
    return { v: 1, seq: 0, lastTick: null, instances: [] };
}

export function isEmptyQuestState(state: QuestStateV1): boolean {
    return state.seq === 0 && state.instances.length === 0 && state.lastTick === null;
}

const STATES = ['ACTIVE', 'PAUSED', 'SETTLED', 'ABANDONED', 'EXPIRED'];

function num(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeInstance(raw: unknown): QuestInstance | null {
    const r = raw as Partial<QuestInstance> | null;
    if (!r || typeof r !== 'object') return null;
    if (typeof r.qid !== 'string' || r.qid === '' || typeof r.defId !== 'string' || typeof r.taskKind !== 'string') return null;
    if (typeof r.state !== 'string' || STATES.indexOf(r.state) < 0) return null;
    const total = typeof r.total === 'number' && Number.isInteger(r.total) && r.total >= 1 ? r.total : 1;
    const step = typeof r.step === 'number' && Number.isInteger(r.step) ? Math.min(total, Math.max(0, r.step)) : 0;
    const res = r.result;
    const result: QuestResultRecord | null = res && typeof res === 'object'
        ? {
            tier: res.tier,
            bundleId: typeof res.bundleId === 'string' ? res.bundleId : null,
            grantId: typeof res.grantId === 'string' ? res.grantId : null,
            settledAt: num(res.settledAt, 0),
        }
        : null;
    return {
        qid: r.qid, defId: r.defId, taskKind: r.taskKind, state: r.state,
        acceptKey: typeof r.acceptKey === 'string' ? r.acceptKey : '',
        actors: Array.isArray(r.actors) ? r.actors.filter((a): a is string => typeof a === 'string') : [],
        step, total,
        clearedGates: Array.isArray(r.clearedGates) ? r.clearedGates.filter((g): g is string => typeof g === 'string') : [],
        remainingSeasons: typeof r.remainingSeasons === 'number' && Number.isFinite(r.remainingSeasons) ? r.remainingSeasons : null,
        openedAt: num(r.openedAt, 0),
        pausedAt: typeof r.pausedAt === 'number' && Number.isFinite(r.pausedAt) ? r.pausedAt : null,
        pauseReason: typeof r.pauseReason === 'string' ? r.pauseReason : null,
        occupancyRef: typeof r.occupancyRef === 'string' ? r.occupancyRef : null,
        log: Array.isArray(r.log)
            ? r.log.filter((e): e is QuestLogEntry => !!e && typeof e === 'object' && typeof e.kind === 'string').slice(-QUEST_LOG_LIMIT)
            : [],
        result,
    };
}

/** 存檔讀回：缺值、壞資料一律補成可用狀態，舊存檔沒有此欄位時得到空狀態 */
export function normalizeQuestState(raw: unknown): QuestStateV1 {
    const r = raw as Partial<QuestStateV1> | null;
    if (!r || typeof r !== 'object') return emptyQuestState();
    const instances: QuestInstance[] = [];
    for (const item of Array.isArray(r.instances) ? r.instances : []) {
        const inst = normalizeInstance(item);
        if (inst && !instances.some((x) => x.qid === inst.qid)) instances.push(inst);
    }
    return {
        v: 1,
        seq: typeof r.seq === 'number' && Number.isInteger(r.seq) && r.seq >= 0 ? r.seq : instances.length,
        lastTick: typeof r.lastTick === 'number' && Number.isFinite(r.lastTick) ? r.lastTick : null,
        instances,
    };
}

function isTerminal(state: QuestInstance['state']): boolean {
    return state === 'SETTLED' || state === 'ABANDONED' || state === 'EXPIRED';
}

export interface AdvanceOutcome {
    instance: QuestInstanceView;
    /** false＝這次沒推進（fromStep 已過，冪等重送） */
    advanced: boolean;
    stepsDone: number;
    /** 這次停在哪個閘門前；沒碰到為 null */
    gateReached: string | null;
}

export interface SettlePlan {
    /** true＝早已結算，直接回原結果，不需呼叫獎勵 */
    replay: boolean;
    tier: QuestTier;
    bundleId: string | null;
    instance: QuestInstanceView;
}

export class QuestService {
    private readonly _state: QuestStateV1;
    private readonly _deps: QuestServiceDeps;

    public constructor(state: QuestStateV1, deps: QuestServiceDeps) {
        this._state = JSON.parse(JSON.stringify(state)) as QuestStateV1;
        this._deps = deps;
    }

    public snapshot(): QuestStateV1 {
        return JSON.parse(JSON.stringify(this._state)) as QuestStateV1;
    }

    /** 目前季序 */
    public now(): number {
        const host = this._deps.nowIndex;
        if (host) return host();
        return this._state.lastTick ?? 0;
    }

    private _def(inst: QuestInstance): QuestDef {
        const def = findQuestDef(this._deps.config, inst.defId);
        if (!def) throw new QuestError('DEF_NOT_FOUND', `找不到任務定義 ${inst.defId}`);
        return def;
    }

    private _get(qid: string): QuestInstance {
        const inst = this._state.instances.find((i) => i.qid === qid);
        if (!inst) throw new QuestError('NOT_FOUND', `找不到任務 ${qid}`);
        return inst;
    }

    private _log(inst: QuestInstance, kind: QuestLogEntry['kind'], note?: string): void {
        inst.log.push({ at: this.now(), kind, step: inst.step, ...(note !== undefined ? { note } : {}) });
        if (inst.log.length > QUEST_LOG_LIMIT) inst.log.splice(0, inst.log.length - QUEST_LOG_LIMIT);
    }

    private _evaluate(cond: Condition | null, inst: QuestInstance | null, def: QuestDef): boolean {
        if (cond === null) return true;
        return this._deps.evaluate ? this._deps.evaluate(cond, inst, def) : false;
    }

    /** 目前卡住的閘門：已到達（at <= step）且尚未清除的第一個 */
    private _pendingGate(inst: QuestInstance, def: QuestDef): QuestGateDef | null {
        return def.gates.find((g) => g.at <= inst.step && inst.clearedGates.indexOf(g.id) < 0) ?? null;
    }

    private _gateStatus(inst: QuestInstance, gate: QuestGateDef): QuestGateStatus {
        if (inst.clearedGates.indexOf(gate.id) >= 0) return 'cleared';
        return gate.at <= inst.step ? 'pending' : 'locked';
    }

    /** 某個動作標籤此刻是否被閘門擋下（宿主做 enroll／dispatch 等動作前查） */
    public isActionBlocked(qid: string, action: string): boolean {
        const inst = this._get(qid);
        if (isTerminal(inst.state)) return false;
        const gate = this._pendingGate(inst, this._def(inst));
        return gate !== null && gate.blocks.indexOf(action) >= 0;
    }

    public view(inst: QuestInstance): QuestInstanceView {
        const def = findQuestDef(this._deps.config, inst.defId);
        const gates = def ? def.gates.map((g) => ({ id: g.id, at: g.at, status: this._gateStatus(inst, g) })) : [];
        const pending = def && !isTerminal(inst.state) ? this._pendingGate(inst, def) : null;
        return {
            qid: inst.qid, defId: inst.defId, taskKind: inst.taskKind, state: inst.state, actors: [...inst.actors],
            step: inst.step, total: inst.total, gates, pendingGate: pending ? pending.id : null,
            blockedActions: pending ? [...pending.blocks] : [],
            remainingSeasons: inst.remainingSeasons, openedAt: inst.openedAt, pausedAt: inst.pausedAt,
            result: inst.result ? { ...inst.result } : null, log: inst.log.map((e) => ({ ...e })),
        };
    }

    public query(filter: { qid?: string; actor?: string; state?: string; taskKind?: string } = {}): QuestInstanceView[] {
        return this._state.instances
            .filter((i) => (filter.qid === undefined || i.qid === filter.qid)
                && (filter.actor === undefined || i.actors.indexOf(filter.actor) >= 0)
                && (filter.state === undefined || i.state === filter.state)
                && (filter.taskKind === undefined || i.taskKind === filter.taskKind))
            .map((i) => this.view(i));
    }

    /** 接取。同 acceptKey 重送回同一張（created=false）；內容對不上回 KEY_CONFLICT。占用由命令層在之後登記 */
    public accept(input: { defId: string; actors: readonly string[]; acceptKey: string }): { instance: QuestInstanceView; created: boolean } {
        const def = findQuestDef(this._deps.config, input.defId);
        if (!def) throw new QuestError('DEF_NOT_FOUND', `找不到任務定義 ${input.defId}`);
        const actors = Array.from(new Set(input.actors));
        const existing = this._state.instances.find((i) => i.acceptKey === input.acceptKey);
        if (existing) {
            const same = existing.defId === def.id && existing.actors.length === actors.length && existing.actors.every((a) => actors.indexOf(a) >= 0);
            if (!same) throw new QuestError('KEY_CONFLICT', `acceptKey ${input.acceptKey} 已被 ${existing.defId} 使用`);
            return { instance: this.view(existing), created: false };
        }
        if (actors.length !== input.actors.length || actors.length < def.actors.min || actors.length > def.actors.max
            || actors.some((a) => typeof a !== 'string' || a === '')) {
            throw new QuestError('ACTOR_INVALID', `執行者需 ${def.actors.min}～${def.actors.max} 位且不重複`);
        }
        if (!this._evaluate(def.acceptWhen, null, def)) throw new QuestError('CONDITION_UNMET', `任務 ${def.id} 接取條件未達`);
        const now = this.now();
        if (this._state.lastTick === null) this._state.lastTick = now;
        this._state.seq += 1;
        const qid = `q_${this._state.seq}`;
        const inst: QuestInstance = {
            qid, defId: def.id, taskKind: def.taskKind, state: 'ACTIVE', acceptKey: input.acceptKey, actors,
            step: 0, total: def.steps, clearedGates: [], remainingSeasons: def.countdownSeasons,
            openedAt: now, pausedAt: null, pauseReason: null,
            occupancyRef: def.occupancy ? `quest:${qid}` : null, log: [], result: null,
        };
        this._state.instances.push(inst);
        this._log(inst, 'accept');
        this._prune();
        return { instance: this.view(inst), created: true };
    }

    /** 占用的登記資料（命令層用）；沒有占用的定義回 null */
    public occupancyOf(qid: string): { kind: string; refId: string; actors: string[] } | null {
        const inst = this._get(qid);
        const def = this._def(inst);
        return def.occupancy && inst.occupancyRef ? { kind: def.occupancy, refId: inst.occupancyRef, actors: [...inst.actors] } : null;
    }

    /** 暫離時是否要釋放占用 */
    public releasesOnPause(qid: string): boolean {
        return this._def(this._get(qid)).releaseOnPause;
    }

    public advance(input: { qid: string; fromStep: number; steps?: number }): AdvanceOutcome {
        const inst = this._get(input.qid);
        const def = this._def(inst);
        if (!Number.isInteger(input.fromStep) || input.fromStep < 0) throw new QuestError('INVALID', 'fromStep 必須是非負整數');
        const want = input.steps === undefined ? 1 : input.steps;
        if (!Number.isInteger(want) || want < 1 || want > inst.total) throw new QuestError('INVALID', `steps 必須是 1～${inst.total} 的整數`);
        if (inst.state === 'PAUSED') throw new QuestError('BAD_STATE', `任務 ${inst.qid} 暫離中，先 resume`);
        if (inst.state !== 'ACTIVE') throw new QuestError('BAD_STATE', `任務 ${inst.qid} 已是 ${inst.state}`);
        if (input.fromStep < inst.step) return { instance: this.view(inst), advanced: false, stepsDone: 0, gateReached: null };
        if (input.fromStep > inst.step) throw new QuestError('STEP_MISMATCH', `目前在第 ${inst.step} 步，不是 ${input.fromStep}`);
        const pending = this._pendingGate(inst, def);
        if (pending && pending.blocks.indexOf('advance') >= 0) throw new QuestError('GATE_PENDING', `閘門 ${pending.id}（第 ${pending.at} 步）尚未清除`);
        if (inst.step >= inst.total) throw new QuestError('BAD_STATE', `任務 ${inst.qid} 已走完所有步驟，請 settle`);
        let done = 0;
        let gateReached: string | null = null;
        while (done < want && inst.step < inst.total) {
            inst.step += 1;
            done += 1;
            this._log(inst, 'advance');
            const gate = def.gates.find((g) => g.at === inst.step && inst.clearedGates.indexOf(g.id) < 0);
            if (gate) {
                gateReached = gate.id;
                this._log(inst, 'gate', gate.id);
                break;
            }
        }
        return { instance: this.view(inst), advanced: true, stepsDone: done, gateReached };
    }

    /** 清閘：已清除回 changed=false；還沒走到那一步回 NOT_READY；條件不成立回 CONDITION_UNMET */
    public clearGate(input: { qid: string; gateId: string }): { instance: QuestInstanceView; changed: boolean } {
        const inst = this._get(input.qid);
        const def = this._def(inst);
        const gate = def.gates.find((g) => g.id === input.gateId);
        if (!gate) throw new QuestError('INVALID', `任務 ${def.id} 沒有閘門 ${input.gateId}`);
        if (inst.clearedGates.indexOf(gate.id) >= 0) return { instance: this.view(inst), changed: false };
        if (inst.state !== 'ACTIVE') throw new QuestError('BAD_STATE', `任務 ${inst.qid} 是 ${inst.state}，不能清閘`);
        if (gate.at > inst.step) throw new QuestError('NOT_READY', `還沒走到閘門 ${gate.id}（第 ${gate.at} 步）`);
        if (!this._evaluate(gate.clearWhen, inst, def)) throw new QuestError('CONDITION_UNMET', `閘門 ${gate.id} 的清閘條件未達`);
        inst.clearedGates.push(gate.id);
        this._log(inst, 'clearGate', gate.id);
        return { instance: this.view(inst), changed: true };
    }

    /** 暫離：冪等（已暫離回 changed=false）。終局狀態回 BAD_STATE */
    public pause(input: { qid: string; reason?: string }): { instance: QuestInstanceView; changed: boolean } {
        const inst = this._get(input.qid);
        if (inst.state === 'PAUSED') return { instance: this.view(inst), changed: false };
        if (inst.state !== 'ACTIVE') throw new QuestError('BAD_STATE', `任務 ${inst.qid} 是 ${inst.state}，不能暫離`);
        inst.state = 'PAUSED';
        inst.pausedAt = this.now();
        inst.pauseReason = input.reason ?? null;
        this._log(inst, 'pause', input.reason);
        return { instance: this.view(inst), changed: true };
    }

    public resume(input: { qid: string }): { instance: QuestInstanceView; changed: boolean } {
        const inst = this._get(input.qid);
        if (inst.state === 'ACTIVE') return { instance: this.view(inst), changed: false };
        if (inst.state !== 'PAUSED') throw new QuestError('BAD_STATE', `任務 ${inst.qid} 是 ${inst.state}，不能恢復`);
        inst.state = 'ACTIVE';
        inst.pausedAt = null;
        inst.pauseReason = null;
        this._log(inst, 'resume');
        return { instance: this.view(inst), changed: true };
    }

    /**
     * 季推進：以高水位冪等（nowIndex 不大於已處理的不動）。只扣 ACTIVE 的倒數；PAUSED 完全不動。
     * 倒數歸零的轉 EXPIRED，回傳它們給命令層釋放占用。
     */
    public tick(nowIndex: number): { delta: number; expired: QuestInstanceView[] } {
        if (!Number.isInteger(nowIndex) || nowIndex < 0) throw new QuestError('INVALID', 'nowIndex 必須是非負整數');
        const last = this._state.lastTick;
        const delta = last === null ? 0 : Math.max(0, nowIndex - last);
        this._state.lastTick = last === null ? nowIndex : Math.max(last, nowIndex);
        const expired: QuestInstanceView[] = [];
        if (delta > 0) {
            for (const inst of this._state.instances) {
                if (inst.state !== 'ACTIVE' || inst.remainingSeasons === null) continue;
                inst.remainingSeasons = Math.max(0, inst.remainingSeasons - delta);
                if (inst.remainingSeasons === 0) {
                    inst.state = 'EXPIRED';
                    this._log(inst, 'expire');
                    expired.push(this.view(inst));
                }
            }
        }
        return { delta, expired };
    }

    /** 結算前置：驗證可結算、判成敗等級、查獎勵套件。已結算回 replay=true 與原結果 */
    public beginSettle(qid: string): SettlePlan {
        const inst = this._get(qid);
        const def = this._def(inst);
        if (inst.state === 'SETTLED' && inst.result) {
            return { replay: true, tier: inst.result.tier, bundleId: inst.result.bundleId, instance: this.view(inst) };
        }
        if (inst.state === 'PAUSED') throw new QuestError('BAD_STATE', `任務 ${inst.qid} 暫離中，先 resume`);
        if (inst.state !== 'ACTIVE') throw new QuestError('BAD_STATE', `任務 ${inst.qid} 已是 ${inst.state}`);
        const pending = this._pendingGate(inst, def);
        if (pending && pending.blocks.indexOf('settle') >= 0) throw new QuestError('GATE_PENDING', `閘門 ${pending.id}（第 ${pending.at} 步）尚未清除`);
        if (inst.step < inst.total) throw new QuestError('NOT_READY', `任務 ${inst.qid} 只走了 ${inst.step}/${inst.total} 步`);
        const adapter = this._deps.kinds ? this._deps.kinds[inst.taskKind] : undefined;
        const tier = adapter && adapter.judge ? adapter.judge(inst, def) : 'success';
        return { replay: false, tier, bundleId: def.outcome[tier].reward, instance: this.view(inst) };
    }

    /** 結算落帳（獎勵已成功入帳之後才呼叫） */
    public finishSettle(input: { qid: string; tier: QuestTier; bundleId: string | null; grantId: string | null }): QuestInstanceView {
        const inst = this._get(input.qid);
        if (inst.state === 'SETTLED') return this.view(inst);
        inst.state = 'SETTLED';
        inst.result = { tier: input.tier, bundleId: input.bundleId, grantId: input.grantId, settledAt: this.now() };
        this._log(inst, 'settle', input.tier);
        this._prune();
        return this.view(inst);
    }

    /** 放棄：冪等（已放棄回 changed=false）；已結算或過期回 BAD_STATE。不發獎不罰，後果交宿主決定 */
    public abandon(qid: string): { instance: QuestInstanceView; changed: boolean } {
        const inst = this._get(qid);
        if (inst.state === 'ABANDONED') return { instance: this.view(inst), changed: false };
        if (inst.state === 'SETTLED' || inst.state === 'EXPIRED') throw new QuestError('BAD_STATE', `任務 ${inst.qid} 已是 ${inst.state}，不能放棄`);
        inst.state = 'ABANDONED';
        this._log(inst, 'abandon');
        return { instance: this.view(inst), changed: true };
    }

    /** 終局實例太多時丟最舊的；進行中與暫離中的永遠保留 */
    private _prune(): void {
        const terminal = this._state.instances.filter((i) => isTerminal(i.state));
        const excess = terminal.length - QUEST_SETTLED_KEEP;
        if (excess <= 0) return;
        const drop = new Set(terminal.slice(0, excess).map((i) => i.qid));
        this._state.instances = this._state.instances.filter((i) => !drop.has(i.qid));
    }
}
