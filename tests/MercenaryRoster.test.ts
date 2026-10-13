import { assert, TestSuite } from './TestRunner';
import { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { MercenaryState } from '../assets/scripts/core/systems/MercenaryBond';
import { BondStats } from '../assets/scripts/core/systems/MercenaryBondPermanent';
import { bondMercenaryToRoster, generalFromBondStats } from '../assets/scripts/core/systems/MercenaryRoster';

const TEMPLATE = { id: 'gen-merc', name: '測試傭兵', faction: 'shu', hp: 1000, str: 10, int: 10, lea: 10, luk: 10 } as unknown as GeneralConfig;
const STATS: BondStats = { STR: 80, INT: 60, POL: 40, CHR: 70, LUK: 50 };

// 好感 150 只是測試用數值：PM 裁定好感上限 60，而 R 結義需 100 點，正式規則下 R 目前無法結義（見 PROG-2-0308 待決）。
function readyMercenary(overrides: Partial<MercenaryState> = {}): MercenaryState {
    return { uid: 'merc-1', daysLeft: 0, bond: 6, status: 'Trial', generalId: 'gen-merc', affection: 150, ...overrides };
}

export function createMercenaryRosterSuite(): TestSuite {
    const suite = new TestSuite('MercenaryRoster (MERC-04 結義入名冊)');

    suite.test('倒數完成、好感足夠：結義成 Bonded，武將數值依對應覆寫，好感扣除點數', () => {
        const result = bondMercenaryToRoster(readyMercenary(), TEMPLATE, STATS, 'R', [], 10);
        assert.isTrue(result.ok);
        assert.equals(100, result.pointsSpent);
        assert.equals('Bonded', result.mercenary!.status);
        assert.equals(50, result.mercenary!.affection!);
        assert.equals(80, result.general!.str!);
        assert.equals(60, result.general!.int!);
        assert.equals(50, result.general!.luk!);
        assert.equals(55, result.general!.lea!);
        assert.equals('gen-merc', result.general!.id);
    });

    suite.test('好感不足 R 的 100 點：回 insufficient-points，不改傭兵（正式好感上限 60 時永遠成立）', () => {
        const source = readyMercenary({ affection: 60 });
        const result = bondMercenaryToRoster(source, TEMPLATE, STATS, 'R', [], 10);
        assert.isFalse(result.ok);
        assert.equals('insufficient-points', result.reason!);
        assert.equals(60, source.affection!);
    });

    suite.test('倒數未歸零：回 trial-incomplete', () => {
        const result = bondMercenaryToRoster(readyMercenary({ daysLeft: 2 }), TEMPLATE, STATS, 'R', [], 10);
        assert.equals('trial-incomplete', result.reason!);
    });

    suite.test('武將模板與 generalId 不符，或傭兵沒有 generalId：回 general-mismatch', () => {
        const other = { ...TEMPLATE, id: 'gen-other' } as GeneralConfig;
        assert.equals('general-mismatch', bondMercenaryToRoster(readyMercenary(), other, STATS, 'R', [], 10).reason!);
        const noId = readyMercenary({ generalId: undefined });
        assert.equals('general-mismatch', bondMercenaryToRoster(noId, TEMPLATE, STATS, 'R', [], 10).reason!);
    });

    suite.test('未知稀有度：回 unknown-rarity', () => {
        assert.equals('unknown-rarity', bondMercenaryToRoster(readyMercenary(), TEMPLATE, STATS, 'X', [], 10).reason!);
    });

    suite.test('結義後加入 30 天冷卻，且同 uid 舊冷卻被覆寫為較晚者', () => {
        const result = bondMercenaryToRoster(readyMercenary(), TEMPLATE, STATS, 'R', [{ uid: 'merc-1', availableOnDay: 5 }], 10);
        assert.equals(40, result.cooldowns!.find((c) => c.uid === 'merc-1')!.availableOnDay);
    });

    suite.test('generalFromBondStats 不改模板', () => {
        const before = JSON.stringify(TEMPLATE);
        generalFromBondStats(TEMPLATE, STATS);
        assert.equals(before, JSON.stringify(TEMPLATE));
    });

    return suite;
}
