/**
 * TigerTallySpecTactics — 虎符特殊戰法 34 條對照與 BattleSkill 管線 smoke（PROG-2-0928，TRP-15）
 *
 * 驗證每條規格戰法都有 battleSkillId、能解析成 profile，並能經 TigerTallyTacticAdapter 組出請求。
 * 殼 profile（尚未實作效果）的 coefficient 必須為 0，確保未實作前不會造成未定義的傷害。
 *
 * Unity 對照：像在 Editor 裡掃一遍 ScriptableObject 清單，確認每個技能資產都有掛到執行腳本。
 */
import { TIGER_TALLY_SPEC_TACTICS, TIGER_TALLY_PENDING_SKILL_IDS } from '../assets/scripts/core/config/TigerTallySpecTactics';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { TigerTallyTacticAdapter } from '../assets/scripts/battle/skills/adapters/TigerTallyTacticAdapter';
import { BattleSkillTargetMode, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

export function createTigerTallySpecTacticsSuite(): TestSuite {
  const suite = new TestSuite('TigerTallySpecTactics (虎符特殊戰法 34 條 TRP-15)');

  suite.test('規格 34 條：通用 17 + 名將專屬 17，tacticId 與 battleSkillId 皆不重複', () => {
    assert.equals(34, TIGER_TALLY_SPEC_TACTICS.length);
    assert.equals(17, TIGER_TALLY_SPEC_TACTICS.filter(tactic => tactic.group === 'general').length);
    assert.equals(17, TIGER_TALLY_SPEC_TACTICS.filter(tactic => tactic.group === 'named').length);
    assert.equals(34, new Set(TIGER_TALLY_SPEC_TACTICS.map(tactic => tactic.tacticId)).size);
    assert.equals(34, new Set(TIGER_TALLY_SPEC_TACTICS.map(tactic => tactic.battleSkillId)).size);
  });

  suite.test('每條 battleSkillId 都能解析成 BattleSkill profile', () => {
    for (const tactic of TIGER_TALLY_SPEC_TACTICS) {
      assert.isTrue(resolveBattleSkillProfile(tactic.battleSkillId) !== null, `${tactic.unitName} 的 ${tactic.battleSkillId} 應有 profile`);
    }
  });

  suite.test('沿用既有 profile 的 11 條與規格一致；其餘 23 條為殼', () => {
    assert.equals(11, TIGER_TALLY_SPEC_TACTICS.filter(tactic => tactic.reusesProfile).length);
    assert.equals(23, TIGER_TALLY_PENDING_SKILL_IDS.length);
    for (const tactic of TIGER_TALLY_SPEC_TACTICS.filter(item => item.reusesProfile)) {
      assert.isTrue(resolveBattleSkillProfile(tactic.battleSkillId)!.battleSkillId === tactic.battleSkillId);
    }
  });

  suite.test('殼 profile 的 coefficient 為 0，未實作前不造成傷害', () => {
    for (const battleSkillId of TIGER_TALLY_PENDING_SKILL_IDS) {
      const profile = resolveBattleSkillProfile(battleSkillId);
      assert.isDefined(profile);
      assert.equals(0, profile!.coefficient, `${battleSkillId} 的 coefficient`);
      assert.equals(BattleSkillTargetMode.EnemySingle, profile!.targetMode);
    }
  });

  suite.test('陷陣沿用 G-1 無視防禦：防禦穿透 50%（規格「攻擊穿透 50% 防禦」）', () => {
    const xianZhen = TIGER_TALLY_SPEC_TACTICS.find(tactic => tactic.tallyName === '虎符：陷陣');
    assert.isDefined(xianZhen);
    assert.equals(0.5, resolveBattleSkillProfile(xianZhen!.battleSkillId)!.defensePenetrationRatio);
  });

  suite.test('TigerTallyTacticAdapter：每條都能組出 TigerTally 來源的戰鬥請求', () => {
    const adapter = new TigerTallyTacticAdapter();
    for (const tactic of TIGER_TALLY_SPEC_TACTICS) {
      const request = adapter.buildRequest(
        { tacticId: tactic.tacticId, battleSkillId: tactic.battleSkillId, unitName: tactic.unitName },
        'player-uid',
        { tacticId: tactic.tacticId, battleSkillId: tactic.battleSkillId },
      );
      assert.isDefined(request, `${tactic.unitName} 應能組出請求`);
      assert.equals(SkillSourceType.TigerTally, request!.sourceType);
      assert.equals(tactic.battleSkillId, request!.battleSkillId);
      assert.equals(tactic.tacticId, request!.tacticId);
    }
  });

  return suite;
}
