/**
 * FateTallyRules — 特種兵虎符規則落地（FATE-10，PROG-2-0611）的回歸測試
 *
 * 裁決對照：
 *   - Q62=A：召喚扣糧草，品質越高扣越多（TALLY_GRAIN_COST）。
 *   - Q64=A：同陣容 Set 集齊門檻後，同場攻防加成，同 Set 只加一次。
 *   - Q61=C：不設部署冷卻；契約中不得出現 cooldown 欄位。
 *   - Q64 的「Set 冷卻 -10%」沒有對象（Q61 不設冷卻），本卡不實作，待 PM 裁定。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { getTallyGrainCost, TALLY_GRAIN_COST_FALLBACK } from '../assets/scripts/core/systems/SortieDeploy';
import { TIGER_TALLY_SET_DEFS, fieldTallySetMods } from '../assets/scripts/core/systems/TigerTallySetBonus';

export function createFateTallyRulesSuite(): TestSuite {
    const suite = new TestSuite('FateTallyRules (特種兵虎符規則 FATE-10)');
    const root = path.resolve(__dirname, '..');
    const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
    const fiveTigers = TIGER_TALLY_SET_DEFS.find((def) => def.setId === 'SET_FIVE_TIGERS');

    suite.test('Q62：糧耗依品質與星級遞增，高品質英靈扣得比普通精銳多', () => {
        assert.isTrue(getTallyGrainCost('UR', 1) > getTallyGrainCost('R', 1), 'UR 應比 R 多');
        assert.isTrue(getTallyGrainCost('SSR', 5) > getTallyGrainCost('SSR', 1), '同品質星級越高應越多');
        assert.equals(TALLY_GRAIN_COST_FALLBACK, getTallyGrainCost('XX', 1), '查不到時走 fallback');
    });

    suite.test('Q62：出征部署的虎符糧耗來自 getTallyGrainCost', () => {
        const source = read('assets/scripts/core/systems/SortieDeploy.ts');
        assert.isTrue(source.includes('foodCost: getTallyGrainCost(request.tally.quality, request.tally.star),'), '虎符部署沒有使用糧耗表');
    });

    suite.test('Q64：五虎將集齊門檻（3 人）才觸發攻防加成 1.10', () => {
        assert.isTrue(fiveTigers !== undefined, '找不到五虎將 Set');
        if (!fiveTigers) return;
        assert.equals(3, fiveTigers.requiredCount);
        const members = fiveTigers.memberTroopIds.slice(0, 3).map((templateId) => ({ templateId, alive: true }));
        assert.equals(1.1, fieldTallySetMods(members).atkMod);
        assert.equals(1, fieldTallySetMods(members.slice(0, 2)).atkMod, '未達門檻不加成');
    });

    suite.test('Q64：同 Set 重複在場不疊加，陣亡成員不計', () => {
        if (!fiveTigers) return;
        const [a, b, c] = fiveTigers.memberTroopIds;
        const dupes = [a, a, a, b].map((templateId) => ({ templateId, alive: true }));
        assert.equals(1, fieldTallySetMods(dupes).atkMod, '同一成員重複不算數');
        const withDead = [a, b, c].map((templateId, index) => ({ templateId, alive: index !== 2 }));
        assert.equals(1, fieldTallySetMods(withDead).atkMod, '陣亡成員不計');
    });

    suite.test('Q61：虎符契約不含部署冷卻欄位', () => {
        for (const rel of ['assets/scripts/shared/TallyCardContract.ts', 'assets/scripts/core/models/TigerTallyCard.ts']) {
            assert.isFalse(read(rel).toLowerCase().includes('cooldown'), `${rel} 不應有冷卻欄位`);
        }
    });

    return suite;
}
