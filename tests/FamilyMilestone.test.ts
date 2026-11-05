import { TestSuite, assert } from './TestRunner';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { GameSession, InMemoryRosterStore, GAME_SESSION_EVENTS, type MilestoneUpPayload } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { clanStatsOf, type ClanMember } from '../assets/scripts/core/systems/ClanTier';
import { milestoneStageOfClan, milestoneUnlockLines, normalizeMilestoneStage } from '../assets/scripts/core/systems/FamilyMilestone';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const general = (id: string, gender: '男' | '女', extra: Record<string, unknown> = {}): GeneralConfig => ({
    id, name: id, faction: 'shu', gender, age: 30, hp: 1000,
    vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, ...extra,
} as unknown as GeneralConfig);

const member = (id: string, parentIds: string[], ep: number, age = 30): ClanMember => ({ id, parentIds, ep, age, blueStarFactors: [] });

function makeSession(roster: GeneralConfig[]): { session: GameSession; events: MilestoneUpPayload[] } {
    const session = new GameSession(7);
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.99);
    const events: MilestoneUpPayload[] = [];
    session.setEventEmitter({ emit: (name: string, payload?: unknown) => { if (name === GAME_SESSION_EVENTS.MilestoneUp) events.push(payload as MilestoneUpPayload); } } as never);
    return { session, events };
}

const cousins = (): GeneralConfig[] => [
    general('grandpa', '男', { age: 80 }), general('grandma', '女', { age: 78 }),
    general('uncle-a', '男', { age: 55, fatherId: 'grandpa', motherId: 'grandma' }), general('aunt-a', '女', { age: 54 }),
    general('uncle-b', '男', { age: 53, fatherId: 'grandpa', motherId: 'grandma' }), general('aunt-b', '女', { age: 52 }),
    general('heir', '男', { fatherId: 'uncle-a', motherId: 'aunt-a' }), general('bride', '女', { fatherId: 'uncle-b', motherId: 'aunt-b' }),
];

export function createFamilyMilestoneSuite(): TestSuite {
    const suite = new TestSuite('FamilyMilestone');

    suite.test('沒有成年子嗣時是 G1', () => {
        assert.equals(1, milestoneStageOfClan(clanStatsOf([member('f', [], 90), member('k', ['f'], 0, 17)])));
    });

    suite.test('首位子嗣滿 18 歲升 G2', () => {
        assert.equals(2, milestoneStageOfClan(clanStatsOf([member('f', [], 90), member('k', ['f'], 0, 18)])));
    });

    suite.test('延續 4 代且 3 人 EP 75 以上才到 G4', () => {
        const line = [member('a', [], 80), member('b', ['a'], 80), member('c', ['b'], 80), member('d', ['c'], 10)];
        assert.equals(4, milestoneStageOfClan(clanStatsOf(line)));
    });

    suite.test('4 代但 EP 不足 3 人仍是 G2', () => {
        const line = [member('a', [], 80), member('b', ['a'], 80), member('c', ['b'], 10), member('d', ['c'], 10)];
        assert.equals(2, milestoneStageOfClan(clanStatsOf(line)));
    });

    suite.test('3 人 EP 足夠但只有 3 代不到 G4', () => {
        const line = [member('a', [], 80), member('b', ['a'], 80), member('c', ['b'], 80)];
        assert.equals(2, milestoneStageOfClan(clanStatsOf(line)));
    });

    suite.test('存檔值不合法時回到 G1', () => {
        assert.equals(1, normalizeMilestoneStage(undefined));
        assert.equals(1, normalizeMilestoneStage(9));
        assert.equals(3, normalizeMilestoneStage(3));
    });

    suite.test('跳階時跨過的每一階都出句，G3 沒有表親資料只出解鎖句', () => {
        const lines = milestoneUnlockLines(1, 4);
        assert.lengthEquals(5, lines);
        assert.isTrue(lines[0].indexOf('家乘譜牒') >= 0);
        assert.isTrue(lines[2].indexOf('血脈清濁燈號') >= 0);
        assert.isTrue(lines[3].indexOf('天下郡望') >= 0);
    });

    suite.test('Session：季度檢定升 G2 並發事件，不重複發', async () => {
        const { session, events } = makeSession([general('f', '男', { age: 40 }), general('k', '男', { age: 20, fatherId: 'f' })]);
        assert.equals(1, session.milestoneStage);
        await session.advanceSeason();
        assert.equals(2, session.milestoneStage);
        assert.lengthEquals(1, events);
        assert.equals(1, events[0].oldStage);
        await session.advanceSeason();
        assert.lengthEquals(1, events);
    });

    suite.test('Session：G3 之後統計只夠 G2 也不降階', async () => {
        const { session, events } = makeSession([general('f', '男', { age: 40 }), general('k', '男', { age: 20, fatherId: 'f' })]);
        session.noteKinPair('趙統', '表妹', '甲祖');
        assert.equals(3, session.milestoneStage);
        assert.isTrue(events[0].lines.some((line) => line.indexOf('表妹與趙統同出於先祖【甲祖】一脈') >= 0));
        await session.advanceSeason();
        assert.equals(3, session.milestoneStage);
        session.noteKinPair('趙統', '表妹', '甲祖');
        assert.lengthEquals(1, events);
    });

    suite.test('Session：階段寫進存檔，讀回不變', async () => {
        const store = new MemoryStorageAdapter();
        const { session } = makeSession([general('f', '男')]);
        session.setSaveService(new PlayerSaveService(store));
        session.noteKinPair('父', '母', '祖');
        await session.save();
        const next = new GameSession(7);
        next.setRosterStore(new InMemoryRosterStore([]));
        next.setSaveService(new PlayerSaveService(store));
        next.setAutoSave(false);
        assert.isTrue(await next.load());
        assert.equals(3, next.milestoneStage);
    });

    suite.test('結緣畫面：選中表親才通知，陌生人與兄妹不通知', async () => {
        const roster = new InMemoryRosterStore([
            ...cousins(),
            general('stranger', '女'),
            general('sis', '女', { fatherId: 'uncle-a', motherId: 'aunt-a' }),
        ]);
        const service = new BreedingService(roster, new BloodlineGraph(), { random: () => 0.01 });
        const notes: string[] = [];
        const flow = new BondingSetupController({
            roster,
            breeding: service,
            prepare: async () => service.syncGraphFromRoster(),
            persist: async () => undefined,
            noteKinPair: (father, mother, ancestor) => notes.push(`${father}|${mother}|${ancestor}`),
        });
        await flow.open();
        flow.selectFather('heir');
        flow.selectMother('stranger');
        flow.announcePairWarning();
        flow.selectMother('sis');
        flow.announcePairWarning();
        flow.selectMother('grandma');
        flow.announcePairWarning();
        assert.lengthEquals(0, notes);
        flow.selectMother('bride');
        flow.announcePairWarning();
        assert.lengthEquals(1, notes);
        assert.isTrue(notes[0].indexOf('heir|bride|') === 0);
    });

    return suite;
}
