/**
 * GradientBackgroundCache — 漸層底板貼圖共用快取與不重畫（PROG-2-9800）
 * 量測：舊版每次 _redraw 逐像素 JS 算圖（每像素配置物件）且貼圖不釋放，開畫面時主執行緒卡 2~4 秒。
 */
import { Color, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { GradientBackground } from '../assets/scripts/ui/components/GradientBackground';
import { TestSuite, assert } from './TestRunner';

function prepare(): { uploads: Uint8Array[] } {
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

function make(width: number, height: number): { gradient: GradientBackground; sprite: Sprite } {
    const sprite = new Sprite();
    sprite.color = new Color(255, 255, 255, 255);
    const transform = { width, height };
    const gradient = new GradientBackground();
    (gradient as any).node = { on: () => undefined, off: () => undefined };
    (gradient as any).getComponent = (type: unknown) => (type === Sprite ? sprite : type === UITransform ? transform : null);
    return { gradient, sprite };
}

const RED = new Color(255, 0, 0, 255);
const BLUE = new Color(0, 0, 255, 255);

export function createGradientBackgroundCacheSuite(): TestSuite {
    const suite = new TestSuite('GradientBackgroundCache (漸層底板快取 PROG-2-9800)');

    suite.test('同參數同尺寸的兩個節點共用同一個 SpriteFrame，只算一次圖', () => {
        const { uploads } = prepare();
        const a = make(300, 120);
        const b = make(300, 120);
        const stops = [{ color: RED, offset: 0 }, { color: BLUE, offset: 1 }];
        a.gradient.setLinearGradient(90, stops, { cornerRadius: 8 });
        const count = uploads.length;
        b.gradient.setLinearGradient(90, stops, { cornerRadius: 8 });
        assert.equals(uploads.length, count, '第二個節點命中快取不再上傳貼圖');
        assert.equals(a.sprite.spriteFrame, b.sprite.spriteFrame, '共用 SpriteFrame');
    });

    suite.test('參數沒變的重複重畫（onLoad／onEnable 連續觸發）不重新算圖', () => {
        const { uploads } = prepare();
        const { gradient, sprite } = make(210, 90);
        gradient.setLinearGradient(180, [{ color: RED, offset: 0 }, { color: BLUE, offset: 1 }]);
        const count = uploads.length;
        const frame = sprite.spriteFrame;
        gradient.onEnable();
        gradient.onEnable();
        assert.equals(uploads.length, count, '沒有新上傳');
        assert.equals(sprite.spriteFrame, frame, '同一張圖');
    });

    suite.test('參數或尺寸改變會換圖；舊圖沒人用也不會被誤銷毀', () => {
        prepare();
        const { gradient, sprite } = make(160, 160);
        gradient.setLinearGradient(180, [{ color: RED, offset: 0 }, { color: BLUE, offset: 1 }]);
        const first = sprite.spriteFrame;
        gradient.setLinearGradient(90, [{ color: RED, offset: 0 }, { color: BLUE, offset: 1 }]);
        assert.notEquals(sprite.spriteFrame, first, '角度不同換圖');
        gradient.setLinearGradient(180, [{ color: RED, offset: 0 }, { color: BLUE, offset: 1 }]);
        assert.equals(sprite.spriteFrame, first, '改回原參數取回快取的同一張');
    });

    suite.test('像素結果：線性 90 度漸層左紅右藍，圓角外側透明、內側不透明', () => {
        const { uploads } = prepare();
        const { gradient } = make(100, 100);
        gradient.setLinearGradient(90, [{ color: RED, offset: 0 }, { color: BLUE, offset: 1 }], { cornerRadius: 30 });
        const data = uploads[uploads.length - 1];
        const side = Math.sqrt(data.length / 4);
        const at = (x: number, y: number) => {
            const i = (y * side + x) * 4;
            return [data[i], data[i + 1], data[i + 2], data[i + 3]];
        };
        assert.equals(at(0, 0)[3], 0, '左上角被圓角裁掉');
        const mid = Math.floor(side / 2);
        const left = at(Math.floor(side * 0.1), mid);
        const right = at(Math.floor(side * 0.9), mid);
        assert.equals(left[3], 255, '內側不透明');
        assert.isTrue(left[0] > left[2], '左側偏紅');
        assert.isTrue(right[2] > right[0], '右側偏藍');
    });

    suite.test('邊框：外緣像素取邊框色', () => {
        const { uploads } = prepare();
        const { gradient } = make(80, 80);
        const GREEN = new Color(0, 255, 0, 255);
        gradient.setLinearGradient(180, [{ color: RED, offset: 0 }, { color: RED, offset: 1 }], { borderWidth: 4, borderColor: GREEN });
        const data = uploads[uploads.length - 1];
        const side = Math.sqrt(data.length / 4);
        const edge = (side * Math.floor(side / 2)) * 4;
        assert.equals(data[edge + 1], 255, '左緣取邊框綠');
        assert.equals(data[edge], 0, '左緣沒有紅');
        const center = (Math.floor(side / 2) * side + Math.floor(side / 2)) * 4;
        assert.equals(data[center], 255, '中心取填色紅');
    });

    suite.test('onDestroy 放掉使用數，之後仍可再建立同參數節點', () => {
        prepare();
        const first = make(120, 60);
        first.gradient.setLinearGradient(180, [{ color: BLUE, offset: 0 }, { color: RED, offset: 1 }]);
        first.gradient.onDestroy();
        const second = make(120, 60);
        second.gradient.setLinearGradient(180, [{ color: BLUE, offset: 0 }, { color: RED, offset: 1 }]);
        assert.isTrue(second.sprite.spriteFrame instanceof SpriteFrame, '有圖');
    });

    return suite;
}
