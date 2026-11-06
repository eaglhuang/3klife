/**
 * MvpLoopController — MVP 五階段總控與祠堂福祉（doc_spec_0308 §2、doc_spec_0310 §3；PROG-2-1911）
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    MvpPhase, MVP_STARTER_PACK, advanceMvpPhase, applyChildBirthBenefit, canAdvanceMvp, clanPrestigeBenefitOf,
    completeLegacyHandoff, startMvpLoop, type MvpLoopState,
} from '../assets/scripts/core/systems/MvpLoopController';

const TO_BATTLE = [MvpPhase.BONDING, MvpPhase.CHILD_BIRTH, MvpPhase.ACADEMY, MvpPhase.GRADUATION, MvpPhase.BATTLE_DEPLOY, MvpPhase.COMBAT_ASCEND];

function walk(state: MvpLoopState, phases: MvpPhase[]): MvpLoopState {
    return phases.reduce((s, p) => advanceMvpPhase(s, p), state);
}

export function createMvpLoopControllerSuite(): TestSuite {
    const suite = new TestSuite('MvpLoopController (MVP 五階段總控 PROG-2-1911)');

    suite.test('Phase 0 開局資源：金 1000、糧 2000、第 1 代、聲望 0', () => {
        const s = startMvpLoop();
        assert.equals(MvpPhase.LOBBY_SETUP, s.phase);
        assert.equals(MVP_STARTER_PACK.gold, s.gold);
        assert.equals(2000, s.food);
        assert.equals(1, s.generation);
    });

    suite.test('只能照狀態圖走：跳階或倒退拋錯，戰場可連續出征', () => {
        const s = startMvpLoop();
        assert.isFalse(canAdvanceMvp(s, MvpPhase.ACADEMY));
        assert.throws(() => advanceMvpPhase(s, MvpPhase.ACADEMY));
        const battle = walk(s, TO_BATTLE);
        const again = walk(battle, [MvpPhase.BATTLE_DEPLOY, MvpPhase.COMBAT_ASCEND]);
        assert.equals(MvpPhase.COMBAT_ASCEND, again.phase);
        assert.throws(() => advanceMvpPhase(again, MvpPhase.GRADUATION));
        const handoff = advanceMvpPhase(again, MvpPhase.LEGACY_HANDOFF);
        assert.throws(() => advanceMvpPhase(handoff, MvpPhase.BONDING));
    });

    suite.test('三代貫通：功業換聲望升祠堂，二代福祉套用到子嗣', () => {
        let s = walk(startMvpLoop(), [...TO_BATTLE, MvpPhase.LEGACY_HANDOFF]);
        const g1 = completeLegacyHandoff(s, { finalRank: 5, totalKills: 12, totalWins: 30 });
        assert.equals(6100, g1.prestigeGain);
        assert.equals(3, g1.tier);
        assert.isTrue(g1.tierUp);
        assert.equals(110, g1.benefit.academyVitalityMax);
        assert.equals(2, g1.state.generation);
        assert.equals(MvpPhase.BONDING, g1.state.phase);

        const child = { id: 'gen2', name: '二代', str: 40, int: 33, lea: 50, pol: 20, cha: 30, generalRank: 0 } as unknown as GeneralConfig;
        const born = applyChildBirthBenefit(child, g1.tier) as unknown as Record<string, number>;
        assert.equals(44, born.str);
        assert.equals(36, born.int);
        assert.equals(1, born.generalRank);
        assert.equals(40, (child as unknown as Record<string, number>).str);

        s = walk(g1.state, [MvpPhase.CHILD_BIRTH, MvpPhase.ACADEMY, MvpPhase.GRADUATION, MvpPhase.BATTLE_DEPLOY, MvpPhase.COMBAT_ASCEND, MvpPhase.LEGACY_HANDOFF]);
        const g2 = completeLegacyHandoff(s, { finalRank: 5, totalKills: 40, totalWins: 60 });
        assert.equals(3, g2.state.generation);
        assert.equals(6100 + 10500, g2.state.clanPrestige);
        assert.equals(4, g2.tier);
        assert.isTrue(g2.benefit.extraMentorSlot && g2.benefit.guaranteedPurpleFactor);
        assert.equals(MvpPhase.BONDING, g2.state.trail[g2.state.trail.length - 1]);
    });

    suite.test('福祉表：Lv.1 無加成、Lv.5 +20% 且起點偏將軍；超出範圍夾住', () => {
        assert.equals(0, clanPrestigeBenefitOf(1).statBonusPct);
        assert.equals(20, clanPrestigeBenefitOf(5).statBonusPct);
        assert.equals(2, clanPrestigeBenefitOf(5).startRank);
        assert.equals(0, clanPrestigeBenefitOf(-3).statBonusPct);
        assert.isTrue(clanPrestigeBenefitOf(99).dailyShrinePill);
    });

    suite.test('非交接階段呼叫交接拋錯', () => {
        assert.throws(() => completeLegacyHandoff(startMvpLoop(), { finalRank: 1, totalKills: 0, totalWins: 0 }));
    });

    return suite;
}
