/**
 * FactorTacticLinkage — 因子與戰法、地形連動規則（FBR-05，PROG-2-0584）測試
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { TerrainType, Weather } from '../assets/scripts/shared/CommonEnums';
import {
    factorBattleEffectsOf,
    greenTacticSeedGeneIds,
    type FactorBattleEffectMap,
    GREEN_FACTOR_TP_MULTIPLIER,
    learnTpCost,
    canNavalCombinedAttack,
    hitRateInWeather,
    forestMoveBonus,
    isFogHitGuaranteed,
    forestMoveBonusFor,
    hasBattleEffect,
    isOrthogonallyAdjacent,
    NAVAL_COMBINED_DAMAGE_RATIO,
} from '../assets/scripts/core/systems/FactorTacticLinkage';

export function createFactorTacticLinkageSuite(): TestSuite {
    const suite = new TestSuite('FactorTacticLinkage (因子戰法地形連動 FBR-05)');

    suite.test('綠色因子相符時學習戰法 TP 減半，否則維持原值', () => {
        assert.equals(GREEN_FACTOR_TP_MULTIPLIER, 0.5);
        assert.equals(40, learnTpCost(80, true));
        assert.equals(4, learnTpCost(7, true), '奇數減半後無條件進位');
        assert.equals(80, learnTpCost(80, false));
    });

    suite.test('水戰適性只在水域（河流）格可合攻，沒有適性或地形不符都不可', () => {
        assert.isTrue(canNavalCombinedAttack(TerrainType.River, true));
        assert.isFalse(canNavalCombinedAttack(TerrainType.River, false));
        assert.isFalse(canNavalCombinedAttack(TerrainType.Plain, true));
    });

    suite.test('大霧免疫：大霧天氣命中 100%，其他天氣或沒有免疫維持原命中率', () => {
        assert.equals(1, hitRateInWeather(0.7, Weather.Fog, true));
        assert.equals(0.7, hitRateInWeather(0.7, Weather.Fog, false));
        assert.equals(0.7, hitRateInWeather(0.7, Weather.Clear, true));
    });

    suite.test('林地適性在林地格移動力 +1，其他情況為 0', () => {
        assert.equals(1, forestMoveBonus(TerrainType.Forest, true));
        assert.equals(0, forestMoveBonus(TerrainType.Forest, false));
        assert.equals(0, forestMoveBonus(TerrainType.Plain, true));
    });

    suite.test('戰場效果接線：大霧必中只在大霧且有 fog-immunity 時成立', () => {
        assert.isTrue(isFogHitGuaranteed(Weather.Fog, ['fog-immunity']));
        assert.isFalse(isFogHitGuaranteed(Weather.Fog, []));
        assert.isFalse(isFogHitGuaranteed(Weather.Clear, ['fog-immunity']));
    });

    suite.test('戰場效果接線：林地加成只看 forest-move-bonus 且格子為林地', () => {
        assert.equals(1, forestMoveBonusFor(TerrainType.Forest, ['forest-move-bonus']));
        assert.equals(0, forestMoveBonusFor(TerrainType.Forest, ['fog-immunity']));
        assert.equals(0, forestMoveBonusFor(TerrainType.Plain, ['forest-move-bonus']));
    });

    suite.test('戰場效果接線：hasBattleEffect 只回報清單內的效果', () => {
        assert.isTrue(hasBattleEffect(['naval-combined-attack'], 'naval-combined-attack'));
        assert.isFalse(hasBattleEffect(['naval-combined-attack'], 'fog-immunity'));
    });

    suite.test('水域合攻：追加傷害倍率 50%，相鄰只算四方向（斜角不算）', () => {
        assert.equals(0.5, NAVAL_COMBINED_DAMAGE_RATIO);
        assert.isTrue(isOrthogonallyAdjacent(1, 3, 1, 4));
        assert.isTrue(isOrthogonallyAdjacent(1, 3, 2, 3));
        assert.isFalse(isOrthogonallyAdjacent(1, 3, 2, 4));
        assert.isFalse(isOrthogonallyAdjacent(1, 3, 1, 3));
    });

    return suite;
}

// ── 戰場效果接線守衛（PROG-2-0584）──
export function createFactorBattleWiringSuite(): TestSuite {
    const suite = new TestSuite('FactorBattleWiring (因子戰場效果接線 PROG-2-0584)');
    const root = path.resolve(__dirname, '..');
    const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

    suite.test('部隊模型有 factorEffects 欄位，預設為空陣列', () => {
        assert.isTrue(read('assets/scripts/core/models/TroopUnit.ts').includes('public factorEffects: readonly string[] = [];'));
    });

    suite.test('戰場控制器載入對應表，部隊出陣時算出 factorEffects', () => {
        const source = read('assets/scripts/battle/controllers/BattleController.ts');
        assert.isTrue(source.includes("'assets/resources/data/master/factor-battle-effect-map.json'"), '沒有載入效果對應表');
        assert.isTrue(source.includes('unit.factorEffects = factorBattleEffectsOf(unit.factorGenes, this.factorEffectMap);'), 'tryDeployTroop 沒有算出 factorEffects');
    });

    suite.test('戰鬥結算的命中擲骰會先檢查大霧必中', () => {
        const source = read('assets/scripts/battle/runtime/BattleCombatResolver.ts');
        assert.isTrue(source.includes('isFogHitGuaranteed(this.context.state.weather, attacker.factorEffects)'), '命中擲骰沒有接大霧免疫');
        assert.isTrue(source.includes('!fogGuaranteed && !rollHit('), '大霧必中時仍會擲骰');
    });

    suite.test('水域合攻在攻擊命中後結算，不觸發反擊、不擲命中', () => {
        const source = read('assets/scripts/battle/runtime/BattleCombatResolver.ts');
        assert.isTrue(source.includes('this.resolveNavalCombinedFollowUp(attacker, defender, svc);'), 'resolveCombat 沒有呼叫水域合攻');
        const body = source.slice(source.indexOf('private resolveNavalCombinedFollowUp'), source.indexOf('private findNavalCombinedHelper'));
        assert.isFalse(body.includes('tryTriggerCounterReaction'), '水域合攻不應觸發反擊');
        assert.isFalse(body.includes('rollHit('), '水域合攻不應擲命中');
        assert.isTrue(body.includes('attacker.isDead()'), '攻擊方陣亡時仍結算合攻');
    });

    suite.test('自動移動的起始移動力加上林地加成', () => {
        const source = read('assets/scripts/battle/runtime/phases/BattleAutoMovePhase.ts');
        assert.isTrue(source.includes('forestMoveBonusFor(cell?.terrain ?? TerrainType.Plain, unit.factorEffects)'), '移動力沒有接林地加成');
    });

    return suite;
}

// ── 戰場單位帶上主將因子（PROG-2-0584 接線前置）──

export function createFactorGenesWiringSuite(): TestSuite {
    const suite = new TestSuite('FactorGenesWiring (戰場單位帶上主將因子 PROG-2-0584)');
    const root = path.resolve(__dirname, '..');

    suite.test('部隊模型有 factorGenes 欄位，預設為空陣列', () => {
        const source = fs.readFileSync(path.join(root, 'assets/scripts/core/models/TroopUnit.ts'), 'utf8');
        assert.isTrue(source.includes('public factorGenes: readonly GeneralGeneConfig[] = [];'), 'TroopUnit 沒有 factorGenes 欄位');
    });

    suite.test('玩家部隊出陣時從主將 genes 帶入 factorGenes', () => {
        const source = fs.readFileSync(path.join(root, 'assets/scripts/battle/controllers/BattleController.ts'), 'utf8');
        assert.isTrue(source.includes('unit.factorGenes = this.state.getGeneral(Faction.Player)?.genes ?? [];'), 'tryDeployTroop 沒有帶入 factorGenes');
    });

    return suite;
}

// ── 對應表與基因表一致（PROG-2-0584）──
export function createFactorEffectMapSuite(): TestSuite {
    const suite = new TestSuite('FactorEffectMap (因子戰場效果對應表 PROG-2-0584)');
    const root = path.resolve(__dirname, '..');
    const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

    suite.test('對應表的基因 id 都存在於基因表', () => {
        const map = readJson('assets/resources/data/master/factor-battle-effect-map.json') as FactorBattleEffectMap;
        const ids = new Set((readJson('assets/resources/data/master/gene-dictionary.json').data as { id: string }[]).map((g) => g.id));
        for (const geneIds of Object.values(map.effects)) {
            for (const id of geneIds) assert.isTrue(ids.has(id), `對應表的 ${id} 不在基因表`);
        }
    });

    suite.test('大霧免疫、水戰與林地都是粉色（地形適性）', () => {
        const dict = readJson('assets/resources/data/master/gene-dictionary.json').data as { id: string; color: string }[];
        const color = (id: string) => dict.find((g) => g.id === id)?.color ?? '';
        assert.equals('pink', color('gene_fog_immune'));
        assert.equals('pink', color('gene_naval'));
        assert.equals('pink', color('gene_forest'));
    });

    suite.test('持有基因才觸發效果；未解鎖或等級 0 不算', () => {
        const map = readJson('assets/resources/data/master/factor-battle-effect-map.json') as FactorBattleEffectMap;
        const effects = factorBattleEffectsOf([{ id: 'gene_forest', level: 2 }, { id: 'gene_naval', level: 1, isLocked: true }, { id: 'gene_fog_immune', level: 0 }], map);
        assert.equals('forest-move-bonus', effects.join(','));
    });

    suite.test('綠色戰法種子 = 字典中 color 為 green 的基因', () => {
        const dict = readJson('assets/resources/data/master/gene-dictionary.json').data as { id: string; color: string }[];
        const green = greenTacticSeedGeneIds(dict);
        assert.isTrue(green.has('gene_strategy'));
        assert.isFalse(green.has('gene_naval'));
    });

    return suite;
}
