/**
 * GeneralStealthBehavior.test.ts — 武將化身站在掩體格時的實際攻擊行為（GRD-04，#413 補行為測試）
 *
 * 既有 GeneralStealthAttack.test.ts 只用原始碼字串比對；這裡用真正的 BattleController 驗：
 * 遠程打不到站掩體格的敵方武將化身、近戰可以、沒站掩體格時遠程可以、沒有武將化身時照舊。
 * Unity 對照：像 Physics.Raycast 的 Layer 過濾測試，驗的是射線有沒有被擋，不是 Layer 欄位有沒有寫。
 */
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

function createGeneral(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 100, str: 100, int: 90, lea: 90,
        skillId: 'placeholder', battlePrimarySkillId: 'placeholder',
    });
}

export function createGeneralStealthBehaviorSuite(): TestSuite {
    const suite = new TestSuite('GeneralStealthBehavior (掩體格對武將化身的實際攻擊行為)');

    function setup(withAvatarOnAmbush: boolean, attackRange: number) {
        services().initialize();
        services().session.setRandomSource(() => 0);
        const ctrl = new BattleController();
        ctrl.initBattle(createGeneral('p', Faction.Player), createGeneral('e', Faction.Enemy), undefined, undefined, undefined);
        (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;

        // 敵方武將化身站在 (2,6)；玩家弓兵在 (2,6-?)：距離玩家方底線（depth 8）要在射程內
        const avatar = new TroopUnit('enemy-avatar', TroopType.Infantry, Faction.Enemy, {
            hp: 100, attack: 10, defense: 10, moveRange: 0, attackRange: 1,
        });
        avatar.moveTo(4, 0);
        ctrl.state.addUnit(avatar);
        ctrl.enemyGeneralUnitId = avatar.id;
        if (withAvatarOnAmbush) {
            ctrl.state.setTileEffect({ id: 'amb', lane: 4, depth: 0, state: 'ambush-field', notes: 'test' });
        }

        const attacker = new TroopUnit('player-shooter', TroopType.Archer, Faction.Player, {
            hp: 100, attack: 30, defense: 10, moveRange: 0, attackRange,
        });
        attacker.moveTo(1, 8 - attackRange);
        ctrl.state.addUnit(attacker);
        const resolver = (ctrl as unknown as { combatResolver: { buildAttackAction(u: TroopUnit): { targetId: string | null } | null } }).combatResolver;
        return { resolver, attacker };
    }

    suite.test('敵方武將化身站掩體格：遠程（射程 2）打不到武將', () => {
        const { resolver, attacker } = setup(true, 2);
        assert.equals(null, resolver.buildAttackAction(attacker));
    });

    suite.test('敵方武將化身站掩體格：近戰（射程 1）仍可打到武將', () => {
        const { resolver, attacker } = setup(true, 1);
        const action = resolver.buildAttackAction(attacker);
        assert.isTrue(action !== null, '近戰應可攻擊');
        assert.equals(null, action!.targetId);
    });

    suite.test('敵方武將化身沒站掩體格：遠程照常可以打武將', () => {
        const { resolver, attacker } = setup(false, 2);
        const action = resolver.buildAttackAction(attacker);
        assert.isTrue(action !== null, '遠程應可攻擊');
    });

    return suite;
}
