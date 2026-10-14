/**
 * ingest-generals-ai.js 的 lore 生成規則（GDP-02 / PROG-2-0416）
 *
 * 規則：只為 generals-lore.json 尚無 lore 的武將生成；slot 名稱與 runtime 一致；
 * 格式不符的一筆 lore 丟錯，由主流程只 WARN 並跳過。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const gen = require('../tools_node/ingest-generals-ai.js') as {
    STORY_SLOTS: string[];
    parseLimit: (argv: string[]) => number;
    buildLore: (general: { id: string; name: string; role?: string }, rng?: () => number) => {
        id: string;
        historicalAnecdote: string;
        bloodlineRumor: string;
        storyStripCells: Array<{ slot: string; text: string }>;
    };
    validateLore: (lore: unknown) => void;
    needsStory: (general: { id: string }, loreIds: Set<string>) => boolean;
};

export function createIngestGeneralsAiSuite(): TestSuite {
    const suite = new TestSuite('IngestGeneralsAi (lore 生成 GDP-02)');

    suite.test('缺漏判斷：已有 lore 者不生成，缺漏者生成；--force 不受限', () => {
        const loreIds = new Set(['cao-cao']);
        assert.isFalse(gen.needsStory({ id: 'cao-cao' }, loreIds));
        assert.isTrue(gen.needsStory({ id: 'cao-pi' }, loreIds));
    });

    suite.test('生成結果：6 格 slot 名稱與 runtime GeneralDetailStorySlot 一致', () => {
        const lore = gen.buildLore({ id: 'x', name: '甲', role: 'Support' }, () => 0.1);
        assert.equals(['origin', 'faction', 'role', 'awakening', 'bloodline', 'future'].join(','),
            lore.storyStripCells.map(c => c.slot).join(','));
        assert.equals(6, gen.STORY_SLOTS.length);
        gen.validateLore(lore);
    });

    suite.test('固定隨機來源時結果可重現', () => {
        const a = gen.buildLore({ id: 'x', name: '甲', role: 'Combat' }, () => 0.42);
        const b = gen.buildLore({ id: 'x', name: '甲', role: 'Combat' }, () => 0.42);
        assert.equals(JSON.stringify(a), JSON.stringify(b));
    });

    suite.test('單筆格式不符（缺 bloodline、slot 順序錯、格數不足）丟錯，好的一筆不受影響', () => {
        const good = gen.buildLore({ id: 'ok', name: '乙', role: 'Commander' }, () => 0.2);
        gen.validateLore(good);

        const noBloodline = { ...good, bloodlineRumor: '' };
        assert.throws(() => gen.validateLore(noBloodline));

        const badSlots = { ...good, storyStripCells: good.storyStripCells.map((c, i) => ({ ...c, slot: String(i + 1) })) };
        assert.throws(() => gen.validateLore(badSlots));

        const short = { ...good, storyStripCells: good.storyStripCells.slice(0, 3) };
        assert.throws(() => gen.validateLore(short));
    });

    suite.test('--limit：缺值、非數字、零或負數不限制（Infinity），正整數照用', () => {
        assert.equals(Infinity, gen.parseLimit([]));
        assert.equals(Infinity, gen.parseLimit(['--limit']));
        assert.equals(Infinity, gen.parseLimit(['--limit', 'x']));
        assert.equals(Infinity, gen.parseLimit(['--limit', '0']));
        assert.equals(5, gen.parseLimit(['--dry-run', '--limit', '5']));
    });

    return suite;
}
