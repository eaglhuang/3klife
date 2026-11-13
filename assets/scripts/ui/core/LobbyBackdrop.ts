// @spec-source → 大廳系統規格書 doc_spec_0002 E-6；UI-2-0159：主大廳背景沿用幕府大廳季節背景
/**
 * LobbyBackdrop — 在主大廳 Background 節點底下鋪背景圖與遮罩層。
 *
 * - 背景圖以 cover 方式等比放大鋪滿視窗（圖比視窗高時上下裁掉）。
 * - 遮罩層依 MainLobbyBackdrop.layers 順序由下往上疊，數量變少時多的層隱藏。
 * - 連續換圖只採用最後一次載入結果；圖載入失敗時保留原本的底色。
 * Unity 對照：像 Canvas 最底層的 RawImage（AspectRatioFitter = EnvelopeParent）加幾張半透明 Image。
 */
import { Color, Node, Sprite, SpriteFrame, UITransform, view } from 'cc';
import type { MainLobbyBackdrop } from '../../core/systems/HallTheme';
import { SolidBackground } from '../components/SolidBackground';
import { loadSpriteFrameFromResources, parseHexRgb, type SpriteFrameLoader } from './LobbyHallThemeNodeView';

export interface BackdropSize {
    width: number;
    height: number;
}

/** 等比放大到剛好蓋滿 view；圖尺寸無效時直接用 view 尺寸 */
export function coverSize(image: Readonly<BackdropSize>, viewSize: Readonly<BackdropSize>): BackdropSize {
    if (image.width <= 0 || image.height <= 0) return { width: viewSize.width, height: viewSize.height };
    const scale = Math.max(viewSize.width / image.width, viewSize.height / image.height);
    return { width: image.width * scale, height: image.height * scale };
}

/** 寬於設計尺寸時改用可見範圍，讓背景 cover 兩側，不留黑邊 */
export function resolveBackdropView(fallback: Readonly<BackdropSize>, visible?: Readonly<BackdropSize> | null): BackdropSize {
    if (visible && visible.width > 0 && visible.height > 0) {
        return { width: visible.width, height: visible.height };
    }
    return { width: fallback.width, height: fallback.height };
}

function frameSizeOf(frame: SpriteFrame): BackdropSize {
    const size = (frame as { originalSize?: BackdropSize }).originalSize;
    return { width: size?.width ?? 0, height: size?.height ?? 0 };
}

export class LobbyBackdrop {
    private readonly _art: Node;
    private readonly _layers: Node[] = [];

    /** 背景圖節點 */
    get art(): Node {
        return this._art;
    }

    /** 遮罩層節點（由下往上） */
    get shadeLayers(): readonly Node[] {
        return this._layers;
    }
    private _requestedPath: string | null = null;

    constructor(
        private readonly _parent: Node,
        private readonly _view: Readonly<BackdropSize>,
        private readonly _load: SpriteFrameLoader = loadSpriteFrameFromResources,
    ) {
        this._art = this._child('BackdropArt');
        this._art.active = false;
    }

    apply(backdrop: Readonly<MainLobbyBackdrop>): void {
        this._applyLayers(backdrop.layers);
        if (backdrop.backgroundPath === this._requestedPath) return;
        const path = backdrop.backgroundPath;
        this._requestedPath = path;
        this._load(path, (frame) => {
            if (this._requestedPath !== path || !frame) return;
            const sprite = this._art.getComponent(Sprite) ?? this._art.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.spriteFrame = frame;
            const size = coverSize(frameSizeOf(frame), this._resolvedView());
            (this._art.getComponent(UITransform) ?? this._art.addComponent(UITransform)).setContentSize(size.width, size.height);
            this._art.active = true;
        });
    }

    private _applyLayers(layers: ReadonlyArray<{ color: string; alpha: number }>): void {
        layers.forEach((tint, index) => {
            const node = this._layers[index] ?? this._addLayer(index);
            const rgb = parseHexRgb(tint.color);
            node.active = !!rgb;
            if (!rgb) return;
            const alpha = Math.round(Math.min(1, Math.max(0, tint.alpha)) * 255);
            const bg = node.getComponent(SolidBackground) ?? node.addComponent(SolidBackground);
            bg.color = new Color(rgb[0], rgb[1], rgb[2], alpha);
        });
        for (let i = layers.length; i < this._layers.length; i++) this._layers[i].active = false;
    }

    private _addLayer(index: number): Node {
        const node = this._child(`BackdropShade${index}`);
        const size = this._resolvedView();
        (node.getComponent(UITransform) ?? node.addComponent(UITransform)).setContentSize(size.width, size.height);
        this._layers[index] = node;
        return node;
    }

    private _resolvedView(): BackdropSize {
        const visible = (view as { getVisibleSize?: () => BackdropSize }).getVisibleSize?.();
        return resolveBackdropView(this._view, visible);
    }

    private _child(name: string): Node {
        const node = new Node(name);
        node.layer = this._parent.layer;
        node.parent = this._parent;
        return node;
    }
}
