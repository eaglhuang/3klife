import { TestSuite, assert } from './TestRunner';
import { decideAppUpdate, FORCE_STORE_UPDATE_MESSAGE } from '../assets/scripts/core/systems/AppVersionPolicy';

/** HOT-01 版號策略（PROG-2-1990）：Major 不同強制商店更新；Minor 下載資料包；Patch 微熱更 */
export function createAppVersionPolicySuite(): TestSuite {
    const suite = new TestSuite('AppVersionPolicy（HOT-01 版號策略與強更導流 PROG-2-1990）');

    suite.test('Major 不同 → 強制商店更新並阻擋', () => {
        assert.equals('force-store-update', decideAppUpdate('1.4.2', '2.0.0').action);
        assert.equals(true, decideAppUpdate('1.4.2', '2.0.0').blocking);
        assert.equals('force-store-update', decideAppUpdate('2.0.0', '1.9.9').action);
        assert.equals(true, FORCE_STORE_UPDATE_MESSAGE.includes('App Store'));
    });

    suite.test('Minor 較舊 → 下載資料包；Patch 較舊 → 微熱更；不阻擋', () => {
        assert.equals('hot-update-download', decideAppUpdate('1.2.9', '1.3.0').action);
        assert.equals(false, decideAppUpdate('1.2.9', '1.3.0').blocking);
        assert.equals('hot-update-quick', decideAppUpdate('1.3.0', '1.3.1').action);
    });

    suite.test('同版或本機較新 → 不需更新；非法版號丟錯', () => {
        assert.equals('up-to-date', decideAppUpdate('1.3.1', '1.3.1').action);
        assert.equals('up-to-date', decideAppUpdate('1.4.0', '1.3.5').action);
        assert.throws(() => decideAppUpdate('1.3', '1.3.0'));
    });

    return suite;
}
