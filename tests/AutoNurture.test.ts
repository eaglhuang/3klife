/**
 * AutoNurture.test.ts — 自動培育（NUR-14，PROG-2-0543）headless 測試
 *
 * Unity 對照：像 EditMode 測試，分別驗 AutoPlay 的解鎖 / 道具扣除，以及跑完整場時的懲罰參數。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { graduate } from '../assets/scripts/core/systems/NurtureSystem';
import { chooseFate, unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import {
    AUTO_NURTURE_STAT_PENALTY,
    AUTO_NURTURE_TP_PENALTY,
    NURTURE_TOTAL_ROUNDS,
    computeTpGain,
    createNurtureSession,
    executeRound,
    type NurtureAction,
    type TrainingMentor,
} from '../assets/scripts/core/systems/NurtureSystem';
import {
    AUTO_NURTURE_TICKET_COST,
    canStartAutoNurture,
    capAutoRating,
    consumeAutoNurtureTicket,
    isAutoNurtureUnlocked,
    resolveAutoSchedule,
    runAutoNurtureSeason,
} from '../assets/scripts/core/systems/AutoNurture';

function seq(...values: number[]): () => number {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
}

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

function readyChild(id: string): UnveilingGeneral {
    const child = {
        id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'], genes: [],
    } as unknown as UnveilingGeneral;
    return chooseFate(unveilGeneral(child).general, 'accept');
}

function makeMentor(id: string, extra: Partial<TrainingMentor> = {}): TrainingMentor {
    return { id, name: id, tpBonus: 20, specialty: 'str', burstRate: 0.5, stars: 0, ...extra };
}

function freshSession(id: string, mentors: TrainingMentor[] = []) {
    return createNurtureSession({ sessionId: id, child: readyChild(id), mentors, startSeason: 0, random: seeded(7) });
}

export function createAutoNurtureSuite(): TestSuite {
    const suite = new TestSuite('AutoNurture (自動培育 NUR-14 PROG-2-0543)');

    suite.test('解鎖：主線第一次通過培育季後才解鎖，未解鎖時回傳 LOCKED', () => {
        assert.isFalse(isAutoNurtureUnlocked(false));
        assert.isTrue(isAutoNurtureUnlocked(true));
        assert.equals('LOCKED', canStartAutoNurture(false, 5).blocked!);
    });

    suite.test('道具：每次消耗 1 張自動培育券，券不足時 NO_TICKET 且不扣', () => {
        assert.equals(1, AUTO_NURTURE_TICKET_COST);
        assert.equals('NO_TICKET', canStartAutoNurture(true, 0).blocked!);
        assert.isTrue(canStartAutoNurture(true, 1).ok);
        assert.equals(2, consumeAutoNurtureTicket(3)!);
        assert.equals(null, consumeAutoNurtureTicket(0));
    });

    suite.test('評級上限為 A：S 降為 A，其餘不變', () => {
        assert.equals('A', capAutoRating('S'));
        assert.equals('A', capAutoRating('A'));
        assert.equals('B', capAutoRating('B'));
        assert.equals('C', capAutoRating('C'));
    });

    suite.test('排程：玩家手動排程為 36 筆時沿用，否則視為沒有排程', () => {
        const manual: NurtureAction[] = Array.from({ length: NURTURE_TOTAL_ROUNDS }, () => 'pol' as const);
        assert.equals(NURTURE_TOTAL_ROUNDS, resolveAutoSchedule({ str: 0, int: 0, lea: 0, pol: 0, cha: 0 }, manual).length);
        assert.equals('pol', resolveAutoSchedule({ str: 0, int: 0, lea: 0, pol: 0, cha: 0 }, manual)[0]);
        const short = resolveAutoSchedule({ str: 100, int: 50, lea: 50, pol: 200, cha: 300 }, ['pol']);
        assert.equals(NURTURE_TOTAL_ROUNDS, short.length);
        assert.equals('int', short[0]);
    });

    suite.test('排程：沒有手動排程時平均分配到最低屬性（同值全納入、輪流）', () => {
        const schedule = resolveAutoSchedule({ str: 100, int: 50, lea: 50, pol: 200, cha: 300 });
        assert.equals(NURTURE_TOTAL_ROUNDS, schedule.length);
        assert.equals(18, schedule.filter((action) => action === 'int').length);
        assert.equals(18, schedule.filter((action) => action === 'lea').length);
        assert.equals(0, schedule.filter((action) => action === 'str' || action === 'pol' || action === 'cha').length);
    });

    suite.test('自動模式：獲取量 ×0.7（與手動同骰比較）', () => {
        const session = freshSession('auto-stat');
        const manual = executeRound(session, 'str', seq(0.5)).log.statGained;
        const auto = executeRound(session, 'str', seq(0.5), { auto: true }).log.statGained;
        assert.equals(Math.max(1, Math.round(manual * AUTO_NURTURE_STAT_PENALTY)), auto, '自動獲取量 = 手動 × 0.7（至少 1）');
        assert.isTrue(auto < manual, '自動培育獲取量應低於手動');
    });

    suite.test('自動模式：教官 TP 加成只套用 50%', () => {
        const mentor = makeMentor('m1', { tpBonus: 20 });
        assert.equals(computeTpGain([mentor]), 12);
        assert.equals(computeTpGain([mentor], AUTO_NURTURE_TP_PENALTY), 11, '10 × (1 + 20% × 0.5) = 11');
        assert.equals(0.5, AUTO_NURTURE_TP_PENALTY);
    });

    suite.test('自動模式：整季不觸發受傷／好感事件，跑滿 36 回合並完成', () => {
        const session = freshSession('auto-season', [makeMentor('m1')]);
        const schedule = resolveAutoSchedule(session.prowess);
        const result = runAutoNurtureSeason(session, schedule, seeded(11));
        assert.equals('completed', result.session.status);
        assert.equals(NURTURE_TOTAL_ROUNDS, result.logs.length);
        assert.isTrue(result.logs.every((log) => !log.injured && !log.affectionGained));
    });

    suite.test('畢業評級上限：自動培育會話即使 prowess 達 S 也只給 A，手動維持 S', () => {
        const high = (id: string) => ({ ...freshSession(id), status: 'completed' as const, prowess: { str: 1000, int: 1000, lea: 1000, pol: 1000, cha: 1000 } });
        const manual = graduate(high('manual-grad'), readyChild('manual-grad'));
        const auto = graduate({ ...high('auto-grad'), auto: true }, readyChild('auto-grad'));
        assert.equals('S', manual.rating);
        assert.equals('A', auto.rating);
    });

    suite.test('自動培育券與主線旗標存檔往返；新遊戲歸零；舊檔缺欄位讀回 0 / false', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new PlayerSaveService(adapter));
        assert.equals(3, await session.grantAutoNurtureTickets(3));
        assert.isTrue(await session.consumeAutoNurtureTicket());
        assert.isTrue(await session.markMainlineNurtureSeasonCleared());
        const restored = new GameSession(3);
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.equals(2, restored.autoNurtureTickets);
        assert.isTrue(restored.mainlineNurtureClearedOnce);
        assert.isFalse(await new GameSession(3).consumeAutoNurtureTicket(), '沒有券時不扣');
        assert.equals(2, await restored.grantAutoNurtureTickets(-1), '負數不入帳');
    });

    return suite;
}
