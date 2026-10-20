/**
 * NurtureRecordWiring.test.ts — 畢業培育紀錄寫入存檔欄位（NUR-15 MVP，PROG-2-0721）headless 測試
 *
 * 鎖住：畢業時 graduationRecords 多一筆；欄位取自培育會話與畢業結果；取不到的欄位為 null 並列在 unavailable；
 * 這筆紀錄用 server 列驗證函式檢查，只剩 revelation_level 未接（見卡片）。
 */
import { assert, TestSuite } from './TestRunner';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { buildNurtureRecordRow } from '../assets/scripts/core/systems/NurtureRecordRow';
import { NURTURE_TOTAL_ROUNDS, type NurtureSession } from '../assets/scripts/core/systems/NurtureSystem';
import { chooseFate, unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { validateNurtureRecordRow } from '../server/schema/nur15-row-validators';

function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function readyChild(id: string): UnveilingGeneral {
    const child = {
        id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'], genes: [],
    } as unknown as UnveilingGeneral;
    return chooseFate(unveilGeneral(child).general, 'accept');
}

export function createNurtureRecordWiringSuite(): TestSuite {
    const suite = new TestSuite('NurtureRecordWiring (畢業培育紀錄 NUR-15 MVP PROG-2-0721)');

    suite.test('畢業後 graduationRecords 多一筆，欄位取自會話與畢業結果', () => {
        const store = new InMemoryRosterStore([readyChild('kid') as never]);
        let season = 2;
        const svc = new NurtureService(store as never, { random: seeded(3), currentSeason: () => season, admissionsPerSeason: 5 });
        svc.start('kid', []);
        for (let i = 0; i < NURTURE_TOTAL_ROUNDS; i++) svc.train('kid', 'rest');
        season = 5;
        const result = svc.graduate('kid');

        const records = svc.getState().graduationRecords ?? [];
        assert.lengthEquals(1, records);
        const row = records[0];
        assert.equals('kid', row.child_uid);
        assert.equals(2, row.start_season);
        assert.equals(5, row.end_season);
        assert.equals(result.rating, row.rating);
        assert.equals(null, row.mentor_id);
        assert.equals(null, row.revelation_level);
    });

    suite.test('紀錄經 server 列驗證，只剩 revelation_level 未接', () => {
        const store = new InMemoryRosterStore([readyChild('kid') as never]);
        const svc = new NurtureService(store as never, { random: seeded(3), currentSeason: () => 0, admissionsPerSeason: 5 });
        svc.start('kid', []);
        for (let i = 0; i < NURTURE_TOTAL_ROUNDS; i++) svc.train('kid', 'rest');
        svc.graduate('kid');
        const row = svc.getState().graduationRecords![0];
        const errors = validateNurtureRecordRow(row as never);
        const tpMissingOnNewSession = row.tp_total === null;
        assert.isTrue(errors.some((e) => e.startsWith('revelation_level')));
        assert.equals(tpMissingOnNewSession ? 2 : 1, errors.length);
    });

    suite.test('buildNurtureRecordRow：JSON 欄位取不到時寫 "null"，仍可解析', () => {
        const session = {
            sessionId: 's1', childId: 'kid', startSeason: 2, round: 36, vigor: 0,
            talent: { str: 50, int: 50, lea: 50, pol: 50, cha: 50, luk: 50 },
            prowess: { str: 60, int: 50, lea: 50, pol: 50, cha: 50, luk: 50 },
            tp: 0, totalTp: 120, growthModifier: 1, mentors: [], status: 'completed',
        } as unknown as NurtureSession;
        const { row, unavailable } = buildNurtureRecordRow(session, { rating: 'A', tags: ['耐戰'] }, 7);
        assert.equals('null', row.phase_block_history_json);
        assert.equals('null', row.mentoring_mode_log_json);
        assert.equals('null', row.reveal_log_json);
        assert.equals(JSON.stringify(session.prowess), row.final_stats_json);
        assert.equals('["耐戰"]', row.graduation_tags_json);
        assert.equals(120, row.tp_total);
        assert.equals(7, row.end_season);
        assert.equals('revelation_level,phase_block_history_json,mentoring_mode_log_json,reveal_log_json', unavailable.join(','));
        assert.equals('', validateNurtureRecordRow(row as never).filter((e) => !e.startsWith('revelation_level')).join(';'));
    });

    suite.test('舊存檔的會話沒有 totalTp 時 tp_total 為 null，並列在 unavailable', () => {
        const session = {
            sessionId: 's2', childId: 'kid', startSeason: 0, round: 36, vigor: 0,
            talent: {}, prowess: {}, tp: 0, growthModifier: 1, mentors: [], status: 'completed',
        } as unknown as NurtureSession;
        const { row, unavailable } = buildNurtureRecordRow(session, { rating: 'C', tags: [] }, 0);
        assert.equals(null, row.tp_total);
        assert.isTrue(unavailable.includes('tp_total'));
    });

    return suite;
}
