// @spec-source → Issue #2107／#2115；PROG-2-9019 新手十連：全螢幕展示後收起武將、免費重轉可按
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { fullScreenPanelScale } from '../assets/scripts/ui/core/GachaFullScreenPanel';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf-8');

export function createDestinyTenPullRevealSuite(): TestSuite {
    const suite = new TestSuite('DestinyTenPullReveal');
    const flow = read('assets/scripts/ui/core/GachaFlowCoordinator.ts');

    suite.test('宿命池要求展示後收起武將，一般轉蛋仍移到面板左側', () => {
        assert.isTrue(flow.includes("hideHeroAfterReveal: p.heroReveal === 'hide'"));
        assert.isTrue(flow.includes('if (hideAfterReveal) { showcase.active = false; centerPanel(); }'));
        assert.isTrue(flow.includes('else place(sideCenter);'));
    });

    suite.test('宿命十連收起武將後面板等比放大成滿版（只放大不縮小）', () => {
        const s = fullScreenPanelScale({ width: 1280, height: 720 }, { width: 430, height: 400 });
        assert.isTrue(Math.abs(s - 720 * 0.94 / 400) < 1e-6);
        assert.equals(1, fullScreenPanelScale({ width: 400, height: 300 }, { width: 430, height: 400 }));
        assert.equals(1, fullScreenPanelScale(null, { width: 430, height: 400 }));
        assert.isTrue(flow.includes('panel.setScale(scale, scale, 1)'));
    });

    suite.test('重轉後重新展示武將', () => {
        assert.isTrue(flow.includes('showcase.active = true;'));
    });

    suite.test('可按的免費重轉改亮金字', () => {
        assert.isTrue(flow.includes('this._styleRepullButton(binder, repull !== null);'));
        assert.isTrue(flow.includes('label.color = REPULL_ENABLED_COLOR'));
    });

    return suite;
}
