/**
 * QFacePreview.ts — Q 臉部表情預覽頁（開發用，QFACE-01 驗收）
 *
 * 用法：掛在任何 Canvas 底下的節點上。第一排＝12 種預設表情；第二排＝4 種心情乘色＋說話＋LOD2（不眨眼）；
 * 第三排＝壓力測試（stress 顆頭，seed 各異，眨眼錯開）。圖形全是程式產生的佔位部件，
 * 畫面上的英文字只是開發標記，不是遊戲文案。
 */
import { _decorator, Color, Component, JsonAsset, Label, Layers, Node, resources, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { parseFaceData, resolveAnchors } from '../QFaceData';
import { QFaceSystem } from '../QFaceSystem';
import { FaceHandle, QFaceData } from '../types';
import { createQFacePool, QFaceAtlas, QFaceView } from './QFaceCocosView';

const { ccclass, property } = _decorator;

/** 頭型底圖：膚色圓＋深色描邊（程式產生，128×128，邊緣做抗鋸齒）。心情乘色會乘在這張圖上。 */
function buildHeadFrame(): SpriteFrame {
    const N = 128;
    const r = N / 2 - 1;
    const outline = 5;
    const skin = [236, 198, 150];
    const line = [92, 60, 40];
    const px = new Uint8Array(N * N * 4);
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const d = Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2);
            const edge = Math.max(0, Math.min(1, r - d + 0.5));
            const inner = Math.max(0, Math.min(1, r - outline - d + 0.5));
            const o = (y * N + x) * 4;
            for (let c = 0; c < 3; c++) px[o + c] = Math.round(line[c] + (skin[c] - line[c]) * inner);
            px[o + 3] = Math.round(255 * edge);
        }
    }
    const tex = new Texture2D();
    tex.reset({ width: N, height: N, format: Texture2D.PixelFormat.RGBA8888 });
    tex.uploadData(px);
    const f = new SpriteFrame();
    f.texture = tex;
    return f;
}

@ccclass('QFacePreview')
export class QFacePreview extends Component {
    @property({ tooltip: '壓力測試頭數（0 = 不放）' })
    public stress = 24;

    private sys: QFaceSystem | null = null;
    private headFrame: SpriteFrame | null = null;
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
        this.headFrame ??= buildHeadFrame();
        sp.spriteFrame = this.headFrame;
        sp.color = new Color(255, 255, 255, 255);
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
        // 1920 寬畫面：大頭 128、間距 150（12 顆正好排滿一列），壓力測試列 56。
        const BIG = 128;
        const STEP = 150;
        presets.forEach((p, i) => {
            const x = (i - (presets.length - 1) / 2) * STEP;
            const h = spawn(x, 330, BIG);
            sys.setPreset(h, p, 0);
            this.makeLabel(p, x, 250);
        });
        const moods = Object.keys(data.moods);
        const extra = moods.length + 2; // 心情 + speak + LOD2
        const mx = (i: number): number => (i - (extra - 1) / 2) * STEP;
        moods.forEach((m, i) => {
            const h = spawn(mx(i), 110, BIG);
            sys.setMood(h, m);
            this.makeLabel(m, mx(i), 30);
        });
        const talk = spawn(mx(moods.length), 110, BIG);
        sys.setPreset(talk, 'happy');
        this.talkers.push(talk);
        this.makeLabel('speak', mx(moods.length), 30);
        const frozen = spawn(mx(moods.length + 1), 110, BIG);
        sys.setLod(frozen, 2);
        this.makeLabel('LOD2', mx(moods.length + 1), 30);
        for (let i = 0; i < this.stress; i++) {
            const x = (i % 12 - 5.5) * 72;
            const y = -90 - Math.floor(i / 12) * 76;
            spawn(x, y, 60);
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
