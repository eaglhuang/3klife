// @spec-source → 大廳系統規格書 doc_spec_0002 E-5；PROG-2-2252
/**
 * LobbyDialogueProvider.test.ts — 統一台詞接口：回退、通用台詞墊底、情境過濾、雲端殼的開關與失敗回退。
 * 純邏輯，不依賴 cc。
 */
import * as fs from 'fs';
import * as path from 'path';
import {
    CloudLobbyDialogueProvider,
    DEFAULT_CLOUD_DIALOGUE_CONFIG,
    LocalLobbyDialogueProvider,
    createLobbyDialogueProvider,
    eligibleLines,
    lobbyLinesFromBook,
    parseCloudDialogueConfig,
    periodOfHour,
    pickDialogueLine,
    type LobbyDialogueContext,
} from '../assets/scripts/core/systems/LobbyDialogueProvider';
import { HallChatStore, parseChatBook, type ChatBook, type ChatStorage } from '../assets/scripts/core/systems/HallChatLines';
import { TestSuite, assert } from './TestRunner';

class MemoryStorage implements ChatStorage {
    public readonly data = new Map<string, string>();
    get(key: string): string | null { return this.data.get(key) ?? null; }
    set(key: string, value: string): void { this.data.set(key, value); }
}

const CTX: LobbyDialogueContext = { friendship: 0, period: 'day', event: 'tap' };

const BUNDLED: ChatBook = {
    version: 1,
    generic: [{ id: 'g1', text: '通用一' }, { id: 'g2', text: '通用二' }],
    generals: {
        a: [{ id: 'a1', text: 'A1' }, { id: 'a2', text: 'A2' }, { id: 'a3', text: 'A3' }, { id: 'a4', text: 'A4 友誼', minFriendship: 30 }],
        solo: [{ id: 's1', text: 'S1' }],
    },
};

function bundledRaw(): unknown {
    const file = path.join(__dirname, '..', 'assets', 'resources', 'data', 'hall-map', 'hall-chat-lines.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function freshStore(): HallChatStore {
    return new HallChatStore(BUNDLED, new MemoryStorage());
}

export function createLobbyDialogueProviderSuite(): TestSuite {
    const suite = new TestSuite('LobbyDialogueProvider (大廳台詞統一接口 PROG-2-2252)');

    suite.test('本地實作：有專屬台詞就只給專屬台詞（不混入通用）', () => {
        const local = new LocalLobbyDialogueProvider(freshStore());
        const ids = local.getLines('a', CTX).map(l => l.id);
        assert.equals(3, ids.length);
        assert.isFalse(ids.includes('g1'));
    });

    suite.test('接口回退：武將沒有專屬台詞時用通用台詞', () => {
        const local = new LocalLobbyDialogueProvider(freshStore());
        const ids = local.getLines('nobody', CTX).map(l => l.id);
        assert.equals(2, ids.length);
        assert.isTrue(ids.every(id => id.startsWith('g')));
    });

    suite.test('沒有任何可用台詞時回傳空陣列（呼叫端不開泡泡）', () => {
        const empty: ChatBook = { version: 1, generic: [], generals: {} };
        const local = new LocalLobbyDialogueProvider(new HallChatStore(empty, null));
        assert.lengthEquals(0, local.getLines('nobody', CTX));
    });

    suite.test('友誼門檻：友誼不足時不說 minFriendship 的句子，夠了才解鎖', () => {
        const low = eligibleLines(BUNDLED.generals.a, { ...CTX, friendship: 0 }).map(l => l.id);
        assert.isFalse(low.includes('a4'));
        const high = eligibleLines(BUNDLED.generals.a, { ...CTX, friendship: 30 }).map(l => l.id);
        assert.isTrue(high.includes('a4'));
    });

    suite.test('情境過濾：限時段的句子只在該時段說；自薦事件只說 volunteer 句', () => {
        const lines = [
            { id: 'morning-only', text: '早安', periods: ['morning'] },
            { id: 'tap', text: '點我' },
            { id: 'vol', text: '讓我去', events: ['volunteer'] },
        ];
        assert.equals('morning-only', eligibleLines(lines, { ...CTX, period: 'morning' }).find(l => l.id === 'morning-only')!.id);
        assert.isFalse(eligibleLines(lines, { ...CTX, period: 'night' }).some(l => l.id === 'morning-only'));
        const vol = eligibleLines(lines, { ...CTX, event: 'volunteer' }).map(l => l.id);
        assert.equals(1, vol.length);
        assert.equals('vol', vol[0]);
    });

    suite.test('自薦提案：專屬台詞沒有 volunteer 句時，改用通用的提案台詞（gv1）', () => {
        const local = new LocalLobbyDialogueProvider(freshStore());
        const book: ChatBook = {
            version: 2,
            generic: [{ id: 'gv1', text: '讓我去', events: ['volunteer'] }, { id: 'g1', text: '通用' }],
            generals: { a: [{ id: 'a1', text: 'A1' }] },
        };
        const lines = lobbyLinesFromBook(book, 'a', { ...CTX, event: 'volunteer' });
        assert.equals(1, lines.length);
        assert.equals('gv1', lines[0].id);
        assert.isTrue(local.getLines('a', { ...CTX, event: 'volunteer' }).every(l => l.id.startsWith('gv')));
    });

    suite.test('挑句：有第二句可選時避開上一句；只有一句時照給', () => {
        const lines = [{ id: 'x', text: 'X' }, { id: 'y', text: 'Y' }];
        for (let i = 0; i < 20; i++) {
            const pick = pickDialogueLine(lines, 'x', () => 0);
            assert.equals('y', pick!.id);
        }
        assert.equals('solo', pickDialogueLine([{ id: 'solo', text: 'S' }], 'solo', () => 0)!.id);
        assert.isTrue(pickDialogueLine([], null, () => 0) === null);
    });

    suite.test('時段對照：5–9 晨、10–16 日、17–19 夕、其餘夜', () => {
        assert.equals('morning', periodOfHour(5));
        assert.equals('morning', periodOfHour(9));
        assert.equals('day', periodOfHour(10));
        assert.equals('day', periodOfHour(16));
        assert.equals('evening', periodOfHour(17));
        assert.equals('night', periodOfHour(20));
        assert.equals('night', periodOfHour(2));
    });

    suite.test('雲端殼預設關閉：內建 JSON 的 cloud 區段 enabled=false，不建立任何 fetcher，getLines 只走本地', () => {
        const cfg = parseCloudDialogueConfig(bundledRaw());
        assert.isFalse(cfg.enabled);
        let called = 0;
        const provider = createLobbyDialogueProvider(bundledRaw(), new HallChatStore(parseChatBook(bundledRaw())!, new MemoryStorage()), {
            fetcher: async () => { called++; return null; },
        });
        assert.equals('cloud', provider.source);
        const lines = provider.getLines('zhao-yun', CTX);
        assert.isTrue(lines.length >= 3);
        assert.equals(0, called);
        assert.equals(DEFAULT_CLOUD_DIALOGUE_CONFIG.timeoutMs, cfg.timeoutMs);
    });

    suite.test('雲端殼：開關開但沒有端點（fetcher 為 null）時等同關閉', () => {
        const raw = { ...(bundledRaw() as object), cloud: { enabled: true, endpoint: '' } };
        const provider = createLobbyDialogueProvider(raw, new HallChatStore(BUNDLED, new MemoryStorage()));
        assert.isFalse((provider as CloudLobbyDialogueProvider).active);
    });

    suite.test('雲端失敗回退：同步拋錯或逾時，refresh 回 false 不拋出，台詞照常由本地給', async () => {
        const store = new HallChatStore(BUNDLED, new MemoryStorage());
        const cfg = { enabled: true, endpoint: 'https://example.invalid', timeoutMs: 20, refreshSec: 600 };
        const failing = new CloudLobbyDialogueProvider(new LocalLobbyDialogueProvider(store), store, cfg, async () => { throw new Error('offline'); });
        assert.isFalse(await failing.refresh());
        const hanging = new CloudLobbyDialogueProvider(new LocalLobbyDialogueProvider(store), store, cfg, () => new Promise(() => { /* 永不回應 */ }));
        assert.isFalse(await hanging.refresh());
        assert.equals(3, hanging.getLines('a', CTX).length);
    });

    suite.test('雲端成功：較新的台詞包合併進快取（HallChatStore），之後本地即可讀到新句', async () => {
        const storage = new MemoryStorage();
        const store = new HallChatStore(BUNDLED, storage);
        const remote = { version: 2, generic: [], generals: { a: [{ id: 'a9', text: '來自伺服器' }] } };
        const cfg = { enabled: true, endpoint: 'https://example.invalid', timeoutMs: 1000, refreshSec: 600 };
        const provider = new CloudLobbyDialogueProvider(new LocalLobbyDialogueProvider(store), store, cfg, async () => remote);
        assert.isTrue(await provider.refresh());
        const texts = provider.getLines('a', CTX).map(l => l.text);
        assert.isTrue(texts.includes('來自伺服器'));
        assert.isTrue(storage.data.size > 0);
    });

    suite.test('雲端設定解析：缺欄位或格式錯用預設值（預設關閉）', () => {
        assert.isFalse(parseCloudDialogueConfig(null).enabled);
        assert.isFalse(parseCloudDialogueConfig({ cloud: 'x' }).enabled);
        const cfg = parseCloudDialogueConfig({ cloud: { enabled: true, endpoint: ' https://x ', timeoutMs: -1 } });
        assert.isTrue(cfg.enabled);
        assert.equals('https://x', cfg.endpoint);
        assert.equals(DEFAULT_CLOUD_DIALOGUE_CONFIG.timeoutMs, cfg.timeoutMs);
    });

    return suite;
}
