/**
 * 編制預設讀檔路徑（PROG-2-0792）headless 測試
 *
 * 儲存預設 → 存檔 → 新會話讀檔 → 套用預設，確認預設在整段流程中不遺失。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { SortieSetupController } from '../assets/scripts/ui/core/SortieSetupController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const officer = (id: string, name: string, extra: Partial<GeneralConfig> = {}): GeneralConfig => ({
    id, name, faction: 'player', age: 25, hp: 1000, str: 60, int: 60, lea: 60, pol: 60, cha: 60, luk: 50, ...extra,
} as GeneralConfig);

const roster = () => new InMemoryRosterStore([
    officer('cao-cao', '曹操', { lea: 95 }),
    officer('xun-yu', '荀彧', { int: 95, pol: 90 }),
    officer('cao-ren', '曹仁', { lea: 85, pol: 50 }),
]);

function sessionOn(adapter: MemoryStorageAdapter): GameSession {
    const s = new GameSession(11);
    s.setRosterStore(roster());
    s.setSaveService(new PlayerSaveService(adapter));
    return s;
}

function controllerFor(s: GameSession): SortieSetupController {
    return new SortieSetupController({
        session: s,
        presets: {
            get: () => s.sortiePresets,
            set: (store) => { void s.setSortiePresets(store); },
        },
    });
}

export function createSortiePresetLoadPathSuite(): TestSuite {
    const suite = new TestSuite('SortiePresetLoadPath (編制預設讀檔路徑 PROG-2-0792)');

    suite.test('儲存預設 → 存檔 → 新會話讀檔後，預設仍可套用', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = sessionOn(adapter);
        assert.isTrue(await first.setLeadGeneral('cao-cao'));
        assert.isTrue(first.setSortieSupport('xun-yu', 'cao-ren').ok);
        assert.isTrue(controllerFor(first).savePreset());
        await first.save();

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        assert.isTrue(await restored.setLeadGeneral('cao-cao'));
        assert.isTrue(restored.setSortieSupport(null, null).ok);

        assert.isTrue(controllerFor(restored).applyPreset());
        assert.equals('xun-yu', restored.getSortieSupportSummary('cao-cao').strategist?.id ?? null);
        assert.equals('cao-ren', restored.getSortieSupportSummary('cao-cao').deputy?.id ?? null);
    });

    suite.test('讀檔後預設是同一份內容，且不影響其他主將的預設', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = sessionOn(adapter);
        assert.isTrue(await first.setLeadGeneral('cao-cao'));
        assert.isTrue(first.setSortieSupport('xun-yu', null).ok);
        controllerFor(first).savePreset();
        await first.save();

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        assert.equals(1, Object.keys(restored.sortiePresets).length);
        assert.equals('xun-yu', restored.sortiePresets['cao-cao'].strategistUid);
    });

    return suite;
}
