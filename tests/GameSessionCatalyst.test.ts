/**
 * GameSessionCatalyst.test.ts — 退役時因子媒介注入子嗣（BLT-10 接線，PROG-2-0865）
 *
 * Unity 對照：像 PlayMode 測試，走一遍「退役 → 選子嗣 → 注入」的 Command，
 * 驗驗證失敗不改狀態、命中與消耗的狀態正確，並且只存一次檔。
 */
import { TestSuite, assert } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function gen(id: string, age: number, genes: string[], extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 900, str: 85, int: 40, lea: 75, pol: 30, cha: 40, luk: 20, ep: 70,
        careerClass: 'Warrior', bloodlineId: 'BL_A', genes: genes.map((g) => ({ id: g, type: 'Red' })), ...extra,
    } as unknown as GeneralConfig;
}

function sessionWith(roster: GeneralConfig[], roll: number): { session: GameSession; saves: { count: number } } {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    session.setRandomSource(() => roll);
    const saves = { count: 0 };
    const real = new PlayerSaveService(new MemoryStorageAdapter());
    session.setSaveService({ save: async (snapshot: never) => { saves.count += 1; return real.save(snapshot); } } as never);
    return { session, saves };
}

const genesOf = (session: GameSession, id: string): string => (session.roster.find((g) => g.id === id)!.genes ?? []).map((g) => g.id).join(',');

export function createGameSessionCatalystSuite(): TestSuite {
    const suite = new TestSuite('GameSessionCatalyst (退役注入因子媒介)');

    suite.test('不帶媒介：退役行為與原本相同，子嗣與媒介狀態不變', async () => {
        const { session } = sessionWith([gen('old', 66, ['F1', 'F2']), gen('kid', 3, ['F9'])], 0);
        await session.retireGeneral('old');
        assert.equals('F9', genesOf(session, 'kid'));
        assert.isFalse(session.roster.find((g) => g.id === 'old')!.catalystUsed === true);
    });

    suite.test('命中：子嗣加入退役武將的因子，退役武將標記媒介已用，只存一次檔', async () => {
        const { session, saves } = sessionWith([gen('old', 66, ['F1', 'F2']), gen('kid', 3, ['F9'])], 0);
        const before = saves.count;
        await session.retireGeneral('old', { catalystChildId: 'kid' });
        assert.equals('F9,F1', genesOf(session, 'kid'));
        assert.isTrue(session.roster.find((g) => g.id === 'old')!.catalystUsed === true);
        assert.equals(1, saves.count - before);
    });

    suite.test('未命中：子嗣不變，但媒介已消耗', async () => {
        const { session } = sessionWith([gen('old', 66, ['F1']), gen('kid', 3, ['F9'])], 0.99);
        await session.retireGeneral('old', { catalystChildId: 'kid' });
        assert.equals('F9', genesOf(session, 'kid'));
        assert.isTrue(session.roster.find((g) => g.id === 'old')!.catalystUsed === true);
    });

    suite.test('子嗣不合法（超過 5 歲、已開獎、或就是退役武將本人）：拋錯，名冊與存檔都不變', async () => {
        const cases = [
            { child: 'old-kid', extra: { age: 6 } },
            { child: 'opened', extra: { status: 'Unveiled' } },
            { child: 'old', extra: {} },
        ];
        for (const c of cases) {
            const roster = [gen('old', 66, ['F1']), gen('old-kid', 6, []), gen('opened', 2, [], { status: 'Unveiled' })];
            const { session, saves } = sessionWith(roster, 0);
            let threw = false;
            try {
                await session.retireGeneral('old', { catalystChildId: c.child });
            } catch {
                threw = true;
            }
            assert.isTrue(threw);
            assert.isFalse(session.roster.find((g) => g.id === 'old')!.isMentorCard === true);
            assert.isFalse(session.roster.find((g) => g.id === 'old')!.catalystUsed === true);
            assert.equals(0, saves.count);
        }
    });

    suite.test('退役武將已用過媒介：不注入、不消耗，退役照常完成', async () => {
        const { session } = sessionWith([gen('old', 66, ['F1'], { catalystUsed: true }), gen('kid', 3, [])], 0);
        const card = await session.retireGeneral('old', { catalystChildId: 'kid' });
        assert.equals('mentor-old', card.uid);
        assert.equals('', genesOf(session, 'kid'));
    });

    suite.test('發出 GeneCatalystInjected 事件，payload 含子嗣與結果', async () => {
        const { session } = sessionWith([gen('old', 66, ['F1']), gen('kid', 3, [])], 0);
        const emitted: Array<{ name: string; payload: unknown }> = [];
        session.setEventEmitter({ emit: (name, payload) => { emitted.push({ name, payload }); } });
        await session.retireGeneral('old', { catalystChildId: 'kid' });
        const hit = emitted.find((e) => e.name === GAME_SESSION_EVENTS.GeneCatalystInjected);
        assert.isTrue(!!hit);
        assert.equals('kid', (hit!.payload as { childId: string }).childId);
        assert.isTrue((hit!.payload as { consumed: boolean }).consumed);
    });

    return suite;
}
