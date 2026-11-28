/**
 * QFacePreview.ts — Q 臉部表情預覽頁（開發用，QFACE-01 驗收）
 *
 * 用法：掛在任何 Canvas 底下的節點上。第一排＝12 種預設表情；第二排＝4 種心情乘色＋說話＋LOD2（不眨眼）；
 * 第三排＝壓力測試（stress 顆頭，seed 各異，眨眼錯開）。圖形全是程式產生的佔位部件，
 * 畫面上的英文字只是開發標記，不是遊戲文案。
 */
import { _decorator, Color, Component, JsonAsset, Label, Layers, Node, resources, Sprite, UITransform } from 'cc';
import { parseFaceData, resolveAnchors } from '../QFaceData';
import { QFaceSystem } from '../QFaceSystem';
import { FaceHandle, QFaceData } from '../types';
import { createQFacePool, QFaceAtlas, QFaceView } from './QFaceCocosView';

const { ccclass, property } = _decorator;

@ccclass('QFacePreview')
export class QFacePreview extends Component {
    @property({ tooltip: '壓力測試頭數（0 = 不放）' })
    public stress = 24;

    private sys: QFaceSystem | null = null;
    private readonly talkers: FaceHandle[] = [];
    private talkTimer = 0;

    start(): void {
        resources.load('data/q-face-expressions', JsonAsset, (e1, expr) => {
            resources.load('data/q-face-anchors', JsonAsset, (e2, anc) => {
                if (e1 || e2 || !expr || !anc) {
                    console.error('[QFacePreview] 讀不到表情資料', e1, e2);
                    return;
                }
                this.build(parseFaceData(expr.json), anc.json);
            });
        });
    }

    private makeHead(parent: Node, x: number, y: number, size: number): Sprite {
        const n = new Node('head');
        n.layer = Layers.Enum.UI_2D;
        n.setPosition(x, y, 0);
        n.addComponent(UITransform).setContentSize(size, size);
        const sp = n.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.color = new Color(236, 198, 150, 255);
        parent.addChild(n);
        return sp;
    }

    private makeLabel(text: string, x: number, y: number): void {
        const n = new Node('lbl');
        n.layer = Layers.Enum.UI_2D;
        n.setPosition(x, y, 0);
        const lb = n.addComponent(Label);
        lb.string = text;
        lb.fontSize = 14;
        this.node.addChild(n);
    }

    private build(data: QFaceData, anchorsRaw: unknown): void {
        const sys = new QFaceSystem(data, { maxFaces: 64 });
        this.sys = sys;
        const atlas = new QFaceAtlas(data);
        const pool = createQFacePool(64);
        const anchors = resolveAnchors(anchorsRaw, 'default');
        let seed = 1;
        const spawn = (x: number, y: number, size: number): FaceHandle => {
            const head = this.makeHead(this.node, x, y, size);
            const fv: QFaceView | null = pool.acquire();
            if (!fv) return -1;
            head.node.addChild(fv.root);
            fv.setup(atlas, anchors, size, head);
            return sys.register(fv, seed++ * 7919);
        };
        const presets = Object.keys(data.presets);
        presets.forEach((p, i) => {
            const x = (i - (presets.length - 1) / 2) * 76;
            const h = spawn(x, 150, 64);
            sys.setPreset(h, p, 0);
            this.makeLabel(p, x, 100);
        });
        const moods = Object.keys(data.moods);
        moods.forEach((m, i) => {
            const x = (i - 3) * 76;
            const h = spawn(x, 20, 64);
            sys.setMood(h, m);
            this.makeLabel(m, x, -30);
        });
        const talk = spawn(moods.length * 76 - 3 * 76, 20, 64);
        sys.setPreset(talk, 'happy');
        this.talkers.push(talk);
        this.makeLabel('speak', moods.length * 76 - 3 * 76, -30);
        const frozen = spawn((moods.length + 1) * 76 - 3 * 76, 20, 64);
        sys.setLod(frozen, 2);
        this.makeLabel('LOD2', (moods.length + 1) * 76 - 3 * 76, -30);
        for (let i = 0; i < this.stress; i++) {
            const x = (i % 12 - 5.5) * 40;
            const y = -80 - Math.floor(i / 12) * 44;
            spawn(x, y, 34);
        }
    }

    update(dt: number): void {
        const sys = this.sys;
        if (!sys) return;
        sys.update(dt);
        this.talkTimer -= dt;
        if (this.talkTimer <= 0) {
            this.talkTimer = 2;
            for (const h of this.talkers) sys.speak(h, 1.4, 'mid');
        }
    }
}
