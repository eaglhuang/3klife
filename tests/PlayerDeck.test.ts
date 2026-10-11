/**
 * PlayerDeck.test.ts — 玩家出戰卡組：規則、存檔、讀檔、帶進戰場（PROG-2-0030，headless）
 *
 * Unity 對照：EditMode Test，不開 Scene，直接驗證 DeckBuilder 規則 + SaveData 序列化 + BattleHandManager。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PLAYER_SAVE_KEY, PlayerSaveService, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { normalizeDeck, PLAYER_DECK_MAX_SIZE, toggleDeckCard } from '../assets/scripts/core/services/PlayerDeckRules';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';
import { buildTallyCards, getTallyCardCatalogIds } from '../assets/scripts/battle/views/BattleSceneLoader';
import { getTallyCardSummaries } from '../assets/scripts/core/config/TallyCardCatalog';

function createSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

export function createPlayerDeckSuite(): TestSuite {
    const suite = new TestSuite('PlayerDeck (玩家卡組存檔)');
    const catalog = getTallyCardCatalogIds();

    suite.test('normalizeDeck：去掉非字串 / 空 / 重複 / 目錄外，並截到上限', () => {
        assert.equals('a,b', normalizeDeck(['a', '', 'a', 3, null, 'b']).join(','));
        assert.equals('a', normalizeDeck(['a', 'x'], ['a']).join(','));
        assert.equals(PLAYER_DECK_MAX_SIZE, normalizeDeck(['1', '2', '3', '4', '5', '6']).length);
        assert.equals(0, normalizeDeck(undefined).length);
    });

    suite.test('toggleDeckCard：加入、移除、卡組滿、未知卡', () => {
        const ids = ['a', 'b', 'c', 'd', 'e'];
        let deck: string[] = [];
        for (const id of ['a', 'b', 'c', 'd']) {
            const r = toggleDeckCard(deck, id, ids);
            assert.equals('added', r.outcome);
            deck = r.deck;
        }
        const full = toggleDeckCard(deck, 'e', ids);
        assert.equals('full', full.outcome);
        assert.equals('a,b,c,d', full.deck.join(','));
        const removed = toggleDeckCard(deck, 'b', ids);
        assert.equals('removed', removed.outcome);
        assert.equals('a,c,d', removed.deck.join(','));
        assert.equals('unknown', toggleDeckCard([], 'zzz', ids).outcome);
    });

    suite.test('舊存檔沒有 deck 欄位：讀回補空卡組', () => {
        const snapshot = validatePlayerSaveSnapshot({ schemaVersion: 1, savedAt: 'x', gameTime: createInitialGameTimeState(), roster: [] });
        assert.equals(0, snapshot.deck.length);
    });

    suite.test('存檔 deck 型別錯誤：拋錯，不當成新局覆蓋', () => {
        let threw = false;
        try {
            validatePlayerSaveSnapshot({ schemaVersion: 1, savedAt: 'x', gameTime: createInitialGameTimeState(), roster: [], deck: 'oops' });
        } catch {
            threw = true;
        }
        assert.isTrue(threw, 'deck 非陣列應拋錯');
    });

    suite.test('GameSession：選卡自動存檔，重開後讀回同順序，並廣播 DeckChanged', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter);
        const events: string[][] = [];
        session.setEventEmitter({
            emit: (name, payload) => {
                if (name === GAME_SESSION_EVENTS.DeckChanged) {
                    events.push(payload as string[]);
                }
            },
        });
        const picked = [catalog[catalog.length - 1], catalog[0]];
        assert.equals('added', await session.toggleDeckCard(picked[0], catalog));
        assert.equals('added', await session.toggleDeckCard(picked[1], catalog));
        assert.equals(2, events.length);

        const reopened = createSession(adapter);
        assert.isTrue(await reopened.load(), '應讀到存檔');
        assert.equals(picked.join(','), reopened.deck.join(','));
    });

    suite.test('GameSession：setDeck 過濾未知 ID；startNewGame 清空卡組', async () => {
        const session = createSession(new MemoryStorageAdapter());
        const deck = await session.setDeck([catalog[0], 'not-a-card', catalog[0]], catalog);
        assert.equals(catalog[0], deck.join(','));
        session.startNewGame();
        assert.equals(0, session.deck.length);
    });

    suite.test('GameSession：卡組滿時 toggle 回報 full 且不存檔變動', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter);
        const ids = ['a', 'b', 'c', 'd', 'e'];
        for (const id of ids.slice(0, 4)) {
            await session.toggleDeckCard(id, ids);
        }
        assert.equals('full', await session.toggleDeckCard('e', ids));
        assert.equals('a,b,c,d', session.deck.join(','));
    });

    suite.test('整合：存檔 → 讀檔 → 戰場手牌依玩家選的順序發牌', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter);
        const picked = [catalog[catalog.length - 1], catalog[1]];
        await session.setDeck(picked, catalog);

        const reopened = createSession(adapter);
        await reopened.load();
        const hand = buildTallyCards(reopened.deck);
        assert.equals(picked.join(','), hand.map((card) => card.tacticId).join(','));
    });

    suite.test('存檔內有已下架卡片 ID：讀檔照單全收，戰場端略過並仍可發牌', async () => {
        const adapter = new MemoryStorageAdapter();
        await adapter.set(PLAYER_SAVE_KEY, {
            schemaVersion: 1, savedAt: 'x', gameTime: createInitialGameTimeState(), roster: [], deck: ['retired-card', catalog[0]],
        });
        const session = createSession(adapter);
        await session.load();
        assert.equals('retired-card,' + catalog[0], session.deck.join(','));
        assert.equals(catalog[0], buildTallyCards(session.deck).map((card) => card.tacticId).join(','));
    });

    suite.test('選卡摘要：每張目錄卡都有名稱', () => {
        const summaries = getTallyCardSummaries();
        assert.equals(catalog.length, summaries.length);
        assert.isTrue(summaries.every((entry) => entry.name.length > 0), '應有顯示名稱');
    });

    return suite;
}
