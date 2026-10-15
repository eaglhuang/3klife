/**
 * 英靈圖鑑列表文字（PROG-2-0803）
 *
 * 鎖住：只列正式英靈卡（isSpiritRelic）、依歸檔時間新到舊、超過上限顯示「另有 N 位」、
 * 空清單顯示空狀態、缺年份與缺精華快照不拋錯、zh-TW 預設與語系檔一致。
 */
import { assert, TestSuite } from './TestRunner';
import {
    SPIRIT_CODEX_MAX_ROWS,
    SPIRIT_CODEX_TEXT_FALLBACK_ZH_TW,
    buildSpiritCodexTexts,
    spiritCodexRowText,
    withSpiritCodexFallback,
} from '../assets/scripts/ui/core/SpiritCodexController';
import type { SpiritCard } from '../assets/scripts/core/models/SpiritCard';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function card(uid: string, extra: Partial<SpiritCard> = {}): SpiritCard {
    return {
        uid,
        name: uid,
        isSpiritRelic: true,
        archivedAt: 1,
        deathYear: 200,
        legacyEssence: 50,
        deathContext: { battleId: '', cause: 'age', season: 1, year: 200 },
        ...extra,
    } as unknown as SpiritCard;
}

export function createSpiritCodexControllerSuite(): TestSuite {
    const suite = new TestSuite('SpiritCodexController (英靈圖鑑列表 PROG-2-0803)');

    suite.test('只列正式英靈卡：isSpiritRelic 不是 true 的快照不列入', () => {
        const texts = buildSpiritCodexTexts([card('a'), card('b', { isSpiritRelic: false }), card('c', { isSpiritRelic: undefined })]);
        assert.equals('英靈 1 位', texts.spiritCodexCount);
        assert.isTrue(texts.spiritCodexList.startsWith('a｜'));
    });

    suite.test('依歸檔時間新到舊排序', () => {
        const texts = buildSpiritCodexTexts([card('old', { archivedAt: 1 }), card('new', { archivedAt: 9 })]);
        const lines = texts.spiritCodexList.split('\n');
        assert.isTrue(lines[0].startsWith('new｜'));
        assert.isTrue(lines[1].startsWith('old｜'));
    });

    suite.test('超過上限：只列前 SPIRIT_CODEX_MAX_ROWS 位，其餘顯示「另有 N 位未列出」', () => {
        const many = Array.from({ length: SPIRIT_CODEX_MAX_ROWS + 3 }, (_, i) => card(`g${i}`, { archivedAt: i }));
        const texts = buildSpiritCodexTexts(many);
        assert.equals(SPIRIT_CODEX_MAX_ROWS, texts.spiritCodexList.split('\n').length);
        assert.equals('另有 3 位未列出', texts.spiritCodexMore);
    });

    suite.test('沒有英靈卡：列表顯示空狀態，more 為空字串', () => {
        const texts = buildSpiritCodexTexts([]);
        assert.equals(SPIRIT_CODEX_TEXT_FALLBACK_ZH_TW['ui.spirit_codex.empty'], texts.spiritCodexList);
        assert.equals('', texts.spiritCodexMore);
        assert.equals('英靈 0 位', texts.spiritCodexCount);
    });

    suite.test('單列文字：缺年份顯示「年份未知」，缺精華快照顯示 0，不拋錯', () => {
        const row = spiritCodexRowText(card('x', { deathYear: undefined, deathContext: undefined as never, legacyEssence: undefined }));
        assert.equals('x｜年份未知｜精華快照：0', row);
    });

    suite.test('zh-TW 預設文案與語系檔一致', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const zhTw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets/resources/i18n/zh-TW.json'), 'utf8')) as Record<string, string>;
        for (const [key, value] of Object.entries(SPIRIT_CODEX_TEXT_FALLBACK_ZH_TW)) {
            assert.equals(value, zhTw[key]);
        }
    });

    suite.test('語系查詢：未命中時退回 zh-TW，命中時使用語系表', () => {
        const missing = withSpiritCodexFallback((key) => key);
        assert.equals('英靈 2 位', missing('ui.spirit_codex.count', '2'));
        const localized = withSpiritCodexFallback(() => 'Spirits: 2');
        assert.equals('Spirits: 2', localized('ui.spirit_codex.count', '2'));
    });

    return suite;
}
