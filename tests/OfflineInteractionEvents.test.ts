/**
 * OfflineInteractionEvents.test.ts — 離線互動事件內容：候選、去重、摘要、登入寫日誌與存讀檔（PROG-2-1193，JRN-04）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { DynamicRelation } from '../assets/scripts/core/systems/KinRelation';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import {
    normalizeOfflineInteractionLog, offlineInteractionCandidates, offlineInteractionTags, pickOfflineInteraction,
    OFFLINE_INTERACTION_DETAILS, OFFLINE_INTERACTION_LOG_LIMIT,
} from '../assets/scripts/core/systems/OfflineInteractionEvents';

const HOUR = 3_600_000;
const SAVED_AT = 1_000_000_000_000;
const GENERALS = [{ id: 'g1', name: '關羽' }, { id: 'g2', name: '張飛' }, { id: 'g3', name: '趙雲' }];

function relation(uidA: string, uidB: string, type: DynamicRelation['type']): DynamicRelation {
    return { uidA, uidB, type, intimacy: 30, createdSeason: 0, decayRate: 2 };
}

function hero(id: string, name: string): GeneralConfig {
    return { id, name, faction: 'shu', hp: 1000, str: 60, int: 60, lea: 60, pol: 60, cha: 60 } as unknown as GeneralConfig;
}

/** 有兩位結義武將、讀檔時間為 SAVED_AT 的會話 */
function sworn(): GameSession {
    const session = new GameSession(1);
    session.enrollGenerals([hero('g1', '關羽'), hero('g2', '張飛')]);
    session.dynamicRelations.restore([relation('g1', 'g2', 'DYNAMIC_SWORN')]);
    (session as unknown as { _loadedSavedAtMs: number | null })._loadedSavedAtMs = SAVED_AT;
    return session;
}

export function createOfflineInteractionEventsSuite(): TestSuite {
    const suite = new TestSuite('OfflineInteractionEvents (PROG-2-1193 離線互動事件內容)');

    suite.test('候選只取兩人都在名冊的關係；標籤為關係類型去重', () => {
        const candidates = offlineInteractionCandidates([
            relation('g1', 'g2', 'DYNAMIC_SWORN'), relation('g2', 'gX', 'SPOUSE'), relation('g3', 'g1', 'COMRADE'), relation('g3', 'g2', 'COMRADE'),
        ], GENERALS);
        assert.equals(3, candidates.length);
        assert.equals('DYNAMIC_SWORN,COMRADE', offlineInteractionTags(candidates).join(','));
    });

    suite.test('摘要為劇本句加細節句，寫成 INTERACTION 日誌', () => {
        const candidates = offlineInteractionCandidates([relation('g1', 'g2', 'SPOUSE')], GENERALS);
        const event = pickOfflineInteraction(candidates, [], 'W1', () => 0, 7, 'T')!;
        assert.equals(`關羽 與 張飛 在你離席時發生了一段插曲。${OFFLINE_INTERACTION_DETAILS.SPOUSE[0]}`, event.entry.summary);
        assert.equals('INTERACTION', event.entry.category);
        assert.equals('OFFLINE_INTERACTION-7', event.entry.entryId);
        assert.equals('g1,g2', event.entry.relatedGeneralUids.join(','));
    });

    suite.test('同一登入窗同一對角色只排 1 則；換窗可再排', () => {
        const candidates = offlineInteractionCandidates([relation('g2', 'g1', 'COMRADE')], GENERALS);
        const first = pickOfflineInteraction(candidates, [], 'W1', () => 0.5, 1, 'T')!;
        assert.isTrue(pickOfflineInteraction(candidates, first.log, 'W1', () => 0.5, 2, 'T') === null);
        assert.isTrue(pickOfflineInteraction(candidates, first.log, 'W2', () => 0.5, 2, 'T') !== null);
    });

    suite.test('紀錄正規化：濾掉非字串，只留最後上限筆數', () => {
        const raw = [1, '', ...Array.from({ length: OFFLINE_INTERACTION_LOG_LIMIT + 3 }, (_, i) => `k${i}`)];
        const log = normalizeOfflineInteractionLog(raw);
        assert.equals(OFFLINE_INTERACTION_LOG_LIMIT, log.length);
        assert.equals(`k${OFFLINE_INTERACTION_LOG_LIMIT + 2}`, log[log.length - 1]);
        assert.equals(0, normalizeOfflineInteractionLog('x').length);
    });

    suite.test('GameSession：有關係才觸發；登入寫互動日誌並進晨報，同窗不重複', () => {
        const none = new GameSession(1);
        (none as unknown as { _loadedSavedAtMs: number | null })._loadedSavedAtMs = SAVED_AT;
        assert.isTrue(none.runOfflineInteraction(SAVED_AT + 5 * HOUR) === null);

        const session = sworn();
        assert.isTrue(session.runOfflineInteraction(SAVED_AT + 3 * HOUR) === null);
        session.recordLoginAt(SAVED_AT + 5 * HOUR);
        const entries = session.queryJournal({ category: 'INTERACTION' });
        assert.equals(1, entries.length);
        assert.isTrue(entries[0].summary.indexOf('關羽 與 張飛') === 0);
        assert.isTrue(session.morningReport.items.some((item) => item.entryId === entries[0].entryId));
        assert.isTrue(session.runOfflineInteraction(SAVED_AT + 6 * HOUR) === null);
    });

    suite.test('互動紀錄跨存讀檔保留；沒有紀錄時不寫欄位', () => {
        assert.isTrue(new GameSession(1).createSnapshot(new Date(0)).offlineInteractionLog === undefined);
        const session = sworn();
        session.runOfflineInteraction(SAVED_AT + 5 * HOUR);
        const snapshot = JSON.parse(JSON.stringify(session.createSnapshot(new Date(0)))) as PlayerSaveSnapshot;
        assert.equals(`W${SAVED_AT}|g1|g2`, snapshot.offlineInteractionLog!.join(','));
        const restored = new GameSession(1);
        restored.restoreLifespanState(snapshot);
        assert.equals(1, restored.offlineInteractionLog.length);
    });

    return suite;
}
