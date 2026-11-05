// @spec-source → 戰法系統.md (doc_spec_0038) §H-2 品質分級：SSR/UR 戰法「半身英靈面」閃現（PROG-2-1861）
/**
 * TacticFlashOverlay — 戰法施放時的半身立繪閃現。
 *
 * 一條半透明暗帶橫過畫面，立繪框（只露上半身）與「品質＋虎符名」從施放方那一側滑入，
 * 停留後整體淡出並自毀。不攔截點擊，戰鬥操作不受影響。
 *
 * Unity 對照：像掛在 HUD Canvas 上、播完自毀的 Cut-in Prefab。
 */
import { Color, Graphics, Label, Mask, Node, Sprite, SpriteFrame, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import type { TacticFlashTiming, TacticFlashView } from '../../shared/interfaces/IBattleUIComponents';

export const TACTIC_FLASH_NODE = 'TacticFlash';

/** 版面數值（暫定） */
const BAND_HEIGHT = 300;
const FRAME_SIZE = 300;
const EDGE_MARGIN = 240;
const CAPTION_GAP = 32;
const CAPTION_WIDTH = 640;
const SLIDE_DISTANCE = 420;

const QUALITY_COLORS: Readonly<Record<string, Color>> = {
    SSR: new Color(255, 215, 0, 255),
    UR: new Color(255, 120, 200, 255),
};

function addTransform(node: Node, width: number, height: number): UITransform {
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    return transform;
}

/** 在 parent 上播一次閃現；portrait 為 null 時只顯示文字 */
export function playTacticFlash(parent: Node, portrait: SpriteFrame | null, view: TacticFlashView, t: TacticFlashTiming): Promise<void> {
    if (!parent.isValid) return Promise.resolve();
    const host = parent.getComponent(UITransform);
    const width = host?.width ?? 1920;
    const height = host?.height ?? 1080;
    const dir = view.side === 'player' ? 1 : -1;

    const overlay = new Node(TACTIC_FLASH_NODE);
    overlay.layer = parent.layer;
    addTransform(overlay, width, height);
    const fade = overlay.addComponent(UIOpacity);
    fade.opacity = 0;

    const band = new Node(`${TACTIC_FLASH_NODE}Band`);
    band.layer = parent.layer;
    addTransform(band, width, BAND_HEIGHT);
    const dim = band.addComponent(Graphics);
    dim.fillColor = new Color(0, 0, 0, 150);
    dim.rect(-width / 2, -BAND_HEIGHT / 2, width, BAND_HEIGHT);
    dim.fill();
    overlay.addChild(band);

    // 立繪框只露上半身：框是方形遮罩，立繪依寬度縮放後頂端對齊
    const frameX = dir * (EDGE_MARGIN - width / 2);
    const frame = new Node(`${TACTIC_FLASH_NODE}Portrait`);
    frame.layer = parent.layer;
    addTransform(frame, FRAME_SIZE, FRAME_SIZE);
    frame.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
    frame.setPosition(frameX, 0, 0);
    if (portrait) {
        const art = new Node(`${TACTIC_FLASH_NODE}Art`);
        art.layer = parent.layer;
        const rect = portrait.rect;
        const artHeight = rect.width > 0 ? FRAME_SIZE * rect.height / rect.width : FRAME_SIZE;
        addTransform(art, FRAME_SIZE, artHeight);
        const sprite = art.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = portrait;
        art.setPosition(0, FRAME_SIZE / 2 - artHeight / 2, 0);
        frame.addChild(art);
    }
    overlay.addChild(frame);

    const caption = new Node(`${TACTIC_FLASH_NODE}Caption`);
    caption.layer = parent.layer;
    addTransform(caption, CAPTION_WIDTH, 80).setAnchorPoint(dir > 0 ? 0 : 1, 0.5);
    const label = caption.addComponent(Label);
    label.string = `${view.quality}　${view.caption}`;
    label.fontSize = 52;
    label.lineHeight = 64;
    label.isBold = true;
    label.horizontalAlign = view.side === 'player' ? Label.HorizontalAlign.LEFT : Label.HorizontalAlign.RIGHT;
    label.color = QUALITY_COLORS[view.quality] ?? QUALITY_COLORS.SSR;
    // 文字貼在立繪框靠畫面中央那一側（錨點在貼齊的那一邊，文字長短不影響間距）
    caption.setPosition(frameX + dir * (FRAME_SIZE / 2 + CAPTION_GAP), 0, 0);
    overlay.addChild(caption);

    parent.addChild(overlay);

    // 立繪與文字從施放方那一側滑入
    const slideFrom = (node: Node): void => {
        const target = node.position.clone();
        node.setPosition(target.x - dir * SLIDE_DISTANCE, target.y, 0);
        tween(node).to(t.slideIn, { position: target }, { easing: 'quadOut' }).start();
    };
    slideFrom(frame);
    slideFrom(caption);

    return new Promise<void>((resolve) => {
        tween(fade)
            .to(t.slideIn, { opacity: 255 })
            .delay(t.hold)
            .to(t.fadeOut, { opacity: 0 })
            .call(() => {
                if (overlay.isValid) overlay.destroy();
                resolve();
            })
            .start();
    });
}
