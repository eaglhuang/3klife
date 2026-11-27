// @spec-source → QSOC-01 第 4 章；PROG-2-10214
/**
 * LifeUiKit — 生活層畫面的小工具（Cocos 端）：白色 SpriteFrame、方塊節點、文字節點
 *
 * 全部節點錨點 (0,0)、座標＝左下角，和 ScenePanelController 的矩形（原點左下、y 往上）同一套，
 * 呼叫端只要減掉「畫面一半」就能放進以中心為原點的根節點。
 * 白色貼圖全遊戲只建一張：用 Sprite.color 上色，不為每個方塊配一張圖。
 */
import { Color, Label, Layers, Node, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';

let whiteFrame: SpriteFrame | null = null;

/** 共用白色 SpriteFrame（2×2，一張貼圖） */
export function getWhiteFrame(): SpriteFrame {
    if (whiteFrame && whiteFrame.isValid) return whiteFrame;
    const tex = new Texture2D();
    tex.reset({ width: 2, height: 2, format: Texture2D.PixelFormat.RGBA8888 });
    tex.uploadData(new Uint8Array(16).fill(255));
    const f = new SpriteFrame();
    f.texture = tex;
    whiteFrame = f;
    return f;
}

export function hexToColor(hex: string, alpha = 255): Color {
    const h = hex.replace('#', '');
    return new Color(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), alpha);
}

export function newUiNode(name: string, parent: Node | null): Node {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    const ui = n.addComponent(UITransform);
    ui.setAnchorPoint(0, 0);
    if (parent) parent.addChild(n);
    return n;
}

/** 單色方塊（Sprite＋共用白貼圖）。frame 可換成別的圖（例如圓形） */
export function makeBox(parent: Node | null, name: string, color: Color, frame: SpriteFrame | null = null): Node {
    const n = newUiNode(name, parent);
    const sp = n.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    sp.spriteFrame = frame ?? getWhiteFrame();
    sp.color = color;
    return n;
}

export function placeBox(n: Node, x: number, y: number, w: number, h: number): void {
    n.setPosition(x, y, 0);
    n.getComponent(UITransform)!.setContentSize(w, h);
}

export function setBoxColor(n: Node, color: Color): void {
    const sp = n.getComponent(Sprite);
    if (sp) sp.color = color;
}

/** 文字：放在 box 內，填滿 box，水平垂直置中（或靠左）；字太長自動縮小 */
export function makeLabel(parent: Node, name: string, fontSize: number, color: Color, align: 'center' | 'left' | 'right' = 'center'): Label {
    const n = newUiNode(name, parent);
    const lb = n.addComponent(Label);
    lb.fontSize = fontSize;
    lb.lineHeight = Math.round(fontSize * 1.2);
    lb.color = color;
    lb.overflow = Label.Overflow.SHRINK;
    lb.enableWrapText = false;
    lb.horizontalAlign = align === 'center' ? Label.HorizontalAlign.CENTER : align === 'left' ? Label.HorizontalAlign.LEFT : Label.HorizontalAlign.RIGHT;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    return lb;
}

/** 把文字節點撐滿父 box（含左右內縮） */
export function fitLabel(lb: Label, w: number, h: number, padX = 0): void {
    lb.node.setPosition(padX, 0, 0);
    lb.node.getComponent(UITransform)!.setContentSize(Math.max(0, w - padX * 2), h);
}
