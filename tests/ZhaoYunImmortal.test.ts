/**
 * 白馬銀槍·不滅（趙雲 5，ULT-08 補缺）：全屏 AOE、全體士氣拉滿、施放者 1 回合無敵，多回合測試
 *
 * 覆蓋：
 *   - 施放：全部敵軍受傷、全體友軍士氣拉滿至 100、施放者獲得無敵 1 回合
 *   - 無敵期間本回合的傷害結算歸零；回合結束 tickBuff 後無敵消失，傷害恢復
 * 係數 0.72 取自全屏／全場傷害奧義（出師表、火燒連營 0.72；魂筆驚世 0.78；江左天焰 0.95）中最常用者（PM 裁定）。
 */
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { ProjectedDamageSkillResolver } from '../assets/scripts/battle/skills/resolvers/ProjectedDamageSkillResolver';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { Faction, StatusEffect } from '../assets/scripts/core/config/Constants';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

function immortalRequest(ownerUid: string) {
    return {
        sourceType: SkillSourceType.Ultimate,
        ownerUid,
        battleSkillId: 'zhao-yun-immortal',
        ultimateId: 'ult-zhao-yun-5',
        targetMode: 'enemy-all',
        timing: 'active-cast',
    } as never;
}

export function createZhaoYunImmortalSuite(): TestSuite {
    const suite = new TestSuite('ZhaoYunImmortal (白馬銀槍·不滅 AOE／士氣／無敵多回合)');

    suite.test('profile：係數 0.72、力量成長、士氣拉滿與 1 回合自身無敵', () => {
        const profile = resolveBattleSkillProfile('zhao-yun-immortal');
        assert.equals(0.72, profile?.coefficient);
        assert.equals('str', profile?.scalingStat);
        assert.isTrue(profile?.maximizeMoraleOnAllies === true);
        assert.equals(1, profile?.selfInvincibleTurns);
    });

    suite.test('施放：敵軍受傷、友軍士氣拉滿至 100、施放者獲得無敵', () => {
        services().initialize();
        const caster = createTestUnit('zhao', Faction.Player, 0, 0, { hp: 200, attack: 40, defense: 5 });
        const ally = createTestUnit('ally', Faction.Player, 1, 0, { hp: 100 });
        const enemy1 = createTestUnit('e1', Faction.Enemy, 2, 0, { hp: 300, defense: 1 });
        const enemy2 = createTestUnit('e2', Faction.Enemy, 2, 1, { hp: 300, defense: 1 });
        const { context, damageLog, buffLog } = createBattleSkillTestContext({
            playerGeneral: createTestGeneral('zhao-general', Faction.Player, { str: 120 }),
            enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
            units: [caster, ally, enemy1, enemy2],
        });
        const result = new ProjectedDamageSkillResolver().execute(immortalRequest('zhao'), context);
        assert.isTrue(result.applied);
        assert.equals(2, damageLog.length, '兩名敵軍各結算一次');
        assert.equals(100, ally.morale, '友軍士氣拉滿');
        assert.equals(3, ally.moraleTurns);
        assert.isTrue(buffLog.some((b) => b.unitId === 'zhao' && b.effect === StatusEffect.Invincible && b.turns === 1));
    });

    suite.test('多回合：無敵期間傷害歸零，回合結束 tickBuff 後傷害恢復', () => {
        services().initialize();
        const caster = createTestUnit('zhao', Faction.Player, 0, 0, { hp: 200 });
        const enemy = createTestUnit('e1', Faction.Enemy, 2, 0, { hp: 300 });
        const { context, buffLog } = createBattleSkillTestContext({
            playerGeneral: createTestGeneral('zhao-general', Faction.Player, { str: 120 }),
            enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
            units: [caster, enemy],
        });
        new ProjectedDamageSkillResolver().execute(immortalRequest('zhao'), context);
        // 測試替身的 applyBuff 只記錄；真實戰場的派發器會轉交 services().buff，這裡照同一路徑寫入
        assert.isTrue(buffLog.some((b) => b.unitId === 'zhao' && b.effect === StatusEffect.Invincible));
        services().buff.applyBuff('zhao', StatusEffect.Invincible, 1);
        assert.isTrue(services().buff.hasBuff('zhao', StatusEffect.Invincible));

        // 第 1 回合：敵方攻擊趙雲，傷害歸零
        const combat = new BattleCombatResolver({ state: { getDamageLink: () => null, units: new Map() } } as never);
        combat.applyUnitDamage(caster, 50, Faction.Enemy, { attackerId: 'e1', attackerLane: 2, attackerDepth: 0, allowDamageLink: false });
        assert.equals(200, caster.currentHp, '無敵期間不扣血');

        // 回合結束：無敵倒數到 0
        services().buff.tickBuff();
        assert.isFalse(services().buff.hasBuff('zhao', StatusEffect.Invincible));

        // 第 2 回合：傷害恢復
        combat.applyUnitDamage(caster, 50, Faction.Enemy, { attackerId: 'e1', attackerLane: 2, attackerDepth: 0, allowDamageLink: false });
        assert.equals(150, caster.currentHp, '無敵結束後照常扣血');
    });

    return suite;
}
