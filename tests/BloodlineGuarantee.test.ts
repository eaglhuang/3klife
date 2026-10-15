/**
 * BloodlineGuarantee.test.ts — 世家血脈保底（NUR-11）headless 測試
 *
 * 姓氏相同：靈感事件保底必中、TP 需求 ×0.8；異姓：回歸機率擲骰，無保底。
 * Unity 對照：EditMode Test 驗證 Rule 元件在欄位相同與不同時的輸出。
 */
import { TestSuite, assert } from './TestRunner';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { chooseFate, unveilGeneral, UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import {
    isBloodlineMatch,
    bloodlineTpMultiplier,
    BLOODLINE_TP_DISCOUNT,
    BLOODLINE_DEADLINE_ROUND,
    isBloodlineGuaranteedRound,
    scaleSpecRoundToImpl,
} from '../assets/scripts/core/systems/BloodlineGuarantee';
import { mentorFromCard } from '../assets/scripts/core/systems/NurtureSystem';
import { parseSupportCard } from '../assets/scripts/core/models/MentorSupportSchema';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function child(id: string, name: string): UnveilingGeneral {
    return chooseFate(unveilGeneral({
        id, name, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'], genes: [],
    } as unknown as UnveilingGeneral).general, 'accept');
}

/** 基礎率 0 的事件：不保底就永遠不會觸發 */
function zeroRateCard(): MentorCard {
    const support = parseSupportCard({
        Support_ID: 'SUP_GUAN_SSR_01', Name: '關羽', Rarity: 'SSR', Teaching_Style: '武藝',
        Stat_Bonus: { STR: 8 },
        Tactic_Inspire_Events: [{ Event_ID: 'EVT_G1', Tactic_ID: 'TAC_G', Trigger_Window: [1, 36], Base_Rate: 0, Min_Star: 0 }],
        Passive_Effects: [], Friendship_Bonus: [1, 1, 1, 1, 1, 1], Training_Effect: [1, 1, 1, 1, 1, 1],
        Training_Slot_Affinity: ['STR'], Slot_Burst_Rate: 0.55, Synergy_Partners: [], Source: 'Gacha', Role_Boundary: 'TeachingOnly',
    });
    if (!support.ok) throw new Error(support.errors.join('; '));
    return {
        uid: 'mentor-guan', sourceGeneralId: 'guan', name: '關羽', faction: 'shu',
        retiredAge: 66, retiredSeason: 4, retiredYear: 2, ep_snapshot: 80, gene_refs: [],
        parentUids: ['f', 'm'],
        generalSnapshot: unveilGeneral({ id: 'guan', name: '關羽', faction: 'shu', str: 90, int: 40, lea: 70, pol: 30, cha: 50, luk: 60, hiddenFlags: [], genes: [] } as unknown as UnveilingGeneral).general as unknown as GeneralConfig,
        support: support.value,
    } as MentorCard;
}

function triggeredWith(childName: string): number {
    const roster = new InMemoryRosterStore([child('alpha', childName)]);
    const nurture = new NurtureService(roster, {
        random: seeded(3), currentSeason: () => 3,
        currentMode: () => GameTimeMode.Nurture, requireNurtureMode: true,
    });
    nurture.startWithCards('alpha', [zeroRateCard()]);
    let total = 0;
    for (let round = 0; round < 6; round++) total += nurture.train('alpha', 'str').inspirations?.length ?? 0;
    return total;
}

export function createBloodlineGuaranteeSuite(): TestSuite {
    const suite = new TestSuite('BloodlineGuarantee (世家血脈保底 NUR-11)');

    suite.test('姓氏相同才配對；沒有名字、沒有家族、無名佔位都不配對', () => {
        assert.isTrue(isBloodlineMatch('關興', '關'));
        assert.isFalse(isBloodlineMatch('劉禪', '關'));
        assert.isFalse(isBloodlineMatch(undefined, '關'));
        assert.isFalse(isBloodlineMatch('關興', undefined));
        assert.isFalse(isBloodlineMatch('', '某'));
    });

    suite.test('TP 倍率：配對 ×0.8（PT-20%），不配對 ×1', () => {
        assert.isTrue(Math.abs(bloodlineTpMultiplier(true) - (1 - BLOODLINE_TP_DISCOUNT)) < 1e-9);
        assert.isTrue(Math.abs(bloodlineTpMultiplier(true) - 0.8) < 1e-9);
        assert.equals(1, bloodlineTpMultiplier(false));
    });

    suite.test('期限換算：規格 60 回合 → 實作 36 回合；其餘按比例無條件進位', () => {
        assert.equals(36, scaleSpecRoundToImpl(60));
        assert.equals(18, scaleSpecRoundToImpl(30));
        assert.equals(30, scaleSpecRoundToImpl(50));
        assert.equals(27, scaleSpecRoundToImpl(45));
        assert.equals(36, BLOODLINE_DEADLINE_ROUND);
        assert.isTrue(isBloodlineGuaranteedRound(BLOODLINE_DEADLINE_ROUND));
        assert.isFalse(isBloodlineGuaranteedRound(BLOODLINE_DEADLINE_ROUND + 1), '期限後不保底');
        assert.isFalse(isBloodlineGuaranteedRound(0), '第 0 回合不保底');
    });

    suite.test('mentorFromCard 預設家族名取自卡名的姓（關羽 → 關）', () => {
        assert.equals('關', mentorFromCard(zeroRateCard()).familyName!);
    });

    suite.test('同姓子弟：基礎率 0 的靈感仍在 36 回合內保底觸發', () => {
        assert.isTrue(triggeredWith('關興') > 0);
    });

    suite.test('異姓子弟：無保底，基礎率 0 永遠不觸發', () => {
        assert.equals(0, triggeredWith('劉禪'));
    });

    return suite;
}
