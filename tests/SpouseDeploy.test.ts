/**
 * SpouseDeploy.test.ts — 配偶上場與指派入口改走占用矩陣（PROG-2-9484 F4；doc_spec_1241 第 3.1、3.3、3.5 節）
 *
 * 涵蓋：生成型配偶固定種子、納配偶入名冊（上限／重複）、配偶可出征／派遣／當太守、
 * 指派入口由 isRegistered 改 checkAssign（學府擋、哺乳與待產放行太守但擋出征）。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { buildGeneratedSpouse } from '../assets/scripts/core/systems/GeneratedSpouse';

const ROOT = join(__dirname, '..');
const generals = JSON.parse(readFileSync(join(ROOT, 'assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
const readJson = (name: string): unknown => JSON.parse(readFileSync(join(ROOT, `assets/resources/data/${name}.json`), 'utf8'));

async function newGame(): Promise<{ session: GameSession; store: InMemoryRosterStore }> {
    const store = new InMemoryRosterStore();
    const session = new GameSession(5);
    session.setRosterStore(store);
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.5);
    session.setGeneralTemplates(generals);
    session.configureFamily(readJson('family-config'));
    session.configureOccupancyMatrix(readJson('occupancy-matrix'));
    await session.startNewGameWithStarters(5, generals, {});
    return { session, store };
}

/** 名冊裡第一位可出征的非配偶成年武將（當作哺乳／待產／學府測試對象） */
function adultOf(session: GameSession): GeneralConfig {
    const found = session.getDeployableGenerals().find((g) => !session.isSpouse(g.id));
    assert.isTrue(!!found, '名冊應有可出征武將');
    return found as GeneralConfig;
}

export function createSpouseDeploySuite(): TestSuite {
    const suite = new TestSuite('SpouseDeploy (配偶上場與指派入口改 checkAssign PROG-2-9484)');

    suite.test('生成型配偶：同 slot 永遠同一人、EP 在範圍內、女性成年', () => {
        const a = buildGeneratedSpouse({ slot: 'first-child', epRange: [50, 70] });
        const b = buildGeneratedSpouse({ slot: 'first-child', epRange: [50, 70] });
        const c = buildGeneratedSpouse({ slot: 'matchmaker:y3:1', epRange: [50, 70] });
        assert.equals(JSON.stringify(a), JSON.stringify(b));
        assert.isTrue(a.id !== c.id, '不同 slot 不同人');
        assert.isTrue((a.ep as number) >= 50 && (a.ep as number) <= 70);
        assert.equals('女', a.gender);
        assert.isTrue((a.pol as number) > (a.str as number), '偏內政、戰力偏低');
    });

    suite.test('納生成型配偶：進名冊與家族紀錄；出現在出征清單；可派遣、可當太守', async () => {
        const { session } = await newGame();
        const out = session.enrollGeneratedSpouse('first-child');
        assert.isTrue(out.ok);
        const id = out.generalId as string;
        assert.isTrue(session.isSpouse(id));
        assert.isTrue(session.roster.some((g) => g.id === id));
        assert.isTrue(session.getDeployableGenerals().some((g) => g.id === id), '配偶應出現在出征選單');
        assert.isTrue(session.checkDeployable(id).eligible);
        assert.isTrue(session.dispatchIdleGenerals(0).some((g) => g.id === id), '配偶可派遣');
        assert.isTrue(session.assignGovernor('farming', id).ok, '配偶可當太守');
    });

    suite.test('納配偶：同 slot 重複被擋；超過幕府等級上限回 cap-reached；未載入設定回 no-config', async () => {
        const { session } = await newGame();
        assert.isTrue(session.enrollGeneratedSpouse('a').ok);
        assert.equals('duplicate', session.enrollGeneratedSpouse('a').reason);
        assert.isTrue(session.enrollGeneratedSpouse('b').ok);
        assert.equals('cap-reached', session.enrollGeneratedSpouse('c').reason);
        assert.isTrue(session.enrollGeneratedSpouse('c', { hallLevel: 3 }).ok, '幕府 Lv3 上限 3');
        const bare = new GameSession(1);
        assert.equals('no-config', bare.enrollGeneratedSpouse('x').reason);
    });

    suite.test('學府修業（academy 登記）：不能出征、不能派遣、不能當太守', async () => {
        const { session } = await newGame();
        const g = adultOf(session);
        session.occupancyHost.service.acquire({ personId: g.id, kind: 'academy', refId: 'ac:1' });
        assert.isFalse(session.checkDeployable(g.id).eligible);
        assert.isTrue(session.checkDeployable(g.id).reasons.includes('occupied'));
        assert.isFalse(session.dispatchIdleGenerals(0).some((x) => x.id === g.id));
        assert.equals('occupied', session.assignGovernor('farming', g.id).reason);
    });

    suite.test('哺乳母親：出征清單沒有她、可當太守、可接大廳任務、不可派遣（需離城）', async () => {
        const { session } = await newGame();
        const g = adultOf(session);
        session.occupancyHost.service.acquire({ personId: g.id, kind: 'nursing', refId: 'nurse:baby1', since: 0, until: 8 });
        assert.isFalse(session.getDeployableGenerals().some((x) => x.id === g.id), '哺乳不在出征選單');
        assert.isTrue(session.checkDeployable(g.id).reasons.includes('occupied'));
        assert.isTrue(session.assignGovernor('farming', g.id).ok, '哺乳可當太守');
        const fact = session.missionGeneralFacts().find((f) => f.id === g.id);
        assert.isFalse((fact?.block ?? []).includes('occupied'), '哺乳可接不離城的大廳任務');
        assert.isFalse(session.dispatchIdleGenerals(0).some((x) => x.id === g.id), '哺乳不可派遣');
    });

    suite.test('待產：不能出征，可當太守', async () => {
        const { session, store } = await newGame();
        const g = adultOf(session);
        store.replaceAll(session.roster.map((x) => (x.id === g.id ? ({ ...x, pregnancySeasonsLeft: 2 } as unknown as GeneralConfig) : x)));
        assert.isFalse(session.getDeployableGenerals().some((x) => x.id === g.id));
        assert.isTrue(session.assignGovernor('farming', g.id).ok);
    });

    return suite;
}
