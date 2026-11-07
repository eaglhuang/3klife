/**
 * 戰後雙卡結算彈窗資料（SPI-12；PROG-2-2083）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';
import { buildDualCardSettlements } from '../assets/scripts/core/systems/DualCardSettlement';
import { buildDeathSpiritCard } from '../assets/scripts/core/systems/SpiritCardDeathSettlement';

const zhao = { id: 'zhao-yun', name: '趙雲', troopAptitude: { CAVALRY: 'S' } };
const tally = { uid: 'T1', templateId: 't', sourceGeneralUid: 'zhao-yun', quality: 'SSR', score: 0, source: 'death', producedSeason: 3, troopType: 'CAVALRY' } as unknown as TigerTallyCard;
const record = buildDeathSpiritCard({ id: 'zhao-yun', characterCategory: 'famed', rarityTier: 'legendary', str: 96, int: 76, lea: 91, pol: 65, cha: 81 } as never);

export function createDualCardSettlementSuite(): TestSuite {
    const suite = new TestSuite('DualCardSettlement (戰後雙卡結算 SPI-12 PROG-2-2083)');

    suite.test('雙卡都產出：英靈卡數值轉成規格欄位，虎符帶兵種適性', () => {
        const [p] = buildDualCardSettlements({ fallen: [zhao], spiritTemplateIds: ['zhao-yun'], spiritRecords: [record], producedTallies: [tally] });
        assert.equals('趙雲', p.generalName);
        assert.equals('SPIRIT_zhao-yun', p.spiritCard?.cardId);
        assert.equals(96, p.spiritCard?.finalStats.war);
        assert.equals(91, p.spiritCard?.finalStats.lead);
        assert.equals('T1', p.tigerTally?.tallyId);
        assert.equals('S', p.tigerTally?.aptitudeTier);
    });

    suite.test('只產其一時另一半為 null；都沒產出不列入', () => {
        const onlyTally = buildDualCardSettlements({ fallen: [zhao], spiritTemplateIds: [], spiritRecords: [], producedTallies: [tally] });
        assert.equals(null, onlyTally[0].spiritCard);
        const onlySpirit = buildDualCardSettlements({ fallen: [zhao], spiritTemplateIds: ['zhao-yun'], spiritRecords: [record], producedTallies: [] });
        assert.equals(null, onlySpirit[0].tigerTally);
        assert.equals(0, buildDualCardSettlements({ fallen: [zhao], spiritTemplateIds: [], spiritRecords: [], producedTallies: [] }).length);
    });

    suite.test('GameSession 死亡結算推入雙卡結算佇列，並提供取走方法', () => {
        const src = fs.readFileSync(path.join(__dirname, '../assets/scripts/core/managers/GameSession.ts'), 'utf8');
        assert.isTrue(src.includes('this._dualCardSettlements.push(...buildDualCardSettlements('));
        assert.isTrue(src.includes('public consumeDualCardSettlements(): DualCardSettlementPayload[]'));
    });

    suite.test('結算台詞 UI_SPIRIT_HERO_FALLEN 四語系都有', () => {
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'i18n', `${loc}.json`), 'utf8')) as Record<string, string>;
            assert.isTrue(typeof table['UI_SPIRIT_HERO_FALLEN'] === 'string', `${loc} 缺 UI_SPIRIT_HERO_FALLEN`);
        }
    });

    return suite;
}
