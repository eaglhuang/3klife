/**
 * TallyCardPassiveText.test.ts — 虎符卡面說明與實際被動數值一致（戰法系統 doc_spec_0038 G-1，PROG-2-1885）
 *
 * Unity 對照：EditMode 測試 ScriptableObject 的說明文字與數值欄位同步。
 */
import { buildTallyCardCatalog } from '../assets/scripts/core/config/TallyCardCatalog';
import { TALLY_PASSIVE_BY_TEMPLATE } from '../assets/scripts/battle/shared/TallyPassive';
import { TestSuite, assert } from './TestRunner';

export function createTallyCardPassiveTextSuite(): TestSuite {
    const suite = new TestSuite('TallyCardPassiveText (虎符卡面與被動一致 PROG-2-1885)');

    suite.test('白馬騎射合一：卡面寫的移動加成與射程等於被動實際數值', () => {
        const spec = TALLY_PASSIVE_BY_TEMPLATE['tiger-tally-bai-ma'];
        const details = [...buildTallyCardCatalog().values()]
            .flatMap(c => c.abilityDetails ?? [])
            .filter(d => d.name === '騎射合一')
            .map(d => d.detail ?? '');
        assert.equals(true, details.length > 0);
        for (const detail of details) {
            assert.equals(true, detail.includes(`移動 +${spec.moveRangeBonus}`));
            assert.equals(true, detail.includes(`${spec.attackRangeFloor} 格`));
            assert.equals(false, detail.includes('移動不變'));
        }
    });

    return suite;
}
