/**
 * QFaceCocosView.ts — Q 臉部表情的 Cocos 套用端
 *
 * 核心（../QFaceSystem）不依賴 Cocos；這裡只做「把臉部狀態寫到節點」。
 * 每張臉 7 個子節點：eyeL、eyeR、mouth、blushL、blushR、mark0、mark1，全部用同一張部件圖集（合批）。
 * 節點走 QActorPool：換場景或移出畫面還回池（active=false），不 destroy。
 * Unity 對照：相當於把 BlendShape 權重寫回 SkinnedMeshRenderer 的那一端。
 */
import { Color, Layers, Node, Rect, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { QActorPool } from '../../anim/QActorPool';
import { buildFacePlaceholderAtlas, faceCellRect } from '../QFacePlaceholder';
import { FaceAnchorSet, IQFaceView, QFaceData, QFaceState } from '../types';

/** 一張部件圖集（佔位或美術圖）＋按格位快取的 SpriteFrame */
export class QFaceAtlas {
    private readonly texture: Texture2D;
    private readonly frames = new Map<number, SpriteFrame>();

    constructor(private readonly data: QFaceData) {
        const atlas = buildFacePlaceholderAtlas(data);
        this.texture = new Texture2D();
        this.texture.reset({ width: atlas.width, height: atlas.height, format: Texture2D.PixelFormat.RGBA8888 });
        this.texture.uploadData(atlas.pixels);
    }

    frameOf(cell: number): SpriteFrame {
        let f = this.frames.get(cell);
        if (!f) {
            const r = faceCellRect(cell, this.data.atlas.cellSize, this.data.atlas.columns);
            f = new SpriteFrame();
            f.texture = this.texture; // 先設 texture 再設 rect
            f.rect = new Rect(r.x, r.y, r.w, r.h);
            this.frames.set(cell, f);
        }
        return f;
    }
}

function makePart(parent: Node, name: string): Sprite {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    n.addComponent(UITransform);
    const sp = n.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    parent.addChild(n);
    return sp;
}

/** 一張臉的節點組（池化單位） */
export class QFaceView implements IQFaceView {
    readonly root: Node;
    private readonly eyeL: Sprite;
    private readonly eyeR: Sprite;
    private readonly mouth: Sprite;
    private readonly blushL: Sprite;
    private readonly blushR: Sprite;
    private readonly mark0: Sprite;
    private readonly mark1: Sprite;
    private atlas: QFaceAtlas | null = null;
    private headSprite: Sprite | null = null;
    private headSize = 60;
    private eyeBase = 0;
    private mouthBase = 0;
    private readonly eyeColor = new Color(40, 26, 18, 255);
    private readonly blushColor = new Color(236, 96, 96, 0);
    private eyeLActive = true;

    constructor() {
        this.root = new Node('QFace');
        this.root.layer = Layers.Enum.UI_2D;
        this.eyeL = makePart(this.root, 'eyeL');
        this.eyeR = makePart(this.root, 'eyeR');
        this.mouth = makePart(this.root, 'mouth');
        this.blushL = makePart(this.root, 'blushL');
        this.blushR = makePart(this.root, 'blushR');
        this.mark0 = makePart(this.root, 'mark0');
        this.mark1 = makePart(this.root, 'mark1');
    }

    /**
     * 領出來時設定：錨點（大頭寬度比例，左上原點）、頭圖大小（像素）、可選的頭圖 Sprite（心情乘色用）。
     * 眼罩那一側（anchor.disabled）節點直接 inactive。
     */
    setup(atlas: QFaceAtlas, anchors: FaceAnchorSet, headSize: number, headSprite: Sprite | null): void {
        this.atlas = atlas;
        this.headSize = headSize;
        this.headSprite = headSprite;
        const S = headSize;
        const place = (sp: Sprite, a: { x: number; y: number; scale?: number }, w: number): void => {
            sp.node.setPosition((a.x - 0.5) * S, (0.5 - a.y) * S, 0);
            sp.getComponent(UITransform)!.setContentSize(w * (a.scale ?? 1), w * (a.scale ?? 1));
        };
        place(this.eyeL, anchors.eyeL, S * 0.22);
        place(this.eyeR, anchors.eyeR, S * 0.22);
        place(this.mouth, anchors.mouth, S * 0.26);
        place(this.blushL, anchors.blushL, S * 0.2);
        place(this.blushR, anchors.blushR, S * 0.2);
        this.mark0.node.setPosition(S * 0.38, S * 0.38, 0);
        this.mark1.node.setPosition(-S * 0.38, S * 0.38, 0);
        this.mark0.getComponent(UITransform)!.setContentSize(S * 0.2, S * 0.2);
        this.mark1.getComponent(UITransform)!.setContentSize(S * 0.2, S * 0.2);
        this.eyeLActive = anchors.eyeL.disabled !== true;
        this.eyeL.node.active = this.eyeLActive;
        this.eyeBase = S * 0.22;
        this.mouthBase = S * 0.26;
        this.root.active = true;
    }

    apply(st: Readonly<QFaceState>): void {
        const atlas = this.atlas;
        if (!atlas) return;
        const sc = st.eyeScale;
        this.eyeR.spriteFrame = atlas.frameOf(st.eyeCell);
        this.eyeR.color = this.eyeColor;
        this.eyeR.node.setScale(sc, sc, 1);
        this.eyeR.node.angle = -st.eyeRot;
        if (this.eyeLActive) {
            this.eyeL.spriteFrame = this.eyeR.spriteFrame;
            this.eyeL.color = this.eyeColor;
            this.eyeL.node.setScale(-sc, sc, 1);
            this.eyeL.node.angle = st.eyeRot;
        }
        this.mouth.spriteFrame = atlas.frameOf(st.mouthCell);
        this.mouth.color = this.eyeColor;
        this.mouth.node.setScale(1, st.mouthScaleY, 1);
        const showBlush = st.blush > 0.01;
        this.blushL.node.active = showBlush;
        this.blushR.node.active = showBlush;
        if (showBlush) {
            this.blushColor.a = Math.round(255 * 0.6 * st.blush);
            this.blushL.spriteFrame = atlas.frameOf(st.blushCell);
            this.blushR.spriteFrame = this.blushL.spriteFrame;
            this.blushL.color = this.blushColor;
            this.blushR.color = this.blushColor;
        }
        this.setMark(this.mark0, atlas, st.markCell0);
        this.setMark(this.mark1, atlas, st.markCell1);
        if (this.headSprite) {
            const b = Math.round(st.brightBoost * 255);
            this.headSprite.color = new Color(
                Math.min(255, Math.round(st.tintR) + b), Math.min(255, Math.round(st.tintG) + b),
                Math.min(255, Math.round(st.tintB) + b), 255);
        }
    }

    private setMark(sp: Sprite, atlas: QFaceAtlas, cell: number): void {
        sp.node.active = cell >= 0;
        if (cell >= 0) {
            sp.spriteFrame = atlas.frameOf(cell);
            sp.color = this.eyeColor;
        }
    }

    reset(): void {
        this.root.active = false;
        this.root.removeFromParent();
        this.headSprite = null;
    }
}

/** 建立臉部節點池（上限＝同畫面頭數上限） */
export function createQFacePool(maxSize: number): QActorPool<QFaceView> {
    return new QActorPool<QFaceView>(() => new QFaceView(), maxSize, (v) => v.reset());
}
