/**
 * DungeonRescueFlow.test.ts — 民間尋訪接線（PROG-2-1788）
 *
 * 鎖住：三種結果的武將與來源、8 小時冷卻、冷卻存檔後仍在、文案、招賢館有按鈕。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { buildRescuedGeneral, rescueRefreshLine, rescueRefreshRemainingMs, rescueResultLines, RESCUE_REFRESH_HOURS } from '../assets/scripts/core/systems/DungeonRescue';
import { checkBreedingEligibility } from '../assets/scripts/core/systems/BreedingSystem';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { femaleSourceConceptionMod } from '../assets/scripts/core/systems/FemaleSource';
import { femaleSourcePresentationOf } from '../assets/scripts/core/systems/FemaleSourcePresenter';

const HOUR = 60 * 60 * 1000;

function build(adapter = new MemoryStorageAdapter(), random: () => number = () => 0): { session: GameSession; store: InMemoryRosterStore } {
    const session = new GameSession();
    const store = new InMemoryRosterStore([]);
    session.setRosterStore(store);
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(random);
    return { session, store };
}

export function createDungeonRescueFlowSuite(): TestSuite {
    const suite = new TestSuite('DungeonRescueFlow (民間尋訪 PROG-2-1788)');

    suite.test('尋訪：民女入名冊，記 DUNGEON 來源，受孕率 0.8', async () => {
        const { session, store } = build();
        const result = await session.performDungeonRescue(1000 * HOUR);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals('commoner', result.outcome);
        const general = store.getAll().find((g) => g.id === result.general.id)!;
        assert.equals('女', general.gender);
        assert.equals('王氏', general.name);
        assert.equals('DUNGEON', result.source.Source_Type);
        assert.equals('R', result.source.Quality_Grade);
        assert.equals(0.8, femaleSourceConceptionMod(result.source));
        assert.equals('來源品質：民間尋訪 (R)', femaleSourcePresentationOf(result.source)!.qualityTag);
    });

    suite.test('冷卻：8 小時內回傳剩餘時間且名冊不變；到期可再尋訪；id 不重複', async () => {
        const { session, store } = build();
        const start = 1000 * HOUR;
        await session.performDungeonRescue(start);
        const blocked = await session.performDungeonRescue(start + HOUR);
        assert.isFalse(blocked.ok);
        if (!blocked.ok) assert.equals((RESCUE_REFRESH_HOURS - 1) * HOUR, blocked.remainingMs);
        assert.equals(1, store.getAll().length);
        assert.isTrue((await session.performDungeonRescue(start + RESCUE_REFRESH_HOURS * HOUR)).ok);
        assert.equals(2, new Set(store.getAll().map((g) => g.id)).size);
    });

    suite.test('存檔：讀檔後冷卻與來源都還在', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = build(adapter);
        first.session.startNewGame(20261105);
        const start = 1000 * HOUR;
        const result = await first.session.performDungeonRescue(start);
        await first.session.save();
        const second = build(adapter);
        assert.isTrue(await second.session.load());
        assert.isFalse((await second.session.performDungeonRescue(start + HOUR)).ok);
        if (result.ok) assert.equals('DUNGEON', second.session.femaleSources[result.general.id].Source_Type);
    });

    suite.test('能力：千金政治魅力較高，貴族整體最高', () => {
        const avg = (outcome: 'commoner' | 'noble-lady' | 'noble') => {
            const g = buildRescuedGeneral(outcome, 'x', () => 0.5) as unknown as Record<string, number>;
            return { all: (g.str + g.int + g.lea + g.pol + g.cha + g.luk) / 6, polCha: g.pol - g.str };
        };
        assert.equals(0, avg('commoner').polCha);
        assert.equals(10, avg('noble-lady').polCha);
        assert.isTrue(avg('noble').all > avg('noble-lady').all);
        assert.isTrue(avg('noble-lady').all > avg('commoner').all);
    });

    suite.test('救回就能結緣：最小年齡的三種女將都通過資格檢查', () => {
        const father = { id: 'f', name: '父', gender: '男', age: 30, vitality: 100, maxVitality: 100 } as unknown as GeneralConfig;
        for (const outcome of ['commoner', 'noble-lady', 'noble'] as const) {
            assert.isTrue(checkBreedingEligibility(father, buildRescuedGeneral(outcome, 'x', () => 0)).ok, outcome);
        }
    });

    suite.test('文案：救美句、結果句與 §H 倒數', () => {
        const lines = rescueResultLines('noble', '王氏貴女', '來源品質：民間尋訪 (SR)');
        assert.equals('密林深處傳來救命聲——一名女子被山賊圍困！', lines[0]);
        assert.equals('竟是沒落世家之女！舉手投足盡顯風華。', lines[1]);
        assert.equals('救下一名村姑，雖非名門，卻質樸健康。', rescueResultLines('commoner', 'a', 'b')[1]);
        assert.equals('民間尋訪將在 7 小時 30 分 後刷新', rescueRefreshLine(7.5 * HOUR));
        assert.equals('民間尋訪將在 1 分 後刷新', rescueRefreshLine(1));
        assert.equals(0, rescueRefreshRemainingMs(0, 9 * HOUR));
    });

    suite.test('招賢館有民間尋訪按鈕，大廳接上', () => {
        const layout = fs.readFileSync(path.resolve(__dirname, '../assets/resources/ui-spec/layouts/recruit-hall-main.json'), 'utf8');
        const lobby = fs.readFileSync(path.resolve(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(layout.includes('"btnRescue"'));
        assert.isTrue(lobby.includes("buttonId: 'btnRescue'"));
    });

    return suite;
}
