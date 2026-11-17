/**
 * DuelAftermath.test.ts — 單挑戰果接到戰場外養成與傳承（doc_spec_0314 §4 TC-DUEL-03/04；PROG-2-9132）
 */
import { assert, TestSuite } from './TestRunner';
import { Faction } from '../assets/scripts/core/config/Constants';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    applyDuelAftermath, DUEL_VICTORY_FAME, planDuelAftermath, type DuelOutcomeRecord,
} from '../assets/scripts/core/systems/DuelAftermath';
import { ResultDetailsBuffer } from '../assets/scripts/shared/ResultDetailsBuffer';
import { EPITAPH_TEXT } from '../assets/scripts/core/systems/ChildUnveiling';

function duel(over: Partial<DuelOutcomeRecord>): DuelOutcomeRecord {
    return { winner: Faction.Player, loser: Faction.Enemy, winnerGeneralId: 'g-1', loserGeneralId: 'enemy-1', killed: false, fled: true, tutorial: false, ...over };
}

function makeGeneral(id: string, over: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, generalFame: 0, generalRank: 0, ...over,
    } as unknown as GeneralConfig;
}

export function createDuelAftermathSuite(): TestSuite {
    const suite = new TestSuite('DuelAftermath (PROG-2-9132 單挑戰果名聲與斬將傳承)');
    const ids = new Set(['g-1', 'g-2']);

    suite.test('我方主將單挑勝：名聲 +15；教學戰勝方照領', () => {
        for (const event of [duel({}), duel({ tutorial: true, fled: false })]) {
            const plan = planDuelAftermath([event], ids);
            assert.equals(1, plan.fame.length);
            assert.isTrue(plan.fame.every((f) => f.generalId === 'g-1' && f.gain === 15 && f.gain === DUEL_VICTORY_FAME));
            assert.equals(0, plan.fallenIds.length);
        }
    });

    suite.test('同一場同一人單挑贏多次：名聲只算一次；不同人各算一次（PROG-2-9385）', () => {
        const same = planDuelAftermath([duel({}), duel({}), duel({ tutorial: true, fled: false })], ids);
        assert.equals(1, same.fame.length);
        assert.equals('g-1', same.fame[0].generalId);
        const two = planDuelAftermath([duel({}), duel({ winnerGeneralId: 'g-2' }), duel({})], ids);
        assert.equals(2, two.fame.length);
        assert.equals('g-1,g-2', two.fame.map((f) => f.generalId).join(','));
    });

    suite.test('敵方贏：我方不得名聲；敵將不在名冊也不入帳', () => {
        const plan = planDuelAftermath([duel({ winner: Faction.Enemy, loser: Faction.Player, winnerGeneralId: 'enemy-1', loserGeneralId: 'g-1' })], ids);
        assert.equals(0, plan.fame.length);
        assert.equals(0, plan.fallenIds.length);
    });

    suite.test('斬將：只有我方被斬且在名冊才列陣亡；敗逃、教學戰、敵將被斬都不列', () => {
        const lost = { winner: Faction.Enemy, loser: Faction.Player, winnerGeneralId: 'enemy-1', loserGeneralId: 'g-1' } as const;
        assert.equals(1, planDuelAftermath([duel({ ...lost, killed: true, fled: false }), duel({ ...lost, killed: true, fled: false })], ids).fallenIds.length);
        assert.equals(0, planDuelAftermath([duel({ ...lost, fled: true })], ids).fallenIds.length);
        assert.equals(0, planDuelAftermath([duel({ ...lost, killed: true, fled: false, tutorial: true })], ids).fallenIds.length);
        assert.equals(0, planDuelAftermath([duel({ killed: true, fled: false })], ids).fallenIds.length);
        assert.equals(0, planDuelAftermath([duel({ ...lost, killed: true, fled: false, loserGeneralId: 'not-in-roster' })], ids).fallenIds.length);
    });

    suite.test('applyDuelAftermath：名聲跨門檻升階；被斬者標陣亡且不重複標', () => {
        const roster = [makeGeneral('g-1', { generalFame: 90 }), makeGeneral('g-2'), makeGeneral('g-3', { status: 'dead' })] as unknown as Array<GeneralConfig & { generalFame?: number; generalRank?: number; status?: string }>;
        const applied = applyDuelAftermath(roster, { fame: [{ generalId: 'g-1', gain: 15 }], fallenIds: ['g-2', 'g-3'] });
        assert.equals(105, applied.roster[0].generalFame);
        assert.equals(1, applied.roster[0].generalRank);
        assert.equals(1, applied.promotions.length);
        assert.equals('SCRIPT_DUEL_FAME', applied.fameNotices[0].key);
        assert.equals('g-1', applied.fameNotices[0].args[0]);
        assert.equals('15', applied.fameNotices[0].args[1]);
        assert.equals('dead', applied.roster[1].status);
        assert.equals(1, applied.fallen.length);
        assert.equals('g-2', applied.fallen[0].id);
    });

    suite.test('recordBattle 接線：單挑勝 +15 名聲並出現「單挑獲勝，名聲 +15」提示', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([makeGeneral('g-1')]));
        await session.recordBattle(['g-1'], 'player-win', { stageId: 's1', duelOutcomes: [duel({})] });
        // 戰後勝利名聲 15 ＋ 單挑 15
        assert.equals(30, (session.roster.find((g) => g.id === 'g-1') as unknown as { generalFame: number }).generalFame);
        const lines = session.consumeTallyNotices();
        assert.isTrue(lines.some((l) => l.includes('單挑獲勝，名聲 +15')));
    });

    suite.test('recordBattle 接線：己方主將被斬 → 標陣亡、寫戰歿遺書日誌、提示戰歿；沒傳單挑事件時照舊不死', async () => {
        const lost = { winner: Faction.Enemy, loser: Faction.Player, winnerGeneralId: 'enemy-1', loserGeneralId: 'g-1', killed: true, fled: false } as const;
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([makeGeneral('g-1', { generalRank: 3, templateId: 'guan-yu', characterCategory: 'famed' })]));
        await session.recordBattle(['g-1'], 'enemy-win', { stageId: 's1', duelOutcomes: [duel(lost)] });
        const dead = session.roster.find((g) => g.id === 'g-1') as unknown as { status?: string };
        assert.equals('dead', dead.status);
        assert.isTrue(session.queryJournal({ generalUid: 'g-1' }).some((e) => e.summary.includes(EPITAPH_TEXT.BattleDeath)));
        const notices = session.consumeTallyNotices();
        assert.isTrue(notices.some((l) => l.includes('單挑落敗被斬')));
        // 名將陣亡走既有 _settleDeaths：英靈卡同步產出（虎符卡依既有產卡資格，戰績為零時不產）
        assert.isTrue(notices.some((l) => l.includes('英靈卡')));

        const calm = new GameSession(3);
        calm.setRosterStore(new InMemoryRosterStore([makeGeneral('g-1')]));
        await calm.recordBattle(['g-1'], 'enemy-win', { stageId: 's1' });
        assert.isFalse((calm.roster.find((g) => g.id === 'g-1') as unknown as { status?: string }).status === 'dead');
    });

    suite.test('結算窗還沒掛載完成時收到單挑名聲列：先暫存，顯示後補上，不丟失', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([makeGeneral('g-1')]));
        await session.recordBattle(['g-1'], 'player-win', { stageId: 's1', duelOutcomes: [duel({})] });
        const buffer = new ResultDetailsBuffer();
        // 戰後結算早於結算窗 show() 完成：此時追加不可立刻寫入、也不可丟
        assert.equals(0, buffer.push(session.consumeTallyNotices()).length);
        const flushed = buffer.markShown();
        assert.isTrue(flushed.some((l) => l.includes('單挑獲勝，名聲 +15')));
        assert.equals(0, buffer.markShown().length);
        // 顯示後再追加：立刻可寫入
        assert.equals(1, buffer.push(['x']).length);
        buffer.reset();
        assert.equals(0, buffer.push(['y']).length);
    });

    return suite;
}
