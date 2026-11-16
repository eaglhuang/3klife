/**
 * 通用奧義「全軍突擊」與教學戰開場計謀點給滿（PROG-2-9326）
 *
 * Unity 對照：像角色沒有掛專屬大招的 ScriptableObject 時，技能列改塞一顆預設大招，而不是整列空白。
 */
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { buildUltimateSkills } from '../assets/scripts/battle/views/BattleSceneLoader';
import { ProjectedDamageSkillResolver } from '../assets/scripts/battle/skills/resolvers/ProjectedDamageSkillResolver';
import { isBattleSkillImplemented, resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { getBattleSkillPresentation } from '../assets/scripts/shared/BattleSkillPresentation';
import { Faction, GAME_CONFIG } from '../assets/scripts/core/config/Constants';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

const GENERIC = GAME_CONFIG.genericUltimate;

function general(id: string, faction: Faction, extra: Record<string, unknown> = {}): GeneralUnit {
    return new GeneralUnit({ id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 80, int: 60, lea: 60, ...extra } as unknown as GeneralConfig);
}

export function createGenericUltimateSuite(): TestSuite {
    const suite = new TestSuite('GenericUltimate (通用奧義與教學戰計謀點 PROG-2-9326)');

    suite.test('沒有奧義槽也沒有主技能：選單給通用奧義「全軍突擊」，耗滿 SP', () => {
        services().initialize();
        const skills = buildUltimateSkills(general('no-ult', Faction.Player, { skillId: null, ultimateSlots: [] }));
        assert.equals(1, skills.length);
        assert.equals(GENERIC.skillId, skills[0].skillId);
        assert.equals('全軍突擊', skills[0].label);
        assert.equals(100, skills[0].costSp);
    });

    suite.test('有主技能的武將不受影響，仍是自己的技能', () => {
        services().initialize();
        const skills = buildUltimateSkills(general('has-skill', Faction.Player, { skillId: 'zhang-fei-roar', ultimateSlots: [] }));
        assert.equals(1, skills.length);
        assert.equals('zhang-fei-roar', skills[0].skillId);
    });

    suite.test('通用奧義可施放：有 profile、不是殼、演出名稱與設定一致', () => {
        const profile = resolveBattleSkillProfile(GENERIC.skillId);
        assert.equals(GENERIC.coefficient, profile?.coefficient);
        assert.isTrue(isBattleSkillImplemented(GENERIC.skillId));
        assert.equals(GENERIC.name, getBattleSkillPresentation(GENERIC.skillId).name);
    });

    suite.test('施放：場上每隊敵軍各受一次傷害，不附帶狀態', () => {
        services().initialize();
        const caster = createTestUnit('me', Faction.Player, 0, 0, { hp: 200, attack: 40, defense: 5 });
        const enemy1 = createTestUnit('e1', Faction.Enemy, 2, 0, { hp: 300, defense: 1 });
        const enemy2 = createTestUnit('e2', Faction.Enemy, 2, 1, { hp: 300, defense: 1 });
        const { context, damageLog, buffLog } = createBattleSkillTestContext({
            playerGeneral: createTestGeneral('pg', Faction.Player, { str: 120 }),
            enemyGeneral: createTestGeneral('eg', Faction.Enemy),
            units: [caster, enemy1, enemy2],
        });
        const result = new ProjectedDamageSkillResolver().execute({
            sourceType: SkillSourceType.Ultimate, ownerUid: 'me', battleSkillId: GENERIC.skillId,
            targetMode: 'enemy-all', timing: 'active-cast',
        } as never, context);
        assert.isTrue(result.applied);
        assert.equals(2, damageLog.length);
        assert.equals(0, buffLog.length);
    });

    suite.test('教學戰開場計謀點給滿；一般戰鬥維持原本的開場點數', () => {
        services().initialize();
        const sortieInput = { commandCapacity: 9000, cityTroops: 9000, stageSortieCap: 9000, food: 1000 };
        const make = (tutorial: boolean) => {
            const ctrl = new BattleController();
            ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
            ctrl.tutorialBattle = tutorial;
            return ctrl.configureSortie(sortieInput);
        };
        const tutorial = make(true), normal = make(false);
        assert.equals(tutorial.tacticMax, tutorial.tacticCurrent, '教學戰給滿');
        assert.isTrue(normal.tacticCurrent < normal.tacticMax, '一般戰鬥不動');
    });

    return suite;
}
