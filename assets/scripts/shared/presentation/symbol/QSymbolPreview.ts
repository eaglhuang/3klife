/**
 * QSymbolPreview.ts — 頭上生活符號預覽頁（開發用，WP2 驗收）
 *
 * 用法：掛在任何 Canvas 底下的節點上（或在預覽頁用 `node.addComponent('QSymbolPreview')`）。
 * 上排：6 種已實作活動（睡覺、練武、喝酒、讀書、喝茶、發呆）＋3 個兩人互動符號（聊天、吵架、曖昧）。
 * 下排：壓力測試（stress 顆頭）看預算與 LOD 降級。圖形全是程式產生的佔位幾何。
 * 畫面上的英文字只是開發標記，不是遊戲文案。
 */
import { _decorator, Color, Component, JsonAsset, Label, Layers, Node, resources, Sprite, UITransform } from 'cc';
import { parseSymbolData } from './QSymbolData';
import { QSymbolView } from './QSymbolView';
import { QSymbolData, SymbolTier } from './types';

const { ccclass, property } = _decorator;

const ACTIVITIES = ['sleep', 'train', 'drink', 'read', 'tea', 'idle'];
const PAIRS: Array<[string, number]> = [['chat', 0.5], ['fight', 2.5], ['love', 4.5]];
const HEAD_SIZE = 90;
const STRESS_HEAD_SIZE = 44;

@ccclass('QSymbolPreview')
export class QSymbolPreview extends Component {
    @property({ tooltip: 'low / mid / high' })
    public tier: SymbolTier = 'mid';

    @property({ tooltip: '壓力測試的頭數（0 = 不放）' })
    public stress = 24;

    private view: QSymbolView | null = null;

    start(): void {
        resources.load('data/q-symbol-groups', JsonAsset, (err, asset) => {
            if (err || !asset) {
                console.error('[QSymbolPreview] 讀不到 q-symbol-groups', err);
                return;
            }
            this.build(parseSymbolData(asset.json));
        });
    }

    private makeHead(view: QSymbolView, x: number, y: number, size: number, tag: string): void {
        const n = new Node(`head_${tag}`);
        n.layer = Layers.Enum.UI_2D;
        n.setPosition(x, y, 0);
        const ui = n.addComponent(UITransform);
        ui.setContentSize(size, size);
        const sp = n.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.spriteFrame = view.frameOf('dot');
        sp.color = new Color(236, 198, 150, 255);
        this.node.addChild(n);
    }

    private makeLabel(text: string, x: number, y: number): void {
        const n = new Node('lbl');
        n.layer = Layers.Enum.UI_2D;
        n.setPosition(x, y, 0);
        const lb = n.addComponent(Label);
        lb.string = text;
        lb.fontSize = 16;
        lb.color = new Color(255, 255, 255, 255);
        this.node.addChild(n);
    }

    private build(data: QSymbolData): void {
        const view = new QSymbolView(this.node, data, this.tier);
        this.view = view;
        const sys = view.system;
        const spacing = 170;
        const x0 = -spacing * (ACTIVITIES.length - 1) / 2;
        const topY = 120;
        sys.setFocus(0, 0, 1920);
        ACTIVITIES.forEach((act, i) => {
            const x = x0 + i * spacing;
            this.makeHead(view, x, topY, HEAD_SIZE, act);
            this.makeLabel(act, x, topY - HEAD_SIZE * 0.75);
            sys.addHead({ x, y: topY + HEAD_SIZE * 0.95, size: HEAD_SIZE, activity: act, weaponPart: 'weapon_spear', seed: act });
        });
        for (const [kind, slot] of PAIRS) {
            const x = x0 + slot * spacing;
            sys.addPair(kind, x, topY + HEAD_SIZE * 1.9, HEAD_SIZE);
            this.makeLabel(`pair:${kind}`, x, topY + HEAD_SIZE * 1.4);
        }
        const cols = 8;
        for (let i = 0; i < this.stress; i++) {
            const x = -480 + (i % cols) * 130;
            const y = -90 - Math.floor(i / cols) * 120;
            this.makeHead(view, x, y, STRESS_HEAD_SIZE, `s${i}`);
            sys.addHead({ x, y: y + STRESS_HEAD_SIZE * 0.95, size: STRESS_HEAD_SIZE, activity: ACTIVITIES[i % ACTIVITIES.length], seed: `s${i}` });
        }
    }

    update(dt: number): void {
        if (this.view) this.view.tick(dt);
    }

    onDestroy(): void {
        if (this.view) this.view.dispose();
        this.view = null;
    }
}
