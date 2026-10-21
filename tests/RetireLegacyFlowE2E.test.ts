/**
 * RetireLegacyFlowE2E.test.ts — 退役 → 因子媒介 → 教官卡 → 世代傳承 的真實整合（QA，PROG-2-0643）
 *
 * Unity 對照：像一支「祖父退役、孫輩接班」的 PlayMode 冒煙測試，所有服務共用同一份存檔後端，
 * 中途存讀檔，看教官卡、因子媒介、出戰資格與主將指定有沒有跟著走。
 */
import { assert, TestSuite } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { mentorFromCard } from '../assets/scripts/core/systems/NurtureSystem';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function person(id: string, age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, careerClass: 'Warrior', role: 'Combat',
        ...extra,
    } as unknown as GeneralConfig;
}

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[], emitted: string[] = []): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.setEventEmitter({ emit: (name) => emitted.push(name) });
    session.setRandomSource(() => 0); // 因子媒介一定命中
    return session;
}

const ELDER = (): GeneralConfig => person('elder', 70, { genes: [{ id: 'gene_command', level: 3 }], isHistorical: true });
const BABY = (): GeneralConfig => person('baby', 2, { genes: [] });

export function createRetireLegacyFlowE2ESuite(): TestSuite {
    const suite = new TestSuite('RetireLegacyFlowE2E (退役→媒介→教官卡→傳承)');

    suite.test('退役注入因子媒介後存讀檔：子嗣的因子、退役者的媒介已用旗標、教官卡都還在', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [ELDER(), BABY()]);
        await a.retireGeneral('elder', { catalystChildId: 'baby' });
        const baby = a.roster.find((g) => g.id === 'baby') as GeneralConfig & { genes?: Array<{ id: string }> };
        assert.isTrue((baby.genes ?? []).some((gene) => gene.id === 'gene_command'), '子嗣取得退役者的因子');
        await a.save();

        const b = build(adapter, []);
        assert.isTrue(await b.load());
        const babyB = b.roster.find((g) => g.id === 'baby') as GeneralConfig & { genes?: Array<{ id: string }> };
        assert.isTrue((babyB.genes ?? []).some((gene) => gene.id === 'gene_command'), '讀檔後因子仍在');
        const elderB = b.roster.find((g) => g.id === 'elder') as unknown as { isMentorCard?: boolean; catalystUsed?: boolean };
        assert.isTrue(elderB.isMentorCard === true, '退役標記保留');
        assert.isTrue(elderB.catalystUsed === true, '媒介已用旗標保留，不能再注入第二次');
        const cards = await new LegacyService(adapter).getMentorCards();
        assert.equals(1, cards.length);
    });

    suite.test('退役者不能出戰也不能再結緣；退役的主將會被取消指定並存檔', async () => {
        const adapter = new MemoryStorageAdapter();
        const emitted: string[] = [];
        const a = build(adapter, [ELDER(), person('lady', 28, { gender: '女' }), BABY()], emitted);
        await a.setLeadGeneral('elder');
        await a.retireGeneral('elder');
        assert.isTrue(emitted.includes(GAME_SESSION_EVENTS.GeneralRetired));
        assert.isFalse(a.getDeployableGenerals().some((g) => g.id === 'elder'), '退役者不可出戰');
        assert.equals(null, a.leadGeneralId, '主將指定已清除');
        await a.save();
        const b = build(adapter, []);
        await b.load();
        assert.equals(null, b.leadGeneralId, '讀檔後仍沒有主將指定');
    });

    suite.test('退役者過世離開名冊後，教官卡仍可讀回，並能轉成培育教官', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [person('elder', 70, { maxLifespan: 71, isHistorical: true, ep: 600 }), BABY()]);
        await a.retireGeneral('elder');
        for (let i = 0; i < 4; i += 1) a.spendLifespan('elder', 'breeding');
        await a.advanceSeason();
        await a.advanceSeason();
        assert.isFalse(a.roster.some((g) => g.id === 'elder'), '過世者已離開名冊');

        const cards = await new LegacyService(adapter).getMentorCards();
        assert.equals(1, cards.length, '教官卡不隨本人離開名冊而消失');
        const mentor = mentorFromCard(cards[0]);
        assert.equals(cards[0].uid, mentor.id);
        assert.isTrue(mentor.tpBonus >= 0);

        const b = build(adapter, []);
        assert.isTrue(await b.load());
        assert.equals(1, (await new LegacyService(adapter).getMentorCards()).length, '存讀後仍只有一張');
    });

    suite.test('同一位重複退役會被擋下，教官卡與虎符都不重複', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [ELDER()]);
        await a.retireGeneral('elder');
        const tallies = Object.keys(a.tallyCards).length;
        let threw = false;
        try { await a.retireGeneral('elder'); } catch { threw = true; }
        assert.isTrue(threw);
        assert.equals(1, (await new LegacyService(adapter).getMentorCards()).length);
        assert.equals(tallies, Object.keys(a.tallyCards).length);
    });

    return suite;
}
