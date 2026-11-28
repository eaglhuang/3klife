/**
 * AvatarTalk — 頭像點擊一定說話：選句順序、友誼段、連點換句與冷卻、保底、泡泡擺位（PROG-2-9885）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    AVATAR_TALK_COOLDOWN_MS,
    AVATAR_TALK_GENERIC_COUNT,
    AVATAR_TALK_LAST_RESORT,
    AvatarTalkPicker,
    layoutAvatarBubble,
    type AvatarTalkDeps,
} from '../assets/scripts/core/systems/AvatarTalk';
import { LocalLobbyDialogueProvider } from '../assets/scripts/core/systems/LobbyDialogueProvider';
import { HallChatStore, type ChatBook } from '../assets/scripts/core/systems/HallChatLines';
import { NpcDialogueCache } from '../assets/scripts/core/dialogue/NpcDialogueCache';
import type { NpcDialogueRequest, NpcDialogueResponse } from '../assets/scripts/core/services/NpcDialogueService';

const BOOK: ChatBook = {
    version: 1,
    generic: [{ id: 'g1', text: '通用一' }, { id: 'g2', text: '通用二' }],
    generals: {
        'zhang-fei': [
            { id: 'a', text: '俺是張飛' },
            { id: 'b', text: '喝酒去' },
            { id: 'hi', text: '大哥好兄弟', minFriendship: 60 },
            { id: 'task', text: '主公，「{task}」交給我！' },
        ],
    },
};

const I18N: Record<string, string> = {};
for (let i = 1; i <= AVATAR_TALK_GENERIC_COUNT; i++) I18N[`ui.avatarTalk.generic.${i}`] = `保底${i}`;

function makeDeps(over: Partial<AvatarTalkDeps> & { clock?: { t: number }; friendshipValue?: number } = {}): AvatarTalkDeps {
    const store = new HallChatStore(BOOK, null);
    const provider = new LocalLobbyDialogueProvider(store);
    const clock = over.clock ?? { t: 1_000_000 };
    let seed = 0;
    return {
        provider: () => provider,
        cacheLine: () => null,
        friendship: () => over.friendshipValue ?? 0,
        translate: (key) => I18N[key] ?? key,
        random: () => { seed = (seed + 0.37) % 1; return seed; },
        nowMs: () => clock.t,
        hour: () => 12,
        ...(over.provider ? { provider: over.provider } : {}),
        ...(over.cacheLine ? { cacheLine: over.cacheLine } : {}),
        ...(over.translate ? { translate: over.translate } : {}),
    };
}

function req(generalId: string): NpcDialogueRequest {
    return { generalId, selectedKeywordKeys: ['k'], locale: 'zh-TW' };
}
function res(generalId: string, text: string, fallbackUsed = false): NpcDialogueResponse {
    return { generalId, text, evidenceRefs: ['e'], usedKeywords: [], rejectedKeywordKeys: [], fallbackUsed, generationMode: 'rag' } as NpcDialogueResponse;
}

export function createAvatarTalkSuite(): TestSuite {
    const suite = new TestSuite('AvatarTalk 頭像點擊說話 (PROG-2-9885)');

    suite.test('有專屬台詞：說專屬句，且不說含 {task} 佔位的自薦句', () => {
        const clock = { t: 0 };
        const picker = new AvatarTalkPicker(makeDeps({ clock }));
        for (let i = 0; i < 10; i++) {
            clock.t += AVATAR_TALK_COOLDOWN_MS + 1;
            const r = picker.speak('zhang-fei');
            assert.equals('line', r.kind);
            if (r.kind !== 'line') return;
            assert.equals('book', r.source);
            assert.isTrue(['a', 'b'].includes(r.lineId), `友誼 0 只能說 a/b，實得 ${r.lineId}`);
        }
    });

    suite.test('友誼段：友誼夠高才會說到高友誼句', () => {
        const clock = { t: 0 };
        const low = new AvatarTalkPicker(makeDeps({ clock, friendshipValue: 0 }));
        const high = new AvatarTalkPicker(makeDeps({ clock, friendshipValue: 80 }));
        const seenLow = new Set<string>();
        const seenHigh = new Set<string>();
        for (let i = 0; i < 12; i++) {
            clock.t += AVATAR_TALK_COOLDOWN_MS + 1;
            const l = low.speak('zhang-fei');
            const h = high.speak('zhang-fei');
            if (l.kind === 'line') seenLow.add(l.lineId);
            if (h.kind === 'line') seenHigh.add(h.lineId);
        }
        assert.isTrue(!seenLow.has('hi'), '友誼 0 不該說高友誼句');
        assert.isTrue(seenHigh.has('hi'), '友誼 80 應說到高友誼句');
    });

    suite.test('連點換句：間隔夠長時不連續說同一句', () => {
        const clock = { t: 0 };
        const picker = new AvatarTalkPicker(makeDeps({ clock }));
        let prev = '';
        for (let i = 0; i < 10; i++) {
            clock.t += AVATAR_TALK_COOLDOWN_MS + 1;
            const r = picker.speak('zhang-fei');
            assert.equals('line', r.kind);
            if (r.kind !== 'line') return;
            assert.isTrue(r.lineId !== prev, `第 ${i} 次重複了 ${prev}`);
            prev = r.lineId;
        }
    });

    suite.test('冷卻：極短間隔的重複點擊不換句，過了間隔才再說', () => {
        const clock = { t: 5000 };
        const picker = new AvatarTalkPicker(makeDeps({ clock }));
        assert.equals('line', picker.speak('zhang-fei').kind);
        clock.t += AVATAR_TALK_COOLDOWN_MS - 1;
        assert.equals('cooldown', picker.speak('zhang-fei').kind);
        // 別的武將不受影響
        assert.equals('line', picker.speak('zhao-yun').kind);
        clock.t += 2;
        assert.equals('line', picker.speak('zhang-fei').kind);
    });

    suite.test('沒有專屬台詞的武將：用大廳通用台詞（仍是 book 來源）', () => {
        const r = new AvatarTalkPicker(makeDeps()).speak('unknown-general');
        assert.equals('line', r.kind);
        if (r.kind !== 'line') return;
        assert.equals('book', r.source);
        assert.isTrue(r.text.startsWith('通用'));
    });

    suite.test('AI 快取優先；下一次點擊換底稿句，再下一次又回 AI 句（輪流不連播）', () => {
        const cache = new NpcDialogueCache();
        cache.put(req('zhang-fei'), res('zhang-fei', '今日酒香，俺想起桃園三結義。'), 10);
        const clock = { t: 0 };
        const picker = new AvatarTalkPicker(makeDeps({ clock, cacheLine: (id) => cache.latestFor(id, 'zh-TW') }));
        const sources: string[] = [];
        for (let i = 0; i < 4; i++) {
            clock.t += AVATAR_TALK_COOLDOWN_MS + 1;
            const r = picker.speak('zhang-fei');
            if (r.kind === 'line') sources.push(r.source);
        }
        assert.equals('cache,book,cache,book', sources.join(','));
    });

    suite.test('快取：降級句與他語系不採用；latestFor 取最新', () => {
        const cache = new NpcDialogueCache();
        cache.put(req('zhang-fei'), res('zhang-fei', '降級句', true), 99);
        assert.equals(null, cache.latestFor('zhang-fei', 'zh-TW'));
        cache.put({ ...req('zhang-fei'), contextKey: 'c1' }, res('zhang-fei', '舊句'), 1);
        cache.put({ ...req('zhang-fei'), contextKey: 'c2' }, res('zhang-fei', '新句'), 2);
        cache.put({ ...req('zhang-fei'), contextKey: 'c3', locale: 'en' }, res('zhang-fei', 'English line'), 3);
        assert.equals('新句', cache.latestFor('zhang-fei', 'zh-TW')?.text);
        assert.equals('English line', cache.latestFor('zhang-fei', 'en')?.text);
        assert.equals(null, cache.latestFor('zhao-yun', 'zh-TW'));
    });

    suite.test('台詞庫空或接口未建立：走 i18n 保底通用句，仍然有聲且連點換句', () => {
        const clock = { t: 0 };
        const picker = new AvatarTalkPicker(makeDeps({ clock, provider: () => null }));
        let prev = '';
        for (let i = 0; i < 8; i++) {
            clock.t += AVATAR_TALK_COOLDOWN_MS + 1;
            const r = picker.speak('zhang-fei');
            assert.equals('line', r.kind);
            if (r.kind !== 'line') return;
            assert.equals('generic', r.source);
            assert.isTrue(r.text.startsWith('保底'));
            assert.isTrue(r.lineId !== prev, '保底句不連播同一句');
            prev = r.lineId;
        }
    });

    suite.test('連 i18n 都沒載入：最後一道符號句，絕不回傳空字串', () => {
        const picker = new AvatarTalkPicker(makeDeps({ provider: () => null, translate: (key) => key }));
        const r = picker.speak('zhang-fei');
        assert.equals('line', r.kind);
        if (r.kind !== 'line') return;
        assert.equals(AVATAR_TALK_LAST_RESORT, r.text);
    });

    suite.test('泡泡擺位：貼頭像上方；頂端放不下改下方；左右夾在畫面內', () => {
        const base = { canvasWidth: 1280, canvasHeight: 720, fontSize: 24, maxWidth: 420, padding: 16, margin: 12, textLength: 20 };
        const mid = layoutAvatarBubble({ ...base, anchor: { x: 0, y: 0, width: 80, height: 80 } });
        assert.equals('above', mid.side);
        assert.isTrue(mid.y > 40, '中央頭像泡泡在上方');
        const top = layoutAvatarBubble({ ...base, anchor: { x: 0, y: 330, width: 60, height: 60 } });
        assert.equals('below', top.side);
        const edge = layoutAvatarBubble({ ...base, anchor: { x: 630, y: 0, width: 80, height: 80 } });
        assert.isTrue(edge.x + edge.width / 2 <= 640 - 12 + 0.001, '不超出右邊界');
        const left = layoutAvatarBubble({ ...base, anchor: { x: -900, y: -400, width: 80, height: 80 } });
        assert.isTrue(left.x - left.width / 2 >= -640 + 12 - 0.001 && left.y - left.height / 2 >= -360 + 12 - 0.001, '不超出左下邊界');
    });

    suite.test('泡泡避讓按鈕：上方有按鈕就換下方；四邊都有按鈕時選壓得最少的', () => {
        const base = { canvasWidth: 1280, canvasHeight: 720, fontSize: 24, maxWidth: 420, padding: 16, margin: 12, textLength: 20 };
        const anchor = { x: 0, y: 0, width: 80, height: 80 };
        const buttonAbove = { x: 0, y: 90, width: 300, height: 60 };
        const free = layoutAvatarBubble({ ...base, anchor, avoid: [buttonAbove] });
        assert.equals('below', free.side);
        assert.equals(0, free.overlap);
        const buttonBelow = { x: 0, y: -90, width: 300, height: 60 };
        const tight = layoutAvatarBubble({ ...base, anchor, avoid: [buttonAbove, buttonBelow] });
        assert.equals(0, tight.overlap, '上下被擋時改放右側或左側');
        assert.isTrue(tight.side === 'right' || tight.side === 'left');
        const wall = [buttonAbove, buttonBelow, { x: 300, y: 0, width: 400, height: 200 }, { x: -300, y: 0, width: 400, height: 200 }];
        const topFree = layoutAvatarBubble({ ...base, anchor, avoid: wall });
        assert.equals(0, topFree.overlap, '四邊都被擋時，保底貼畫面頂端避開按鈕');
        const sealed = [...wall, { x: 0, y: 330, width: 1280, height: 120 }, { x: 0, y: -330, width: 1280, height: 120 }];
        const worst = layoutAvatarBubble({ ...base, anchor, avoid: sealed });
        assert.isTrue(worst.overlap > 0, '無處可放時仍回傳（壓到最少的位置），不丟錯');
    });

    suite.test('大廳選主將／選卡組 host 不吃整頁點擊（否則左上主將頭像點不到）', () => {
        const src = fs.readFileSync(path.resolve(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        const line = src.split(/\r?\n/).find((l) => l.includes('const nonBlockingHosts')) ?? '';
        assert.isTrue(line.includes("'LeadSelectHost'") && line.includes("'DeckSelectHost'"), '兩個大廳底層 host 應列入 nonBlockingHosts');
    });

    suite.test('換頁後泡泡會搬到還在畫面上的 Canvas（名冊列頭像 → 詳情）', () => {
        const src = fs.readFileSync(path.resolve(__dirname, '../assets/scripts/ui/core/AvatarTalkBubble.ts'), 'utf8');
        assert.isTrue(src.includes('rehomeBubble(') && src.includes('activeInHierarchy'), '頭像所在頁收起時應搬移泡泡');
    });

    suite.test('招賢館、名冊、十連結果、大廳主將頭像都已綁定點擊說話', () => {
        const lobby = fs.readFileSync(path.resolve(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes("bindAvatarTalk(holder, key.replace"), '_applyFramePortraits（招賢館六框、重逢名將等）應綁定');
        assert.isTrue(lobby.includes("binder.getNode('lordAvatarMask')"), '主將頭像應綁定');
    });

    return suite;
}
