/**
 * NurtureRecordWiring.test.ts — 畢業培育紀錄寫入存檔欄位（NUR-15 MVP，PROG-2-0721）headless 測試
 *
 * 鎖住：畢業時 graduationRecords 多一筆；欄位取自培育會話與畢業結果；替代來源的欄位列在 unavailable；
 * 這筆紀錄用 server 列驗證函式檢查；revelation_level 取子嗣六維揭露層級的最低值（未揭露為 0）。
 */
import { assert, TestSuite } from './TestRunner';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { buildNurtureRecordRow, revelationLevelOf } from '../assets/scripts/core/systems/NurtureRecordRow';
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
        assert.equals(3, row.revelation_level);
    });

    suite.test('revelationLevelOf 取六維最低揭露層級，缺資料為 0', () => {
        const layer = (level: string) => ({ revelationLevel: level });
        const exact = { str: layer('EXACT'), int: layer('EXACT'), lea: layer('EXACT'), pol: layer('EXACT'), cha: layer('EXACT'), luk: layer('EXACT') };
        const oneHidden = { ...exact, luk: layer('HIDDEN') };
        assert.equals(3, revelationLevelOf({ dualLayerStats: exact as never }));
        assert.equals(0, revelationLevelOf({ dualLayerStats: oneHidden as never }));
        assert.equals(0, revelationLevelOf({ dualLayerStats: { str: layer('EXACT') } as never }));
        assert.equals(0, revelationLevelOf({}));
    });

    suite.test('紀錄經 server 列驗證通過', () => {
        const store = new InMemoryRosterStore([readyChild('kid') as never]);
        const svc = new NurtureService(store as never, { random: seeded(3), currentSeason: () => 0, admissionsPerSeason: 5 });
        svc.start('kid', []);
        for (let i = 0; i < NURTURE_TOTAL_ROUNDS; i++) svc.train('kid', 'rest');
        svc.graduate('kid');
        const row = svc.getState().graduationRecords![0];
        assert.equals('', validateNurtureRecordRow(row as never).join(';'));
    });

    suite.test('buildNurtureRecordRow：歷程欄位由會話既有欄位組成，仍可解析', () => {
        const session = {
            sessionId: 's1', childId: 'kid', startSeason: 2, round: 36, vigor: 0,
            talent: { str: 50, int: 50, lea: 50, pol: 50, cha: 50, luk: 50 },
            prowess: { str: 60, int: 50, lea: 50, pol: 50, cha: 50, luk: 50 },
            tp: 0, totalTp: 120, growthModifier: 1, mentors: [], status: 'completed',
            log: [
                { round: 1, phase: 'Foundation', negativeFactor: 'x' },
                { round: 2, phase: 'Midterm' },
            ],
            mentoringModeLog: [{ round: 3, mode: 'Support', sourceId: 'm1' }],
        } as unknown as NurtureSession;
        const { row, unavailable } = buildNurtureRecordRow(session, { rating: 'A', tags: ['耐戰'] }, 7);
        assert.equals('[{"round":1,"phase":"Foundation"},{"round":2,"phase":"Midterm"}]', row.phase_block_history_json);
        assert.equals('[{"round":3,"mode":"Support","sourceId":"m1"}]', row.mentoring_mode_log_json);
        assert.equals('[{"round":1,"negativeFactor":"x"}]', row.reveal_log_json);
        assert.equals(JSON.stringify(session.prowess), row.final_stats_json);
        assert.equals('["耐戰"]', row.graduation_tags_json);
        assert.equals(120, row.tp_total);
        assert.equals(7, row.end_season);
        assert.equals('', unavailable.join(','));
        assert.equals('', validateNurtureRecordRow(row as never).join(';'));
    });

    suite.test('舊存檔的會話沒有 totalTp 時 tp_total 改用目前 tp，並列在 unavailable', () => {
        const session = {
            sessionId: 's2', childId: 'kid', startSeason: 0, round: 36, vigor: 0,
            talent: {}, prowess: {}, tp: 15, growthModifier: 1, mentors: [], status: 'completed', log: [],
        } as unknown as NurtureSession;
        const { row, unavailable } = buildNurtureRecordRow(session, { rating: 'C', tags: [] }, 0);
        assert.equals(15, row.tp_total);
        assert.equals('[]', row.reveal_log_json);
        assert.equals('[]', row.mentoring_mode_log_json);
        assert.isTrue(unavailable.includes('tp_total'));
    });

    return suite;
}
