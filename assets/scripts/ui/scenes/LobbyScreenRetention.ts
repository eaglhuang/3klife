// @spec-source → Issue #2120；接 PROG-2-9017 的 UIScreenRetainCache，回大廳不重建介面
import { Component, Node } from 'cc';
import { SceneName } from '../../core/config/Constants';
import { uiScreenRetainCache } from '../core/CocosScreenRetainAdapter';

const KEY_PREFIX = 'lobby/';

/**
 * 大廳介面停放：只在「大廳 → 戰鬥」時停放（戰鬥回來不可能換存檔），去其他場景（登入、換檔）一律作廢重建。
 * version 用語系，換語系也會作廢。
 *
 * 停放前會把節點樹上「目標不是樹內元件」的監聽者拔掉（舊 LobbyScene、舊控制器），
 * 樹內元件自己的監聽保留；回大廳 take() 後由各 _mountXxx 照舊重新綁定。
 *
 * Unity 對照：DontDestroyOnLoad 物件池；回來時重新 AddListener。
 */
export class LobbyScreenRetention {
    private readonly _hosts = new Map<string, Node>();

    constructor(private readonly _version: () => string) {}

    /** 掛載時先試著取回停放的節點；拿到時已接在 parent 下、維持 inactive。 */
    take(hostName: string, parent: Node): Node | null {
        const node = uiScreenRetainCache().take(KEY_PREFIX + hostName, parent, { version: this._version() });
        return node;
    }

    /** 登記可停放的宿主（掛載完成後呼叫）。 */
    register(hostName: string, node: Node): void {
        this._hosts.set(hostName, node);
    }

    /** SceneManager.onBeforeSwitch 呼叫：去戰鬥就停放，去別處就作廢。 */
    onBeforeSwitch(targetSceneName: string): void {
        const cache = uiScreenRetainCache();
        if (targetSceneName !== SceneName.Battle) {
            cache.invalidatePrefix(KEY_PREFIX);
            this._hosts.clear();
            return;
        }
        const version = this._version();
        for (const [hostName, node] of this._hosts) {
            if (!node || !node.isValid) continue;
            try {
                node.active = false; // 先停用，讓元件在 onDisable 自行退訂
                purgeForeignListeners(node);
                cache.park(KEY_PREFIX + hostName, node, { version });
            } catch (error) {
                console.warn('[LobbyScreenRetention] 停放失敗，回大廳會重建', hostName, error);
                cache.invalidate(KEY_PREFIX + hostName);
            }
        }
        this._hosts.clear();
    }
}

interface CallbackInfoLike { callback?: unknown; target?: unknown }
interface CallbackListLike { callbackInfos?: Array<CallbackInfoLike | null> }
interface EventProcessorLike { bubblingTarget?: CallbacksInvokerLike | null; capturingTarget?: CallbacksInvokerLike | null }
interface CallbacksInvokerLike {
    _callbackTable?: Record<string, CallbackListLike | undefined>;
    off?: (key: string, callback?: unknown, target?: unknown) => void;
}

/**
 * 拔掉節點樹上「目標不在樹內」的監聽者（舊場景、舊控制器）。
 * 沒有 target 的閉包分不出是誰綁的，保留；LobbyScene 綁在宿主上的監聽一律帶 target。
 */
export function purgeForeignListeners(root: Node): number {
    const internal = new Set<unknown>();
    root.walk((node) => {
        internal.add(node);
        for (const comp of node.components) internal.add(comp);
    });
    let removed = 0;
    root.walk((node) => {
        const raw = node as unknown as { eventProcessor?: EventProcessorLike; _eventProcessor?: EventProcessorLike };
        const processor = raw.eventProcessor ?? raw._eventProcessor;
        for (const invoker of [processor?.bubblingTarget, processor?.capturingTarget]) {
            const table = invoker?._callbackTable;
            if (!invoker?.off || !table) continue;
            for (const key of Object.keys(table)) {
                const infos = table[key]?.callbackInfos ?? [];
                const stale: CallbackInfoLike[] = [];
                for (const info of infos) {
                    if (info && info.target && !internal.has(info.target) && isSceneOwned(info.target)) stale.push(info);
                }
                for (const info of stale) {
                    invoker.off(key, info.callback, info.target);
                    removed++;
                }
            }
        }
    });
    return removed;
}

/** 目標是樹外的元件或一般物件（控制器）才算外來；引擎內部用的 Node 目標不動。 */
function isSceneOwned(target: unknown): boolean {
    if (target instanceof Node) return false;
    if (target instanceof Component) return true;
    return typeof target === 'object';
}
