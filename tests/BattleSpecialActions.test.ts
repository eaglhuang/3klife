/**
 * BattleSpecialActions.test.ts — 戰場特定動作偵測與覺醒接線（PROG-2-0048，headless）
 *
 * Unity 對照：EditMode Test，餵假的 OnUnitDamaged 事件給 AchievementTracker，再驗證戰後覺醒挑到對應因子。
 */
import { TestSuite, assert } from './TestRunner';
import { EVENT_NAMES, Faction, TerrainType, TroopType } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { rollBattleAwakening } from '../assets/scripts/core/systems/FactorAwakening';
import { buildFactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import {
    BattleSpecialActionTracker,
    isFlankOrRearHit,
    specialActionFactorTags,
    toUnitHitObservation,
    type UnitDamagedPayload,
    type UnitHitObservation,
} from '../assets/scripts/core/systems/BattleSpecialActions';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

/** 我方正面擊破一個敵方單位的觀測值；用 overrides 改兵種、地形、站位 */
function hit(overrides: Partial<UnitHitObservation> = {}): UnitHitObservation {
    return {
        attackerFaction: Faction.Player,
        attackerType: TroopType.Infantry,
        attackerIsGeneral: false,
        attackerTerrain: TerrainType.Plain,
        attackerLane: 2,
        attackerDepth: 3,
        defenderLane: 2,
        defenderDepth: 4,
        damage: 30,
        defenderHpAfter: 0,
        ...overrides,
    };
}

function realDictionary() {
    const file = path.resolve(__dirname, '../assets/resources/data/master/gene-dictionary.json');
    return buildFactorDictionary(JSON.parse(fs.readFileSync(file, 'utf8')));
}

/** 可出戰的成年武將：鎖住的藍（號令）在前、粉（騎軍適性）在後，另有綠與紫 */
function rider(): GeneralConfig {
    return {
        id: 'rider', name: '騎將', faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 90, int: 50, lea: 85, pol: 40, cha: 50, luk: 40,
        genes: [
            { id: 'gene_command', type: 'blue', level: 2, isLocked: true, discoveryLevel: 1 },
            { id: 'gene_cavalry', type: 'pink', level: 2, isLocked: true, discoveryLevel: 1, displayName: '騎軍適性' },
            { id: 'gene_strategy', type: 'green', level: 3, isLocked: true, discoveryLevel: 20 },
            { id: 'gene_destiny', type: 'purple', level: 4, isLocked: true, discoveryLevel: 45 },
        ],
    } as unknown as GeneralConfig;
}

export function createBattleSpecialActionsSuite(): TestSuite {
    const suite = new TestSuite('BattleSpecialActions');

    suite.test('騎兵衝鋒：我方騎兵擊破 2 次才達成；沒擊破、主將、敵方都不算', () => {
        const tracker = new BattleSpecialActionTracker();
        tracker.observeUnitHit(hit({ attackerType: TroopType.Cavalry }));
        assert.equals(0, tracker.finish('player-win').length, '只擊破 1 次');

        tracker.observeUnitHit(hit({ attackerType: TroopType.Cavalry, defenderHpAfter: 5 }));
        tracker.observeUnitHit(hit({ attackerType: TroopType.Cavalry, attackerIsGeneral: true }));
        tracker.observeUnitHit(hit({ attackerType: TroopType.Cavalry, attackerFaction: Faction.Enemy }));
        tracker.observeUnitHit(hit({ attackerType: TroopType.Cavalry, damage: 0 }));
        assert.equals(1, tracker.count('cavalry-charge'));

        tracker.observeUnitHit(hit({ attackerType: TroopType.Cavalry }));
        assert.equals('cavalry-charge', tracker.finish('enemy-win').join(','), '敗戰也算有做出動作');
    });

    suite.test('地形作戰：站在河流 / 山地 / 林地擊破 2 次分別達成水戰 / 山地 / 林地', () => {
        const tracker = new BattleSpecialActionTracker();
        for (let i = 0; i < 2; i++) {
            tracker.observeUnitHit(hit({ attackerTerrain: TerrainType.River, attackerType: TroopType.Navy }));
            tracker.observeUnitHit(hit({ attackerTerrain: TerrainType.Mountain }));
        }
        tracker.observeUnitHit(hit({ attackerTerrain: TerrainType.Forest }));
        tracker.observeUnitHit(hit({ attackerTerrain: TerrainType.Plain }));
        assert.equals('naval-battle,mountain-battle', tracker.finish('draw').join(','));
    });

    suite.test('背刺：從敵方側面或背後命中即達成；正面不算', () => {
        assert.isFalse(isFlankOrRearHit({ attackerLane: 2, attackerDepth: 3, defenderLane: 2, defenderDepth: 4 }), '正面');
        assert.isTrue(isFlankOrRearHit({ attackerLane: 1, attackerDepth: 4, defenderLane: 2, defenderDepth: 4 }), '側面');
        assert.isTrue(isFlankOrRearHit({ attackerLane: 2, attackerDepth: 5, defenderLane: 2, defenderDepth: 4 }), '背後');
        assert.isFalse(isFlankOrRearHit({ attackerLane: null, attackerDepth: null, defenderLane: 2, defenderDepth: 4 }), '技能沒有攻方座標');

        const tracker = new BattleSpecialActionTracker();
        tracker.observeUnitHit(hit({ defenderHpAfter: 20 }));
        assert.equals(0, tracker.count('backstab'));
        tracker.observeUnitHit(hit({ attackerLane: 1, attackerDepth: 4, defenderHpAfter: 20 }));
        assert.equals('backstab', tracker.finish('enemy-win').join(','), '未擊破也算');
    });

    suite.test('絕境反擊：我方主將血量曾 ≤ 25% 且戰勝才達成；reset 後清空', () => {
        const tracker = new BattleSpecialActionTracker();
        tracker.observeGeneralHp({ faction: Faction.Enemy, hp: 10, maxHp: 1000 });
        tracker.observeGeneralHp({ faction: Faction.Player, hp: 260, maxHp: 1000 });
        assert.equals(0, tracker.finish('player-win').length, '26% 還不算絕境');

        tracker.observeGeneralHp({ faction: Faction.Player, hp: 250, maxHp: 1000 });
        tracker.observeGeneralHp({ faction: Faction.Player, hp: 900, maxHp: 1000 });
        assert.equals(0, tracker.finish('enemy-win').length, '輸了不算反擊');
        assert.equals('last-stand', tracker.finish('player-win').join(','), '回血後仍記得曾陷入絕境');

        tracker.reset();
        assert.equals(0, tracker.finish('player-win').length);
    });

    suite.test('動作標籤去重；未知動作忽略', () => {
        assert.equals('cavalry,charge,counter,survival', specialActionFactorTags(['cavalry-charge', 'last-stand', 'cavalry-charge', 'nope']).join(','));
    });

    suite.test('實際戰鬥事件：我方騎兵擊破 2 個敵方單位 → 騎兵衝鋒；站在河流 → 水戰', () => {
        services().initialize();
        const state = new BattleState();
        state.getCell(2, 3)!.terrain = TerrainType.River;
        const resolver = new BattleCombatResolver({
            state,
            getPlayerGeneralUnitId: () => null,
            getEnemyGeneralUnitId: () => null,
            setPlayerGeneralUnitId: () => {},
            setEnemyGeneralUnitId: () => {},
        });
        const cavalry = new TroopUnit('p-cav', TroopType.Cavalry, Faction.Player, { hp: 100, attack: 200, defense: 10, moveRange: 0, attackRange: 1 });
        cavalry.moveTo(2, 3);
        state.addUnit(cavalry);

        const tracker = new BattleSpecialActionTracker();
        const off = services().event.on(EVENT_NAMES.UnitDamaged, (payload?: UnitDamagedPayload) => {
            if (!payload) return;
            tracker.observeUnitHit(toUnitHitObservation(payload, {
                unitType: (id) => state.units.get(id)?.type ?? null,
                isGeneralUnit: (id) => resolver.isGeneralUnit(id),
                terrainAt: (lane, depth) => state.getCell(lane, depth)?.terrain ?? null,
            }));
        });
        try {
            for (const id of ['e-1', 'e-2']) {
                const enemy = new TroopUnit(id, TroopType.Infantry, Faction.Enemy, { hp: 10, attack: 10, defense: 0, moveRange: 0, attackRange: 1 });
                enemy.moveTo(2, 4);
                state.addUnit(enemy);
                resolver.resolveCombat(cavalry, enemy, services());
                assert.isTrue(enemy.isDead(), `${id} 應被擊破`);
                resolver.onUnitKilled(enemy, cavalry, services());
            }
        } finally {
            off();
        }
        assert.equals('cavalry-charge,naval-battle', tracker.finish('player-win').join(','));
    });

    suite.test('覺醒挑因子：騎兵衝鋒優先覺醒騎軍適性；沒有相符標籤時從全部候選挑', () => {
        const dictionary = realDictionary();
        const factorTags = (id: string) => dictionary.get(id)?.defaultTags;
        const general = rider();

        const matched = rollBattleAwakening(general, {
            discoveryLevel: 1, specialAction: true, actionTags: specialActionFactorTags(['cavalry-charge']), factorTags, random: () => 0,
        });
        assert.isTrue(matched !== null && matched.ok);
        if (!matched || !matched.ok) return;
        assert.equals('gene_cavalry', matched.event.factorId, '亂數挑第 0 個，但只剩相符的騎軍適性');

        const fallback = rollBattleAwakening(general, {
            discoveryLevel: 1, specialAction: true, actionTags: specialActionFactorTags(['naval-battle']), factorTags, random: () => 0,
        });
        assert.isTrue(fallback !== null && fallback.ok);
        if (!fallback || !fallback.ok) return;
        assert.equals('gene_command', fallback.event.factorId, '沒有水戰標籤的因子 → 從全部候選挑第 0 個');
    });

    suite.test('GameSession.recordBattle：specialActions 開放綠白紫紅並依標籤挑因子；只戰勝不再開紫', async () => {
        const session = new GameSession(7);
        session.setFactorDictionary(realDictionary());
        session.setRandomSource(() => 0);
        session.setRosterStore(new InMemoryRosterStore([rider()]));
        await session.setDiscoveryLevel(45);

        const charged = await session.recordBattle(['rider'], 'enemy-win', { specialActions: { rider: ['cavalry-charge'] } });
        assert.equals('gene_cavalry', charged.awakenings[0]?.factorId);

        const won = await session.recordBattle(['rider'], 'player-win');
        assert.equals('gene_command', won.awakenings[0]?.factorId, '一般戰勝只開藍粉');
        const plain = await session.recordBattle(['rider'], 'player-win');
        assert.equals(0, plain.awakenings.length, '藍粉都開了，戰勝本身不再開綠紫');

        const stand = await session.recordBattle(['rider'], 'player-win', { specialActions: { rider: ['last-stand'] } });
        assert.equals('gene_strategy', stand.awakenings[0]?.factorId, '絕境反擊：沒有相符標籤，從綠紫裡挑第 0 個');
    });

    return suite;
}
