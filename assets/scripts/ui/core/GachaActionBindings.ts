// @spec-source → 轉蛋系統.md (doc_spec_0042)；PROG-2-1429 依建檔紀錄補標出處
/** gacha-ds3 的互動節點原本是 label/panel；由宿主補上 Button。
 * Unity 對照：為既有 RectTransform 加 Button，並重設本 Presenter 的 onClick。
 */
import { GACHA_NODES } from './GachaScreenNodes';

// 節點名來自原稿固定 id／class（PROG-2-2237），重轉不會改名
export const GACHA_ACTION_NODES = {
    previous: GACHA_NODES.poolPrev, next: GACHA_NODES.poolNext, history: GACHA_NODES.history,
    single: GACHA_NODES.pullSingle, ten: GACHA_NODES.pullTen,
    gold: GACHA_NODES.goldSummon, ticket: GACHA_NODES.ticketSummon,
    // 左上角原「名將池說明」框改當天命商店入口（PROG-2-1158）
    destiny: GACHA_NODES.poolBrief,
} as const;

type Action = keyof typeof GACHA_ACTION_NODES;

/** 同一次點擊會先後觸發 CLICK 與 TOUCH_END；這個間隔（毫秒）內的第二次呼叫視為同一次點擊 */
export const GACHA_TAP_DEDUPE_MS = 120;

/**
 * 把動作包成「同一次點擊只執行一次」（PROG-2-9158）。
 * 轉蛋鈕同時掛 CLICK 與 TOUCH_END 備用事件，真實點擊兩個都會到，
 * 左右箭頭因此一次跳兩個池（四個池只輪到兩個，教官池永遠點不到）。
 */
export function onceForTap(handler: () => void, now: () => number = Date.now): () => void {
    let last = -Infinity;
    return () => {
        const at = now();
        if (at - last < GACHA_TAP_DEDUPE_MS) return;
        last = at;
        handler();
    };
}

/** 同一個動作函式永遠拿到同一個包裝，重綁時 off 才拆得掉上一次掛的監聽 */
const tapWrappers = new WeakMap<() => void, () => void>();
function wrapOnce(action: () => void): () => void {
    let wrapped = tapWrappers.get(action);
    if (!wrapped) {
        wrapped = onceForTap(action);
        tapWrappers.set(action, wrapped);
    }
    return wrapped;
}
interface ActionNode {
    off(event: string, callback?: any, owner?: object): void;
    on(event: string, callback: (...args: any[]) => void, owner?: object): void;
}

export function bindGachaActions<T extends ActionNode>(
    getNode: (name: string) => T | null,
    prepareButton: (node: T) => void,
    actions: Record<Action, () => void>, owner: object, event: string,
): void {
    for (const action of Object.keys(GACHA_ACTION_NODES) as Action[]) {
        const name = GACHA_ACTION_NODES[action];
        const node = getNode(name);
        if (!node) continue;
        prepareButton(node);
        const action0 = actions[action];
        if (!action0) continue;
        // 兩個事件共用同一個包裝，才能分辨「同一次點擊」
        const handler = wrapOnce(action0);
        node.off(event, handler, owner);
        node.on(event, handler, owner);
        // 增加 TOUCH_END 備用事件監聽，確保滑鼠與觸控直接點擊時 100% 觸發
        if (event !== 'touch-end') {
            node.off('touch-end', handler, owner);
            node.on('touch-end', handler, owner);
        }
    }
}
