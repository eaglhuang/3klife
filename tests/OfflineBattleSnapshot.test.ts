/**
 * PROG-2-1184：離線戰鬥快照（JRN-05，doc_spec_0015 §F-4）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import {
    appendOfflineBattleSnapshot, nextOfflineBattleSnapshotId, normalizeOfflineBattleSnapshots, OFFLINE_BATTLE_SNAPSHOT_LIMIT,
    offlineBattleResultDigest, snapshotDigest, verifyOfflineBattleChain, type OfflineBattleInput,
} from '../assets/scripts/core/systems/OfflineBattleSnapshot';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const INPUT: OfflineBattleInput = {
    battleType: 'AUTO_RESOLVE', seed: '184-1-1', lineup: [{ name: '趙雲', str: 90 }], tileState: { nationId: 'yuan' }, tactics: [],
    win: true, playerStrength: 3000, enemyStrength: 1000,
};

function hero(id: string): GeneralConfig {
    return { id, name: id, faction: 'shu', hp: 1000, str: 90, int: 70, lea: 90, pol: 60, cha: 70 } as GeneralConfig;
}

export function createOfflineBattleSnapshotSuite(): TestSuite {
    const suite = new TestSuite('OfflineBattleSnapshot (PROG-2-1184 離線戰鬥快照)');

    suite.test('確定性：鍵順序不同內容相同時摘要一致', () => {
        assert.equals(snapshotDigest({ a: 1, b: [2, 3] }), snapshotDigest({ b: [2, 3], a: 1 }));
        assert.isTrue(snapshotDigest({ a: 1 }) !== snapshotDigest({ a: 2 }));
        const one = appendOfflineBattleSnapshot([], 'OBS_0001', INPUT).snapshot;
        const two = appendOfflineBattleSnapshot([], 'OBS_0001', { ...INPUT }).snapshot;
        assert.equals(JSON.stringify(one), JSON.stringify(two));
        assert.equals(8, one.lineupDigest.length);
    });

    suite.test('結果分級：兵力比 1.5 為大勝／大敗門檻', () => {
        assert.equals('WIN_MAJOR', offlineBattleResultDigest(true, 1500, 1000));
        assert.equals('WIN_MINOR', offlineBattleResultDigest(true, 1400, 1000));
        assert.equals('LOSE_MINOR', offlineBattleResultDigest(false, 1000, 1200));
        assert.equals('LOSE_MAJOR', offlineBattleResultDigest(false, 0, 500));
    });

    suite.test('鏈：首筆接空雜湊，依序串接；竄改可偵測；截斷後以已知 link 驗證', () => {
        let list = appendOfflineBattleSnapshot([], 'OBS_0001', INPUT).snapshots;
        list = appendOfflineBattleSnapshot(list, 'OBS_0002', { ...INPUT, win: false, playerStrength: 800 }).snapshots;
        assert.equals(-1, verifyOfflineBattleChain(list));
        const tampered = list.map((s) => ({ ...s }));
        tampered[1].resultDigest = 'WIN_MAJOR';
        assert.equals(1, verifyOfflineBattleChain(tampered));
        assert.equals(-1, verifyOfflineBattleChain(list.slice(1), list[0].syncHashLink));
    });

    suite.test('上限、id 遞增、正規化丟棄壞資料', () => {
        let list = appendOfflineBattleSnapshot([], 'OBS_0001', INPUT).snapshots;
        for (let i = 0; i < OFFLINE_BATTLE_SNAPSHOT_LIMIT + 3; i++) {
            list = appendOfflineBattleSnapshot(list, nextOfflineBattleSnapshotId(list), INPUT).snapshots;
        }
        assert.equals(OFFLINE_BATTLE_SNAPSHOT_LIMIT, list.length);
        assert.equals('OBS_0025', nextOfflineBattleSnapshotId(list));
        assert.equals('OBS_0001', nextOfflineBattleSnapshotId([]));
        const normalized = normalizeOfflineBattleSnapshots([list[0], { snapshotId: 'x' }, null, { ...list[1], resultDigest: 'DRAW' }]);
        assert.equals(1, normalized.length);
        assert.equals(0, normalizeOfflineBattleSnapshots('bad').length);
    });

    suite.test('GameSession：季度敵襲自動迎戰留快照、寫日誌指向快照、跨存讀檔保留', async () => {
        const session = new GameSession(7);
        session.enrollGenerals([hero('zhao'), hero('zhang'), hero('guan')]);
        await session.setRivals({ ...session.rivals, nations: session.rivals.nations.map((n) => ({ ...n, atWar: true, allied: false })) });
        for (let i = 0; i < 60 && session.offlineBattleSnapshots.length === 0; i++) {
            await session.advanceSeason();
        }
        const snapshots = session.offlineBattleSnapshots;
        assert.isTrue(snapshots.length > 0, '60 季內應至少有一次敵襲');
        assert.equals('AUTO_RESOLVE', snapshots[0].battleType);
        assert.equals(-1, verifyOfflineBattleChain(snapshots));
        const entry = session.queryJournal({ category: 'BATTLE' }).find((e) => e.snapshotRef === snapshots[0].snapshotId);
        assert.isTrue(entry !== undefined);
        const saved = JSON.parse(JSON.stringify(session.createSnapshot())) as PlayerSaveSnapshot;
        const restored = new GameSession(8);
        restored.restoreLifespanState(saved);
        assert.equals(JSON.stringify(snapshots), JSON.stringify(restored.offlineBattleSnapshots));
        assert.isTrue(new GameSession(9).createSnapshot().offlineBattleSnapshots === undefined);
    });

    return suite;
}
