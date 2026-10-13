import { assert, TestSuite } from './TestRunner';
import { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { MercenaryState } from '../assets/scripts/core/systems/MercenaryBond';
import { bondMercenaryToRoster, rarityOfTemplate } from '../assets/scripts/core/systems/MercenaryRoster';

const TEMPLATE = { id: 'gen-merc', name: '測試傭兵', faction: 'shu', hp: 1000, rarityTier: 'common', str: 80, int: 60, lea: 55, luk: 50 } as unknown as GeneralConfig;

function readyMercenary(overrides: Partial<MercenaryState> = {}): MercenaryState {
    return { uid: 'merc-1', daysLeft: 0, bond: 6, status: 'Trial', generalId: 'gen-merc', affection: 60, ...overrides };
}

export function createMercenaryRosterSuite(): TestSuite {
    const suite = new TestSuite('MercenaryRoster (MERC-04 結義入名冊)');

    suite.test('倒數完成、好感滿 60、點數足夠：結義成 Bonded，武將取模板數值，好感不扣', () => {
        const result = bondMercenaryToRoster(readyMercenary(), TEMPLATE, 150, [], 10);
        assert.isTrue(result.ok);
        assert.equals(100, result.pointsSpent);
        assert.equals('Bonded', result.mercenary!.status);
        assert.equals(60, result.mercenary!.affection!);
        assert.equals(80, result.general!.str!);
        assert.equals(55, result.general!.lea!);
        assert.equals('gen-merc', result.general!.id);
    });

    suite.test('好感未滿 60：回 affection-not-full', () => {
        const result = bondMercenaryToRoster(readyMercenary({ affection: 59 }), TEMPLATE, 999, [], 10);
        assert.equals('affection-not-full', result.reason!);
    });

    suite.test('點數不足：回 insufficient-points，傭兵不被改寫', () => {
        const source = readyMercenary();
        const result = bondMercenaryToRoster(source, TEMPLATE, 99, [], 10);
        assert.equals('insufficient-points', result.reason!);
        assert.equals('Trial', source.status);
    });

    suite.test('倒數未歸零：回 trial-incomplete', () => {
        const result = bondMercenaryToRoster(readyMercenary({ daysLeft: 2 }), TEMPLATE, 999, [], 10);
        assert.equals('trial-incomplete', result.reason!);
    });

    suite.test('武將模板與 generalId 不符，或傭兵沒有 generalId：回 general-mismatch', () => {
        const other = { ...TEMPLATE, id: 'gen-other' } as GeneralConfig;
        assert.equals('general-mismatch', bondMercenaryToRoster(readyMercenary(), other, 999, [], 10).reason!);
        assert.equals('general-mismatch', bondMercenaryToRoster(readyMercenary({ generalId: undefined }), TEMPLATE, 999, [], 10).reason!);
    });

    suite.test('模板沒有 rarityTier 或不認得：回 unknown-rarity', () => {
        const noTier = { ...TEMPLATE, rarityTier: undefined } as unknown as GeneralConfig;
        assert.equals('unknown-rarity', bondMercenaryToRoster(readyMercenary(), noTier, 999, [], 10).reason!);
        assert.isTrue(rarityOfTemplate({ ...TEMPLATE, rarityTier: 'epic' } as unknown as GeneralConfig) === 'SSR');
    });

    suite.test('結義後加入 30 天冷卻，且同 uid 舊冷卻被覆寫為較晚者', () => {
        const result = bondMercenaryToRoster(readyMercenary(), TEMPLATE, 150, [{ uid: 'merc-1', availableOnDay: 5 }], 10);
        assert.equals(40, result.cooldowns!.find((c) => c.uid === 'merc-1')!.availableOnDay);
    });

    suite.test('結義不改模板', () => {
        const before = JSON.stringify(TEMPLATE);
        bondMercenaryToRoster(readyMercenary(), TEMPLATE, 150, [], 10);
        assert.equals(before, JSON.stringify(TEMPLATE));
    });

    return suite;
}
