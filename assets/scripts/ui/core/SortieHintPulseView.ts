// @spec-source → PROG-2-10067（教學結束後出征鈕脈動）
/**
 * SortieHintPulseView — 出征鈕的呼吸光暈。
 *
 * 省效能：只建一個光暈節點（金色圓角框 Graphics，只畫一次），之後開關都重用；
 * 脈動只用 tween 改透明度與縮放，不開粒子、不逐幀重畫。尺寸取目標節點自己的 UITransform，
 * 不寫死像素，版面改成直式或手機橫式時跟著按鈕走。
 *
 * Unity 對照：在按鈕下掛一個 Image，用 DOTween 循環 alpha／scale。
 */
import { Color, Graphics, Node, Tween, tween, UIOpacity, UITransform, Vec3 } from 'cc';

const GLOW_NAME = 'SortieHintGlow';
const PULSE_HALF_SEC = 0.7;

export class SortieHintPulseView {
    private _glow: Node | null = null;
    private _running = false;

    constructor(private readonly _target: Node | (() => Node | null)) {}

    /** 開／關脈動。找不到目標節點時略過。 */
    public setPulse(on: boolean): void {
        if (!on) {
            this._stop();
            return;
        }
        const glow = this._ensureGlow();
        if (!glow || this._running) return;
        glow.active = true;
        const opacity = glow.getComponent(UIOpacity)!;
        opacity.opacity = 90;
        glow.setScale(1, 1, 1);
        this._running = true;
        tween(opacity).repeatForever(tween<UIOpacity>().to(PULSE_HALF_SEC, { opacity: 255 }, { easing: 'sineInOut' }).to(PULSE_HALF_SEC, { opacity: 90 }, { easing: 'sineInOut' })).start();
        tween(glow).repeatForever(tween<Node>().to(PULSE_HALF_SEC, { scale: new Vec3(1.07, 1.07, 1) }, { easing: 'sineInOut' }).to(PULSE_HALF_SEC, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })).start();
    }

    private _stop(): void {
        this._running = false;
        const glow = this._glow;
        if (!glow || !glow.isValid) return;
        Tween.stopAllByTarget(glow);
        const opacity = glow.getComponent(UIOpacity);
        if (opacity) Tween.stopAllByTarget(opacity);
        glow.active = false;
    }

    private _ensureGlow(): Node | null {
        const target = typeof this._target === 'function' ? this._target() : this._target;
        if (!target || !target.isValid) return null;
        if (this._glow && this._glow.isValid && this._glow.parent === target) return this._glow;
        const size = target.getComponent(UITransform);
        if (!size) return null;
        const glow = new Node(GLOW_NAME);
        glow.layer = target.layer;
        const transform = glow.addComponent(UITransform);
        transform.setContentSize(size.contentSize);
        transform.setAnchorPoint(size.anchorPoint);
        glow.addComponent(UIOpacity);
        const g = glow.addComponent(Graphics);
        const x = -size.width * size.anchorX;
        const y = -size.height * size.anchorY;
        g.fillColor = new Color(255, 214, 102, 45);
        g.strokeColor = new Color(255, 214, 102, 255);
        g.lineWidth = 6;
        g.roundRect(x, y, size.width, size.height, 14);
        g.fill();
        g.stroke();
        target.addChild(glow);
        this._glow = glow;
        return glow;
    }
}
