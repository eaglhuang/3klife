/**
 * RivalExpansionWiring.test.ts — 他國進攻玩家時的出征判定接線（E-4，RAI-05 方案 b，PROG-2-1505）
 *
 * 進攻要過兩關：先擲性格的固定機率，再由 evaluateExpansion（兵力、糧草門檻與效用分數）給 ATTACK。
 */
import { advanceRivalSeason, createRivalWorld, type RivalWorld } from '../assets/scripts/core/systems/RivalNations';
import { TestSuite, assert } from './TestRunner';

const fixed = (value: number) => (): number => value;

/** 指定勢力糧草充足且與玩家敵對（邦交 ≤ -40 才算敵對，才會進入出征判定） */
function hostileWithFood(world: RivalWorld, id: string, food: number): RivalWorld {
    return {
        ...world,
        nations: world.nations.map((n) => (n.id === id
            ? { ...n, relation: -60, resources: { food, gold: 5000, fame: 0, intel: 0 } }
            : n)),
    };
}

function attackedBy(world: RivalWorld, random: () => number, player = { troops: 0, food: 0, gold: 0 }): string[] {
    return advanceRivalSeason(world, random, player).events.map((e) => e.nationId);
}

export function createRivalExpansionWiringSuite(): TestSuite {
    const suite = new TestSuite('RivalExpansionWiring (他國出征判定接線 E-4 PROG-2-1505)');

    suite.test('糧草不足 3000：固定機率與意願都通過，仍不出兵', () => {
        const world = hostileWithFood(createRivalWorld(), 'wei', 300);
        assert.isTrue(!attackedBy(world, fixed(0)).includes('wei'));
    });

    suite.test('兵力、糧草過門檻且效用分數夠高：固定機率通過就出兵', () => {
        const world = hostileWithFood(createRivalWorld(), 'lvbu', 5000);
        assert.isTrue(attackedBy(world, fixed(0)).includes('lvbu'));
    });

    suite.test('玩家兵力遠高於對方：效用分數不足，即使固定機率通過也不出兵', () => {
        const world = hostileWithFood(createRivalWorld(), 'lvbu', 5000);
        assert.isTrue(!attackedBy(world, fixed(0), { troops: 1000000, food: 0, gold: 0 }).includes('lvbu'));
    });

    suite.test('固定機率沒過：不進入出征判定，不出兵', () => {
        const world = hostileWithFood(createRivalWorld(), 'lvbu', 5000);
        assert.isTrue(!attackedBy(world, fixed(0.99)).includes('lvbu'));
    });

    return suite;
}
