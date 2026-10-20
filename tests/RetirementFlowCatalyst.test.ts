/**
 * RetirementFlowCatalyst.test.ts — 退役畫面的因子媒介選擇（PROG-2-0866）
 *
 * Unity 對照：像 EditMode 測試，假的 roster 與假的 retireGeneral 當成 mock，
 * 驗控制器的選擇狀態與傳給 Command 的參數，不碰 cc 畫面。
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { RetirementFlowController } from '../assets/scripts/ui/core/RetirementFlowController';
import { GENERAL_STATUS_DEAD } from '../assets/scripts/core/systems/GeneralAging';
import { GENERAL_STATUS_UNVEILED } from '../assets/scripts/core/systems/Unveiling';

function gen(id: string, age: number, extra: Partial<GeneralConfig> = {}): GeneralConfig {
    return { id, name: id, age, ...extra } as GeneralConfig;
}

function flowWith(roster: GeneralConfig[]) {
    const calls: Array<{ id: string; options?: { catalystChildId?: string } }> = [];
    const flow = new RetirementFlowController({
        roster: () => roster,
        retireGeneral: async (id, options) => {
            calls.push(options === undefined ? { id } : { id, options });
        },
    });
    return { flow, calls };
}

export function createRetirementFlowCatalystSuite(): TestSuite {
    const suite = new TestSuite('RetirementFlowCatalyst (退役媒介選擇)');

    suite.test('媒介候選：0~5 歲、未開獎、未死亡，且不含退役目標本人', () => {
        const roster = [
            gen('elder', 70),
            gen('baby', 0),
            gen('child', 5),
            gen('teen', 6),
            gen('unveiled', 3, { status: GENERAL_STATUS_UNVEILED }),
            gen('dead', 2, { status: GENERAL_STATUS_DEAD }),
        ];
        const { flow } = flowWith(roster);
        assert.equals('baby,child', flow.catalystChildren().map(g => g.id).join(','));
    });

    suite.test('媒介循環：無 → 子嗣1 → 子嗣2 → 無', () => {
        const { flow } = flowWith([gen('elder', 70), gen('a', 1), gen('b', 2)]);
        assert.equals(null, flow.catalystChild);
        flow.selectNextCatalystChild();
        assert.equals('a', flow.catalystChild?.id ?? '');
        flow.selectNextCatalystChild();
        assert.equals('b', flow.catalystChild?.id ?? '');
        flow.selectNextCatalystChild();
        assert.equals(null, flow.catalystChild);
    });

    suite.test('沒有可用子嗣時選媒介維持無', () => {
        const { flow } = flowWith([gen('elder', 70)]);
        flow.selectNextCatalystChild();
        assert.equals(null, flow.catalystChild);
    });

    suite.test('選了媒介後退役：把 catalystChildId 傳給 retireGeneral', async () => {
        const { flow, calls } = flowWith([gen('elder', 70), gen('baby', 0)]);
        flow.selectNextCatalystChild();
        await flow.retire();
        const outcome = await flow.retire();
        assert.equals('retired', outcome);
        assert.equals(1, calls.length);
        assert.equals('elder', calls[0].id);
        assert.equals('baby', calls[0].options?.catalystChildId ?? '');
    });

    suite.test('沒選媒介退役：不傳 options 參數', async () => {
        const { flow, calls } = flowWith([gen('elder', 70), gen('baby', 0)]);
        await flow.retire();
        await flow.retire();
        assert.equals(1, calls.length);
        assert.isFalse('options' in calls[0]);
    });

    suite.test('換退役目標時媒介清空', () => {
        const { flow } = flowWith([gen('elder1', 70), gen('elder2', 71), gen('baby', 0)]);
        flow.selectNextCatalystChild();
        assert.equals('baby', flow.catalystChild?.id ?? '');
        flow.selectNext();
        assert.equals(null, flow.catalystChild);
    });

    suite.test('媒介子嗣已不在名冊時不傳入，退役仍用無媒介路徑', async () => {
        const roster = [gen('elder', 70), gen('baby', 0)];
        const { flow, calls } = flowWith(roster);
        flow.selectNextCatalystChild();
        roster.splice(1, 1);
        assert.equals(null, flow.catalystChild);
        await flow.retire();
        await flow.retire();
        assert.isFalse('options' in calls[0]);
    });

    suite.test('忙碌中不能切換媒介', async () => {
        let release: () => void = () => {};
        const roster = [gen('elder', 70), gen('baby', 0)];
        const flow = new RetirementFlowController({
            roster: () => roster,
            retireGeneral: () => new Promise<void>(resolve => { release = resolve; }),
        });
        await flow.retire();
        flow.selectNextCatalystChild();
        const running = flow.retire();
        flow.selectNextCatalystChild();
        assert.equals('baby', flow.catalystChild?.id ?? '');
        release();
        await running;
    });

    return suite;
}
