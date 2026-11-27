/**
 * MissionDetailPresenter — 任務詳情視窗直接讀 IMissionService 的投影（純邏輯，不 import 'cc'）
 *
 * 詳情視窗與候選清單不再經過舊的 HallDialogState 轉接層：
 *  - getDetail／getCandidates 的文字全是服務投影，這裡只排版，不做規則判斷、不補真相。
 *  - 標籤去重：投影文字自帶「風險：」「成功率：」時不再重複加前綴。
 *  - 候選分「可派」「不可派（附原因）」兩組；可派者附記憶提示，自願者加標記。
 *  - 完美獎勵在情報不足時是 ???，並附說明「情報 100 才會揭曉」。
 *  - 派遣後顯示鎖定狀態（情報、分支、成功率凍結）與預計回報季。
 */
import { chainTagText } from '../../core/mission/MissionChain';
import { missionText, type DetailActionKey, type MissionTr } from '../core/HallDetailActionStates';
import { SEASONS_PER_YEAR, formatSeasonLabel } from '../../core/systems/GameClock';
import type { MissionDetailView } from '../../core/mission/MissionTypes';
import type { CandidateView, IMissionService, MissionCardView } from '../../core/mission/service/IMissionService';
import { findCard, type WallOfTheme } from './MissionBoardPresenter';
import { HALL_FUND_NAME } from '../../core/systems/HallMissionActions';
import type { MissionBlock } from '../../core/mission/MissionTypes';

export const MISSION_WALL_NAME: Readonly<Record<string, string>> = Object.freeze({ Military: '軍事', Domestic: '內政', Expedition: '天下沙盤' });
export const MISSION_DIFFICULTY_NAME: Readonly<Record<string, string>> = Object.freeze({ EASY: '簡單', NORMAL: '普通', ELITE: '菁英', ADVANCED: '高級', HELL: '地獄' });
export const MISSION_NO_CANDIDATE_TEXT = '名冊裡目前沒有武將';
export const MISSION_NO_FREE_CANDIDATE_TEXT = '目前沒有可派的武將（見下方各武將原因）';
export const MISSION_MASK_TEXT = '???';
export const MISSION_PERFECT_REVEAL_NOTE = '情報 100 才會揭曉，需靠連鎖任務或特殊情報';
export const MISSION_ACTIVE_BLOCK_TEXT = '任務進行中';

/** 耗費不足行的標記字（視窗用它找出要染紅的列；各語系 mission.detail.cost_short_marker） */
export const MISSION_COST_SHORT_MARKER = '不足，現有';

// ───────────────────────── 文字小工具 ─────────────────────────

/** 去掉投影文字開頭自帶的標籤（含「：」「:」與空白），回傳剩下的內容 */
export function stripLabel(label: string, text: string): string {
    return text.startsWith(label) ? text.slice(label.length).replace(/^[：:\s]+/, '') : text;
}

/**
 * 「標籤：內容」，投影文字自帶標籤時不重複（修「風險：風險：低」）。
 * label 可以是譯後標籤；投影文字自帶的是繁中標籤，所以 zhLabel 也一併去掉。
 */
export function labeled(label: string, text: string, sep = '：', zhLabel = label): string {
    return `${label}${sep}${stripLabel(label, stripLabel(zhLabel, text))}`;
}

/** 再探／等待後的浮字：「情報 +25 → 78%」 */
export function intelGainFloatText(gained: number, intel: number, tr?: MissionTr): string {
    return missionText(tr, 'mission.detail.intel_gain', '情報 +{0} → {1}%', Math.max(0, Math.round(gained)), Math.max(0, Math.min(100, Math.round(intel))));
}

/** 季編碼（totalSeasonsElapsed）→「第 N 年 M 季」（沒給翻譯函式時） */
export function seasonCodeLabel(code: number): string {
    const c = Math.max(0, Math.floor(code));
    return formatSeasonLabel({ currentYear: 1 + Math.floor(c / SEASONS_PER_YEAR), currentSeason: ((c % SEASONS_PER_YEAR) + 1) as 1 | 2 | 3 | 4 });
}

function costLabel(need: number, have: number, tr?: MissionTr): string {
    const text = need.toLocaleString('en-US');
    return need > Math.max(0, Math.floor(have)) ? missionText(tr, 'mission.detail.cost_short', '{0}（不足，現有 {1}）', text, Math.max(0, Math.floor(have))) : text;
}

/** 金／銀兩名稱（耗金走國家公庫、耗銀兩走家族）；只耗一種就顯示那一種，兩種並列，都不耗顯示金 */
function fundNameOf(gold: number, silver: number, tr?: MissionTr): string {
    const goldName = missionText(tr, 'mission.detail.fund.gold', HALL_FUND_NAME.gold);
    const silverName = missionText(tr, 'mission.detail.fund.silver', HALL_FUND_NAME.silver);
    if (gold > 0 && silver > 0) return `${goldName}／${silverName}`;
    return silver > 0 ? silverName : goldName;
}
const ratio = (value: number, scale: number): number => Math.max(0, Math.min(1, scale > 0 ? value / scale : 0));

// ───────────────────────── 候選清單 ─────────────────────────

export interface MissionCandidateOption {
    id: string;
    /** 只放武將名；記憶提示與標記另放，由下拉列各自排版 */
    label: string;
    group: 'available' | 'unavailable';
    volunteer?: boolean;
    /** 可派者的記憶提示（例「曾 3 次勝任軍事」） */
    memoryHint?: string;
    /** 不可派原因（有值＝灰列、不可選） */
    blockedText?: string;
}

/** 候選全員：可派在前（保持服務排序）、不可派在後附原因；不從清單消失 */
export function candidateOptions(candidates: readonly CandidateView[], blockLabel?: (block: MissionBlock) => string): MissionCandidateOption[] {
    const available: MissionCandidateOption[] = [];
    const unavailable: MissionCandidateOption[] = [];
    for (const c of candidates) {
        if (c.block.length === 0) {
            available.push({
                id: c.generalId, label: c.name, group: 'available',
                ...(c.volunteer ? { volunteer: true } : {}),
                ...(c.memoryHint ? { memoryHint: c.memoryHint } : {}),
            });
        } else {
            unavailable.push({ id: c.generalId, label: c.name, group: 'unavailable', blockedText: blockLabel ? c.block.map(blockLabel).join('、') : c.blockText });
        }
    }
    return [...available, ...unavailable];
}

// ───────────────────────── 詳情視窗 state ─────────────────────────

export interface MissionDialogContext {
    season: number;
    stock: { grain: number; gold: number; silver: number; troops: number };
    /** 再探要花的糧草（資料表值） */
    reconGrainCost: number;
    /** 單靠再探的情報上限（資料表值）；沒給時視為 90 */
    reconCap?: number;
    /** 完美獎勵揭曉的情報度（資料表值）；沒給時視為 100 */
    hiddenRevealIntel?: number;
    /** 情報分段門檻（資料表值）；有給時情報提示列會寫「再探到幾 % 能多看到什麼」（PROG-2-9965） */
    intelBands?: { vague: number; clear: number; full: number };
    selectedGeneralId: string | null;
    /** 白話導讀（i18n 組好的一行，PROG-2-10068）：解釋「再探」「情報 N%」；有給且任務未派出、情報未滿時接在情報提示列下面 */
    jargonGuide?: string;
    /** 本場戰場天氣一行（PROG-2-9735）；有值時環境偵察的天氣欄改顯示它，沒給（一般任務）維持「風險・期限」 */
    weatherLine?: string;
    /** 翻譯函式（services().i18n.t）；沒給就用繁中原文（單元測試、未載語系時） */
    tr?: MissionTr;
}

export interface MissionDialogState {
    missionTypeLabel: string;
    missionTitle: string;
    missionBrief: string;
    intelRevealPercent: number;
    intelBody: string;
    intelFogVisible: boolean;
    intelHintLabel: string;
    envScoutTerrainLine: string;
    envScoutWeatherLine: string;
    generalSelectHintLabel: string;
    volunteerBadgeVisible: boolean;
    volunteerBadgeLabel: string;
    costFoodValueLabel: string;
    costFoodRatio: number;
    costTroopValueLabel: string;
    costTroopRatio: number;
    costFundNameLabel: string;
    costFundValueLabel: string;
    costFundRatio: number;
    costTimeValueLabel: string;
    costTimeRatio: number;
    rewardBaseLabel: string;
    rewardPerfectLabel: string;
    aiDelegateHintLabel: string;
    availableActions: DetailActionKey[];
    actionBlockedText: Partial<Record<DetailActionKey, string>>;
    /** 派遣後鎖定中（情報、分支、成功率都凍結） */
    locked: boolean;
}

/** 完美獎勵：揭曉前永遠是 ???＋說明；揭曉後列出內容（沒有則寫無） */
export function perfectRewardLabel(d: Pick<MissionDetailView, 'intel' | 'hiddenRewards'>, hiddenRevealIntel = 100, tr?: MissionTr): string {
    if (d.intel >= hiddenRevealIntel) return d.hiddenRewards.length > 0 ? d.hiddenRewards.join('、') : missionText(tr, 'mission.detail.perfect_none', '無額外完美獎勵');
    return `${MISSION_MASK_TEXT}\n${missionText(tr, 'mission.detail.perfect_note', MISSION_PERFECT_REVEAL_NOTE)}`;
}

/** 鎖定文字（顯示在情報區的提示列）：派出後情報、分支、成功率都已定下 */
export function lockedStatusText(d: Pick<MissionDetailView, 'intel'>, tr?: MissionTr): string {
    return missionText(tr, 'mission.detail.locked_hint', '已鎖定・情報 {0}%，分支與成功率已凍結', d.intel);
}

/** 預計回報季：「第 1 年 2 季回報（還有 1 季）」；沒有回報季時回空字串 */
export function returnSeasonText(card: Readonly<MissionCardView> | undefined, season: number, tr?: MissionTr): string {
    const ret = card?.returnSeason;
    if (ret === undefined) return '';
    const c = Math.max(0, Math.floor(ret));
    return missionText(tr, 'mission.detail.return_season', '預計第 {0} 年 {1} 季回報（還有 {2} 季）',
        1 + Math.floor(c / SEASONS_PER_YEAR), (c % SEASONS_PER_YEAR) + 1, Math.max(0, ret - season));
}

/** 下一段情報能多看到什麼：讓玩家算「再探值不值」（取捨可見）；沒給門檻或已到頂回空字串 */
export function intelUnlockNote(intel: number, bands?: { vague: number; clear: number; full: number }, tr?: MissionTr): string {
    if (!bands) return '';
    if (intel < bands.vague) return missionText(tr, 'mission.detail.unlock.vague', '（到 {0}% 才看得出成功率高低）', bands.vague);
    if (intel < bands.clear) return missionText(tr, 'mission.detail.unlock.clear', '（到 {0}% 可看到成功率區間）', bands.clear);
    if (intel < bands.full) return missionText(tr, 'mission.detail.unlock.full', '（到 {0}% 可看到確切成功率）', bands.full);
    return '';
}

/** 詳情視窗 state（情報遮蔽、成功率投影、耗費不足標示、四鈕可用與原因）；沒有該任務回傳 null */
export function buildMissionDialogState(service: IMissionService, missionId: string, wallOfTheme: WallOfTheme, ctx: Readonly<MissionDialogContext>): MissionDialogState | null {
    const detailRes = service.getDetail(missionId, ctx.selectedGeneralId ? { generalId: ctx.selectedGeneralId } : {});
    if (!detailRes.ok) return null;
    const d = detailRes.value;
    const candRes = service.getCandidates(missionId);
    const candidates = candRes.ok ? candRes.value : [];
    const free = candidates.filter((c) => c.block.length === 0);
    const picked = free.find((c) => c.generalId === ctx.selectedGeneralId) ?? null;
    const board = service.getBoard();
    const card = board.ok ? findCard(board.value, missionId) : undefined;
    const active = d.status === 'ACTIVE';
    const fullBand = d.intelBand === 'full';
    const revealIntel = ctx.hiddenRevealIntel ?? 100;
    const reconCap = ctx.reconCap ?? 90;
    const tr = ctx.tr;
    const T = (key: string, fallback: string, ...args: Array<string | number>): string => missionText(tr, key, fallback, ...args);
    const noCandidateText = candidates.length === 0 ? T('mission.detail.no_candidate', MISSION_NO_CANDIDATE_TEXT) : T('mission.detail.no_free_candidate', MISSION_NO_FREE_CANDIDATE_TEXT);
    const colon = T('mission.detail.colon', '：');
    const labelRate = T('mission.detail.label.rate', '成功率');
    const labelRisk = T('mission.detail.label.risk', '風險');
    const floor0 = (n: number): number => Math.max(0, Math.floor(n));
    const left = Math.max(0, d.expireSeason - ctx.season + 1);

    const shortages: string[] = [];
    if (d.cost.grain > ctx.stock.grain) shortages.push(T('mission.detail.shortage.grain', '糧草不足（需 {0}，現有 {1}）', d.cost.grain, floor0(ctx.stock.grain)));
    if (d.cost.troops > ctx.stock.troops) shortages.push(T('mission.detail.shortage.troops', '兵源不足（需 {0}，現有 {1}）', d.cost.troops, floor0(ctx.stock.troops)));
    if (d.cost.gold > ctx.stock.gold) shortages.push(T('ui.mission.shortage.gold', `${HALL_FUND_NAME.gold}不足（需 {0}，現有 {1}）`, d.cost.gold, floor0(ctx.stock.gold)));
    if (d.cost.silver > ctx.stock.silver) shortages.push(T('ui.mission.shortage.silver', `${HALL_FUND_NAME.silver}不足（需 {0}，現有 {1}）`, d.cost.silver, floor0(ctx.stock.silver)));

    const blocked: Partial<Record<DetailActionKey, string>> = {};
    const offered: DetailActionKey[] = [];
    const offer = (key: DetailActionKey, reason: string | null): void => { if (reason === null) offered.push(key); else blocked[key] = reason; };
    if (active) {
        for (const k of ['re-scout', 'wait', 'execute', 'assign'] as DetailActionKey[]) offer(k, T('mission.detail.active_block', MISSION_ACTIVE_BLOCK_TEXT));
    } else {
        const reconBlock = !d.canRecon ? T('mission.detail.recon_cap', '再探已達上限 {0}%，要到 100% 需靠連鎖任務或特殊情報', reconCap)
            : ctx.stock.grain >= ctx.reconGrainCost ? null
                : T('mission.detail.recon_grain', '糧草不足，再探需要 {0}（現有 {1}）', ctx.reconGrainCost, floor0(ctx.stock.grain));
        offer('re-scout', reconBlock);
        offer('wait', d.canWait ? null : T('mission.detail.waited', '此任務已等待過'));
        const run = free.length === 0 ? noCandidateText : shortages.length > 0 ? shortages.join('、') : null;
        offer('execute', run);
        offer('assign', run);
    }

    const rateLine = active
        ? T('mission.detail.rate_fixed', '{0}（派出時定下）', labeled(labelRate, d.rate.text, ' ', '成功率'))
        : picked ? `${labeled(labelRate, picked.rate.text, ' ', '成功率')}（${picked.name}）`
            : free.length > 0 ? labeled(labelRate, d.rate.text, ' ', '成功率') : noCandidateText;
    // 事實一條一行（長事實由視窗換行，不縮成小字）
    const factsLine = d.facts.filter((f) => f.state !== 'hidden').map((f) => `${f.label}${colon}${f.text}`).join('\n');
    const periodText = active
        ? (returnSeasonText(card, ctx.season, tr) || T('mission.detail.period_active', '進行中'))
        : T('mission.detail.period_left', '剩餘期限 {0} 季', left);
    const intelHint = active ? lockedStatusText(d, tr)
        : d.intel >= revealIntel ? T('mission.detail.intel_full', '情報已完整')
            : fullBand ? T('mission.detail.intel_cap', '情報 {0}%，已達再探上限；100% 才會揭曉完美獎勵', d.intel)
                : T('mission.detail.intel_more', '情報 {0}%，再探或等待可提高{1}', d.intel, intelUnlockNote(d.intel, ctx.intelBands, tr));
    const intelHintWithGuide = !active && d.intel < revealIntel && ctx.jargonGuide ? `${intelHint}
${ctx.jargonGuide}` : intelHint;

    return {
        // 連鎖任務多帶一個「連續任務 2/3」標記（PROG-2-9966）
        missionTypeLabel: `${T(`mission.detail.wall.${wallOfTheme(d.theme)}`, MISSION_WALL_NAME[wallOfTheme(d.theme)] ?? '')}・${T(`mission.detail.difficulty.${d.difficulty}`, MISSION_DIFFICULTY_NAME[d.difficulty] ?? d.difficulty)}${card?.chain ? `・${chainTagText(card.chain.depth, card.chain.total, tr)}` : ''}`,
        missionTitle: d.title,
        missionBrief: d.brief,
        intelRevealPercent: d.intel,
        intelBody: [d.objective.text, ...d.hints].filter((s) => s.length > 0).join('\n'),
        // 鎖定中也要顯示提示列（鎖定文字放在這裡），所以不因情報高而隱藏
        intelFogVisible: !fullBand || active,
        intelHintLabel: intelHintWithGuide,
        envScoutTerrainLine: factsLine || T('mission.detail.no_intel', '尚未探得敵情'),
        envScoutWeatherLine: ctx.weatherLine ?? `${labeled(labelRisk, d.risk.text, colon, '風險')}・${periodText}`,
        generalSelectHintLabel: active && card?.executorName ? T('mission.detail.rate_executor', '{0}・{1}出任務中', rateLine, card.executorName) : rateLine,
        volunteerBadgeVisible: !active && picked?.volunteer === true,
        volunteerBadgeLabel: !active && picked?.volunteer === true ? T('mission.detail.volunteer_badge', '{0} 毛遂自薦', picked.name) : '',
        costFoodValueLabel: costLabel(d.cost.grain, ctx.stock.grain, tr),
        costFoodRatio: ratio(d.cost.grain, 400),
        costTroopValueLabel: costLabel(d.cost.troops, ctx.stock.troops, tr),
        costTroopRatio: ratio(d.cost.troops, 500),
        // 耗金走國家公庫、耗銀兩走家族：只耗一種就顯示那一種，兩種都耗並列；都不耗顯示金 0
        costFundNameLabel: fundNameOf(d.cost.gold, d.cost.silver, tr),
        costFundValueLabel: d.cost.gold > 0 && d.cost.silver > 0 ? `${costLabel(d.cost.gold, ctx.stock.gold, tr)}／${costLabel(d.cost.silver, ctx.stock.silver, tr)}`
            : d.cost.silver > 0 ? costLabel(d.cost.silver, ctx.stock.silver, tr) : costLabel(d.cost.gold, ctx.stock.gold, tr),
        costFundRatio: ratio(Math.max(d.cost.gold, d.cost.silver), 300),
        costTimeValueLabel: T('mission.detail.seasons', '{0} 季', d.durationSeasons),
        costTimeRatio: ratio(d.durationSeasons, 3),
        rewardBaseLabel: d.reward.text,
        rewardPerfectLabel: perfectRewardLabel(d, revealIntel, tr),
        aiDelegateHintLabel: active ? T('mission.detail.ai_active', '已派出，不能更換武將') : free.length > 0 ? T('mission.detail.ai_hint', '委任：系統依武將記憶與適性選人') : noCandidateText,
        availableActions: offered,
        actionBlockedText: blocked,
        locked: active,
    };
}
