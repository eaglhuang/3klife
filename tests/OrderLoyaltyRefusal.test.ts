/**
 * OrderLoyaltyRefusal — 主將忠誠低於 30 時每回合拒絕部署命令（TRP-09 戰場拒令）的 headless 測試
 */
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

function setup(): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    const pg = new GeneralUnit({ id: 'guan-yu', name: 'guan-yu', faction: Faction.Player, hp: 1000, maxSp: 100, initialSp: 100, str: 100, int: 90, lea: 90, skillId: 'guan-yu-slash', battlePrimarySkillId: 'guan-yu-slash' });
    const eg = new GeneralUnit({ id: 'lu-bu', name: 'lu-bu', faction: Faction.Enemy, hp: 1000, maxSp: 100, initialSp: 100, str: 100, int: 90, lea: 90, skillId: 'lu-bu-rampage', battlePrimarySkillId: 'lu-bu-rampage' });
    ctrl.initBattle(pg, eg);
    return ctrl;
}

export function createOrderLoyaltyRefusalSuite(): TestSuite {
    const suite = new TestSuite('OrderLoyaltyRefusal (主將忠誠拒令 TRP-09)');

    suite.test('忠誠 < 30 且擲骰低於 25% 時，本回合部署被拒，不消耗部署次數', () => {
        const ctrl = setup();
        ctrl.configureOrderLoyalty(10, () => 0);
        const refused = ctrl.tryDeployTroop(TroopType.Infantry, 0);
        assert.equals(false, refused.ok);
        assert.equals('order-refused', refused.reason ?? '');
        assert.equals(null, refused.unit);
    });

    suite.test('忠誠 ≥ 30、沒有紀錄（null）或擲骰未中，部署照常', () => {
        const ctrl = setup();
        ctrl.configureOrderLoyalty(30, () => 0);
        assert.equals(true, ctrl.tryDeployTroop(TroopType.Infantry, 0).ok, '忠誠 30 不拒令');

        const none = setup();
        none.configureOrderLoyalty(null, () => 0);
        assert.equals(true, none.tryDeployTroop(TroopType.Infantry, 0).ok, '沒有紀錄不拒令');

        const miss = setup();
        miss.configureOrderLoyalty(10, () => 0.9);
        assert.equals(true, miss.tryDeployTroop(TroopType.Infantry, 0).ok, '擲骰未中不拒令');
    });

    return suite;
}
