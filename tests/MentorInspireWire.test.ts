/**
 * MentorInspireWire.test.ts — 教官支援卡接上戰法靈感引擎（PROG-2-0500）headless 測試
 *
 * 驗證：支援卡的靈感事件會進入培育擲骰、同場只觸發一次、閘門不過不觸發、
 * 沒有支援卡資料的教官不擲骰（行為與舊版相同）。
 * Unity 對照：EditMode Test 直接驅動 Service，不開場景。
 */
import { TestSuite, assert } from './TestRunner';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { mentorFromCard, NURTURE_TOTAL_ROUNDS } from '../assets/scripts/core/systems/NurtureSystem';
import { inspireEventsFromSupport } from '../assets/scripts/core/systems/MentorInspiration';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { chooseFate, unveilGeneral, UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { parseSupportCard, SupportCardDef } from '../assets/scripts/core/models/MentorSupportSchema';
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

function child(id: string, extra: Partial<UnveilingGeneral> = {}): UnveilingGeneral {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'], genes: [], ...extra,
    } as UnveilingGeneral;
}

/** 已開獎並選擇順應宿命，可直接入學 */
function unveiled(id: string, extra: Partial<UnveilingGeneral> = {}): UnveilingGeneral {
    return chooseFate(unveilGeneral(child(id, extra)).general, 'accept');
}

/** 一張帶支援卡資料的教官卡；事件由呼叫端決定 */
function supportWith(events: Record<string, unknown>[]): SupportCardDef {
    const result = parseSupportCard({
        Support_ID: 'SUP_TEST_SSR_01',
        Name: '測試教官',
        Rarity: 'SSR',
        Teaching_Style: '槍法',
        Stat_Bonus: { STR: 8 },
        Tactic_Inspire_Events: events,
        Passive_Effects: [],
        Friendship_Bonus: [1.0, 1.1, 1.2, 1.3, 1.4, 1.5],
        Training_Effect: [1.0, 1.05, 1.1, 1.15, 1.2, 1.3],
        Training_Slot_Affinity: ['STR'],
        Slot_Burst_Rate: 0.55,
        Synergy_Partners: [],
        Source: 'Gacha',
        Role_Boundary: 'TeachingOnly',
    });
    if (!result.ok) throw new Error(`測試用支援卡不合法：${result.errors.join('; ')}`);
    return result.value;
}

function cardWith(support: SupportCardDef | undefined, uid = 'mentor-guan'): MentorCard {
    const generalSnapshot = unveiled('guan') as unknown as GeneralConfig;
    return {
        uid, sourceGeneralId: 'guan', name: '關羽', faction: 'shu',
        retiredAge: 66, retiredSeason: 4, retiredYear: 2, ep_snapshot: 80, gene_refs: [],
        parentUids: ['f', 'm'], generalSnapshot,
        ...(support ? { support } : {}),
    } as MentorCard;
}

function startWith(mentorCards: MentorCard[], childExtra: Partial<UnveilingGeneral> = {}): { nurture: NurtureService; childId: string } {
    const roster = new InMemoryRosterStore([unveiled('alpha', childExtra)]);
    const nurture = new NurtureService(roster, {
        random: seeded(11),
        currentSeason: () => 3,
        currentMode: () => GameTimeMode.Nurture,
        requireNurtureMode: true,
    });
    nurture.startWithCards('alpha', mentorCards);
    return { nurture, childId: 'alpha' };
}

export function createMentorInspireWireSuite(): TestSuite {
    const suite = new TestSuite('MentorInspireWire (支援卡接戰法靈感引擎 PROG-2-0500)');

    suite.test('支援卡事件映射到引擎格式：欄位一一對應，沒有血統的不帶 bloodlineRequired', () => {
        const def = supportWith([
            { Event_ID: 'EVT_A', Tactic_ID: 'TAC_A', Trigger_Window: [1, 12], Base_Rate: 0.3, Min_Star: 0 },
            { Event_ID: 'EVT_B', Tactic_ID: 'TAC_B', Trigger_Window: [1, 36], Base_Rate: 0.1, Min_Star: 5, Bloodline_Required: 'ZHAO' },
        ]);
        const events = inspireEventsFromSupport(def);
        assert.equals(2, events.length);
        assert.equals('EVT_A', events[0].eventId);
        assert.isTrue(events[0].bloodlineRequired === undefined);
        assert.isFalse('bloodlineRequired' in events[0], '沒有血統時不產生欄位');
        assert.equals('ZHAO', events[1].bloodlineRequired!);
    });

    suite.test('mentorFromCard：有支援卡才帶 inspire；友情表換成小數（倍率 − 1）', () => {
        const def = supportWith([{ Event_ID: 'EVT_A', Tactic_ID: 'TAC_A', Trigger_Window: [1, 36], Base_Rate: 0.3, Min_Star: 0 }]);
        const withSupport = mentorFromCard(cardWith(def));
        assert.isTrue(withSupport.inspire !== undefined);
        assert.equals(1, withSupport.inspire!.events.length);
        assert.isTrue(Math.abs(withSupport.inspire!.friendshipBonusByStar[2] - 0.2) < 1e-9);

        const plain = mentorFromCard(cardWith(undefined));
        assert.isTrue(plain.inspire === undefined, '舊卡沒有支援資料就沒有 inspire');
    });

    suite.test('基礎率 1 的事件在第一回合必定觸發，寫入會話且回傳觸發紀錄', () => {
        const def = supportWith([{ Event_ID: 'EVT_A', Tactic_ID: 'TAC_A', Trigger_Window: [1, 36], Base_Rate: 1, Min_Star: 0 }]);
        const { nurture, childId } = startWith([cardWith(def)]);
        const result = nurture.train(childId, 'str');
        assert.equals(1, result.inspirations?.length ?? 0);
        assert.equals('EVT_A', result.inspirations![0].eventId);
        assert.equals('TAC_A', result.inspirations![0].tacticId);
        assert.equals('mentor-guan:EVT_A', nurture.getSession(childId)!.inspiredKeys![0]);
    });

    suite.test('同一事件同場只觸發一次：第二回合不再回報', () => {
        const def = supportWith([{ Event_ID: 'EVT_A', Tactic_ID: 'TAC_A', Trigger_Window: [1, 36], Base_Rate: 1, Min_Star: 0 }]);
        const { nurture, childId } = startWith([cardWith(def)]);
        nurture.train(childId, 'str');
        const second = nurture.train(childId, 'int');
        assert.isTrue(second.inspirations === undefined, '已觸發的事件不再回報');
    });

    suite.test('閘門不過不觸發：回合區間外、星等不足', () => {
        const late = supportWith([{ Event_ID: 'EVT_LATE', Tactic_ID: 'TAC_L', Trigger_Window: [30, 36], Base_Rate: 1, Min_Star: 0 }]);
        const { nurture, childId } = startWith([cardWith(late)]);
        assert.isTrue(nurture.train(childId, 'str').inspirations === undefined, '第 1 回合不在 30~36 區間');

        const starred = supportWith([{ Event_ID: 'EVT_STAR', Tactic_ID: 'TAC_S', Trigger_Window: [1, 36], Base_Rate: 1, Min_Star: 5 }]);
        const second = startWith([cardWith(starred)]);
        assert.isTrue(second.nurture.train(second.childId, 'str').inspirations === undefined, '★0 不能觸發 ★5 的事件');
    });

    suite.test('家傳血統：子嗣沒有指定血統則不觸發，有血統才觸發', () => {
        const def = supportWith([{ Event_ID: 'EVT_ZHAO', Tactic_ID: 'TAC_Z', Trigger_Window: [1, 36], Base_Rate: 1, Min_Star: 0, Bloodline_Required: 'ZHAO' }]);
        const none = startWith([cardWith(def)]);
        assert.isTrue(none.nurture.train(none.childId, 'str').inspirations === undefined, '沒有 ZHAO 血統不觸發');

        const blooded = startWith([cardWith(def)], { bloodlineId: 'ZHAO' });
        assert.equals(1, blooded.nurture.train(blooded.childId, 'str').inspirations?.length ?? 0, '有 ZHAO 血統觸發');
    });

    suite.test('休息回合不擲靈感（PM 裁定，暫定）：只有訓練回合擲', () => {
        const def = supportWith([{ Event_ID: 'EVT_A', Tactic_ID: 'TAC_A', Trigger_Window: [1, 36], Base_Rate: 1, Min_Star: 0 }]);
        const { nurture, childId } = startWith([cardWith(def)]);
        assert.isTrue(nurture.train(childId, 'rest').inspirations === undefined, '休息回合不觸發');
        assert.equals(1, nurture.train(childId, 'str').inspirations?.length ?? 0, '訓練回合才觸發');
    });

    suite.test('沒有支援卡資料的教官不擲骰：會話不會寫入 inspiredKeys', () => {
        const { nurture, childId } = startWith([cardWith(undefined)]);
        for (let round = 0; round < 6; round++) nurture.train(childId, 'str');
        assert.isTrue(nurture.getSession(childId)!.inspiredKeys === undefined);
    });

    suite.test('多位教官各自的事件互不干擾：鍵帶教官 uid', () => {
        const def = supportWith([{ Event_ID: 'EVT_A', Tactic_ID: 'TAC_A', Trigger_Window: [1, 36], Base_Rate: 1, Min_Star: 0 }]);
        const { nurture, childId } = startWith([cardWith(def, 'mentor-a'), cardWith(def, 'mentor-b')]);
        const result = nurture.train(childId, 'str');
        assert.equals(2, result.inspirations?.length ?? 0);
        assert.equals('mentor-a', result.inspirations![0].mentorId);
        assert.equals('mentor-b', result.inspirations![1].mentorId);
    });

    suite.test('測試回合數與規格一致（36 回合）', () => {
        assert.equals(36, NURTURE_TOTAL_ROUNDS);
    });

    return suite;
}
