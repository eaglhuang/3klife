/**
 * FateBlessing — 紫色因子「天命加護」（FBR-10，PROG-2-0610）測試
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import {
    FATE_BLESSING_GENE_IDS,
    FATE_BLESSING_PER_LEVEL,
    ROCK_SLIDE_BASE_SUCCESS,
    fateBlessingLevel,
    fateSuccessChance,
    fateDamageMultiplier,
    rollEventSuccess,
} from '../assets/scripts/core/systems/FateBlessing';

export function createFateBlessingSuite(): TestSuite {
    const suite = new TestSuite('FateBlessing (紫色天命加護 FBR-10)');

    suite.test('天命等級只看紫色天命基因，取持有且未鎖定的最高等級', () => {
        assert.equals(3, fateBlessingLevel([{ id: 'gene_destiny', level: 3 }]));
        assert.equals(2, fateBlessingLevel([{ id: 'gene_luck', level: 2 }, { id: 'gene_strategy', level: 5 }]));
        assert.equals(4, fateBlessingLevel([{ id: 'gene_destiny', level: 1 }, { id: 'gene_luck', level: 4 }]));
    });

    suite.test('未解鎖、等級 0 或沒有紫色基因都不算天命', () => {
        assert.equals(0, fateBlessingLevel([{ id: 'gene_destiny', level: 5, isLocked: true }]));
        assert.equals(0, fateBlessingLevel([{ id: 'gene_luck', level: 0 }]));
        assert.equals(0, fateBlessingLevel([{ id: 'gene_naval', level: 3 }]));
        assert.equals(0, fateBlessingLevel([]));
    });

    suite.test('事件成功率 = 基礎 + 每級 5%，上限 100%', () => {
        assert.equals(0.05, FATE_BLESSING_PER_LEVEL);
        assert.equals(0.6, fateSuccessChance(0.5, 2));
        assert.equals(1, fateSuccessChance(0.9, 5));
        assert.equals(0.85, fateSuccessChance(ROCK_SLIDE_BASE_SUCCESS, 0), '落石基礎 85%');
        assert.equals(0.9, fateSuccessChance(ROCK_SLIDE_BASE_SUCCESS, 1), '1 級天命 +5%');
        assert.equals(1, fateSuccessChance(ROCK_SLIDE_BASE_SUCCESS, 4), '上限 100%');
    });

    suite.test('傷害倍率 = 1 + 每級 5%；等級 0 時為 1', () => {
        assert.equals(1, fateDamageMultiplier(0));
        assert.equals(1.2, fateDamageMultiplier(4));
    });

    suite.test('事件判定：roll 小於成功率才成功', () => {
        assert.isTrue(rollEventSuccess(1, 0.999));
        assert.isFalse(rollEventSuccess(0, 0));
        assert.isTrue(rollEventSuccess(0.5, 0.49));
        assert.isFalse(rollEventSuccess(0.5, 0.5));
    });

    return suite;
}

export function createFateBlessingWiringSuite(): TestSuite {
    const suite = new TestSuite('FateBlessingWiring (天命加護接線 FBR-10)');
    const root = path.resolve(__dirname, '..');
    const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
    const readJson = (rel: string) => JSON.parse(read(rel));

    suite.test('天命基因 id 都是字典中的紫色基因', () => {
        const dict = readJson('assets/resources/data/master/gene-dictionary.json').data as { id: string; color: string }[];
        for (const id of FATE_BLESSING_GENE_IDS) {
            assert.equals('purple', dict.find((g) => g.id === id)?.color ?? '', `${id} 不是紫色基因`);
        }
    });

    suite.test('火計傷害乘上施放者的天命倍率（只限 fire 標籤）', () => {
        const source = read('assets/scripts/battle/skills/BattleSkillDamageResolver.ts');
        assert.isTrue(source.includes('isFireTactic(profile.tags ?? [])'), '沒有限定 fire 標籤');
        assert.isTrue(source.includes('fateDamageMultiplier(fateBlessingLevel(caster.genes))'), '火計傷害沒有接天命倍率');
    });

    suite.test('落石開場設置前做成功判定，基礎成功率接天命加成', () => {
        const source = read('assets/scripts/battle/shared/BattleTacticBehavior.ts');
        assert.isTrue(source.includes('rollEventSuccess(fateSuccessChance(ROCK_SLIDE_BASE_SUCCESS, fateLevel), Math.random())'), '落石沒有接成功判定');
    });

    return suite;
}
