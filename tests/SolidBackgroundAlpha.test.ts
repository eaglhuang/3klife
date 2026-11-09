/**
 * SolidBackgroundAlpha — 底色透明度烘進貼圖，不壓暗子節點（PROG-2-2129）
 */
import { Color, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { GradientBackground } from '../assets/scripts/ui/components/GradientBackground';
import {
    SolidBackground,
    buildAlphaStripPixels,
    getSpriteFillColor,
    setSpriteFillColor,
} from '../assets/scripts/ui/components/SolidBackground';
import { TestSuite, assert } from './TestRunner';

function prepareCcStubs(): { uploads: Uint8Array[] } {
    const uploads: Uint8Array[] = [];
    const spriteStatics = Sprite as any;
    spriteStatics.SizeMode = spriteStatics.SizeMode ?? { CUSTOM: 0 };
    spriteStatics.Type = spriteStatics.Type ?? { SIMPLE: 0 };
    const textureStatics = Texture2D as any;
    textureStatics.PixelFormat = textureStatics.PixelFormat ?? { RGBA8888: 0 };
    textureStatics.prototype.reset = () => undefined;
    textureStatics.prototype.uploadData = (data: Uint8Array) => { uploads.push(data); };
    return { uploads };
}

function makeSolid(sprite: Sprite): SolidBackground {
    const solid = new SolidBackground();
    (solid as any).getComponent = () => sprite;
    return solid;
}

function makeSprite(): Sprite {
    const sprite = new Sprite();
    sprite.color = new Color(255, 255, 255, 255);
    return sprite;
}

export function createSolidBackgroundAlphaSuite(): TestSuite {
    const suite = new TestSuite('SolidBackgroundAlpha (底色透明度不壓暗子節點 PROG-2-2129)');

    suite.test('透明度貼圖每個像素的 alpha 等於其位置，RGB 全白', () => {
        const data = buildAlphaStripPixels();
        assert.equals(data.length, 256 * 4, '256 像素');
        for (const alpha of [0, 1, 102, 255]) {
            assert.equals(data[alpha * 4 + 3], alpha, `第 ${alpha} 像素的 alpha`);
            assert.equals(data[alpha * 4], 255, '紅');
            assert.equals(data[alpha * 4 + 1], 255, '綠');
            assert.equals(data[alpha * 4 + 2], 255, '藍');
        }
    });

    suite.test('半透明底色：透明度進貼圖、sprite.color 不透明、color 維持原值', () => {
        prepareCcStubs();
        const sprite = makeSprite();
        const solid = makeSolid(sprite);
        solid.color = new Color(10, 20, 30, 102);
        solid.onLoad();
        assert.equals(sprite.color.a, 255, '不把 alpha 傳給子節點');
        assert.equals(sprite.color.g, 20, 'RGB 照舊');
        assert.equals((sprite.spriteFrame as any).rect.x, 102, '取 alpha 102 的像素');
        assert.equals(solid.color.a, 102, '對外的 color 語意不變');
    });

    suite.test('改透明度換像素，同透明度共用同一個 SpriteFrame', () => {
        prepareCcStubs();
        const sprite = makeSprite();
        const solid = makeSolid(sprite);
        solid.onLoad();
        assert.equals((sprite.spriteFrame as any).rect.x, 255, '預設不透明');
        solid.color = new Color(1, 2, 3, 0);
        assert.equals((sprite.spriteFrame as any).rect.x, 0, '全透明');
        assert.equals(sprite.color.a, 255, '全透明也不隱藏子節點');
        solid.color = new Color(1, 2, 3, 40);
        const frame = sprite.spriteFrame;
        solid.color = new Color(9, 9, 9, 40);
        assert.equals(sprite.spriteFrame, frame, '共用快取');
    });

    suite.test('美術指定的 SpriteFrame 不被蓋掉，維持寫入 sprite.color', () => {
        prepareCcStubs();
        const sprite = makeSprite();
        const art = new SpriteFrame();
        sprite.spriteFrame = art;
        const solid = makeSolid(sprite);
        solid.color = new Color(10, 20, 30, 102);
        solid.onLoad();
        assert.equals(sprite.spriteFrame, art, '不換圖');
        assert.equals(sprite.color.a, 102, '美術圖照舊用 sprite.color');
    });

    suite.test('setSpriteFillColor／getSpriteFillColor 有 SolidBackground 時走元件', () => {
        prepareCcStubs();
        const sprite = makeSprite();
        const solid = makeSolid(sprite);
        solid.onLoad();
        (sprite as any).node = { getComponent: () => solid };
        setSpriteFillColor(sprite, new Color(5, 6, 7, 80));
        assert.equals(sprite.color.a, 255, '不直接寫 alpha');
        assert.equals((sprite.spriteFrame as any).rect.x, 80, '烘進貼圖');
        assert.equals(getSpriteFillColor(sprite).a, 80, '讀回含透明度');
    });

    suite.test('setSpriteFillColor：沒有 SolidBackground 時直接寫 sprite.color', () => {
        const sprite = makeSprite();
        setSpriteFillColor(sprite, new Color(5, 6, 7, 80));
        assert.equals(sprite.color.a, 80, '直接寫');
        assert.equals(getSpriteFillColor(sprite).a, 80, '直接讀');
    });

    suite.test('GradientBackground：tint 透明度乘進像素，sprite.color 不透明', () => {
        const { uploads } = prepareCcStubs();
        const sprite = makeSprite();
        const gradient = new GradientBackground();
        (gradient as any).getComponent = (type: unknown) => (
            type === Sprite ? sprite : type === UITransform ? { width: 400, height: 400 } : null
        );
        const stop = { color: new Color(10, 20, 30, 200), offset: 0 };
        gradient.setLinearGradient(180, [stop, { color: stop.color, offset: 1 }]);
        assert.equals(uploads[uploads.length - 1][3], 200, '原本像素 alpha');
        gradient.setTintColor(new Color(255, 255, 255, 128));
        assert.equals(uploads[uploads.length - 1][3], 100, '200 × 128 ÷ 255 約 100');
        assert.equals(sprite.color.a, 255, '不傳給子節點');
        const count = uploads.length;
        gradient.setTintColor(new Color(100, 110, 120, 128));
        assert.equals(uploads.length, count, '透明度不變不重繪');
        assert.equals(sprite.color.g, 110, 'RGB 仍即時更新');
    });

    return suite;
}
