// @spec-source → 培育系統.md (doc_spec_0026) §E、轉職與宿命系統.md (doc_spec_0043) §E、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031)
/**
 * NurtureFlowController — 開獎結果 / 宿命選擇 / 36 回合培育的畫面流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 從名冊挑出「現在該處理」的子嗣：待選宿命 → 培育中 → 可開場；畢業後保留一次結算畫面
 *   - 把狀態整理成 FlowView（texts / actives / enabled），畫面層只需要
 *     binder.setTexts(view.texts)、binder.setActives(view.actives)，不碰任何規則
 *   - 轉接按鈕動作：順應 / 抗命、入學、訓練 / 休息、畢業、放棄；每次動作後呼叫 persist（存檔）
 *
 * 所有欄位名稱（texts / actives / enabled 的 key）都等於 nurture-session-main.json 的節點 id，
 * tests/NurtureFlow.test.ts 會逐一比對，避免版面與流程對不上。
 *
 * Unity 對照：像 MVP 裡的 Presenter。View（UCUF 組出來的節點）只負責顯示，
 * Presenter 讀 Model（名冊 / NurtureService）後吐出 ViewModel，按鈕 onClick 只轉呼叫 Presenter 的方法。
 */
import { lateBloomClueText } from '../../core/systems/LateBloomClue';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import type { MentorCard } from '../../core/models/MentorCard';
import type { NurtureBlockReason, NurtureService } from '../../core/services/NurtureService';
import { mentorToCardData, type MentorCardData } from '../../core/systems/MentorCardTabs';
import type { UnveilingService } from '../../core/services/UnveilingService';
import {
    failureRateForVigor,
    GraduationResult,
    NURTURE_TOTAL_ROUNDS,
    NurtureAction,
    NurtureRoundLog,
    NurtureSession,
    PhaseBlock,
    phaseOfRound,
    TRAINING_KINDS,
    TrainingKind,
    VIGOR_MAX,
} from '../../core/systems/NurtureSystem';
import {
    FATE_DEFY_GROWTH_MODIFIER,
    FateChoice,
    LATE_BLOOMER_CHANCE,
    UNVEILED_STAT_KEYS,
    UnveilingGeneral,
} from '../../core/systems/Unveiling';
import { GENERAL_STATUS_DEAD } from '../../core/systems/GeneralAging';
import { mentorFromCard } from '../../core/systems/NurtureSystem';
import { describeLifecycle } from './GeneralLifecyclePresenter';
import { type BreedTextLookup, fallbackBreedText } from './BreedingTexts';

/** 培育一次最多帶的教官數（NURTURE_MENTOR_SLOTS）由 NurtureService 把關，這裡只負責挑人 */
const MAX_AUTO_MENTORS = 6;

export const STAT_LABELS: Record<string, string> = {
    str: '武力',
    int: '智力',
    lea: '統率',
    pol: '政治',
    cha: '魅力',
    luk: '運氣',
};

const PHASE_LABELS: Record<PhaseBlock, string> = {
    Foundation: '啟蒙期',
    Midterm: '發奮期',
    Sprint: '衝刺期',
};

const CAREER_LABELS: Record<string, string> = { Warrior: '武官', Scholar: '文官' };

/** 自動培育被擋下時的提示（NUR-14 接線；LOCKED / NO_TICKET 文案由 cc 畫面直接顯示） */
const AUTO_BLOCK_TEXT: Record<string, string> = {
    LOCKED: '尚未解鎖自動培育：需先通過一次主線培育季',
    NO_TICKET: '沒有自動培育券',
    NOT_NURTURING: '這位子嗣目前沒有進行中的培育',
    SESSION_ENDED: '這場培育已結束，無法自動培育',
};

/** GameSession.runAutoNurture 的結果形狀（結構型別，UI 不直接依賴 core/managers） */
export type AutoNurtureResult = { ok: true; logs: unknown[] } | { ok: false; blocked: string };

const BLOCK_REASON_TEXT: Record<NurtureBlockReason, string> = {
    'child-not-found': '名冊找不到這位子嗣',
    'child-dead': '已經離世',
    'child-underage': '未滿 5 歲',
    'not-unveiled': '尚未開獎',
    'fate-pending': '請先選擇宿命',
    'already-graduated': '已經畢業',
    'already-nurturing': '培育進行中',
    'wrong-season-mode': '目前不是培育季，請先在大廳推進季度',
    'no-admission-token': '本季入學令已用完',
    'too-many-mentors': '教官超過上限',
    'duplicate-mentor': '教官重複指派',
    'mentor-locked': '教官正在別場任教',
};

export type FlowMode = 'empty' | 'fate' | 'start' | 'train' | 'graduate' | 'report';

export interface FlowView {
    mode: FlowMode;
    /** 目前子嗣 id；empty 時為 null */
    childId: string | null;
    /** layout 節點 id → 文字 */
    texts: Record<string, string>;
    /** layout 節點 id → 顯示 / 隱藏 */
    actives: Record<string, boolean>;
    /** 按鈕 id → 是否可按 */
    enabled: Record<string, boolean>;
}

/** 畢業後保留一次的結算畫面資料 */
interface GraduationReport {
    childId: string;
    name: string;
    result: GraduationResult;
}

export interface NurtureFlowDeps {
    roster: { getAll(): GeneralConfig[] };
    /** 自動培育（NUR-14）：正式環境接 GameSession.runAutoNurture；未提供時不顯示按鈕 */
    autoNurture?: (childId: string) => Promise<AutoNurtureResult>;
    unveiling: Pick<UnveilingService, 'choose'>;
    nurture: Pick<
        NurtureService,
        | 'checkStart' | 'getSession' | 'startWithCards' | 'train' | 'graduate' | 'abandon' | 'lockedMentorIds' | 'admissionsLeft'
        | 'keepReport' | 'retake' | 'commitReport' | 'reportCardCount'
    >;
    /** 退役教官卡來源；正式環境接 LegacyService.getMentorCards */
    loadMentorCards: () => Promise<MentorCard[]>;
    /** 每次動作後存檔；失敗只回報，不中斷流程 */
    persist?: () => Promise<unknown>;
    /** 培育回合的壽命消耗（1 月）；正式環境接 GameSession.spendLifespan */
    spendLifespan?: (generalId: string, command: 'nurture') => { events: readonly { type: string }[] } | null;
    /** 開獎與大器晚成文案（ui.breed.*）；正式環境接 i18n.t，未提供時用 zh-TW 預設文案 */
    text?: BreedTextLookup;
}

export class NurtureFlowController {
    private _selectedId: string | null = null;
    private _report: GraduationReport | null = null;
    private _notice = '';

    constructor(private readonly _deps: NurtureFlowDeps) {}

    private _t(key: string, ...args: string[]): string {
        return (this._deps.text ?? fallbackBreedText)(key, ...args);
    }

    // ── 清單 ───────────────────────────────────────────────────────────────

    /**
     * 需要玩家處理的子嗣，依優先序排列：
     * 待選宿命 → 培育中 → 可開場；剛畢業的那位會排在最後保留結算畫面。
     */
    candidates(): UnveilingGeneral[] {
        const roster = this._deps.roster.getAll() as UnveilingGeneral[];
        const alive = roster.filter((g) => (g.status ?? '').toLowerCase() !== GENERAL_STATUS_DEAD && !!g.fate);
        const graduated = (g: UnveilingGeneral): boolean => !!(g as { graduationRating?: string }).graduationRating;
        const pending = alive.filter((g) => !g.fate?.choice);
        const nurturing = alive.filter((g) => g.fate?.choice && !graduated(g) && this._deps.nurture.getSession(g.id));
        const ready = alive.filter((g) => g.fate?.choice && !graduated(g) && !this._deps.nurture.getSession(g.id));
        const list = [...pending, ...nurturing, ...ready];
        if (this._report) {
            const reported = roster.find((g) => g.id === this._report!.childId);
            if (reported && !list.some((g) => g.id === reported.id)) list.push(reported);
        }
        return list;
    }

    select(childId: string): void {
        this._selectedId = childId;
        this._notice = '';
    }

    selectNext(step = 1): void {
        const list = this.candidates();
        if (list.length === 0) return;
        const current = list.findIndex((g) => g.id === this._selectedId);
        const base = current < 0 ? 0 : current;
        this._selectedId = list[(((base + step) % list.length) + list.length) % list.length].id;
        this._notice = '';
    }

    get selectedId(): string | null {
        return this._resolveSelected()?.id ?? null;
    }

    // ── 動作 ───────────────────────────────────────────────────────────────

    async chooseFate(choice: FateChoice): Promise<void> {
        const child = this._requireSelected();
        const updated = this._deps.unveiling.choose(child.id, choice);
        this._notice = choice === 'accept'
            ? `${child.name} 順應天命，成為${CAREER_LABELS[updated.careerClass ?? ''] ?? '？'}`
            : `${child.name} 逆天而行${updated.fate?.lateBloomer ? `，${this._t('ui.breed.daqi')}` : '，成長率 ×0.8'}`;
        await this._persist();
    }

    /** 入學：自動帶上未被別場鎖定的退役教官（最多 6 位） */
    async startNurture(): Promise<void> {
        const child = this._requireSelected();
        const locked = new Set(this._deps.nurture.lockedMentorIds());
        const cards = (await this._deps.loadMentorCards()).filter((card) => !locked.has(card.uid)).slice(0, MAX_AUTO_MENTORS);
        this._deps.nurture.startWithCards(child.id, cards);
        this._notice = cards.length > 0 ? `入學完成，${cards.length} 位教官任教` : '入學完成（沒有教官任教）';
        await this._persist();
    }

    async train(action: NurtureAction): Promise<NurtureRoundLog> {
        const child = this._requireSelected();
        const { log, awakening } = this._deps.nurture.train(child.id, action);
        // 因子解鎖系統 §H UI_AWAKENING：「【覺醒】{GeneName}！」
        this._notice = awakening ? `${describeRound(log)}　【覺醒】${awakening.displayName}！` : describeRound(log);
        const lifespan = this._deps.spendLifespan?.(child.id, 'nurture');
        if (lifespan?.events.some((event) => event.type === 'died')) {
            this._notice += '　壽命耗盡，武將已故';
        }
        await this._persist();
        return log;
    }

    async graduate(): Promise<GraduationResult> {
        const child = this._requireSelected();
        const result = this._deps.nurture.graduate(child.id);
        this._report = { childId: child.id, name: child.name, result };
        this._notice = '';
        await this._persist();
        return result;
    }

    /** 保留成績單（不寫入名冊，最多 3 份）；會話保留為完成狀態，可再重修或定型 */
    async keepReport(): Promise<void> {
        const child = this._requireSelected();
        const result = this._deps.nurture.keepReport(child.id);
        this._report = null;
        this._notice = `成績單已保留（${this._deps.nurture.reportCardCount(child.id)}/3），評級 ${result.rating}`;
        await this._persist();
    }

    /** 保留並重修：重新開場，已保留的成績單不會丟；入學與教官規則同入學 */
    async retake(): Promise<void> {
        const child = this._requireSelected();
        const locked = new Set(this._deps.nurture.lockedMentorIds());
        const cards = (await this._deps.loadMentorCards()).filter((card) => !locked.has(card.uid)).slice(0, MAX_AUTO_MENTORS);
        this._deps.nurture.retake(child.id, cards.map((card) => mentorFromCard(card)));
        this._report = null;
        this._notice = `${child.name} 重修開場`;
        await this._persist();
    }

    /** 定型：從保留的成績單選最新一份正式畢業，寫入名冊，其餘成績單一併銷毀 */
    async commitReport(): Promise<void> {
        const child = this._requireSelected();
        const count = this._deps.nurture.reportCardCount(child.id);
        if (count === 0) throw new Error(`${child.name} 沒有保留的成績單`);
        const result = this._deps.nurture.commitReport(child.id, count - 1);
        this._report = { childId: child.id, name: child.name, result };
        this._notice = '';
        await this._persist();
    }

    /** 中途放棄；入學令不退，教官解鎖 */
    async abandon(): Promise<void> {
        const child = this._requireSelected();
        this._deps.nurture.abandon(child.id);
        this._notice = `${child.name} 中止培育`;
        await this._persist();
    }

    /** 看完畢業結算後關閉保留的結算畫面 */
    dismissReport(): void {
        this._report = null;
        this._selectedId = null;
    }

    // ── 視圖 ───────────────────────────────────────────────────────────────

    getView(): FlowView {
        const list = this.candidates();
        const child = this._resolveSelected();
        const index = child ? list.findIndex((g) => g.id === child.id) : -1;

        const texts: Record<string, string> = {
            flowTitle: '血脈命鏡 · 培育',
            flowPager: list.length > 0 ? `${index + 1} / ${list.length}` : '0 / 0',
            flowNotice: this._notice,
            flowEmptyHint: '目前沒有需要處理的子嗣。子嗣滿 5 歲會自動開獎，請回大廳推進季度。',
        };
        const actives: Record<string, boolean> = {
            fatePanel: false,
            nurturePanel: false,
            flowEmptyHint: false,
            startBlock: false,
            trainBlock: false,
            graduateBlock: false,
            reportBlock: false,
        };
        const enabled: Record<string, boolean> = {
            btnPrevChild: list.length > 1,
            btnNextChild: list.length > 1,
            btnFateAccept: false,
            btnFateDefy: false,
            btnStartNurture: false,
            btnRest: false,
            btnGraduate: false,
            btnKeepReport: false,
            btnRetake: false,
            btnCommitReport: false,
            btnAbandon: false,
            btnDismissReport: false,
        };
        for (const kind of TRAINING_KINDS) enabled[`btnTrain_${kind}`] = false;
        enabled.btnAutoNurture = false;
        enabled.btnMentorDetail = false;

        if (!child) {
            actives.flowEmptyHint = true;
            return { mode: 'empty', childId: null, texts, actives, enabled };
        }

        if (this._report && this._report.childId === child.id) {
            actives.nurturePanel = true;
            actives.reportBlock = true;
            enabled.btnDismissReport = true;
            Object.assign(texts, buildReportTexts(this._report));
            return { mode: 'report', childId: child.id, texts, actives, enabled };
        }

        if (!child.fate?.choice) {
            actives.fatePanel = true;
            enabled.btnFateAccept = true;
            enabled.btnFateDefy = true;
            Object.assign(texts, buildFateTexts(child, this._deps.text ?? fallbackBreedText));
            return { mode: 'fate', childId: child.id, texts, actives, enabled };
        }

        actives.nurturePanel = true;
        const session = this._deps.nurture.getSession(child.id);
        Object.assign(texts, buildHeaderTexts(child, session));

        if (!session) {
            actives.startBlock = true;
            const check = this._deps.nurture.checkStart(child.id);
            enabled.btnStartNurture = check.eligible;
            texts.startHint = check.eligible
                ? `入學將消耗 1 張入學令（本季剩 ${this._deps.nurture.admissionsLeft()} 張），並帶上退役教官`
                : check.reasons.map((r) => BLOCK_REASON_TEXT[r]).join('、');
            Object.assign(texts, buildSlotTexts(child, null));
            return { mode: 'start', childId: child.id, texts, actives, enabled };
        }

        Object.assign(texts, buildSlotTexts(child, session));
        Object.assign(texts, buildSessionTexts(session, this._notice));
        enabled.btnAbandon = session.status === 'active';
        if (session.status === 'completed') {
            actives.graduateBlock = true;
            enabled.btnGraduate = true;
            enabled.btnKeepReport = true;
            const kept = this._deps.nurture.reportCardCount(child.id);
            enabled.btnRetake = kept > 0;
            enabled.btnCommitReport = kept > 0;
            texts.reportBookLabel = `保留成績單 ${kept} / 3`;
            texts.graduateHint = '36 回合完成，可直接畢業，或先保留成績單再重修／定型';
            return { mode: 'graduate', childId: child.id, texts, actives, enabled };
        }

        actives.trainBlock = true;
        enabled.btnRest = true;
        for (const kind of TRAINING_KINDS) enabled[`btnTrain_${kind}`] = true;
        enabled.btnAutoNurture = !!this._deps.autoNurture;
        enabled.btnMentorDetail = session.mentors.length > 0;
        texts.mentorDetailLabel = '教官詳情';
        texts.autoNurtureLabel = '自動培育整季';
        return { mode: 'train', childId: child.id, texts, actives, enabled };
    }

    /**
     * 教官詳情入口（MENT-13）：回傳目前子嗣第一位教官的詳情資料；沒有教官時回傳 null。
     * 畫面端拿到後呼叫 LobbyScene.openMentorCardDetail。
     */
    mentorDetail(): { title: string; card: MentorCardData } | null {
        const child = this._resolveSelected();
        const session = child ? this._deps.nurture.getSession(child.id) : null;
        const mentor = session?.mentors[0];
        if (!mentor) return null;
        return { title: mentor.name, card: mentorToCardData(mentor) };
    }

    /**
     * 自動培育整季（NUR-14）：成功時寫入提示，被擋下時顯示對應原因，都不改動券數以外的狀態。
     * 扣券與寫回培育狀態由 GameSession.runAutoNurture 負責。
     */
    async autoNurture(): Promise<void> {
        const child = this._requireSelected();
        if (!this._deps.autoNurture) return;
        const result = await this._deps.autoNurture(child.id);
        this._notice = result.ok
            ? `自動培育完成（${result.logs.length} 回合），可以畢業了`
            : AUTO_BLOCK_TEXT[result.blocked] ?? '無法自動培育';
        await this._persist();
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    private _resolveSelected(): UnveilingGeneral | null {
        const list = this.candidates();
        if (list.length === 0) return null;
        const found = list.find((g) => g.id === this._selectedId);
        if (found) return found;
        this._selectedId = list[0].id;
        return list[0];
    }

    private _requireSelected(): UnveilingGeneral {
        const child = this._resolveSelected();
        if (!child) throw new Error('[NurtureFlow] 沒有可處理的子嗣');
        return child;
    }

    private async _persist(): Promise<void> {
        try {
            await this._deps.persist?.();
        } catch (error) {
            this._notice = `${this._notice}（存檔失敗）`;
            // 存檔失敗不回滾已完成的遊戲動作；下一次動作會再存
            void error;
        }
    }
}

// ── 文字整理 ───────────────────────────────────────────────────────────────

function statOf(general: GeneralConfig, key: string): number {
    const top = (general as unknown as Record<string, unknown>)[key];
    if (typeof top === 'number') return top;
    return (general.stats as Record<string, number | undefined> | undefined)?.[key] ?? 0;
}

function buildFateTexts(child: UnveilingGeneral, t: BreedTextLookup): Record<string, string> {
    const recommended = child.fate?.recommended ?? 'Scholar';
    const other = recommended === 'Warrior' ? 'Scholar' : 'Warrior';
    const factors = (child.genes ?? []).filter((gene) => !gene.isLocked);
    return {
        fateName: t('ui.breed.unveil_5', child.name),
        fateAge: `${child.age ?? 5} 歲 · ${describeLifecycle(child).summary} · 開獎於第 ${(child.unveiledSeason ?? 0) + 1} 季`,
        fateStats: UNVEILED_STAT_KEYS.map((key) => `${STAT_LABELS[key]} ${statOf(child, key)}`).join('　'),
        fateFactors: factors.length > 0
            ? `初始因子：${factors.map((gene) => gene.displayName ?? gene.id ?? '？').join('、')}`
            : '初始因子：尚未顯現',
        fateRecommend: `天命建議：${CAREER_LABELS[recommended]}`,
        fateAcceptLabel: `順應天命（${CAREER_LABELS[recommended]}）`,
        fateDefyLabel: `逆天而行（${CAREER_LABELS[other]}）`,
        fateDefyHint: `逆天：成長率 ×${FATE_DEFY_GROWTH_MODIFIER}，有 ${Math.round(LATE_BLOOMER_CHANCE * 100)}% 機率大器晚成。選擇後不可更改。`,
    };
}

function buildHeaderTexts(child: UnveilingGeneral, session: NurtureSession | null): Record<string, string> {
    const round = session ? session.round : 0;
    const phase = phaseOfRound(Math.min(Math.max(round + 1, 1), NURTURE_TOTAL_ROUNDS));
    const growth = child.growthModifier ?? 1;
    return {
        nurtureName: `${child.name}（${CAREER_LABELS[child.careerClass ?? ''] ?? '未定'}）`,
        nurturePhase: session
            ? session.status === 'completed'
                ? '培育完成'
                : `${PHASE_LABELS[phase]} · ${phaseRangeText(phase)}`
            : '尚未入學',
        nurtureRound: `回合 ${session ? session.round : 0} / ${NURTURE_TOTAL_ROUNDS}`,
        nurtureGrowth: `成長率 ×${growth}`,
    };
}

function phaseRangeText(phase: PhaseBlock): string {
    return phase === 'Foundation' ? '回合 1-12' : phase === 'Midterm' ? '回合 13-24' : '回合 25-36';
}

/** 五個訓練格各一行：資質 / 實力 / 站在這一格的教官 */
function buildSlotTexts(child: UnveilingGeneral, session: NurtureSession | null): Record<string, string> {
    const texts: Record<string, string> = {};
    for (const kind of TRAINING_KINDS) {
        const talent = session ? session.talent[kind] : statOf(child, kind);
        const prowess = session ? session.prowess[kind] : 0;
        const onSlot = session ? session.mentors.filter((m) => session.mentorSlots[m.id] === kind) : [];
        const burst = onSlot.some((m) => m.specialty === kind);
        texts[`trainLabel_${kind}`] = `${STAT_LABELS[kind]}訓練`;
        texts[`slotStat_${kind}`] = `資質 ${talent} · 實力 ${prowess}`;
        texts[`slotMentors_${kind}`] = onSlot.length > 0
            ? `${burst ? '★爆發 ' : ''}${onSlot.map((m) => m.name).join('、')}`
            : '—';
    }
    return texts;
}

function buildSessionTexts(session: NurtureSession, notice: string): Record<string, string> {
    const failure = Math.round(failureRateForVigor(session.vigor) * 100);
    const last = session.log[session.log.length - 1];
    return {
        nurtureVigor: `精力 ${session.vigor} / ${VIGOR_MAX}`,
        nurtureFail: `訓練失敗率 ${failure}%`,
        nurtureTp: `TP ${session.tp}`,
        nurtureMentors: session.mentors.length > 0
            ? `教官：${session.mentors.map((m) => m.name).join('、')}`
            : '教官：無',
        nurtureFactors: session.negativeFactors.length > 0 ? `負面因子：${session.negativeFactors.join('、')}` : '負面因子：無',
        nurtureLog: notice || lateBloomClueText(session.vigor, VIGOR_MAX) || (last ? describeRound(last) : '選擇本回合的訓練，或休息回復精力'),
    };
}

export function describeRound(log: NurtureRoundLog): string {
    const head = `第 ${log.round} 回合`;
    // 受傷事件（NUR-09）：跳過回合與受傷回合的動作都不生效，不能顯示成「訓練失敗」或「+0」
    if (log.skipped) return `${head}：傷勢未癒，本回合無法行動`;
    if (log.injured) return `${head}：訓練時受傷，本回合成果作廢，下回合無法行動`;
    const affection = log.affectionGained ? '　好感 +1' : '';
    if (log.action === 'rest') {
        return `${head}：休息，精力 ${log.vigorBefore} → ${log.vigorAfter}${affection}`;
    }
    const label = STAT_LABELS[log.action];
    if (!log.success) {
        return `${head}：${label}訓練失敗${log.negativeFactor ? `，獲得「${log.negativeFactor}」` : ''}${affection}`;
    }
    return `${head}：${label} +${log.statGained}，TP +${log.tpGained}${log.burst ? '（教官爆發！）' : ''}${affection}`;
}

function buildReportTexts(report: GraduationReport): Record<string, string> {
    const { result } = report;
    return {
        nurtureName: `${report.name} 畢業`,
        nurturePhase: '畢業結算',
        nurtureRound: `回合 ${NURTURE_TOTAL_ROUNDS} / ${NURTURE_TOTAL_ROUNDS}`,
        nurtureGrowth: '',
        reportRating: `評級 ${result.rating}`,
        reportScore: `五維評分 ${Math.round(result.ratingScore)}`,
        reportTags: result.tags.length > 0 ? `畢業標籤：${result.tags.join(' / ')}` : '畢業標籤：無',
        reportProwess: TRAINING_KINDS.map((k: TrainingKind) => `${STAT_LABELS[k]} ${result.general.prowess?.[k] ?? 0}`).join('　'),
    };
}
