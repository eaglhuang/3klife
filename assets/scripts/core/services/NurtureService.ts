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
} from '../systems/NurtureSystem';
import { UNVEILING_AGE, UnveilingGeneral } from '../systems/Unveiling';
import { GENERAL_STATUS_DEAD } from '../systems/GeneralAging';

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
}

export interface NurtureServiceOptions {
    random?: RandomSource;
    /** 目前的 totalSeasonsElapsed */
    currentSeason?: () => number;
    /** 目前的季度模式；提供時，開場限定在培育模式 */
    currentMode?: () => GameTimeMode;
    requireNurtureMode?: boolean;
    admissionsPerSeason?: number;
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
    start(childId: string, mentors: readonly TrainingMentor[] = []): NurtureSession {
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
        });
        const used = this._state.admission.season === season ? this._state.admission.used : 0;
        this._state.admission = { season, used: used + 1 };
        this._state.sessions.push(session);
        return session;
    }

    /** 執行一回合；第 36 回合後會話變 completed，等待 graduate() */
    train(childId: string, action: NurtureAction): { session: NurtureSession; log: NurtureRoundLog } {
        const current = this._requireSession(childId);
        const result = executeRound(current, action, this._rng());
        this._replace(result.session);
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
        return result;
    }

    /** 中途放棄：本體不變、入學令不退、教官解鎖 */
    abandon(childId: string): void {
        const session = this._requireSession(childId);
        this._state.sessions = this._state.sessions.filter((s) => s.sessionId !== session.sessionId);
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

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

    private _replace(session: NurtureSession): void {
        this._state.sessions = this._state.sessions.map((s) => (s.sessionId === session.sessionId ? session : s));
    }
}
