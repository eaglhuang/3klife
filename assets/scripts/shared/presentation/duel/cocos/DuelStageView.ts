/**
 * DuelStageView.ts — Q 頭切磋的 Cocos 套用端（PROG-2-10231）
 *
 * 核心取樣在 ../DuelPlayback（引擎中立）；這裡只做「把取樣值寫到節點」：
 *  - 兩顆 Q 頭（QHeadView，節點走 QActorPool）＋ 各自的武器掛點 weaponHand（空時可掛 Q 版武器，預設畫一把簡化劍）。
 *  - 跳字池 12（Label，不逐個建）、血條池 4（前條立刻扣、後條追上；顏色 >50% 綠、20～50% 黃、<20% 紅）。
 *  - 所有動態建立的節點一律經 addChildInherit 加進舞台，layer 跟 root 一致（否則 UI 相機看不到）。
 *  - 動畫管理器（QAnimManager）只負責待機呼吸與勝者跳；切磋位移由取樣值疊加在管理器輸出之後（同一幀）。
 * 不用逐幀圖、不用 tween；整個舞台只在 update(dt) 一處推進。
 * 備註：血條目前用 Graphics 畫（等 q-common 圖集有血條 Sliced 圖再換 Sprite fillRange，規格 4.4）。
 * Unity 對照：相當於 DuelPlayableBehaviour 的 ProcessFrame 把數值寫回 Transform／UI。
 */
import { Color, Graphics, Label, LabelOutline, Node, UIOpacity, UITransform } from 'cc';
import type { DuelConfig, DuelResult, DuelSide } from '../../../../core/life/duel/DuelTypes';
import type { QAnimManager } from '../../anim/QAnimManager';
import { INVALID_HANDLE, type ActorHandle } from '../../anim/types';
import { QActorPool } from '../../anim/QActorPool';
import { addChildInherit } from '../../NodeLayer';
import { createQHeadPool, type QHeadView } from '../../anim/cocos/QAnimCocosView';
import {
    buildDuelTimeline, createDuelFrame, sampleDuel,
    type DuelFloatKind, type DuelFrame, type DuelHeadFrame, type DuelTimeline,
} from '../DuelPlayback';

const FLOAT_POOL = 12;
const BAR_POOL = 4;

const FLOAT_COLOR: Record<DuelFloatKind, Color> = {
    hit: new Color(255, 255, 255, 255),
    crit: new Color(255, 205, 60, 255),
    dodge: new Color(170, 170, 180, 255),
};

interface FloatView { node: Node; label: Label; }

class HpBarView {
    readonly node = new Node('DuelHpBar');
    private readonly gfx: Graphics;
    private last = '';
    constructor() {
        this.node.addComponent(UITransform).setContentSize(100, 12);
        this.gfx = this.node.addComponent(Graphics);
    }
    draw(w: number, front: number, back: number): void {
        const key = `${w}|${front.toFixed(3)}|${back.toFixed(3)}`;
        if (key === this.last) return;
        this.last = key;
        const g = this.gfx;
        const h = 10;
        g.clear();
        g.fillColor = new Color(20, 20, 28, 220);
        g.rect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
        g.fill();
        g.fillColor = new Color(235, 235, 235, 255);
        g.rect(-w / 2, -h / 2, w * back, h);
        g.fill();
        g.fillColor = front > 0.5 ? new Color(90, 200, 90, 255) : front >= 0.2 ? new Color(235, 200, 60, 255) : new Color(225, 70, 60, 255);
        g.rect(-w / 2, -h / 2, w * front, h);
        g.fill();
    }
    reset(): void { this.last = ''; }
}

interface SideState {
    view: QHeadView;
    handle: ActorHandle;
    /** 朝對手的方向：a 在左 = +1、b 在右 = -1 */
    dir: 1 | -1;
    baseX: number;
    /** 武器掛點（根節點的子節點，跟著頭的位移與擊退、不隨頭翻轉） */
    weaponHand: Node;
    weaponGfx: Graphics;
    /** 白閃覆蓋層（命中停格時 UIOpacity 瞬間拉高，不用 shader） */
    flash: Node;
    flashOpacity: UIOpacity;
    bar: HpBarView;
}

export interface DuelStageOptions {
    headH: number;
    colors: [Color, Color];
    /** 切磋速度倍率（1＝規格時間） */
    speed?: number;
}

export class DuelStageView {
    private readonly sides: Record<DuelSide, SideState | null> = { a: null, b: null };
    private readonly floatPool: QActorPool<FloatView>;
    private readonly barPool: QActorPool<HpBarView>;
    private readonly headPool: QActorPool<QHeadView>;
    private readonly frame: DuelFrame = createDuelFrame();
    private readonly activeFloats: FloatView[] = [];
    private timeline: DuelTimeline | null = null;
    private t = 0;
    private speed = 1;
    private headH = 56;
    private onDone: ((r: DuelResult) => void) | null = null;
    private finished = true;

    constructor(readonly root: Node, private readonly anim: QAnimManager, private readonly cfg: DuelConfig, headPool?: QActorPool<QHeadView>) {
        this.headPool = headPool ?? createQHeadPool(4);
        this.floatPool = new QActorPool<FloatView>(() => this.makeFloat(), FLOAT_POOL, (f) => { f.node.active = false; });
        this.barPool = new QActorPool<HpBarView>(() => new HpBarView(), BAR_POOL, (b) => { b.node.active = false; b.reset(); });
    }

    get playing(): boolean { return !this.finished; }
    /** 兩邊武器掛點：呼叫端可在這裡掛 Q 版武器節點（預設是簡化劍）。 */
    weaponHandOf(side: DuelSide): Node | null { return this.sides[side]?.weaponHand ?? null; }

    start(result: DuelResult, opts: DuelStageOptions, onDone?: (r: DuelResult) => void): boolean {
        this.stop();
        this.headH = opts.headH;
        this.speed = opts.speed ?? 1;
        const pb = this.cfg.playback;
        const half = (pb.standoffH * opts.headH) / 2;
        const make = (side: DuelSide, dir: 1 | -1, color: Color): boolean => {
            const view = this.headPool.acquire();
            const bar = this.barPool.acquire();
            if (!view || !bar) {
                if (view) this.headPool.release(view);
                if (bar) this.barPool.release(bar);
                return false;
            }
            view.seed = side === 'a' ? 11 : 29;
            view.focusDistance = 0;
            view.setup(color, opts.headH);
            view.root.active = true;
            view.root.setPosition(-dir * half, 0, 0);
            addChildInherit(this.root, view.root);
            const handle = this.anim.register(view);
            if (handle === INVALID_HANDLE) {
                this.headPool.release(view);
                this.barPool.release(bar);
                return false;
            }
            this.anim.play(handle, 'idle');
            this.anim.setFacing(handle, dir);
            const weaponHand = new Node('weaponHand');
            weaponHand.addComponent(UITransform).setContentSize(8, 8);
            const weaponGfx = weaponHand.addComponent(Graphics);
            this.drawDefaultSword(weaponGfx, opts.headH);
            addChildInherit(view.root, weaponHand);
            const flash = new Node('flash');
            flash.addComponent(UITransform).setContentSize(opts.headH, opts.headH);
            const fg = flash.addComponent(Graphics);
            fg.fillColor = new Color(255, 255, 255, 255);
            fg.roundRect(-opts.headH / 2, -opts.headH / 2, opts.headH, opts.headH, opts.headH * 0.22);
            fg.fill();
            const flashOpacity = flash.addComponent(UIOpacity);
            flashOpacity.opacity = 0;
            addChildInherit(view.root, flash);
            bar.node.active = true;
            addChildInherit(this.root, bar.node);
            this.sides[side] = { view, handle, dir, baseX: -dir * half, weaponHand, weaponGfx, flash, flashOpacity, bar };
            return true;
        };
        if (!make('a', 1, opts.colors[0]) || !make('b', -1, opts.colors[1])) {
            this.stop();
            return false;
        }
        this.timeline = buildDuelTimeline(result, pb, this.speed);
        this.t = 0;
        this.finished = false;
        this.onDone = onDone ?? null;
        return true;
    }

    /** 每幀呼叫（宿主先 anim.update(dt) 再呼叫這裡，才會把切磋位移疊在管理器輸出之上）。 */
    update(dt: number): void {
        const tl = this.timeline;
        if (!tl || this.finished) return;
        this.t += dt;
        sampleDuel(tl, this.t, this.frame, this.speed);
        const f = this.frame;
        const shake = f.shakePx > 0 ? (Math.floor(this.t * 60) % 2 === 0 ? 1 : -1) * f.shakePx : 0;
        this.applySide('a', f.a, shake);
        this.applySide('b', f.b, shake);
        this.applyBars();
        this.applyFloats();
        const w = tl.result.winner;
        if (w) {
            const winner = this.sides[w];
            if (winner && f.a.pose === 'win' && this.anim.currentClip(winner.handle) !== 'jump') this.anim.play(winner.handle, 'jump', { loop: true });
        }
        if (f.done) {
            this.finished = true;
            const cb = this.onDone;
            this.onDone = null;
            cb?.(tl.result);
        }
    }

    /** 收場：頭、血條、跳字全還回池（不 destroy）。 */
    stop(): void {
        for (const side of ['a', 'b'] as const) {
            const s = this.sides[side];
            if (!s) continue;
            this.anim.unregister(s.handle);
            s.weaponHand.destroy();
            s.flash.destroy();
            s.bar.node.removeFromParent();
            this.barPool.release(s.bar);
            this.headPool.release(s.view);
            this.sides[side] = null;
        }
        for (const fl of this.activeFloats) this.floatPool.release(fl);
        this.activeFloats.length = 0;
        this.timeline = null;
        this.finished = true;
    }

    private applySide(side: DuelSide, h: DuelHeadFrame, shake: number): void {
        const s = this.sides[side];
        if (!s) return;
        const H = this.headH;
        const root = s.view.root;
        root.setPosition(s.baseX + s.dir * h.x * H + shake, 0, 0);
        const head = s.view.head;
        const p = head.position;
        head.setPosition(p.x, p.y + h.y * H, 0);
        head.angle += h.rot * -s.dir;
        head.setScale(head.scale.x * h.scaleX, head.scale.y * h.scaleY, 1);
        // 武器掛點：頭的右側（朝對手那一側），繞掛點旋轉
        s.weaponHand.setPosition(s.dir * H * 0.55, p.y + h.y * H, 0);
        s.weaponHand.angle = -s.dir * h.weaponDeg;
        s.weaponHand.setScale(s.dir, 1, 1);
        s.weaponHand.active = true;
        // 白閃：覆蓋層跟著頭，透明度瞬間拉高
        s.flash.setPosition(0, p.y + h.y * H, 0);
        s.flash.angle = head.angle;
        s.flash.setScale(head.scale.x, head.scale.y, 1);
        s.flashOpacity.opacity = Math.round(190 * h.flash);
    }

    private applyBars(): void {
        const f = this.frame;
        const w = this.headH * 1.2;
        const y = this.headH * 1.35;
        for (const side of ['a', 'b'] as const) {
            const s = this.sides[side];
            if (!s) continue;
            s.bar.node.setPosition(s.view.root.position.x, y, 0);
            s.bar.draw(w, side === 'a' ? f.hp.aFront : f.hp.bFront, side === 'a' ? f.hp.aBack : f.hp.bBack);
        }
    }

    private applyFloats(): void {
        const items = this.frame.floats;
        while (this.activeFloats.length > items.length) this.floatPool.release(this.activeFloats.pop()!);
        while (this.activeFloats.length < items.length) {
            const fl = this.floatPool.acquire();
            if (!fl) break;
            fl.node.active = true;
            addChildInherit(this.root, fl.node);
            this.activeFloats.push(fl);
        }
        for (let i = 0; i < this.activeFloats.length; i++) {
            const it = items[i];
            const fl = this.activeFloats[i];
            const s = this.sides[it.side];
            if (!s) continue;
            const H = this.headH;
            fl.label.string = it.kind === 'dodge' ? '閃' : String(it.damage);
            fl.label.color = FLOAT_COLOR[it.kind];
            fl.label.fontSize = it.kind === 'crit' ? 34 : 26;
            fl.node.setPosition(s.view.root.position.x, H * 1.1 + it.rise * H, 0);
            fl.node.setScale(it.scale, it.scale, 1);
        }
    }

    private makeFloat(): FloatView {
        const node = new Node('DuelFloat');
        node.addComponent(UITransform).setContentSize(120, 40);
        const label = node.addComponent(Label);
        label.fontSize = 26;
        label.lineHeight = 30;
        label.isBold = true;
        const ol = node.addComponent(LabelOutline);
        ol.color = new Color(20, 20, 30, 255);
        ol.width = 3;
        return { node, label };
    }

    /** 預設的簡化劍：單色劍身＋護手，沿用兵種符號「劍」的風格；可被 Q 版武器節點取代。 */
    private drawDefaultSword(g: Graphics, headH: number): void {
        const L = headH * 0.8;
        g.clear();
        g.fillColor = new Color(215, 220, 230, 255);
        g.rect(-3, 0, 6, L);
        g.fill();
        g.fillColor = new Color(170, 120, 60, 255);
        g.rect(-9, -2, 18, 5);
        g.rect(-2.5, -12, 5, 11);
        g.fill();
    }
}
