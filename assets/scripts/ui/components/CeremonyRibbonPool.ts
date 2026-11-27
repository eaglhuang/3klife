// @spec-source → PROG-2-10127 年末典禮熱鬧感加強（彩帶物件池；不新增美術，用 Graphics 畫色塊）
import { Color, Graphics, Node, tween, UITransform, Vec3 } from 'cc';
import { CEREMONY_RIBBON_COLORS, CEREMONY_RIBBON_COUNT, type RibbonSpec } from '../../core/systems/CeremonyHype';

const RIBBON_W = 10;
const RIBBON_H = 24;

/**
 * 彩帶物件池：節點最多建 CEREMONY_RIBBON_COUNT 個，落完就收回 free 清單重用；
 * 重播典禮、重複揭曉都不再 new 節點（手機記憶體）。
 */
export class CeremonyRibbonPool {
    private _layer: Node | null = null;
    private readonly _free: Node[] = [];
    private readonly _active = new Set<Node>();
    private _created = 0;

    /** 目前正在飄的彩帶數 */
    public get activeCount(): number {
        return this._active.size;
    }

    /** 已建立的節點總數（不會超過上限） */
    public get createdCount(): number {
        return this._created;
    }

    /** 在 parent 之上的全區彩帶層放出彩帶；池子沒有空節點就略過多的 */
    public spawn(parent: Node, specs: readonly RibbonSpec[], width: number, height: number): number {
        const layer = this.ensureLayer(parent, width, height);
        let started = 0;
        for (const spec of specs) {
            const node = this._free.pop() ?? this.create(layer);
            if (!node) break;
            this.launch(node, spec, width, height);
            started += 1;
        }
        return started;
    }

    /** 立刻收回所有彩帶（重開典禮時） */
    public recycleAll(): void {
        for (const node of Array.from(this._active)) this.release(node);
    }

    private ensureLayer(parent: Node, width: number, height: number): Node {
        if (!this._layer || !this._layer.isValid) {
            const layer = new Node('CeremonyRibbonLayer');
            layer.layer = parent.layer;
            layer.addComponent(UITransform);
            this._layer = layer;
            this._free.length = 0;
            this._active.clear();
            this._created = 0;
        }
        const layer = this._layer;
        if (layer.parent !== parent) parent.addChild(layer);
        layer.getComponent(UITransform)?.setContentSize(width, height);
        layer.setPosition(0, 0, 0);
        layer.setSiblingIndex(parent.children.length - 1);
        return layer;
    }

    private create(layer: Node): Node | null {
        if (this._created >= CEREMONY_RIBBON_COUNT) return null;
        const node = new Node(`Ribbon${this._created + 1}`);
        node.layer = layer.layer;
        node.addComponent(UITransform).setContentSize(RIBBON_W, RIBBON_H);
        node.addComponent(Graphics);
        layer.addChild(node);
        this._created += 1;
        return node;
    }

    private launch(node: Node, spec: RibbonSpec, width: number, height: number): void {
        const g = node.getComponent(Graphics);
        if (g) {
            g.clear();
            g.fillColor = new Color().fromHEX(CEREMONY_RIBBON_COLORS[spec.colorIndex % CEREMONY_RIBBON_COLORS.length]);
            g.rect(-RIBBON_W / 2, -RIBBON_H / 2, RIBBON_W, RIBBON_H);
            g.fill();
        }
        const startX = (spec.x - 0.5) * width;
        const top = height / 2 + RIBBON_H;
        const bottom = -height / 2 - RIBBON_H;
        node.active = true;
        node.setPosition(startX, top, 0);
        node.angle = 0;
        this._active.add(node);
        tween(node).stop();
        tween(node)
            .delay(spec.delay)
            .to(spec.fall / 2, { position: new Vec3(startX + spec.sway, (top + bottom) / 2, 0), angle: spec.spin / 2 })
            .to(spec.fall / 2, { position: new Vec3(startX - spec.sway * 0.5, bottom, 0), angle: spec.spin })
            .call(() => this.release(node))
            .start();
    }

    private release(node: Node): void {
        tween(node).stop();
        node.active = false;
        if (this._active.delete(node)) this._free.push(node);
    }
}
