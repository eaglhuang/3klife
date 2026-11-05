/**
 * LegacyFactorColor.test.ts — 舊資料中文類型的因子顏色（PROG-2-1784）
 */
import { assert, TestSuite } from './TestRunner';
import { awakenFactor, rollBattleAwakening } from '../assets/scripts/core/systems/FactorAwakening';
import { FACTOR_DISCOVERY_LEVEL, normalizeFactorColor } from '../assets/scripts/core/systems/FactorInheritance';
import { requiredDiscoveryLevel } from '../assets/scripts/core/systems/FactorVisibility';

const generalWith = (type: string) => ({ id: 'g', genes: [{ id: 'gene_x', type, displayName: 'X', level: 1, isLocked: true }] }) as never;

export function createLegacyFactorColorSuite(): TestSuite {
    const suite = new TestSuite('LegacyFactorColor');

    suite.test('中文類型對應到色系；色名照舊；未知仍是 null', () => {
        assert.equals('blue', normalizeFactorColor('戰鬥'));
        assert.equals('pink', normalizeFactorColor('兵種'));
        assert.equals('green', normalizeFactorColor('戰法'));
        assert.equals('white', normalizeFactorColor('特質'));
        assert.equals('purple', normalizeFactorColor('天命'));
        assert.equals('red', normalizeFactorColor('體魄'));
        assert.equals('green', normalizeFactorColor('green'));
        assert.equals(null, normalizeFactorColor('沒這類型'));
    });

    suite.test('藍粉在一般戰鬥可以覺醒；白因子不行', () => {
        const options = { discoveryLevel: 99, specialAction: false, random: () => 0 };
        assert.isTrue(rollBattleAwakening(generalWith('戰鬥'), options)?.ok === true);
        assert.isTrue(rollBattleAwakening(generalWith('兵種'), options)?.ok === true);
        assert.equals(null, rollBattleAwakening(generalWith('特質'), options));
    });

    suite.test('覺醒受探索等級與觸發方式限制', () => {
        const low = awakenFactor(generalWith('天命'), 'gene_x', 'sage', 1);
        assert.isTrue(!low.ok && low.reason === 'level-too-low');
        const trigger = awakenFactor(generalWith('戰法'), 'gene_x', 'nurture-peek', 99);
        assert.isTrue(!trigger.ok && trigger.reason === 'trigger-not-allowed');
        assert.isTrue(awakenFactor(generalWith('戰法'), 'gene_x', 'mentor', 99).ok);
    });

    suite.test('可見門檻照色系', () => {
        assert.equals(FACTOR_DISCOVERY_LEVEL.white, requiredDiscoveryLevel({ type: '人格' }));
        assert.equals(FACTOR_DISCOVERY_LEVEL.purple, requiredDiscoveryLevel({ type: '天命' }));
        assert.equals(FACTOR_DISCOVERY_LEVEL.blue, requiredDiscoveryLevel({ type: '戰鬥' }));
    });

    return suite;
}
