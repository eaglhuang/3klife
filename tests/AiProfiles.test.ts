/**
 * AiProfiles.test.ts — AI Profile 模板與路線策略載入驗證 headless 測試（AIS-03 / PROG-2-1316）
 *
 * 鎖住：實際的 ai-profiles.json 含八個 Profile，路線策略與規格 E-4 表一致；
 * 部署傾向旗標正確；缺列、重複、未知兵種或路線、空戰法標籤都會回報錯誤且不產生表。
 *
 * Unity 對照：AI Behavior 表的 OnValidate，缺列或填錯代號就不讓戰鬥載入。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { aiProfileOf, parseAiProfileTable } from '../assets/scripts/core/systems/AiProfiles';

function loadRealProfiles(): { profiles: Array<Record<string, unknown>> } {
    const file = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-profiles.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function cloneRaw(): { profiles: Array<Record<string, any>> } {
    return JSON.parse(JSON.stringify(loadRealProfiles()));
}

export function createAiProfilesSuite(): TestSuite {
    const suite = new TestSuite('AiProfiles (AI Profile 模板與路線策略 AIS-03 / PROG-2-1316)');

    suite.test('實際資料檔八列齊全，路線策略與規格 E-4 表一致（BALANCED、ARCHER_FOCUS 為 null）', () => {
        const { table, errors } = parseAiProfileTable(loadRealProfiles());
        assert.isTrue(table !== null && errors.length === 0);
        assert.equals('FOCUS_2_3', table!.AGGRESSIVE.laneStrategy!);
        assert.equals('SPREAD_5', table!.DEFENSIVE.laneStrategy!);
        assert.equals('SCOUT_WEAK', table!.STRATEGIC.laneStrategy!);
        assert.equals('CAVALRY_CHARGE_1', table!.CAVALRY_RUSH.laneStrategy!);
        assert.equals('ALL_5', table!.SWARM.laneStrategy!);
        assert.equals('EMPTIEST_1_2', table!.ELITE_FEW.laneStrategy!);
        assert.isTrue(table!.ARCHER_FOCUS.laneStrategy === null);
        assert.isTrue(table!.BALANCED.laneStrategy === null);
    });

    suite.test('部署傾向旗標：剋制、低品質、特殊兵種各落在對應的 Profile', () => {
        const { table } = parseAiProfileTable(loadRealProfiles());
        assert.isTrue(table!.STRATEGIC.deployTendency.preferCounter);
        assert.isTrue(table!.SWARM.deployTendency.preferLowQuality);
        assert.isTrue(table!.ELITE_FEW.deployTendency.preferSpecialTroops);
        assert.equals('CAVALRY', table!.CAVALRY_RUSH.deployTendency.preferredTroops[0]);
        assert.isFalse(table!.AGGRESSIVE.deployTendency.preferCounter);
    });

    suite.test('缺列、重複 profileId 會回報錯誤且不產生表', () => {
        const missing = cloneRaw();
        missing.profiles.pop();
        const missingResult = parseAiProfileTable(missing);
        assert.isTrue(missingResult.table === null);
        assert.isTrue(missingResult.errors.some((e) => e.includes('缺少 profileId "BALANCED"')));

        const duplicate = cloneRaw();
        duplicate.profiles[1].profileId = 'AGGRESSIVE';
        const duplicateResult = parseAiProfileTable(duplicate);
        assert.isTrue(duplicateResult.table === null);
        assert.isTrue(duplicateResult.errors.some((e) => e.includes('重複')));
    });

    suite.test('未知兵種、未知路線策略、空戰法標籤會被擋下', () => {
        const badTroop = cloneRaw();
        badTroop.profiles[0].deployTendency.preferredTroops = ['DRAGON'];
        assert.isTrue(parseAiProfileTable(badTroop).table === null);

        const badLane = cloneRaw();
        badLane.profiles[0].laneStrategy = 'NORTH_ONLY';
        assert.isTrue(parseAiProfileTable(badLane).table === null);

        const emptyTactic = cloneRaw();
        emptyTactic.profiles[0].tacticTendency = [];
        const emptyResult = parseAiProfileTable(emptyTactic);
        assert.isTrue(emptyResult.table === null);
        assert.isTrue(emptyResult.errors.some((e) => e.includes('tacticTendency 不可為空')));
    });

    suite.test('aiProfileOf 依代號取模板；未知代號回傳 null', () => {
        const { table } = parseAiProfileTable(loadRealProfiles());
        assert.equals('AGGRESSIVE', aiProfileOf(table!, 'AGGRESSIVE')!.profileId);
        assert.isTrue(aiProfileOf(table!, 'NOT_A_PROFILE') === null);
    });

    return suite;
}
