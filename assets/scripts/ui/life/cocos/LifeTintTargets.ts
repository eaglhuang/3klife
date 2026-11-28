// @spec-source → QLIFE-01 第 3.5 節（日夜四季調色）；PROG-2-10214
/**
 * LifeTintTargets — WP5 調色控制器的「多方塊乘色」套用端
 *
 * WP5 的 ILightingTintTarget 只吃一組乘色。生活層底圖是很多個純色方塊（各有自己的底色），
 * 所以這裡記住每個方塊的底色，乘色時 輸出＝底色 × 乘色 / 255。換季只改地面的底色，不碰其他方塊。
 * 之後換成 Codex 的真圖，底色全是白色 (255,255,255)，乘色結果就等於直接對圖層 Sprite 乘色。
 */
import { Color, Node, Sprite } from 'cc';
import type { ILightingTintTarget } from '../../../shared/presentation/lighting/SceneLightingController';

interface Item {
    sprite: Sprite;
    base: Color;
    out: Color;
}

export class SpriteTintTargetBox implements ILightingTintTarget {
    private readonly items = new Map<Node, Item>();
    private tr = 255;
    private tg = 255;
    private tb = 255;

    public add(node: Node, base: Color): void {
        const sprite = node.getComponent(Sprite);
        if (!sprite) return;
        const item: Item = { sprite, base: base.clone(), out: new Color(255, 255, 255, 255) };
        this.items.set(node, item);
        this.paint(item);
    }

    public setBase(node: Node, base: Color): void {
        const item = this.items.get(node);
        if (!item) return;
        item.base.set(base);
        this.paint(item);
    }

    public get count(): number { return this.items.size; }

    public applyTint(r: number, g: number, b: number): void {
        this.tr = r;
        this.tg = g;
        this.tb = b;
        this.items.forEach((item) => this.paint(item));
    }

    private paint(item: Item): void {
        item.out.set(
            Math.round((item.base.r * this.tr) / 255),
            Math.round((item.base.g * this.tg) / 255),
            Math.round((item.base.b * this.tb) / 255),
            item.base.a,
        );
        item.sprite.color = item.out;
    }
}
