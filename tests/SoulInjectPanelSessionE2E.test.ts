/**
 * SoulInjectPanelSessionE2E.test.ts — 寄宿戰魂面板資料與 GameSession 實際寄宿的一致性（#809，QA，PROG-2-0667）
 *
 * Unity 對照：像確認 ViewModel 說「按鈕可按」時，Model 真的會成功；說「灰掉」時，Model 真的會拒絕且原因相同。
 * 另外跑存讀檔，確認寄宿後的 TP 與碎片帳本都留得住。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { soulInjectCandidatesFor, canOpenSoulInject, SOUL_INJECT_REASON_TEXT } from '../assets/scripts/core/systems/SoulInjectCandidates';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 40, hp: 1000, maxLifespan: 70, ...extra } as unknown as GeneralConfig;
}

function setup(roster: GeneralConfig[], adapter: MemoryStorageAdapter): { session: GameSession; store: InMemoryRosterStore } {
    const store = new InMemoryRosterStore(roster);
    const session = new GameSession();
    session.setRosterStore(store);
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle({
        settleSeason: async (r: GeneralConfig[]) => ({ roster: r.filter((g) => g.status !== 'dead'), settlement: { spiritCards: [] } }),
        retireGeneral: async () => { throw new Error('not used'); },
    } as never);
    session.startNewGame(7);
    return { session, store };
}

function targetOf(g: GeneralConfig): { templateId: string; bloodlineId: string; tp: number } {
    return { templateId: g.templateId ?? g.id, bloodlineId: g.bloodlineId ?? '', tp: (g as unknown as { totalTp?: number }).totalTp ?? 0 };
}

export function createSoulInjectPanelSessionE2ESuite(): TestSuite {
    const suite = new TestSuite('SoulInjectPanelSessionE2E (寄宿面板與會話一致 PROG-2-0667)');

    suite.test('面板說可按的碎片，會話一定寄宿成功；灰掉的，會話拒絕且原因與面板相符', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        for (const targetId of ['zhang', 'twin']) {
            const liu = general('liu', { age: 69.75, templateId: 'liu-bei-1', bloodlineId: 'bl-1', totalTp: 500 });
            const guan = general('guan', { age: 69.75, templateId: 'guan-yu-1', bloodlineId: 'bl-2', totalTp: 300 });
            const zhang = general('zhang', { templateId: 'zhang-fei-1', bloodlineId: 'bl-1', totalTp: 10 });
            const twin = general('twin', { templateId: 'liu-bei-1', bloodlineId: 'bl-1', totalTp: 10 });
            const target = targetId === 'zhang' ? zhang : twin;
            const { session, store } = setup([liu, guan, zhang, twin], new MemoryStorageAdapter());
            session.spendLifespan('liu', 'breeding');
            session.spendLifespan('guan', 'breeding');
            await session.advanceSeason();

            const candidates = soulInjectCandidatesFor(session.soulFragmentLedger(), targetOf(target));
            assert.equals(2, candidates.length);
            for (const c of candidates) {
                const snapshot = JSON.stringify(store.getAll());
                const result = await session.injectSoulFragment(target.id, c.deadUid);
                if (c.enabled) {
                    assert.isTrue(result.ok, `${target.id} ← ${c.deadUid} 面板可按卻失敗`);
                } else {
                    assert.isFalse(result.ok, `${target.id} ← ${c.deadUid} 面板灰掉卻成功`);
                    const reason = (result as { ok: false; reason: keyof typeof SOUL_INJECT_REASON_TEXT }).reason;
                    assert.equals(SOUL_INJECT_REASON_TEXT[reason], c.reasonText!);
                    assert.equals(snapshot, JSON.stringify(store.getAll()), '拒絕時名冊不變');
                }
            }
        }
    });

    suite.test('寄宿後存讀檔：目標 TP 增加與碎片消耗都保留，面板重算後不再列出已用碎片', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const liu = general('liu', { age: 69.75, templateId: 'liu-bei-1', bloodlineId: 'bl-1', totalTp: 500 });
        const zhang = general('zhang', { templateId: 'zhang-fei-1', bloodlineId: 'bl-1', totalTp: 10 });
        const { session } = setup([liu, zhang], adapter);
        session.spendLifespan('liu', 'breeding');
        await session.advanceSeason();
        assert.isTrue(canOpenSoulInject(soulInjectCandidatesFor(session.soulFragmentLedger(), targetOf(zhang))));
        const injected = await session.injectSoulFragment('zhang', 'liu');
        assert.isTrue(injected.ok);
        await session.save();

        const restoredStore = new InMemoryRosterStore([]);
        const restored = new GameSession();
        restored.setRosterStore(restoredStore);
        restored.setSaveService(new PlayerSaveService(adapter));
        await restored.load();
        assert.equals(0, Object.keys(restored.soulFragmentLedger()).length);
        const zhangAfter = restored.roster.find((g) => g.id === 'zhang') as unknown as { totalTp: number };
        assert.equals(110, zhangAfter.totalTp);
        assert.isFalse(canOpenSoulInject(soulInjectCandidatesFor(restored.soulFragmentLedger(), { templateId: 'zhang-fei-1', bloodlineId: 'bl-1', tp: 110 })));
    });

    return suite;
}
