/**
 * 戰法傷害投射模組代號對應（SYS-SKILL-TAC-0001 第一片，PROG-2-0585）headless 測試
 */
import { TestSuite, assert } from './TestRunner';
import { BattleSkillTargetMode } from '../assets/scripts/shared/SkillRuntimeContract';
import { damageModuleTagOf } from '../assets/scripts/battle/skills/BattleSkillModuleTags';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';

export function createBattleSkillModuleTagsSuite(): TestSuite {
    const suite = new TestSuite('BattleSkillModuleTags (戰法傷害投射模組代號 TAC-0001)');

    suite.test('三種投射形狀各自對到規格代號：單體 TDIR、直線 TLINE、扇形與範圍 TFAN', () => {
        assert.equals('TDIR', damageModuleTagOf({ targetMode: BattleSkillTargetMode.EnemySingle }));
        assert.equals('TLINE', damageModuleTagOf({ targetMode: BattleSkillTargetMode.Line }));
        assert.equals('TFAN', damageModuleTagOf({ targetMode: BattleSkillTargetMode.Fan }));
        assert.equals('TFAN', damageModuleTagOf({ targetMode: BattleSkillTargetMode.Area }));
    });

    suite.test('非傷害投射形狀不帶代號（自身、友軍、地格不套 TAC-0001 的傷害包）', () => {
        assert.equals(null, damageModuleTagOf({ targetMode: BattleSkillTargetMode.Self }));
        assert.equals(null, damageModuleTagOf({ targetMode: BattleSkillTargetMode.AllySingle }));
        assert.equals(null, damageModuleTagOf({ targetMode: BattleSkillTargetMode.Tile }));
    });

    suite.test('已落地的戰法對到規格代號：無視防禦、百步穿楊為 TDIR，趙家槍法為 TLINE，呂布無雙亂舞為 TFAN', () => {
        const tagOf = (id: string) => {
            const profile = resolveBattleSkillProfile(id);
            assert.isTrue(profile !== null, `缺少戰法 profile：${id}`);
            return damageModuleTagOf(profile!);
        };
        assert.equals('TDIR', tagOf('tally-defense-pierce'));
        assert.equals('TDIR', tagOf('tally-hundred-steps'));
        assert.equals('TLINE', tagOf('zhao-yun-pierce'));
        assert.equals('TFAN', tagOf('lu-bu-rampage'));
    });

    return suite;
}
