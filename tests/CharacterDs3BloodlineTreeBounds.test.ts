import { TestSuite, assert } from './TestRunner';
import { DS3_RIGHT_COLUMN_WIDTH, ds3BloodlineRegion } from '../assets/scripts/ui/components/character-ds3/Ds3BloodlineTreeGeometry';
import { coverSize } from '../assets/scripts/ui/core/ScreenBackdrop';

/** 左區四邊（host 原點在中心） */
function edges(hostWidth: number, hostHeight: number): { left: number; right: number; top: number; bottom: number } {
    const r = ds3BloodlineRegion(hostWidth, hostHeight);
    return { left: r.x - r.width / 2, right: r.x + r.width / 2, top: r.height / 2, bottom: -r.height / 2 };
}

export function createCharacterDs3BloodlineTreeBoundsSuite(): TestSuite {
    const suite = new TestSuite('CharacterDs3BloodlineTreeBounds');

    suite.test('16:9 設計尺寸：左區 0～1200 寬、1080 高，右緣正好貼右欄', () => {
        const r = ds3BloodlineRegion(1920, 1080);
        assert.equals(1200, r.width);
        assert.equals(1080, r.height);
        assert.equals(-360, r.x);
        assert.equals(960 - DS3_RIGHT_COLUMN_WIDTH, edges(1920, 1080).right);
    });

    suite.test('寬視窗：左區跟著變寬，左貼主體左緣、右貼右欄，中間不留縫', () => {
        for (const w of [2009, 2400, 2832]) {
            const e = edges(w, 1080);
            assert.equals(-w / 2, e.left);
            assert.equals(w / 2 - DS3_RIGHT_COLUMN_WIDTH, e.right);
        }
    });

    suite.test('高視窗（比 16:9 高）：左區上下撐滿主體，不露出底下人物圖', () => {
        const e = edges(1920, 1514);
        assert.equals(757, e.top);
        assert.equals(-757, e.bottom);
    });

    suite.test('底圖 cover：主體比設計寬時，底圖仍蓋滿主體（不留兩側）', () => {
        const fit = coverSize(1024, 768, 2009, 1080);
        assert.isTrue(fit.width >= 2009, `width ${fit.width} < 2009`);
        assert.isTrue(fit.height >= 1080, `height ${fit.height} < 1080`);
    });

    return suite;
}
