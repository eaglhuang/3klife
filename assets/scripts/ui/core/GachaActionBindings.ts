/** gacha-ds3 的互動節點原本是 label/panel；由宿主補上 Button。
 * Unity 對照：為既有 RectTransform 加 Button，並重設本 Presenter 的 onClick。
 */
export const GACHA_ACTION_NODES = {
    previous: 'BtnPoolPrev', next: 'BtnPoolNext', history: 'GachaDs3_div_42',
    single: 'GachaDs3_div_43', ten: 'GachaDs3_div_48',
    gold: 'GachaDs3_div_55', ticket: 'GachaDs3_div_56',
} as const;

type Action = keyof typeof GACHA_ACTION_NODES;
interface ActionNode {
    off(event: string, callback: undefined, owner: object): void;
    on(event: string, callback: () => void, owner: object): void;
}

export function bindGachaActions<T extends ActionNode>(
    getNode: (name: string) => T | null,
    prepareButton: (node: T) => void,
    actions: Record<Action, () => void>, owner: object, event: string,
): void {
    for (const action of Object.keys(GACHA_ACTION_NODES) as Action[]) {
        const name = GACHA_ACTION_NODES[action];
        const node = getNode(name);
        if (!node) throw new Error(`[GachaActions] Missing action node: ${name}`);
        prepareButton(node);
        node.off(event, undefined, owner);
        node.on(event, actions[action], owner);
    }
}
