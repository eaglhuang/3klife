// @spec-source → 培育系統.md (doc_spec_0026) §E #1 #2 #3 #9 §N、教官系統（支援卡）.md (doc_spec_0027) §E #5 #6
/**
 * NurtureService — 培育會話管理與名冊接線（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 開場檢查：已開獎且選過宿命、未畢業、沒在培育、教官沒被別場鎖定、入學令夠、季度模式正確
 *   - 持有進行中的 NurtureSession，提供 train() / graduate() / abandon()
 *   - 畢業時把實力層寫回名冊；教官在會話結束前不能同時任職另一場
 *   - getState() / restoreState() 讓存檔帶著進行中的培育
 *
 * 外界時間：36 回合都在同一個培育季內完成，回合本身不推進 GameClock；
 * 只有「開場」被限定在培育模式的季度，並每季限量入學令。
 *
 * Unity 對照：像 NurtureManager（單例 service），UI 只呼叫 Start / Train / Graduate，
 * 並從 session 讀取目前回合、精力與教官站位來更新畫面。
 */
import type { MentorCard } from '../models/MentorCard';
import type { RosterStore } from '../managers/GameSession';
import { GameTimeMode } from '../systems/GameClock';
import type { RandomSource } from '../systems/GeneralAging';
import {
    createNurtureSession,
    executeRound,
    graduate as graduateSession,
    mentorFromCard,
    GraduationResult,
    TrainingMentor,
    NURTURE_MENTOR_SLOTS,
    NurtureAction,
    NurtureError,
    NurtureRoundLog,
    NurtureSession,
    TRAINING_KINDS,
    TrainingKind,
} from '../systems/NurtureSystem';
import { buildNurtureRecordRow, type NurtureRecordDraft } from '../systems/NurtureRecordRow';
import { UNVEILING_AGE, UnveilingGeneral } from '../systems/Unveiling';
import { InspireContext, rollInspireRound } from '../systems/MentorInspiration';
import { isBloodlineGuaranteedRound, isBloodlineMatch } from '../systems/BloodlineGuarantee';
import { GENERAL_STATUS_DEAD } from '../systems/GeneralAging';
import { FactorAwakenedEvent, rollNurtureAwakening } from '../systems/FactorAwakening';
import type { FactorDictionary, InheritedFactor } from '../systems/FactorInheritance';
import { hybridSourcesFromParents } from '../systems/HybridSkill';
import { revealStat, RevealedStat, RevelationLevel } from '../systems/StatRevelation';
import { commitReportCard, emptyReportCardBook, keepReportCard, ReportCardBook } from '../systems/ReportCardBook';
import { mentorBoundaryViolations, MentorBoundaryViolation } from '../systems/MentorBoundary';

/** 每季入學令數量；規格只說「每季限 N 張」，暫定 2 */
export const DEFAULT_ADMISSIONS_PER_SEASON = 2;

export type NurtureBlockReason =
    | 'child-not-found'
    | 'child-dead'
    | 'child-underage'
    | 'not-unveiled'
    | 'fate-pending'
    | 'already-graduated'
    | 'already-nurturing'
    | 'wrong-season-mode'
    | 'no-admission-token'
    | 'too-many-mentors'
    | 'duplicate-mentor'
    | 'mentor-locked';

export interface NurtureEligibility {
    eligible: boolean;
    reasons: NurtureBlockReason[];
    /** 因為正在別場培育而不能指派的教官 id */
    lockedMentorIds: string[];
}

/** 可存檔的培育狀態 */
export interface NurtureState {
    sessions: NurtureSession[];
    /** 當季已用的入學令；季度變了就視為重置 */
    admission: { season: number; used: number };
    /** 每位子嗣保留的畢業成績單（最多 3 份）；舊存檔沒有此欄位視為空 */
    reportBooks?: Record<string, ReportCardBook<GraduationResult>>;
    /** 畢業培育紀錄（NUR-15 MVP 存檔欄位，見 NurtureRecordRow）；舊存檔沒有此欄位視為空 */
    graduationRecords?: NurtureRecordDraft[];
}

/** 父母各自的繼承因子；用來推導混種戰法來源，沒提供就不擲混種 */
export interface NurtureParentFactors {
    father?: readonly InheritedFactor[];
    mother?: readonly InheritedFactor[];
}

export interface NurtureServiceOptions {
    random?: RandomSource;
    /** 目前的 totalSeasonsElapsed */
    currentSeason?: () => number;
    /** 目前的季度模式；提供時，開場限定在培育模式 */
    currentMode?: () => GameTimeMode;
    /** 目前季節的訓練體力消耗倍率（夏 ×1.25）；沒提供視為 1 */
    seasonTrainingVigorMod?: () => number;
    requireNurtureMode?: boolean;
    admissionsPerSeason?: number;
    /** 培育回合的因子覺醒（PROG-2-0044）；沒提供就不擲骰，回合結果與舊版完全相同 */
    awakening?: NurtureAwakeningHooks;
    /** 畢業後通知（例如給玩家 discoveryLevel 經驗） */
    onGraduated?: (result: GraduationResult) => void;
    /** 因子字典；用來推導混種戰法領域（defaultTags），沒提供則退回因子 id */
    factorDictionary?: FactorDictionary;
}

export interface NurtureAwakeningHooks {
    /** 玩家目前的 discoveryLevel（GameSession 持有） */
    discoveryLevel: () => number;
    /** 覺醒成功、名冊已寫回之後呼叫（例如廣播 FactorAwakened） */
    onAwakened?: (event: FactorAwakenedEvent) => void;
}

/** 子嗣 LUK：頂層欄位優先，沒有則讀 stats（與 NurtureSystem.statOf 一致） */
function lukOf(general: UnveilingGeneral | undefined): number {
    if (!general) return 0;
    const top = (general as unknown as Record<string, unknown>).luk;
    return typeof top === 'number' ? top : general.stats?.luk ?? 0;
}

export interface NurtureTrainResult {
    session: NurtureSession;
    log: NurtureRoundLog;
    /** 本回合覺醒的因子；沒有則省略 */
    awakening?: FactorAwakenedEvent;
    /** 本回合新觸發的戰法靈感；沒有則省略 */
    inspirations?: NurtureInspiration[];
    /** 教學邊界違規（MENT-11）：教官加成回寫了子嗣因子；正常情況省略 */
    boundaryViolations?: MentorBoundaryViolation[];
}

/** 戰法靈感觸發紀錄（給畫面與之後的戰法授予用） */
export interface NurtureInspiration {
    mentorId: string;
    eventId: string;
    tacticId: string;
}

export function createEmptyNurtureState(): NurtureState {
    return { sessions: [], admission: { season: -1, used: 0 } };
}

export class NurtureService {
    private _state: NurtureState = createEmptyNurtureState();

    constructor(
        private readonly _roster: RosterStore,
        private readonly _options: NurtureServiceOptions = {},
    ) {}

    // ── 存檔 ───────────────────────────────────────────────────────────────

    getState(): NurtureState {
        return JSON.parse(JSON.stringify(this._state)) as NurtureState;
    }

    restoreState(state: NurtureState | null | undefined): void {
        if (!state) {
            this._state = createEmptyNurtureState();
            return;
        }
        if (!Array.isArray(state.sessions) || !state.admission) {
            throw new NurtureError('培育存檔格式錯誤');
        }
        this._state = JSON.parse(JSON.stringify(state)) as NurtureState;
    }

    // ── 查詢 ───────────────────────────────────────────────────────────────

    /** 子嗣的分層揭露視圖：各屬性依 levels 決定可見程度；沒給的屬性預設 HIDDEN（不洩漏數值） */
    revealedStats(childId: string, levels: Partial<Record<TrainingKind, RevelationLevel>>): Partial<Record<TrainingKind, RevealedStat>> {
        const child = this._find(childId);
        if (!child) throw new NurtureError(`找不到子嗣 ${childId}`);
        const view: Partial<Record<TrainingKind, RevealedStat>> = {};
        for (const kind of TRAINING_KINDS) {
            const level = levels[kind] ?? 'HIDDEN';
            view[kind] = revealStat(Number(child[kind] ?? 0), level);
        }
        return view;
    }

    /** 目前保留的成績單份數（0~3），給畫面顯示用 */
    reportCardCount(childId: string): number {
        return this._state.reportBooks?.[childId]?.cards.length ?? 0;
    }

    getSession(childId: string): NurtureSession | null {
        return this._state.sessions.find((s) => s.childId === childId && s.status !== 'abandoned') ?? null;
    }

    getActiveSessions(): NurtureSession[] {
        return this._state.sessions.map((s) => ({ ...s }));
    }

    lockedMentorIds(): string[] {
        return this._state.sessions.flatMap((s) => s.mentors.map((m) => m.id));
    }

    admissionsLeft(): number {
        const season = this._season();
        const used = this._state.admission.season === season ? this._state.admission.used : 0;
        return Math.max(0, (this._options.admissionsPerSeason ?? DEFAULT_ADMISSIONS_PER_SEASON) - used);
    }

    checkStart(childId: string, mentors: readonly TrainingMentor[] = []): NurtureEligibility {
        const reasons: NurtureBlockReason[] = [];
        const child = this._find(childId);
        if (!child) {
            return { eligible: false, reasons: ['child-not-found'], lockedMentorIds: [] };
        }
        if ((child.status ?? '').toLowerCase() === GENERAL_STATUS_DEAD) reasons.push('child-dead');
        if ((child.age ?? 0) < UNVEILING_AGE) reasons.push('child-underage');
        if (!child.fate) reasons.push('not-unveiled');
        else if (!child.fate.choice) reasons.push('fate-pending');
        if ((child as { graduationRating?: string }).graduationRating) reasons.push('already-graduated');
        if (this.getSession(childId)) reasons.push('already-nurturing');

        const requireMode = this._options.requireNurtureMode ?? true;
        if (requireMode && this._options.currentMode && this._options.currentMode() !== GameTimeMode.Nurture) {
            reasons.push('wrong-season-mode');
        }
        if (this.admissionsLeft() <= 0) reasons.push('no-admission-token');

        if (mentors.length > NURTURE_MENTOR_SLOTS) reasons.push('too-many-mentors');
        if (new Set(mentors.map((m) => m.id)).size !== mentors.length) reasons.push('duplicate-mentor');
        const locked = new Set(this.lockedMentorIds());
        const lockedMentorIds = mentors.filter((m) => locked.has(m.id)).map((m) => m.id);
        if (lockedMentorIds.length > 0) reasons.push('mentor-locked');

        return { eligible: reasons.length === 0, reasons, lockedMentorIds };
    }

    // ── 動作 ───────────────────────────────────────────────────────────────

    /** 以退役教官卡（LegacyService.getMentorCards）開場；換算規則見 mentorFromCard */
    startWithCards(childId: string, cards: readonly MentorCard[]): NurtureSession {
        return this.start(childId, cards.map((card) => mentorFromCard(card)));
    }

    /** 消耗 1 張入學令，建立鏡像快照並鎖定教官；不合格時拋 NurtureError */
    start(childId: string, mentors: readonly TrainingMentor[] = [], parents?: NurtureParentFactors): NurtureSession {
        const check = this.checkStart(childId, mentors);
        if (!check.eligible) {
            throw new NurtureError(`${childId} 不能進入培育：${check.reasons.join(', ')}`);
        }
        const child = this._find(childId) as UnveilingGeneral;
        const season = this._season();
        const session = createNurtureSession({
            sessionId: `nurture-${childId}-s${season}`,
            child,
            mentors,
            startSeason: season,
            random: this._rng(),
            hybridSources: hybridSourcesFromParents(parents, this._options.factorDictionary),
            factorDictionary: this._options.factorDictionary,
        });
        const used = this._state.admission.season === season ? this._state.admission.used : 0;
        this._state.admission = { season, used: used + 1 };
        this._state.sessions.push(session);
        return session;
    }

    /**
     * 執行一回合；第 36 回合後會話變 completed，等待 graduate()。
     * 有掛 awakening 時，訓練回合結束後再擲一次覺醒（亂數接在回合之後，沒有候選因子就不擲）。
     */
    train(childId: string, action: NurtureAction): NurtureTrainResult {
        const current = this._requireSession(childId);
        const result: NurtureTrainResult = executeRound(current, action, this._rng(), {
            trainingVigorMultiplier: this._options.seasonTrainingVigorMod?.(),
        });
        const genesBefore = this._roster.getAll().find((g) => g.id === childId)?.genes;
        const inspired = action === 'rest' ? { session: result.session, triggered: [] } : this._rollInspirations(childId, result.session);
        result.session = inspired.session;
        if (inspired.triggered.length > 0) result.inspirations = inspired.triggered;
        const violations = mentorBoundaryViolations(genesBefore, this._roster.getAll().find((g) => g.id === childId)?.genes);
        if (violations.length > 0) result.boundaryViolations = violations;
        this._replace(result.session);
        const awakening = this._rollAwakening(childId, result.session, result.log);
        if (awakening) result.awakening = awakening;
        return result;
    }

    /** 畢業結算：實力層寫回名冊、會話移除（教官同時解鎖） */
    graduate(childId: string): GraduationResult {
        const session = this._requireSession(childId);
        const roster = this._roster.getAll() as UnveilingGeneral[];
        const index = roster.findIndex((g) => g.id === childId);
        if (index < 0) throw new NurtureError(`名冊中找不到 ${childId}`);
        const result = graduateSession(session, roster[index], this._season());
        const next = [...roster];
        next[index] = result.general;
        this._roster.replaceAll(next);
        this._state.sessions = this._state.sessions.filter((s) => s.sessionId !== session.sessionId);
        this._dropReportBook(childId);
        const { row } = buildNurtureRecordRow(session, result, this._season());
        this._state.graduationRecords = [...(this._state.graduationRecords ?? []), row];
        this._options.onGraduated?.(result);
        return result;
    }

    /** 畢業後保留成績單（不寫入名冊，最多 3 份，超過丟最舊的）；會話保留為 completed */
    keepReport(childId: string): GraduationResult {
        const session = this._requireSession(childId);
        const roster = this._roster.getAll() as UnveilingGeneral[];
        const child = roster.find((g) => g.id === childId);
        if (!child) throw new NurtureError(`名冊中找不到 ${childId}`);
        const result = graduateSession(session, child, this._season());
        const books = this._state.reportBooks ?? {};
        const book = books[childId] ?? emptyReportCardBook<GraduationResult>();
        this._state.reportBooks = { ...books, [childId]: keepReportCard(book, result) };
        return result;
    }

    /**
     * 保留並重修：清掉已完成的會話、重新開場（照常消耗入學令與教官鎖定）。
     * 已保留的成績單不會丟；補腦湯 ×1 的扣除由上層處理（RETAKE_ITEM_COST）。
     */
    retake(childId: string, mentors: readonly TrainingMentor[] = []): NurtureSession {
        const session = this._requireSession(childId);
        if (session.status !== 'completed') throw new NurtureError(`${childId} 尚未完成，不能重修`);
        const book = this._state.reportBooks?.[childId];
        if (!book || book.cards.length === 0) throw new NurtureError(`${childId} 沒有保留的成績單`);
        const blocking = this.checkStart(childId, mentors).reasons.filter((reason) => reason !== 'already-nurturing');
        if (blocking.length > 0) throw new NurtureError(`${childId} 不能重修：${blocking.join(', ')}`);
        this._state.sessions = this._state.sessions.filter((s) => s.sessionId !== session.sessionId);
        return this.start(childId, mentors);
    }

    /** 定型：從保留的成績單選一份正式畢業，寫入名冊，其餘成績單與會話一併銷毀 */
    commitReport(childId: string, index: number): GraduationResult {
        const book = this._state.reportBooks?.[childId];
        if (!book) throw new NurtureError(`${childId} 沒有保留的成績單`);
        const { card } = commitReportCard(book, index);
        const roster = this._roster.getAll() as UnveilingGeneral[];
        const rosterIndex = roster.findIndex((g) => g.id === childId);
        if (rosterIndex < 0) throw new NurtureError(`名冊中找不到 ${childId}`);
        const next = [...roster];
        next[rosterIndex] = card.general;
        this._roster.replaceAll(next);
        this._state.sessions = this._state.sessions.filter((s) => s.childId !== childId);
        const rest = { ...(this._state.reportBooks ?? {}) };
        delete rest[childId];
        this._state.reportBooks = rest;
        this._options.onGraduated?.(card);
        return card;
    }

    /** 中途放棄：本體不變、入學令不退、教官解鎖 */
    abandon(childId: string): void {
        const session = this._requireSession(childId);
        this._state.sessions = this._state.sessions.filter((s) => s.sessionId !== session.sessionId);
        this._dropReportBook(childId);
    }

    /** 離開培育（正式畢業／放棄）時銷毀保留的成績單，避免殘卡被下一輪培育誤用 */
    private _dropReportBook(childId: string): void {
        if (!this._state.reportBooks?.[childId]) return;
        const rest = { ...this._state.reportBooks };
        delete rest[childId];
        this._state.reportBooks = rest;
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    private _rollAwakening(childId: string, session: NurtureSession, log: NurtureRoundLog): FactorAwakenedEvent | undefined {
        const hooks = this._options.awakening;
        if (!hooks || log.action === 'rest') return undefined;
        const roster = this._roster.getAll();
        const index = roster.findIndex((g) => g.id === childId);
        if (index < 0) return undefined;
        const mentorRank = session.mentors.reduce((max, m) => Math.max(max, m.stars ?? 0), 0);
        const result = rollNurtureAwakening(roster[index], {
            discoveryLevel: hooks.discoveryLevel(),
            mentorRank,
            mentorOnSlot: log.mentorsOnSlot.length > 0,
            luk: lukOf(roster[index]),
            random: this._rng(),
        });
        if (!result?.ok) return undefined;
        const next = [...roster];
        next[index] = result.general;
        this._roster.replaceAll(next);
        hooks.onAwakened?.(result.event);
        return result.event;
    }

    private _rng(): RandomSource {
        return this._options.random ?? Math.random;
    }

    private _season(): number {
        return this._options.currentSeason?.() ?? 0;
    }

    private _find(id: string): UnveilingGeneral | undefined {
        return (this._roster.getAll() as UnveilingGeneral[]).find((g) => g.id === id);
    }

    private _requireSession(childId: string): NurtureSession {
        const session = this.getSession(childId);
        if (!session) throw new NurtureError(`${childId} 沒有進行中的培育`);
        return session;
    }

    /**
     * 本回合戰法靈感：只有帶支援卡資料的教官才擲骰；沒有就不碰亂數，行為與舊版相同。
     * 觸發鍵寫回會話的 inspiredKeys，同場同一事件不會再次觸發。
     */
    private _rollInspirations(childId: string, session: NurtureSession): { session: NurtureSession; triggered: NurtureInspiration[] } {
        const mentors = session.mentors.filter((m) => m.inspire);
        if (mentors.length === 0) return { session, triggered: [] };
        const child = this._roster.getAll().find((g) => g.id === childId) as UnveilingGeneral | undefined;
        const childLuk = lukOf(child);
        const childBloodlines = child?.bloodlineId ? [child.bloodlineId] : [];
        const confirmed = new Set(session.inspiredKeys ?? []);
        const random = this._rng();
        const triggered: NurtureInspiration[] = [];
        for (const mentor of mentors) {
            const inspire = mentor.inspire!;
            const maxStar = inspire.friendshipBonusByStar.length - 1;
            const star = Math.min(maxStar, Math.max(0, mentor.stars ?? 0));
            const prefix = `${mentor.id}:`;
            const keyed = inspire.events.map((event) => ({ ...event, eventId: prefix + event.eventId }));
            const ctx: InspireContext = {
                mentorStar: star,
                friendshipBonus: inspire.friendshipBonusByStar[star] ?? 0,
                childLuk,
                childBloodlines,
            };
            const guaranteed = isBloodlineMatch(child?.name, mentor.familyName) && isBloodlineGuaranteedRound(session.round);
            for (const key of rollInspireRound(keyed, session.round, ctx, confirmed, random, { guaranteed })) {
                confirmed.add(key);
                const event = inspire.events.find((e) => prefix + e.eventId === key)!;
                triggered.push({ mentorId: mentor.id, eventId: event.eventId, tacticId: event.tacticId });
            }
        }
        if (triggered.length === 0) return { session, triggered };
        return { session: { ...session, inspiredKeys: [...confirmed] }, triggered };
    }

    private _replace(session: NurtureSession): void {
        this._state.sessions = this._state.sessions.map((s) => (s.sessionId === session.sessionId ? session : s));
    }
}
