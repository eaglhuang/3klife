/**
 * RankProgressText.test.ts — 官職進度開窗文字（PROG-2-1424，doc_spec_0014 F-2）headless 測試
 *
 * 鎖住：已達成／目前／未達成三種標記；門檻與解鎖文字；初始階顯示「初始」；
 * 資料檔未載入時用備援；最高階經驗顯示 MAX；語系表查到時採用語系表；四語系都有開窗字串。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { initialOfficerState, type OfficerState } from '../assets/scripts/core/systems/OfficerState';
import { parseOfficerTierTable } from '../assets/scripts/core/systems/OfficerTierTable';
import {
    RANK_PROGRESS_FALLBACK_TIERS,
    RANK_PROGRESS_TEXT_FALLBACK_ZH_TW,
    rankFeatureLabel,
    rankProgressOpenLabel,
    rankProgressViewOf,
} from '../assets/scripts/ui/core/RankProgressText';

const I18N_DIR = path.join(__dirname, '../assets/resources/i18n');

function state(currentTier: number, officerExp: number): OfficerState {
    return { currentTier, officerExp, unlockHistory: [currentTier] };
}

export function createRankProgressTextSuite(): TestSuite {
    const suite = new TestSuite('RankProgressText (官職進度開窗 PROG-2-1424)');

    suite.test('郡守：前兩階已達成、第三階為目前、後兩階未達成', () => {
        const view = rankProgressViewOf(state(3, 300));
        assert.equals(5, view.rows.length);
        assert.equals('reached,reached,current,locked,locked', view.rows.map((row) => row.status).join(','));
        assert.equals('▶ 郡守　260 EXP　目前', view.rows[2].headline);
        assert.equals('✔ 鄉里義士　初始', view.rows[0].headline);
        assert.equals('・ 霸府重臣　920 EXP', view.rows[4].headline);
        assert.equals('解鎖：世界沙盤 S2、聯盟文書', view.rows[3].unlockLine);
        assert.equals('官職經驗：300/520', view.expLine);
        assert.equals('官職進度', view.title);
        assert.equals('關閉', view.closeLabel);
    });

    suite.test('最高階經驗顯示 MAX，全部列都不是未達成', () => {
        const view = rankProgressViewOf(state(5, 1000));
        assert.equals('官職經驗：1000/MAX', view.expLine);
        assert.isTrue(view.rows.every((row) => row.status !== 'locked'));
        assert.equals('current', view.rows[4].status);
    });

    suite.test('資料檔列優先於備援，並依階位排序', () => {
        const parsed = parseOfficerTierTable(JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/data/officer-tiers.json'), 'utf8')));
        assert.isTrue(parsed.ok);
        const rows = (parsed as { ok: true; rows: typeof RANK_PROGRESS_FALLBACK_TIERS[number][] }).rows;
        const fromData = rankProgressViewOf(initialOfficerState(), rows.slice().reverse());
        const fromFallback = rankProgressViewOf(initialOfficerState(), null);
        assert.equals(fromFallback.rows.map((row) => row.headline + row.unlockLine).join('|'),
            fromData.rows.map((row) => row.headline + row.unlockLine).join('|'), '備援須與資料檔一致');
        const custom = rankProgressViewOf(state(2, 150), [{ tier: 2, title: '測試官', expToReach: 50, unlockedFeatures: ['UNKNOWN_CODE'] }]);
        assert.equals(1, custom.rows.length);
        assert.equals('▶ 測試官　50 EXP　目前', custom.rows[0].headline);
        assert.equals('解鎖：ui.officer.feature.unknown_code', custom.rows[0].unlockLine, '查不到的代碼原樣顯示 key');
    });

    suite.test('語系表查得到時採用語系表', () => {
        const en = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'en.json'), 'utf8')) as Record<string, string>;
        const lookup = (key: string, ...args: string[]): string =>
            args.reduce((text, value, index) => text.split(`{${index}}`).join(value), en[key] ?? key);
        const view = rankProgressViewOf(state(1, 40), null, lookup);
        assert.equals(en['ui.officer.rank.title'], view.title);
        assert.equals(`Unlocks: ${en['ui.officer.feature.hall_basic_entry']}、${en['ui.officer.feature.domestic_wall_low']}`, view.rows[0].unlockLine);
        assert.equals(en['ui.officer.rank.open'], rankProgressOpenLabel(lookup));
        assert.equals('世界沙盤 S3', rankFeatureLabel('WORLD_SANDTABLE_S3'));
    });

    suite.test('四語系都有開窗字串且佔位符一致', () => {
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${locale}.json`), 'utf8')) as Record<string, string>;
            for (const [key, zh] of Object.entries(RANK_PROGRESS_TEXT_FALLBACK_ZH_TW)) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺 ${key}`);
                const holders = (text: string): string => (text.match(/\{\d\}/g) ?? []).sort().join('');
                assert.equals(holders(zh), holders(table[key]), `${locale} ${key} 佔位符`);
            }
        }
    });

    return suite;
}
