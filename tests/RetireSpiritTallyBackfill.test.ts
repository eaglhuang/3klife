/**
 * 先退役後死亡的雙卡補發（SPI-01，PROG-2-1993；名將身後傳承規格 doc_spec_0570 §2.2、TC-RET-BOUNDARY、TC-LEG-02）
 *
 * - 退役當下不產英靈卡也不產虎符。
 * - 壽終死亡時英靈卡與虎符一起補發，英靈卡標 Has_Retired_Before；已退役的教官卡不受影響。
 * - 不重複補發；存檔讀回後的退役者仍會補發。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { settleDeathTallies } from '../assets/scripts/core/systems/TallyDeathSettlement';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function famed(id: string, age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, templateId: id, name: id, faction: 'shu', gender: '男', age, hp: 1000,
        vitality: 100, maxVitality: 100, characterCategory: 'famed', isHistorical: true,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, primaryClass: 'Warrior',
        troopAptitude: { CAVALRY: 'S' },
        ...extra,
    } as unknown as GeneralConfig;
}

function createSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.startNewGame(20261108);
    session.setRandomSource(() => 0.99);
    return session;
}

const spiritCardsOf = (session: GameSession) => session.inventoryRecords.filter((r) => r.Item_Type === 'SPIRIT_CARD');

export function createRetireSpiritTallyBackfillSuite(): TestSuite {
    const suite = new TestSuite('RetireSpiritTallyBackfill（先退役後死亡雙卡補發 SPI-01 PROG-2-1993）');

    suite.test('退役當下英靈卡 0 張、虎符 0 張；之後壽終死亡原子補發兩張，英靈卡標 Has_Retired_Before，且不重複', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, [famed('zhao-yun', 70, { maxLifespan: 71 })]);
        await a.retireGeneral('zhao-yun');
        assert.equals(0, spiritCardsOf(a).length, 'TC-RET-BOUNDARY：退役不預支英靈卡');
        assert.equals(0, Object.keys(a.tallyCards).length, '退役不發虎符');
        assert.equals(1, (await new LegacyService(adapter).getMentorCards()).length, '教官卡已生成');

        for (let i = 0; i < 4; i += 1) a.spendLifespan('zhao-yun', 'breeding');
        await a.advanceSeason();
        await a.advanceSeason();
        const spirits = spiritCardsOf(a);
        const tallies = Object.values(a.tallyCards).filter((c) => c.source === 'death');
        assert.equals(1, spirits.length, 'TC-LEG-02：補發英靈卡');
        assert.equals(1, tallies.length, 'TC-LEG-02：補發虎符');
        assert.equals(true, spirits[0].Attributes?.['Has_Retired_Before']);
        assert.equals('zhao-yun', tallies[0].sourceGeneralUid);
        assert.equals(1, (await new LegacyService(adapter).getMentorCards()).length, '教官卡不受影響');

        await a.advanceSeason();
        await a.advanceSeason();
        assert.equals(1, spiritCardsOf(a).length, '不重複補發英靈卡');
        assert.equals(1, Object.keys(a.tallyCards).length, '不重複補發虎符');
    });

    suite.test('存檔往返後的退役者仍會補發；讀回的存檔不會多出卡', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter, [famed('zhao-yun', 70, { maxLifespan: 71 })]);
        await a.retireGeneral('zhao-yun');
        await a.save();

        const b = new GameSession();
        b.setRosterStore(new InMemoryRosterStore([]));
        b.setSaveService(new PlayerSaveService(adapter));
        b.setLifecycle(new LegacyService(adapter));
        assert.isTrue(await b.load());
        assert.equals(0, spiritCardsOf(b).length);
        assert.equals(0, Object.keys(b.tallyCards).length);
        b.setRandomSource(() => 0.99);
        for (let i = 0; i < 4; i += 1) b.spendLifespan('zhao-yun', 'breeding');
        await b.advanceSeason();
        await b.advanceSeason();
        assert.equals(1, spiritCardsOf(b).length);
        assert.equals(1, Object.values(b.tallyCards).filter((c) => c.source === 'death').length);
    });

    suite.test('結算層：已退役武將由存活轉死亡產一張；before 已陣亡（舊存檔已死者）不補發', () => {
        const retired = famed('zhao-yun', 72, { isMentorCard: true, status: 'active' });
        const dead = { ...retired, status: 'dead' } as unknown as GeneralConfig;
        const state = { holdings: { holders: {} }, cards: {} };
        const first = settleDeathTallies(state, [retired] as never, [dead] as never, 5);
        assert.equals(1, first.produced.length);
        const again = settleDeathTallies({ holdings: first.holdings, cards: first.cards }, [dead] as never, [dead] as never, 6);
        assert.equals(0, again.produced.length, '重複結算不補發');
    });

    return suite;
}
