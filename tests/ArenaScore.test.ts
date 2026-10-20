/**
 * 競技場積分公式（APT-13 / PROG-2-0818）
 *
 * 鎖住：地形倍率表、存活係數夾在 0~1、剋制係數夾在 1.0~1.5、
 * 公式數值、整組加總。
 */
import { assert, TestSuite } from './TestRunner';
import { arenaScoreOf, arenaScoreOfTeam, counterOf, survivalFactorOf, terrainMultiplierOf, type ArenaMember } from '../assets/scripts/core/systems/ArenaScore';

function member(overrides: Partial<ArenaMember> = {}): ArenaMember {
    return { str: 80, int: 60, lea: 40, luk: 20, tacticPoints: 10, terrain: 'B', hp: 100, maxHp: 100, ...overrides };
}

export function createArenaScoreSuite(): TestSuite {
    const suite = new TestSuite('ArenaScore (競技場積分 APT-13)');

    suite.test('地形倍率表與規格一致；未知等級退回 B（1.0）', () => {
        assert.equals(1.5, terrainMultiplierOf('S'));
        assert.equals(1.2, terrainMultiplierOf('A'));
        assert.equals(1.0, terrainMultiplierOf('B'));
        assert.equals(0.85, terrainMultiplierOf('C'));
        assert.equals(0.7, terrainMultiplierOf('D'));
        assert.equals(1.0, terrainMultiplierOf('X'));
    });

    suite.test('存活係數：current / max，夾在 0~1；maxHp 非正數為 0', () => {
        assert.equals(0.5, survivalFactorOf(50, 100));
        assert.equals(1, survivalFactorOf(150, 100));
        assert.equals(0, survivalFactorOf(-10, 100));
        assert.equals(0, survivalFactorOf(50, 0));
    });

    suite.test('剋制係數夾在 1.0~1.5；未指定為 1.0', () => {
        assert.equals(1.0, counterOf(undefined));
        assert.equals(1.5, counterOf(2));
        assert.equals(1.2, counterOf(1.2));
        assert.equals(1.0, counterOf(0.5));
    });

    suite.test('單一武將公式：(屬性總和 × 地形 + 戰法點數 × 剋制) × 存活', () => {
        // 屬性總和 = 80 + 60 + 40 + 20 = 200；地形 B = 1.0；戰法 10 × 剋制 1.0；存活 1.0
        assert.equals(210, arenaScoreOf(member()));
        // S 地形、剋制 1.5、半血：(200 × 1.5 + 10 × 1.5) × 0.5 = 157.5
        assert.equals(157.5, arenaScoreOf(member({ terrain: 'S', counter: 1.5, hp: 50 })));
        // 死亡：存活 0，積分 0
        assert.equals(0, arenaScoreOf(member({ hp: 0 })));
    });

    suite.test('整組積分為各成員相加', () => {
        assert.equals(210 + 157.5, arenaScoreOfTeam([member(), member({ terrain: 'S', counter: 1.5, hp: 50 })]));
        assert.equals(0, arenaScoreOfTeam([]));
    });

    return suite;
}
