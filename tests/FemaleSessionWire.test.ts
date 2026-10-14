// @spec-source → FEM 接線：傭兵池／救美刷新時間與送禮好感進存檔（PROG-2-0564）
/**
 * FemaleSessionWire — GameSession 女性來源狀態存讀與刷新 headless 測試（PROG-2-0564）
 */
import { assert, TestSuite } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';

const HOUR = 60 * 60 * 1000;

function createSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.5);
    return session;
}

export function createFemaleSessionWireSuite(): TestSuite {
    const suite = new TestSuite('FemaleSessionWire (女性來源狀態接線 FEM)');

    suite.test('送禮好感與刷新時間戳經存檔讀回', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter);
        assert.equals(40, session.giftFemale('f1', 40));
        session.refreshFemalePoolIfDue([{ id: 'f1', gender: '女' }], 5 * HOUR, () => 0.5);
        await session.save();

        const restored = createSession(adapter);
        assert.isTrue(await restored.load());
        assert.equals(40, restored.femaleSystemState.giftAffection.f1);
        assert.equals(5 * HOUR, restored.femaleSystemState.poolRefreshedAtMs);
    });

    suite.test('傭兵池：未滿 8 小時不刷新，滿 8 小時才抽出女性', () => {
        const session = createSession(new MemoryStorageAdapter());
        const candidates = [{ id: 'f1', gender: '女' }, { id: 'm1', gender: '男' }, { id: 'f2', gender: '女' }];
        const first = session.refreshFemalePoolIfDue(candidates, 0, () => 0.5);
        assert.isDefined(first);
        assert.isTrue(session.refreshFemalePoolIfDue(candidates, 8 * HOUR - 1, () => 0.5) === null);
        const later = session.refreshFemalePoolIfDue(candidates, 8 * HOUR, () => 0.5);
        assert.isDefined(later);
        assert.isFalse(later!.includes('m1'));
    });

    suite.test('地下城救美：未滿 8 小時回傳 null，到期才擲出結果', () => {
        const session = createSession(new MemoryStorageAdapter());
        assert.equals('commoner', session.rollDungeonRescueIfDue(0, () => 0.5)!);
        assert.isTrue(session.rollDungeonRescueIfDue(HOUR, () => 0.5) === null);
        assert.equals('noble', session.rollDungeonRescueIfDue(8 * HOUR, () => 0.95)!);
    });

    return suite;
}
