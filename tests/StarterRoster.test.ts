import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { buildStarterRoster, STARTER_CORE_GENERAL_ID, STARTER_GENERAL_IDS } from '../assets/scripts/core/services/StarterRosterService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';

const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');
function data(): GeneralConfig[] {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
}
function throws(action: () => unknown): void {
    let failed = false;
    try { action(); } catch { failed = true; }
    assert.isTrue(failed, '不完整／不合格初始資料應明確報錯');
}
export function createStarterRosterSuite(): TestSuite {
    const suite = new TestSuite('StarterRoster (六位名將 / 核心主將 / 新局)');
    suite.test('真實資料六位名將齊全，所有欄位沿用原資料', () => {
        const source = data(), roster = buildStarterRoster(source);
        assert.equals(JSON.stringify(STARTER_GENERAL_IDS), JSON.stringify(roster.map(g => g.id)));
        for (const g of roster) assert.equals(JSON.stringify(source.find(original => original.id === g.id)), JSON.stringify(g));
    });
    suite.test('缺任一位或同 id 重複均報錯，不靜默略過', () => {
        for (const id of STARTER_GENERAL_IDS) throws(() => buildStarterRoster(data().filter(g => g.id !== id)));
        const source = data();
        throws(() => buildStarterRoster([...source, source.find(g => g.id === STARTER_CORE_GENERAL_ID)!]));
    });
    suite.test('名冊、stats、genes 均為深複本，修改回傳不污染原資料', () => {
        const source = data(), before = JSON.stringify(source), roster = buildStarterRoster(source);
        const core = roster.find(g => g.id === STARTER_CORE_GENERAL_ID)!;
        core.name = '已修改'; core.stats!.str = -1; core.genes![0].level = -1;
        roster.pop();
        assert.equals(before, JSON.stringify(source));
    });
    suite.test('預設核心張飛；六位都能當核心，六位以外或缺必要欄位報錯', () => {
        const source = data();
        assert.equals('legendary', buildStarterRoster(source).find(g => g.id === STARTER_CORE_GENERAL_ID)!.rarityTier);
        for (const id of STARTER_GENERAL_IDS) assert.equals(6, buildStarterRoster(source, { coreGeneralId: id }).length);
        throws(() => buildStarterRoster(source, { coreGeneralId: 'cao-cao' as never }));
        for (const key of ['ep', 'str', 'int', 'lea', 'pol', 'cha', 'genes', 'rarityTier', 'characterCategory'] as const) {
            const broken = data();
            delete broken.find(g => g.id === 'wei-yan')![key];
            throws(() => buildStarterRoster(broken));
        }
    });
    suite.test('開新局後六人、核心已選、時鐘歸零且存檔可讀回', async () => {
        const session = new GameSession(1), storage = new MemoryStorageAdapter(), save = new PlayerSaveService(storage);
        session.setRosterStore(new InMemoryRosterStore([data()[0]]));
        session.setSaveService(save);
        session.setRandomSource(() => 0.99);
        await session.advanceSeason();
        await session.startNewGameWithStarters(2, data());
        assert.equals(6, session.roster.length);
        assert.equals(STARTER_CORE_GENERAL_ID, session.leadGeneralId);
        assert.equals(JSON.stringify(new GameSession(2).gameTime), JSON.stringify(session.gameTime));
        const snapshot = await save.load();
        assert.equals(6, snapshot!.roster.length);
        assert.equals(STARTER_CORE_GENERAL_ID, snapshot!.leadGeneralId);
    });
    suite.test('既有 startNewGame 保留名冊，仍清除主將與時鐘', async () => {
        const session = new GameSession(1);
        session.setRosterStore(new InMemoryRosterStore([data().find(g => g.id === STARTER_CORE_GENERAL_ID)!]));
        await session.setLeadGeneral(STARTER_CORE_GENERAL_ID);
        const before = JSON.stringify(session.roster);
        session.startNewGame(3);
        assert.equals(before, JSON.stringify(session.roster));
        assert.equals(null, session.leadGeneralId);
        assert.equals(JSON.stringify(new GameSession(3).gameTime), JSON.stringify(session.gameTime));
    });
    suite.test('錯誤起始資料不會先清除既有名冊或時鐘', async () => {
        const session = new GameSession(1);
        session.setRosterStore(new InMemoryRosterStore([data()[0]]));
        session.setRandomSource(() => 0.99);
        await session.advanceSeason();
        const roster = JSON.stringify(session.roster), time = JSON.stringify(session.gameTime);
        let failed = false;
        try { await session.startNewGameWithStarters(2, []); } catch { failed = true; }
        assert.isTrue(failed);
        assert.equals(roster, JSON.stringify(session.roster));
        assert.equals(time, JSON.stringify(session.gameTime));
    });
    return suite;
}
