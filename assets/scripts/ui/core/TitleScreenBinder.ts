// @spec-source → UI-2-0158：遊戲入口標題畫面接到 LoginScene（設計稿 UI-2-0156，轉換 UI-2-0157）
/**
 * TitleScreenBinder — 把 title-screen 的點擊接到入口流程。
 *
 * - 「開始遊戲」與整個畫面（設計稿提示「點擊任意處進入」）都觸發 onStart，只觸發一次，避免連點切兩次場景。
 * - 左下公告／設定／帳號：有給動作才綁點擊並攔下事件（不讓它冒泡成「進入遊戲」）；沒給就隱藏。
 * - 畫面轉出的是 panel 不是 Button，所以直接聽觸控結束事件；事件名稱由呼叫端傳入，本檔不 import cc，方便單元測試。
 * Unity 對照：像標題 Canvas 上的 Presenter，按鈕事件往外拋給場景。
 */
import { findUcufNode, type UcufLookupNode } from './UcufNodeLookup';

export interface TitleTapNode extends UcufLookupNode {
    active: boolean;
    on(event: string, handler: (event?: { propagationStopped?: boolean }) => void): void;
    off(event: string): void;
}

export type TitleSideId = 'notice' | 'settings' | 'account';

export const TITLE_SIDE_IDS: readonly TitleSideId[] = ['notice', 'settings', 'account'];

export interface TitleScreenActions {
    readonly onStart: () => void;
    /** 左下按鈕；沒給的按鈕會被隱藏 */
    readonly onSide?: Partial<Record<TitleSideId, () => void>>;
}

export class TitleScreenBinder {
    private _started = false;

    /** root：畫面根節點；tapEvent：觸控結束事件名稱（cc 為 Node.EventType.TOUCH_END） */
    constructor(root: TitleTapNode, tapEvent: string, private readonly _actions: TitleScreenActions) {
        const start = (): void => this._start();
        root.off(tapEvent);
        root.on(tapEvent, start);
        const startButton = findUcufNode(root, 'title-screen.start');
        if (startButton && startButton !== root) {
            startButton.off(tapEvent);
            startButton.on(tapEvent, start);
        }
        for (const id of TITLE_SIDE_IDS) {
            const node = findUcufNode(root, `title-screen.${id}`);
            if (!node) continue;
            const action = _actions.onSide?.[id];
            node.active = !!action;
            node.off(tapEvent);
            if (!action) continue;
            node.on(tapEvent, (event) => {
                if (event) event.propagationStopped = true;
                action();
            });
        }
    }

    get started(): boolean {
        return this._started;
    }

    private _start(): void {
        if (this._started) return;
        this._started = true;
        this._actions.onStart();
    }
}
