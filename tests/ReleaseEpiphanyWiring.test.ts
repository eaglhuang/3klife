/**
 * 釋放敵將頓悟接線（LVL-13，PROG-2-1996）：門檻 >= 10、優先學未學會的教官專屬戰法、學完改升既有戰法 1 級，
 * 並接進 GameSession.resolvePrisoner 的「放走」流程（軍資 = 傳入黃金，花費併入 goldSpent）。
 */
import { TestSuite, assert } from './TestRunner';
import {
    pickEpiphanyGain,
    resolveReleaseEpiphanyWithTactic,
    type EpiphanyCandidate,
} from '../assets/scripts/core/systems/ReleaseEpiphany';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const cand = (id: string, learned: string[] = [], exp: Record<string, number> = {}): EpiphanyCandidate => ({ id, learned, exp });
const many = (n: number): EpiphanyCandidate[] => Array.from({ length: n }, (_, i) => cand(`g${i}`));

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'wei', str: 50, int: 50, lea: 50, pol: 50, cha: 50, luk: 50, hp: 1000, currentHp: 1000, rarityTier: 'rare', ...extra } as unknown as GeneralConfig;
}

export function createReleaseEpiphanyWiringSuite(): TestSuite {
    const suite = new TestSuite('釋放敵將頓悟接線（LVL-13，PROG-2-1996）');

    suite.test('門檻 count >= 10：9 人不觸發、10 人觸發', () => {
        assert.equals('roster-too-small', resolveReleaseEpiphanyWithTactic({ candidates: many(9), mentorExclusive: ['TAC_A'], supplies: 999, rng: () => 0 }).reason);
        const r = resolveReleaseEpiphanyWithTactic({ candidates: many(10), mentorExclusive: ['TAC_A'], supplies: 999, rng: () => 0 });
        assert.isTrue(r.triggered);
        assert.equals(500, r.suppliesSpent);
    });

    suite.test('有未學會的教官專屬戰法：優先習得（不是升級）', () => {
        const gain = pickEpiphanyGain(cand('g', ['TAC_A'], { 'tactic-x': 0 }), ['TAC_A', 'TAC_B'], () => 0);
        assert.equals(JSON.stringify({ kind: 'learn', tacticId: 'TAC_B' }), JSON.stringify(gain));
    });

    suite.test('專屬戰法全部學會：既有戰法 Level +1（經驗 +100），滿級的不選', () => {
        const gain = pickEpiphanyGain(cand('g', ['TAC_A', 'TAC_B'], { TAC_A: 400, TAC_B: 100 }), ['TAC_A', 'TAC_B'], () => 0);
        assert.equals(JSON.stringify({ kind: 'level-up', tacticId: 'TAC_B', expAfter: 200 }), JSON.stringify(gain));
        assert.equals(null, pickEpiphanyGain(cand('g', ['TAC_A'], { TAC_A: 400 }), ['TAC_A'], () => 0), '全部滿級沒有收穫');
    });

    suite.test('沒有收穫時視為不觸發、不扣軍資', () => {
        const r = resolveReleaseEpiphanyWithTactic({ candidates: many(10), mentorExclusive: [], supplies: 999, rng: () => 0 });
        assert.isFalse(r.triggered);
        assert.equals('no-tactic-gain', r.reason);
        assert.equals(0, r.suppliesSpent);
        assert.equals(999, r.suppliesAfter);
    });

    suite.test('GameSession 放走俘虜：10 名武將＋教官卡專屬戰法 → 抽到者習得，軍資 500 併入 goldSpent', async () => {
        const session = new GameSession(3);
        const roster = Array.from({ length: 10 }, (_, i) => general(`g${i}`));
        roster.push(general('old-master', { isMentorCard: true, learnedTactics: ['TAC_FIRE_ATTACK'] }));
        session.setRosterStore(new InMemoryRosterStore(roster));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        await session.capturePrisoner(general('foe', { name: '敵將', rarityTier: 'legendary' }));
        const resolution = await session.resolvePrisoner('foe', 'release', { gold: 800 });
        assert.isTrue(!!resolution?.released);
        assert.isTrue(!!resolution?.epiphany?.triggered, '頓悟觸發');
        assert.equals(500, resolution?.goldSpent);
        const winnerId = resolution!.epiphany!.winnerId!;
        const winner = session.roster.find((g) => g.id === winnerId)!;
        assert.isTrue((winner.learnedTactics ?? []).includes('TAC_FIRE_ATTACK'), '抽到的武將習得教官專屬戰法');
    });

    suite.test('GameSession 放走俘虜：軍資不足或人數不足不觸發', async () => {
        const make = async (n: number) => {
            const session = new GameSession(3);
            const roster = Array.from({ length: n }, (_, i) => general(`g${i}`));
            roster.push(general('old-master', { isMentorCard: true, learnedTactics: ['TAC_FIRE_ATTACK'] }));
            session.setRosterStore(new InMemoryRosterStore(roster));
            session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
            await session.capturePrisoner(general('foe', { name: '敵將', rarityTier: 'legendary' }));
            return session;
        };
        const poor = await (await make(10)).resolvePrisoner('foe', 'release', { gold: 100 });
        assert.equals(undefined, poor?.epiphany);
        assert.equals(0, poor?.goldSpent);
        const small = await (await make(9)).resolvePrisoner('foe', 'release', { gold: 9999 });
        assert.equals(undefined, small?.epiphany);
    });

    return suite;
}
