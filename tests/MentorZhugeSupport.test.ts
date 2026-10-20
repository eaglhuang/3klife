/**
 * MentorZhugeSupport.test.ts — 諸葛亮 SR 支援卡暫定資料（PROG-2-0779）
 *
 * 只驗空城計事件（規格 §F-6）與 schema 通過；其餘欄位是暫定值，見卡與待辦檔。
 */
import { TestSuite, assert } from './TestRunner';
import { parseSupportCatalog } from '../assets/scripts/core/systems/MentorSupportCatalog';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

export function createMentorZhugeSupportSuite(): TestSuite {
    const suite = new TestSuite('MentorZhugeSupport (諸葛亮 SR 支援卡暫定資料 PROG-2-0779)');

    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/mentor-support-cards.json'), 'utf8')) as unknown[];

    suite.test('支援卡 JSON 全部通過 schema（含諸葛亮）', () => {
        const catalog = parseSupportCatalog(raw);
        assert.equals(0, catalog.problems.length, `問題：${JSON.stringify(catalog.problems)}`);
        assert.isTrue(catalog.byGeneralId.has('zhuge-liang'));
    });

    suite.test('諸葛亮 SR 的空城計事件：第 5~18 回合、基礎率 25%、最低 ★1', () => {
        const catalog = parseSupportCatalog(raw);
        const support = catalog.byGeneralId.get('zhuge-liang')!;
        assert.equals('SR', support.rarity);
        const event = support.tacticInspireEvents.find((e) => e.tacticId === 'TAC_EMPTY_FORT');
        assert.isDefined(event);
        assert.equals(5, event!.triggerWindow[0]);
        assert.equals(18, event!.triggerWindow[1]);
        assert.equals(0.25, event!.baseRate);
        assert.equals(1, event!.minStar);
    });

    return suite;
}
