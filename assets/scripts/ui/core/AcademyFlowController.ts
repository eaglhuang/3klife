// @spec-source → MVP核心循環貫通與遊玩動線功能規格書.md (doc_spec_0308) Phase 2 學府修業；PROG-2-9189
/**
 * AcademyFlowController — 學府入學畫面與 36 回合修業主畫面（純邏輯，不依賴 cc）
 *
 * 入學：只開潁川書院；子嗣須年滿最低入學年齡（academy-enroll-rules.json，預設 15 歲及冠），
 * 消耗 1 張入學令（沿用舊入學令來源、不限季節），教官依祠堂等級給 3~4 格。
 * 修業：每個動作先在記憶體 commit（防 SL 管理器寫入未確認紀錄），再落盤；落盤失敗就把紀錄還原、動作不生效。
 * 修業無法放棄：離開畫面只是暫離，回來由 recover() 接續同一回合；存檔、任務推進與種子都走 AcademyApi
 * （save.write／task.advance／rng.issueSeed，PROG-2-9215），本檔不認識 GameSession。
 *
 * 預留給後續卡的呼叫點：
 *   - deps.openInterrupt（PROG-2-9190）：第 12／24／36 回合打斷點彈窗；回傳 true 表示由彈窗接手，
 *     彈窗選完後呼叫 resolveInterrupt(optionId)；沒接手時這裡顯示占位畫面，按「以預設選項繼續」走第一個選項。
 *   - deps.onGraduated（PROG-2-9191）：快照 graduated 時呼叫，由結業卡接手結算與清除學府紀錄。
 *
 * Unity 對照：像 Presenter，View 只照單顯示（AcademyFlowView 吐 FlowView），按鈕只轉呼叫這裡的方法。
 */
import { AcademyAntiSLManager } from '../../core/systems/nurture/AcademyAntiSLManager';
import type { MentorCard } from '../../core/models/MentorCard';
import { AcademyRecordCache, completedTurnsOf, type AcademyApi } from './AcademyApi';
import { academyEnrollRules, checkEnrollAge, shouldRecommendAncestor } from '../../core/systems/nurture/AcademyEnrollRules';
import {
    ACADEMY_STAT_KEYS,
    AcademyControlMode,
    AcademyId,
    type AcademyActionPayload,
    type AcademyStateSnapshot,
    type AcademyStatKey,
} from '../../core/systems/nurture/AcademyTypes';
import { createAcademySnapshot, type AcademyAdmission } from '../../core/systems/nurture/AcademyTrainingEngine';
import {
    assignYingchuanMentors,
    YINGCHUAN_GIMMICK,
    YINGCHUAN_MENTOR_CATALOG,
    yingchuanStateOf,
    type YingchuanMentorDef,
} from '../../core/systems/nurture/YingchuanAcademy';
import { applyClanPrestigeToAcademy } from '../../core/systems/MvpLoopController';
import { attachLegacySupport, extractLegendaryMentor, legendaryMentorToYingchuan, type ILegendaryMentorCard } from '../../core/systems/GenerationalLegacy';
import { ancestorIdsOf, ancestorMentorsFirst, guestScholarMentorCard, isAncestorMentor, type LineageGeneral } from '../../core/systems/LineageMilestones';
import { cycleMentorDeckSlot, mentorDeckCards, preferredMentorDeck, sanitizeMentorDeck, type MentorDeck } from '../../core/systems/MentorDeck';
import {
    academyNameOf,
    academyTextOf,
    debatePickCount,
    enrollView,
    nextControlMode,
    sessionView,
    type AcademyFlowTextLookup,
    type AcademyFlowViewState,
    type AcademySessionMode,
    type AcademySettleSummary,
    type EnrollViewModel,
    type PrepUpcomingStudent,
} from './AcademyFlowView';

import { fastForwardAcademy, type AcademyFastForwardResult } from './AcademyQaFastForward';

const K = 'ui.academy.flow.';
/** 入學畫面「還需要檢查」的舊培育擋因：年齡、季節、入學令、教官都由學府自己判斷，不看這些 */
const ENROLL_BLOCKING_REASONS: readonly string[] = [
    'child-not-found', 'child-dead', 'child-captive', 'not-unveiled', 'fate-pending', 'already-graduated', 'already-nurturing',
];

export interface AcademyHostLike {
    node: { active: boolean };
}

export interface AcademyButtonBinding {
    buttonId: string;
    handler: () => void;
}

/** 名冊裡的子嗣（GeneralConfig 的子集） */
export interface AcademyChildLike {
    id: string;
    name: string;
    age?: number;
    status?: string;
    fatherId?: string;
    motherId?: string;
    str?: number;
    lea?: number;
    int?: number;
    pol?: number;
    cha?: number;
    fate?: { choice?: string } | null;
    /** 投靠少年名將標記（PROG-2-9194）：不走抓周宿命，只看年滿入學年齡 */
    youth?: { enrollAge: number } | null;
    /** 開局義子標記（PROG-2-9609，11/21 使用者裁決第 29 條）：趙雲、關羽、諸葛亮 */
    adoptSource?: string;
    graduationRating?: string;
    captivity?: unknown;
}

export interface AcademyFlowDeps<H extends AcademyHostLike> {
    mountEnrollHost(bindings: AcademyButtonBinding[]): Promise<H>;
    mountSessionHost(bindings: AcademyButtonBinding[]): Promise<H>;
    apply(host: H, view: AcademyFlowViewState): void;
    bringToFront(host: H): void;
    lookup(): AcademyFlowTextLookup;
    toast(message: string): void;
    // 資料來源
    roster(): readonly AcademyChildLike[];
    /** 舊培育系統對此子嗣的擋因（NurtureService.checkStart(...).reasons） */
    nurtureBlockReasons(childId: string): readonly string[];
    loadMentorCards(): Promise<MentorCard[]>;
    lockedMentorIds(): readonly string[];
    tokensLeft(): number;
    /** 扣 1 張入學令（走物品庫存 item.consume，PROG-2-9203）；不足回 false 且不扣 */
    consumeToken(): boolean | Promise<boolean>;
    /** 退回剛扣的 1 張（落盤失敗時用） */
    refundToken(): void | Promise<void>;
    clanUuid(): string;
    clanPrestigeTier(): number;
    /** 入學當下已過幾季，進亂數種子（同一存檔固定） */
    admissionTurn(): number;
    /** 共通 API 出口：存檔（save）、36 回合任務推進（task.advance）、世界種子（rng） */
    api: AcademyApi;
    /** 有進行中（未結業）的修業 */
    isActive(): boolean;
    /** 狀態變動時通知宿主更新大廳入口（可選） */
    onChanged?(): void;
    /** PROG-2-9190 接手打斷點彈窗；回傳 true 表示已接手 */
    openInterrupt?(snapshot: Readonly<AcademyStateSnapshot>): boolean;
    /** 結業結算（PROG-2-9211 暫行，PROG-2-9191 取代）：LobbyScene 接 showAcademyGraduation */
    onGraduated?(snapshot: Readonly<AcademyStateSnapshot>): void;
}

function settleOf(prev: Readonly<AcademyStateSnapshot>, next: Readonly<AcademyStateSnapshot>, recovered: boolean): AcademySettleSummary {
    return {
        turn: prev.currentTurn,
        gains: ACADEMY_STAT_KEYS.map((key) => ({ key, delta: next.stats[key] - prev.stats[key] })),
        energyBefore: prev.energy,
        energyAfter: next.energy,
        chronicles: next.chronicles.slice(prev.chronicles.length).map((c) => ({ title: c.title, turn: c.turn })),
        recovered,
        crashWarning: 0,
    };
}

export class AcademyFlowController<H extends AcademyHostLike> {
    private _enrollHost: H | null = null;
    private _sessionHost: H | null = null;
    private readonly _manager: AcademyAntiSLManager;
    /** 防 SL 管理器的同步快取；權威端是 api（save.read／save.write） */
    private readonly _store = new AcademyRecordCache();
    /** 世界種子（rng.issueSeed 簽發，入學前再取一次） */
    private _worldSeed = '';
    /** 目前修業對應的任務 id */
    private _qid: string | null = null;
    /** 有「下一次動作會再寫一次」的落盤失敗尚未補上 */
    private _unsaved = false;
    private _childIndex = 0;
    private _deck: MentorDeck | null = null;
    private _candidates: MentorCard[] = [];
    private _guest = false;
    private _ancestors: ReadonlySet<string> = new Set();
    private _controlMode: AcademyControlMode = AcademyControlMode.MANUAL;
    private _notice = '';
    private _mode: AcademySessionMode = 'idle';
    private _settle: AcademySettleSummary | null = null;
    private _picked: number[] = [];
    private _busy = false;

    constructor(private readonly _deps: AcademyFlowDeps<H>) {
        this._manager = new AcademyAntiSLManager(this._store, YINGCHUAN_GIMMICK);
    }

    private get _lookup(): AcademyFlowTextLookup {
        return this._deps.lookup();
    }

    private _t(key: string, ...args: (string | number)[]): string {
        return academyTextOf(this._lookup, K + key, ...args);
    }

    public get enrollHost(): H | null {
        return this._enrollHost;
    }

    public get sessionHost(): H | null {
        return this._sessionHost;
    }

    public async mount(): Promise<void> {
        const enrollBindings: AcademyButtonBinding[] = [
            { buttonId: 'btnAcEnrollBack', handler: () => this.closeAll() },
            { buttonId: 'btnAcPrevChild', handler: () => { void this.selectChild(-1); } },
            { buttonId: 'btnAcNextChild', handler: () => { void this.selectChild(1); } },
            { buttonId: 'btnAcEnrollMode', handler: () => this.cycleEnrollMode() },
            { buttonId: 'btnAcEnrollConfirm', handler: () => { void this.enroll(); } },
            ...Array.from({ length: 5 }, (_, i) => ({ buttonId: `btnAcAcademy${i}`, handler: () => this.pickAcademy(i) })),
            ...Array.from({ length: 4 }, (_, i) => ({ buttonId: `btnAcMentor${i}`, handler: () => { void this.cycleMentor(i); } })),
        ];
        const sessionBindings: AcademyButtonBinding[] = [
            { buttonId: 'btnAcLeave', handler: () => { void this.leave(); } },
            { buttonId: 'btnAcMode', handler: () => { void this.cycleSessionMode(); } },
            { buttonId: 'btnAcRest', handler: () => { void this.act({ actionType: 'REST' }); } },
            { buttonId: 'btnAcConfirm', handler: () => { void this.confirm(); } },
            { buttonId: 'btnAcInterrupt', handler: () => { void this.resolveInterrupt(); } },
            { buttonId: 'btnAcDebate', handler: () => { void this.playDebate(); } },
            { buttonId: 'btnAcSkip', handler: () => { void this.act({ actionType: 'GIMMICK_INTERACT', selectedOptionId: 'SKIP' }); } },
            { buttonId: 'btnAcDecline', handler: () => { void this.act({ actionType: 'GIMMICK_INTERACT', selectedOptionId: 'DECLINE' }); } },
            { buttonId: 'btnAcEventA', handler: () => { void this.act({ actionType: 'GIMMICK_INTERACT', selectedOptionId: 'EVENT:A' }); } },
            { buttonId: 'btnAcEventB', handler: () => { void this.act({ actionType: 'GIMMICK_INTERACT', selectedOptionId: 'EVENT:B' }); } },
            ...ACADEMY_STAT_KEYS.map((key) => ({ buttonId: `btnAcTrain_${key}`, handler: () => { void this.act({ actionType: 'TRAIN', targetStat: key }); } })),
            ...Array.from({ length: 5 }, (_, i) => ({ buttonId: `btnAcCard${i}`, handler: () => { void this.pickCard(i); } })),
        ];
        await this._hydrate();
        this._enrollHost = await this._deps.mountEnrollHost(enrollBindings);
        this._sessionHost = await this._deps.mountSessionHost(sessionBindings);
        this.closeAll();
    }

    /** 從權威端讀回修業紀錄與種子（掛載與每次從大廳進入時；讀檔、結業清檔後快取才不會過期） */
    private async _hydrate(): Promise<void> {
        // 上一次「確認」的落盤失敗時，快取比權威端新；不要拿舊的蓋掉，等下一次動作補寫
        if (!this._unsaved) this._store.replace(await this._deps.api.loadRecord());
        this._worldSeed = await this._deps.api.issueSeed();
    }

    /** 大廳「學府」入口：有進行中的修業就直接回修業畫面，否則開入學畫面 */
    public async openFromMenu(): Promise<void> {
        await this._hydrate();
        if (this._deps.isActive()) await this.openSession();
        else await this.openEnroll();
    }

    public closeAll(): void {
        if (this._enrollHost) this._enrollHost.node.active = false;
        if (this._sessionHost) this._sessionHost.node.active = false;
    }

    // ── 入學 ────────────────────────────────────────────

    /** 可選的子嗣：活著、已選宿命或投靠少年或開局義子、尚未結業且未被俘（PROG-2-9609，11/21 使用者裁決第 29 條） */
    public enrollChildren(): AcademyChildLike[] {
        return this._deps.roster().filter((g) => (g.status ?? '').toLowerCase() !== 'dead'
            && (!!g.fate?.choice || !!g.youth || g.adoptSource === 'starter') && !g.graduationRating && !g.captivity);
    }

    /** 學府籌備名單：找出尚未及冠（未滿 15 歲）且活著、未結業之門生，計算距及冠年數（升冪排序）（PROG-2-9609） */
    public prepUpcomingStudents(): PrepUpcomingStudent[] {
        const rules = academyEnrollRules();
        const minAge = rules.minEnrollAge;
        return this._deps.roster()
            .filter((g) => (g.status ?? '').toLowerCase() !== 'dead' && !g.graduationRating && !g.captivity)
            .filter((g) => (g.age ?? 0) < minAge)
            .map((g) => {
                const age = Math.floor(g.age ?? 0);
                const yearsUntilEnroll = Math.max(1, minAge - age);
                return {
                    id: g.id,
                    name: g.name,
                    age,
                    yearsUntilEnroll,
                };
            })
            .sort((a, b) => a.yearsUntilEnroll - b.yearsUntilEnroll);
    }

    private _currentChild(): AcademyChildLike | null {
        const list = this.enrollChildren();
        if (list.length === 0) return null;
        this._childIndex = ((this._childIndex % list.length) + list.length) % list.length;
        return list[this._childIndex];
    }

    public async openEnroll(): Promise<void> {
        const host = this._enrollHost;
        if (!host) return;
        if (this._sessionHost) this._sessionHost.node.active = false;
        this._notice = '';
        this._controlMode = AcademyControlMode.MANUAL;
        await this._loadMentors();
        host.node.active = true;
        this._deps.bringToFront(host);
        this._refreshEnroll();
    }

    public async selectChild(step: number): Promise<void> {
        this._childIndex += step;
        this._notice = '';
        this._deck = null;
        await this._loadMentors();
        this._refreshEnroll();
    }

    public pickAcademy(index: number): void {
        if (index === 0) {
            this._notice = '';
        } else {
            const names = ['', 'youzhou', 'jiangdong', 'luoyang', 'longzhong'];
            const name = academyTextOf(this._lookup, `${K}name.${names[index]}`);
            this._notice = this._t('soon_toast', name);
            this._deps.toast(this._notice);
        }
        this._refreshEnroll();
    }

    public cycleEnrollMode(): void {
        this._controlMode = nextControlMode(this._controlMode);
        this._refreshEnroll();
    }

    public async cycleMentor(slot: number): Promise<void> {
        if (this._guest) return;
        this._deck = cycleMentorDeckSlot(this._deck ?? preferredMentorDeck(this._candidates, this._ancestorUidSet()), this._candidates, slot);
        this._refreshEnroll();
    }

    private _mentorSlots(): number {
        const rules = academyEnrollRules();
        // 祠堂 Lv.4 起多 1 格：沿用祠堂福祉套用函式的判斷，不在這裡重複寫門檻
        const probe = applyClanPrestigeToAcademy(createAcademySnapshot(this._probeAdmission()), this._deps.clanPrestigeTier());
        return rules.mentorSlotsBase + (probe.mentorSlots !== undefined ? 1 : 0);
    }

    private _probeAdmission(): AcademyAdmission {
        return {
            worldSeed: this._worldSeed, clanUuid: this._deps.clanUuid(), childId: 'probe', academyId: AcademyId.YINGCHUAN,
            admissionTurn: this._deps.admissionTurn(), initialStats: { str: 0, lea: 0, int: 0, pol: 0, cha: 0 },
        };
    }

    private _ancestorUidSet(): Set<string> {
        return new Set(this._candidates.filter((c) => isAncestorMentor(c, this._ancestors as Set<string>)).map((c) => c.uid));
    }

    /** 讀可帶入的教官卡：先祖置頂；家中完全沒有教官時由客卿名儒任教 */
    private async _loadMentors(): Promise<void> {
        const child = this._currentChild();
        const locked = new Set(this._deps.lockedMentorIds());
        const owned = (await this._deps.loadMentorCards()).filter((c) => !locked.has(c.uid));
        const roster = this._deps.roster() as unknown as LineageGeneral[];
        const self = child ? roster.find((g) => g.id === child.id) : undefined;
        this._ancestors = self ? ancestorIdsOf(self, roster, owned) : new Set<string>();
        this._guest = owned.length === 0 && child !== null;
        this._candidates = this._guest && child ? [guestScholarMentorCard(child.id)] : ancestorMentorsFirst(owned, this._ancestors as Set<string>);
        const base = this._deck ? sanitizeMentorDeck(this._deck, this._candidates) : preferredMentorDeck(this._candidates, this._ancestorUidSet());
        this._deck = base.every((uid) => uid === null) ? preferredMentorDeck(this._candidates, this._ancestorUidSet()) : base;
    }

    private _chosenMentors(): MentorCard[] {
        const slots = this._mentorSlots();
        const deck = (this._deck ?? preferredMentorDeck(this._candidates, this._ancestorUidSet())).map((uid, i) => (i < slots ? uid : null));
        return mentorDeckCards(deck, this._candidates);
    }

    /** 入學資格（不含入學令與教官數量）：回傳還差幾年與其他擋因 */
    public eligibility(child: AcademyChildLike): { yearsShort: number; blocked: boolean } {
        const age = checkEnrollAge(child.age ?? 0);
        const reasons = this._deps.nurtureBlockReasons(child.id).filter((r) => ENROLL_BLOCKING_REASONS.indexOf(r) >= 0);
        return { yearsShort: age.yearsShort, blocked: reasons.length > 0 };
    }

    private _enrollModel(): EnrollViewModel {
        const list = this.enrollChildren();
        const child = this._currentChild();
        const elig = child ? this.eligibility(child) : { yearsShort: 0, blocked: true };
        const chosen = this._chosenMentors();
        const slots = this._mentorSlots();
        const tokens = this._deps.tokensLeft();
        const mentors = Array.from({ length: slots }, (_, i) => {
            const card = chosen[i];
            return { name: card ? card.name : null, isAncestor: card ? isAncestorMentor(card, this._ancestors as Set<string>) : false };
        });
        return {
            childCount: list.length,
            child: child ? {
                id: child.id, name: child.name, age: Math.floor(child.age ?? 0),
                stats: { str: child.str ?? 0, lea: child.lea ?? 0, int: child.int ?? 0, pol: child.pol ?? 0, cha: child.cha ?? 0 },
            } : null,
            childIndex: this._childIndex,
            yearsShort: elig.yearsShort,
            ancestorRecommended: !!child && elig.yearsShort === 0 && shouldRecommendAncestor(child.age ?? 0),
            mentorSlots: slots,
            mentors,
            guestTeaching: this._guest,
            controlMode: this._controlMode,
            tokens,
            notice: this._notice,
            canEnroll: !!child && elig.yearsShort === 0 && !elig.blocked && tokens > 0 && chosen.length > 0 && !this._deps.isActive(),
            prepUpcoming: list.length === 0 ? this.prepUpcomingStudents() : undefined,
        };
    }

    private _refreshEnroll(): void {
        if (this._enrollHost) this._deps.apply(this._enrollHost, enrollView(this._enrollModel(), this._lookup));
    }

    /**
     * 入學：建快照 → 套祠堂與先祖傳承 → 指派教官 → 扣入學令 → 寫入並落盤；落盤失敗全部還原。
     * qa 只給 debug.fastForward 的偵錯入口（PROG-2-9192）：略過年齡與入學令檢查，其餘照走；玩家按鈕一律不帶。
     */
    public async enroll(opts: { qa?: boolean } = {}): Promise<boolean> {
        if (this._busy) return false;
        const child = this._currentChild();
        if (!child) { this._failEnroll(this._t('enroll.err.no_child')); return false; }
        if (this._deps.isActive()) { this._failEnroll(this._t('enroll.err.active')); return false; }
        const elig = this.eligibility(child);
        if (elig.yearsShort > 0 && !opts.qa) { this._failEnroll(this._t('enroll.err.too_young', elig.yearsShort)); return false; }
        if (elig.blocked) { this._failEnroll(this._t('enroll.err.failed', this._deps.nurtureBlockReasons(child.id).join(','))); return false; }
        const cards = this._chosenMentors();
        if (cards.length === 0) { this._failEnroll(this._t('enroll.err.no_mentor')); return false; }
        // 先佔住 busy 再等扣令（扣令是非同步命令），避免連點重複入學
        this._busy = true;
        let tokenTaken = false;
        try {
            if (!opts.qa) {
                if (!(await this._deps.consumeToken())) { this._failEnroll(this._t('enroll.err.no_token')); return false; }
                tokenTaken = true;
            }
            this._worldSeed = await this._deps.api.issueSeed();
            // 先開學府任務（占用由任務框架登記，孩子忙碌時在這裡被擋下）；落盤失敗再撤回
            const qid = await this._deps.api.acceptTask(child.id, `academy:enroll:${child.id}:${this._deps.admissionTurn()}:${Date.now().toString(36)}`);
            const snapshot = this._buildSnapshot(child, cards);
            this._manager.begin(snapshot);
            try {
                await this._deps.api.saveRecord(this._store.read());
                this._qid = qid;
            } catch {
                this._store.replace(null);
                try { await this._deps.api.abandonTask(qid); } catch { /* 任務殘留由下次入學前的 syncTask 對齊 */ }
                await this._deps.refundToken();
                tokenTaken = false;
                this._failEnroll(this._t('enroll.err.save'));
                return false;
            }
            this._notice = '';
            this._mode = 'idle';
            this._settle = null;
            this._picked = [];
            this._deps.toast(this._t('enroll.done', child.name, academyNameOf(this._lookup, AcademyId.YINGCHUAN)));
            this._deps.onChanged?.();
        } catch (err) {
            this._store.replace(null);
            if (tokenTaken) await this._deps.refundToken();
            this._failEnroll(this._t('enroll.err.failed', (err as Error)?.message ?? String(err)));
            return false;
        } finally {
            this._busy = false;
        }
        await this.openSession();
        return true;
    }

    /** 把快取裡的紀錄寫到權威端（save.write）；失敗要丟錯 */
    private async _advanceTask(before: Readonly<AcademyStateSnapshot>): Promise<void> {
        if (!this._qid) this._qid = (await this._deps.api.syncTask(before.childId, completedTurnsOf(before))).qid;
        await this._deps.api.advanceTurn(this._qid, completedTurnsOf(before));
    }

    private async _persist(): Promise<void> {
        await this._deps.api.saveRecord(this._store.read());
        this._unsaved = false;
    }

    /** 不影響動作結果的落盤（確認結算、補寫恢復狀態）：失敗不擋流程，記下待補 */
    private async _persistQuiet(): Promise<void> {
        try { await this._persist(); } catch { this._unsaved = true; }
    }

    private _failEnroll(message: string): void {
        this._notice = message;
        this._deps.toast(message);
        this._refreshEnroll();
    }

    private _buildSnapshot(child: AcademyChildLike, cards: readonly MentorCard[]): AcademyStateSnapshot {
        const admission: AcademyAdmission = {
            worldSeed: this._worldSeed, clanUuid: this._deps.clanUuid(), childId: child.id, academyId: AcademyId.YINGCHUAN,
            admissionTurn: this._deps.admissionTurn(), controlMode: this._controlMode,
            initialStats: { str: child.str ?? 0, lea: child.lea ?? 0, int: child.int ?? 0, pol: child.pol ?? 0, cha: child.cha ?? 0 },
        };
        let snap = applyClanPrestigeToAcademy(createAcademySnapshot(admission, YINGCHUAN_GIMMICK), this._deps.clanPrestigeTier());
        snap.mentorSlots = this._mentorSlots();
        const ancestors = this._ancestors as Set<string>;
        const legends: ILegendaryMentorCard[] = cards.filter((c) => isAncestorMentor(c, ancestors))
            .map((c) => extractLegendaryMentor(c, { isBloodline: true }));
        if (legends.length > 0) snap = attachLegacySupport(snap, legends);
        const defs: YingchuanMentorDef[] = cards.map((card, i) => this._mentorDef(card, i, ancestors));
        return assignYingchuanMentors(snap, defs);
    }

    /** 教官卡 → 潁川教官；卡片沒有傳授戰法（例如客卿）時，依序借用規格點名教官的系別與戰法 */
    private _mentorDef(card: MentorCard, index: number, ancestors: ReadonlySet<string>): YingchuanMentorDef {
        const legend = extractLegendaryMentor(card, { isBloodline: ancestors.has(card.sourceGeneralId) });
        const def = legendaryMentorToYingchuan(legend);
        if (def) return def;
        const fallback = YINGCHUAN_MENTOR_CATALOG[index % YINGCHUAN_MENTOR_CATALOG.length];
        return { generalId: legend.mentorId, name: card.name, category: fallback.category, signatureTactic: fallback.signatureTactic, initialBond: legend.initialAffinity };
    }

    // ── 修業 ────────────────────────────────────────────

    private _snapshot(): AcademyStateSnapshot | null {
        return this._store.read()?.committed ?? null;
    }

    private _modeOf(snap: Readonly<AcademyStateSnapshot>): AcademySessionMode {
        if (snap.graduated) return 'graduated';
        return snap.pendingInterrupt ? 'interrupt' : 'idle';
    }

    /** 進入（或回到）修業畫面：未確認的結算由 recover() 帶回，進度停在同一回合 */
    public async openSession(): Promise<void> {
        const host = this._sessionHost;
        if (!host) return;
        const record = this._store.read();
        if (!record) { this._deps.toast(this._t('lobby.resume_toast')); return; }
        this._busy = true;
        try {
            this._picked = [];
            this._notice = '';
            this._settle = null;
            // 任務與紀錄對齊（舊存檔補開、暫離恢復）；任務服務出錯不擋修業畫面，下一次動作會再報錯
            try {
                this._qid = (await this._deps.api.syncTask(record.committed.childId, completedTurnsOf(record.committed))).qid;
            } catch (err) {
                this._qid = null;
                this._notice = this._t('sess.err.action', (err as Error)?.message ?? String(err));
            }
            if (!record.acknowledged && record.before) {
                const recovered = this._manager.recover();
                const settle = settleOf(record.before, record.committed, true);
                settle.crashWarning = recovered?.warning ? (recovered.snapshot.sessionCrashCounter) : 0;
                this._settle = settle;
                this._mode = 'settling';
                await this._persistQuiet();
            } else {
                this._mode = this._modeOf(record.committed);
            }
        } finally {
            this._busy = false;
        }
        if (this._enrollHost) this._enrollHost.node.active = false;
        host.node.active = true;
        this._deps.bringToFront(host);
        this._refreshSession();
        this._notifyInterrupt();
    }

    private _notifyInterrupt(): void {
        const snap = this._snapshot();
        if (this._mode === 'interrupt' && snap) this._deps.openInterrupt?.(snap);
    }

    private _refreshSession(): void {
        const snap = this._snapshot();
        if (!this._sessionHost || !snap) return;
        const child = this._deps.roster().find((g) => g.id === snap.childId);
        this._deps.apply(this._sessionHost, sessionView({
            snapshot: snap, childName: child?.name ?? snap.childId, mode: this._mode, settle: this._settle,
            notice: this._notice, pickedCards: this._picked,
        }, this._lookup));
    }

    /**
     * 執行一個修業動作：先 commit（記憶體），再落盤；落盤失敗就還原存檔紀錄、動作不生效。
     * TRAIN／REST 之後進入結算確認（未確認前離開，下次回來由 recover() 補顯示）；
     * 專屬互動與打斷點沒有結算畫面，直接確認。
     */
    public async act(action: AcademyActionPayload): Promise<boolean> {
        const allowed = this._mode === 'idle' || (action.actionType === 'RESOLVE_INTERRUPT' && this._mode === 'interrupt');
        if (this._busy || !allowed) return false;
        const before = this._store.read();
        if (!before) return false;
        this._busy = true;
        try {
            let next: AcademyStateSnapshot;
            try {
                next = this._manager.commit(action);
            } catch (err) {
                this._notice = this._t('sess.err.action', (err as Error)?.message ?? String(err));
                this._deps.toast(this._notice);
                this._refreshSession();
                return false;
            }
            // 回合推進走 task.advance（TRAIN／REST 才算打完一回合）；先於落盤，失敗時動作不生效，重送冪等
            if (action.actionType === 'TRAIN' || action.actionType === 'REST') {
                try {
                    await this._advanceTask(before.committed);
                } catch (err) {
                    this._store.replace(before);
                    this._notice = this._t('sess.err.action', (err as Error)?.message ?? String(err));
                    this._deps.toast(this._notice);
                    this._refreshSession();
                    return false;
                }
            }
            try {
                await this._persist();
            } catch {
                this._store.replace(before);
                this._notice = this._t('sess.err.save');
                this._deps.toast(this._notice);
                this._refreshSession();
                return false;
            }
            this._notice = '';
            this._picked = [];
            if (action.actionType === 'TRAIN' || action.actionType === 'REST') {
                this._settle = settleOf(before.committed, next, false);
                this._mode = 'settling';
            } else {
                this._manager.acknowledge();
                await this._persistQuiet();
                this._settle = null;
                this._mode = this._modeOf(next);
            }
            this._deps.onChanged?.();
        } finally {
            this._busy = false;
        }
        this._afterStep();
        return true;
    }

    private _afterStep(): void {
        this._refreshSession();
        const snap = this._snapshot();
        if (!snap) return;
        if (this._mode === 'graduated') this._deps.onGraduated?.(snap);
        else this._notifyInterrupt();
    }

    /**
     * 補結業（PROG-2-9211）：紀錄已是 graduated 卻沒結算（舊存檔、或結業彈窗前就關掉遊戲）時，
     * 重新交給 onGraduated 結算。沒有這種紀錄回傳 false。
     */
    public settlePendingGraduation(): boolean {
        const snap = this._snapshot();
        if (!snap || !snap.graduated) return false;
        this._mode = 'graduated';
        this._deps.onGraduated?.(snap);
        return true;
    }

    /** 結算畫面的「確認」：確認紀錄後回到可操作狀態；已結業則關閉修業畫面 */
    public async confirm(): Promise<void> {
        if (this._busy) return;
        if (this._mode === 'graduated') { this.closeAll(); this._deps.onChanged?.(); return; }
        if (this._mode !== 'settling') return;
        this._busy = true;
        try {
            const snap = this._manager.acknowledge();
            await this._persistQuiet();
            this._settle = null;
            this._mode = this._modeOf(snap);
        } finally {
            this._busy = false;
        }
        this._afterStep();
    }

    /** 打斷點：沒有彈窗接手時，用第一個選項繼續；9190 彈窗選完後也呼叫這裡並帶入選項 */
    public async resolveInterrupt(optionId?: string): Promise<void> {
        const snap = this._snapshot();
        if (!snap || !snap.pendingInterrupt) return;
        const option = optionId ?? snap.interruptOptions[0];
        await this.act({ actionType: 'RESOLVE_INTERRUPT', selectedOptionId: option });
    }

    /** 暫離：結算中先確認紀錄（正常離開不算異常中斷），修業進度保留，大廳有入口可回來 */
    public async leave(): Promise<void> {
        if (this._mode === 'settling') await this.confirm();
        if (this._qid) { try { await this._deps.api.pauseTask(this._qid); } catch { /* 暫離標記失敗不擋離開，回來時 syncTask 會恢復 */ } }
        this.closeAll();
        this._deps.onChanged?.();
    }

    /** 修業中切換控制模式：改寫已確認的紀錄（不推進回合），落盤失敗就還原 */
    public async cycleSessionMode(): Promise<void> {
        const record = this._store.read();
        if (this._busy || this._mode !== 'idle' || !record) return;
        this._busy = true;
        try {
            const committed = JSON.parse(JSON.stringify(record.committed)) as AcademyStateSnapshot;
            committed.controlMode = nextControlMode(committed.controlMode);
            this._store.write({ committed, before: record.before, action: record.action, acknowledged: true });
            try {
                await this._persist();
            } catch {
                this._store.replace(record);
                this._notice = this._t('sess.err.save');
                this._deps.toast(this._notice);
            }
        } finally {
            this._busy = false;
        }
        this._refreshSession();
    }

    /** 點手牌：清談大會是勾選出牌；有待收新牌時是換掉這張牌 */
    public async pickCard(index: number): Promise<void> {
        const snap = this._snapshot();
        if (!snap || this._mode !== 'idle') return;
        const g = yingchuanStateOf(snap);
        if (g.pendingCard && !g.debatePending) {
            await this.act({ actionType: 'GIMMICK_INTERACT', selectedOptionId: `DISCARD:${index}` });
            return;
        }
        if (!g.debatePending || index >= g.handCards.length) return;
        const at = this._picked.indexOf(index);
        if (at >= 0) this._picked.splice(at, 1);
        else if (this._picked.length < debatePickCount(g.handCards.length)) this._picked.push(index);
        this._refreshSession();
    }

    public async playDebate(): Promise<void> {
        const picks = [...this._picked].sort((a, b) => a - b);
        if (picks.length === 0) return;
        await this.act({ actionType: 'GIMMICK_INTERACT', selectedOptionId: `DEBATE:${picks.join(',')}` });
    }

    public get mode(): AcademySessionMode {
        return this._mode;
    }

    /**
     * QA 快進（PROG-2-9192，只由本機 adapter 的 debug.fastForward 呼叫）：沒有進行中的修業就先以 QA 入學，
     * 再連續 commit 到「已完成 turns 回合」，最後開修業畫面（停在打斷點時由畫面彈出）。
     */
    public async qaFastForward(turns: number): Promise<AcademyFastForwardResult> {
        // 教官候選只在開入學畫面時載入；快進不經過該畫面，入學前要先載入（否則會因沒有教官被擋）
        if (!this._deps.isActive()) await this._loadMentors();
        if (!this._deps.isActive() && !(await this.enroll({ qa: true }))) return { completedTurns: 0, steps: 0, stoppedBy: 'no-record' };
        if (!this._sessionHost?.node.active) await this.openSession();
        const result = await fastForwardAcademy({
            snapshot: () => this._snapshot(),
            mode: () => this._mode,
            act: (action) => this.act(action),
            confirm: () => this.confirm(),
        }, turns, YINGCHUAN_GIMMICK);
        await this.openSession();
        return result;
    }

    public get trainStatKeys(): readonly AcademyStatKey[] {
        return ACADEMY_STAT_KEYS;
    }
}
