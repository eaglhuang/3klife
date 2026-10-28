/**
 * SevenDayJourney.test.ts — 七天歷程的日數、觸發點與事實（RET-12 / PROG-2-1443）純邏輯測試。
 *
 * 鎖住：第 1 天＝首次登入日，第 8 天起結束；觸發點只在事實成立時寫一次；漏登後的里程碑晚到但不重複；
 * 子嗣事實與三代判定；讀檔正規化。
 *
 * Unity 對照：Timeline Marker 依遊戲日數推進，每個 Marker 只播一次。
 */
import { assert, TestSuite } from './TestRunner';
import type { BreedingBirthRecord } from '../assets/scripts/core/systems/BreedingBirthRecord';
import {
    advanceSevenDayJourney, createSevenDayJourneyState, journeyDayOf, journeyFactsOf, normalizeSevenDayJourney,
    SEVEN_DAY_TRIGGERS, type JourneyFacts,
} from '../assets/scripts/core/systems/SevenDayJourney';

const NONE: JourneyFacts = { DAILY_NEWS: false, CHILD_BORN: false, DAQI_BORN: false, THREE_GENERATION: false };
const NEWS: JourneyFacts = { ...NONE, DAILY_NEWS: true };
const CHILD: JourneyFacts = { ...NONE, CHILD_BORN: true };
const DAQI: JourneyFacts = { ...CHILD, DAQI_BORN: true };
const THREE_GEN: JourneyFacts = { ...DAQI, THREE_GENERATION: true };

function child(uid: string, fatherId: string, motherId: string, isDaqi = false): BreedingBirthRecord {
    return { session: {}, child: { UID: uid, Father_ID: fatherId, Mother_ID: motherId, Is_Daqi: isDaqi } } as unknown as BreedingBirthRecord;
}

export function createSevenDayJourneySuite(): TestSuite {
    const suite = new TestSuite('SevenDayJourney (七天歷程 RET-12 PROG-2-1443)');

    suite.test('journeyDayOf：首次登入日為第 1 天，第 7 天為最後一天，第 8 天起與早於首次登入都回傳 null', () => {
        assert.equals(1, journeyDayOf('2026-10-28', '2026-10-28'));
        assert.equals(7, journeyDayOf('2026-10-28', '2026-11-03'));
        assert.equals(null, journeyDayOf('2026-10-28', '2026-11-04'));
        assert.equals(null, journeyDayOf('2026-10-28', '2026-10-27'));
    });

    suite.test('第 1 天的日報觸發點：首次登入當天就寫一次，同日再登入不重寫', () => {
        const first = advanceSevenDayJourney(createSevenDayJourneyState(), '2026-10-28', NEWS);
        assert.equals('DAY1_DAILY_NEWS', first.fired.map((t) => t.id).join(','));
        assert.equals('2026-10-28', first.state.firstLoginDay);

        const again = advanceSevenDayJourney(first.state, '2026-10-28', NEWS);
        assert.equals(0, again.fired.length);
        assert.equals('DAY1_DAILY_NEWS', again.state.firedIds.join(','));
    });

    suite.test('漏登：第 5 天才登入時，第 2 天的子嗣觸發點補發一次，之後不重複', () => {
        const start = { firstLoginDay: '2026-10-28', firedIds: ['DAY1_DAILY_NEWS'] };
        const late = advanceSevenDayJourney(start, '2026-11-01', CHILD);
        assert.equals('DAY2_CHILD_BORN', late.fired.map((t) => t.id).join(','));
        const later = advanceSevenDayJourney(late.state, '2026-11-02', CHILD);
        assert.equals(0, later.fired.length);
    });

    suite.test('事實未成立時不觸發，之後成立才觸發（第 2 天沒子嗣，第 3 天才有）', () => {
        const day2 = advanceSevenDayJourney({ firstLoginDay: '2026-10-28', firedIds: [] }, '2026-10-29', NONE);
        assert.equals(0, day2.fired.length);
        const day3 = advanceSevenDayJourney(day2.state, '2026-10-30', CHILD);
        assert.equals('DAY2_CHILD_BORN', day3.fired.map((t) => t.id).join(','));
    });

    suite.test('第 4 天的 Is_Daqi 與第 7 天的三代血統各自觸發，第 8 天起不再觸發', () => {
        const day4 = advanceSevenDayJourney({ firstLoginDay: '2026-10-28', firedIds: ['DAY1_DAILY_NEWS', 'DAY2_CHILD_BORN'] }, '2026-10-31', DAQI);
        assert.equals('DAY4_DAQI', day4.fired.map((t) => t.id).join(','));
        const day7 = advanceSevenDayJourney(day4.state, '2026-11-03', THREE_GEN);
        assert.equals('DAY7_THREE_GENERATION', day7.fired.map((t) => t.id).join(','));
        const day8 = advanceSevenDayJourney(day7.state, '2026-11-04', THREE_GEN);
        assert.equals(0, day8.fired.length);
    });

    suite.test('advanceSevenDayJourney 不改動傳入的狀態', () => {
        const before = { firstLoginDay: null, firedIds: [] as string[] };
        advanceSevenDayJourney(before, '2026-10-28', NEWS);
        assert.equals(null, before.firstLoginDay);
        assert.equals(0, before.firedIds.length);
    });

    suite.test('journeyFactsOf：沒有子嗣為全假；有 Is_Daqi 為真；子嗣的父母是另一位子嗣才算三代', () => {
        const none = journeyFactsOf([]);
        assert.isFalse(none.CHILD_BORN);
        assert.isFalse(none.DAQI_BORN);
        assert.isFalse(none.THREE_GENERATION);

        const daqi = journeyFactsOf([child('C1', 'G1', 'G2', true)]);
        assert.isTrue(daqi.CHILD_BORN);
        assert.isTrue(daqi.DAQI_BORN);
        assert.isFalse(daqi.THREE_GENERATION);

        const siblings = journeyFactsOf([child('C1', 'G1', 'G2'), child('C2', 'G1', 'G2')]);
        assert.isFalse(siblings.THREE_GENERATION);

        const grandchild = journeyFactsOf([child('C1', 'G1', 'G2'), child('C9', 'C1', 'G3')]);
        assert.isTrue(grandchild.THREE_GENERATION);
    });

    suite.test('normalizeSevenDayJourney：非物件回到初始；壞日期視為未登入；未知與重複的觸發點 id 會被去掉', () => {
        assert.equals(null, normalizeSevenDayJourney('oops').firstLoginDay);
        assert.equals(null, normalizeSevenDayJourney({ firstLoginDay: '10/28/2026', firedIds: [] }).firstLoginDay);
        const cleaned = normalizeSevenDayJourney({
            firstLoginDay: '2026-10-28',
            firedIds: ['DAY1_DAILY_NEWS', 'DAY1_DAILY_NEWS', 'NOT_A_TRIGGER', 7],
        });
        assert.equals('2026-10-28', cleaned.firstLoginDay);
        assert.equals('DAY1_DAILY_NEWS', cleaned.firedIds.join(','));
    });

    suite.test('觸發點配置：四個關鍵觸發點依 Day 1／2／4／7 排列，並同時適用兩軌', () => {
        assert.equals([1, 2, 4, 7].join(','), SEVEN_DAY_TRIGGERS.map((t) => t.day).join(','));
        for (const trigger of SEVEN_DAY_TRIGGERS) {
            assert.equals(2, trigger.tracks.length, trigger.id);
        }
    });

    return suite;
}
