import { TestSuite } from './TestRunner';
import { BondingAndEpithetViewModel } from '../assets/scripts/ui/viewmodels/BondingAndEpithetViewModel';

export function createBondingAndEpithetViewModelSuite(): TestSuite {
    const suite = new TestSuite('BondingAndEpithetViewModel');

    suite.test('結緣公式分項 UI 正確輸出五項明細、皮膚 token 與相對比例錨點', () => {
        const vm = BondingAndEpithetViewModel.buildBondingBreakdownVM({
            base: 25,
            compatibility: 9,
            favor: -6,
            sincerity: 12,
            matchmaker: 0,
            rawTotal: 40,
            finalRate: 40,
        });
        if (vm.totalRateText !== '40%' || vm.rows.length !== 5) {
            throw new Error(`分項數目或總率錯誤: ${JSON.stringify(vm)}`);
        }
        if (vm.skinToken !== 'settlement_parchment_gold' || vm.layoutRegion.anchorMin[0] !== 0.15) {
            throw new Error('未保留皮膚 token 或相對比例錨點');
        }
    });

    suite.test('小名 8/12/15 歲三段揭曉 ViewModel 正確輸出階段鍵與加成狀態', () => {
        const vm = BondingAndEpithetViewModel.buildEpithetRevealVM({
            age: 15,
            stage: 'revealed_15',
            displayText: '15歲揭曉：正式覺醒天賦小名「舉鼎小力士」（STR +2，只算一次）。',
            isBonusActive: true,
        });
        if (vm.stageKey !== 'ui.bloodline.stage.revealed_15' || !vm.isBonusActive) {
            throw new Error('15 歲揭曉狀態異常');
        }
    });

    return suite;
}
