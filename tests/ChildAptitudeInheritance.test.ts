/**
 * ChildAptitudeInheritance.test.ts — PROG-2-9161 子嗣兵種/地形/天氣適性繼承與天生分流推薦測試
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { Faction } from '../assets/scripts/core/config/Constants';
import {
    configureChildAptitudeRules,
    defaultChildAptitudeRules,
    inheritChildAptitudes,
    promoteAptitudeByPinkFactor,
    recommendChildCareerRole,
    resetChildAptitudeRules,
} from '../assets/scripts/core/systems/ChildAptitudeInheritance';
import { createChild, type BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { buildFactorDictionary, type FactorDefinition, type FactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import { recommendFate } from '../assets/scripts/core/systems/Unveiling';
import { resolvePrimaryClass } from '../assets/scripts/core/systems/JobChangeWiring';
import { buildDs3AptitudeGrades } from '../assets/scripts/ui/components/character-ds3/CharacterDs3AptitudeChild';
import { createEmptyPedigree } from '../assets/scripts/core/services/BloodlineGraph';

function makeTestDictionary(): FactorDictionary {
    const defs: FactorDefinition[] = [
        {
            id: 'FAC_STR_1',
            displayName: '武勇',
            color: 'blue',
            category: 'attribute-str',
            maxLevel: 3,
            defaultTags: ['武力'],
        },
        {
            id: 'FAC_SOC_1',
            displayName: '名望',
            color: 'green',
            category: 'social',
            maxLevel: 3,
            defaultTags: ['名望'],
        },
    ];
    return buildFactorDictionary(defs);
}

function makeParent(overrides: Partial<BreedingGeneral> & { id: string; name: string }): BreedingGeneral {
    return {
        faction: Faction.Player,
        gender: '男',
        age: 26,
        status: 'Unveiled',
        hp: 1000,
        currentHp: 1000,
        str: 70,
        int: 70,
        lea: 70,
        pol: 70,
        cha: 70,
        luk: 50,
        ep: 100,
        vitality: 100,
        maxVitality: 100,
        role: 'Combat',
        ...overrides,
    };
}

export function createChildAptitudeInheritanceSuite(): TestSuite {
    const suite = new TestSuite('ChildAptitudeInheritance (PROG-2-9161)');

    suite.test('JSON 資料表與 defaultChildAptitudeRules 預設值完全一致', () => {
        const jsonPath = path.resolve(__dirname, '../assets/resources/data/child-aptitude-rules.json');
        const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const defaults = defaultChildAptitudeRules();
        assert.equals(JSON.stringify(parsed.aptitudeInheritance), JSON.stringify(defaults.aptitudeInheritance));
        assert.equals(JSON.stringify(parsed.careerRecommendation), JSON.stringify(defaults.careerRecommendation));
    });

    suite.test('適性繼承：較優親代降一階，出生上限 A、下限 C（雙親明確 D 才為 D）', () => {
        const inherited = inheritChildAptitudes(
            {
                troopAptitude: { CAVALRY: 'S', INFANTRY: 'A', ARCHER: 'C', SIEGE: 'D' },
                terrainAptitude: { PLAIN: 'S', FOREST: 'D' },
                weatherAptitude: { SUNNY: 'A' },
            },
            {
                troopAptitude: { CAVALRY: 'C', INFANTRY: 'B', ARCHER: 'D', SIEGE: 'D' },
                terrainAptitude: { PLAIN: 'B', FOREST: 'B' },
                weatherAptitude: { SUNNY: 'B', RAIN: 'D' },
            },
        );

        assert.equals('A', inherited.troopAptitude.CAVALRY, 'S+C -> A (cap A)');
        assert.equals('B', inherited.troopAptitude.INFANTRY, 'A+B -> B');
        assert.equals('C', inherited.troopAptitude.ARCHER, 'C+D -> floor C');
        assert.equals('D', inherited.troopAptitude.SIEGE, 'D+D -> D');
        assert.equals('A', inherited.terrainAptitude.PLAIN, 'S+B -> A');
        assert.equals('C', inherited.terrainAptitude.FOREST, 'D+B -> B-1=C');
        assert.equals('B', inherited.weatherAptitude.SUNNY, 'A+B -> B');
        assert.equals('C', inherited.weatherAptitude.RAIN, '缺省(B)+D -> B-1=C');
    });

    suite.test('紅(粉)因子升階：promoteAptitudeByPinkFactor 每次 +1 階，最高 S', () => {
        assert.equals('C', promoteAptitudeByPinkFactor('D', 1));
        assert.equals('S', promoteAptitudeByPinkFactor('A', 1));
        assert.equals('S', promoteAptitudeByPinkFactor('S', 2));
        assert.equals('A', promoteAptitudeByPinkFactor('C', 2));
    });

    suite.test('三組報備算例：新手 / 中期(防1★因子逆轉) / 極端(統帥主導)', () => {
        const dict = makeTestDictionary();

        // 算例 1：新手（平均型偏文政）
        const novice = recommendChildCareerRole({ str: 56, int: 64, lea: 58, pol: 60, cha: 66 }, [], dict);
        assert.equals(113.4, novice.warriorScore);
        assert.equals(125.4, novice.scholarScore);
        assert.equals(119.4, novice.commanderScore);
        assert.equals('Mentor', novice.canonicalRole);
        assert.equals('Support', novice.recommendedTrack);
        assert.equals('Scholar', novice.fateClass);

        // 算例 2：中期（高武帶 1★ 文官因子不應被逆轉）
        const mid = recommendChildCareerRole(
            { str: 86, int: 45, lea: 70, pol: 40, cha: 60 },
            [{ id: 'FAC_SOC_1', level: 1, isLocked: false }],
            dict,
        );
        assert.equals(160.8, mid.warriorScore);
        assert.equals(93.5, mid.scholarScore);
        assert.equals(139.8, mid.commanderScore);
        assert.equals('Combat', mid.canonicalRole);
        assert.equals('Combat', mid.recommendedTrack);
        assert.equals('Warrior', mid.fateClass);

        // 算例 3：極端（高統帥 + 高魅力）
        const extreme = recommendChildCareerRole({ str: 75, int: 70, lea: 95, pol: 65, cha: 92 }, [], dict);
        assert.equals(164, extreme.warriorScore);
        assert.equals(142.6, extreme.scholarScore);
        assert.equals(182.5, extreme.commanderScore);
        assert.equals('Combat', extreme.canonicalRole);
        assert.equals('Commander', extreme.recommendedTrack);
        assert.equals('Warrior', extreme.fateClass);
    });

    suite.test('createChild 整合：子嗣自帶繼承適性，role 依 GEN-06 固定非 Mentor，並可搭配 recommendChildCareerRole 分流', () => {
        const dict = makeTestDictionary();
        const father = makeParent({
            id: 'f1',
            name: '儒將父',
            role: 'Combat',
            str: 40,
            int: 92,
            lea: 50,
            pol: 90,
            cha: 88,
            troopAptitude: { CAVALRY: 'S', INFANTRY: 'B', ARCHER: 'A', SIEGE: 'C' },
        });
        const mother = makeParent({
            id: 'm1',
            name: '名門母',
            gender: '女',
            role: 'Mentor',
            str: 35,
            int: 88,
            lea: 48,
            pol: 86,
            cha: 85,
            troopAptitude: { CAVALRY: 'B', INFANTRY: 'C', ARCHER: 'C', SIEGE: 'C' },
        });
        const pedigree = createEmptyPedigree();
        pedigree.F = father.id;
        pedigree.M = mother.id;

        const child = createChild({
            id: 'child_1',
            father,
            mother,
            pedigree,
            factors: [],
            ep: { ep: 100, rating: 'B' } as never,
            birthSeason: 1,
            dictionary: dict,
            random: () => 0.4,
        });

        assert.equals('Combat', child.role, '新生子嗣依 GEN-06 不可為 Mentor');
        assert.equals('Support', recommendChildCareerRole(child.stats, child.genes, dict).recommendedTrack);
        assert.equals('A', child.troopAptitude?.CAVALRY);
        assert.equals('B', child.troopAptitude?.ARCHER);
        assert.equals('C', child.troopAptitude?.INFANTRY);
        assert.equals('C', child.troopAptitude?.SIEGE);
    });

    suite.test('recommendFate 與 JobChangeWiring 接線：彭羕之女（高智政帶 1★ 武勇因子）仍判文官 Scholar', () => {
        const dict = makeTestDictionary();
        const pengYangDaughter = makeParent({
            id: 'c_peng_daughter',
            name: '彭羕之女',
            gender: '女',
            str: 42,
            lea: 48,
            int: 86,
            pol: 84,
            cha: 78,
            genes: [{ id: 'FAC_STR_1', level: 1, isLocked: false }],
        });
        const fate = recommendFate(pengYangDaughter, dict);
        assert.equals('Scholar', fate.recommended, 'Unveiling.recommendFate 應推薦文官 Scholar');
        assert.isTrue(fate.civilScore > fate.martialScore);
        assert.equals('Scholar', resolvePrimaryClass(pengYangDaughter), 'JobChangeWiring 後備比較應一致判為 Scholar');
    });

    suite.test('兵 ARMY 頁接線：createChild 寫入之適性可直接由 buildDs3AptitudeGrades 讀出非「—」階級', () => {
        const dict = makeTestDictionary();
        const father = makeParent({
            id: 'f_army',
            name: '名將父',
            troopAptitude: { CAVALRY: 'S', INFANTRY: 'A', ARCHER: 'B', SIEGE: 'C' },
            terrainAptitude: { PLAIN: 'A', MOUNTAIN: 'B', WATER: 'C', FOREST: 'B' },
            weatherAptitude: { SUNNY: 'S', RAIN: 'B', FOG: 'C', NIGHT: 'C' },
        });
        const mother = makeParent({
            id: 'm_army',
            name: '名門母',
            gender: '女',
            troopAptitude: { CAVALRY: 'B', INFANTRY: 'B', ARCHER: 'C', SIEGE: 'C' },
        });
        const pedigree = createEmptyPedigree();
        pedigree.F = father.id;
        pedigree.M = mother.id;

        const child = createChild({
            id: 'child_army',
            father,
            mother,
            pedigree,
            factors: [],
            ep: { ep: 100, rating: 'B' } as never,
            birthSeason: 1,
            dictionary: dict,
            random: () => 0.4,
        });

        const uiGrades = buildDs3AptitudeGrades(child);
        assert.equals('A', uiGrades.Aptitude_CAVALRY_grade);
        assert.equals('B', uiGrades.Aptitude_INFANTRY_grade);
        assert.equals('C', uiGrades.Aptitude_ARCHER_grade);
        assert.equals('C', uiGrades.Aptitude_SIEGE_grade);
    });

    suite.test('configureChildAptitudeRules / resetChildAptitudeRules 可安全覆寫與還原', () => {
        configureChildAptitudeRules({
            aptitudeInheritance: {
                ...defaultChildAptitudeRules().aptitudeInheritance,
                birthMaxGrade: 'S',
            },
        });
        const boosted = inheritChildAptitudes(
            { troopAptitude: { CAVALRY: 'S' } },
            { troopAptitude: { CAVALRY: 'S' } },
        );
        // S(rank 4) + (-1) = A(rank 3), 上限 S 不影響單親 S 降一階結果
        assert.equals('A', boosted.troopAptitude.CAVALRY);
        resetChildAptitudeRules();
    });

    return suite;
}
