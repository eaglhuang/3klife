// @spec-source → 因子爆發系統.md §H 覺醒定格（PROG-2-1702）；官職系統.md (doc_spec_0014) E-6 升官動畫（PROG-2-1859）
/**
 * TitleFreezeOverlay — 暗幕＋大字彈出、停留後淡出的共用演出。
 * 由 ResultPopupComposite 的覺醒定格抽出（PROG-2-1859），大廳晉升演出共用同一套。
 *
 * Unity 對照：像一個掛在 Canvas 最上層、播完自毀的 Overlay Prefab。
 */
import { Color, Graphics, Label, Node, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import type { AwakeningFreezeTiming } from '../../shared/interfaces/IBattleUIComponents';

/** 在 parent 最上層播一次大字定格；parent 失效時立即結束 */
export function playTitleFreeze(parent: Node, title: string, t: AwakeningFreezeTiming, name = 'TitleFreeze'): Promise<void> {
    if (!parent.isValid) return Promise.resolve();
    const host = parent.getComponent(UITransform);
    const width = host?.width ?? 1920;
    const height = host?.height ?? 1080;

    const overlay = new Node(name);
    overlay.layer = parent.layer;
    overlay.addComponent(UITransform).setContentSize(width, height);
    const dim = overlay.addComponent(Graphics);
    dim.fillColor = new Color(0, 0, 0, 170);
    dim.rect(-width / 2, -height / 2, width, height);
    dim.fill();
    const fade = overlay.addComponent(UIOpacity);
    fade.opacity = 0;

    const text = new Node(`${name}Title`);
    text.layer = parent.layer;
    text.addComponent(UITransform);
    const label = text.addComponent(Label);
    label.string = title;
    label.fontSize = 64;
    label.lineHeight = 72;
    label.color = new Color(255, 215, 0, 255);
    text.setScale(new Vec3(t.popScaleFrom, t.popScaleFrom, 1));
    overlay.addChild(text);
    parent.addChild(overlay);

    return new Promise<void>((resolve) => {
        tween(text).to(t.pop, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
        tween(fade)
            .to(t.fadeIn, { opacity: 255 })
            .delay(t.hold)
            .to(t.fadeOut, { opacity: 0 })
            .call(() => {
                if (overlay.isValid) overlay.destroy();
                resolve();
            })
            .start();
    });
}
