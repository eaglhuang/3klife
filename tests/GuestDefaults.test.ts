import { assert, TestSuite } from './TestRunner';
import { createGuestDefaults } from '../assets/scripts/core/systems/GuestDefaults';
import { STARTER_INVENTORY, ITEM_ORACLE_TOKEN } from '../assets/scripts/core/systems/PlayerInventory';
import { INITIAL_HERO_IDS } from '../assets/scripts/core/systems/InitialHeroTable';
import { STARTER_GACHA_WALLET } from '../assets/scripts/core/services/GachaWalletRules';

export function createGuestDefaultsSuite(): TestSuite {
    const suite = new TestSuite('GuestDefaults (OPEN-14 未登入預設 = 新存檔起始狀態)');

    suite.test('庫存、錢包、初始名將與遊戲時間與新存檔起始值一致', () => {
        const guest = createGuestDefaults();
        assert.equals(STARTER_INVENTORY[ITEM_ORACLE_TOKEN] ?? -1, guest.inventory[ITEM_ORACLE_TOKEN] ?? -2);
        assert.equals(STARTER_GACHA_WALLET.gems, guest.wallet.gems);
        assert.equals(STARTER_GACHA_WALLET.gold, guest.wallet.gold);
        assert.equals(INITIAL_HERO_IDS.length, guest.initialHeroIds.length);
        assert.equals(INITIAL_HERO_IDS.join(','), guest.initialHeroIds.join(','));
        assert.equals(1, guest.gameTime.currentYear);
        assert.equals(1, guest.gameTime.currentSeason);
        assert.equals(0, guest.gameTime.totalSeasonsElapsed);
    });

    suite.test('每次呼叫回傳新副本，改動回傳值不會回寫到常數或下一次結果', () => {
        const first = createGuestDefaults();
        first.wallet.gems = 0;
        first.inventory[ITEM_ORACLE_TOKEN] = 999;
        first.initialHeroIds.push('x');
        const second = createGuestDefaults();
        assert.isTrue(first !== second);
        assert.equals(STARTER_GACHA_WALLET.gems, second.wallet.gems);
        assert.equals(STARTER_INVENTORY[ITEM_ORACLE_TOKEN] ?? -1, second.inventory[ITEM_ORACLE_TOKEN] ?? -2);
        assert.equals(INITIAL_HERO_IDS.length, second.initialHeroIds.length);
        assert.equals(STARTER_GACHA_WALLET.gems, 1280);
    });

    return suite;
}
