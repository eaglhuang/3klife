/**
 * StageThemeSalvage — 四主題配置與戰術物資結算（doc_spec_0353；PROG-2-2039）
 */
import { assert, TestSuite } from './TestRunner';
import { STAGE_THEME_CONFIGS, StageSalvageSession, computeStageSalvage } from '../assets/scripts/battle/shared/StageThemeSalvage';

export function createStageThemeSalvageSuite(): TestSuite {
    const suite = new TestSuite('StageThemeSalvage (四主題結算 doc_spec_0353 PROG-2-2039)');

    suite.test('§4-1 四主題配置齊全', () => {
        assert.equals(2, STAGE_THEME_CONFIGS.Canyon.keyObjectCount);
        assert.equals(1, STAGE_THEME_CONFIGS.Floodgate.keyObjectCount);
        assert.equals(3, STAGE_THEME_CONFIGS.Night_Raid.visionRadius);
        assert.equals('Trap_Cluster', STAGE_THEME_CONFIGS.Ambush.keyObjectType);
        assert.equals(3, STAGE_THEME_CONFIGS.Ambush.keyObjectCount);
    });

    suite.test('§2 物件與斬將加成、§4-3 無陣亡 ×1.2 向下取整', () => {
        const tally = { rockfallsDestroyed: 2, campsOrGatesTaken: 1, granariesTaken: 1, generalsKilled: 3 };
        const normal = computeStageSalvage({ stone: 5 }, tally, false).gain;
        assert.equals(305, normal.stone);
        assert.equals(200, normal.wood);
        assert.equals(500, normal.supply);
        assert.equals(3, normal.intel);
        const flawless = computeStageSalvage({ stone: 5 }, tally, true).gain;
        assert.equals(366, flawless.stone);
        assert.equals(3, flawless.intel);
    });

    suite.test('§4-2 戰中退出或失敗，倉庫變更為 0；收兵只寫一次', () => {
        const writes: number[] = [];
        const lost = new StageSalvageSession();
        lost.stage({ wood: 200 });
        lost.abandon();
        assert.isFalse(lost.commitOnReturn((g) => writes.push(g.wood)));
        assert.equals(0, writes.length);
        const won = new StageSalvageSession();
        won.stage({ wood: 200 });
        won.stage({ wood: 150 });
        assert.isTrue(won.commitOnReturn((g) => writes.push(g.wood)));
        assert.isFalse(won.commitOnReturn((g) => writes.push(g.wood)));
        assert.equals('350', writes.join(','));
    });

    return suite;
}
