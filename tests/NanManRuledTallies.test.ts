// 裁定追加虎符：南蠻勇士（孟獲）／南蠻豹騎（祝融夫人）（PROG-2-1617）
import { TestSuite, assert } from './TestRunner';
import { buildTallyCardCatalog } from '../assets/scripts/core/config/TallyCardCatalog';
import { RULED_EXTRA_TALLIES, resolveTallyTemplateId } from '../assets/scripts/core/config/TigerTallySpecTactics';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';

export function createNanManRuledTalliesSuite(): TestSuite {
    const suite = new TestSuite('NanManRuledTallies');

    suite.test('孟獲死亡傳承南蠻勇士、祝融夫人傳承南蠻豹騎', () => {
        assert.equals('tiger-tally-nan-man-yong-shi', resolveTallyTemplateId('meng-huo'));
        assert.equals('tiger-tally-nan-man-bao-qi', resolveTallyTemplateId('zhu-rong-furen'));
    });

    suite.test('卡面數值為步兵／騎兵 ×1.1，技能為待實作殼', () => {
        const catalog = buildTallyCardCatalog();
        const yong = catalog.get('tiger-tally-nan-man-yong-shi')!;
        const bao = catalog.get('tiger-tally-nan-man-bao-qi')!;
        assert.equals('infantry', yong.unitType);
        assert.equals('cavalry', bao.unitType);
        assert.equals(Math.round(35 * 1.1), yong.atk);
        assert.equals(Math.round(120 * 1.1), yong.hp);
        assert.equals(Math.round(40 * 1.1), bao.atk);
        for (const extra of RULED_EXTRA_TALLIES) {
            assert.isTrue(resolveBattleSkillProfile(extra.battleSkillId)?.pendingEffect === true, `${extra.battleSkillId} 應為殼`);
        }
    });

    return suite;
}
