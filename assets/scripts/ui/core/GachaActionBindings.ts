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
        const handler = actions[action];
        if (!handler) continue;
        node.off(event, handler, owner);
        node.on(event, handler, owner);
        // 增加 TOUCH_END 備用事件監聽，確保滑鼠與觸控直接點擊時 100% 觸發
        if (event !== 'touch-end') {
            node.off('touch-end', handler, owner);
            node.on('touch-end', handler, owner);
        }
    }
}
