/**
 * QAnimCocosView.ts — Q 動畫管理器的 Cocos 套用端（placeholder 方塊當 Q 頭）
 *
 * 核心（../QAnimManager 等）不依賴 Cocos；這裡只做「把通道值寫到節點」。
 * 每顆頭 3 個節點：根（位置）、影子 1、頭 1（QACT-01 §6 上限 12，臉部之後由表情系統掛）。
 * 節點走 QActorPool：移出畫面／換場景還回池（active=false），不 destroy。
 * Unity 對照：相當於 Animator 的 Transform 寫回端。
 */
import { Color, Graphics, Node, UIOpacity, UITransform } from 'cc';
import { QActorPool } from '../QActorPool';
import type { IQActor, QChannels } from '../types';

/** 一顆 Q 頭的畫面節點組（池化單位） */
export class QHeadView implements IQActor {
    readonly root: Node;
    readonly shadow: Node;
    readonly head: Node;
    private readonly shadowOpacity: UIOpacity;
    private readonly gfx: Graphics;
    /** 頭高 H（像素）：通道 y 以 H 為單位，所以頭大頭小不必改參數 */
    headH = 60;
    seed = 0;
    noFlip = false;
    focusDistance: number | undefined = undefined;
    culled = false;

    constructor() {
        this.root = new Node('QHead');
        this.shadow = new Node('Shadow');
        this.head = new Node('Head');
        this.root.addChild(this.shadow);
        this.root.addChild(this.head);
        this.shadow.addComponent(UITransform).setContentSize(60, 16);
        this.shadowOpacity = this.shadow.addComponent(UIOpacity);
        this.head.addComponent(UITransform).setContentSize(60, 60);
        this.gfx = this.head.addComponent(Graphics);
        const sg = this.shadow.addComponent(Graphics);
        sg.fillColor = new Color(0, 0, 0, 140);
        sg.ellipse(0, 0, 26, 7);
        sg.fill();
    }

    /** 領出來時設定外觀（placeholder：彩色方塊＋眼睛＋鼻子，看得出左右翻轉） */
    setup(color: Color, headH: number): void {
        this.headH = headH;
        const g = this.gfx;
        g.clear();
        g.fillColor = color;
        g.roundRect(-headH / 2, -headH / 2, headH, headH, headH * 0.22);
        g.fill();
        g.fillColor = new Color(30, 30, 40, 255);
        g.circle(-headH * 0.17, headH * 0.08, headH * 0.06);
        g.circle(headH * 0.17, headH * 0.08, headH * 0.06);
        g.fill();
        // 嘴鼻：偏右，用來辨識水平翻轉方向
        g.fillColor = new Color(255, 255, 255, 230);
        g.roundRect(headH * 0.12, -headH * 0.22, headH * 0.26, headH * 0.1, 3);
        g.fill();
        this.shadow.setPosition(0, 0, 0);
        this.head.setPosition(0, headH * 0.5, 0);
    }

    apply(ch: Readonly<QChannels>): void {
        const h = this.headH;
        this.head.setPosition(0, h * 0.5 + ch.y * h, 0);
        this.head.angle = ch.rot;
        this.head.setScale(ch.scaleX * ch.flipX, ch.scaleY, 1);
        this.shadow.setScale(ch.shadowScale, ch.shadowScale, 1);
        this.shadowOpacity.opacity = Math.round(255 * ch.shadowAlpha);
    }
}

/** 建立 Q 頭節點池（上限＝本機等級可見頭數＋備用） */
export function createQHeadPool(maxSize: number): QActorPool<QHeadView> {
    return new QActorPool<QHeadView>(
        () => new QHeadView(),
        maxSize,
        (v) => {
            v.root.active = false;
            v.root.removeFromParent();
        },
    );
}
