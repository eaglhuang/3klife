/**
 * FamilyOverviewHotspot.test.ts — 世家總覽熱點顯示與家族分組（PROG-2-1202，HALL-12）
 */
import { assert, TestSuite } from './TestRunner';
import {
    branchShortcutVisible,
    buildFamilyOverviewGroups,
    familyOverviewHotspotVisible,
    type SpiritFamilyStateRow,
} from '../assets/scripts/core/systems/FamilyOverviewHotspot';

function row(key: string, depth: number, fame: number, main: string | null = null): SpiritFamilyStateRow {
    return { Spirit_Family_Key: key, Family_Depth: depth, Family_Fame: fame, Active_Main_Spirit_UID: main };
}

export function createFamilyOverviewHotspotSuite(): TestSuite {
    const suite = new TestSuite('FamilyOverviewHotspot (PROG-2-1202 世家總覽熱點)');

    suite.test('世家系統未解鎖時熱點隱藏，解鎖後顯示', () => {
        assert.isFalse(familyOverviewHotspotVisible(false));
        assert.isTrue(familyOverviewHotspotVisible(true));
    });

    suite.test('世家入口捷徑只在武將已形成分支時顯示', () => {
        assert.isFalse(branchShortcutVisible(false));
        assert.isTrue(branchShortcutVisible(true));
    });

    suite.test('分組依家族深度高到低，同深度依名聲高到低', () => {
        const groups = buildFamilyOverviewGroups(
            [row('HAN_A', 2, 500), row('SHU_B', 5, 100), row('WEI_C', 2, 900)],
            () => undefined,
        );
        assert.equals('SHU_B,WEI_C,HAN_A', groups.map((g) => g.familyKey).join(','));
    });

    suite.test('同深度同名聲時依 key 排序，結果穩定', () => {
        const groups = buildFamilyOverviewGroups([row('B', 1, 10), row('A', 1, 10)], () => undefined);
        assert.equals('A,B', groups.map((g) => g.familyKey).join(','));
    });

    suite.test('家族名查得到用名稱，查不到退回 key；主卡可為空', () => {
        const groups = buildFamilyOverviewGroups(
            [row('SHU_B', 5, 100, 'G021'), row('WEI_C', 2, 900)],
            (key) => (key === 'SHU_B' ? '蜀漢世家' : undefined),
        );
        assert.equals('蜀漢世家', groups[0].familyName);
        assert.equals('G021', groups[0].mainSpiritUid!);
        assert.equals('WEI_C', groups[1].familyName);
        assert.isTrue(groups[1].mainSpiritUid === null);
    });

    suite.test('分組不改動輸入列', () => {
        const rows = [row('B', 1, 1), row('A', 3, 1)];
        buildFamilyOverviewGroups(rows, () => undefined);
        assert.equals('B', rows[0].Spirit_Family_Key);
    });

    return suite;
}
