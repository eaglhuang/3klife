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
    confirmDestinyGacha, createDestinyGachaState, resetDestinyGacha, selectDestinyGacha,
} from '../assets/scripts/core/systems/DestinyGacha';
import {
    DESTINY_POOL_IDS, destinyFillerIds, destinyOptionsFromConfig, isDestinyStar, rollDestinyPool, startNewGameFromDestiny,
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

function seeded(seed: number): () => number {
    let x = seed;
    return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
}

export function createDestinyPoolSuite(): TestSuite {
    const suite = new TestSuite('DestinyPool (宿命轉蛋新手武將池與接新局)');

    suite.test('一般武將只有低稀有度男性，不含六位名將', () => {
        const generals = realGenerals();
        const fillers = destinyFillerIds(generals);
        assert.isTrue(fillers.length >= 9, '要補得滿九格');
        for (const id of fillers) {
            const g = generals.find((x) => x.id === id)!;
            assert.isTrue(g.rarityTier === 'common' || g.rarityTier === 'rare', `${id} 稀有度過高`);
            assert.isTrue(g.gender !== '女', `${id} 屬於紅顏池`);
            assert.isFalse(isDestinyStar(id));
        }
    });

    suite.test('一輪十連不重複，名將至少一位、其餘是一般武將', () => {
        const generals = realGenerals();
        const fillers = new Set(destinyFillerIds(generals));
        const options = destinyOptionsFromConfig(heroPoolConfig());
        assert.equals(10, options.pickCount);
        const random = seeded(7);
        const counts = new Set<number>();
        for (let i = 0; i < 300; i++) {
            const { ok, state } = rollDestinyPool(createDestinyGachaState(), options, generals, random);
            assert.isTrue(ok);
            assert.equals(10, new Set(state.rolled).size);
            const stars = state.rolled.filter(isDestinyStar);
            assert.isTrue(stars.length >= 1);
            counts.add(stars.length);
            for (const id of state.rolled) assert.isTrue(isDestinyStar(id) || fillers.has(id), id);
        }
        assert.isTrue(counts.size > 1, '名將人數要有差別，重抽才有意義');
    });

    suite.test('運氣再好也只有六位名將，其餘四格仍是一般武將', () => {
        const generals = realGenerals();
        const { state } = rollDestinyPool(createDestinyGachaState(), destinyOptionsFromConfig(heroPoolConfig()), generals, () => 0);
        assert.equals(DESTINY_POOL_IDS.length, state.rolled.filter(isDestinyStar).length);
        assert.equals(10, state.rolled.length);
    });

    suite.test('一般武將不夠補滿就拒絕', () => {
        const result = rollDestinyPool(createDestinyGachaState(), destinyOptionsFromConfig(heroPoolConfig()), [], () => 0.5);
        assert.isFalse(result.ok);
        assert.equals('pool-too-small', result.reason!);
    });

    suite.test('確認後整包入名冊，選中的名將是核心主將；重置後是新的一輪', async () => {
        const generals = realGenerals();
        const options = destinyOptionsFromConfig(heroPoolConfig());
        const random = seeded(11);
        let state = rollDestinyPool(createDestinyGachaState(), options, generals, random).state;
        state = resetDestinyGacha(state, options).state;
        assert.equals(0, state.rolled.length);
        state = rollDestinyPool(state, options, generals, random).state;
        const core = state.rolled.find(isDestinyStar)!;
        state = selectDestinyGacha(state, core, { ...options, confirmRequired: true }).state;
        state = confirmDestinyGacha(state).state;
        const session = newSession();
        assert.equals(core, await startNewGameFromDestiny(session, 20261109, generals, state));
        assert.equals(core, session.leadGeneralId);
        assert.equals([...state.rolled].sort().join(','), session.roster.map((g) => g.id).sort().join(','));
    });

    suite.test('每位一般武將的資料都開得了局', async () => {
        const generals = realGenerals();
        const fillers = destinyFillerIds(generals);
        const session = newSession();
        await session.startNewGameWithStarters(1, generals, { coreGeneralId: 'zhang-fei', rosterIds: ['zhang-fei', ...fillers] });
        assert.equals(fillers.length + 1, session.roster.length);
    });

    suite.test('尚未鎖定不能開新局，名冊不被動到', async () => {
        const generals = realGenerals();
        const options = destinyOptionsFromConfig(heroPoolConfig());
        const rolled = rollDestinyPool(createDestinyGachaState(), options, generals, () => 0.2).state;
        const selected = selectDestinyGacha(rolled, rolled.rolled[0], { ...options, confirmRequired: true }).state;
        for (const state of [createDestinyGachaState(), rolled, selected]) {
            const session = newSession();
            let failed = false;
            try { await startNewGameFromDestiny(session, 1, generals, state); } catch { failed = true; }
            assert.isTrue(failed);
            assert.equals(0, session.roster.length);
        }
    });

    suite.test('一般武將不能當核心', async () => {
        const session = newSession();
        let failed = false;
        try {
            await startNewGameFromDestiny(session, 1, realGenerals(), { phase: 'locked', rolled: ['cao-cao'], selected: 'cao-cao', locked: 'cao-cao', resets: 0 });
        } catch { failed = true; }
        assert.isTrue(failed);
        assert.equals(0, session.roster.length);
    });

    return suite;
}
