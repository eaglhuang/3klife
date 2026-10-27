/**
 * OpeningAct1Cues.test.ts — 第一幕分鏡演出提示（OPEN-03，PROG-2-1254）headless 測試
 *
 * 鎖住：四個分鏡與 INTRO_PANELS 同順序一一對應、只有信件需要點擊、
 * 祖紋命篆與六色光痕疊加效果依規格指定、找不到的分鏡回傳 undefined。
 */
import { assert, TestSuite } from './TestRunner';
import {
    ACT1_CUES,
    act1CuesMatchPanels,
    getAct1Cue,
} from '../assets/scripts/ui/core/OpeningAct1Cues';

export function createOpeningAct1CuesSuite(): TestSuite {
    const suite = new TestSuite('OpeningAct1Cues (第一幕分鏡演出 OPEN-03 PROG-2-1254)');

    suite.test('四個分鏡與開場頁面順序一一對應', () => {
        assert.equals(4, ACT1_CUES.length);
        assert.isTrue(act1CuesMatchPanels());
    });

    suite.test('只有信件需要點擊，其餘分鏡播完自動進下一幕', () => {
        const clickIds = ACT1_CUES.filter((cue) => cue.requiresClick).map((cue) => cue.panelId);
        assert.equals(1, clickIds.length);
        assert.equals('letter', clickIds[0]);
        assert.equals('win95-letter', getAct1Cue('letter')!.presentation);
    });

    suite.test('祖紋命篆與六色因子光痕依規格疊加', () => {
        assert.isTrue(getAct1Cue('ancient')!.overlays.includes('ancestral-seal-script'));
        const pixel = getAct1Cue('pixel')!;
        assert.isTrue(pixel.overlays.includes('six-factor-light-trace'));
        assert.isTrue(pixel.overlays.includes('ancestral-seal-script'));
        assert.isTrue(getAct1Cue('vortex')!.overlays.includes('destiny-rift'));
    });

    suite.test('找不到的分鏡回傳 undefined', () => {
        assert.equals(undefined, getAct1Cue('no-such-panel'));
    });

    return suite;
}
