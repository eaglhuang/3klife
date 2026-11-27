/**
 * QAnimDemo.ts — Q 動畫管理器 demo（placeholder 方塊當 Q 頭，24 顆同走）
 *
 * 用法：掛在任何 Canvas 底下的節點即可（或執行期 addComponent）。
 * 整個 demo 只有這個 Component 一個 update，呼叫 manager.update(dt)；每顆頭不各掛 schedule／tween。
 * 肉眼驗收：彈、歪頭、落地壓扁、最高點拉長、影子縮放；邊緣轉向用面向翻轉；偶爾跳一下接回走路（佇列）。
 */
import { _decorator, Color, Component, JsonAsset, Label, Node, resources, UITransform } from 'cc';
import { QAnimManager } from '../QAnimManager';
import { hash01 } from '../curves';
import { INVALID_HANDLE, type ActorHandle, type QAnimBudget, type QClipLibrary, type QTierName } from '../types';
import { createQHeadPool, type QHeadView } from './QAnimCocosView';

const { ccclass, property } = _decorator;

interface DemoActor {
    view: QHeadView;
    handle: ActorHandle;
    dir: 1 | -1;
    jumpIn: number;
    speed: number;
    minX: number;
    maxX: number;
}

@ccclass('QAnimDemo')
export class QAnimDemo extends Component {
    @property({ tooltip: '同走的頭數（高階機 24）' })
    count = 24;

    @property({ tooltip: '頭高 H（像素）' })
    headH = 56;

    @property({ tooltip: '本機等級 low / mid / high' })
    tier: QTierName = 'high';

    private manager: QAnimManager | null = null;
    private actors: DemoActor[] = [];
    private label: Label | null = null;
    private elapsed = 0;

    onLoad(): void {
        resources.load('data/q-motion-clips', JsonAsset, (e1, clips) => {
            resources.load('data/q-anim-budget', JsonAsset, (e2, budget) => {
                if (e1 || e2 || !clips || !budget || !this.isValid) return;
                this.build(clips.json as QClipLibrary, budget.json as QAnimBudget);
            });
        });
    }

    private build(lib: QClipLibrary, budget: QAnimBudget): void {
        const mgr = new QAnimManager(lib, budget, { tier: this.tier });
        this.manager = mgr;
        const pool = createQHeadPool(budget.tiers[this.tier].maxActors + budget.poolSpare);
        const cols = 6;
        const rows = Math.ceil(this.count / cols);
        const stepX = 190;
        const stepY = 104;
        const palette = [new Color(232, 120, 90), new Color(110, 170, 230), new Color(130, 200, 120), new Color(230, 200, 100)];
        for (let i = 0; i < this.count; i++) {
            const view = pool.acquire();
            if (!view) break;
            view.seed = i * 7919 + 13;
            view.focusDistance = i;
            view.setup(palette[i % palette.length], this.headH);
            const cx = (i % cols - (cols - 1) / 2) * stepX;
            const cy = ((rows - 1) / 2 - Math.floor(i / cols)) * stepY - 20;
            view.root.setPosition(cx, cy, 0);
            view.root.active = true;
            this.node.addChild(view.root);
            const handle = mgr.register(view);
            if (handle === INVALID_HANDLE) {
                pool.release(view);
                continue;
            }
            mgr.play(handle, 'walk');
            this.actors.push({
                view,
                handle,
                dir: i % 2 === 0 ? 1 : -1,
                jumpIn: 1.5 + hash01(i, 5) * 3,
                speed: 60 + hash01(i, 6) * 24,
                minX: cx - 70,
                maxX: cx + 70,
            });
            mgr.setFacing(handle, i % 2 === 0 ? 1 : -1);
        }
        const ln = new Node('QAnimDemoStats');
        ln.addComponent(UITransform).setContentSize(900, 30);
        this.label = ln.addComponent(Label);
        this.label.fontSize = 18;
        this.label.color = new Color(255, 255, 255, 255);
        ln.setPosition(0, (rows * stepY) / 2 + 24, 0);
        this.node.addChild(ln);
    }

    update(dt: number): void {
        const mgr = this.manager;
        if (!mgr) return;
        this.elapsed += dt;
        for (const a of this.actors) {
            const n = a.view.root;
            const p = n.position;
            let x = p.x;
            // 跳起來的那段原地不動，其餘照面向走
            if (mgr.currentClip(a.handle) === 'walk') x += a.dir * a.speed * dt;
            if (x > a.maxX || x < a.minX) {
                a.dir = a.dir === 1 ? -1 : 1;
                x = Math.max(a.minX, Math.min(a.maxX, x));
                mgr.setFacing(a.handle, a.dir);
            }
            n.setPosition(x, p.y, 0);
            a.jumpIn -= dt;
            if (a.jumpIn <= 0) {
                a.jumpIn = 3 + hash01(a.view.seed, Math.floor(this.elapsed)) * 3;
                mgr.play(a.handle, 'jumpSpin');
                mgr.queue(a.handle, 'walk');
            }
        }
        mgr.update(dt);
        if (this.label && mgr.stats.frame % 15 === 0) {
            const s = mgr.stats;
            this.label.string = `Q 動畫 demo：${s.alive} 顆  本幀更新 ${s.updatedThisFrame}  耗時 ${s.lastUpdateMs.toFixed(2)}ms  池 ${mgr.getPoolInfo().created} 節點組`;
        }
    }

    onDestroy(): void {
        this.manager = null;
        this.actors.length = 0;
    }
}
