/**
 * TallyLineSpec — 虎符劇本句改走 i18n Key（TRP-19 呼叫端，PROG-2-1987）
 *
 * 鎖住：有翻譯時用翻譯；t 回傳 key 本身（缺條目）或沒給 translate 時用繁中保底；
 * 保底模板與 zh-TW.json 同文；GameSession 的虎符提示改存 Key，取走時才組字。
 */
import * as fs from 'fs';
import * as path from 'path';
import { formatTallyLine } from '../assets/scripts/core/systems/TallyLineSpec';
import { tallyLegendDeploySpec, tallyProducedSpec, tallyStarUpSpec } from '../assets/scripts/core/systems/TallyScripts';
import { tallyEquipSpec, tallyLoyaltyDropSpec, tallyUnequipSpec } from '../assets/scripts/core/systems/TallySlotView';
import { assert, TestSuite } from './TestRunner';

const zhTW = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'i18n', 'zh-TW.json'), 'utf8')) as Record<string, string>;

function i18nOf(table: Record<string, string>) {
    return (key: string, ...args: string[]) => (table[key] ?? key).replace(/\{(\d+)\}/g, (_, i: string) => args[Number(i)] ?? '');
}

export function createTallyLineSpecSuite(): TestSuite {
    const suite = new TestSuite('TallyLineSpec（TRP-19 呼叫端改讀 Key PROG-2-1987）');
    const specs = [
        tallyProducedSpec('呂布', '虎符：陷陣'),
        tallyStarUpSpec('虎符：白馬', 3, '白馬義從'),
        tallyEquipSpec('趙雲', '虎符：白馬', '白馬義從'),
        tallyUnequipSpec('趙雲', '虎符：白馬'),
        tallyLoyaltyDropSpec('趙雲'),
        tallyLegendDeploySpec('tiger-tally-bai-ma')!,
        tallyLegendDeploySpec('tiger-tally-xian-zhen')!,
    ];
    suite.test('保底模板與 zh-TW.json 同文', () => {
        const zh = i18nOf(zhTW);
        for (const spec of specs) assert.equals(zh(spec.key, ...spec.args), formatTallyLine(spec), spec.key);
    });
    suite.test('有翻譯用翻譯；缺條目（回傳 key）退回繁中', () => {
        const en = i18nOf({ SCRIPT_TALLY_UNEQUIP: '{0} unequipped {1}.' });
        assert.equals('趙雲 unequipped 虎符：白馬.', formatTallyLine(tallyUnequipSpec('趙雲', '虎符：白馬'), en));
        assert.equals('趙雲 對被拔除虎符一事感到不滿，忠誠度下降。', formatTallyLine(tallyLoyaltyDropSpec('趙雲'), en));
    });
    suite.test('非傳奇虎符沒有部署句', () => {
        assert.equals(null, tallyLegendDeploySpec('tiger-tally-unknown'));
        assert.equals(null, tallyLegendDeploySpec(null));
    });
    return suite;
}
