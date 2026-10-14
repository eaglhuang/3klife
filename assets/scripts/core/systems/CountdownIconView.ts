// @spec-source → 新手開場規格書 OPEN-11（趕路倒數常駐圖示、加速/完成）；PROG-2-0468
/**
 * CountdownIconView — 主畫面趕路倒數圖示的文字與按鈕狀態（純邏輯，不依賴 cc）。
 *
 * - 只有趕路中才顯示圖示（沿用 shouldShowResidentIcon）。
 * - 剩餘時間格式為 mm:ss；超過一小時時為 h:mm:ss。
 * - 加速鈕只在可加速且仍在趕路時可按。
 *
 * Unity 對照：像一個常駐 HUD 小元件的 Presenter，倒數數字由它格式化，畫面只顯示文字。
 */
import { countdownStatus, CountdownState, shouldShowResidentIcon } from './CountdownManager';

export interface CountdownIconView {
    visible: boolean;
    label: string;
    rushEnabled: boolean;
}

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

function pad2(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
}

/** 剩餘毫秒轉成 mm:ss 或 h:mm:ss；負數與 NaN 視為 0。 */
export function formatRemaining(remainingMs: number): string {
    const totalSeconds = Number.isFinite(remainingMs) && remainingMs > 0
        ? Math.ceil(remainingMs / MS_PER_SECOND)
        : 0;
    if (totalSeconds >= SECONDS_PER_HOUR) {
        const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
        const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
        const seconds = totalSeconds % SECONDS_PER_MINUTE;
        return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
    }
    const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    return `${pad2(minutes)}:${pad2(seconds)}`;
}

export function buildCountdownIconView(state: Readonly<CountdownState>, now: number): CountdownIconView {
    const visible = shouldShowResidentIcon(state, now);
    const snapshot = countdownStatus(state, now);
    return {
        visible,
        label: visible ? formatRemaining(snapshot.remainingMs) : '',
        rushEnabled: visible && state.canAccelerate,
    };
}

/** 主畫面 HUD 的 flow view：key 與 lobby-season-hud-main.json 的 countdownIconLabel 對應；沒有倒數時隱藏。 */
export function buildCountdownIconFlowView(
    state: Readonly<CountdownState> | null,
    now: number,
): { texts: Record<string, string>; actives: Record<string, boolean> } {
    const view = state ? buildCountdownIconView(state, now) : { visible: false, label: '' };
    return {
        texts: { countdownIconLabel: view.label },
        actives: { countdownIconLabel: view.visible },
    };
}
