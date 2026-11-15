/**
 * gacha-portrait-baseline.test.ts — 轉蛋立繪統一腳底基準線與身高比例換算（PROG-2-9037）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    BaselineFrame,
    PortraitBounds,
    placePortraitOnBaseline,
    standardBodyHeight,
    verifyBaselineFits,
} from '../assets/scripts/ui/core/GachaPortraitBaseline';

const DATA_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'general-portrait-bounds.json');
const EPS = 1e-6;

/** 示意框：腳底基準 −500，頭頂上限 +500（標準身高 1000 px） */
const FRAME: BaselineFrame = { baselineY: -500, headLimitY: 500, centerX: 120 };

/** 節點中心 (x,y) 換回原圖的腳底、頭頂、中線（y 向上，與節點座標一致） */
function worldOf(b: PortraitBounds, p: { x: number; y: number; scale: number }) {
    const bottomEdge = p.y - (b.h * p.scale) / 2;
    return {
        feetY: bottomEdge + (b.h - b.bottom) * p.scale,
        headY: bottomEdge + (b.h - b.top) * p.scale,
        centerX: p.x - (b.w * p.scale) / 2 + b.cx * p.scale,
    };
}

export function createGachaPortraitBaselineSuite(): TestSuite {
    const suite = new TestSuite('GachaPortraitBaseline');

    suite.test('腳底貼在統一基準線，頭頂落在身高位置', () => {
        const b: PortraitBounds = { w: 1024, h: 1536, top: 179, bottom: 1439, cx: 526.5 };
        const p = placePortraitOnBaseline(b, FRAME);
        const at = worldOf(b, p);
        assert.isTrue(Math.abs(at.feetY - FRAME.baselineY) < EPS, `腳底應在基準線，實際 ${at.feetY}`);
        assert.isTrue(Math.abs(at.headY - (FRAME.baselineY + standardBodyHeight(FRAME))) < EPS, '頭頂應在標準身高');
    });

    suite.test('人物不透明中心對齊框中線', () => {
        const b: PortraitBounds = { w: 512, h: 768, top: 42, bottom: 724, cx: 257 };
        const p = placePortraitOnBaseline(b, FRAME);
        assert.isTrue(Math.abs(worldOf(b, p).centerX - FRAME.centerX) < EPS, '水平中線');
    });

    suite.test('同身高比例：不論畫布大小與透明邊距，人物高度相同', () => {
        // 關羽式（畫布大、上方留白多）與小喬式（人物幾乎滿版）兩種畫布，縮放後身高應一致
        const guan: PortraitBounds = { w: 1024, h: 1536, top: 179, bottom: 1439, cx: 526.5 };
        const xiao: PortraitBounds = { w: 1024, h: 1536, top: 0, bottom: 1516, cx: 606 };
        const small: PortraitBounds = { w: 512, h: 768, top: 42, bottom: 724, cx: 257 };
        const hs = [guan, xiao, small].map((b) => {
            const p = placePortraitOnBaseline(b, FRAME);
            const at = worldOf(b, p);
            return at.headY - at.feetY;
        });
        for (const h of hs) assert.isTrue(Math.abs(h - standardBodyHeight(FRAME)) < EPS, `身高 ${h}`);
    });

    suite.test('身高比例放大時，同一條腳底基準仍成立，頭頂按比例升高', () => {
        const b: PortraitBounds = { w: 800, h: 1600, top: 100, bottom: 1500, cx: 400, heightRatio: 0.8 };
        const p = placePortraitOnBaseline(b, FRAME);
        const at = worldOf(b, p);
        assert.isTrue(Math.abs(at.feetY - FRAME.baselineY) < EPS, '腳底仍在基準');
        assert.isTrue(Math.abs(at.headY - (FRAME.baselineY + 800)) < EPS, '身高 = 標準 × 0.8');
    });

    suite.test('驗算：最高者頭頂不超過上限；比他矮的必定也在內', () => {
        const portraits: Record<string, PortraitBounds> = {
            tall: { w: 100, h: 200, top: 0, bottom: 200, cx: 50, heightRatio: 1 },
            short: { w: 100, h: 200, top: 0, bottom: 200, cx: 50, heightRatio: 0.7 },
        };
        const report = verifyBaselineFits(portraits, FRAME);
        assert.equals('tall', report.tallestId);
        assert.isTrue(report.ok, '最高者剛好落在上限內');
        assert.isTrue(Math.abs(report.tallestHeadY - FRAME.headLimitY) < EPS, '最高者頭頂等於上限');
    });

    suite.test('驗算：最高者超過上限時回報不通過', () => {
        const portraits: Record<string, PortraitBounds> = {
            giant: { w: 100, h: 200, top: 0, bottom: 200, cx: 50, heightRatio: 1.05 },
        };
        const report = verifyBaselineFits(portraits, FRAME);
        assert.isFalse(report.ok, '1.05 倍身高應超出畫面');
        assert.equals('giant', report.tallestId);
    });

    suite.test('資料驗算：全部立繪（data/general-portrait-bounds.json）在示意框內，腳底一致', () => {
        const doc = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as { portraits: Record<string, PortraitBounds> };
        const entries = Object.entries(doc.portraits);
        assert.isTrue(entries.length > 200, `立繪筆數 ${entries.length}`);
        const report = verifyBaselineFits(doc.portraits, FRAME);
        assert.isTrue(report.ok, `最高者 ${report.tallestId} 頭頂 ${report.tallestHeadY} 超過上限 ${report.headLimitY}`);
        for (const [id, b] of entries) {
            const p = placePortraitOnBaseline(b, FRAME);
            const at = worldOf(b, p);
            assert.isTrue(Math.abs(at.feetY - FRAME.baselineY) < EPS, `${id} 腳底未對齊`);
        }
    });

    suite.test('量測資料欄位完整且合理（頭頂 < 腳底、在畫布內）', () => {
        const doc = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as { portraits: Record<string, PortraitBounds> };
        for (const [id, b] of Object.entries(doc.portraits)) {
            assert.isTrue(b.top >= 0 && b.bottom <= b.h && b.bottom > b.top, `${id} 邊界超出畫布`);
            assert.isTrue(b.cx >= 0 && b.cx <= b.w, `${id} 中心超出畫布`);
        }
    });

    return suite;
}
