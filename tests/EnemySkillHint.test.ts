/**
 * EnemySkillHint.test.ts — 敵將發動戰法／奧義的戰報文案（AI武將強度 G-2，PROG-2-1469）
 */
import { Faction } from '../assets/scripts/shared/CommonEnums';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { buildBattleSkillUsedMessage, getBattleSkillPresentation } from '../assets/scripts/shared/BattleSkillPresentation';
import { TestSuite, assert } from './TestRunner';

export function createEnemySkillHintSuite(): TestSuite {
    const suite = new TestSuite('EnemySkillHint (敵將戰法奧義戰報 G-2 PROG-2-1469)');
    const skillId = 'zhang-fei-roar';
    const name = getBattleSkillPresentation(skillId).name;

    suite.test('敵將發動戰法：敵將 {名} 發動戰法——{戰法名}！', () => {
        assert.equals(`敵將 曹操 發動戰法——${name}！`,
            buildBattleSkillUsedMessage(skillId, Faction.Enemy, SkillSourceType.SeedTactic, '曹操'));
        assert.equals(`敵將 曹操 發動戰法——${name}！`,
            buildBattleSkillUsedMessage(skillId, Faction.Enemy, undefined, '曹操'));
    });

    suite.test('敵將發動奧義：危急！……全軍戒備！', () => {
        assert.equals(`危急！敵將 呂布 發動奧義——${name}！全軍戒備！`,
            buildBattleSkillUsedMessage(skillId, Faction.Enemy, SkillSourceType.Ultimate, '呂布'));
    });

    suite.test('沒帶敵將名字或我方施放：沿用舊格式', () => {
        const old = buildBattleSkillUsedMessage(skillId, Faction.Enemy, SkillSourceType.Ultimate);
        assert.isTrue(old.startsWith('敵方奧義【'));
        const mine = buildBattleSkillUsedMessage(skillId, Faction.Player, SkillSourceType.SeedTactic, '劉備');
        assert.isTrue(mine.startsWith('我方戰法【'));
    });

    return suite;
}
