/**
 * YouthStarter.test.ts — PROG-2-9194 開局 14 歲投靠少年名將
 *
 * 新開局有少年、無幼苗；第 1 年年末滿 15 歲；同名成年版判為重複卡；結業還原成年完整值。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import {
    buildStarterYouth, getStarterYouthConfig, isSameGeneralPerson, isYouthGeneral, promoteYouthToAdult, youthCanEnroll, youthRatioAt,
} from '../assets/scripts/core/services/StarterYouthService';

const generals = JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
const adultOf = (id: string): GeneralConfig => generals.find(g => g.id === id)!;

async function newGame(youthId?: string): Promise<{ session: GameSession; roster: InMemoryRosterStore }> {
    const session = new GameSession(5);
    const roster = new InMemoryRosterStore();
    session.setRosterStore(roster);
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.5);
    session.setGeneralTemplates(generals);
    await session.startNewGameWithStarters(5, generals, youthId ? { youthGeneralId: youthId } : {});
    return { session, roster };
}

export function createYouthStarterSuite(): TestSuite {
    const suite = new TestSuite('YouthStarter (開局 14 歲少年名將 PROG-2-9194)');

    suite.test('新開局有一位 14 歲少年、沒有 4 歲幼苗，且不進血統樹', async () => {
        const { roster } = await newGame();
        const youths = roster.getAll().filter(g => isYouthGeneral(g));
        assert.equals(1, youths.length);
        assert.equals(14, youths[0].age);
        assert.equals(undefined, roster.getAll().find(g => g.id === 'starter-royal-child'));
        const record = youths[0] as GeneralConfig & { fatherId?: string; motherId?: string };
        assert.equals(undefined, record.fatherId);
        assert.equals(undefined, record.motherId);
    });

    suite.test('三位候選都能開局；名單外的人選明確報錯；候選職業傾向來自 JSON', async () => {
        const config = getStarterYouthConfig();
        assert.equals('zhao-yun,guan-yu,zhuge-liang', config.candidates.map(c => c.id).join(','));
        for (const candidate of config.candidates) {
            const { roster } = await newGame(candidate.id);
            assert.isTrue(roster.getAll().some(g => g.id === candidate.id && isYouthGeneral(g)));
        }
        let failed = false;
        try { await newGame('lu-bu'); } catch { failed = true; }
        assert.isTrue(failed, '不在候選名單的人不能當少年名將');
    });

    suite.test('少年數值 = 成年史實值 × 年齡係數，職業屬性降階，成年版資料不被改動', () => {
        const adult = adultOf('zhao-yun');
        const snapshot = JSON.stringify(adult);
        const youth = buildStarterYouth(adult);
        const ratio = youthRatioAt(14);
        assert.equals(Math.round(adult.str! * ratio), youth.str);
        assert.equals(youth.str, youth.stats!.str);
        assert.isTrue(youth.str! < adult.str!);
        assert.equals('A', (youth.troopAptitude as Record<string, string>).CAVALRY, '騎兵 S 降一階為 A');
        assert.equals(snapshot, JSON.stringify(adult));
    });

    suite.test('第 1 年年末（推進 4 季）少年滿 15 歲才可入學', async () => {
        const { session, roster } = await newGame();
        const id = getStarterYouthConfig().defaultPickId;
        assert.isTrue(!youthCanEnroll(roster.getAll().find(g => g.id === id)!));
        for (let i = 0; i < 3; i++) await session.advanceSeason();
        assert.isTrue(!youthCanEnroll(roster.getAll().find(g => g.id === id)!), '第 1 年第 4 季前未滿 15 歲');
        await session.advanceSeason();
        const grown = roster.getAll().find(g => g.id === id)!;
        assert.equals(15, grown.age);
        assert.isTrue(youthCanEnroll(grown));
    });

    suite.test('重複卡：抽到同名成年版算重複（少年版與成年版同一人），走既有轉突破規則', async () => {
        const { session } = await newGame('zhao-yun');
        const adult = adultOf('zhao-yun');
        assert.isTrue(isSameGeneralPerson(session.roster.find(g => g.id === 'zhao-yun')!, adult));
        assert.isTrue(session.duplicatePopupOwnedIds().has('zhao-yun'), '轉蛋重複卡分流要認得少年版');
        const result = session.enrollGenerals([adult], { rebirthOnDuplicate: true, fromGacha: true });
        assert.equals(0, result.added.length);
        assert.equals(1, result.rebirths.length, '同名成年版轉為重複卡突破素材');
        assert.equals(1, session.roster.filter(g => g.id === 'zhao-yun').length, '名冊不會多出第二個趙雲');
    });

    suite.test('學府結業還原成年完整值並保留培育增量', () => {
        const adult = adultOf('guan-yu');
        const youth = buildStarterYouth(adult);
        const trained = { ...youth, str: youth.str! + 6, stats: { ...youth.stats!, str: youth.str! + 6 }, age: 15 } as GeneralConfig;
        const promoted = promoteYouthToAdult(trained, youth, adult);
        assert.equals(adult.str! + 6, promoted.str);
        assert.equals(adult.int, promoted.int);
        assert.equals(adult.hp, promoted.hp);
        assert.equals(adult.age, promoted.age);
        assert.isTrue(!isYouthGeneral(promoted));
    });

    return suite;
}
