import { TestSuite, assert } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { battleIntelligenceOf, buildBattleConfig } from '../assets/scripts/core/systems/BattleRoster';
import { ageGeneralsOneSeason } from '../assets/scripts/core/systems/GeneralAging';
import {
    CIVIL_FLOOR,
    MARTIAL_FLOOR,
    PEAK_CURVES,
    crossedPeakEnd,
    peakCurveLabel,
    peakCurveName,
    peakCurveOf,
    peakStatMultiplier,
} from '../assets/scripts/core/systems/PeakCurve';

const prowess = { str: 800, int: 800, lea: 800, pol: 800, cha: 800, luk: 800 };
const lateGeneral = (age: number) => ({ id: 'kid', age, prowess, fate: { lateBloomer: true } });

export function createPeakCurveSuite(): TestSuite {
    const suite = new TestSuite('PeakCurve');

    suite.test('曲線：依 id 決定且穩定，三種都會出現，大器晚成固定晚成', () => {
        assert.equals(peakCurveOf({ id: 'abc' }), peakCurveOf({ id: 'abc' }));
        const seen = ['a', 'b', 'c'].map((id) => peakCurveOf({ id })).sort().join(',');
        assert.equals('early,late,mid', seen);
        assert.equals('late', peakCurveOf(lateGeneral(30)));
    });

    suite.test('巔峰窗照規格', () => {
        assert.equals('19-27', `${PEAK_CURVES.early.from}-${PEAK_CURVES.early.to}`);
        assert.equals('24-35', `${PEAK_CURVES.mid.from}-${PEAK_CURVES.mid.to}`);
        assert.equals('29-42', `${PEAK_CURVES.late.from}-${PEAK_CURVES.late.to}`);
    });

    suite.test('巔峰前與巔峰窗內都是 100%', () => {
        assert.equals(1, peakStatMultiplier(lateGeneral(20), 'str'));
        assert.equals(1, peakStatMultiplier(lateGeneral(42), 'str'));
        assert.equals(1, peakStatMultiplier(lateGeneral(42), 'int'));
    });

    suite.test('過峰：武力依斜率下滑，智政魅只微降，統率運氣不動', () => {
        assert.isTrue(Math.abs(peakStatMultiplier(lateGeneral(52), 'str') - 0.85) < 1e-9);
        assert.isTrue(Math.abs(peakStatMultiplier(lateGeneral(44), 'pol') - 0.99) < 1e-9);
        assert.equals(1, peakStatMultiplier(lateGeneral(60), 'lea'));
        assert.equals(1, peakStatMultiplier(lateGeneral(60), 'luk'));
    });

    suite.test('倍率有下限', () => {
        assert.equals(MARTIAL_FLOOR, peakStatMultiplier(lateGeneral(90), 'str'));
        assert.equals(CIVIL_FLOOR, peakStatMultiplier(lateGeneral(90), 'cha'));
    });

    suite.test('卡面武將（沒有實力層）與沒有年齡的不受影響', () => {
        assert.equals(1, peakStatMultiplier({ id: 'lu-bu', age: 60 }, 'str'));
        assert.equals(1, peakStatMultiplier({ id: 'kid', prowess }, 'str'));
        assert.equals(null, peakCurveLabel({ id: 'lu-bu', age: 60 }));
    });

    suite.test('顯示文字', () => {
        assert.equals('晚成 29–42', peakCurveLabel(lateGeneral(30)) ?? '');
        assert.equals('晚成', peakCurveName(lateGeneral(30)) ?? '');
        assert.equals(null, peakCurveName({ id: 'lu-bu', age: 60 }));
    });

    suite.test('戰場屬性：過峰的培育武將武力變低，智力幾乎不變', () => {
        const base = { id: 'kid', name: '甲', faction: 'shu', hp: 100, prowess, fate: { lateBloomer: true } };
        const young = buildBattleConfig({ ...base, age: 30 } as unknown as GeneralConfig, 'shu' as GeneralConfig['faction']);
        const old = buildBattleConfig({ ...base, age: 52 } as unknown as GeneralConfig, 'shu' as GeneralConfig['faction']);
        assert.equals(Math.round((young.str ?? 0) * 0.85), old.str);
        assert.isTrue((old.int ?? 0) >= Math.round((young.int ?? 0) * CIVIL_FLOOR));
        assert.equals(young.lea, old.lea);
    });

    suite.test('戰法槽位用的戰場智力不吃曲線', () => {
        const old = { id: 'kid', name: '甲', hp: 100, age: 90, prowess, fate: { lateBloomer: true } } as unknown as GeneralConfig;
        assert.equals(buildBattleConfig({ ...old, age: 30 } as unknown as GeneralConfig, 'shu' as GeneralConfig['faction']).int ?? 0, battleIntelligenceOf(old));
    });

    suite.test('跨過巔峰窗只發一次過峰事件；卡面武將不發', () => {
        assert.isTrue(crossedPeakEnd(lateGeneral(42), 42, 42.25));
        assert.isFalse(crossedPeakEnd(lateGeneral(42), 42.25, 42.5));
        const kid = { ...lateGeneral(42), name: '甲', maxLifespan: 90 } as unknown as GeneralConfig;
        const card = { id: 'card', name: '乙', age: 42, maxLifespan: 90 } as unknown as GeneralConfig;
        const first = ageGeneralsOneSeason([kid, card], () => 0.9);
        assert.equals('kid', first.events.filter((e) => e.type === 'passed-peak').map((e) => e.generalId).join(','));
        const second = ageGeneralsOneSeason(first.roster, () => 0.9);
        assert.lengthEquals(0, second.events.filter((e) => e.type === 'passed-peak'));
    });

    return suite;
}
