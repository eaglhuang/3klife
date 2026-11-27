// @spec-source → 大廳系統 E-9 §4（行動按鈕固定四項）、§3（情報度 50~100）；LobbyHubSchema Available_Actions（PROG-2-0457，暫定）
/**
 * HallDetailActionStates — 任務詳情彈窗四顆行動按鈕（再探 / 執行 / 等待 / 委任）的啟用狀態，純邏輯，不依賴 cc。
 *
 * 規則：
 *   - 按鈕是否出現在任務的 Available_Actions 內（RECON / EXECUTE / WAIT / ASSIGN），是第一道門檻。
 *   - 再探：情報度已到 100 時沒有意義，停用。
 *   - 執行：沒有選派武將、也沒有勾選 AI 委任時停用；情報度未到 100 時仍可執行，但要多問一次「是否再探一次？」（needsIntelConfirm）。
 *   - 等待、委任：只看 Available_Actions。
 * 沒有提供 availableActions（undefined 或空陣列）時沿用舊版行為：四顆全部可按（相容既有狀態表）。
 *
 * Unity 對照：像 Button.interactable 由一個純函式算出來，Inspector 不手填，避免按鈕規則散在多處。
 */
import type { HallTaskAction } from '../../core/systems/LobbyHubSchema';
import { HALL_INTEL_FULL_PERCENT, canRevealFullHallTask } from '../../core/systems/HallTaskIntel';

export type DetailActionKey = 're-scout' | 'execute' | 'wait' | 'assign';

export const DETAIL_ACTION_TO_TASK_ACTION: Readonly<Record<DetailActionKey, HallTaskAction>> = Object.freeze({
    're-scout': 'RECON',
    execute: 'EXECUTE',
    wait: 'WAIT',
    assign: 'ASSIGN',
});

export const FULL_INTEL_PERCENT = HALL_INTEL_FULL_PERCENT;

/** 把任務資料的 Available_Actions（RECON 等）轉成按鈕 key；未知項目略過。 */
export function detailActionsFromTaskActions(actions: readonly HallTaskAction[]): DetailActionKey[] {
    const out: DetailActionKey[] = [];
    for (const key of Object.keys(DETAIL_ACTION_TO_TASK_ACTION) as DetailActionKey[]) {
        if (actions.includes(DETAIL_ACTION_TO_TASK_ACTION[key])) out.push(key);
    }
    return out;
}

export interface DetailActionInput {
    /** 本任務可用的行動按鈕 key；空陣列或 undefined 沿用舊行為（全部可按）。 */
    availableActions?: readonly DetailActionKey[];
    intelRevealPercent: number;
    selectedGeneralId: string | null;
    aiDelegateChecked: boolean;
}

export type DetailActionDisabledReason = 'not-offered' | 'full-intel' | 'need-general';

export interface DetailActionState {
    enabled: boolean;
    reason?: DetailActionDisabledReason;
}

export interface DetailActionStates {
    states: Record<DetailActionKey, DetailActionState>;
    /** 執行時是否要先問「是否再探一次？」（情報度未滿 100） */
    needsIntelConfirm: boolean;
}

/** 任務詳情的翻譯函式（services().i18n.t 的形狀）；查不到鍵時回傳鍵名本身 */
export type MissionTr = (key: string, ...args: Array<string | number>) => string;

/**
 * 取任務詳情的翻譯文字：有翻譯函式且查得到就用譯文，否則用繁中原文（{0}、{1} 代入參數）。
 * 純邏輯測試不載語系時，原文維持現狀，不會露出鍵名。
 */
export function missionText(tr: MissionTr | undefined, key: string, fallback: string, ...args: Array<string | number>): string {
    if (tr) {
        const text = tr(key, ...args);
        if (text !== key) return text;
    }
    return fallback.replace(/\{(\d+)\}/g, (_m, i: string) => String(args[Number(i)] ?? ''));
}

/** 停用的按鈕被點到時，給玩家看的原因（點了不能毫無反應，PROG-2-9123）。 */
export const DETAIL_ACTION_BLOCKED_TEXT: Readonly<Record<DetailActionDisabledReason, string>> = Object.freeze({
    'not-offered': '此任務沒有提供這個行動',
    'full-intel': '情報已完整',
    'need-general': '請先選擇武將，或勾選 AI 委任',
});

/** 停用原因的語系鍵（zh-TW 原文即上表） */
export const DETAIL_ACTION_BLOCKED_KEY: Readonly<Record<DetailActionDisabledReason, string>> = Object.freeze({
    'not-offered': 'mission.detail.blocked.not_offered',
    'full-intel': 'mission.detail.blocked.full_intel',
    'need-general': 'mission.detail.blocked.need_general',
});

export function detailActionBlockedText(reason: DetailActionDisabledReason, tr?: MissionTr): string {
    return missionText(tr, DETAIL_ACTION_BLOCKED_KEY[reason], DETAIL_ACTION_BLOCKED_TEXT[reason]);
}

export function isFullIntel(intelRevealPercent: number): boolean {
    // 判斷統一走 HallTaskIntel（F-5）：缺值、非數字視為預設 50，未滿 100 不算完整（PROG-2-1005）
    return canRevealFullHallTask({ Intel_Reveal_Percent: intelRevealPercent });
}

/** 再探後的情報度：派探子會把情報度刷新到 100（E-9 §3）。 */
export function intelAfterRescout(): number {
    return FULL_INTEL_PERCENT;
}

export function resolveDetailActionStates(input: Readonly<DetailActionInput>): DetailActionStates {
    const offered = (key: DetailActionKey): boolean => {
        const actions = input.availableActions;
        if (!actions || actions.length === 0) return true;
        return actions.includes(key);
    };
    const full = isFullIntel(input.intelRevealPercent);
    const hasExecutor = input.selectedGeneralId !== null || input.aiDelegateChecked;

    const states: Record<DetailActionKey, DetailActionState> = {
        're-scout': offered('re-scout') && !full
            ? { enabled: true }
            : { enabled: false, reason: offered('re-scout') ? 'full-intel' : 'not-offered' },
        execute: !offered('execute')
            ? { enabled: false, reason: 'not-offered' }
            : hasExecutor
                ? { enabled: true }
                : { enabled: false, reason: 'need-general' },
        wait: offered('wait') ? { enabled: true } : { enabled: false, reason: 'not-offered' },
        assign: offered('assign') ? { enabled: true } : { enabled: false, reason: 'not-offered' },
    };
    return { states, needsIntelConfirm: !full && states.execute.enabled };
}
