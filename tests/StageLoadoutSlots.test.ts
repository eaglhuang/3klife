/**
 * StageLoadoutSlots.test.ts — 關卡推薦槽數與出征槽位缺口 headless 測試（LVL-05 / PROG-2-1312）
 *
 * 鎖住：明寫的推薦槽數優先；沒寫時以強制攜帶戰法數為準；結果夾在 1~4；
 * 缺口只算推薦槽數高於武將槽位的部分。
 *
 * Unity 對照：Inspector 的 Required Slots 與角色 Slot Count 相減，負數夾成 0。
 */
import { assert, TestSuite } from './TestRunner';
import { loadoutSlotGapOf, recommendedSlotCountOf } from '../assets/scripts/core/systems/StageLoadoutSlots';

export function createStageLoadoutSlotsSuite(): TestSuite {
    const suite = new TestSuite('StageLoadoutSlots (關卡推薦槽數 LVL-05 / PROG-2-1312)');

    suite.test('推薦槽數：明寫優先，沒寫以強制攜帶戰法數為準，夾在 1~4', () => {
        assert.equals(3, recommendedSlotCountOf(3, ['a']));
        assert.equals(2, recommendedSlotCountOf(undefined, ['a', 'b']));
        assert.equals(1, recommendedSlotCountOf(undefined, []));
        assert.equals(4, recommendedSlotCountOf(9, []));
        assert.equals(1, recommendedSlotCountOf(0, []));
    });

    suite.test('槽位缺口：智力 45（2 槽）對推薦 3 槽缺 1；智力 95（4 槽）對推薦 3 槽無缺口', () => {
        const short = loadoutSlotGapOf(45, 3);
        assert.equals(2, short.capacity);
        assert.equals(1, short.gap);
        const enough = loadoutSlotGapOf(95, 3);
        assert.equals(4, enough.capacity);
        assert.equals(0, enough.gap);
    });

    return suite;
}
