/**
 * 家族子嗣血統遺傳 Facade 三介面與家門奇才判定測試（PROG-2-9604）
 * 覆蓋：
 * 1. inheritPotential 五維潛力繼承（1~5 星約束）
 * 2. inheritBloodline 因子與奧義繼承
 * 3. rollGenius 基礎 3% 機率、雙親 EP 加成（單方+1%、雙方+2%）、上限 6%
 * 4. rollGenius 近親判定劣化懲罰（機率 ×0.5）
 * 5. rollGenius 12 人硬保底（consecutiveNonGeniusCount 滿 11 位後第 12 位必出並重置）
 * 6. rollGenius 義子不判定（isAdopted 排除）
 */

import { TestSuite, assert } from './TestRunner';
import {
  inheritPotential,
  inheritBloodline,
  rollGenius,
  ParentCandidate
} from '../assets/scripts/core/systems/breeding/BloodlineInheritFacade';

export function createBloodlineInheritFacadeSuite(): TestSuite {
  const suite = new TestSuite('BloodlineInheritFacade (血統遺傳Facade三介面與家門奇才 PROG-2-9604)');

  const parentBaseA: ParentCandidate = {
    id: 'parent_a',
    ep: 75,
    potentials: { str: 4, int: 3, lea: 4, pol: 2, cha: 3 },
    genes: ['gene_brave', 'gene_tactics'],
    secretArts: ['art_dragon_slash']
  };

  const parentBaseB: ParentCandidate = {
    id: 'parent_b',
    ep: 80,
    potentials: { str: 3, int: 4, lea: 3, pol: 4, cha: 4 },
    genes: ['gene_intellect', 'gene_beauty'],
    secretArts: ['art_phoenix_dance']
  };

  suite.test('介面一：inheritPotential 五維潛力繼承（1~5 星箝制）', () => {
    const pot = inheritPotential(parentBaseA, parentBaseB, 12345);
    const stats = ['str', 'int', 'lea', 'pol', 'cha'] as const;

    for (const s of stats) {
      assert.isTrue(pot[s] >= 1, `${s} 潛力應 >= 1`);
      assert.isTrue(pot[s] <= 5, `${s} 潛力應 <= 5`);
    }
  });

  suite.test('介面二：inheritBloodline 因子與家傳奧義候選繼承', () => {
    const blood = inheritBloodline(parentBaseA, parentBaseB, 54321);
    assert.isTrue(Array.isArray(blood.inheritedGenes));
    assert.isTrue(Array.isArray(blood.secretArtCandidates));
  });

  suite.test('介面三：rollGenius 基礎機率與雙親 EP 加成驗算', () => {
    // 1. 普通雙親 (EP 75 & 80 < 85) -> 基礎 3%
    const resBase = rollGenius(parentBaseA, parentBaseB, { consecutiveNonGeniusCount: 0 }, 100);
    assert.equals(0.03, Number(resBase.geniusChance.toFixed(4)));

    // 2. 單親高 EP (parentA EP 86 >= 85) -> 3% + 1% = 4%
    const resSingle = rollGenius({ ...parentBaseA, ep: 86 }, parentBaseB, { consecutiveNonGeniusCount: 0 }, 100);
    assert.equals(0.04, Number(resSingle.geniusChance.toFixed(4)));

    // 3. 雙親高 EP (parentA EP 88, parentB EP 90) -> 3% + 2% = 5%
    const resBoth = rollGenius({ ...parentBaseA, ep: 88 }, { ...parentBaseB, ep: 90 }, { consecutiveNonGeniusCount: 0 }, 100);
    assert.equals(0.05, Number(resBoth.geniusChance.toFixed(4)));
  });

  suite.test('介面三：rollGenius 近親劣化懲罰（機率折半）', () => {
    // 雙親高 EP (5%)，但有近親標記 -> 5% * 0.5 = 2.5%
    const resConsang = rollGenius(
      { ...parentBaseA, ep: 88, isConsanguineous: true },
      { ...parentBaseB, ep: 90 },
      { consecutiveNonGeniusCount: 0 },
      100
    );
    assert.equals(0.025, Number(resConsang.geniusChance.toFixed(4)));
  });

  suite.test('介面三：rollGenius 12 人硬保底機制驗算', () => {
    // 前 11 位親生非奇才，第 12 位判定
    const pityState = { consecutiveNonGeniusCount: 11 };
    const resPity = rollGenius(parentBaseA, parentBaseB, pityState, 9999);

    assert.equals(true, resPity.isGenius, '第 12 位應觸發硬保底');
    assert.equals(true, resPity.isPityTriggered, '應標記為保底觸發');
    assert.equals(true, resPity.extraSecretArtSlot, '應解鎖額外奧義槽');
    assert.equals('家門奇才', resPity.honorTitle);
    assert.equals(0, resPity.updatedFamilyState.consecutiveNonGeniusCount, '保底後計數應重置為 0');
  });

  suite.test('介面三：rollGenius 義子排除判定', () => {
    // 即使保底計數已達 11，但若為義子（isAdopted=true），不得判定奇才
    const pityState = { consecutiveNonGeniusCount: 11 };
    const resAdopted = rollGenius(parentBaseA, parentBaseB, pityState, 9999, true);

    assert.equals(false, resAdopted.isGenius, '義子不得觸發奇才');
    assert.equals(false, resAdopted.isPityTriggered);
    assert.equals(null, resAdopted.honorTitle);
    assert.equals(11, resAdopted.updatedFamilyState.consecutiveNonGeniusCount, '義子不消耗保底計數');
  });

  return suite;
}
