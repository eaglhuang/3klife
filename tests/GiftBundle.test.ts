/**
 * GiftBundle — 禮包組合：一次扣精元、發放多種道具、限購（ITM-09；PROG-2-1921）
 */
import { assert, TestSuite } from './TestRunner';
import { purchaseGiftBundle, validateGiftBundle, type GiftBundleDef } from '../assets/scripts/core/systems/GiftBundle';
import { ITEM_LONGEVITY_PILL, ITEM_VITALITY_PILL } from '../assets/scripts/core/systems/ItemDef';

const BUNDLE: GiftBundleDef = {
    id: 'test-bundle', name: '測試禮包', currency: 'gem', price: 80, purchaseLimit: 1,
    items: [{ itemId: ITEM_VITALITY_PILL, quantity: 5 }, { itemId: ITEM_LONGEVITY_PILL, quantity: 1 }],
};

function wallet(balance: number) {
    const w = { balance, spend: (n: number) => { if (w.balance < n) return false; w.balance -= n; return true; } };
    return w;
}

export function createGiftBundleSuite(): TestSuite {
    const suite = new TestSuite('GiftBundle (禮包組合 ITM-09 PROG-2-1921)');

    suite.test('一次扣款、全部道具發放；達限購後拒絕', async () => {
        const granted: string[] = [];
        const w = wallet(200);
        const r = await purchaseGiftBundle(BUNDLE, 0, w, (id, q) => { granted.push(`${id}x${q}`); });
        assert.isTrue(r.ok);
        assert.equals(120, w.balance);
        assert.equals(`${ITEM_VITALITY_PILL}x5,${ITEM_LONGEVITY_PILL}x1`, granted.join(','));
        const again = await purchaseGiftBundle(BUNDLE, 1, w, () => { granted.push('x'); });
        assert.isFalse(again.ok);
        assert.equals('limit-reached', again.reason);
        assert.equals(120, w.balance);
    });

    suite.test('餘額不足不扣不發；定義檢查擋壞資料', async () => {
        const r = await purchaseGiftBundle(BUNDLE, 0, wallet(10), () => { throw new Error('不應發貨'); });
        assert.equals('insufficient-funds', r.reason);
        assert.equals(0, validateGiftBundle(BUNDLE).length);
        assert.isTrue(validateGiftBundle({ ...BUNDLE, items: [] }).length > 0);
        assert.isTrue(validateGiftBundle({ ...BUNDLE, price: -1 }).length > 0);
        assert.isTrue(validateGiftBundle({ ...BUNDLE, items: [{ itemId: 'NOPE', quantity: 1 }] }).length > 0);
        assert.isTrue(validateGiftBundle({ ...BUNDLE, items: [{ itemId: ITEM_VITALITY_PILL, quantity: 0 }] }).length > 0);
        const bad = await purchaseGiftBundle({ ...BUNDLE, items: [] }, 0, wallet(999), () => undefined);
        assert.equals('invalid-bundle', bad.reason);
    });

    return suite;
}
