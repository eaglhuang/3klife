/**
 * SoulFragmentSeasonFlow.test.ts — 季結死亡 → 產生碎片 → 寄宿 的真實多步流程（SAME-08 接線，PROG-2-1056）
 *
 * 鎖住：主動扣壽命致死的武將進入季結，會為亡者產生碎片（存進 GameSession）；
 * 同血源的目標寄宿後 totalTp 增加、碎片被消耗；寄宿不合規時目標與碎片都不變。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 40, hp: 1000, maxLifespan: 70, ...extra } as unknown as GeneralConfig;
}

/** 季結的收尾：死者照常從名冊移除（與 LifespanDeathSeason 測試同一做法） */
function lifecycleStub(session: GameSession): void {
    session.setLifecycle({
        settleSeason: async (roster: GeneralConfig[]) => ({
            roster: roster.filter((g) => g.status !== 'dead'),
            settlement: { spiritCards: [] },
        }),
        retireGeneral: async () => { throw new Error('not used'); },
    } as never);
}

function setup(roster: GeneralConfig[]): { session: GameSession; store: InMemoryRosterStore } {
    const store = new InMemoryRosterStore(roster);
    const session = new GameSession();
    session.setRosterStore(store);
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    lifecycleStub(session);
    return { session, store };
}

export function createSoulFragmentSeasonFlowSuite(): TestSuite {
    const suite = new TestSuite('SoulFragmentSeasonFlow (季結死亡→碎片→寄宿 PROG-2-1056)');

    suite.test('季結死亡產生碎片，同血源寄宿後目標 totalTp 增加、碎片消耗', async () => {
        const liu = general('liu', { age: 69.75, templateId: 'liu-bei-1', bloodlineId: 'bl-1', totalTp: 500 });
        const zhang = general('zhang', { templateId: 'zhang-fei-1', bloodlineId: 'bl-1', totalTp: 10 });
        const { session, store } = setup([liu, zhang]);

        const spent = session.spendLifespan('liu', 'breeding');
        assert.isTrue(spent !== null && spent.events.some((event) => event.type === 'died'));
        await session.advanceSeason();

        const result = await session.injectSoulFragment('zhang', 'liu');
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(100, result.amount);
        const zhangAfter = store.getAll().find((g) => g.id === 'zhang') as unknown as { totalTp: number };
        assert.equals(110, zhangAfter.totalTp);
        const again = await session.injectSoulFragment('zhang', 'liu');
        assert.isFalse(again.ok);
        if (!again.ok) assert.equals('NO_FRAGMENT', again.reason);
    });

    suite.test('同版本寄宿被拒絕，目標 TP 與碎片都不變', async () => {
        const liu = general('liu', { age: 69.75, templateId: 'liu-bei-1', bloodlineId: 'bl-1', totalTp: 500 });
        const twin = general('twin', { templateId: 'liu-bei-1', bloodlineId: 'bl-1', totalTp: 10 });
        const { session, store } = setup([liu, twin]);

        session.spendLifespan('liu', 'breeding');
        await session.advanceSeason();

        const result = await session.injectSoulFragment('twin', 'liu');
        assert.isFalse(result.ok);
        if (!result.ok) assert.equals('SAME_TEMPLATE', result.reason);
        const twinAfter = store.getAll().find((g) => g.id === 'twin') as unknown as { totalTp: number };
        assert.equals(10, twinAfter.totalTp);
        const retry = await session.injectSoulFragment('twin', 'liu');
        assert.isFalse(retry.ok);
        if (!retry.ok) assert.equals('SAME_TEMPLATE', retry.reason);
    });

    suite.test('沒有季結死亡時不產生碎片', async () => {
        const liu = general('liu', { age: 69.75, templateId: 'liu-bei-1', bloodlineId: 'bl-1', totalTp: 500 });
        const zhang = general('zhang', { templateId: 'zhang-fei-1', bloodlineId: 'bl-1', totalTp: 10 });
        const { session } = setup([liu, zhang]);
        await session.advanceSeason();
        const result = await session.injectSoulFragment('zhang', 'liu');
        assert.isFalse(result.ok);
        if (!result.ok) assert.equals('NO_FRAGMENT', result.reason);
    });

    return suite;
}
