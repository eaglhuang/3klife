import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { femalePoolHireLabel } from '../assets/scripts/core/systems/FemalePoolRefresh';
import { ITEM_TRIAL_TICKET } from '../assets/scripts/core/systems/ItemDef';
import { MercenaryPanelController } from '../assets/scripts/ui/core/MercenaryPanelController';

const HOUR = 60 * 60 * 1000;
const T0 = 1_000_000_000;

const general = (id: string, gender: string, rarityTier: string) =>
    ({ id, name: id, gender, rarityTier, str: 50, int: 50, lea: 50, luk: 50 }) as unknown as GeneralConfig;

const GENERALS = [
    general('f1', '女', 'common'), general('f2', '女', 'rare'), general('f3', '女', 'rare'),
    general('f4', '女', 'rare'), general('f5', '女', 'rare'), general('f6', '女', 'rare'),
    general('ssr', '女', 'epic'), general('m1', '男', 'rare'),
];

function build(storage = new MemoryStorageAdapter(), random: () => number = () => 0): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(storage));
    session.setRandomSource(random);
    return session;
}

function trialDone(uid: string, generalId: string) {
    return { uid, generalId, daysLeft: 0, bond: 6, status: 'Trial' as const, affection: 60 };
}

export function createFemaleMercenaryPoolFlowSuite(): TestSuite {
    const suite = new TestSuite('FemaleMercenaryPoolFlow');

    suite.test('抽出的都是 SR~N 女將，男將與 SSR 不會入池', () => {
        const { ids, remainingMs } = build().femalePoolStatus(GENERALS, T0);
        assert.lengthEquals(4, ids);
        assert.isTrue(ids.every((id) => id.startsWith('f')));
        assert.equals(8 * HOUR, remainingMs);
    });

    suite.test('8 小時內同一批，滿 8 小時換批', () => {
        let roll = 0;
        const session = build(undefined, () => roll);
        const first = session.femalePoolStatus(GENERALS, T0).ids;
        roll = 0.99;
        assert.equals(first.join(), session.femalePoolStatus(GENERALS, T0 + 8 * HOUR - 1).ids.join());
        assert.isTrue(first.join() !== session.femalePoolStatus(GENERALS, T0 + 8 * HOUR).ids.join());
    });

    suite.test('名單與刷新時間跟著存檔', async () => {
        const storage = new MemoryStorageAdapter();
        const session = build(storage);
        const { ids } = session.femalePoolStatus(GENERALS, T0);
        await session.save();
        const loaded = build(storage, () => 0.99);
        await loaded.load();
        assert.equals(ids.join(), loaded.femalePoolStatus(GENERALS, T0 + HOUR).ids.join());
    });

    suite.test('武將資料還沒載入時不刷新，不會鎖住空池', () => {
        const session = build();
        assert.lengthEquals(0, session.femalePoolStatus([], T0).ids);
        assert.equals(null, session.femaleSystemState.poolRefreshedAtMs);
        assert.lengthEquals(4, session.femalePoolStatus(GENERALS, T0).ids);
    });

    suite.test('招募後從本批移除，扣一張試用券', async () => {
        const session = build();
        await session.addItem(ITEM_TRIAL_TICKET, 1);
        const tickets = session.itemCount(ITEM_TRIAL_TICKET);
        const { ids } = session.femalePoolStatus(GENERALS, T0);
        const template = GENERALS.find((g) => g.id === ids[0])!;
        assert.isTrue((await session.hireTrialMercenary('merc-1', template)).ok);
        assert.equals(tickets - 1, session.itemCount(ITEM_TRIAL_TICKET));
        assert.isFalse(session.femalePoolStatus(GENERALS, T0).ids.includes(ids[0]));
        assert.lengthEquals(3, session.femalePoolStatus(GENERALS, T0).ids);
    });

    suite.test('女將結義記傭兵來源，品質依稀有度；男將不記', async () => {
        const session = build();
        (session as unknown as { _bondPoints: number })._bondPoints = 5000;
        session.setMercenaries({
            mercenaries: [trialDone('a', 'f1'), trialDone('b', 'f2'), trialDone('c', 'ssr'), trialDone('d', 'm1')],
            upkeep: [], cooldowns: [], day: 0,
        });
        for (const [uid, id] of [['a', 'f1'], ['b', 'f2'], ['c', 'ssr'], ['d', 'm1']]) {
            assert.isTrue((await session.bondMercenaryToRoster(uid, GENERALS.find((g) => g.id === id)!)).ok);
        }
        assert.equals('MERCENARY', session.femaleSources.f1.Source_Type);
        assert.equals('R', session.femaleSources.f1.Quality_Grade);
        assert.equals('SR', session.femaleSources.f2.Quality_Grade);
        assert.equals('SR', session.femaleSources.ssr.Quality_Grade);
        assert.equals(undefined, session.femaleSources.m1);
    });

    suite.test('按鈕文字顯示人數與倒數', () => {
        assert.equals('招募女將（本批 3 位，7 小時 30 分後刷新）', femalePoolHireLabel(3, 7.5 * HOUR));
        assert.equals('招募女將（本批 0 位，5 分後刷新）', femalePoolHireLabel(0, 5 * 60 * 1000));
    });

    suite.test('面板：有人有券才可按；招完或沒券都不能招', async () => {
        let count = 2;
        let tickets = 1;
        const panel = new MercenaryPanelController({
            mercenaries: () => [],
            info: () => ({ originalOwnerName: '', generalName: '', rarity: 'R' }),
            bondPoints: () => 0,
            bond: async () => false,
            trialTickets: () => tickets,
            femalePool: () => ({ count, remainingMs: HOUR }),
            hireFemale: async () => (count > 0 ? '貂蟬' : null),
        });
        assert.isTrue(panel.getFlowView().actives.btnMercHireFemale);
        assert.isTrue(panel.getFlowView().enabled.btnMercHireFemale);
        count = 0;
        assert.isFalse(panel.getFlowView().enabled.btnMercHireFemale);
        assert.isFalse(await panel.hireFemale());
        assert.equals('本批女將已招完', panel.getFlowView().texts.mercNotice);
        count = 2;
        tickets = 0;
        assert.isFalse(panel.getFlowView().enabled.btnMercHireFemale);
        assert.isFalse(await panel.hireFemale());
        assert.equals('試用券不足', panel.getFlowView().texts.mercNotice);
    });

    suite.test('沒接女將池時按鈕隱藏', () => {
        const panel = new MercenaryPanelController({
            mercenaries: () => [],
            info: () => ({ originalOwnerName: '', generalName: '', rarity: 'R' }),
            bondPoints: () => 0,
            bond: async () => false,
        });
        assert.isFalse(panel.getFlowView().actives.btnMercHireFemale);
    });

    return suite;
}
