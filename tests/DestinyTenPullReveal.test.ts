// @spec-source → Issue #2107／#2115；PROG-2-9019 新手十連：全螢幕展示後收起武將、免費重轉可按
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf-8');

export function createDestinyTenPullRevealSuite(): TestSuite {
    const suite = new TestSuite('DestinyTenPullReveal');
    const flow = read('assets/scripts/ui/core/GachaFlowCoordinator.ts');

    suite.test('宿命池要求展示後收起武將，一般轉蛋仍移到面板左側', () => {
        assert.isTrue(flow.includes('hideHeroAfterReveal: true'));
        assert.isTrue(flow.includes('if (hideAfterReveal) { showcase.active = false; centerPanel(); }'));
        assert.isTrue(flow.includes('else place(sideCenter);'));
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
