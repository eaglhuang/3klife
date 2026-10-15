/**
 * cc.mock.ts — Cocos Creator 引擎 API 的最小 Mock
 */

export class Vec3 { constructor(public x = 0, public y = 0, public z = 0) {} }
export class Color {
    constructor(public r = 255, public g = 255, public b = 255, public a = 255) {}
    declare static WHITE: Color;
}

// ─── 基礎 UI 類型 (必須在 Node 之前) ──────────────────────────────────────────

export class UITransform {
    width = 0; height = 0; anchorX = 0.5; anchorY = 0.5;
    setContentSize(w: number, h: number): void { this.width = w; this.height = h; }
    getContentSize() { return { width: this.width, height: this.height }; }
    setAnchorPoint(x: number, y: number): void { this.anchorX = x; this.anchorY = y; }
    convertToNodeSpaceAR(_worldPoint: any, _out?: any): any { return _out ?? new Vec3(); }
    convertToWorldSpaceAR(_nodePoint: any, _out?: any): any { return _out ?? new Vec3(); }
}

export class Label {
    static readonly HorizontalAlign = { LEFT: 0, CENTER: 1, RIGHT: 2 };
    static readonly VerticalAlign   = { TOP: 0, CENTER: 1, BOTTOM: 2 };
    static readonly Overflow        = { NONE: 0, CLAMP: 1, SHRINK: 2, RESIZE_HEIGHT: 3 };
    string = ''; fontSize = 20; color = new Color(); horizontalAlign = 0; verticalAlign = 0; overflow = 0;
    isBold = false; font: any = null; lineHeight = 0;
    getComponent<T = any>(_type: (new (...args: any[]) => T) | string): T | null { return null; }
}

export class Layout {
    static readonly Type = { NONE: 0, HORIZONTAL: 1, VERTICAL: 2, GRID: 3 };
    static readonly ResizeMode = { NONE: 0, CONTAINER: 1, CHILDREN: 2 };
    static readonly VerticalDirection = { TOP_TO_BOTTOM: 0, BOTTOM_TO_TOP: 1 };
    declare static Constraint: any;
    declare static HorizontalDirection: any;
    declare static AxisDirection: any;
    type = 0; resizeMode = 0; spacingY = 0; paddingTop = 0; verticalDirection = 0; isValid = true;
    declare constraint: number;
    declare constraintNum: number;
    declare cellSize: any;
    declare spacingX: number;
    declare paddingLeft: number;
    declare paddingRight: number;
    declare paddingBottom: number;
    declare startAxis: number;
    updateLayout(_force?: boolean): void { /* mock */ }
}

export class Button {
    static readonly EventType = { CLICK: 'click' };
    static readonly Transition = { NONE: 0, COLOR: 1, SPRITE: 2, SCALE: 3 };
    transition = 0; interactable = true; enabled = true;
    declare target: any;
    node: any = null;
}
export class Sprite {
    enabled = true; spriteFrame: any = null;
    declare color: Color;
    declare sizeMode: number;
    declare type: number;
    declare trim: boolean;
    declare static SizeMode: any;
    declare static Type: any;
}
export class UIOpacity { opacity = 255; }
export class Prefab { decRef(): void { /* mock */ } }

// ─── Node ───────────────────────────────────────────────────────────────────

export class ProgressBar {
    [key: string]: any;
}

export class Node {
    static readonly EventType = { NODE_DESTROYED: 'node-destroyed', SIZE_CHANGED: 'size-changed' };
    public children: Node[] = [];
    get components(): any[] { return this._components; }
    destroyAllChildren(): void { /* mock */ }
    removeFromParent(): void { /* mock */ }
    private _parent: Node | null = null;
    public layer = 1;
    private _handlers = new Map<string, Array<(arg?: any) => void>>();
    private _components: any[] = [];

    constructor(public name: string = "") {}
    declare position: Vec3;
    emit(event: string, arg?: any): void { this.__emit(event, arg); }
    off(event: string, handler?: (arg?: any) => void, _target?: any): void {
        if (!handler) { this._handlers.delete(event); return; }
        const list = this._handlers.get(event);
        if (list) this._handlers.set(event, list.filter(h => h !== handler));
    }

    get parent(): Node | null { return this._parent; }
    set parent(v: Node | null) {
        if (this._parent) {
            const idx = this._parent.children.indexOf(this);
            if (idx !== -1) this._parent.children.splice(idx, 1);
        }
        this._parent = v;
        if (v && v.children.indexOf(this) === -1) v.children.push(this);
    }

    addComponent<T = any>(type: (new (...args: any[]) => T) | string): T {
        const comp = new (type as new (...args: any[]) => T)() as any;
        comp.node = this;
        this._components.push(comp);
        return comp;
    }

    getComponent<T = any>(type: (new (...args: any[]) => T) | string): T | null {
        if (!type || typeof type !== 'function') return null;
        return this._components.find(c => c instanceof type) || null;
    }

    addChild(node: Node): void { node.parent = this; }
    getChildByName(name: string): Node | null { return this.children.find(c => c.name === name) || null; }
    
    removeAllChildren(): void {
        const kids = this.children.slice();
        kids.forEach(c => c.parent = null);
        this.children = [];
    }

    on(event: string, handler: (arg?: any) => void, _target?: any): void {
        const list = this._handlers.get(event) ?? [];
        list.push(handler);
        this._handlers.set(event, list);
    }

    once(event: string, handler: () => void, _target?: any): void { this.on(event, handler); }

    setPosition(_x: any, _y?: number, _z?: number): void {}
    setWorldPosition(_pos: any): void {}
    setRotationFromEuler(_x: number, _y: number, _z: number): void {}
    setScale(_v: any, _y?: number, _z?: number): void {}
    get active(): boolean { return true; }
    set active(_v: boolean) {}
    get isValid(): boolean { return true; }

    destroy(): boolean { this.parent = null; return true; }
    getSiblingIndex(): number { return this._parent ? this._parent.children.indexOf(this) : 0; }
    setSiblingIndex(_index: number): void { /* mock */ }
    walk(cb: (node: Node) => void): void { cb(this); this.children.forEach(c => c.walk(cb)); }
    getComponentInChildren<T = any>(type: (new (...args: any[]) => T) | string): T | null {
        const own = this.getComponent(type);
        if (own) return own;
        for (const c of this.children) {
            const found = c.getComponentInChildren(type);
            if (found) return found;
        }
        return null;
    }
    getComponentsInChildren<T = any>(type: (new (...args: any[]) => T) | string): T[] {
        const out: T[] = [];
        this.walk(n => { const c = n.getComponent(type); if (c) out.push(c); });
        return out;
    }

    __emit(event: string, arg?: any): void {
        const list = this._handlers.get(event) ?? [];
        list.forEach(h => h(arg));
    }
}

export class Component {
    public node = new Node();
    public isValid = true;
    scheduleOnce(fn: () => void, _delay: number): void { fn(); }
    declare enabled: boolean;
    getComponent<T = any>(type: (new (...args: any[]) => T) | string): T | null { return this.node.getComponent(type); }
    addComponent<T = any>(type: (new (...args: any[]) => T) | string): T { return this.node.addComponent(type); }
}

export function instantiate(noP: any): Node {
    if (noP instanceof Node) return new Node(noP.name + " (Clone)");
    return new Node("New Instance");
}

export class Tween {
    [key: string]: any;
    static stopAllByTarget(_target: any): void { /* mock */ }
}
export function tween(_target: any) {
    return {
        to: (_duration?: number, _props?: Record<string, unknown>, _opts?: Record<string, unknown>) => tween(_target),
        delay: (_duration?: number) => tween(_target),
        call: (_fn?: () => void) => tween(_target),
        start: () => {},
    };
}

// ─── 系統 ───────────────────────────────────────────────────────────────────

export const Layers = { Enum: { DEFAULT: 1 } };
export const geometry = {};
export const gfx = { CullMode: { NONE: 0 } };
// 裝飾器同時支援 @x 與 @x(...) 兩種寫法，型別放寬為 any（mock 僅供型別檢查）
export const _decorator: {
    ccclass: any;
    property: any;
    requireComponent: any;
    executeInEditMode: any;
} = {
    ccclass: (_name?: string) => (_: any) => {},
    property: () => (_: any, __: any) => {},
    requireComponent: () => (_: any, __: any) => {},
    executeInEditMode: () => (_: any) => {},
};

export const sys = {
    isBrowser: false,
    NetworkType: { NONE: 0, LAN: 1, WWAN: 2 },
    isNative: false,
    getNetworkType(): number { return 1; },
    localStorage: {
        _data: new Map<string, string>(),
        getItem(key: string): string | null { return this._data.get(key) ?? null; },
        setItem(key: string, val: string): void { this._data.set(key, val); },
        removeItem(key: string): void { this._data.delete(key); },
        clear(): void { this._data.clear(); }
    }
};

// 補齊 Animation 等
export class Animation { play(_clip?: string): void {} stop(): void {} }
export class Camera {
    worldToScreen(_out: any, _worldPos?: any): any { return _out; }
    screenToWorld(_out: any, _screenPos?: any, _w?: number, _h?: number): any { return _out; }
    convertToUINode(_worldPos: any, _uiNode: any, _out?: any): any { return _out; }
}
export class Graphics {
    declare fillColor: Color;
    declare strokeColor: Color;
    declare lineWidth: number;
    clear(): void { /* mock */ }
    fill(): void { /* mock */ }
    stroke(): void { /* mock */ }
    roundRect(_x: number, _y: number, _w: number, _h: number, _r: number): void { /* mock */ }
}
export class ParticleSystem {
    startColor: any; play(): void {}
    /* 以下欄位只做型別佔位，mock 不模擬粒子行為 */
    [key: string]: any;
}
export class Burst { time = 0; repeatCount = 1; repeatInterval = 0; count: any = 0; }
export class AudioSource {
    loop = false;
    volume = 1;
    clip: AudioClip | null = null;
    play(): void {}
    pause(): void {}
    stop(): void {}
    playOneShot(_clip: AudioClip, _volumeScale?: number): void {}
}
export class AudioClip { name: string = ""; }
export class CurveRange { constant = 0; }
export class Vec4 { constructor(public x = 0, public y = 0, public z = 0, public w = 0) {} }
export class Rect { constructor(public x = 0, public y = 0, public width = 0, public height = 0) {} }
export class Widget {
    [key: string]: any;
    declare static AlignMode: any;
}
export class Font { [key: string]: any; }
export class JsonAsset { [key: string]: any; }
export class Asset { [key: string]: any; }
export class ImageAsset { [key: string]: any; }
export class Texture2D {
    [key: string]: any;
    declare static PixelFormat: any;
}
export class SpriteFrame { [key: string]: any; }
export class Material { [key: string]: any; }
export class EffectAsset { [key: string]: any; }
export class MeshRenderer { [key: string]: any; }
export class NodePool { [key: string]: any; }
export class AssetManager { [key: string]: any; }
/* 命名空間型別：AssetManager.Bundle 供 load 回呼標註用 */
export declare namespace AssetManager {
    interface Bundle {
        load(path: string, type: any, onComplete: (err: any, asset: any) => void): void;
        load(path: string, onComplete: (err: any, asset: any) => void): void;
        [key: string]: any;
    }
}
/* 單例或命名空間的佔位，mock 不提供實作（runtime 仍為 undefined，與舊行為一致） */
export declare const director: any;
export declare const resources: {
    load(path: string, type: any, onComplete: (err: any, asset: any) => void): void;
    load(path: string, onComplete: (err: any, asset: any) => void): void;
    loadDir(path: string, type: any, onComplete: (err: any, assets: any[]) => void): void;
    loadDir(path: string, onComplete: (err: any, assets: any[]) => void): void;
    [key: string]: any;
};
export declare const assetManager: {
    getBundle(name: string): AssetManager.Bundle | null;
    loadBundle(name: string, onComplete: (err: any, bundle: AssetManager.Bundle) => void): void;
    loadRemote(url: string, onComplete: (err: any, asset: any) => void): void;
    loadRemote(url: string, options: any, onComplete: (err: any, asset: any) => void): void;
    [key: string]: any;
};
export declare const utils: any;
export declare const primitives: any;
export declare const v3: any;
export class GradientRange { color = new Color(); }
