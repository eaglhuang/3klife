// @spec-source → Issue #2135（大廳點武將聊天、離線台詞與連線同步）；PROG-2-2251
/**
 * HallChatLines.test.ts — 台詞解析、友誼門檻、挑選、離線快取與同步
 * Unity 對照：對 ScriptableObject 台詞底稿＋PlayerPrefs 快取做單元測試。
 */
import * as fs from 'fs';
import * as path from 'path';
import {
    HALL_CHAT_CACHE_KEY,
    HALL_CHAT_MIN_LINES,
    HallChatStore,
    generalsMissingLines,
    mergeChatBooks,
    parseChatBook,
    pickChatLine,
    unlockedLines,
    type ChatBook,
    type ChatStorage,
} from '../assets/scripts/core/systems/HallChatLines';
import { TestSuite, assert } from './TestRunner';

const BOOK: ChatBook = {
    version: 1,
    generic: [{ id: 'g1', text: '通用一' }, { id: 'g2', text: '通用二' }],
    generals: {
        a: [{ id: 'a1', text: 'A1' }, { id: 'a2', text: 'A2' }, { id: 'a3', text: 'A3' }, { id: 'a4', text: 'A4 友誼', minFriendship: 30 }],
        solo: [{ id: 's1', text: 'S1' }],
    },
};

class MemoryStorage implements ChatStorage {
    public readonly data = new Map<string, string>();
    get(key: string): string | null { return this.data.get(key) ?? null; }
    set(key: string, value: string): void { this.data.set(key, value); }
}

function bundled(): unknown {
    const file = path.join(__dirname, '..', 'assets', 'resources', 'data', 'hall-map', 'hall-chat-lines.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function createHallChatLinesSuite(): TestSuite {
    const suite = new TestSuite('HallChatLines (大廳聊天台詞 Issue #2135)');

    suite.test('內建台詞檔可解析；已有骨架的四位武將各至少三句，通用台詞至少三句墊底', () => {
        const book = parseChatBook(bundled());
        assert.isTrue(book !== null);
        assert.equals(0, generalsMissingLines(book!, ['zhao-yun', 'zhang-fei', 'guan-yu', 'lu-bu']).length);
        assert.isTrue(book!.generic.length >= HALL_CHAT_MIN_LINES);
    });

    suite.test('解析：格式錯誤回 null；壞掉的單句與重複 id 被略過，不會讓整包失敗', () => {
        assert.isTrue(parseChatBook(null) === null);
        assert.isTrue(parseChatBook({ generals: {} }) === null, '沒有版本號');
        const book = parseChatBook({
            version: 2,
            generic: [{ id: 'x', text: '好' }, { id: 'x', text: '重複' }, { text: '沒 id' }, { id: 'y', text: '  ' }],
            generals: { a: [{ id: 'a1', text: 'ok', minFriendship: 'bad' }], b: 'oops' },
        })!;
        assert.equals(1, book.generic.length);
        assert.equals(1, book.generals.a.length);
        assert.equals(undefined, book.generals.a[0].minFriendship);
        assert.isFalse('b' in book.generals);
    });

    suite.test('友誼門檻：友誼不夠說不到那句，夠了才會出現', () => {
        assert.equals(3, unlockedLines(BOOK, 'a', 0).length);
        assert.equals(4, unlockedLines(BOOK, 'a', 30).length);
        let sawLocked = false;
        for (let i = 0; i < 50; i++) if (pickChatLine(BOOK, 'a', 0, null, () => i / 50)?.line.id === 'a4') sawLocked = true;
        assert.isFalse(sawLocked);
        assert.equals('a4', pickChatLine(BOOK, 'a', 30, null, () => 0.99)?.line.id);
    });

    suite.test('挑句：連點不重複同一句；只有一句時照說；沒專屬台詞退通用；全都沒有回 null', () => {
        const next = pickChatLine(BOOK, 'a', 0, 'a1', () => 0)!;
        assert.isTrue(next.line.id !== 'a1');
        assert.isFalse(next.generic);
        assert.equals('s1', pickChatLine(BOOK, 'solo', 0, 's1', () => 0)!.line.id);
        const fallback = pickChatLine(BOOK, 'nobody', 0, null, () => 0)!;
        assert.isTrue(fallback.generic);
        assert.equals('g1', fallback.line.id);
        assert.isTrue(pickChatLine({ version: 0, generic: [], generals: {} }, 'a', 0, null, () => 0) === null);
    });

    suite.test('缺台詞清單：擁有但專屬台詞（友誼 0）少於三句的武將', () => {
        assert.equals('solo,new', generalsMissingLines(BOOK, ['a', 'solo', 'new']).join(','));
    });

    suite.test('合併：同編號覆蓋、新編號附加、版本取大；不改輸入', () => {
        const before = JSON.stringify(BOOK);
        const merged = mergeChatBooks(BOOK, {
            version: 3,
            generic: [{ id: 'g2', text: '新通用二' }],
            generals: { a: [{ id: 'a2', text: '新A2' }, { id: 'a5', text: 'A5' }], b: [{ id: 'b1', text: 'B1' }] },
        });
        assert.equals(3, merged.version);
        assert.equals('新通用二', merged.generic[1].text);
        assert.equals('新A2', merged.generals.a[1].text);
        assert.equals(5, merged.generals.a.length);
        assert.equals(1, merged.generals.b.length);
        assert.equals(before, JSON.stringify(BOOK));
    });

    suite.test('離線快取：下載的新版寫進本機，下次啟動與內建底稿合併；內建新增的句子不會被舊快取蓋掉', () => {
        const storage = new MemoryStorage();
        const first = new HallChatStore(BOOK, storage);
        assert.isTrue(first.applyDownloaded({ version: 2, generals: { b: [{ id: 'b1', text: '下載的' }] } }));
        assert.isTrue(storage.data.has(HALL_CHAT_CACHE_KEY));
        const bundledNewer: ChatBook = { ...BOOK, version: 2, generals: { ...BOOK.generals, c: [{ id: 'c1', text: '內建新增' }] } };
        const second = new HallChatStore(bundledNewer, storage);
        assert.equals('下載的', second.book.generals.b[0].text);
        assert.equals('內建新增', second.book.generals.c[0].text);
    });

    suite.test('同步：版本沒比較新或格式錯誤不更新；錯誤與沒有 fetcher 都安靜回 false', async () => {
        const storage = new MemoryStorage();
        const store = new HallChatStore(BOOK, storage);
        assert.isFalse(store.applyDownloaded({ version: 1, generals: {} }), '同版本不更新');
        assert.isFalse(store.applyDownloaded('壞資料'));
        assert.isFalse(await store.sync(null));
        assert.isFalse(await store.sync(() => Promise.reject(new Error('offline'))));
        assert.isFalse(storage.data.has(HALL_CHAT_CACHE_KEY), '失敗不寫快取');
        assert.isTrue(await store.sync(() => Promise.resolve({ version: 5, generic: [{ id: 'g9', text: '新' }], generals: {} })));
        assert.equals(5, store.book.version);
    });

    suite.test('壞掉的快取或儲存失敗不影響使用', () => {
        const storage = new MemoryStorage();
        storage.set(HALL_CHAT_CACHE_KEY, '{不是 json');
        const store = new HallChatStore(BOOK, storage);
        assert.equals(1, store.book.version);
        const failing: ChatStorage = { get: () => null, set: () => { throw new Error('quota'); } };
        const store2 = new HallChatStore(BOOK, failing);
        assert.isTrue(store2.applyDownloaded({ version: 9, generals: {} }), '存不進去仍套用到記憶體');
    });

    suite.test('負值 minFriendship（段 0 敵意台詞）保留在 [-100, 100] 內，超界或非數字視為 0', () => {
        const book = parseChatBook({
            version: 1,
            generic: [{ id: 'g', text: '通用' }],
            generals: { a: [
                { id: 'hostile', text: '哼', minFriendship: -100 },
                { id: 'cold', text: '冷', minFriendship: -30 },
                { id: 'out', text: '超界', minFriendship: -500 },
            ] },
        })!;
        assert.equals(-100, book.generals.a[0].minFriendship);
        assert.equals(-30, book.generals.a[1].minFriendship);
        assert.equals(undefined, book.generals.a[2].minFriendship);
        assert.equals(1, unlockedLines(book, 'a', -50).length, '友誼 -50 只解鎖 -100 那句');
        assert.equals(3, unlockedLines(book, 'a', 0).length, '友誼 0 解鎖三句（含 -30）');
    });

    return suite;
}
