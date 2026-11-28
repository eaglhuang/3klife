// @spec-source → 武將生活系統；PROG-2-10214
/**
 * LifeProtoEntry — 從大廳進入生活層原型的開發入口
 *
 * 開發旗標（任一成立才出現入口，正式玩家看不到）：
 *  - 網址帶 ?lifeProto=1（只放入口鈕）或 ?lifeProto=open（進大廳後自動打開生活層）；
 *  - ?lifeProto=street（進大廳後自動打開「市井大街 Q 頭生活雛形」，PROG-2-10258）。
 * 入口＝大廳 Canvas 左下的小按鈕；生活層是蓋在大廳上的全螢幕疊層，回大廳就銷毀疊層，大廳本身一個節點都不動。
 */
import { Color, Layers, Node } from 'cc';
import { services } from '../../../core/managers/ServiceLoader';
import { LifeProtoScene } from './LifeProtoScene';
import { StreetQHeadProto } from './StreetQHeadProto';
import { fitLabel, makeBox, makeLabel, placeBox } from './LifeUiKit';

const ENTRY_NODE = 'LifeProtoEntryButton';
const LAYER_NODE = 'LifeProtoLayer';
const STREET_NODE = 'StreetQHeadLayer';

function queryFlag(): string | null {
    try {
        const search = typeof location !== 'undefined' ? location.search : '';
        const v = new URLSearchParams(search).get('lifeProto');
        if (v) return v;
    } catch {
        // 沒有 location（原生平台）就略過
    }
    return null;
}

export class LifeProtoEntry {
    public static isEnabled(): boolean {
        return queryFlag() !== null;
    }

    /** 大廳就緒後呼叫一次：旗標開啟才放入口鈕（已存在就不重放） */
    public static install(canvas: Node): void {
        const flag = queryFlag();
        if (!flag || canvas.getChildByName(ENTRY_NODE)) return;
        const t = (k: string): string => services().i18n.t(k);
        const btn = makeBox(canvas, ENTRY_NODE, new Color(70, 110, 170, 235));
        btn.layer = Layers.Enum.UI_2D;
        const w = 190;
        const h = 56;
        placeBox(btn, 0, 0, w, h);
        const label = makeLabel(btn, 'Text', 22, new Color(255, 255, 255, 255));
        fitLabel(label, w, h, 6);
        label.string = t('life.proto.enter');
        // 左下角：以 Canvas 實際尺寸換算（錨點 0,0 的方塊座標以 Canvas 中心為原點）
        const ui = canvas.getComponent('cc.UITransform') as unknown as { contentSize: { width: number; height: number } } | null;
        const cw = ui?.contentSize.width ?? 1920;
        const ch = ui?.contentSize.height ?? 1080;
        btn.setPosition(-cw / 2 + 12, -ch / 2 + 84, 0);
        btn.on(Node.EventType.TOUCH_END, () => LifeProtoEntry.open(canvas));
        if (flag === 'open') LifeProtoEntry.open(canvas);
        if (flag === 'street') LifeProtoEntry.openStreet(canvas);
    }

    /** 市井大街 Q 頭生活雛形：全螢幕疊層，離開就銷毀 */
    public static openStreet(canvas: Node): void {
        if (canvas.getChildByName(STREET_NODE)) return;
        const layer = new Node(STREET_NODE);
        layer.layer = Layers.Enum.UI_2D;
        canvas.addChild(layer);
        const scene = layer.addComponent(StreetQHeadProto);
        scene.init(
            (k, ...a) => services().i18n.t(k, ...a),
            () => { if (layer.isValid) layer.destroy(); },
        );
    }

    public static open(canvas: Node): void {
        if (canvas.getChildByName(LAYER_NODE)) return;
        const layer = new Node(LAYER_NODE);
        layer.layer = Layers.Enum.UI_2D;
        canvas.addChild(layer);
        const scene = layer.addComponent(LifeProtoScene);
        scene.init(
            (k, ...a) => services().i18n.t(k, ...a),
            () => { if (layer.isValid) layer.destroy(); },
        );
    }
}
