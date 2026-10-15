/**
 * 退役回顧面板的版面與語系接線（REC-08 cc 接線，PROG-2-0449）
 *
 * 鎖住：文字的 key 全部對得到 retire-review-main.json 節點；版面用到的 skinSlot 都在 skin 裡；
 * screen 指向正確的 layout 與 skin；zh-TW 預設文案與語系檔一致；四個語系都有同一組 ui.retire_review.* key。
 */
import { assert, TestSuite } from './TestRunner';
import { buildRetireReviewTexts, RETIRE_REVIEW_TEXT_FALLBACK_ZH_TW } from '../assets/scripts/ui/core/RetireReviewController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const readJson = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;

function collect(node: { id?: string; skinSlot?: string; styleSlot?: string; children?: unknown[] }, ids: Set<string>, slots: Set<string>): void {
    if (node.id) ids.add(node.id);
    if (node.skinSlot) slots.add(node.skinSlot);
    if (node.styleSlot) slots.add(node.styleSlot);
    for (const c of node.children ?? []) collect(c as typeof node, ids, slots);
}

export function createRetireReviewLayoutSuite(): TestSuite {
    const suite = new TestSuite('RetireReviewLayout (退役回顧面板版面與語系接線 PROG-2-0449)');

    suite.test('文字 key 全部對得到 retire-review-main.json 節點', () => {
        const layout = readJson<{ root: { id?: string; children?: unknown[] } }>('assets/resources/ui-spec/layouts/retire-review-main.json');
        const ids = new Set<string>();
        collect(layout.root as never, ids, new Set<string>());
        const general = { id: 'g1', name: '趙雲', vitality: 80, maxVitality: 100 } as unknown as GeneralConfig;
        const texts = buildRetireReviewTexts(general);
        const missing = Object.keys(texts).filter((k) => !ids.has(k));
        assert.equals('', missing.join(','));
    });

    suite.test('版面用到的 skinSlot / styleSlot 都在 skin 裡，screen 指向正確的 layout 與 skin', () => {
        const layout = readJson<{ root: unknown }>('assets/resources/ui-spec/layouts/retire-review-main.json');
        const ids = new Set<string>();
        const slots = new Set<string>();
        collect(layout.root as never, ids, slots);
        const skin = readJson<{ slots: Record<string, unknown> }>('assets/resources/ui-spec/skins/retire-review-screen.skin.json');
        const missing = Array.from(slots).filter((s) => !(s in skin.slots));
        assert.equals('', missing.join(','));
        const screen = readJson<{ layout: string; skin: string }>('assets/resources/ui-spec/screens/retire-review-screen.json');
        assert.equals('retire-review-main', screen.layout);
        assert.equals('retire-review-screen.skin', screen.skin);
    });

    suite.test('zh-TW 預設文案與語系檔一致；四個語系都有同一組 ui.retire_review.* key', () => {
        const zhTw = readJson<Record<string, string>>('assets/resources/i18n/zh-TW.json');
        for (const [key, value] of Object.entries(RETIRE_REVIEW_TEXT_FALLBACK_ZH_TW)) {
            assert.equals(value, zhTw[key]);
        }
        const keys = Object.keys(RETIRE_REVIEW_TEXT_FALLBACK_ZH_TW);
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = readJson<Record<string, string>>(`assets/resources/i18n/${loc}.json`);
            assert.equals('', keys.filter((k) => !(k in table)).join(','));
        }
    });

    return suite;
}
