/**
 * SpiritArchiveSnapshot.test.ts — 英靈死亡快照（PROG-2-0313 / WBS SPI-03）headless 測試
 *
 * Unity 對照：EditMode Test 直接呼叫純邏輯，不實例化 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildSpiritArchiveSnapshot,
    computeDisplayWeight,
    snapshotCompleteness,
    sortSnapshotsForDisplay,
    summarizeHeroicDeeds,
    SpiritArchiveSnapshot,
} from '../assets/scripts/core/systems/SpiritArchiveSnapshot';
import { GeneralArchiver } from '../assets/scripts/core/services/GeneralArchiver';
import { PendingDeleteStore } from '../assets/scripts/core/services/PendingDeleteStore';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';

function hero(id: string, extra: Record<string, unknown> = {}) {
    return {
        id, name: id, faction: 'player', gender: '女', age: 70,
        str: 98, int: 72, lea: 95, pol: 40, luk: 60,
        skillId: 'SKILL_A', battlePrimarySkillId: 'SKILL_B', introLine: '七進七出',
        battleRecord: { wins: 12, losses: 3, draws: 1, merit: 50, kills: 120, milestones: ['KILL_100'] },
        ...extra,
    };
}

export function createSpiritArchiveSnapshotSuite(): TestSuite {
    const suite = new TestSuite('SpiritArchiveSnapshot (英靈死亡快照 SPI-03)');

    suite.test('建立快照：欄位齊全，Spirit_ID 沿用武將 id，戰報參照指向 L5', () => {
        const snap = buildSpiritArchiveSnapshot(hero('zhao'), { season: 42 });
        assert.equals('zhao', snap.Spirit_ID);
        assert.equals(42, snap.Death_Season);
        assert.equals('generals_archive_l5:zhao', snap.Battle_Record_Ref);
        assert.equals('七進七出', snap.Legacy_Quote);
        assert.equals(98, snap.Final_Stats_Snapshot.str);
        assert.equals(60, snap.Final_Stats_Snapshot.luk);
        assert.equals('SKILL_A,SKILL_B', snap.Final_Skills_Snapshot.join(','));
        assert.equals(0, snap.Final_Equipment_Snapshot.length);
    });

    suite.test('缺資料時給安全預設：空事蹟、空技能、屬性為 0、權重不為 NaN', () => {
        const snap = buildSpiritArchiveSnapshot({ id: 'bare' }, { season: 1 });
        assert.equals(0, snap.Heroic_Deeds_Summary.length);
        assert.equals(0, snap.Final_Skills_Snapshot.length);
        assert.equals(0, snap.Final_Stats_Snapshot.str);
        assert.equals(0, snap.Display_Weight);
        assert.equals('', snap.Legacy_Quote);
    });

    suite.test('主技能與戰鬥主技能相同時去重，只剩一筆', () => {
        const snap = buildSpiritArchiveSnapshot(hero('same', { battlePrimarySkillId: 'SKILL_A' }), { season: 1 });
        assert.equals('SKILL_A', snap.Final_Skills_Snapshot.join(','));
    });

    suite.test('英勇事蹟摘要：有場次才列勝負，里程碑顯示中文名，無戰績回空陣列', () => {
        const lines = summarizeHeroicDeeds({ wins: 12, losses: 3, draws: 1, merit: 50, kills: 120, milestones: ['KILL_100'] });
        assert.equals('出征 16 場：勝 12 / 負 3', lines[0]);
        assert.isTrue(lines.includes('擊殺敵軍 120'));
        assert.isTrue(lines.includes('功勳 50'));
        assert.isTrue(lines.includes('里程碑：百人斬'));
        assert.equals(0, summarizeHeroicDeeds(undefined).length);
        assert.equals(0, summarizeHeroicDeeds({ wins: 0, losses: 0 }).length);
    });

    suite.test('展示權重 = 五圍合計 + 功勳（暫定）', () => {
        const stats = { str: 10, int: 20, lea: 30, pol: 40, luk: 50 };
        assert.equals(150 + 7, computeDisplayWeight(stats, { wins: 0, losses: 0, merit: 7 }));
        assert.equals(150, computeDisplayWeight(stats, undefined));
    });

    suite.test('完整度：三項內容各占 1/3', () => {
        const full = buildSpiritArchiveSnapshot(hero('full'), { season: 1 });
        assert.equals(1, snapshotCompleteness(full));
        const bare = buildSpiritArchiveSnapshot({ id: 'bare' }, { season: 1 });
        assert.equals(0, snapshotCompleteness(bare));
        const statsOnly = buildSpiritArchiveSnapshot({ id: 's', str: 1 }, { season: 1 });
        assert.isTrue(Math.abs(snapshotCompleteness(statsOnly) - 1 / 3) < 1e-9);
    });

    suite.test('陳列室排序：權重 DESC → 死亡季 DESC → 完整度 DESC → Spirit_ID ASC，且不改原陣列', () => {
        const make = (id: string, weight: number, season: number, complete: boolean): SpiritArchiveSnapshot => {
            const base = buildSpiritArchiveSnapshot(complete ? hero(id) : { id }, { season });
            return { ...base, Display_Weight: weight };
        };
        const input = [
            make('c', 10, 5, false),
            make('a', 20, 1, true),
            make('b', 10, 5, true),
            make('d', 10, 9, false),
        ];
        const before = input.map((s) => s.Spirit_ID).join(',');
        const sorted = sortSnapshotsForDisplay(input).map((s) => s.Spirit_ID).join(',');
        assert.equals('a,d,b,c', sorted);
        assert.equals(before, input.map((s) => s.Spirit_ID).join(','));
    });

    suite.test('武將死亡歸檔：魂卡帶上 archiveSnapshot，且與魂卡 uid 對應', async () => {
        const adapter = new MemoryStorageAdapter();
        const archiver = new GeneralArchiver(adapter, new PendingDeleteStore(adapter));
        const card = await archiver.archive(
            hero('liu') as unknown as Parameters<GeneralArchiver['archive']>[0],
            { battleId: '', cause: 'age', season: 33, year: 1 },
        );
        assert.isTrue(card.archiveSnapshot !== undefined);
        assert.equals(card.uid, card.archiveSnapshot!.Spirit_ID);
        assert.equals(33, card.archiveSnapshot!.Death_Season);
        assert.equals('SKILL_A,SKILL_B', card.archiveSnapshot!.Final_Skills_Snapshot.join(','));
        const stored = await archiver.getAllSpiritCards();
        assert.equals(98, stored[0].archiveSnapshot!.Final_Stats_Snapshot.str);
    });

    return suite;
}
