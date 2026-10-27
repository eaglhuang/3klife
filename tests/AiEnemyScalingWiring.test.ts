/**
 * AiEnemyScalingWiring.test.ts — 敵將屬性縮放接上開戰建立流程（AIS-02 接線 / PROG-2-1319）
 *
 * 鎖住：年齡階段邊界；敵將 config 只縮放 str、int、lea、luk；缺 age 視為青年；
 * 不改傳入的原物件；章節序位依關卡鏈在資料中的出現順序；縮放後建立的 GeneralUnit 數值與公式一致。
 *
 * Unity 對照：像在 Spawn 前先用 Difficulty 與 Chapter 的係數改寫 Prefab 的 Stat 設定，再 Instantiate，不改已存在的 Component。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { Faction } from '../assets/scripts/core/config/Constants';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { parseAiDifficultyTable } from '../assets/scripts/core/systems/AiDifficultyTable';
import { aiAgeStageOf, scaleAiEnemyConfig } from '../assets/scripts/core/systems/AiStatScaling';
import {
    buildStageChainNodes,
    stageChapterOf,
    type EncounterChainSource,
} from '../assets/scripts/core/systems/StageChainNodes';

const DATA_DIR = path.join(__dirname, '..', 'assets', 'resources', 'data');

function readDataFile(name: string): any {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

export function createAiEnemyScalingWiringSuite(): TestSuite {
    const suite = new TestSuite('AiEnemyScalingWiring (敵將屬性縮放接線 AIS-02 / PROG-2-1319)');

    suite.test('年齡階段邊界：14 少年、15 青年、40 壯年、55 老年、65 超齡', () => {
        assert.equals('Youth', aiAgeStageOf(14));
        assert.equals('Prime', aiAgeStageOf(15));
        assert.equals('Prime', aiAgeStageOf(39));
        assert.equals('Peak', aiAgeStageOf(40));
        assert.equals('Elder', aiAgeStageOf(55));
        assert.equals('Over', aiAgeStageOf(65));
    });

    suite.test('敵將 config 只縮放 str、int、lea、luk；hp 與 age 不變；不改原物件', () => {
        const original = { id: 'lu-bu', hp: 1692, str: 100, int: 36, lea: 88, luk: 70, age: 30 };
        const hard = { statScale: 1.3 };
        const scaled = scaleAiEnemyConfig(original, hard, 2);
        assert.equals(143, scaled.str!);
        assert.equals(51, scaled.int!);
        assert.equals(125, scaled.lea!);
        assert.equals(100, scaled.luk!);
        assert.equals(1692, scaled.hp);
        assert.equals(30, scaled.age!);
        assert.equals(100, original.str);
    });

    suite.test('缺 age 視為青年；沒有的數值欄位不補上', () => {
        const scaled = scaleAiEnemyConfig({ hp: 1000, str: 100 } as { hp: number; str?: number }, { statScale: 1.0 }, 1);
        assert.equals(100, scaled.str!);
        assert.isFalse('int' in scaled);
        assert.isFalse('lea' in scaled);
    });

    suite.test('章節序位：依關卡鏈在資料中的出現順序，從 1 起；找不到回傳 1', () => {
        const sources = [
            { id: 's1', chainId: 'chain-a', order: 1 },
            { id: 's2', chainId: 'chain-b', order: 1 },
            { id: 's3', chainId: 'chain-a', order: 2 },
        ] as unknown as EncounterChainSource[];
        const nodes = buildStageChainNodes(sources);
        assert.equals(1, stageChapterOf(nodes, 's1'));
        assert.equals(2, stageChapterOf(nodes, 's2'));
        assert.equals(1, stageChapterOf(nodes, 's3'));
        assert.equals(1, stageChapterOf(nodes, 'missing'));
    });

    suite.test('實際關卡資料與難度表可解析，縮放後建立的 GeneralUnit 數值與公式一致', () => {
        const encounters = readDataFile('encounters.json').encounters as EncounterChainSource[];
        const nodes = buildStageChainNodes(encounters);
        const chapter = stageChapterOf(nodes, encounters[0].id);
        assert.isTrue(chapter >= 1);

        const { table, errors } = parseAiDifficultyTable(readDataFile('ai-difficulty.json'));
        assert.isTrue(table !== null && errors.length === 0);

        const generals = readDataFile('generals.json') as Array<Record<string, any>>;
        const luBu = generals.find((g) => g.id === 'lu-bu')!;
        const scaled = scaleAiEnemyConfig(luBu as { str: number; int: number; lea: number; luk: number; age: number }, table!.hard, 2);
        const unit = new GeneralUnit({ ...scaled, faction: Faction.Enemy, maxSp: 100 } as never);
        assert.equals(scaled.str!, unit.str);
        assert.equals(scaled.int!, unit.int);
        assert.equals(scaled.lea!, unit.lea);
    });

    return suite;
}
