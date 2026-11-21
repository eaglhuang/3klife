// @spec-source → MVP核心循環貫通與遊玩動線功能規格書.md (doc_spec_0308) Phase 2 學府修業；PROG-2-9189
/**
 * AcademyFlowView — 學府入學／修業兩個畫面的文字與顯示狀態（純邏輯，不依賴 cc）
 *
 * 輸入是控制器整理好的 ViewModel，輸出是 FlowView（texts / actives / enabled / fills），
 * key 對應 academy-enroll-main.json 與 academy-session-main.json 的節點 id，
 * 由 NurtureFlowViewApplier 的 applyFlowView 套到節點上。文案缺語系 key 時退回 zh-TW 預設。
 */
import { ACADEMY_STAT_BIAS_PCT, ACADEMY_STAT_KEYS, ACADEMY_TOTAL_TURNS, academyPhaseOf, AcademyControlMode, AcademyId, type AcademyInterruptKind, type AcademyStateSnapshot, type AcademyStatKey } from '../../core/systems/nurture/AcademyTypes';
import { ACADEMY_ENERGY_MAX } from '../../core/systems/nurture/AcademyTypes';
import { YINGCHUAN_EVENTS, YINGCHUAN_HAND_LIMIT, yingchuanStateOf, type EssayCard } from '../../core/systems/nurture/YingchuanAcademy';
import { academyGraduatedTextKey, academyInterruptTextKeys } from '../../core/systems/nurture/AcademyStoryTexts';

export const ACADEMY_FLOW_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    "ui.academy.flow.title_enroll": "學府入學",
    "ui.academy.flow.title_session": "學府修業",
    "ui.academy.flow.back": "返回",
    "ui.academy.flow.leave": "暫離（進度保留）",
    "ui.academy.flow.name.yingchuan": "潁川書院",
    "ui.academy.flow.name.youzhou": "幽州演武堂",
    "ui.academy.flow.name.jiangdong": "江東督府",
    "ui.academy.flow.name.luoyang": "洛陽太學",
    "ui.academy.flow.name.longzhong": "隆中草廬",
    "ui.academy.flow.soon": "即將開放",
    "ui.academy.flow.soon_toast": "{0} 即將開放，目前只開放潁川書院",
    "ui.academy.flow.bias": "特化 {0}",
    "ui.academy.flow.mode.MANUAL": "親自操作（效率 100%）",
    "ui.academy.flow.mode.SEMI_AUTO": "半代管（效率 95%）",
    "ui.academy.flow.mode.AUTO": "全代管（效率 70%）",
    "ui.academy.flow.mode_label": "控制：{0}",
    "ui.academy.flow.enroll.pager": "{0} / {1}",
    "ui.academy.flow.enroll.child": "{0}（{1} 歲）",
    "ui.academy.flow.enroll.stats": "武力 {0}　統率 {1}　智力 {2}　政治 {3}　魅力 {4}",
    "ui.academy.flow.enroll.empty": "目前沒有可入學的子嗣（需已抓周、未結業，且年滿 15 歲及冠）",
    "ui.academy.flow.enroll.hint_young": "15 歲及冠方可入學（還差 {0} 年）",
    "ui.academy.flow.enroll.err.too_young": "15 歲及冠方可入學（還差 {0} 年）",
    "ui.academy.flow.enroll.hint_adult": "已及冠：建議請先祖教官指導（已置頂）",
    "ui.academy.flow.enroll.academy_picked": "▶ {0}\n{1}",
    "ui.academy.flow.enroll.academy_card": "{0}\n{1}",
    "ui.academy.flow.enroll.mentor_slot": "教官 {0}\n{1}",
    "ui.academy.flow.enroll.mentor_empty": "（空）",
    "ui.academy.flow.enroll.mentor_ancestor": "【先祖】{0}",
    "ui.academy.flow.enroll.mentor_guest": "家中沒有教官，將由客卿名儒（水鏡先生）任教",
    "ui.academy.flow.enroll.mentor_hint": "教官插槽 {0} 個（祠堂 Lv.4 起 +1），點格子輪換",
    "ui.academy.flow.enroll.tokens": "入學令 {0} 張",
    "ui.academy.flow.enroll.confirm": "入學",
    "ui.academy.flow.enroll.done": "{0} 進入{1}，36 回合修業開始",
    "ui.academy.flow.enroll.err.no_child": "請先選擇子嗣",
    "ui.academy.flow.enroll.err.no_token": "本季入學令已用完",
    "ui.academy.flow.enroll.err.active": "已有進行中的修業，請先回到修業畫面",
    "ui.academy.flow.enroll.err.no_mentor": "沒有可用的教官",
    "ui.academy.flow.enroll.err.failed": "入學失敗：{0}",
    "ui.academy.flow.enroll.err.save": "存檔失敗，入學未成立",
    "ui.academy.flow.sess.turn": "第 {0} / {1} 回合",
    "ui.academy.flow.sess.phase.FOUNDATION": "建基期",
    "ui.academy.flow.sess.phase.MASTERY": "造詣期",
    "ui.academy.flow.sess.phase.CULMINATION": "大成期",
    "ui.academy.flow.sess.energy": "精力 {0} / {1}",
    "ui.academy.flow.sess.stat": "{0} {1}",
    "ui.academy.flow.sess.train": "訓練{0}",
    "ui.academy.flow.sess.rest": "休息（精力 +30）",
    "ui.academy.flow.sess.mentors": "教官：{0}",
    "ui.academy.flow.sess.mentor_entry": "{0} 好感 {1}/{2}",
    "ui.academy.flow.sess.mentors_none": "教官：無",
    "ui.academy.flow.sess.log_empty": "選擇訓練或休息。",
    "ui.academy.flow.sess.blocked": "請先完成清談或事件，才能訓練或休息",
    "ui.academy.flow.sess.err.action": "操作失敗：{0}",
    "ui.academy.flow.sess.err.save": "存檔失敗，本次操作已撤回",
    "ui.academy.flow.settle.header": "第 {0} 回合結算",
    "ui.academy.flow.settle.gain": "{0} +{1}",
    "ui.academy.flow.settle.no_gain": "本回合五維沒有變化",
    "ui.academy.flow.settle.energy": "精力 {0} → {1}",
    "ui.academy.flow.settle.chronicle": "紀事：{0}（{1}）",
    "ui.academy.flow.settle.recovered": "上次的結算尚未確認，已直接顯示結果",
    "ui.academy.flow.settle.warning": "偵測到異常中斷 {0} 次，請勿在結算時強制關閉",
    "ui.academy.flow.settle.confirm": "確認",
    "ui.academy.flow.yc.debate_title": "清談大會：選 {0} 張策論牌（已選 {1} 張）",
    "ui.academy.flow.yc.event_title": "清談事件：{0}",
    "ui.academy.flow.yc.pending_card": "新得{0}：點選手牌換掉，或放棄新牌",
    "ui.academy.flow.yc.idle": "清談手牌 {0}/{1}　辯論點 {2}",
    "ui.academy.flow.yc.card": "{0}\n{1}★ 辯力 {2}",
    "ui.academy.flow.yc.card_picked": "✔ {0}\n{1}★ 辯力 {2}",
    "ui.academy.flow.yc.btn_debate": "出牌",
    "ui.academy.flow.yc.btn_skip": "略過",
    "ui.academy.flow.yc.btn_decline": "放棄新牌",
    "ui.academy.flow.yc.event.EVT_SHUIJING_QUESTION.title": "水鏡先生之問",
    "ui.academy.flow.yc.event.EVT_SHUIJING_QUESTION.a": "A 答以兵爭大勢（天時牌更常出現、智力 +15）",
    "ui.academy.flow.yc.event.EVT_SHUIJING_QUESTION.b": "B 答以仁德教化（人和牌更常出現、政治 +15）",
    "ui.academy.flow.yc.event.EVT_YINGSHUI_GATHERING.title": "潁水文會偶遇",
    "ui.academy.flow.yc.event.EVT_YINGSHUI_GATHERING.a": "A 欣然賦詩清談（魅力 +20、教官好感 +10）",
    "ui.academy.flow.yc.event.EVT_YINGSHUI_GATHERING.b": "B 閉門靜思農政（獲得《陳平屯田策》）",
    "ui.academy.flow.yc.event.EVT_XUN_LIBRARY.title": "荀氏藏書閣",
    "ui.academy.flow.yc.event.EVT_XUN_LIBRARY.a": "A 研讀《太公六韜》（獲得《星象分野考》）",
    "ui.academy.flow.yc.event.EVT_XUN_LIBRARY.b": "B 考證《春秋經傳》（政治 +25、道德聲望 +10）",
    "ui.academy.flow.yc.event.EVT_CRITIC_DISPUTE.title": "名士品評異議",
    "ui.academy.flow.yc.event.EVT_CRITIC_DISPUTE.a": "A 舌戰群儒（可能獲得名聲 +25）",
    "ui.academy.flow.yc.event.EVT_CRITIC_DISPUTE.b": "B 虛懷若谷拜謝（體力 +20）",
    "ui.academy.flow.yc.event.EVT_FINAL_STRATEGY.title": "終考：王佐之策",
    "ui.academy.flow.yc.event.EVT_FINAL_STRATEGY.a": "A 獻平天下策（解鎖【料敵機先】）",
    "ui.academy.flow.yc.event.EVT_FINAL_STRATEGY.b": "B 獻固本安民策（解鎖【潁水清流】）",
    "ui.academy.flow.int.title": "修業打斷：{0}（彈窗由後續版本接手）",
    "ui.academy.flow.int.kind.MIDTERM": "期中考評",
    "ui.academy.flow.int.kind.COMING_OF_AGE": "弱冠禮",
    "ui.academy.flow.int.kind.RESONANCE": "重大共鳴",
    "ui.academy.flow.int.kind.GRADUATION": "結業確認",
    "ui.academy.flow.int.continue": "以預設選項繼續",
    "ui.academy.flow.graduated": "修業圓滿！結業結算已寫回武將。",
    "ui.academy.flow.lobby.resume_toast": "學府修業進行中，請回到學府繼續",
    "ui.academy.flow.lobby.frozen_toast": "學府修業中，外界時間靜止",
    "ui.academy.flow.lobby.menu": "學府",
    "ui.academy.flow.lobby.menu_resume": "學府修業中",
    'ui.stat.str': '武力',
    'ui.stat.lea': '統率',
    'ui.stat.int': '智力',
    'ui.stat.pol': '政治',
    'ui.stat.cha': '魅力',
};

export type AcademyFlowTextLookup = (key: string) => string;
const IDENTITY_LOOKUP: AcademyFlowTextLookup = (key) => key;

export interface AcademyFlowViewState {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
    fills?: Record<string, number>;
}

/** 查語系並代入 {0}{1}…；查無時退回 zh-TW 預設（lookup 回傳 key 本身視為查無） */
export function academyTextOf(lookup: AcademyFlowTextLookup, key: string, ...args: (string | number)[]): string {
    const localized = lookup(key);
    const template = localized === key ? (ACADEMY_FLOW_FALLBACK_ZH_TW[key] ?? key) : localized;
    return template.replace(/\{(\d+)\}/g, (match, index: string) => {
        const value = args[Number(index)];
        return value === undefined ? match : String(value);
    });
}

const K = 'ui.academy.flow.';

/** 五所學府依序排列：目前只開潁川（PROG-2-9189），其餘顯示「即將開放」 */
export const ACADEMY_ORDER: readonly { id: AcademyId; slug: string; open: boolean }[] = [
    { id: AcademyId.YINGCHUAN, slug: 'yingchuan', open: true },
    { id: AcademyId.YOUZHOU, slug: 'youzhou', open: false },
    { id: AcademyId.JIANGDONG, slug: 'jiangdong', open: false },
    { id: AcademyId.LUOYANG, slug: 'luoyang', open: false },
    { id: AcademyId.LONGZHONG, slug: 'longzhong', open: false },
];

export function academyNameOf(lookup: AcademyFlowTextLookup, academyId: AcademyId): string {
    const entry = ACADEMY_ORDER.find((a) => a.id === academyId);
    return academyTextOf(lookup, `${K}name.${entry?.slug ?? 'yingchuan'}`);
}

export function statLabelText(lookup: AcademyFlowTextLookup, key: AcademyStatKey): string {
    return academyTextOf(lookup, `ui.stat.${key}`);
}

function biasText(lookup: AcademyFlowTextLookup, academyId: AcademyId): string {
    const bias = ACADEMY_STAT_BIAS_PCT[academyId];
    return ACADEMY_STAT_KEYS
        .filter((k) => (bias[k] ?? 0) > 0)
        .map((k) => `${statLabelText(lookup, k)}+${bias[k]}%`)
        .join(' ');
}

// ── 入學畫面 ──────────────────────────────────────────

export interface EnrollChildInfo {
    id: string;
    name: string;
    age: number;
    stats: Record<AcademyStatKey, number>;
}

export interface EnrollMentorSlotInfo {
    /** 教官顯示名；null 表示空格 */
    name: string | null;
    isAncestor: boolean;
}

export interface EnrollViewModel {
    childCount: number;
    /** 目前子嗣（沒有時為 null，顯示空白提示） */
    child: EnrollChildInfo | null;
    childIndex: number;
    /** 距離最低入學年齡還差幾年；0 表示年齡已夠 */
    yearsShort: number;
    ancestorRecommended: boolean;
    mentorSlots: number;
    mentors: readonly EnrollMentorSlotInfo[];
    /** 家中沒有教官時由客卿任教 */
    guestTeaching: boolean;
    controlMode: AcademyControlMode;
    tokens: number;
    notice: string;
    /** 控制器判定的最終可否入學（年齡、令牌、教官與既有修業都已算入） */
    canEnroll: boolean;
}

const CONTROL_MODES: readonly AcademyControlMode[] = [AcademyControlMode.MANUAL, AcademyControlMode.SEMI_AUTO, AcademyControlMode.AUTO];

export function controlModeText(lookup: AcademyFlowTextLookup, mode: AcademyControlMode): string {
    return academyTextOf(lookup, `${K}mode.${mode}`);
}

export function nextControlMode(mode: AcademyControlMode): AcademyControlMode {
    return CONTROL_MODES[(CONTROL_MODES.indexOf(mode) + 1) % CONTROL_MODES.length];
}

export const ENROLL_MENTOR_BUTTONS = 4;

export function enrollView(vm: Readonly<EnrollViewModel>, lookup: AcademyFlowTextLookup = IDENTITY_LOOKUP): AcademyFlowViewState {
    const t = (key: string, ...args: (string | number)[]): string => academyTextOf(lookup, K + key, ...args);
    const has = vm.child !== null;
    const texts: Record<string, string> = {
        acEnrollTitle: t('title_enroll'),
        acEnrollPager: has ? t('enroll.pager', vm.childIndex + 1, vm.childCount) : '',
        acEnrollBackLabel: t('back'),
        acEnrollEmpty: t('enroll.empty'),
        acEnrollChild: vm.child ? t('enroll.child', vm.child.name, vm.child.age) : '',
        acEnrollStats: vm.child
            ? t('enroll.stats', vm.child.stats.str, vm.child.stats.lea, vm.child.stats.int, vm.child.stats.pol, vm.child.stats.cha)
            : '',
        acEnrollHint: vm.yearsShort > 0 ? t('enroll.hint_young', vm.yearsShort) : vm.ancestorRecommended ? t('enroll.hint_adult') : '',
        acMentorHint: vm.guestTeaching ? t('enroll.mentor_guest') : t('enroll.mentor_hint', vm.mentorSlots),
        acEnrollModeLabel: t('mode_label', controlModeText(lookup, vm.controlMode)),
        acEnrollTokens: t('enroll.tokens', vm.tokens),
        acEnrollConfirmLabel: t('enroll.confirm'),
        acEnrollNotice: vm.notice,
    };
    const actives: Record<string, boolean> = { acEnrollBody: has, acEnrollEmpty: !has };
    const enabled: Record<string, boolean> = {
        btnAcPrevChild: vm.childCount > 1,
        btnAcNextChild: vm.childCount > 1,
        btnAcEnrollBack: true,
        btnAcEnrollMode: has,
        btnAcEnrollConfirm: vm.canEnroll,
    };
    ACADEMY_ORDER.forEach((entry, i) => {
        const name = academyTextOf(lookup, `${K}name.${entry.slug}`);
        texts[`acAcademyLabel${i}`] = entry.open
            ? t('enroll.academy_picked', name, biasText(lookup, entry.id))
            : t('enroll.academy_card', name, t('soon'));
        enabled[`btnAcAcademy${i}`] = true;
    });
    for (let i = 0; i < ENROLL_MENTOR_BUTTONS; i++) {
        const slot = vm.mentors[i];
        actives[`btnAcMentor${i}`] = i < vm.mentorSlots;
        const body = slot?.name ? (slot.isAncestor ? t('enroll.mentor_ancestor', slot.name) : slot.name) : t('enroll.mentor_empty');
        texts[`acMentorLabel${i}`] = t('enroll.mentor_slot', i + 1, body);
        enabled[`btnAcMentor${i}`] = has;
    }
    return { texts, actives, enabled };
}

// ── 修業畫面 ──────────────────────────────────────────

export interface AcademySettleSummary {
    turn: number;
    gains: { key: AcademyStatKey; delta: number }[];
    energyBefore: number;
    energyAfter: number;
    chronicles: { title: string; turn: number }[];
    /** 上次結算沒按確認就離開（由 recover 帶回），直接顯示結果 */
    recovered: boolean;
    /** 異常中斷累計次數（達警告門檻才顯示） */
    crashWarning: number;
}

export type AcademySessionMode = 'idle' | 'settling' | 'interrupt' | 'graduated';

export interface SessionViewModel {
    snapshot: Readonly<AcademyStateSnapshot>;
    childName: string;
    mode: AcademySessionMode;
    settle: AcademySettleSummary | null;
    notice: string;
    /** 清談大會已選的手牌索引 */
    pickedCards: readonly number[];
}

/** 打斷種類的名稱：文字 key 讀劇情資料（story-config.json 的 popup 標題），資料缺漏回空字串 */
export function interruptKindText(lookup: AcademyFlowTextLookup, kind: AcademyInterruptKind): string {
    const keys = academyInterruptTextKeys(kind);
    return keys && keys.titleKey ? academyTextOf(lookup, keys.titleKey) : '';
}

/** 打斷點占位彈窗的整句文字：內文 key 讀劇情資料，{0} 代入打斷種類名稱 */
function interruptPopupText(lookup: AcademyFlowTextLookup, kind: AcademyInterruptKind): string {
    const keys = academyInterruptTextKeys(kind);
    return keys && keys.textKey ? academyTextOf(lookup, keys.textKey, interruptKindText(lookup, kind)) : '';
}

/** 清談大會要選幾張：手牌不足 3 張時全選 */
export function debatePickCount(handSize: number): number {
    return Math.min(3, handSize);
}

function cardText(lookup: AcademyFlowTextLookup, card: EssayCard, picked: boolean): string {
    return academyTextOf(lookup, `${K}yc.${picked ? 'card_picked' : 'card'}`, card.name, card.star, card.debatePower);
}

export function settleText(lookup: AcademyFlowTextLookup, settle: Readonly<AcademySettleSummary>): string {
    const lines: string[] = [academyTextOf(lookup, `${K}settle.header`, settle.turn)];
    if (settle.recovered) lines.push(academyTextOf(lookup, `${K}settle.recovered`));
    const gains = settle.gains.filter((g) => g.delta > 0)
        .map((g) => academyTextOf(lookup, `${K}settle.gain`, statLabelText(lookup, g.key), g.delta));
    lines.push(gains.length > 0 ? gains.join('　') : academyTextOf(lookup, `${K}settle.no_gain`));
    lines.push(academyTextOf(lookup, `${K}settle.energy`, settle.energyBefore, settle.energyAfter));
    for (const c of settle.chronicles.slice(0, 2)) lines.push(academyTextOf(lookup, `${K}settle.chronicle`, c.title, c.turn));
    if (settle.crashWarning > 0) lines.push(academyTextOf(lookup, `${K}settle.warning`, settle.crashWarning));
    return lines.join('\n');
}

export function sessionView(vm: Readonly<SessionViewModel>, lookup: AcademyFlowTextLookup = IDENTITY_LOOKUP): AcademyFlowViewState {
    const t = (key: string, ...args: (string | number)[]): string => academyTextOf(lookup, K + key, ...args);
    const s = vm.snapshot;
    const g = yingchuanStateOf(s as AcademyStateSnapshot);
    const energyMax = s.energyMax ?? ACADEMY_ENERGY_MAX;
    const idle = vm.mode === 'idle';
    const blockedByGimmick = g.eventPending !== null || g.debatePending;
    const turnShown = Math.min(s.currentTurn, ACADEMY_TOTAL_TURNS);

    const texts: Record<string, string> = {
        acSessTitle: `${academyNameOf(lookup, s.academyId)}　${vm.childName}`,
        acSessTurn: t('sess.turn', turnShown, ACADEMY_TOTAL_TURNS),
        acSessPhase: t(`sess.phase.${academyPhaseOf(turnShown)}`),
        acSessEnergy: t('sess.energy', s.energy, energyMax),
        acLeaveLabel: t('leave'),
        acModeLabel: t('mode_label', controlModeText(lookup, s.controlMode)),
        acRestLabel: t('sess.rest'),
        acSessNotice: vm.notice,
        acConfirmLabel: t('settle.confirm'),
        acInterruptLabel: t('int.continue'),
        acInterruptText: s.pendingInterrupt ? interruptPopupText(lookup, s.pendingInterrupt) : '',
        acDebateLabel: t('yc.btn_debate'),
        acSkipLabel: t('yc.btn_skip'),
        acDeclineLabel: t('yc.btn_decline'),
    };
    texts.acSessMentors = g.mentors.length === 0
        ? t('sess.mentors_none')
        : t('sess.mentors', g.mentors.map((m) => t('sess.mentor_entry', m.name, m.bond, 100)).join('、'));
    if (vm.mode === 'settling' && vm.settle) texts.acSessLog = settleText(lookup, vm.settle);
    else if (vm.mode === 'graduated') {
        const graduatedKey = academyGraduatedTextKey();
        texts.acSessLog = graduatedKey ? academyTextOf(lookup, graduatedKey) : '';
    }
    else if (blockedByGimmick) texts.acSessLog = t('sess.blocked');
    else texts.acSessLog = s.chronicles.length > 0
        ? s.chronicles.slice(-2).map((c) => t('settle.chronicle', c.title, c.turn)).join('\n')
        : t('sess.log_empty');

    const actives: Record<string, boolean> = {
        acTrainBox: idle || vm.mode === 'settling',
        acGimmickBox: idle && (blockedByGimmick || g.pendingCard !== null || g.handCards.length > 0),
        acInterruptBox: vm.mode === 'interrupt',
        btnAcConfirm: vm.mode === 'settling' || vm.mode === 'graduated',
        btnAcMode: vm.mode !== 'graduated',
    };
    const enabled: Record<string, boolean> = {
        btnAcLeave: true,
        btnAcMode: idle,
        btnAcConfirm: true,
        btnAcInterrupt: true,
        btnAcRest: idle && !blockedByGimmick,
    };
    const fills: Record<string, number> = { acEnergyFill: energyMax > 0 ? s.energy / energyMax : 0 };

    const bias = ACADEMY_STAT_BIAS_PCT[s.academyId];
    for (const k of ACADEMY_STAT_KEYS) {
        texts[`acStat_${k}`] = t('sess.stat', statLabelText(lookup, k), s.stats[k]);
        const pct = bias[k] ?? 0;
        texts[`acBias_${k}`] = pct > 0 ? t('bias', `+${pct}%`) : '';
        texts[`acTrainLabel_${k}`] = t('sess.train', statLabelText(lookup, k));
        enabled[`btnAcTrain_${k}`] = idle && !blockedByGimmick;
    }

    // 潁川專屬：事件抉擇、清談選牌、待收新牌
    const event = g.eventPending ? YINGCHUAN_EVENTS.find((e) => e.id === g.eventPending) : undefined;
    const need = debatePickCount(g.handCards.length);
    texts.acGimmickTitle = g.eventPending
        ? t('yc.event_title', event ? t(`yc.event.${event.id}.title`) : g.eventPending)
        : g.debatePending
            ? t('yc.debate_title', need, vm.pickedCards.length)
            : g.pendingCard
                ? t('yc.pending_card', g.pendingCard.name)
                : t('yc.idle', g.handCards.length, YINGCHUAN_HAND_LIMIT, g.debatePointsPool);
    texts.acEventALabel = g.eventPending ? t(`yc.event.${g.eventPending}.a`) : '';
    texts.acEventBLabel = g.eventPending ? t(`yc.event.${g.eventPending}.b`) : '';
    const showEvent = idle && g.eventPending !== null;
    actives.btnAcEventA = showEvent;
    actives.btnAcEventB = showEvent;
    enabled.btnAcEventA = showEvent;
    enabled.btnAcEventB = showEvent;
    for (let i = 0; i < YINGCHUAN_HAND_LIMIT; i++) {
        const card = g.handCards[i];
        actives[`btnAcCard${i}`] = !showEvent && card !== undefined;
        texts[`acCardLabel${i}`] = card ? cardText(lookup, card, vm.pickedCards.indexOf(i) >= 0) : '';
        enabled[`btnAcCard${i}`] = idle && card !== undefined && (g.debatePending || g.pendingCard !== null);
    }
    const showDebate = idle && g.debatePending && !showEvent;
    actives.btnAcDebate = showDebate;
    actives.btnAcSkip = showDebate;
    enabled.btnAcDebate = showDebate && need > 0 && vm.pickedCards.length === need;
    enabled.btnAcSkip = showDebate && g.handCards.length === 0;
    actives.btnAcDecline = idle && g.pendingCard !== null && !showEvent;
    enabled.btnAcDecline = idle && g.pendingCard !== null;
    return { texts, actives, enabled, fills };
}
