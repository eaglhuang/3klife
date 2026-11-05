/**
 * FemaleSourceLines.test.ts — 轉蛋女將與女俘虜文案（PROG-2-1786）
 */
import { assert, TestSuite } from './TestRunner';
import { captiveFemaleLine, gachaFemaleLines } from '../assets/scripts/core/systems/FemaleSourcePresenter';
import { PrisonerPopupController, type PrisonerPopupDeps } from '../assets/scripts/ui/core/PrisonerPopupController';
import { createPowRecord } from '../assets/scripts/core/systems/PrisonerOfWar';

function popup(gender: string) {
    const target = { id: 'qa', name: '貂蟬', gender };
    const record = createPowRecord(target, { cha: 50, luk: 50 })!;
    const deps = {
        session: {
            prison: { pending: [{ record, target }], prisoners: [], fame: 0 },
            military: { cityTroops: 0 },
            resolvePrisoner: async () => null,
        },
        wallet: { gold: () => 0, spendGold: () => false },
    } as unknown as PrisonerPopupDeps;
    return new PrisonerPopupController(deps);
}

export function createFemaleSourceLinesSuite(): TestSuite {
    const suite = new TestSuite('FemaleSourceLines');

    suite.test('轉蛋：只說女將，一批最多三句', () => {
        const female = (name: string) => ({ name, gender: '女' });
        assert.equals('貂蟬 應召而來——傾國之姿，誰人不動心？', gachaFemaleLines([{ name: '關羽', gender: '男' }, female('貂蟬')]).join('|'));
        assert.equals(3, gachaFemaleLines([female('a'), female('b'), female('c'), female('d')]).length);
        assert.equals(0, gachaFemaleLines([{ name: '無性別' }]).length);
    });

    suite.test('俘虜畫面：女俘虜有台詞，男俘虜沒有', () => {
        assert.equals(captiveFemaleLine({ name: '貂蟬', gender: '女' }), popup('女').getView().texts.powNotice);
        assert.equals('貂蟬 冷眼相視：『你想用我的血脈延續你的野心？』', popup('女').getView().texts.powNotice);
        assert.equals('', popup('男').getView().texts.powNotice);
    });

    return suite;
}
