/**
 * OfflineBehaviorMorning — 性格離線行為接進登入與晨報（HUM-03；PROG-2-2104）
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { OFFLINE_BEHAVIORS, offlineBehaviorJournalEntry, offlinePersonalityOf } from '../assets/scripts/core/systems/OfflinePersonalityBehavior';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 0, 10, 4);

function hero(id: string, name: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name, faction: 'shu', hp: 1000, str: 60, int: 60, lea: 60, pol: 60, cha: 60, age: 25, ...extra } as unknown as GeneralConfig;
}

function behaviorEntries(session: GameSession) {
    return session.queryJournal().filter((entry) => entry.entryId.startsWith('OFFLINE_BEHAVIOR-'));
}

export function createOfflineBehaviorMorningSuite(): TestSuite {
    const suite = new TestSuite('OfflineBehaviorMorning (性格離線行為進晨報 HUM-03 PROG-2-2104)');

    suite.test('性格來源：明確設定優先，其次具名名將，最後依屬性推導', () => {
        assert.equals('Playful', offlinePersonalityOf({ id: 'guan-yu', personality: { type: 'Playful' } }));
        assert.equals('Loyal', offlinePersonalityOf({ id: 'guan-yu', str: 99, cha: 1 }));
        assert.equals('Brave', offlinePersonalityOf({ id: 'x', str: 90, int: 50, cha: 50, luk: 50 }));
        assert.equals('Wise', offlinePersonalityOf({ id: 'x', str: 50, int: 90, cha: 50, luk: 50 }));
        assert.equals('Playful', offlinePersonalityOf({ id: 'x', str: 50, int: 50, cha: 50, luk: 90 }));
        assert.equals('Wise', offlinePersonalityOf({ id: 'x', stats: { int: 90, str: 10 } }));
    });

    suite.test('性格來源：同分與缺欄位都有固定結果', () => {
        assert.equals('Loyal', offlinePersonalityOf({ id: 'x', str: 70, int: 70, cha: 70, luk: 70 }));
        assert.equals('Loyal', offlinePersonalityOf({ id: 'x' }));
    });

    suite.test('具名名將都對得上武將資料（許褚尚未入庫）', () => {
        const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/data/generals.json'), 'utf8'));
        const list: { id: string }[] = Array.isArray(raw) ? raw : raw.generals;
        const ids = new Set(list.map((g) => g.id));
        for (const id of ['guan-yu', 'taishi-ci', 'zhang-fei', 'zhuge-liang', 'sima-yi', 'cao-zhi', 'xiao-qiao']) {
            assert.isTrue(ids.has(id), id);
        }
    });

    suite.test('日誌條目：挑一位，寫姓名與行為，掛在該武將名下', () => {
        const entry = offlineBehaviorJournalEntry([{ id: 'zhang-fei', name: '張飛', age: 30 }], () => 0, 7, 'T')!;
        assert.equals('OFFLINE_BEHAVIOR-7', entry.entryId);
        assert.equals('T', entry.timestamp);
        assert.equals('GROWTH', entry.category);
        assert.equals('zhang-fei', entry.relatedGeneralUids.join(','));
        assert.equals(OFFLINE_BEHAVIORS.Brave[0].narrative.replace('{Name}', '張飛'), entry.summary);
    });

    suite.test('日誌條目：幼童不出門喝酒；沒人可挑回傳 null', () => {
        const kid = { id: 'kid', name: '阿斗', age: 3 };
        assert.equals(null, offlineBehaviorJournalEntry([kid], () => 0, 1, 'T'));
        assert.equals(null, offlineBehaviorJournalEntry([], () => 0, 1, 'T'));
        assert.equals('g', offlineBehaviorJournalEntry([kid, { id: 'g', name: '甲' }], () => 0, 1, 'T')!.relatedGeneralUids[0]);
    });

    suite.test('登入：第一次登入不寫，隔天第一次登入寫一則並進晨報', () => {
        const session = new GameSession(1);
        session.enrollGenerals([hero('g1', '關羽')]);
        session.recordLoginAt(T0);
        assert.equals(0, behaviorEntries(session).length);
        session.recordLoginAt(T0 + DAY);
        const entries = behaviorEntries(session);
        assert.equals(1, entries.length);
        assert.isTrue(session.morningReport.items.some((item) => item.entryId === entries[0].entryId));
    });

    suite.test('登入：同一天再登入不重複；已故武將不會被挑到', () => {
        const session = new GameSession(1);
        session.enrollGenerals([hero('g1', '關羽', { status: 'dead' }), hero('g2', '張飛')]);
        session.recordLoginAt(T0);
        session.recordLoginAt(T0 + DAY);
        session.recordLoginAt(T0 + DAY + 1000);
        const entries = behaviorEntries(session);
        assert.equals(1, entries.length);
        assert.equals('g2', entries[0].relatedGeneralUids[0]);
    });

    return suite;
}
