/**
 * NursingWiring.test.ts — 待產與哺乳接線（PROG-2-9485 F5；doc_spec_1241 第 3.4、3.5 節，TC-FAM-02、03）
 *
 * 涵蓋：待產 2 季（與 family-config 一致）、出生後依哺乳方式登記 nursing（母乳到孩子 5 歲、其他方式產後 1 季、
 * 乳母不占用）、改方式即釋放再登記、哺乳母親出征被擋但可當太守。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PREGNANCY_LOCK_SEASONS } from '../assets/scripts/core/systems/BreedingSystem';
import type { NursingMethod } from '../assets/scripts/shared/family/FamilyTypes';

const ROOT = join(__dirname, '..');
const readJson = (name: string): unknown => JSON.parse(readFileSync(join(ROOT, `assets/resources/data/${name}.json`), 'utf8'));
const familyConfig = readJson('family-config') as { postpartumQuarters: number; breastfeedEndAge: number };

function person(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'player', hp: 100, vitality: 100, maxVitality: 100, age: 25, gender: '女', ...extra } as unknown as GeneralConfig;
}

/** 一位待產母親（pregnancySeasonsLeft）與她肚裡的孩子；母親有指定哺乳方式 */
function rig(method?: NursingMethod): { session: GameSession; store: InMemoryRosterStore } {
    const store = new InMemoryRosterStore([
        person('mom', { pregnancySeasonsLeft: PREGNANCY_LOCK_SEASONS, ...(method ? { nursingMethod: method } : {}) }),
        person('kid', { age: 0.5, gender: '男', motherId: 'mom', fatherId: 'dad' }),
        person('dad', { gender: '男' }),
    ]);
    const session = new GameSession(3);
    session.setRosterStore(store);
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.99);
    session.configureFamily(familyConfig);
    session.configureOccupancyMatrix(readJson('occupancy-matrix'));
    return { session, store };
}

async function advance(session: GameSession, seasons: number): Promise<void> {
    for (let i = 0; i < seasons; i++) await session.advanceSeason();
}

const nursingOf = (session: GameSession, id: string) => session.occupancyHost.service.query(id).filter((r) => r.kind === 'nursing');

export function createNursingWiringSuite(): TestSuite {
    const suite = new TestSuite('NursingWiring (待產與哺乳接線 PROG-2-9485)');

    suite.test('待產季數：BreedingSystem 與 breeding-rules.pregnancyLockSeasons 單一來源（2 季）', () => {
        assert.equals(2, PREGNANCY_LOCK_SEASONS);
        assert.equals(2, (readJson('breeding-rules') as { pregnancyLockSeasons: number }).pregnancyLockSeasons);
    });

    suite.test('待產 2 季：期間擋出征、可當太守；出生當季起依母乳登記 nursing（到孩子 5 歲）', async () => {
        const { session } = rig();
        await advance(session, 1);
        assert.equals(0, nursingOf(session, 'mom').length, '待產中還沒出生，不登記哺乳');
        assert.isFalse(session.getDeployableGenerals().some((g) => g.id === 'mom'));
        assert.isTrue(session.assignGovernor('farming', 'mom').ok, '待產可當太守');
        await advance(session, 1);
        const records = nursingOf(session, 'mom');
        assert.equals(1, records.length, '出生後登記 nursing');
        assert.equals('nurse:kid', records[0].refId);
        const seasonNow = session.gameTime.totalSeasonsElapsed;
        const kid = session.roster.find((g) => g.id === 'kid') as GeneralConfig;
        const expectedUntil = seasonNow + Math.ceil((familyConfig.breastfeedEndAge - (kid.age as number)) / 0.25);
        assert.equals(expectedUntil, records[0].until);
    });

    suite.test('哺乳母親：出征清單沒有她（原因 occupied）、仍可當太守', async () => {
        const { session, store } = rig();
        await advance(session, 2);
        store.replaceAll(session.roster.map((g) => (g.id === 'mom' ? ({ ...g, vitality: 100 } as GeneralConfig) : g)));
        assert.isFalse(session.getDeployableGenerals().some((g) => g.id === 'mom'));
        assert.isTrue(session.checkDeployable('mom').reasons.includes('occupied'));
        assert.isTrue(session.assignGovernor('farming', 'mom').ok);
    });

    suite.test('非母乳方式：產後休養 1 季，到期自動釋放', async () => {
        const { session } = rig('formula');
        await advance(session, 2);
        const records = nursingOf(session, 'mom');
        assert.equals(1, records.length);
        assert.equals(session.gameTime.totalSeasonsElapsed + familyConfig.postpartumQuarters, records[0].until);
        await advance(session, familyConfig.postpartumQuarters);
        assert.equals(0, nursingOf(session, 'mom').length, '休養期滿釋放');
    });

    suite.test('乳母方式：母親不登記哺乳占用', async () => {
        const { session } = rig('wetNurse');
        await advance(session, 2);
        assert.equals(0, nursingOf(session, 'mom').length);
    });

    suite.test('改方式：母乳中改乳母即釋放；改回母乳重新登記；找不到母親回 false', async () => {
        const { session } = rig();
        await advance(session, 2);
        assert.equals(1, nursingOf(session, 'mom').length);
        assert.isTrue(session.setNursingMethod('mom', 'wetNurse'));
        assert.equals(0, nursingOf(session, 'mom').length, '改乳母釋放占用');
        assert.isTrue(session.setNursingMethod('mom', 'breast'));
        assert.equals(0, nursingOf(session, 'mom').length, '沒在哺乳期不會自行重新登記（只在出生時登記）');
        assert.isFalse(session.setNursingMethod('ghost', 'breast'));
    });

    suite.test('改方式（母乳→其他）：哺乳中改非母乳，到期日縮成產後休養', async () => {
        const { session } = rig();
        await advance(session, 2);
        assert.isTrue(session.setNursingMethod('mom', 'formula'));
        const records = nursingOf(session, 'mom');
        assert.equals(1, records.length);
        assert.equals(session.gameTime.totalSeasonsElapsed + familyConfig.postpartumQuarters, records[0].until);
    });

    suite.test('登記被占用擋下：先記 nursingPending 並在季結顯示一行，占用解除後下一季重試登記', async () => {
        const { session } = rig();
        const dispatch = (session as unknown as { _dispatch: { active: Array<Record<string, unknown>> } })._dispatch;
        await advance(session, 1);
        dispatch.active.push({ generalId: 'mom', jobId: 'job:far', startedAtMs: 0, dueAtMs: 9e15 });
        const birth = await session.advanceSeason();
        assert.equals(0, nursingOf(session, 'mom').length, '被派遣占用登記不上');
        assert.equals(1, (birth.nursingLines ?? []).length, '季結顯示一行提示');
        assert.isTrue(!!(session.roster.find((g) => g.id === 'mom') as GeneralConfig).nursingPending);
        dispatch.active.length = 0;
        const next = await session.advanceSeason();
        assert.equals(1, nursingOf(session, 'mom').length, '下一季重試成功');
        assert.equals(0, (next.nursingLines ?? []).length);
        assert.isFalse(!!(session.roster.find((g) => g.id === 'mom') as GeneralConfig).nursingPending, '成功後清掉待重試');
    });

    return suite;
}
