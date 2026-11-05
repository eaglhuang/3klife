import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore, GAME_SESSION_EVENTS, type ClanTierUpPayload } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { SpiritCard } from '../assets/scripts/core/models/SpiritCard';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { clanMemberOfCard, clanMembersOf, clanStatsOf, clanTierOf, clanTierUpLine, normalizeClanTier, type ClanMember } from '../assets/scripts/core/systems/ClanTier';

const m = (id: string, parentIds: string[] = [], ep = 0, age = 20, blueStarFactors: string[] = []): ClanMember => ({ id, parentIds, ep, age, blueStarFactors });
const general = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: id, age: 30, genes: [], ...extra }) as unknown as GeneralConfig;

/** 四代、兩條分支、兩人 EP 90、四人 EP 75、三人同持藍因子：滿足全部條件 */
const highGate = (): ClanMember[] => [
    m('root', [], 90, 60, ['gene_a']),
    m('a', ['root'], 90, 40, ['gene_a']),
    m('b', ['root'], 75, 38, ['gene_a']),
    m('c', ['a'], 75, 20),
    m('d', ['b'], 60, 19),
    m('e', ['c'], 60, 5),
];

export function createClanTierSuite(): TestSuite {
    const suite = new TestSuite('ClanTier');

    suite.test('沒有血緣的人不算家族，留在布衣寒門', () => {
        const stats = clanStatsOf([m('x', [], 99), m('y', [], 99)]);
        assert.equals(0, stats.ep60);
        assert.equals(0, stats.generations);
        assert.equals(0, clanTierOf(stats));
    });

    suite.test('地方豪族：成年子嗣滿 3 人且至少 1 人 EP 60', () => {
        const kids = (age: number, ep: number) => [m('f'), m('k1', ['f'], ep, age), m('k2', ['f'], 0, age), m('k3', ['f'], 0, age)];
        assert.equals(1, clanTierOf(clanStatsOf(kids(18, 60))));
        assert.equals(0, clanTierOf(clanStatsOf(kids(17, 60))), '未成年不算');
        assert.equals(0, clanTierOf(clanStatsOf(kids(18, 59))), 'EP 不足');
    });

    suite.test('統計：代數、分支、EP 檔位、同持藍因子', () => {
        const stats = clanStatsOf(highGate());
        assert.equals(4, stats.generations);
        assert.equals(2, stats.branches);
        assert.equals(2, stats.ep90);
        assert.equals(4, stats.ep75);
        assert.equals(6 - 2, stats.adultDescendants);
        assert.equals(3, stats.sharedBlueHolders);
    });

    suite.test('天下高門要全部滿足，少一項就停在郡望世家或更低', () => {
        assert.equals(3, clanTierOf(clanStatsOf(highGate())));
        const full = clanStatsOf(highGate());
        assert.equals(2, clanTierOf({ ...full, branches: 1 }));
        assert.equals(2, clanTierOf({ ...full, ep90: 1 }));
        assert.equals(2, clanTierOf({ ...full, generations: 3 }));
        assert.equals(1, clanTierOf({ ...full, sharedBlueHolders: 2 }));
        assert.equals(1, clanTierOf({ ...full, ep75: 3 }));
        assert.equals(1, clanTierOf({ ...full, generations: 2 }));
    });

    suite.test('父母紀錄不在名單裡時當第 2 代；環狀資料不會無限遞迴', () => {
        assert.equals(2, clanStatsOf([m('k', ['missing'])]).generations);
        assert.isTrue(clanStatsOf([m('a', ['b']), m('b', ['a'])]).generations >= 1);
    });

    suite.test('亡者歸檔併入：EP 與血緣都算，已在名冊的人只算一次', () => {
        const card = { uid: 'dead', parentUids: ['', ''], ep_snapshot: 90, ageAtDeath: 70 } as unknown as SpiritCard;
        assert.equals(0, clanMemberOfCard(card).parentIds.length);
        const roster = [general('kid', { fatherId: 'dead', ep: 10 })];
        const members = clanMembersOf(roster, [card, { ...card, uid: 'kid', ep_snapshot: 99 }]);
        assert.lengthEquals(2, members);
        assert.equals(1, clanStatsOf(members).ep90);
        assert.equals(10, members.find((x) => x.id === 'kid')!.ep);
    });

    suite.test('藍因子只算 3★ 以上的藍色', () => {
        const roster = [general('kid', { fatherId: 'f', genes: [
            { id: 'blue3', type: 'blue', level: 3 }, { id: 'blue2', type: 'blue', level: 2 }, { id: 'white3', type: 'white', level: 3 },
        ] })];
        assert.equals('blue3', clanMembersOf(roster, [])[0].blueStarFactors.join());
    });

    suite.test('提示句與存檔值正規化', () => {
        assert.equals('門閥升格！家族已由【布衣寒門】晉升為【地方豪族】！', clanTierUpLine(0, 1));
        assert.equals(0, normalizeClanTier('x'));
        assert.equals(0, normalizeClanTier(4));
        assert.equals(2, normalizeClanTier(2));
    });

    suite.test('過季檢定：升格發一次事件、不重複、讀檔後保留、只升不降', async () => {
        const roster = [
            general('f', { ep: 60, age: 40 }),
            general('k1', { fatherId: 'f', age: 18 }),
            general('k2', { fatherId: 'f', age: 18 }),
            general('k3', { fatherId: 'f', age: 18 }),
        ];
        const store = new MemoryStorageAdapter();
        const s = new GameSession(7);
        s.setRosterStore(new InMemoryRosterStore(roster));
        s.setSaveService(new PlayerSaveService(store));
        s.setAutoSave(false);
        s.setRandomSource(() => 0.99);
        const events: ClanTierUpPayload[] = [];
        s.setEventEmitter({ emit: (name: string, payload?: unknown) => { if (name === GAME_SESSION_EVENTS.ClanTierUp) events.push(payload as ClanTierUpPayload); } });
        assert.equals(0, s.clanTier);
        await s.advanceSeason();
        assert.equals(1, s.clanTier);
        assert.lengthEquals(1, events);
        assert.equals(0, events[0].oldTier);
        assert.equals(1, events[0].newTier);
        await s.advanceSeason();
        assert.lengthEquals(1, events);
        await s.save();

        const next = new GameSession(7);
        next.setRosterStore(new InMemoryRosterStore([]));
        next.setSaveService(new PlayerSaveService(store));
        next.setAutoSave(false);
        assert.isTrue(await next.load());
        assert.equals(1, next.clanTier);
        next.setRandomSource(() => 0.99);
        await next.advanceSeason();
        assert.equals(1, next.clanTier, '名冊變空也不降階');
    });

    return suite;
}
