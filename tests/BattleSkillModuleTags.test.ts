/**
 * 戰法傷害投射模組代號對應（SYS-SKILL-TAC-0001 第一片，PROG-2-0585）headless 測試
 */
import { TestSuite, assert } from './TestRunner';
import { BattleSkillTargetMode } from '../assets/scripts/shared/SkillRuntimeContract';
import { damageModuleTagOf } from '../assets/scripts/battle/skills/BattleSkillModuleTags';
import { BattleSkillExecutor } from '../assets/scripts/battle/skills/BattleSkillExecutor';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';

export function createBattleSkillModuleTagsSuite(): TestSuite {
    const suite = new TestSuite('BattleSkillModuleTags (戰法傷害投射模組代號 TAC-0001)');

    suite.test('三種投射形狀各自對到規格代號：單體 TDIR、直線 TLINE、扇形與範圍 TFAN', () => {
        assert.equals('TDIR', damageModuleTagOf({ targetMode: BattleSkillTargetMode.EnemySingle, coefficient: 1 }));
        assert.equals('TLINE', damageModuleTagOf({ targetMode: BattleSkillTargetMode.Line, coefficient: 1 }));
        assert.equals('TFAN', damageModuleTagOf({ targetMode: BattleSkillTargetMode.Fan, coefficient: 1 }));
        assert.equals('TFAN', damageModuleTagOf({ targetMode: BattleSkillTargetMode.Area, coefficient: 1 }));
    });

    suite.test('非傷害投射形狀或無傷害係數不帶代號（自身、友軍、地格、緩速 coefficient 0）', () => {
        assert.equals(null, damageModuleTagOf({ targetMode: BattleSkillTargetMode.Self, coefficient: 1 }));
        assert.equals(null, damageModuleTagOf({ targetMode: BattleSkillTargetMode.AllySingle, coefficient: 1 }));
        assert.equals(null, damageModuleTagOf({ targetMode: BattleSkillTargetMode.Tile, coefficient: 1 }));
        assert.equals(null, damageModuleTagOf({ targetMode: BattleSkillTargetMode.EnemySingle, coefficient: 0 }));
    });

    suite.test('已落地的戰法對到規格代號：無視防禦、百步穿楊為 TDIR，趙家槍法為 TLINE，呂布天下無雙為 TFAN', () => {
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

    suite.test('施放執行器只在套用成功時回報代號：成功回報 TDIR／TBUFF／TDEBUFF，未套用回空清單', () => {
        let applied = true;
        const resolver = {
            canResolve: () => true,
            execute: (request: { battleSkillId: string }) => ({
                requestId: request.battleSkillId,
                battleSkillId: request.battleSkillId,
                applied,
                deltas: [],
                battleLogLines: [],
            }),
        };
        const executor = new BattleSkillExecutor([resolver as never]);
        const ctx = {} as never;
        assert.equals('TDIR', executor.execute({ battleSkillId: 'tally-defense-pierce' } as never, ctx).moduleTags?.[0] ?? null);
        assert.equals('TBUFF', executor.execute({ battleSkillId: 'mentor-morale' } as never, ctx).moduleTags?.[0] ?? null);
        assert.equals('TDEBUFF', executor.execute({ battleSkillId: 'mentor-slow' } as never, ctx).moduleTags?.[0] ?? null);
        applied = false;
        assert.equals(0, executor.execute({ battleSkillId: 'tally-defense-pierce' } as never, ctx).moduleTags?.length ?? -1);
    });

    return suite;
}
