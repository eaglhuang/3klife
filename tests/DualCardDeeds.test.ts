/**
 * 雙卡結算的生平功業（SPI-12；PROG-2-2086）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { buildDualCardSettlements, dualCardSettlementSpecs, DUAL_CARD_DEED_LIMIT } from '../assets/scripts/core/systems/DualCardSettlement';
import { buildDeathSpiritCard } from '../assets/scripts/core/systems/SpiritCardDeathSettlement';
import { formatTallyLine } from '../assets/scripts/core/systems/TallyLineSpec';

const ROOT = path.join(__dirname, '..');
const record = buildDeathSpiritCard({ id: 'zhao-yun', characterCategory: 'famed', rarityTier: 'legendary', str: 96 } as never);
const settle = (battleRecord?: object) => buildDualCardSettlements({
    fallen: [{ id: 'zhao-yun', name: '趙雲', battleRecord } as never],
    spiritTemplateIds: ['zhao-yun'],
    spiritRecords: [record],
    producedTallies: [],
})[0];

export function createDualCardDeedsSuite(): TestSuite {
    const suite = new TestSuite('DualCardDeeds (雙卡結算生平功業 SPI-12 PROG-2-2086)');

    suite.test('功業取自名冊戰績；沒有戰績時為空', () => {
        const deeds = settle({ wins: 8, losses: 2, draws: 0, merit: 120, kills: 300 }).spiritCard?.legendaryDeeds ?? [];
        assert.isTrue(deeds.some((d) => d.includes('勝 8')));
        assert.isTrue(deeds.some((d) => d.includes('擊殺敵軍 300')));
        assert.equals(0, settle().spiritCard?.legendaryDeeds.length);
    });

    suite.test('結算文字列出功業，最多 DUAL_CARD_DEED_LIMIT 條', () => {
        const payload = settle({ wins: 8, losses: 2, draws: 0, merit: 120, kills: 300 });
        const many = { ...payload, spiritCard: { ...payload.spiritCard!, legendaryDeeds: ['a', 'b', 'c', 'd', 'e'] } };
        const deedLines = dualCardSettlementSpecs(many).filter((l) => l.key === 'UI_DUAL_CARD_DEED');
        assert.equals(DUAL_CARD_DEED_LIMIT, deedLines.length);
        assert.equals('功業：a', formatTallyLine(deedLines[0]));
    });

    suite.test('四語系都有 UI_DUAL_CARD_DEED，繁中與保底同文', () => {
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/resources/i18n/${loc}.json`), 'utf8')) as Record<string, string>;
            assert.isTrue(typeof table['UI_DUAL_CARD_DEED'] === 'string' && table['UI_DUAL_CARD_DEED'].includes('{0}'), `${loc} 缺 UI_DUAL_CARD_DEED`);
        }
        const zh = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n/zh-TW.json'), 'utf8')) as Record<string, string>;
        assert.equals(zh['UI_DUAL_CARD_DEED'].replace('{0}', 'x'), formatTallyLine({ key: 'UI_DUAL_CARD_DEED', args: ['x'] }));
    });

    return suite;
}
