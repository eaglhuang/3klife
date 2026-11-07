/**
 * CloudSyncGuard — CDN 清單增量比對與快照同步防篡改（doc_spec_0334；PROG-2-2020）
 */
import { assert, TestSuite } from './TestRunner';
import { diffConfigManifest, evaluateSnapshotSync, type ConfigManifest } from '../assets/scripts/core/storage/CloudSyncGuard';

const REMOTE: ConfigManifest = {
    manifestVersion: '2026.11.07',
    files: {
        'data/generals.json': { md5: 'AAA', sizeBytes: 100 },
        'data/troops.json': { md5: 'bbb', sizeBytes: 20 },
        'data/gene-dictionary.json': { md5: 'ccc', sizeBytes: 5 },
    },
};

export function createCloudSyncGuardSuite(): TestSuite {
    const suite = new TestSuite('CloudSyncGuard (雲端同步校驗 doc_spec_0334 PROG-2-2020)');

    suite.test('§2 只下載 MD5 變更或新增的檔案', () => {
        const local: ConfigManifest = { manifestVersion: '2026.11.01', files: {
            'data/generals.json': { md5: 'aaa', sizeBytes: 100 },
            'data/troops.json': { md5: 'old', sizeBytes: 20 },
            'data/legacy.json': { md5: 'x', sizeBytes: 1 },
        } };
        const d = diffConfigManifest(local, REMOTE);
        assert.equals('data/gene-dictionary.json,data/troops.json', d.download.join(','));
        assert.equals('data/generals.json', d.unchanged.join(','));
        assert.equals('data/legacy.json', d.removed.join(','));
        assert.equals(25, d.downloadBytes);
    });

    suite.test('§2 沒有本地清單時全部下載；完全一致時不下載', () => {
        assert.equals(3, diffConfigManifest(null, REMOTE).download.length);
        assert.equals(0, diffConfigManifest(REMOTE, REMOTE).download.length);
    });

    suite.test('§3 序號遞增且 Hash 吻合才接受', () => {
        const db = { txSeq: 10, lastSyncHash: 'abc' };
        assert.isTrue(evaluateSnapshotSync(db, { txSeq: 11, baseHash: 'ABC' }).accepted);
        const back = evaluateSnapshotSync(db, { txSeq: 10, baseHash: 'abc' });
        assert.isFalse(back.accepted);
        if (!back.accepted) { assert.equals(409, back.status); assert.equals('tx-seq-not-increasing', back.reason); }
        const fork = evaluateSnapshotSync(db, { txSeq: 12, baseHash: 'zzz' });
        if (!fork.accepted) assert.equals('hash-forked', fork.reason); else assert.isTrue(false, '應拒絕分叉');
        assert.isTrue(evaluateSnapshotSync(null, { txSeq: 0, baseHash: '' }).accepted);
        const bad = evaluateSnapshotSync(db, { txSeq: -1, baseHash: 'abc' });
        if (!bad.accepted) assert.equals(400, bad.status); else assert.isTrue(false, '應拒絕負序號');
    });

    return suite;
}
