/**
 * SummonRule — 召喚招式（PROG-2-10253；doc_spec_1359）
 *
 * 覆蓋：生成格排序（同路前方 → 同路後方 → 靠中間空路；不生在敵方底線）、無空格、上限、到期回合、
 * 召喚 resolver（生成隊數、固定出生路、上限失敗不放、無 context 失敗）、召喚物不留遺體、
 * 圖示「召」、AI 打分（§2.5）、表完整性（特效分組＋音效 clip＋四語系名稱＋戰法庫）、五路對撞設定不動。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { Faction, GAME_CONFIG, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import {
    isSummonExpired, pickSummonCell, summonAiValue, summonAllowedCount, summonCapReached, summonExpireTurn,
    type SummonAiSituation, type SummonSpec,
} from '../assets/scripts/battle/shared/SummonRule';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { SummonSkillResolver } from '../assets/scripts/battle/skills/resolvers/SummonSkillResolver';
import type { BattleSkillExecutionContext } from '../assets/scripts/battle/skills/BattleSkillResolver';
import type { BattleSkillRequest } from '../assets/scripts/shared/SkillRuntimeContract';
import { STATUS_ICON_DEFS, computeUnitStatusIcons, emptyStatusContext } from '../assets/scripts/battle/shared/UnitStatusIcons';
import { tacticVfxGroupOf, TACTIC_VFX_RECIPES } from '../assets/scripts/battle/shared/TacticVfxGroups';
import { pickTacticByAiRule } from '../assets/scripts/battle/shared/TacticAiRules';
import { buildEnemyTacticCandidates } from '../assets/scripts/battle/shared/EnemyTacticCandidates';

const GRID = { lanes: 5, depths: 8 };
const root = path.join(__dirname, '..');
const readJson = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')) as T;

const SPEC: SummonSpec = { troop: 'shield', count: 1, durationTurns: 4, maxAlive: 3, statScale: 0.4 };

function mkUnit(id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const u = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack: 30, defense: 10, moveRange: 1, attackRange: 1 });
    u.moveTo(lane, depth);
    return u;
}

/** 假 context：記錄生成的召喚物，格子占用由 occupied 集合決定 */
function mkContext(faction: Faction, caster: { lane: number; depth: number }, occupied: Array<[number, number]>, existing: TroopUnit[] = []) {
    const spawned: TroopUnit[] = [];
    const occ = new Set(occupied.map(([l, d]) => `${l},${d}`));
    const cells = [] as Array<{ lane: number; depth: number }>;
    for (let l = 0; l < GRID.lanes; l++) for (let d = 0; d < GRID.depths; d++) cells.push({ lane: l, depth: d });
    const ctx = {
        getFactionUnits: () => [...existing, ...spawned],
        getBoardCells: () => cells,
        getCasterCell: () => caster,
        getCasterUnitId: () => 'caster-1',
        isCellFreeForPush: (l: number, d: number) => !occ.has(`${l},${d}`),
        emitSkillEffect: () => undefined,
        spawnSummon: (f: Faction, spec: SummonSpec, lane: number, depth: number, by: string | null) => {
            const u = mkUnit(`s-${spawned.length}`, f, lane, depth);
            u.summonedBy = by;
            u.summonExpireTurn = summonExpireTurn(1, spec.durationTurns);
            occ.add(`${lane},${depth}`);
            spawned.push(u);
            return u;
        },
    } as unknown as BattleSkillExecutionContext;
    return { ctx, spawned };
}

const request = (): BattleSkillRequest => ({
    sourceType: 'tactic', ownerUid: Faction.Player, battleSkillId: 'summon-militia',
    targetMode: 'self', timing: 'active-cast',
} as unknown as BattleSkillRequest);

const sit = (over: Partial<SummonAiSituation> = {}): SummonAiSituation => ({
    hasFreeCell: true, aliveSummons: 0, ownTroops: 2, opposingTroops: 3, emptyOwnLanes: 1, laneUnderPressure: false, highIq: true, ...over,
});

function cellKey(c: { lane: number; depth: number } | null): string | null {
    return c ? `${c.lane},${c.depth}` : null;
}

export function createSummonRuleSuite(): TestSuite {
    const suite = new TestSuite('SummonRule (召喚招式 PROG-2-10253)');

    suite.test('生成格：施放者同路前方第一格優先（玩家往深處、敵方往淺處）', () => {
        assert.equals('1,4', cellKey(pickSummonCell(Faction.Player, 1, 3, GRID, () => true)));
        assert.equals('2,2', cellKey(pickSummonCell(Faction.Enemy, 2, 3, GRID, () => true)));
    });

    suite.test('生成格：前方被占改同路後方；同路前後都被占改靠中間的空路', () => {
        const front = new Set(['1,4']);
        assert.equals('1,2', cellKey(pickSummonCell(Faction.Player, 1, 3, GRID, (l, d) => !front.has(`${l},${d}`))));
        const both = new Set(['1,4', '1,2']);
        const other = pickSummonCell(Faction.Player, 1, 3, GRID, (l, d) => !both.has(`${l},${d}`));
        assert.equals(2, other!.lane);
        assert.equals(3, other!.depth);
    });

    suite.test('生成格：靠中間同距取小路號；不生在敵方底線；無空格回 null', () => {
        const blocked = new Set(['2,4', '2,2']);
        assert.equals(1, pickSummonCell(Faction.Player, 2, 3, GRID, (l, d) => !blocked.has(`${l},${d}`))!.lane);
        assert.equals('0,5', cellKey(pickSummonCell(Faction.Player, 0, 6, GRID, () => true)));
        assert.equals(null, pickSummonCell(Faction.Player, 1, 3, GRID, () => false));
    });

    suite.test('數量與到期：同時上限 3、單次 1 隊、已滿回 0；到期回合 = 召喚回合 + 存活回合', () => {
        assert.isTrue(!summonCapReached(2, SPEC));
        assert.isTrue(summonCapReached(3, SPEC));
        assert.equals(1, summonAllowedCount(0, SPEC));
        assert.equals(1, summonAllowedCount(2, SPEC));
        assert.equals(0, summonAllowedCount(3, SPEC));
        assert.equals(2, summonAllowedCount(1, { maxAlive: 3, count: 5 }));
        assert.equals(5, summonExpireTurn(1, 4));
        assert.isTrue(!isSummonExpired(5, 4));
        assert.isTrue(isSummonExpired(5, 5));
        assert.isTrue(!isSummonExpired(null, 99));
    });

    suite.test('resolver：召喚 1 隊在施放者同路前方、記錄施放者與到期回合、固定出生路', () => {
        const { ctx, spawned } = mkContext(Faction.Player, { lane: 1, depth: 2 }, [[1, 2]]);
        const result = new SummonSkillResolver().execute(request(), ctx);
        assert.isTrue(result.applied);
        assert.equals(1, spawned.length);
        assert.equals(1, spawned[0].lane);
        assert.equals(3, spawned[0].depth);
        assert.equals('caster-1', spawned[0].summonedBy);
        assert.equals(5, spawned[0].summonExpireTurn);
        assert.equals(1, result.deltas.length);
    });

    suite.test('resolver：同陣營已有 3 隊召喚物 → 施放失敗（不生成）；沒有 spawnSummon 也失敗', () => {
        const existing = [0, 1, 2].map(i => { const u = mkUnit(`e${i}`, Faction.Player, i, 1); u.summonedBy = 'caster-1'; return u; });
        const { ctx, spawned } = mkContext(Faction.Player, { lane: 1, depth: 2 }, [], existing);
        const full = new SummonSkillResolver().execute(request(), ctx);
        assert.isTrue(!full.applied);
        assert.equals('summon-cap-reached', full.blockedReason);
        assert.equals(0, spawned.length);

        const bare = { getFactionUnits: () => [], getBoardCells: () => [], getCasterCell: () => ({ lane: 0, depth: 0 }) } as unknown as BattleSkillExecutionContext;
        assert.isTrue(!new SummonSkillResolver().execute(request(), bare).applied);
    });

    suite.test('resolver：無空格 → 施放失敗', () => {
        const all: Array<[number, number]> = [];
        for (let l = 0; l < GRID.lanes; l++) for (let d = 0; d < GRID.depths; d++) all.push([l, d]);
        const { ctx, spawned } = mkContext(Faction.Player, { lane: 1, depth: 2 }, all);
        const r = new SummonSkillResolver().execute(request(), ctx);
        assert.isTrue(!r.applied);
        assert.equals(0, spawned.length);
    });

    suite.test('召喚物陣亡不進陣亡紀錄（不留遺體、不被復活）；一般單位仍進', () => {
        const state = new BattleState();
        const summon = mkUnit('sm', Faction.Player, 1, 3);
        summon.summonedBy = 'caster-1';
        const normal = mkUnit('nm', Faction.Player, 2, 3);
        state.addUnit(summon);
        state.addUnit(normal);
        summon.currentHp = 0;
        normal.currentHp = 0;
        state.removeUnit('sm');
        state.removeUnit('nm');
        const revived = state.reviveFallenUnit(Faction.Player, 0.5);
        assert.equals('nm', revived?.id ?? null);
        assert.equals(null, state.reviveFallenUnit(Faction.Player, 0.5));
    });

    suite.test('頭頂圖示：召喚物顯示「召」（增益色），一般單位沒有', () => {
        const src = { attackBonus: 0, maxHpBonus: 0, shield: 0, morale: 0, moraleTurns: 0 };
        assert.equals('召', STATUS_ICON_DEFS.summoned.glyph);
        assert.isTrue(!STATUS_ICON_DEFS.summoned.isDebuff);
        assert.isTrue(computeUnitStatusIcons({ ...src, summonedBy: 'c' }, emptyStatusContext()).allKinds.includes('summoned'));
        assert.isTrue(!computeUnitStatusIcons(src, emptyStatusContext()).allKinds.includes('summoned'));
    });

    suite.test('AI（§2.5）：無空格／已達上限／敵方沒部隊不用；低智只在部隊數落後時用；高智會補被壓制的路', () => {
        assert.equals(0, summonAiValue(SPEC, sit({ hasFreeCell: false })));
        assert.equals(0, summonAiValue(SPEC, sit({ aliveSummons: 3 })));
        assert.equals(0, summonAiValue(SPEC, sit({ opposingTroops: 0 })));
        assert.isTrue(summonAiValue(SPEC, sit({ highIq: false, ownTroops: 1, opposingTroops: 3 })) > 0);
        assert.equals(0, summonAiValue(SPEC, sit({ highIq: false, ownTroops: 4, opposingTroops: 3, laneUnderPressure: true })));
        assert.equals(0, summonAiValue(SPEC, sit({ ownTroops: 4, opposingTroops: 3, emptyOwnLanes: 0 })));
        assert.isTrue(summonAiValue(SPEC, sit({ ownTroops: 4, opposingTroops: 3, emptyOwnLanes: 0, laneUnderPressure: true })) > 0);
    });

    suite.test('AI 候選：戰法庫 summon 類別進候選；summonValue=0 不被選、>0 會被選', () => {
        const cands = buildEnemyTacticCandidates([{ tacticId: 'tactic-summon-militia' }], [{ id: 'tactic-summon-militia', category: 'summon' }]);
        assert.equals('summon', cands[0].category);
        const situation = { enemyHp: [100], allyLowestHpRate: 1 };
        assert.equals(null, pickTacticByAiRule([{ ...cands[0], summonValue: 0 }], situation));
        assert.equals('tactic-summon-militia', pickTacticByAiRule([{ ...cands[0], summonValue: 30 }], situation));
    });

    suite.test('表完整性：profile 數值＝裁決、特效分組 summon 有配方、音效 clip／音量、戰法庫、四語系名稱', () => {
        const p = resolveBattleSkillProfile('summon-militia');
        assert.equals('summon', p?.effectKind);
        assert.equals(1, p?.summon?.count);
        assert.equals(4, p?.summon?.durationTurns);
        assert.equals(3, p?.summon?.maxAlive);
        assert.equals(0.4, p?.summon?.statScale);
        assert.equals('summon', tacticVfxGroupOf('summon-militia'));
        assert.isTrue(!!TACTIC_VFX_RECIPES.summon);
        assert.isTrue(TACTIC_VFX_RECIPES.summon.particlesPerCell <= 14);
        const audio = readJson<{ tactic: { clips: Record<string, string[]>; volume: Record<string, number[]> } }>('assets/resources/data/battle-audio-layers.json');
        assert.equals('teleport', audio.tactic.clips.summon[0]);
        assert.equals(2, audio.tactic.volume.summon.length);
        const lib = readJson<{ data: Array<{ id: string; battleSkillId: string; category: string }> }>('assets/resources/data/master/tactic-library.json').data;
        assert.isTrue(lib.some(t => t.battleSkillId === 'summon-militia' && t.category === 'summon'));
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const j = readJson<Record<string, string>>(`assets/resources/i18n/${lang}.json`);
            assert.isTrue(!!j['battle.skill_name.summon-militia']);
        }
    });

    suite.test('五路對撞核心規則不動：troopEngageAdjacent 維持 false；生成格只落在 5x8 內', () => {
        assert.equals(false, GAME_CONFIG.troopEngageAdjacent);
        for (let l = 0; l < GRID.lanes; l++) {
            for (let d = 0; d < GRID.depths; d++) {
                for (const f of [Faction.Player, Faction.Enemy]) {
                    const c = pickSummonCell(f, l, d, GRID, () => true);
                    assert.isTrue(!c || (c.lane >= 0 && c.lane < GRID.lanes && c.depth >= 0 && c.depth < GRID.depths));
                }
            }
        }
    });

    return suite;
}
