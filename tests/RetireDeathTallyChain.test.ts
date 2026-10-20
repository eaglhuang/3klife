/**
 * RetireDeathTallyChain — 出征戰績 → 退役 → 壽命耗盡死亡 → 虎符產出 的一條龍（QA 線整合）
 *
 * 缺口：各段單元測試分開驗戰績累計、退役、陣亡產卡；這裡確認戰績真的流進陣亡虎符的品質與兵種，
 * 退役不產卡，死亡只產一張，存檔往返不遺失。
 */
import { assert, TestSuite } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService, normalizeTallyCardsMap } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
        ...extra,
    } as unknown as GeneralConfig;
}

function createSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.startNewGame(20261014);
    session.setRandomSource(() => 0.99);
    return session;
}

const canonical = (value: unknown): string => JSON.stringify(value);

export function createRetireDeathTallyChainSuite(): TestSuite {
    const suite = new TestSuite('RetireDeathTallyChain (出征→退役→死亡→虎符 一條龍)');

    suite.test('戰績累計進陣亡虎符的品質與兵種；武職退役產一張退役虎符；死亡只產一張陣亡虎符；存檔往返不遺失', async () => {
        const adapter = new MemoryStorageAdapter();
        const roster = [
            // 剩 3 個月壽命：之後結緣扣 6 個月即死亡
            general('hero', 59.75, { isHistorical: true, maxLifespan: 60, troopAptitude: { CAVALRY: 'S', INFANTRY: 'B' } }),
            general('vet', 70, { isHistorical: true, maxLifespan: 90, primaryClass: 'Warrior' }),
        ];
        const a = createSession(adapter, roster);

        // 出征：三場勝利，每場擊殺 10
        for (let i = 0; i < 3; i += 1) {
            await a.recordBattle(['hero'], 'player-win', {
                performance: { hero: { kills: 10, damageDealt: 0, damageTaken: 0, healingDone: 0 } },
            });
        }
        const record = (a.roster.find((g) => g.id === 'hero') as { battleRecord?: { wins: number; kills?: number } }).battleRecord;
        assert.equals(3, record?.wins ?? -1);
        assert.equals(30, record?.kills ?? -1);

        // 武職退役：發一張退役虎符，由君主持有
        await a.retireGeneral('vet');
        const retireCards = Object.values(a.tallyCards);
        assert.equals(1, retireCards.length, '武職退役發一張虎符');
        assert.equals('retire', retireCards[0].source);
        assert.equals('vet', retireCards[0].sourceGeneralUid);
        assert.isTrue(a.tallyHoldings[retireCards[0].uid] === null, '退役虎符由君主持有');

        // 死亡 → 季結產卡（退役的 vet 不會再走陣亡產卡）
        const spent = a.spendLifespan('hero', 'breeding');
        assert.isTrue(spent?.events.some((e) => e.type === 'died') ?? false, '壽命不足應死亡');
        await a.advanceSeason();
        const cards = Object.values(a.tallyCards).filter((c) => c.source === 'death');
        assert.equals(1, cards.length, '死亡只產一張陣亡虎符');
        const card = cards[0];
        assert.equals('hero', card.sourceGeneralUid);
        assert.equals('death', card.source);
        assert.equals('SSR', card.quality, '3 勝 30 殺 → 戰績分封頂 100，主分數 70 → SSR');
        assert.equals('cavalry', card.troopType ?? '', '主兵種由適性推出');
        assert.isTrue(a.tallyHoldings[card.uid] === null, '陣亡虎符由君主持有');

        // 再過一季不重複產卡
        await a.advanceSeason();
        assert.equals(1, Object.values(a.tallyCards).filter((c) => c.source === 'death').length);

        // 存檔往返
        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await b.load());
        assert.equals(canonical(normalizeTallyCardsMap(a.tallyCards)), canonical(b.tallyCards));
        assert.equals(canonical(a.tallyHoldings), canonical(b.tallyHoldings));
    });

    suite.test('退役的武將之後壽命耗盡或超齡死亡，不會再發第二張虎符', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, [
            general('vet', 70, { isHistorical: true, maxLifespan: 71, primaryClass: 'Warrior' }),
        ]);
        await a.retireGeneral('vet');
        assert.equals(1, Object.values(a.tallyCards).length, '退役時發一張虎符');

        // 退役者仍留在名冊（只標 isMentorCard），壽命耗盡後的死亡結算不得再產卡
        for (let i = 0; i < 4; i += 1) a.spendLifespan('vet', 'breeding');
        await a.advanceSeason();
        await a.advanceSeason();
        assert.equals(0, Object.values(a.tallyCards).filter((c) => c.source === 'death').length, '退役者死亡不產陣亡虎符');
        assert.equals(1, Object.keys(a.tallyCards).length, '全程只有退役那一張');
    });

    suite.test('退役的武將純超齡（季結增齡）死亡，不會再發第二張虎符', async () => {
        const adapter = new MemoryStorageAdapter();
        // 年齡已過壽命上限：季結增齡時以機率判定死亡，這裡強制擲出最小值讓它必死
        const a = createSession(adapter, [
            general('vet', 70, { isHistorical: true, maxLifespan: 70, primaryClass: 'Warrior' }),
        ]);
        await a.retireGeneral('vet');
        const died: string[] = [];
        a.setEventEmitter({
            emit: (name: string, payload?: unknown) => {
                if (name === GAME_SESSION_EVENTS.GeneralDied) died.push((payload as { generalId: string }).generalId);
            },
        });
        a.setRandomSource(() => 0);
        await a.advanceSeason();

        assert.equals('vet', died.join(','), '超齡退役者應由季結增齡死亡');
        assert.equals(0, Object.values(a.tallyCards).filter((c) => c.source === 'death').length, '超齡死亡不產陣亡虎符');
        assert.equals(1, Object.keys(a.tallyCards).length, '全程只有退役那一張虎符');
    });

    suite.test('沒有出征戰績的名將死亡：仍產卡，但品質只有最低（R）', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, [general('hero', 59.75, { isHistorical: true, maxLifespan: 60 })]);
        a.spendLifespan('hero', 'breeding');
        await a.advanceSeason();
        const cards = Object.values(a.tallyCards);
        assert.equals(1, cards.length);
        assert.equals('R', cards[0].quality);
    });

    return suite;
}
