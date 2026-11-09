/**
 * BloodlineMirrorStageResult — 升星／覺醒成功的命鏡結果頁（BML-06，PROG-2-2126）
 */
import * as fs from 'fs';
import * as path from 'path';
import { LayerType, UIConfig, UIID } from '../assets/scripts/core/config/UIConfig';
import {
    MIRROR_STAGE_RESULT_NODES,
    buildStageAwakenedTexts,
    buildStageCapRaisedTexts,
    type MirrorTextLookup,
} from '../assets/scripts/ui/core/UIBloodlineMirrorStageResult';
import { TestSuite, assert } from './TestRunner';

function lookupOf(lang: string): { t: MirrorTextLookup; missing: string[] } {
    const file = path.join(__dirname, '..', 'assets', 'resources', 'i18n', `${lang}.json`);
    const table = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
    const missing: string[] = [];
    const t: MirrorTextLookup = (key, ...args) => {
        if (table[key] === undefined) missing.push(key);
        return args.reduce((text, arg, index) => text.replace(`{${index}}`, arg), table[key] ?? key);
    };
    return { t, missing };
}

export function createBloodlineMirrorStageResultSuite(): TestSuite {
    const suite = new TestSuite('BloodlineMirrorStageResult (命鏡升星覺醒結果頁 BML-06 PROG-2-2126)');

    suite.test('覺醒結果：顯示武將與點亮的階段，所有節點都有文字', () => {
        const texts = buildStageAwakenedTexts(lookupOf('zh-TW').t, '曹操', 3);
        for (const node of MIRROR_STAGE_RESULT_NODES) assert.isTrue(texts[node].length > 0, node);
        assert.isTrue(texts.HeaderTitle.includes('曹操'));
        assert.isTrue(texts.PhaseLabel.includes('3'));
    });

    suite.test('升星結果：顯示上限變化，不殘留模板的確認升星與進度百分比', () => {
        const texts = buildStageCapRaisedTexts(lookupOf('zh-TW').t, '曹操', 2, 4);
        assert.isTrue(texts.PhaseLabel.includes('2') && texts.PhaseLabel.includes('4'));
        assert.isTrue(!texts.PrimaryActionLabel.includes('升星'));
        assert.isTrue(!texts.ProgressLabel.includes('%'));
    });

    suite.test('四語都有全部文字，佔位符都換掉', () => {
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const { t, missing } = lookupOf(lang);
            const all = { ...buildStageAwakenedTexts(t, 'A', 2), PhaseRaise: buildStageCapRaisedTexts(t, 'A', 1, 2).PhaseLabel };
            const raise = buildStageCapRaisedTexts(t, 'A', 1, 2);
            assert.equals(0, missing.length, `${lang}: ${missing.join(',')}`);
            for (const text of [...Object.values(all), ...Object.values(raise)]) assert.isTrue(!text.includes('{'), `${lang}: ${text}`);
        }
    });

    suite.test('結果頁是彈窗層：蓋在武將詳情上，關閉後回到詳情', () => {
        assert.equals(LayerType.PopUp, UIConfig[UIID.BloodlineMirrorAwakening].layer);
        assert.equals(LayerType.PopUp, UIConfig[UIID.BloodlineMirrorAscension].layer);
    });

    return suite;
}
