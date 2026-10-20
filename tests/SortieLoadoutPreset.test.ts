/**
 * SortieLoadoutPreset.test.ts — 出征編制預設與推薦（DEP-14）
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { SortieSetupController } from '../assets/scripts/ui/core/SortieSetupController';
import { resolvePreset, hasUsablePreset, savePresetFor } from '../assets/scripts/core/systems/SortieLoadoutPreset';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const officer = (id: string, name: string, extra: Partial<GeneralConfig> = {}): GeneralConfig => ({
    id, name, faction: 'player', age: 25, hp: 1000, str: 60, int: 60, lea: 60, pol: 60, cha: 60, luk: 50, ...extra,
} as GeneralConfig);

async function session(): Promise<GameSession> {
    const s = new GameSession(7);
    s.setRosterStore(new InMemoryRosterStore([
        officer('cao-cao', '曹操', { lea: 95 }),
        officer('xun-yu', '荀彧', { int: 95, pol: 90 }),
        officer('cao-ren', '曹仁', { lea: 85, pol: 50 }),
    ]));
    assert.isTrue(await s.setLeadGeneral('cao-cao'));
    return s;
}

function presetStore() {
    let store: Record<string, { strategistUid: string | null; deputyUid: string | null }> = {};
    return {
        get: () => store,
        set: (next: typeof store) => { store = next; },
    };
}

export function createSortieLoadoutPresetSuite(): TestSuite {
    const suite = new TestSuite('SortieLoadoutPreset (出征編制預設與推薦 DEP-14)');

    suite.test('解析預設：失效的人選改為不派，不替換成別人', () => {
        const deployable = new Set(['xun-yu']);
        const resolved = resolvePreset({ strategistUid: 'xun-yu', deputyUid: 'cao-ren' }, 'cao-cao', deployable);
        assert.equals('xun-yu', resolved.strategistUid);
        assert.equals(null, resolved.deputyUid);
    });

    suite.test('解析預設：主將本人、參謀與後勤同一人，都不保留', () => {
        const deployable = new Set(['cao-cao', 'xun-yu']);
        assert.equals(null, resolvePreset({ strategistUid: 'cao-cao', deputyUid: null }, 'cao-cao', deployable).strategistUid);
        const dup = resolvePreset({ strategistUid: 'xun-yu', deputyUid: 'xun-yu' }, 'cao-cao', deployable);
        assert.equals('xun-yu', dup.strategistUid);
        assert.equals(null, dup.deputyUid);
    });

    suite.test('沒有預設或全部失效：不可推薦', () => {
        assert.isFalse(hasUsablePreset(resolvePreset(undefined, 'cao-cao', new Set())));
    });

    suite.test('儲存預設是每位主將一組，覆寫舊的，不改原 store', () => {
        const before = {};
        const after = savePresetFor(before, 'cao-cao', { strategistUid: 'xun-yu', deputyUid: null });
        assert.equals(0, Object.keys(before).length);
        assert.equals('xun-yu', after['cao-cao'].strategistUid);
    });

    suite.test('控制器：儲存目前編制，之後套用可還原', async () => {
        const s = await session();
        const store = presetStore();
        const ctrl = new SortieSetupController({ session: s, presets: store });
        assert.isTrue(s.setSortieSupport('xun-yu', 'cao-ren').ok);
        assert.isTrue(ctrl.savePreset());

        assert.isTrue(s.setSortieSupport(null, null).ok);
        assert.isTrue(ctrl.applyPreset());
        assert.equals('xun-yu', s.getSortieSupportSummary('cao-cao').strategist?.id ?? null);
        assert.equals('cao-ren', s.getSortieSupportSummary('cao-cao').deputy?.id ?? null);
    });

    suite.test('控制器：沒有預設儲存或預設全部失效時，套用回傳 false 且不改編制', async () => {
        const s = await session();
        assert.isFalse(new SortieSetupController({ session: s }).applyPreset());
        const store = presetStore();
        store.set({ 'cao-cao': { strategistUid: 'gone', deputyUid: null } });
        assert.isFalse(new SortieSetupController({ session: s, presets: store }).applyPreset());
        assert.equals(null, s.sortieSupport.strategistUid);
    });

    return suite;
}
