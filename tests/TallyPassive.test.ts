import { TroopType, Faction, TerrainType } from '../assets/scripts/core/config/Constants';
import { buildTallyCardCatalog } from '../assets/scripts/core/config/TallyCardCatalog';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { applyTallyPassive, extraAttackHitsOf, tallyAttackMultiplierOf, tallyBackRowDamageMultiplierOf, tallyDefensePenetrationOf, tallyEnemyAuraAttackMultiplierOf, tallyEvasionBonusOf, tallyPhysicalDamageTakenOf, tallyTerrainMoveBonusOf, tallyTroopTypeDamageMultiplierOf } from '../assets/scripts/battle/shared/TallyPassive';
import { BattleSkillDamageResolver } from '../assets/scripts/battle/skills/BattleSkillDamageResolver';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { GAME_CONFIG } from '../assets/scripts/core/config/Constants';
import { TestSuite, assert } from './TestRunner';

function cavalry(attackRange: number): TroopUnit {
  return new TroopUnit('u1', TroopType.Cavalry, Faction.Player, { hp: 100, attack: 40, defense: 20, moveRange: 2, attackRange });
}

export function createTallyPassiveSuite(): TestSuite {
  const suite = new TestSuite('TallyPassive (虎符被動掛點 PROG-2-0774)');

  suite.test('騎射合一：白馬騎兵攻擊射程提高為弓兵射程，移動力 +1', () => {
    const unit = cavalry(1);
    const baseMove = unit.getEffectiveMoveRange();
    applyTallyPassive(unit, 'tiger-tally-bai-ma');
    assert.equals(2, unit.attackRange);
    assert.equals(baseMove + 1, unit.getEffectiveMoveRange());
  });

  suite.test('射程下限只升不降：已有更高射程的部隊不被壓低', () => {
    const unit = cavalry(3);
    applyTallyPassive(unit, 'tiger-tally-bai-ma');
    assert.equals(3, unit.attackRange);
  });

  suite.test('沒有被動的模板或沒有模板 id：不改動部隊', () => {
    const unit = cavalry(1);
    applyTallyPassive(unit, 'tiger-tally-cavalry-shock');
    applyTallyPassive(unit, null);
    assert.equals(1, unit.attackRange);
  });

  suite.test('梟姬卡目錄：弓兵、SR、攻擊時觸發', () => {
    const card = buildTallyCardCatalog().get('tiger-tally-jiao-ji');
    assert.isDefined(card);
    assert.equals('archer', card!.unitType);
    assert.equals('SR', card!.rarityLabel);
    assert.equals('on-attack', card!.timing);
  });

  suite.test('白馬卡目錄：騎兵、SSR、戰鬥開始時觸發', () => {
    const card = buildTallyCardCatalog().get('tiger-tally-bai-ma');
    assert.isDefined(card);
    assert.equals('cavalry', card!.unitType);
    assert.equals('SSR', card!.rarityLabel);
    assert.equals('start-of-battle', card!.timing);
  });

  suite.test('結姻連射：梟姬與男性武將相鄰時攻擊次數 +1，否則 0', () => {
    const unit = new TroopUnit('archer', TroopType.Archer, Faction.Player, { hp: 80, attack: 30, defense: 15 });
    unit.tallyTemplateId = 'tiger-tally-jiao-ji';
    assert.equals(1, extraAttackHitsOf(unit, true));
    assert.equals(0, extraAttackHitsOf(unit, false));
  });

  suite.test('結姻連射：沒有此被動的部隊不因相鄰而多打', () => {
    const unit = cavalry(1);
    unit.tallyTemplateId = 'tiger-tally-cavalry-shock';
    assert.equals(0, extraAttackHitsOf(unit, true));
  });

  suite.test('結姻連射相鄰判定：只有主將男性且站在主將前一排才算', () => {
    const resolver = (general: { gender?: string } | null) => new BattleCombatResolver({
      state: { getGeneral: () => general },
    } as any);
    const archer = (depth: number) => {
      const unit = new TroopUnit('archer', TroopType.Archer, Faction.Player, { hp: 80, attack: 30, defense: 15 });
      unit.moveTo(0, depth);
      return unit;
    };
    const male = resolver({ gender: '男' }) as any;
    assert.isTrue(male.isAdjacentToMaleGeneral(archer(GAME_CONFIG.GRID_DEPTH - 1)));
    assert.isFalse(male.isAdjacentToMaleGeneral(archer(GAME_CONFIG.GRID_DEPTH - 2)));
    const female = resolver({ gender: '女' }) as any;
    assert.isFalse(female.isAdjacentToMaleGeneral(archer(GAME_CONFIG.GRID_DEPTH - 1)));
  });

  suite.test('解煩（PROG-2-1433）：出陣移動 +2，任何地形攻擊 ×1.2', () => {
    const unit = cavalry(1);
    const baseMove = unit.getEffectiveMoveRange();
    applyTallyPassive(unit, 'tiger-tally-jie-fan');
    unit.tallyTemplateId = 'tiger-tally-jie-fan';
    assert.equals(baseMove + 2, unit.getEffectiveMoveRange());
    assert.equals(1.2, tallyAttackMultiplierOf(unit, TerrainType.Plain));
    assert.equals(1.2, tallyAttackMultiplierOf(unit, TerrainType.River));
    assert.equals(0, tallyTerrainMoveBonusOf(unit, TerrainType.Mountain));
  });

  suite.test('丹陽／吳國（PROG-2-1433）：只在山地／河道時攻擊 ×1.2、移動 +2', () => {
    const danYang = cavalry(1);
    const baseMove = danYang.getEffectiveMoveRange();
    applyTallyPassive(danYang, 'tiger-tally-dan-yang');
    danYang.tallyTemplateId = 'tiger-tally-dan-yang';
    assert.equals(baseMove, danYang.getEffectiveMoveRange());
    assert.equals(1.2, tallyAttackMultiplierOf(danYang, TerrainType.Mountain));
    assert.equals(1, tallyAttackMultiplierOf(danYang, TerrainType.Plain));
    assert.equals(2, tallyTerrainMoveBonusOf(danYang, TerrainType.Mountain));
    assert.equals(0, tallyTerrainMoveBonusOf(danYang, TerrainType.River));
    const wuGuo = cavalry(1);
    wuGuo.tallyTemplateId = 'tiger-tally-wu-guo';
    assert.equals(1.2, tallyAttackMultiplierOf(wuGuo, TerrainType.River));
    assert.equals(1, tallyAttackMultiplierOf(wuGuo, TerrainType.Mountain));
    assert.equals(2, tallyTerrainMoveBonusOf(wuGuo, TerrainType.River));
  });

  suite.test('攻擊乘數接進 getTallyAttackMod（PROG-2-1433）：依所站格地形', () => {
    const unit = cavalry(1);
    unit.tallyId = 'card-1';
    unit.tallyTemplateId = 'tiger-tally-dan-yang';
    const resolverOn = (terrain: TerrainType) => new BattleCombatResolver({
      state: { units: new Map([[unit.id, unit]]), getCell: () => ({ terrain }) },
    } as any);
    assert.equals(1.2, resolverOn(TerrainType.Mountain).getTallyAttackMod(unit));
    assert.equals(1, resolverOn(TerrainType.Plain).getTallyAttackMod(unit));
    const plain = cavalry(1);
    assert.equals(1, resolverOn(TerrainType.Mountain).getTallyAttackMod(plain));
  });

  suite.test('止啼符（PROG-2-1437）：目標在其陣營後排兩列時傷害 ×1.5', () => {
    const zhangLiao = cavalry(1);
    zhangLiao.tallyTemplateId = 'tiger-tally-zhi-ti-fu';
    const enemyAt = (depth: number) => {
      const u = new TroopUnit(`e${depth}`, TroopType.Infantry, Faction.Enemy, { hp: 100, attack: 30, defense: 20, moveRange: 1, attackRange: 1 });
      u.depth = depth;
      return u;
    };
    const last = GAME_CONFIG.GRID_DEPTH - 1;
    assert.equals(1.5, tallyBackRowDamageMultiplierOf(zhangLiao, enemyAt(last)));
    assert.equals(1.5, tallyBackRowDamageMultiplierOf(zhangLiao, enemyAt(last - 1)));
    assert.equals(1, tallyBackRowDamageMultiplierOf(zhangLiao, enemyAt(last - 2)));
    // 我方由 depth 0 出兵：敵方止啼符打我方 depth 0、1
    const enemyZhiTi = enemyAt(3);
    enemyZhiTi.tallyTemplateId = 'tiger-tally-zhi-ti-fu';
    const mine = cavalry(1);
    mine.depth = 1;
    assert.equals(1.5, tallyBackRowDamageMultiplierOf(enemyZhiTi, mine));
    mine.depth = 2;
    assert.equals(1, tallyBackRowDamageMultiplierOf(enemyZhiTi, mine));
  });

  suite.test('藤甲（PROG-2-1437）：部隊攻擊傷害 ×0.5，接進 getTallyPhysicalDamageMod', () => {
    const tengJia = cavalry(1);
    tengJia.tallyTemplateId = 'tiger-tally-teng-jia';
    assert.equals(0.5, tallyPhysicalDamageTakenOf(tengJia));
    const attacker = new TroopUnit('e1', TroopType.Infantry, Faction.Enemy, { hp: 100, attack: 30, defense: 20, moveRange: 1, attackRange: 1 });
    const resolver = new BattleCombatResolver({ state: { units: new Map(), getCell: () => ({ terrain: TerrainType.Plain }) } } as any);
    assert.equals(0.5, resolver.getTallyPhysicalDamageMod(attacker, tengJia));
    assert.equals(1, resolver.getTallyPhysicalDamageMod(tengJia, attacker));
  });

  suite.test('藤甲（PROG-2-1437）：承受火計傷害 ×3，非火計不變', () => {
    const base = resolveBattleSkillProfile('cao-cao-tactics');
    assert.isDefined(base);
    const fireProfile = { ...base!, tags: ['fire'] };
    const caster = createTestGeneral('cao-cao', Faction.Player, { str: 40, int: 110, lea: 80 });
    const target = createTestUnit('enemy', Faction.Enemy, 2, 3, { defense: 40 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: caster,
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [target],
    });
    const resolver = new BattleSkillDamageResolver();
    const plainFire = resolver.resolveDamage(fireProfile, caster, target, bundle.context, 0);
    const plainSkill = resolver.resolveDamage(base!, caster, target, bundle.context, 0);
    target.tallyTemplateId = 'tiger-tally-teng-jia';
    assert.equals(Math.floor(plainFire * 3), resolver.resolveDamage(fireProfile, caster, target, bundle.context, 0));
    assert.equals(plainSkill, resolver.resolveDamage(base!, caster, target, bundle.context, 0));
  });

  suite.test('虎痴符（PROG-2-1444）：攻擊 ×2、防禦 ×0.5，接進 getTallyAttackMod／getTallyDefenseMod', () => {
    const unit = cavalry(1);
    unit.tallyId = 'card-1';
    unit.tallyTemplateId = 'tiger-tally-hu-chi-fu';
    const resolver = new BattleCombatResolver({
      state: { units: new Map([[unit.id, unit]]), getCell: () => ({ terrain: TerrainType.Plain }) },
    } as any);
    const star = unit.tallyStarMultiplier;
    assert.equals(2 * star, resolver.getTallyAttackMod(unit));
    assert.equals(0.5 * star, resolver.getTallyDefenseMod(unit));
  });

  suite.test('錦帆（PROG-2-1457 暫定）：周圍 1 格敵軍攻擊 ×0.8（非虎符也受影響），河道攻擊 ×1.2、移動 +1', () => {
    const jinFan = new TroopUnit('jf', TroopType.Navy, Faction.Player, { hp: 100, attack: 30, defense: 20, moveRange: 2, attackRange: 1 });
    jinFan.tallyTemplateId = 'tiger-tally-jin-fan';
    jinFan.moveTo(2, 3);
    const enemyAt = (id: string, lane: number, depth: number) => {
      const u = new TroopUnit(id, TroopType.Infantry, Faction.Enemy, { hp: 100, attack: 30, defense: 20, moveRange: 1, attackRange: 1 });
      u.moveTo(lane, depth);
      return u;
    };
    const diagonal = enemyAt('e1', 3, 4);
    const far = enemyAt('e2', 2, 5);
    const all = [jinFan, diagonal, far];
    assert.equals(0.8, tallyEnemyAuraAttackMultiplierOf(diagonal, all));
    assert.equals(1, tallyEnemyAuraAttackMultiplierOf(far, all));
    assert.equals(1, tallyEnemyAuraAttackMultiplierOf(jinFan, all), '光環不影響友軍與自己');
    const resolver = new BattleCombatResolver({
      state: { units: new Map(all.map((u) => [u.id, u])), getCell: () => ({ terrain: TerrainType.Plain }) },
    } as any);
    assert.equals(0.8, resolver.getTallyAttackMod(diagonal));
    assert.equals(1.2, tallyAttackMultiplierOf(jinFan, TerrainType.River));
    assert.equals(1, tallyAttackMultiplierOf(jinFan, TerrainType.Plain));
    assert.equals(1, tallyTerrainMoveBonusOf(jinFan, TerrainType.River));
  });

  suite.test('工甲符／白耳／元戎／常山女（PROG-2-1457 暫定）：穿透、兵種剋制、連擊、迴避', () => {
    const make = (id: string, type: TroopType, template?: string) => {
      const u = new TroopUnit(id, type, Faction.Player, { hp: 100, attack: 30, defense: 20, moveRange: 1, attackRange: 1 });
      if (template) u.tallyTemplateId = template;
      return u;
    };
    const archer = make('a', TroopType.Archer);
    const infantry = make('i', TroopType.Infantry);
    assert.equals(0.3, tallyDefensePenetrationOf(make('g', TroopType.Engineer, 'tiger-tally-gong-jia-fu')));
    assert.equals(0, tallyDefensePenetrationOf(archer));
    const baiEr = make('b', TroopType.Shield, 'tiger-tally-bai-er');
    assert.equals(1.5, tallyTroopTypeDamageMultiplierOf(baiEr, archer));
    assert.equals(1, tallyTroopTypeDamageMultiplierOf(baiEr, infantry));
    const yuanRong = make('y', TroopType.Archer, 'tiger-tally-yuan-rong');
    assert.equals(1.5, tallyTroopTypeDamageMultiplierOf(yuanRong, infantry));
    assert.equals(1, extraAttackHitsOf(yuanRong, false));
    const resolver = new BattleCombatResolver({ state: { units: new Map(), getCell: () => ({ terrain: TerrainType.Plain }) } } as any);
    assert.equals(1.5, resolver.getTallyPhysicalDamageMod(baiEr, archer));
    assert.equals(0.3, tallyEvasionBonusOf(make('c', TroopType.Medic, 'tiger-tally-changshan-nu')));
    assert.equals(0, tallyEvasionBonusOf(archer));
  });

  return suite;
}
