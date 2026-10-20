/**
 * NurtureLegendaryMentoring.test.ts — 培育畫面的傳道入口（MENT-15，PROG-2-0869）
 *
 * 檢查：專屬奧義由武將既有奧義欄位推導（暫定）；入口把名將與目前子嗣交給 GameSession；
 * 失敗只顯示原因，不視為成功；未接線時入口不可用。
 *
 * Unity 對照：像 Presenter 的一個按鈕 onClick，測試時換成假的 Command，只驗它被怎麼呼叫。
 */
import { TestSuite, assert } from './TestRunner';
import { NurtureFlowController, exclusiveSkillOf } from '../assets/scripts/ui/core/NurtureFlowController';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { unveilGeneral, UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';

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

function unveiledChild(id: string): UnveilingGeneral {
    return unveilGeneral({
        id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'], genes: [],
    } as unknown as UnveilingGeneral).general;
}

function legendHero(): GeneralConfig {
    return {
        id: 'hero', name: '英靈甲', faction: 'shu', gender: '男', age: 70, status: 'Dead', hp: 900,
        str: 90, int: 80, lea: 70, pol: 50, cha: 50, luk: 40,
        ultimateSlots: [
            { slot: 1, ultimateId: 'ULT_COMMON', unlockReincarnation: 0, isExclusive: false },
            { slot: 2, ultimateId: 'ULT_EXCLUSIVE', unlockReincarnation: 0, isExclusive: true },
        ],
    } as unknown as GeneralConfig;
}

function card(): MentorCard {
    return { uid: 'mentor-hero', sourceGeneralId: 'hero', name: '英靈甲' } as unknown as MentorCard;
}

type PerformResult = { ok: true; skillId: string } | { ok: false; blocked: 'NO_TICKET' | 'NOT_NURTURING' };

/** 建立一位培育中的子嗣，並回傳假的傳道 Command 與它的呼叫紀錄 */
async function rigWith(perform?: (generalId: string, childId: string, skill: string | undefined) => Promise<PerformResult>) {
    const roster = new InMemoryRosterStore([unveiledChild('alpha'), legendHero()]);
    const nurture = new NurtureService(roster, { random: seeded(7), currentSeason: () => 3, currentMode: () => GameTimeMode.Nurture, requireNurtureMode: true });
    const calls: Array<{ generalId: string; childId: string; skill: string | undefined }> = [];
    const flow = new NurtureFlowController({
        roster, unveiling: new UnveilingService(roster, seeded(3)), nurture,
        loadMentorCards: async () => [], persist: async () => undefined,
        performLegendaryMentoring: perform
            ? async (generalId, childId, skill) => { calls.push({ generalId, childId, skill }); return perform(generalId, childId, skill); }
            : undefined,
    });
    await flow.chooseFate('accept');
    await flow.startNurture();
    return { flow, calls };
}

export function createNurtureLegendaryMentoringSuite(): TestSuite {
    const suite = new TestSuite('NurtureLegendaryMentoring (培育傳道入口)');

    suite.test('專屬奧義：取武將奧義欄位中 isExclusive 的那一個（暫定）', () => {
        assert.equals('ULT_EXCLUSIVE', exclusiveSkillOf(legendHero()) ?? '');
        assert.equals(undefined, exclusiveSkillOf({ ultimateSlots: [] } as unknown as GeneralConfig));
        assert.equals(undefined, exclusiveSkillOf(undefined));
    });

    suite.test('傳道成功：把英靈的專屬奧義與目前子嗣交給 GameSession，回傳 true', async () => {
        const { flow, calls } = await rigWith(async () => ({ ok: true, skillId: 'ULT_EXCLUSIVE' }));
        const ok = await flow.legendaryMentor(card());
        assert.isTrue(ok);
        assert.equals(1, calls.length);
        assert.equals('hero', calls[0].generalId);
        assert.equals('alpha', calls[0].childId);
        assert.equals('ULT_EXCLUSIVE', calls[0].skill ?? '');
    });

    suite.test('傳道失敗：回傳 false，並顯示原因（傳道令不足）', async () => {
        const { flow } = await rigWith(async () => ({ ok: false, blocked: 'NO_TICKET' }));
        assert.isFalse(await flow.legendaryMentor(card()));
        assert.equals('傳道令不足', (flow as unknown as { _notice: string })._notice);
    });

    suite.test('沒有接線傳道 Command：入口不可用，回傳 false 且不崩潰', async () => {
        const { flow } = await rigWith(undefined);
        assert.isFalse(await flow.legendaryMentor(card()));
    });

    return suite;
}
