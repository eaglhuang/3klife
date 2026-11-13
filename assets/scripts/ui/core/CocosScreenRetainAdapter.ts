// @spec-source → Issue #2115；PROG-2-9017 換場保留已建好的 UI（Cocos 實作）
import { director, Node } from 'cc';
import { RetainAdapter, UIScreenRetainCache } from './UIScreenRetainCache';

const RETAIN_ROOT_NAME = '__UIScreenRetainRoot';

/**
 * 以常駐根節點（director.addPersistRootNode）停放 UI 節點：換場時 Cocos 不會銷毀它底下的子節點。
 * 停放的節點設為 inactive，不渲染、不跑 update；接回時只換 parent，active 由呼叫端決定。
 */
export class CocosScreenRetainAdapter implements RetainAdapter<Node> {
    private _root: Node | null = null;

    retain(node: Node): void {
        node.active = false;
        node.setParent(this._ensureRoot());
    }

    restore(node: Node, parent: unknown): void {
        node.setParent(parent as Node);
    }

    destroy(node: Node): void {
        node.destroy();
    }

    isValid(node: Node): boolean {
        return !!node && node.isValid;
    }

    private _ensureRoot(): Node {
        if (this._root && this._root.isValid) return this._root;
        const scene = director.getScene();
        if (!scene) throw new Error('[CocosScreenRetainAdapter] 沒有目前場景，無法建立常駐根節點');
        const root = new Node(RETAIN_ROOT_NAME);
        root.active = false;
        scene.addChild(root);
        director.addPersistRootNode(root);
        this._root = root;
        return root;
    }
}

let shared: UIScreenRetainCache<Node> | null = null;

/** 全域共用的畫面保留快取（跨場景存活）。 */
export function uiScreenRetainCache(): UIScreenRetainCache<Node> {
    if (!shared) shared = new UIScreenRetainCache<Node>(new CocosScreenRetainAdapter());
    return shared;
}
