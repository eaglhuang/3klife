/**
 * ChildUnveiling — 子嗣天象、大器晚成、職能宿命、告別絕筆（doc_spec_0312；PROG-2-1939）
 */
import { assert, TestSuite } from './TestRunner';
import {
    CAREER_FATE_BUFFS, ChildStats, EPITAPH_TEXT, epitaphTypeFor, isLateBloomerCandidate, lateBloomerGrowthMultiplier,
    pickChildOmen, recommendCareerFate, rollLateBloomer,
} from '../assets/scripts/core/systems/ChildUnveiling';

function stats(extra: Partial<ChildStats> = {}): ChildStats {
    return { str: 50, int: 50, lea: 50, pol: 50, cha: 50, luk: 50, ...extra };
}

export function createChildUnveilingSuite(): TestSuite {
    const suite = new TestSuite('ChildUnveiling (子嗣開獎 doc_spec_0312 PROG-2-1939)');

    suite.test('TC-UNVEIL-01 天象門檻與優先序', () => {
        assert.equals('OMEN_PURPLE_QI', pickChildOmen(85, false, stats(), false));
        assert.equals('OMEN_PURPLE_QI', pickChildOmen(10, true, stats(), true));
        assert.equals('OMEN_METEOR_DREAM', pickChildOmen(75, false, stats({ str: 99 }), false));
        assert.equals('OMEN_TIGER_ROAR', pickChildOmen(60, false, stats({ lea: 80 }), true));
        assert.equals('OMEN_DEER_HERB', pickChildOmen(60, false, stats(), true));
        assert.equals(null, pickChildOmen(60, false, stats(), false));
    });

    suite.test('TC-UNVEIL-02 大器晚成資格、擲骰與 25 歲 ×1.5', () => {
        const low = stats({ str: 30, int: 30, lea: 30, pol: 30, cha: 30 });
        assert.isTrue(isLateBloomerCandidate(low, false));
        assert.isFalse(isLateBloomerCandidate(stats(), false));
        assert.isTrue(isLateBloomerCandidate(stats(), true));
        assert.isTrue(rollLateBloomer(true, true, () => 0.34));
        assert.isFalse(rollLateBloomer(true, false, () => 0.1));
        assert.isTrue(rollLateBloomer(true, false, () => 0.19, 2));
        assert.isFalse(rollLateBloomer(false, true, () => 0));
        assert.equals(0.8, lateBloomerGrowthMultiplier(true, 24));
        assert.equals(1.5, lateBloomerGrowthMultiplier(true, 25));
        assert.equals(1, lateBloomerGrowthMultiplier(false, 30));
    });

    suite.test('TC-UNVEIL-03 四向宿命推薦與福祉', () => {
        assert.equals('Warrior', recommendCareerFate(stats({ str: 90 }), false));
        assert.equals('Scholar', recommendCareerFate(stats({ pol: 90 }), false));
        assert.equals('ClanKeeper', recommendCareerFate(stats({ luk: 90 }), false));
        assert.equals('Hermit', recommendCareerFate(stats({ str: 99 }), true));
        assert.equals('Hermit', recommendCareerFate(stats({ str: 20, int: 20, lea: 20, pol: 20, cha: 20, luk: 20 }), false));
        assert.equals(0.2, CAREER_FATE_BUFFS.Warrior.expeditionFame);
        assert.equals(0.1, CAREER_FATE_BUFFS.ClanKeeper.conceptionRate);
        assert.equals(15, CAREER_FATE_BUFFS.Hermit.vitalityCap);
    });

    suite.test('TC-UNVEIL-04 告別信依條件選原文', () => {
        assert.equals('Retirement', epitaphTypeFor('retire', 3));
        assert.equals(null, epitaphTypeFor('retire', 2));
        assert.equals('BattleDeath', epitaphTypeFor('battle', 0));
        assert.equals('ClanShrine', epitaphTypeFor('natural', 0));
        assert.isTrue(EPITAPH_TEXT.Retirement.startsWith('主公明鑑'));
    });

    return suite;
}
