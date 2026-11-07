/**
 * 戰後雙卡結算文字列與顯示端接線（SPI-12；PROG-2-2084）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { dualCardSettlementSpecs, type DualCardSettlementPayload } from '../assets/scripts/core/systems/DualCardSettlement';
import { formatTallyLine } from '../assets/scripts/core/systems/TallyLineSpec';

const ROOT = path.join(__dirname, '..');
const KEYS = ['UI_SPIRIT_HERO_FALLEN', 'UI_DUAL_CARD_SPIRIT_STATS', 'UI_DUAL_CARD_TALLY_APTITUDE'];
const both: DualCardSettlementPayload = {
    fallenGeneralId: 'zhao-yun',
    generalName: '趙雲',
    spiritCard: { cardId: 'SPIRIT_zhao-yun', finalStats: { lead: 91, war: 96, int: 76, pol: 65, cha: 81 }, legendaryDeeds: [] },
    tigerTally: { tallyId: 'T1', troopType: 'CAVALRY', aptitudeTier: 'S' },
};

export function createDualCardSettlementLinesSuite(): TestSuite {
    const suite = new TestSuite('DualCardSettlementLines (雙卡結算文字 SPI-12 PROG-2-2084)');

    suite.test('雙卡：台詞、英靈卡定格數值、虎符適性依序三列', () => {
        const lines = dualCardSettlementSpecs(both).map((line) => formatTallyLine(line));
        assert.equals(3, lines.length);
        assert.equals('大星隕落，英魂不滅，化作祖靈護佑子孫！', lines[0]);
        assert.isTrue(lines[1].includes('統 91／武 96'));
        assert.isTrue(lines[2].includes('適性 S'));
    });

    suite.test('只有虎符時只念虎符；適性缺值顯示破折號', () => {
        const specs = dualCardSettlementSpecs({ ...both, spiritCard: null, tigerTally: { tallyId: 'T1', troopType: 'CAVALRY', aptitudeTier: '' } });
        assert.equals(1, specs.length);
        assert.isTrue(formatTallyLine(specs[0]).includes('適性 —'));
        assert.equals(2, dualCardSettlementSpecs({ ...both, tigerTally: null }).length);
    });

    suite.test('四語系都有 key，繁中與保底同文', () => {
        const zh = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n/zh-TW.json'), 'utf8')) as Record<string, string>;
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/resources/i18n/${loc}.json`), 'utf8')) as Record<string, string>;
            for (const key of KEYS) assert.isTrue(typeof table[key] === 'string', `${loc} 缺 ${key}`);
        }
        const translate = (key: string, ...args: string[]) => (zh[key] ?? key).replace(/\{(\d+)\}/g, (_, i: string) => args[Number(i)]);
        for (const spec of dualCardSettlementSpecs(both)) assert.equals(formatTallyLine(spec), formatTallyLine(spec, translate));
    });

    suite.test('戰場結算與大廳換季都取走雙卡結算文字', () => {
        const battle = fs.readFileSync(path.join(ROOT, 'assets/scripts/battle/views/BattleUIBridge.ts'), 'utf8');
        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(battle.includes('consumeDualCardSettlementLines(this._tallyTranslate)'));
        assert.isTrue(lobby.includes('session.consumeDualCardSettlementLines(translate)'));
    });

    return suite;
}
