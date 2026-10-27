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
import { VITALITY_SCRIPT_KEYS, vitalityScriptText } from './VitalityScriptTexts';
import { fateText } from './FateScriptTexts';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import type { MentorCard } from '../../core/models/MentorCard';
import type { LegendaryMentoringBlock } from '../../core/systems/LegendaryMentoring';
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
import { inspiredTacticIds, mentorFromCard } from '../../core/systems/NurtureSystem';
import type { NurtureInspiration } from '../../core/services/NurtureService';
import { DEFAULT_SYNERGY_GROUPS } from '../../core/systems/MentorSynergy';
import {
    cycleMentorDeckSlot,
    defaultMentorDeck,
    MENTOR_DECK_SIZE,
    MentorDeck,
    mentorDeckCards,
    sanitizeMentorDeck,
} from '../../core/systems/MentorDeck';
import { describeLifecycle } from './GeneralLifecyclePresenter';
import { type BreedTextLookup, fallbackBreedText } from './BreedingTexts';
import { getTacticTpCost } from '../../core/systems/SortieDeploy';
import { learnTpCost } from '../../core/systems/FactorTacticLinkage';
import { hasMatchingGreenFactor, tacticLearnThreshold, type TacticLearnBlock, type TacticLearnCheck } from '../../core/systems/TacticLearning';
import { tacticLoadoutCapacity } from '../../core/systems/TacticLoadout';
import { battleIntelligenceOf } from '../../core/systems/BattleRoster';


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
    /** 精力歸 0 時的劇本提示（PROG-2-0732）；正式環境接 SHOW_TOAST，未提供時不顯示 */
    showToast?: (message: string) => void;
    /** 戰法 id → 中文名（tactic-library）；未提供或查不到時顯示 id（PROG-2-1096） */
    tacticName?: (tacticId: string) => string | undefined;
    /**
     * 好友借用（教官系統 §L-2，PROG-2-1138）：入學成功後寫入借用紀錄；正式環境接 GameSession.borrowFriendMentor。
     * 未提供時開始頁不顯示「好友借用」。回傳 ok=false 時 message 為擋下原因文案。
     */
    commitFriendBorrow?: (friendId: string, sessionId: string) => Promise<{ ok: boolean; message?: string }>;
    /** 結業兌換戰法：正式環境接 GameSession.learnTactic；清單為本場靈感觸發的戰法（PROG-2-1134） */
    learnTactic?: (childId: string, tacticId: string) => Promise<TacticLearnCheck>;
    /** 名將傳道（MENT-15）；正式環境接 GameSession.performLegendaryMentoringFor，未提供時入口不可用 */
    performLegendaryMentoring?: (
        generalId: string,
        childId: string,
        exclusiveSkillId: string | undefined,
    ) => Promise<{ ok: boolean; blocked?: LegendaryMentoringBlock }>;
}

/** 傳道失敗的提示（暫定，文案待企劃定稿） */
/** 入學至少帶的教官數（使用者裁定 2026-10-26；上限為自有 5＋好友借用 1） */
export const MIN_ENROLL_MENTORS = 1;
const NO_MENTOR_HINT = '至少需帶 1 位教官才能入學，請先在下方編成教官';

/** 學戰法失敗的提示 */
const TACTIC_LEARN_BLOCK_TEXT: Record<TacticLearnBlock, string> = {
    INVALID_TACTIC: '沒有這個戰法',
    NOT_NURTURING: '只有培育中的子嗣能學戰法',
    NOT_GRADUATING: '36 回合完成後才能用 TP 兌換戰法',
    NOT_INSPIRED: '本場沒有觸發這個戰法的靈感',
    ALREADY_LEARNED: '已學會這個戰法',
    TP_SHORT: 'TP 未達門檻',
    SLOT_FULL: '戰法槽位已滿（智力每 30 點多 1 槽）',
};

const LEGENDARY_MENTORING_BLOCK_TEXT: Record<LegendaryMentoringBlock, string> = {
    NO_TICKET: '傳道令不足',
    NO_EXCLUSIVE_SKILL: '這位名將沒有專屬奧義',
    NOT_NURTURING: '這位子嗣不在培育中',
    SESSION_ENDED: '這場培育已結束',
    ALREADY_USED: '這位名將已傳道過一次',
};

/**
 * 名將專屬奧義（暫定，PM 2026-10-20）：先從武將既有的奧義欄位找標記為專屬的那一個。
 * 名將模型目前沒有獨立的專屬奧義欄位，待企劃／資料裁決後再換來源。
 */
export function exclusiveSkillOf(general: Pick<GeneralConfig, 'ultimateSlots'> | undefined): string | undefined {
    return general?.ultimateSlots?.find((slot) => slot.isExclusive)?.ultimateId;
}

export class NurtureFlowController {
    private _selectedId: string | null = null;
    private _report: GraduationReport | null = null;
    private _notice = '';
    private _legendaryCards: MentorCard[] = [];
    private _legendaryCardUid: string | null = null;
    /** 入場編成（PROG-2-1085）：null 表示還沒整理過，第一次讀卡時帶預設最強 5 位 */
    private _deck: MentorDeck | null = null;
    /** 入學前選好的好友借用教官（第 6 槽）；入學後清空 */
    private _borrowed: { friendId: string; card: MentorCard } | null = null;
    /** 目前可帶入的教官卡（未被別場培育鎖定）；loadDeck 時更新 */
    private _deckCandidates: MentorCard[] = [];
    /** 戰法列目前指到的戰法（本場靈感戰法清單的索引） */
    private _tacticIndex = 0;

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
            : `${fateText(this._t.bind(this), 'ui.fate.script.defy', child.name)}　${child.name} 逆天而行${updated.fate?.lateBloomer ? `，${this._t('ui.breed.daqi')}` : '，成長率 ×0.8'}`;
        await this._persist();
    }

    /** 重新讀可帶入的教官卡（排除別場培育鎖定的），並整理入場編成；第一次讀時帶預設最強 5 位 */
    async loadDeck(): Promise<void> {
        const locked = new Set(this._deps.nurture.lockedMentorIds());
        this._deckCandidates = (await this._deps.loadMentorCards()).filter((card) => !locked.has(card.uid));
        this._deck = this._deck === null ? defaultMentorDeck(this._deckCandidates) : sanitizeMentorDeck(this._deck, this._deckCandidates);
    }

    /** 點入場編成第 slot 格：換成下一位可用教官，最後一位之後回到空格 */
    cycleDeckSlot(slot: number): void {
        this._deck = cycleMentorDeckSlot(this._deck ?? defaultMentorDeck(this._deckCandidates), this._deckCandidates, slot);
        this._notice = '';
    }

    get deck(): MentorDeck {
        return this._deck ?? defaultMentorDeck(this._deckCandidates);
    }

    private async _deckCards(): Promise<MentorCard[]> {
        await this.loadDeck();
        return mentorDeckCards(this.deck, this._deckCandidates);
    }

    /** 入學前選好友借用教官（§L-2）：佔第 6 槽；傳 null 取消 */
    setBorrowedMentor(friendId: string | null, card: MentorCard | null = null): void {
        this._borrowed = friendId && card ? { friendId, card } : null;
    }

    get borrowedMentor(): MentorCard | null {
        return this._borrowed?.card ?? null;
    }

    /** 入學：帶入場編成裡的教官（最多 5 位，未編成過時用預設最強 5 位），加上好友借用的第 6 位 */
    async startNurture(): Promise<void> {
        const child = this._requireSelected();
        const borrowed = this._borrowed;
        const cards = [...(await this._deckCards()), ...(borrowed ? [borrowed.card] : [])];
        if (cards.length < MIN_ENROLL_MENTORS) {
            this._notice = NO_MENTOR_HINT;
            return;
        }
        const session = this._deps.nurture.startWithCards(child.id, cards);
        this._borrowed = null;
        this._notice = `入學完成，${cards.length} 位教官任教`;
        if (borrowed && this._deps.commitFriendBorrow) {
            const result = await this._deps.commitFriendBorrow(borrowed.friendId, session.sessionId);
            if (!result.ok) this._notice += `（借用紀錄未寫入：${result.message ?? '借用失敗'}）`;
        }
        await this._persist();
    }

    /**
     * 傳道入口（MENT-15）：英靈卡所屬名將的專屬奧義傳給目前選中的子嗣。
     * 成功寫入培育紀錄並扣傳道令；失敗只顯示原因，不扣令。
     */
    /** 英靈卡選擇列：循環 無 → 第 1 張 → … → 無（暫定：卡片清單先用教官卡來源） */
    async cycleLegendaryCard(): Promise<void> {
        this._legendaryCards = await this._deps.loadMentorCards();
        const index = this._legendaryCards.findIndex((c) => c.uid === this._legendaryCardUid);
        this._legendaryCardUid = index + 1 < this._legendaryCards.length ? this._legendaryCards[index + 1].uid : null;
    }

    get legendaryCard(): MentorCard | null {
        return this._legendaryCards.find((c) => c.uid === this._legendaryCardUid) ?? null;
    }

    async legendaryMentor(): Promise<boolean> {
        const child = this._requireSelected();
        const card = this.legendaryCard;
        if (!card) {
            this._notice = '請先選擇英靈卡';
            return false;
        }
        const perform = this._deps.performLegendaryMentoring;
        if (!perform) {
            this._notice = '傳道尚未開放';
            return false;
        }
        const source = this._deps.roster.getAll().find((g) => g.id === card.sourceGeneralId);
        const result = await perform(card.sourceGeneralId, child.id, exclusiveSkillOf(source));
        if (!result.ok) {
            this._notice = LEGENDARY_MENTORING_BLOCK_TEXT[result.blocked ?? 'NOT_NURTURING'];
            return false;
        }
        this._notice = `${child.name} 習得${card.name}的專屬奧義`;
        await this._persist();
        return true;
    }

    async train(action: NurtureAction): Promise<NurtureRoundLog> {
        const child = this._requireSelected();
        const { log, awakening, inspirations, session } = this._deps.nurture.train(child.id, action);
        // 因子解鎖系統 §H UI_AWAKENING：「【覺醒】{GeneName}！」
        this._notice = awakening ? `${describeRound(log)}　【覺醒】${awakening.displayName}！` : describeRound(log);
        // 教官系統 §E：靈感與羈絆觸發要讓玩家看得到（PROG-2-1096）
        const mentorNotes = describeMentorTriggers(log.synergyId, inspirations, session?.mentors ?? [], this._deps.tacticName);
        if (mentorNotes) this._notice += `　${mentorNotes}`;
        if (log.vigorAfter === 0) {
            this._deps.showToast?.(vitalityScriptText(this._t.bind(this), VITALITY_SCRIPT_KEYS.exhausted, child.name));
        }
        const lifespan = this._deps.spendLifespan?.(child.id, 'nurture');
        if (lifespan?.events.some((event) => event.type === 'died')) {
            this._notice += '　壽命耗盡，武將已故';
        }
        await this._persist();
        return log;
    }

    /** 戰法列左右切換 */
    cycleTactic(step: number): void {
        const ids = this._tacticIds();
        if (ids.length === 0) return;
        this._tacticIndex = (((this._tacticIndex + step) % ids.length) + ids.length) % ids.length;
    }

    /** 用 TP 學目前指到的戰法；成功或失敗都寫進提示列 */
    async learnSelectedTactic(): Promise<TacticLearnCheck | null> {
        const child = this._requireSelected();
        const tacticId = this._currentTacticId();
        if (!tacticId || !this._deps.learnTactic) return null;
        const check = await this._deps.learnTactic(child.id, tacticId);
        const name = this._deps.tacticName?.(tacticId) ?? tacticId;
        this._notice = check.ok ? `${child.name} 習得戰法「${name}」` : `無法學習「${name}」：${TACTIC_LEARN_BLOCK_TEXT[check.blocked!]}`;
        return check;
    }

    private _currentTacticId(): string | null {
        const ids = this._tacticIds();
        return ids.length > 0 ? ids[this._tacticIndex % ids.length] : null;
    }

    private _tacticIds(): string[] {
        const child = this._resolveSelected();
        return inspiredTacticIds(child ? this._deps.nurture.getSession(child.id) : null);
    }

    /** 戰法列文字與按鈕狀態：成本含綠因子折扣，門檻＝成本×2，槽位依戰場智力 */
    private _applyTacticRow(child: UnveilingGeneral, session: NurtureSession, texts: Record<string, string>, actives: Record<string, boolean>, enabled: Record<string, boolean>): void {
        if (!this._deps.learnTactic) return;
        actives.tacticBlock = true;
        const tacticId = this._currentTacticId();
        if (!tacticId) {
            texts.tacticName = '本場未觸發戰法靈感';
            texts.tacticCost = '培育中教官靈感事件觸發後，結業才可兌換';
            texts.learnTacticLabel = '學習戰法';
            return;
        }
        const general = child as unknown as GeneralConfig;
        const green = hasMatchingGreenFactor(general.genes, tacticId);
        const cost = learnTpCost(getTacticTpCost(tacticId), green);
        const learned = general.learnedTactics ?? [];
        const capacity = tacticLoadoutCapacity(battleIntelligenceOf(general));
        const count = this._tacticIds().length;
        enabled.btnPrevTactic = count > 1;
        enabled.btnNextTactic = count > 1;
        enabled.btnLearnTactic = !learned.includes(tacticId) && session.tp >= tacticLearnThreshold(cost) && learned.length < capacity;
        const name = this._deps.tacticName?.(tacticId) ?? tacticId;
        texts.tacticName = learned.includes(tacticId) ? `${name}（已學）` : `${name}${green ? '（綠因子半價）' : ''}`;
        texts.tacticCost = `需 TP ${cost}（門檻 ${tacticLearnThreshold(cost)}）`;
        texts.learnTacticLabel = `學習戰法（已學 ${learned.length} / ${capacity} 槽）`;
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
        const cards = await this._deckCards();
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
            btnViewGraduationRecord: false,
        };
        for (const kind of TRAINING_KINDS) enabled[`btnTrain_${kind}`] = false;
        enabled.btnAutoNurture = false;
        enabled.btnMentorDetail = false;
        enabled.btnLegendaryCard = false;
        enabled.btnLegendaryMentor = false;
        enabled.btnStartBorrow = false;
        actives.tacticBlock = false;
        enabled.btnPrevTactic = false;
        enabled.btnNextTactic = false;
        enabled.btnLearnTactic = false;
        for (let i = 0; i < MENTOR_DECK_SIZE; i++) enabled[`btnDeckSlot${i}`] = false;

        if (!child) {
            actives.flowEmptyHint = true;
            return { mode: 'empty', childId: null, texts, actives, enabled };
        }

        if (this._report && this._report.childId === child.id) {
            actives.nurturePanel = true;
            actives.reportBlock = true;
            enabled.btnDismissReport = true;
            enabled.btnViewGraduationRecord = true;
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
            const borrowed = this.borrowedMentor;
            const hasMentor = this.deck.some((uid) => uid !== null) || borrowed !== null;
            enabled.btnStartNurture = check.eligible && hasMentor;
            enabled.btnStartBorrow = !!this._deps.commitFriendBorrow;
            texts.startBorrowLabel = borrowed ? `好友：${borrowed.name} ★${borrowed.stars ?? 0}（點擊取消）` : '＋ 好友借用';
            texts.startHint = !check.eligible
                ? check.reasons.map((r) => BLOCK_REASON_TEXT[r]).join('、')
                : hasMentor
                    ? `入學將消耗 1 張入學令（本季剩 ${this._deps.nurture.admissionsLeft()} 張），帶上下方編成的教官（自有最多 ${MENTOR_DECK_SIZE} 位＋好友借用 1 位）`
                    : NO_MENTOR_HINT;
            Object.assign(texts, buildDeckTexts(this.deck, this._deckCandidates));
            for (let i = 0; i < MENTOR_DECK_SIZE; i++) enabled[`btnDeckSlot${i}`] = this._deckCandidates.length > 0;
            Object.assign(texts, buildSlotTexts(child, null));
            return { mode: 'start', childId: child.id, texts, actives, enabled };
        }

        Object.assign(texts, buildSlotTexts(child, session));
        Object.assign(texts, buildSessionTexts(session, this._notice));
        enabled.btnAbandon = session.status === 'active';
        if (session.status === 'completed') {
            this._applyTacticRow(child, session, texts, actives, enabled);
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
        const legendary = this.legendaryCard;
        enabled.btnLegendaryCard = true;
        texts.legendaryCardLabel = legendary ? `英靈：${legendary.name}` : '英靈：未選';
        enabled.btnLegendaryMentor = !!this._deps.performLegendaryMentoring && !!legendary && session.status === 'active';
        texts.legendaryMentorLabel = '傳道';
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
        this._notice = result.ok === true
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
        fateRecommend: fateText(t, 'ui.fate.reveal', CAREER_LABELS[recommended]),
        fateScript: fateText(t, 'ui.fate.script.reveal', child.name, recommended === 'Warrior' ? '武骨' : '文才', CAREER_LABELS[recommended]),
        fateAcceptLabel: fateText(t, 'ui.fate.accept'),
        fateDefyLabel: fateText(t, 'ui.fate.defy'),
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
const STAR_TEXT = (stars: number): string => (stars > 0 ? '★'.repeat(stars) : '☆0');

/** 入場編成五格的文字：教官名、星等、擅長科目；空格提示可點選 */
function buildDeckTexts(deck: MentorDeck, candidates: readonly MentorCard[]): Record<string, string> {
    const byUid = new Map(candidates.map((card) => [card.uid, card]));
    const texts: Record<string, string> = {};
    let filled = 0;
    for (let i = 0; i < MENTOR_DECK_SIZE; i++) {
        const card = deck[i] ? byUid.get(deck[i] as string) : undefined;
        if (card) {
            filled++;
            const mentor = mentorFromCard(card);
            texts[`deckSlotLabel${i}`] = `${card.name}\n${STAT_LABELS[mentor.specialty]}擅長 ${STAR_TEXT(mentor.stars ?? 0)}`;
        } else {
            texts[`deckSlotLabel${i}`] = candidates.length > 0 ? '空格\n點此選教官' : '空格';
        }
    }
    texts.deckHint = candidates.length > 0
        ? `教官編成 ${filled} / ${MENTOR_DECK_SIZE}：點格子輪換（可用教官 ${candidates.length} 位）`
        : '沒有可用教官：到轉蛋「支援卡池」用支援券抽教官，或讓武將 65 歲退役轉教官';
    return texts;
}

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

/** 教官觸發提示：羈絆名稱與戰法靈感（沒有觸發回傳空字串） */
export function describeMentorTriggers(
    synergyId: string | undefined,
    inspirations: readonly NurtureInspiration[] | undefined,
    mentors: readonly { id: string; name?: string }[],
    tacticName?: (tacticId: string) => string | undefined,
): string {
    const parts: string[] = [];
    if (synergyId) {
        const group = DEFAULT_SYNERGY_GROUPS.find((g) => g.id === synergyId);
        parts.push(`【羈絆】${group?.name ?? synergyId}`);
    }
    for (const entry of inspirations ?? []) {
        const mentor = mentors.find((m) => m.id === entry.mentorId)?.name ?? entry.mentorId;
        parts.push(`【靈感】${mentor}傳授戰法「${tacticName?.(entry.tacticId) ?? entry.tacticId}」`);
    }
    return parts.join('　');
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
