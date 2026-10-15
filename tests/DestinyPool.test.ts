/**
 * DestinyPool.test.ts — 宿命轉蛋六人池與接新局（QA，PROG-2-0644）
 *
 * Unity 對照：像開局選角流程的 PlayMode 測試，從洗牌、選定、確認一路點到新局主將。
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { GachaConfig } from '../assets/scripts/core/models/GachaConfig';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { STARTER_GENERAL_IDS } from '../assets/scripts/core/services/StarterRosterService';
import {
    confirmDestinyGacha, createDestinyGachaState, optionsFromGachaConfig, resetDestinyGacha, selectDestinyGacha,
} from '../assets/scripts/core/systems/DestinyGacha';
import {
    DESTINY_POOL_IDS, destinyOptionsFromConfig, rollDestinyPool, startNewGameFromDestiny,
} from '../assets/scripts/core/systems/DestinyPool';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function realGenerals(): GeneralConfig[] {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
}

function heroPoolConfig(): GachaConfig {
    const configs = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/gacha-config.json'), 'utf8')) as GachaConfig[];
    return configs.find((c) => c.poolId === 'hero-pool')!;
}

function newSession(): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createDestinyPoolSuite(): TestSuite {
    const suite = new TestSuite('DestinyPool (宿命轉蛋六人池與接新局)');

    suite.test('宿命池就是六位初始名將；抽數封頂在池子大小（設定十連也只抽 6）', () => {
        assert.equals(STARTER_GENERAL_IDS.join(','), DESTINY_POOL_IDS.join(','));
        const config = heroPoolConfig();
        assert.equals(10, config.pickCount);
        const options = destinyOptionsFromConfig(config);
        assert.equals(6, options.pickCount);
        assert.equals(config.firstPickOnly, options.firstPickOnly);
        assert.equals(config.resetEnabled, options.resetEnabled);
    });

    suite.test('直接套 hero-pool 設定會被拒（20 人池、十連不重複需 ≥10 人），封頂後的六人池抽得出來且不重複', () => {
        const raw = optionsFromGachaConfig(heroPoolConfig());
        const rejected = rollDestinyPool(createDestinyGachaState(), raw, () => 0.3);
        assert.isFalse(rejected.ok);
        assert.equals('pool-too-small', rejected.reason!);
        const options = destinyOptionsFromConfig(heroPoolConfig());
        const result = rollDestinyPool(createDestinyGachaState(), options, () => 0.3);
        assert.isTrue(result.ok, '六人池封頂後應能抽');
        assert.equals(6, result.state.rolled.length);
        assert.equals(6, new Set(result.state.rolled).size);
        assert.equals([...DESTINY_POOL_IDS].sort().join(','), [...result.state.rolled].sort().join(','));
    });

    suite.test('洗牌→選定→確認鎖定→開新局：鎖誰誰就是核心主將（六位逐一驗）', async () => {
        const options = destinyOptionsFromConfig(heroPoolConfig());
        for (const id of DESTINY_POOL_IDS) {
            let state = rollDestinyPool(createDestinyGachaState(), options, () => 0.5).state;
            state = resetDestinyGacha(state, options).state;
            state = rollDestinyPool(state, options, () => 0.1).state;
            state = selectDestinyGacha(state, id, options).state;
            state = confirmDestinyGacha(state).state;
            const session = newSession();
            const core = await startNewGameFromDestiny(session, 20261015, realGenerals(), state);
            assert.equals(id, core);
            assert.equals(id, session.leadGeneralId);
            assert.equals(6, session.roster.length);
        }
    });

    suite.test('尚未鎖定（只選定未確認／只抽未選）不能開新局，名冊不被動到', async () => {
        const options = destinyOptionsFromConfig(heroPoolConfig());
        const rolled = rollDestinyPool(createDestinyGachaState(), options, () => 0.2).state;
        const selected = selectDestinyGacha(rolled, rolled.rolled[0], options).state;
        for (const state of [createDestinyGachaState(), rolled, selected]) {
            const session = newSession();
            let failed = false;
            try { await startNewGameFromDestiny(session, 1, realGenerals(), state); } catch { failed = true; }
            assert.isTrue(failed);
            assert.equals(0, session.roster.length);
        }
    });

    suite.test('鎖定的不在宿命池（例如舊的 20 人池抽到曹操）→ 拒絕', async () => {
        const session = newSession();
        let failed = false;
        try {
            await startNewGameFromDestiny(session, 1, realGenerals(), { phase: 'locked', rolled: [], selected: 'cao-cao', locked: 'cao-cao', resets: 0 });
        } catch { failed = true; }
        assert.isTrue(failed);
        assert.equals(0, session.roster.length);
    });

    return suite;
}
