// @spec-source → 見 docs/cross-reference-index.md
import { _decorator, Component, UITransform, Color, Sprite, SpriteFrame, Texture2D, Rect } from 'cc';
const { ccclass, property, requireComponent, executeInEditMode } = _decorator;

/**
 * Cocos 的 Batcher2D 會把 render.color.a 乘給整棵子樹（文字、頭像一起變暗），
 * 所以底色透明度不寫進 sprite.color，而是烘進貼圖：一張 256×1 的白色貼圖，
 * 第 x 個像素的 alpha 就是 x，每個透明度各取一個 1 像素的 SpriteFrame。
 * 全部共用同一張貼圖，不影響合批。
 * Unity 對照：Image.color 的 alpha 只影響自身，不會傳給子物件。
 */
const ALPHA_STRIP_WIDTH = 256;

let alphaStripTexture: Texture2D | null = null;
const alphaFrames = new Map<number, SpriteFrame>();
const ownedFrames = new WeakSet<object>();

export function buildAlphaStripPixels(): Uint8Array {
    const data = new Uint8Array(ALPHA_STRIP_WIDTH * 4);
    for (let alpha = 0; alpha < ALPHA_STRIP_WIDTH; alpha++) {
        const index = alpha * 4;
        data[index] = 255;
        data[index + 1] = 255;
        data[index + 2] = 255;
        data[index + 3] = alpha;
    }
    return data;
}

function getAlphaStripTexture(): Texture2D {
    if (alphaStripTexture) return alphaStripTexture;

    // 動態建構貼圖，徹底擺脫外部 meta 錯誤及 Editor 快取 bug
    const tex = new Texture2D();
    tex.reset({ width: ALPHA_STRIP_WIDTH, height: 1, format: Texture2D.PixelFormat.RGBA8888 });
    tex.uploadData(buildAlphaStripPixels());
    // 線性過濾會取到相鄰透明度；測試用 cc 型別樁沒有 Filter 列舉，經 any 取用
    const nearest = (Texture2D as any).Filter?.NEAREST;
    if (nearest !== undefined) tex.setFilters(nearest, nearest);
    // 修正：Browser Preview 模式下 uploadData 不設 loaded=true，
    // 導致 SpriteFrame._refreshTexture() 跳過 _calculateUVs()，_uv 維持 null，
    // 每幀 Simple.updateUVs 讀 uv[0] → TypeError: Cannot read properties of null (reading '0').
    // Editor Preview 正常是因為 Editor 環境的渲染初始化路徑會補設此旗標。
    // Unity 對照：類似 Texture2D.Apply() 觸發 GPU 上傳 + 狀態旗標同步。
    (tex as any).loaded = true;

    alphaStripTexture = tex;
    return tex;
}

function getAlphaFrame(alpha: number): SpriteFrame {
    const key = Math.max(0, Math.min(ALPHA_STRIP_WIDTH - 1, Math.round(alpha)));
    const cached = alphaFrames.get(key);
    if (cached) return cached;

    const sf = new SpriteFrame();
    sf.packable = false;
    sf.texture = getAlphaStripTexture(); // tex.loaded=true → _calculateUVs() 正常執行
    sf.rect = new Rect(key, 0, 1, 1); // 必須在 texture 之後：設定 texture 會把 rect 重設成整張貼圖

    alphaFrames.set(key, sf);
    ownedFrames.add(sf);
    return sf;
}

/**
 * 實用的 UI 底板元件：自動掛載 Sprite 並賦予純色。
 * 透明度只作用在底色本身，不會壓暗子節點；美術指定的 SpriteFrame 不受影響。
 */
@ccclass('SolidBackground')
@requireComponent(UITransform)
@executeInEditMode
export class SolidBackground extends Component {

    @property(Color)
    private _color: Color = new Color(255, 255, 255, 255);

    @property(Color)
    get color(): Color { return this._color; }
    set color(val: Color) {
        this._color = val;
        this.updateColor();
    }

    private _sprite: Sprite | null = null;

    onLoad() {
        this._sprite = this.getComponent(Sprite) || this.addComponent(Sprite);

        // 唯有當 Node 上沒有任何 SpriteFrame 時，才掛上我們自製的白圖。
        // 這保證了它「絕對不會蓋掉」美術精心挑選的九宮格/Atlas！
        if (!this._sprite.spriteFrame) {
            this._sprite.sizeMode = Sprite.SizeMode.CUSTOM; // 【關鍵修復】必須先設為 CUSTOM，否則 UITransform Size 會被刷成 1x1！
            this._sprite.type = Sprite.Type.SIMPLE;
            this._sprite.spriteFrame = getAlphaFrame(this._color.a);
        }
        this.updateColor();
    }

    onEnable() {
        this.updateColor();
    }

    private updateColor() {
        const sprite = this._sprite;
        if (!sprite) return;
        const color = this._color;
        if (sprite.spriteFrame && ownedFrames.has(sprite.spriteFrame)) {
            sprite.spriteFrame = getAlphaFrame(color.a);
            sprite.color = new Color(color.r, color.g, color.b, 255);
        } else {
            sprite.color = color;
        }
    }
}

function solidBackgroundOf(sprite: Sprite): SolidBackground | null {
    // 測試或工具傳入的 Sprite 可能未掛在節點上
    return (sprite as any).node?.getComponent?.(SolidBackground) ?? null;
}

/**
 * 替可能掛著 SolidBackground 的 Sprite 上色。
 * 直接寫 sprite.color 的 alpha 會重複疊加且再次壓暗子節點，所以一律走這裡。
 */
export function setSpriteFillColor(sprite: Sprite, color: Color): void {
    const solid = solidBackgroundOf(sprite);
    if (solid) solid.color = color;
    else sprite.color = color;
}

/** 讀取含透明度的底色（sprite.color 的 alpha 在 SolidBackground 上恆為 255） */
export function getSpriteFillColor(sprite: Sprite): Color {
    return solidBackgroundOf(sprite)?.color ?? sprite.color;
}
