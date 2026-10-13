/**
 * FemaleSource — 女性武將來源與品質欄位的 headless 測試（FEM-01，PROG-2-0244）
 */
import { assert, TestSuite } from './TestRunner';
import { createPlayerSaveSnapshot, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { createFemaleSource, normalizeFemaleSource, normalizeFemaleSourcesMap } from '../assets/scripts/core/systems/FemaleSource';
import { GameClock } from '../assets/scripts/core/systems/GameClock';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

export function createFemaleSourceSuite(): TestSuite {
    const suite = new TestSuite('FemaleSource (女性來源欄位 FEM-01)');

    suite.test('建立來源：預設受孕率修正 1.0、好感 0、季度不為負', () => {
        const source = createFemaleSource('CAPTIVE', 'SR', -3);
        assert.equals('CAPTIVE', source.Source_Type);
        assert.equals('SR', source.Quality_Grade);
        assert.equals(1, source.Base_Conception_Mod);
        assert.equals(0, source.Acquired_Season);
        assert.equals(0, source.Gift_Affinity);
    });

    suite.test('讀回單筆：來源或品質不合法整筆丟棄；受孕率非正數回退 1；好感夾在 0~100', () => {
        assert.equals(null, normalizeFemaleSource({ Source_Type: 'BOGUS', Quality_Grade: 'SR', Acquired_Season: 1 }));
        assert.equals(null, normalizeFemaleSource({ Source_Type: 'GACHA', Quality_Grade: 'UR', Acquired_Season: 1 }));
        assert.equals(null, normalizeFemaleSource(null));
        const fixed = normalizeFemaleSource({ Source_Type: 'DUNGEON', Quality_Grade: 'R', Base_Conception_Mod: -2, Acquired_Season: 4, Gift_Affinity: 150 });
        assert.equals(1, fixed?.Base_Conception_Mod ?? 0);
        assert.equals(100, fixed?.Gift_Affinity ?? 0);
        assert.equals(4, fixed?.Acquired_Season ?? 0);
    });

    suite.test('來源表：非物件視為空；壞條目丟棄，好條目保留', () => {
        assert.equals(0, Object.keys(normalizeFemaleSourcesMap(null)).length);
        assert.equals(0, Object.keys(normalizeFemaleSourcesMap([])).length);
        const table = normalizeFemaleSourcesMap({
            diaochan: createFemaleSource('GACHA', 'SSR', 2),
            broken: { Source_Type: 'NOPE', Quality_Grade: 'SR' },
        });
        assert.equals(1, Object.keys(table).length);
        assert.equals('GACHA', table.diaochan?.Source_Type ?? '');
    });

    suite.test('存檔往返：來源保留；舊檔沒有欄位時讀回空表', () => {
        const roster = [{ id: 'diaochan', name: '貂蟬', gender: '女', age: 20 }] as unknown as GeneralConfig[];
        const gameTime = new GameClock().state;
        const snapshot = createPlayerSaveSnapshot(gameTime, roster, new Date(0), undefined, [], null, 1, undefined, 0, undefined, 0, [], {}, {}, {}, undefined, {
            diaochan: createFemaleSource('CAPTIVE', 'SR', 5),
        });
        const restored = validatePlayerSaveSnapshot(JSON.parse(JSON.stringify(snapshot)));
        assert.equals('CAPTIVE', restored.femaleSources?.diaochan?.Source_Type ?? '');
        assert.equals(5, restored.femaleSources?.diaochan?.Acquired_Season ?? -1);

        const legacy = validatePlayerSaveSnapshot(JSON.parse(JSON.stringify(createPlayerSaveSnapshot(gameTime, roster, new Date(0)))));
        assert.equals(0, Object.keys(legacy.femaleSources ?? {}).length);
    });

    return suite;
}
