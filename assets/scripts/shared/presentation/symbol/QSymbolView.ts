/**
 * QSymbolView.ts — 符號系統的 Cocos 畫面端（節點池實作＋佔位圖集貼圖）
 *
 * 純邏輯在 QSymbolSystem；這裡只負責：
 *  1. 把程式產生的佔位圖集（圓、方、三角）包成一張 Texture2D，切出每個部件的 SpriteFrame；
 *  2. 實作 ISymbolSprite（Node＋Sprite，重用，不建立粒子系統、不用 tween）。
 * 之後 Codex 的白色單通道圖集換進來，只要把 buildAtlasFrames 換成讀 q-symbols.atlas，其餘不動。
 */
import { Color, Layers, Node, Rect, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { buildPlaceholderAtlas, cellRect } from './QSymbolPlaceholder';
import { ISymbolSprite } from './QSymbolSprites';
import { ManualSymbolClock, QSymbolSystem } from './QSymbolSystem';
import { QSymbolData, SymbolTier } from './types';

/** 把佔位圖集上傳成單張貼圖，回傳每個部件的 SpriteFrame（共用同一張貼圖） */
export function buildAtlasFrames(data: QSymbolData): Map<string, SpriteFrame> {
    const atlas = buildPlaceholderAtlas(data);
    const texture = new Texture2D();
    texture.reset({ width: atlas.width, height: atlas.height, format: Texture2D.PixelFormat.RGBA8888 });
    texture.uploadData(atlas.pixels);
    const frames = new Map<string, SpriteFrame>();
    for (const [name, def] of Object.entries(data.atlas.parts)) {
        const r = cellRect(def.cell, data.atlas.cellSize, data.atlas.columns);
        const frame = new SpriteFrame();
        frame.texture = texture; // 先設 texture 再設 rect
        frame.rect = new Rect(r.x, r.y, r.w, r.h);
        frames.set(name, frame);
    }
    return frames;
}

/** 單一子精靈節點 */
class NodeSymbolSprite implements ISymbolSprite {
    private readonly sprite: Sprite;
    private readonly ui: UITransform;
    private readonly color = new Color(255, 255, 255, 255);
    private part = '';

    constructor(readonly node: Node, private readonly frames: Map<string, SpriteFrame>) {
        this.ui = node.addComponent(UITransform);
        this.sprite = node.addComponent(Sprite);
        this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        node.active = false;
    }

    show(part: string, x: number, y: number, w: number, h: number, rot: number, alpha: number, flipX: boolean,
        r: number, g: number, b: number): void {
        const n = this.node;
        if (!n.active) n.active = true;
        if (part !== this.part) {
            this.part = part;
            this.sprite.spriteFrame = this.frames.get(part) ?? null;
        }
        n.setPosition(x, y, 0);
        n.angle = rot;
        n.setScale(flipX ? -1 : 1, 1, 1);
        this.ui.setContentSize(w, h);
        this.color.set(r, g, b, Math.max(0, Math.min(255, Math.round(alpha * 255))));
        this.sprite.color = this.color;
    }

    hide(): void {
        this.node.active = false;
    }
}

/** 掛在某個父節點下的符號層：持有系統、容器節點與圖集貼圖 */
export class QSymbolView {
    readonly system: QSymbolSystem;
    readonly clock = new ManualSymbolClock();
    readonly container: Node;
    private readonly frames: Map<string, SpriteFrame>;

    constructor(parent: Node, data: QSymbolData, tier: SymbolTier = 'mid') {
        this.container = new Node('QSymbolLayer');
        this.container.layer = Layers.Enum.UI_2D;
        parent.addChild(this.container);
        this.frames = buildAtlasFrames(data);
        this.system = new QSymbolSystem(data, () => {
            const node = new Node('sym');
            node.layer = Layers.Enum.UI_2D;
            this.container.addChild(node);
            return new NodeSymbolSprite(node, this.frames);
        }, tier, this.clock);
    }

    /** 取得部件 SpriteFrame（預覽畫頭用） */
    frameOf(part: string): SpriteFrame | null {
        return this.frames.get(part) ?? null;
    }

    /** 每幀呼叫一次（Component.update 轉進來） */
    tick(dt: number): void {
        this.clock.advance(dt);
    }

    dispose(): void {
        this.system.dispose();
        if (this.container.isValid) this.container.destroy();
        this.frames.clear();
    }
}
