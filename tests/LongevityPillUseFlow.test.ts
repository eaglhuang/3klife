/**
 * LongevityPillUseFlow.test.ts — 延壽丹背包入口與每將終生 3 顆上限（doc_spec_0316 §2；PROG-2-2105）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { addItem, ITEM_LONGEVITY_PILL, ITEM_REFRESH, itemCount, normalizeInventory, PlayerInventory } from '../assets/scripts/core/systems/PlayerInventory';
import { useLongevityPill } from '../assets/scripts/core/systems/LongevityPill';
import { ItemBagController, ItemBagGeneralTarget } from '../assets/scripts/ui/core/ItemBagController';
import { LONGEVITY_PILL_REJECT_TEXT, LongevityPillController } from '../assets/scripts/ui/core/LongevityPillController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'player', gender: '男', age: 40, hp: 1000,
        str: 60, int: 60, lea: 60, pol: 50, cha: 50, luk: 40, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic', ...extra,
    } as unknown as GeneralConfig;
}

function bag(initial: PlayerInventory, options: { noPicker?: boolean } = {}) {
    let inventory: PlayerInventory = { ...initial };
    const useItemCalls: string[] = [];
    const targetCalls: string[] = [];
    let pendingPick: ((target: ItemBagGeneralTarget) => void) | null = null;
    let picks = 0;
    const controller = new ItemBagController({
        inventory: () => inventory,
        useItem: (itemId) => { useItemCalls.push(itemId); return { ok: true, inventory }; },
        now: () => 1,
        generalTargetUses: {
            [ITEM_LONGEVITY_PILL]: async (target) => {
                targetCalls.push(target.id);
                if (target.id === 'boom') throw new Error('save failed');
                inventory = { ...inventory, [ITEM_LONGEVITY_PILL]: (inventory[ITEM_LONGEVITY_PILL] ?? 0) - 1 };
                return `${target.name} 服下`;
            },
        },
        pickGeneral: options.noPicker ? undefined : (onPick) => { picks++; pendingPick = onPick; },
    });
    return {
        controller, useItemCalls, targetCalls,
        pick: (target: ItemBagGeneralTarget) => pendingPick?.(target),
        picks: () => picks,
    };
}

export function createLongevityPillUseFlowSuite(): TestSuite {
    const suite = new TestSuite('LongevityPillUseFlow (延壽丹背包入口與 3 顆上限 PROG-2-2105)');
    const withPills = (n: number) => addItem(normalizeInventory({}), ITEM_LONGEVITY_PILL, n);

    suite.test('上限：已服 3 顆拒絕且不扣道具；舊檔缺值視為 0', () => {
        const inv = withPills(1);
        const full = useLongevityPill(inv, general('a', { longevityPillCount: 3 }));
        assert.equals('limit', full.ok ? '' : full.reason);
        assert.equals(1, itemCount(inv, ITEM_LONGEVITY_PILL));
        assert.isTrue(useLongevityPill(inv, general('b', { longevityPillCount: 2 })).ok);
        assert.isTrue(useLongevityPill(inv, general('c')).ok);
    });

    suite.test('上限：滿額又沒道具時說滿額；已辭世優先於滿額', () => {
        const full = useLongevityPill(normalizeInventory({}), general('a', { longevityPillCount: 3 }));
        assert.equals('limit', full.ok ? '' : full.reason);
        const dead = useLongevityPill(withPills(1), general('a', { longevityPillCount: 3, status: 'dead' }));
        assert.equals('dead', dead.ok ? '' : dead.reason);
    });

    suite.test('GameSession：第 4 顆拒絕不扣道具，次數隨存檔保留，每位武將各算各的', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general('a', { maxLifespan: 60 }), general('b', { maxLifespan: 50 })]));
        session.setSaveService(new PlayerSaveService(adapter));
        session.setAutoSave(true);
        session.startNewGame(7);
        await session.addItem(ITEM_LONGEVITY_PILL, 5);

        for (let i = 0; i < 3; i++) assert.isTrue((await session.useLongevityPillOnGeneral('a')).ok);
        const fourth = await session.useLongevityPillOnGeneral('a');
        assert.equals('limit', fourth.ok ? '' : fourth.reason);
        assert.equals(2, session.itemCount(ITEM_LONGEVITY_PILL));
        const lifespan = (s: GameSession, id: string) => (s.roster.find((g) => g.id === id) as unknown as { maxLifespan: number }).maxLifespan;
        assert.equals(69, lifespan(session, 'a'));
        assert.isTrue((await session.useLongevityPillOnGeneral('b')).ok, '另一位武將不受影響');

        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        await restored.load();
        const again = await restored.useLongevityPillOnGeneral('a');
        assert.equals('limit', again.ok ? '' : again.reason, '讀檔後次數還在');
        assert.equals(53, lifespan(restored, 'b'));
    });

    suite.test('提示文字：滿額有專屬說明', async () => {
        const ctrl = new LongevityPillController({
            session: { inventory: withPills(1), useLongevityPillOnGeneral: async () => ({ ok: false, reason: 'limit' }) },
        });
        assert.equals(LONGEVITY_PILL_REJECT_TEXT.limit, await ctrl.use('a', 'A'));
        assert.isTrue(LONGEVITY_PILL_REJECT_TEXT.limit.length > 0);
    });

    suite.test('背包：按使用先選將，選定後才進確認；確定才服用，不走 useItem', async () => {
        const h = bag(withPills(2));
        h.controller.select(0);
        h.controller.requestUse();
        assert.equals(1, h.picks());
        assert.isFalse(h.controller.getFlowView().actives.btnBagConfirm, '還沒選將不能確定');
        h.pick({ id: 'a', name: '關羽' });
        const view = h.controller.getFlowView();
        assert.isTrue(view.actives.btnBagConfirm);
        assert.isTrue(view.texts.bagMessage.includes('關羽'), view.texts.bagMessage);
        assert.equals(0, h.targetCalls.length, '確認前不扣');

        assert.isTrue(h.controller.hasUseTarget);
        await h.controller.confirmTargetUse();
        assert.equals('a', h.targetCalls.join(','));
        assert.equals(0, h.useItemCalls.length);
        assert.equals('關羽 服下', h.controller.getFlowView().texts.bagMessage);
        assert.isFalse(h.controller.hasUseTarget);
    });

    suite.test('背包：取消或換道具會清掉對象；連按確定只服一次', async () => {
        const h = bag({ ...withPills(2), [ITEM_REFRESH]: 1 });
        const pillIndex = h.controller.rows().findIndex((row) => row.itemId === ITEM_LONGEVITY_PILL);
        h.controller.select(pillIndex);
        h.controller.requestUse();
        h.pick({ id: 'a', name: '甲' });
        h.controller.cancelUse();
        assert.isFalse(h.controller.hasUseTarget);

        h.controller.requestUse();
        h.pick({ id: 'a', name: '甲' });
        h.controller.select(pillIndex === 0 ? 1 : 0);
        assert.isFalse(h.controller.hasUseTarget);

        h.controller.select(pillIndex);
        h.controller.requestUse();
        h.pick({ id: 'a', name: '甲' });
        const first = h.controller.confirmTargetUse();
        const second = h.controller.confirmTargetUse();
        await Promise.all([first, second]);
        assert.equals(1, h.targetCalls.length);
    });

    suite.test('背包：選將途中換了道具，晚到的選擇不生效', () => {
        const h = bag({ ...withPills(1), [ITEM_REFRESH]: 1 });
        const pillIndex = h.controller.rows().findIndex((row) => row.itemId === ITEM_LONGEVITY_PILL);
        h.controller.select(pillIndex);
        h.controller.requestUse();
        h.controller.select(pillIndex === 0 ? 1 : 0);
        h.pick({ id: 'a', name: '甲' });
        assert.isFalse(h.controller.hasUseTarget);
    });

    suite.test('背包：服用失敗顯示提示，不留在確認狀態', async () => {
        const h = bag(withPills(1));
        h.controller.select(0);
        h.controller.requestUse();
        h.pick({ id: 'boom', name: '甲' });
        await h.controller.confirmTargetUse();
        const view = h.controller.getFlowView();
        assert.isFalse(view.actives.btnBagConfirm);
        assert.isTrue(view.texts.bagMessage.length > 0);
    });

    suite.test('背包：沒接選將時顯示無法使用；一般道具仍走原本的確認流程', () => {
        const none = bag(withPills(1), { noPicker: true });
        none.controller.select(0);
        none.controller.requestUse();
        assert.equals('此道具目前無法使用', none.controller.getFlowView().texts.bagMessage);
        assert.isFalse(none.controller.getFlowView().actives.btnBagConfirm);

        const normal = bag({ [ITEM_REFRESH]: 1 });
        normal.controller.select(0);
        normal.controller.requestUse();
        assert.equals(0, normal.picks());
        assert.isFalse(normal.controller.hasUseTarget);
        normal.controller.confirmUse();
        assert.equals(ITEM_REFRESH, normal.useItemCalls.join(','));
    });

    return suite;
}
