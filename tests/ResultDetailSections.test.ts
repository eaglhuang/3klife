// @spec-source → PROG-2-9424 結算視窗分區排版
/**
 * ResultDetailSections.test.ts — 結算明細分區、欄名拆分，以及結算相關多語系鍵四檔齊全。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import {
    buildResultSections,
    classifyResultLine,
    RESULT_SECTION_TITLE,
    splitResultRow,
} from '../assets/scripts/shared/ResultDetailSections';

/** 瓦口隘時限勝利的實際結算明細（第一行勝負說明之後的部分） */
const WAKOU_LINES = [
    '時限到：我軍戰果 15%，敵軍戰果 0%，我軍戰果較優。',
    '出征軍勢 3000｜返還 2300｜戰損 0｜糧草 -42',
    '城市兵源 3000→3000｜補兵 750/季｜約 0 季恢復',
    '虎豹騎：投入 1200｜返還 1200｜戰損 0',
    '陷陣營：投入 500｜返還 500｜戰損 0',
    '本場戰績：斬敵 0｜傷害 0｜守護 0｜回合 16',
    '戰後獎賞：糧草 +120、武將經驗 +40',
    '戰利品：木材 ×1',
    '張飛 戰後覺醒「萬人敵」，武力上限提升。',
];

export function createResultDetailSectionsSuite(): TestSuite {
    const suite = new TestSuite('ResultDetailSections');

    suite.test('分區：戰況、兵力、獎勵、其餘放戰後紀事', () => {
        assert.equals('battle', classifyResultLine('時限到：我軍戰果 15%'));
        assert.equals('battle', classifyResultLine('本場戰績：斬敵 3'));
        assert.equals('troops', classifyResultLine('出征軍勢 3000｜返還 2300'));
        assert.equals('troops', classifyResultLine('虎豹騎：投入 1200｜返還 1200'));
        assert.equals('rewards', classifyResultLine('戰利品：木材 ×1'));
        assert.equals('other', classifyResultLine('張飛 戰後覺醒「萬人敵」'));
    });

    suite.test('拆欄名：冒號前當欄名；沒有冒號時第一段空白前當欄名；｜換成間隔號', () => {
        assert.equals('虎豹騎', splitResultRow('虎豹騎：投入 1200｜返還 1200｜戰損 0').key);
        assert.equals('投入 1200　·　返還 1200　·　戰損 0', splitResultRow('虎豹騎：投入 1200｜返還 1200｜戰損 0').value);
        const army = splitResultRow('出征軍勢 3000｜返還 2300｜戰損 0');
        assert.equals('出征軍勢', army.key);
        assert.equals('3000　·　返還 2300　·　戰損 0', army.value);
        assert.equals('民心', splitResultRow('民心 -3').key);
        assert.equals('-3', splitResultRow('民心 -3').value);
        const sentence = splitResultRow('張飛 戰後覺醒「萬人敵」，武力上限提升。');
        assert.equals('', sentence.key, '敘述句不拆欄');
        assert.equals('張飛 戰後覺醒「萬人敵」，武力上限提升。', sentence.value);
    });

    suite.test('整份明細：順序固定、空行略過、多行字串會拆開', () => {
        const sections = buildResultSections(['', ...WAKOU_LINES.slice(0, 3), WAKOU_LINES.slice(3).join('\n'), '   ']);
        assert.equals('battle,troops,rewards,other', sections.map((s) => s.id).join(','));
        assert.equals(2, sections[0].rows.length, '時限到＋本場戰績');
        assert.equals(4, sections[1].rows.length, '出征、兵源、兩個兵種');
        assert.equals(2, sections[2].rows.length);
        assert.equals(1, sections[3].rows.length);
        assert.equals(0, buildResultSections([]).length);
    });

    suite.test('多語系：區段標題與時限文案四語系都有', () => {
        const keys = [
            ...Object.values(RESULT_SECTION_TITLE).map((t) => t.key),
            'ui.result.cause.time_up_victory',
            'ui.result.cause.time_up_defeat',
        ];
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const file = path.join(__dirname, `../assets/resources/i18n/${locale}.json`);
            const json = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
            const strings = (json.strings ?? json) as Record<string, string>;
            for (const key of keys) assert.isTrue(typeof strings[key] === 'string' && strings[key].length > 0, `${locale} 缺 ${key}`);
        }
    });

    suite.test('結算版面：明細改捲動區，勝負說明不再塞整段明細', () => {
        const layout = fs.readFileSync(path.join(__dirname, '../assets/resources/ui-spec/layouts/result-popup-main.json'), 'utf8');
        assert.isTrue(layout.includes('"DetailScroll"'));
        assert.isTrue(layout.includes('"popup.label.verdict"'));
        const popup = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/components/ResultPopupComposite.ts'), 'utf8');
        assert.isTrue(popup.includes('this._renderDetails(detailLines)'));
    });

    return suite;
}
