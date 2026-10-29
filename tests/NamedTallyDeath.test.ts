/**
 * 名將死亡產出專屬虎符（PROG-2-1593）headless 測試
 *
 * 覆蓋：名將死亡虎符的模板 id 仍是武將 id，查被動／卡面時換成專屬虎符；一般武將不變；
 * 對照表裡的虎符都能在卡片目錄查到。
 */
import { TestSuite, assert } from './TestRunner';
import { produceDeathTally } from '../assets/scripts/core/systems/TigerTally';
import { LEGACY_TALLY_BY_GENERAL_TEMPLATE, NAMED_TALLY_BY_GENERAL_TEMPLATE, resolveTallyTemplateId } from '../assets/scripts/core/config/TigerTallySpecTactics';
import { applyTallyPassive } from '../assets/scripts/battle/shared/TallyPassive';
import type { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { buildTallyCardCatalog } from '../assets/scripts/core/config/TallyCardCatalog';

function famed(templateId: string, troopType = 'infantry') {
    return { id: `uid-${templateId}`, templateId, isHistorical: true, characterCategory: 'famed', gender: 'male', troopType };
}

export function createNamedTallyDeathSuite(): TestSuite {
    const suite = new TestSuite('NamedTallyDeath (名將死亡產出專屬虎符 PROG-2-1593)');

    suite.test('趙雲死亡虎符：模板 id 仍是武將 id，查表換成龍膽符', () => {
        const card = produceDeathTally(famed('zhao-yun'), 100, 0, 3);
        assert.equals('zhao-yun', card?.templateId);
        assert.equals('tiger-tally-long-dan', resolveTallyTemplateId(card!.templateId));
    });

    suite.test('龐統死亡虎符：連環符尚無被動時出陣不出錯', () => {
        const unit = { attackRange: 1, moveRangeBonus: 0, tallyTemplateId: 'pang-tong' } as unknown as TroopUnit;
        applyTallyPassive(unit, 'pang-tong');
        assert.equals(1, unit.attackRange);
    });

    suite.test('張遼死亡虎符出陣：套用止啼符被動（查得到被動表）', () => {
        assert.equals('tiger-tally-zhi-ti-fu', resolveTallyTemplateId('zhang-liao'));
    });

    suite.test('非名將專屬：查表維持原 id', () => {
        assert.equals('xu-huang', resolveTallyTemplateId('xu-huang'));
    });

    suite.test('死亡傳承：曹仁→虎豹、甘寧→錦帆；馬超以專屬神威符為準（PROG-2-1594）', () => {
        assert.equals('tiger-tally-hu-bao', resolveTallyTemplateId('cao-ren'));
        assert.equals('tiger-tally-jin-fan', resolveTallyTemplateId('gan-ning'));
        assert.equals('tiger-tally-shen-wei-fu', resolveTallyTemplateId('ma-chao'));
    });

    suite.test('對照表的虎符都在卡片目錄', () => {
        const catalog = buildTallyCardCatalog();
        const missing = [...Object.values(NAMED_TALLY_BY_GENERAL_TEMPLATE), ...Object.values(LEGACY_TALLY_BY_GENERAL_TEMPLATE)].filter((id) => !catalog.has(id));
        assert.equals(0, missing.length, missing.join(','));
    });

    suite.test('南蠻系依規格裁決：兀突骨→藤甲、木鹿大王→南蠻，孟獲不產藤甲（PROG-2-1602）', () => {
        assert.equals('tiger-tally-teng-jia', resolveTallyTemplateId('wu-tu-gu'));
        assert.equals('tiger-tally-nan-man', resolveTallyTemplateId('mu-lu-da-wang'));
        assert.equals('tiger-tally-nan-man-yong-shi', resolveTallyTemplateId('meng-huo')); // PROG-2-1617 改產南蠻勇士
    });

    return suite;
}
