// @spec-source → Q版社會總規格書 QSOC-01 第 9.5 節（市井大街首訪任務，使用者 11/28 裁決）；PROG-2-10229
/**
 * StreetFirstVisit — 市井大街首訪任務（純邏輯，不依賴 cc）
 *
 * 流程：未開放(locked) → 帶路(escort) → 尋找中(searching) → 完成(done)。
 *  1. 第一場戰鬥打完、到第一季中段（StreetOpenGate 其餘條件成立），由「親密度最高的家臣」帶主角逛一次；
 *  2. 逛完大街才算開放（StreetOpenGate 的 tutorialDone），開始「找到 3 位家臣」，右上顯示「已找到 n/3」；
 *  3. 全部找到：回傳獎勵套件 id（走共用獎勵框架，內容在 reward-config.json）並解鎖送禮。
 * 挑人：帶路者＝家臣中親密度最高（同分 id 小者先）；目標先取其餘家臣（親密度高到低），不足 3 位用他國遊歷武將補。
 * 不負責：發獎（呼叫端拿 rewardBundleId 交給獎勵框架）、畫面（cocos/StreetFirstVisitHud）、親密度與性別怎麼來。
 */
import firstVisitData from '../../../resources/data/life-street-first-visit.json';
import { isStreetOpen } from './StreetOpenGate';
import type { StreetOpenConfig, StreetOpenFacts } from './StreetOpenGate';

export type FirstVisitPhase = 'locked' | 'escort' | 'searching' | 'done';
export type CandidateKind = 'retainer' | 'visitor';
export type CandidateGender = 'm' | 'f';

export interface StreetCandidate {
    id: string;
    /** retainer＝我方家臣；visitor＝他國遊歷武將 */
    kind: CandidateKind;
    /** 與主角的親密度（友誼框架提供） */
    intimacy: number;
    gender: CandidateGender;
}

export interface StreetFirstVisitConfig {
    targetCount: number;
    guideKind: CandidateKind;
    targetKindOrder: CandidateKind[];
    unlockFeature: string;
    rewardBundleId: string;
    escort: { stops: string[]; secondsPerStop: number };
    i18n: { progress: string; targets: string; complete: string; guideIntro: string; found: string; giftUnlocked: string };
}

export const DEFAULT_STREET_FIRST_VISIT_CONFIG: StreetFirstVisitConfig = firstVisitData as unknown as StreetFirstVisitConfig;

export interface StreetFirstVisitState {
    phase: FirstVisitPhase;
    guideId: string | null;
    targetIds: string[];
    foundIds: string[];
}

export interface FindResult {
    /** 這次是否真的新找到（不在目標內或重複找都是 false） */
    newlyFound: boolean;
    found: number;
    required: number;
    /** 這次呼叫剛好完成任務 */
    completed: boolean;
    /** 只在 completed 那一次非 null：交給共用獎勵框架發放 */
    rewardBundleId: string | null;
}

/** 親密度高者先；同分 id 字典序小者先（結果固定、可重現） */
function byIntimacy(a: StreetCandidate, b: StreetCandidate): number {
    return b.intimacy - a.intimacy || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** 帶路家臣：只從家臣挑，親密度最高；沒有家臣回 null */
export function pickGuide(candidates: readonly StreetCandidate[], config: StreetFirstVisitConfig = DEFAULT_STREET_FIRST_VISIT_CONFIG): string | null {
    const pool = candidates.filter((c) => c.kind === config.guideKind).sort(byIntimacy);
    return pool.length > 0 ? pool[0].id : null;
}

/** 目標：排除帶路者，依 targetKindOrder（家臣→他國遊歷）逐類取親密度高者，湊滿 targetCount 為止；全不足就有幾位算幾位 */
export function pickTargets(candidates: readonly StreetCandidate[], guideId: string | null, config: StreetFirstVisitConfig = DEFAULT_STREET_FIRST_VISIT_CONFIG): string[] {
    const out: string[] = [];
    for (const kind of config.targetKindOrder) {
        const pool = candidates.filter((c) => c.kind === kind && c.id !== guideId).sort(byIntimacy);
        for (const c of pool) {
            if (out.length >= config.targetCount) return out;
            if (!out.includes(c.id)) out.push(c.id);
        }
    }
    return out;
}

/** 帶路位移：依經過秒數算目前在第幾站與到下一站的比例 t（0～1）；走完 finished */
export function escortProgress(elapsedSec: number, config: StreetFirstVisitConfig = DEFAULT_STREET_FIRST_VISIT_CONFIG): { stopIndex: number; t: number; finished: boolean } {
    const stops = config.escort.stops.length;
    const per = Math.max(0.001, config.escort.secondsPerStop);
    const total = Math.max(0, stops - 1) * per;
    if (stops <= 1 || elapsedSec >= total) return { stopIndex: Math.max(0, stops - 1), t: 0, finished: true };
    const e = Math.max(0, elapsedSec);
    const stopIndex = Math.floor(e / per);
    return { stopIndex, t: (e - stopIndex * per) / per, finished: false };
}

/** 台詞 key：依性別分 .m／.f（白話台詞、四語系都放 i18n；{0}＝武將名） */
export function streetLineKey(baseKey: string, gender: CandidateGender): string {
    return `${baseKey}.${gender}`;
}

export class StreetFirstVisit {
    private _state: StreetFirstVisitState;

    public constructor(
        private readonly _config: StreetFirstVisitConfig = DEFAULT_STREET_FIRST_VISIT_CONFIG,
        state?: StreetFirstVisitState,
    ) {
        this._state = state
            ? { ...state, targetIds: [...state.targetIds], foundIds: [...state.foundIds] }
            : { phase: 'locked', guideId: null, targetIds: [], foundIds: [] };
    }

    public get state(): Readonly<StreetFirstVisitState> { return this._state; }
    public get phase(): FirstVisitPhase { return this._state.phase; }
    /** 家臣帶逛是否已走完（StreetOpenGate 的 tutorialDone） */
    public get escortDone(): boolean { return this._state.phase === 'searching' || this._state.phase === 'done'; }
    /** 送禮是否已解鎖（任務完成後） */
    public get giftUnlocked(): boolean { return this._state.phase === 'done'; }
    public get progress(): { found: number; required: number } {
        return { found: this._state.foundIds.length, required: this._state.targetIds.length };
    }

    /** 大街目前是否開放：其餘條件＋家臣帶逛已走完 */
    public isStreetOpen(facts: StreetOpenFacts, openConfig?: StreetOpenConfig): boolean {
        return isStreetOpen({ ...facts, tutorialDone: this.escortDone }, openConfig);
    }

    /** 嘗試開始帶路：除了「教學已播」以外的開放條件都成立、且有家臣可帶路才會進 escort；回是否已進入帶路 */
    public tryStartEscort(facts: StreetOpenFacts, candidates: readonly StreetCandidate[], openConfig?: StreetOpenConfig): boolean {
        if (this._state.phase !== 'locked') return false;
        if (!isStreetOpen({ ...facts, tutorialDone: true }, openConfig)) return false;
        const guide = pickGuide(candidates, this._config);
        if (guide === null) return false;
        this._state.guideId = guide;
        this._state.phase = 'escort';
        return true;
    }

    /** 帶路走完：挑目標、進尋找中；目標 0 位（全國沒人可找）直接完成。回完成結果（沒完成回 null） */
    public finishEscort(candidates: readonly StreetCandidate[]): FindResult | null {
        if (this._state.phase !== 'escort') return null;
        this._state.targetIds = pickTargets(candidates, this._state.guideId, this._config);
        this._state.phase = 'searching';
        if (this._state.targetIds.length === 0) return this._complete(false);
        return null;
    }

    /** 主角在大街找到某位武將（看到他在做什麼）；重複找或不是目標都不算 */
    public markFound(id: string): FindResult {
        const s = this._state;
        if (s.phase !== 'searching' || !s.targetIds.includes(id) || s.foundIds.includes(id)) {
            return { newlyFound: false, found: s.foundIds.length, required: s.targetIds.length, completed: false, rewardBundleId: null };
        }
        s.foundIds.push(id);
        if (s.foundIds.length >= s.targetIds.length) return this._complete(true);
        return { newlyFound: true, found: s.foundIds.length, required: s.targetIds.length, completed: false, rewardBundleId: null };
    }

    /** 右上進度文字用的 i18n 參數：key＋{0}已找到、{1}目標總數 */
    public progressText(): { key: string; args: [string, string] } {
        const p = this.progress;
        return { key: this._config.i18n.progress, args: [String(p.found), String(p.required)] };
    }

    private _complete(newlyFound: boolean): FindResult {
        this._state.phase = 'done';
        return {
            newlyFound,
            found: this._state.foundIds.length,
            required: this._state.targetIds.length,
            completed: true,
            rewardBundleId: this._config.rewardBundleId,
        };
    }
}
