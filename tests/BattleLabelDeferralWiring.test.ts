/**
 * BattleLabelDeferralWiring.test.ts — 戰場頭頂徽章文字套用 LabelLayoutDeferral（PROG-2-9718）
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { Label } from 'cc';
import { setCacheModeDeferred } from '../assets/scripts/ui/core/LabelLayoutDeferral';

function read(rel: string): string {
    return fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
}

// 測試替身的 Label 沒有 CacheMode 列舉：用引擎的數值（NONE=0、BITMAP=1）
const CACHE_NONE = 0;
const CACHE_BITMAP = 1;

interface FakeInner {
    updateRenderData(force?: boolean): void;
    _flushAssembler(): void;
    _applyFontTexture(): void;
    _markForUpdateRenderData(enable?: boolean): void;
    renderData: { vertDirty: boolean } | null;
}

export function createBattleLabelDeferralWiringSuite(): TestSuite {
    const suite = new TestSuite('BattleLabelDeferralWiring (戰場徽章文字重排延後 PROG-2-9718)');
    // 測試替身的 Label 沒有排版方法：沒人補時補一個空的（不覆蓋 LabelLayoutDeferral 套件已補的，避免弄掉它的攔截）
    const proto = Label.prototype as unknown as FakeInner;
    if (typeof proto.updateRenderData !== 'function') proto.updateRenderData = () => undefined;
    const unitRenderer = read('assets/scripts/battle/views/UnitRenderer.ts');

    suite.test('徽章四個文字的快取模式一律走 setCacheModeDeferred，不再直接賦值', () => {
        assert.equals(true, /import \{ setCacheModeDeferred \} from "\.\.\/\.\.\/ui\/core\/LabelLayoutDeferral"/.test(unitRenderer));
        assert.equals(true, unitRenderer.includes('setCacheModeDeferred(l, Label.CacheMode.BITMAP)'));
        assert.equals(true, unitRenderer.includes('setCacheModeDeferred(nameStrLabel, Label.CacheMode.BITMAP)'));
        assert.equals(false, /\.cacheMode\s*=\s*Label\.CacheMode\.BITMAP/.test(unitRenderer));
    });

    suite.test('名稱標籤先縮字固定外框，才切快取模式（順序反了延後不會生效）', () => {
        const shrink = unitRenderer.indexOf('this.shrinkToFit(nameStrLabel)');
        const cache = unitRenderer.indexOf('setCacheModeDeferred(nameStrLabel');
        assert.equals(true, shrink > 0 && cache > shrink);
    });

    suite.test('兵種字也先縮字固定外框，三個分段文字才能一起延後', () => {
        const shrinkType = unitRenderer.indexOf('this.shrinkToFit(typeLabel)');
        const loop = unitRenderer.indexOf('for (const l of [attackLabel, typeLabel, hpLabel]) setCacheModeDeferred');
        assert.equals(true, shrinkType > 0 && loop > shrinkType);
    });

    suite.test('會隨字長改尺寸的標籤（跳字、日誌）不套延後：維持 NONE／RESIZE_HEIGHT 與即時排版', () => {
        const floatText = read('assets/scripts/core/systems/FloatTextSystem.ts');
        assert.equals(true, floatText.includes('label.overflow = Label.Overflow.NONE'));
        assert.equals(false, floatText.includes('LabelLayoutDeferral'));
        const log = read('assets/scripts/ui/components/BattleLogComposite.ts');
        assert.equals(true, log.includes('Label.Overflow.RESIZE_HEIGHT'));
        assert.equals(false, log.includes('LabelLayoutDeferral'));
    });

    suite.test('setCacheModeDeferred：固定外框只標髒，非固定外框與同值維持原行為', () => {
        const make = (overflow: number): Label & FakeInner & { marks: string[] } => {
            const label = new Label() as unknown as Label & FakeInner & { marks: string[] };
            label.overflow = overflow;
            label.renderData = { vertDirty: false };
            label.marks = [];
            label._flushAssembler = () => undefined;
            label._applyFontTexture = () => undefined;
            label._markForUpdateRenderData = () => { label.marks.push('mark'); };
            // 測試替身的 cacheMode 設定器：模擬引擎「設定後立刻強制重排」（經由原型，才會走到延後機制的攔截）
            let mode = CACHE_NONE;
            Object.defineProperty(label, 'cacheMode', {
                configurable: true,
                get: () => mode,
                set: (v: number) => { mode = v; proto.updateRenderData.call(label, true); },
            });
            return label;
        };
        const fixed = make(Label.Overflow.SHRINK);
        setCacheModeDeferred(fixed, CACHE_BITMAP);
        assert.equals(CACHE_BITMAP, fixed.cacheMode);
        assert.equals(true, fixed.renderData?.vertDirty);
        assert.equals(1, fixed.marks.length);
        // 同值不重設
        setCacheModeDeferred(fixed, CACHE_BITMAP);
        assert.equals(1, fixed.marks.length);
        // 非固定外框：走原本的即時排版，不標髒
        const free = make(Label.Overflow.NONE);
        setCacheModeDeferred(free, CACHE_BITMAP);
        assert.equals(CACHE_BITMAP, free.cacheMode);
        assert.equals(false, free.renderData?.vertDirty);
        assert.equals(0, free.marks.length);
    });

    return suite;
}
