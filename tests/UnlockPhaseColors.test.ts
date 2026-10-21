/**
 * UnlockPhaseColors.test.ts — 因子解鎖階段與解鎖色（FUL-06，PROG-2-0881）
 *
 * 檢查：各階段解鎖的因子色與規格 §F 一致；GameSession 的階段與解鎖色以玩家層級換算；
 * server/schema 入口與 core 實作為同一份。
 *
 * Unity 對照：像一張解鎖表 ScriptableObject，依角色等級查出目前開放的物品類別，
 * 查表與玩家資料各自獨立，不把查表寫進 UI。
 */
import { assert, TestSuite } from './TestRunner';
import { phaseFactorColors, phaseForLevel } from '../assets/scripts/core/systems/UnlockPhase';
import { phaseForLevel as serverPhaseForLevel } from '../server/schema/ful06-unlock-phase';
import { GameSession } from '../assets/scripts/core/managers/GameSession';

export function createUnlockPhaseColorsSuite(): TestSuite {
    const suite = new TestSuite('UnlockPhaseColors (因子解鎖階段色 FUL-06)');

    suite.test('各階段解鎖色與規格一致：Phase 1 藍粉、Phase 2 加綠白、Phase 3 加紫紅', () => {
        assert.equals(JSON.stringify(['blue', 'pink']), JSON.stringify(phaseFactorColors(1)));
        assert.equals(JSON.stringify(['blue', 'pink', 'green', 'white']), JSON.stringify(phaseFactorColors(2)));
        assert.equals(JSON.stringify(['blue', 'pink', 'green', 'white', 'purple', 'red']), JSON.stringify(phaseFactorColors(3)));
    });

    suite.test('等級換算：Lv1 與 Lv20 為 Phase 1，Lv21 進 Phase 2，Lv46 進 Phase 3', () => {
        assert.equals(1, phaseForLevel(1));
        assert.equals(1, phaseForLevel(20));
        assert.equals(2, phaseForLevel(21));
        assert.equals(3, phaseForLevel(46));
    });

    suite.test('server/schema 入口與 core 實作一致', () => {
        for (const level of [1, 20, 21, 45, 46, 100]) {
            assert.equals(phaseForLevel(level), serverPhaseForLevel(level));
        }
    });

    suite.test('GameSession 新局為 Lv1：階段 1，解鎖藍粉', () => {
        const session = new GameSession();
        assert.equals(1, session.unlockPhase);
        assert.equals(JSON.stringify(['blue', 'pink']), JSON.stringify(session.unlockedFactorColors()));
    });

    return suite;
}
