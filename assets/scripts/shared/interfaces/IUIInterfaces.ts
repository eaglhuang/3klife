import { Node } from 'cc';

/**
 * 通用 UI 管理介面，用於解除 Core 對 UI 具體實作的依賴。
 */

export interface IUILayerLike {
    readonly node: Node;
    show(): Promise<void> | void;
    hide(): Promise<void> | void;
    resetState?(): void;
}

export interface ICompositePanelLike {
    dispose(): void;
}

export interface IUIManagedController {
    readonly node: Node;
    show(payload?: unknown): void | Promise<void>;
    hide(): void | Promise<void>;
    resetState?(): void;
}
