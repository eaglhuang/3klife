import { TestSuite, assert } from './TestRunner';
import { DS3_BLOODLINE_LEFT_REGION_WIDTH, ds3BloodlineTreeCenterX } from '../assets/scripts/ui/components/character-ds3/Ds3BloodlineTreeGeometry';
import { coverSize } from '../assets/scripts/ui/core/ScreenBackdrop';

/** 左區設計寬（62% × 1920）：樹不可超過這個範圍，否則會蓋到右欄 ContentSlot（x 1200 起） */
const LEFT_REGION_WIDTH = DS3_BLOODLINE_LEFT_REGION_WIDTH;

/** 把樹根中心 x 換算成樹左緣（host 原點在中心） */
function treeLeftEdge(hostWidth: number): number {
    return ds3BloodlineTreeCenterX(hostWidth) - LEFT_REGION_WIDTH / 2;
}

export function createCharacterDs3BloodlineTreeBoundsSuite(): TestSuite {
    const suite = new TestSuite('CharacterDs3BloodlineTreeBounds');

    suite.test('16:9 設計寬：樹貼齊左緣 0～1190，與舊版位置一致', () => {
        assert.equals(-365, ds3BloodlineTreeCenterX(1920));
        assert.equals(-960, treeLeftEdge(1920));
    });

    suite.test('寬視窗（host 2009 寬）：樹仍貼齊左緣，不隨主體中心右移', () => {
        // 舊版固定 -365 在 2009 寬下左緣會落在 -960+44 處，右緣壓進 ContentSlot
        const right = ds3BloodlineTreeCenterX(2009) + LEFT_REGION_WIDTH / 2;
        assert.equals(-1004.5, treeLeftEdge(2009));
        assert.equals(-1004.5 + LEFT_REGION_WIDTH, right);
    });

    suite.test('任意主體寬度：樹左緣恆為主體左緣', () => {
        for (const w of [1920, 2009, 2400, 2832]) {
            assert.equals(-w / 2, treeLeftEdge(w));
        }
    });

    suite.test('底圖 cover：主體比設計寬時，底圖仍蓋滿主體（不留兩側）', () => {
        const fit = coverSize(1024, 768, 2009, 1080);
        assert.isTrue(fit.width >= 2009, `width ${fit.width} < 2009`);
        assert.isTrue(fit.height >= 1080, `height ${fit.height} < 1080`);
    });

    return suite;
}
