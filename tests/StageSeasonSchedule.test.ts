// @spec-source → 關卡設計系統 §C-3 裁決 86；PROG-2-9421
/**
 * StageSeasonSchedule.test.ts — 一年六關按季開放（2/2/1/1）。
 *
 * Unity 對照：EditMode 測試季節解鎖表，不開場景。
 */
import * as fs from 'fs';
import * as path from 'path';
import {
    isStageSeasonOpen,
    openStageCount,
    parseStageSeasonSchedule,
    seasonLockedHint,
    stageOpenSeason,
} from '../assets/scripts/core/systems/StageSeasonSchedule';
import { isStageUnlocked } from '../assets/scripts/core/systems/StageChainProgress';
import { TestSuite, assert } from './TestRunner';

const DATA_DIR = path.resolve(__dirname, '../assets/resources/data');

function loadSchedule() {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'stage-season-schedule.json'), 'utf8'));
    const schedule = parseStageSeasonSchedule(raw);
    if (!schedule) throw new Error('stage-season-schedule.json 不合法');
    return schedule;
}

function loadEncounters(): { id: string; chainId?: string; order?: number; extreme?: boolean }[] {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'encounters.json'), 'utf8'));
    return raw.encounters;
}

export function createStageSeasonScheduleSuite(): TestSuite {
    const suite = new TestSuite('StageSeasonSchedule (一年六關按季開放 PROG-2-9421)');

    suite.test('正式資料：配額 2/2/1/1、六關都存在於 encounters.json', () => {
        const schedule = loadSchedule();
        assert.equals('2,2,1,1', schedule.seasonQuota.join(','));
        assert.equals(6, schedule.stageOrder.length);
        const ids = new Set(loadEncounters().map((e) => e.id));
        for (const id of schedule.stageOrder) assert.isTrue(ids.has(id), `${id} 不在 encounters.json`);
    });

    suite.test('四季累計開放數：春 2、夏 4、秋 5、冬 6；季節不合法當春季', () => {
        const schedule = loadSchedule();
        assert.equals(2, openStageCount(schedule, 1));
        assert.equals(4, openStageCount(schedule, 2));
        assert.equals(5, openStageCount(schedule, 3));
        assert.equals(6, openStageCount(schedule, 4));
        assert.equals(2, openStageCount(schedule, 0));
        assert.equals(2, openStageCount(schedule, 9));
    });

    suite.test('每關開放季：長坂兩關春、瓦口隘樊城夏、濡須秋、博望冬；未排程關卡為 null', () => {
        const schedule = loadSchedule();
        assert.equals(1, stageOpenSeason(schedule, 'encounter-001'));
        assert.equals(1, stageOpenSeason(schedule, 'encounter-002'));
        assert.equals(2, stageOpenSeason(schedule, 'theme-canyon-wakou'));
        assert.equals(2, stageOpenSeason(schedule, 'theme-flood-fancheng'));
        assert.equals(3, stageOpenSeason(schedule, 'theme-night-ruxu'));
        assert.equals(4, stageOpenSeason(schedule, 'theme-ambush-bowang'));
        assert.equals(null, stageOpenSeason(schedule, 'extreme-lu-bu'));
    });

    suite.test('開放是累計的：夏季春季關仍可打；極限任務不受季節限制；排程缺失時全開', () => {
        const schedule = loadSchedule();
        assert.isTrue(isStageSeasonOpen(schedule, 'encounter-001', 2));
        assert.isFalse(isStageSeasonOpen(schedule, 'theme-canyon-wakou', 1));
        assert.isTrue(isStageSeasonOpen(schedule, 'theme-canyon-wakou', 2));
        assert.isFalse(isStageSeasonOpen(schedule, 'theme-ambush-bowang', 3));
        assert.isTrue(isStageSeasonOpen(schedule, 'extreme-lu-bu', 1));
        assert.isTrue(isStageSeasonOpen(null, 'theme-ambush-bowang', 1));
    });

    suite.test('配額之外的關卡回傳 5（今年不開），提示文字對應', () => {
        const schedule = { seasonQuota: [1, 0, 0, 0], stageOrder: ['a', 'b'] };
        assert.equals(5, stageOpenSeason(schedule, 'b'));
        assert.isFalse(isStageSeasonOpen(schedule, 'b', 4));
        assert.equals('下一關「樊城」夏季開放', seasonLockedHint('樊城', 2));
        assert.equals('下一關「樊城」今年尚未開放', seasonLockedHint('樊城', 5));
    });

    suite.test('資料不合法時回傳 null', () => {
        assert.equals(null, parseStageSeasonSchedule(null));
        assert.equals(null, parseStageSeasonSchedule({ seasonQuota: [2, 2, 1], stageOrder: ['a'] }));
        assert.equals(null, parseStageSeasonSchedule({ seasonQuota: [2, 2, 1, -1], stageOrder: ['a'] }));
        assert.equals(null, parseStageSeasonSchedule({ seasonQuota: [2, 2, 1, 1], stageOrder: ['a', 3] }));
    });

    suite.test('大廳挑關：春季打完兩關後，下一關（瓦口隘）被季節鎖住，連環破前置已滿足', () => {
        const schedule = loadSchedule();
        const stages = loadEncounters().filter((e) => !e.extreme);
        const cleared = new Set(['encounter-001', 'encounter-002']);
        const pick = (season: number) => stages.find((e) => !cleared.has(e.id)
            && isStageUnlocked(e.id, stages, cleared) && isStageSeasonOpen(schedule, e.id, season))?.id ?? null;
        assert.equals(null, pick(1));
        assert.equals('theme-canyon-wakou', pick(2));
        // 存檔已超前（舊存檔已打到樊城）：夏季可接著打，不會被收回
        cleared.add('theme-canyon-wakou');
        assert.equals('theme-flood-fancheng', pick(2));
        cleared.add('theme-flood-fancheng');
        assert.equals(null, pick(2));
        assert.equals('theme-night-ruxu', pick(3));
    });

    return suite;
}
