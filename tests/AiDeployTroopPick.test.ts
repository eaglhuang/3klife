/**
 * AiDeployTroopPick.test.ts — AI 部署兵種依智力與 Profile 偏好（PROG-2-1468）
 *
 * 覆蓋：低 IQ 不剋制、preferCounter 必定剋制、一般 Profile 依機率剋制、偏好兵種隨機、
 * 偏好買不起退回全兵種、未套難度表沿用既有行為，以及 ai-profiles.json 讀出的偏好與 EnemyAI 接線。
 */
import * as fs from 'fs';
import * as path from 'path';
import { GAME_CONFIG, TROOP_COUNTER_MAP, TroopType, Faction } from '../assets/scripts/core/config/Constants';
import { pickAiDeployTroop, type AiDeployTroopInput } from '../assets/scripts/core/systems/AiDeployTroopPick';
import { deployPreferenceOfGeneral, parseAiProfileTable } from '../assets/scripts/core/systems/AiProfiles';
import { EnemyAI } from '../assets/scripts/battle/controllers/EnemyAI';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { TestSuite, assert } from './TestRunner';

const ALL = [TroopType.Cavalry, TroopType.Infantry, TroopType.Shield, TroopType.Archer, TroopType.Pikeman];

/** 找一個會剋制 target 的兵種（依 TROOP_COUNTER_MAP） */
function counterOf(target: TroopType): TroopType {
    const found = ALL.find(type => TROOP_COUNTER_MAP[type] === target);
    if (!found) throw new Error(`no counter for ${target}`);
    return found;
}

function input(overrides: Partial<AiDeployTroopInput>): AiDeployTroopInput {
    return {
        iq: 'MEDIUM', affordable: ALL, playerMostCommon: TroopType.Infantry, counterMap: TROOP_COUNTER_MAP,
        preference: null, counterChance: 0.35, random: () => 0.99, ...overrides,
    };
}

export function createAiDeployTroopPickSuite(): TestSuite {
    const suite = new TestSuite('AiDeployTroopPick (AI 部署兵種 E-4 PROG-2-1468)');
    const target = TroopType.Infantry;
    const counter = counterOf(target);

    suite.test('低 IQ 不剋制：亂數再低也從偏好兵種挑', () => {
        const pick = pickAiDeployTroop(input({
            iq: 'LOW', random: () => 0, preference: { preferredTroops: ['ARCHER'], preferCounter: true },
        }));
        assert.equals(TroopType.Archer, pick);
    });

    suite.test('preferCounter 的 Profile：亂數 0.99 也必定剋制', () => {
        assert.equals(counter, pickAiDeployTroop(input({ preference: { preferredTroops: [], preferCounter: true } })));
    });

    suite.test('一般 Profile：抽中 35% 才剋制，沒抽中改出偏好兵種', () => {
        const pref = { preferredTroops: ['SHIELD' as const], preferCounter: false };
        assert.equals(counter, pickAiDeployTroop(input({ preference: pref, random: () => 0.1 })));
        assert.equals(TroopType.Shield, pickAiDeployTroop(input({ preference: pref, random: () => 0.99 })));
    });

    suite.test('偏好兵種多個時隨機；PIKE 對到槍兵', () => {
        const pref = { preferredTroops: ['SHIELD' as const, 'PIKE' as const], preferCounter: false };
        assert.equals(TroopType.Shield, pickAiDeployTroop(input({ iq: 'LOW', preference: pref, random: () => 0 })));
        assert.equals(TroopType.Pikeman, pickAiDeployTroop(input({ iq: 'LOW', preference: pref, random: () => 0.99 })));
    });

    suite.test('偏好兵種買不起或只有 AI 不部署的代碼時，退回全兵種隨機', () => {
        const pick = pickAiDeployTroop(input({
            iq: 'LOW', affordable: [TroopType.Infantry], preference: { preferredTroops: ['CAVALRY', 'NAVY'], preferCounter: false },
        }));
        assert.equals(TroopType.Infantry, pick);
        assert.equals(null, pickAiDeployTroop(input({ affordable: [] })));
    });

    suite.test('未套難度表、沒有 Profile：沿用既有行為（35% 剋制，否則全兵種隨機）', () => {
        assert.equals(counter, pickAiDeployTroop(input({ iq: null, random: () => 0.1 })));
        assert.equals(ALL[ALL.length - 1], pickAiDeployTroop(input({ iq: null, random: () => 0.99 })));
        assert.equals(ALL[0], pickAiDeployTroop(input({ iq: null, playerMostCommon: null, random: () => 0 })));
    });

    suite.test('ai-profiles.json：曹操偏好騎步、諸葛亮必定剋制、未列出的武將為 null', () => {
        const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/data/ai-profiles.json'), 'utf8'));
        const parsed = parseAiProfileTable(raw);
        assert.equals('CAVALRY,INFANTRY', deployPreferenceOfGeneral(parsed, 'cao-cao')?.preferredTroops.join(','));
        assert.isTrue(deployPreferenceOfGeneral(parsed, 'zhuge-liang')?.preferCounter === true);
        assert.equals(null, deployPreferenceOfGeneral(parsed, 'nobody'));
    });

    suite.test('EnemyAI 接線：低 IQ 加偏好時只出偏好兵種', () => {
        const state = new BattleState();
        const player = new TroopUnit('p1', TroopType.Infantry, Faction.Player, {
            hp: 100, attack: 30, defense: 10, moveRange: 1, attackRange: 1,
        });
        player.moveTo(2, 0);
        state.addUnit(player);
        const ai = new EnemyAI(() => 0);
        ai.iq = 'LOW';
        ai.deployPreference = { preferredTroops: ['ARCHER'], preferCounter: false };
        const decisions = ai.decideDeploy(state, 1000, 2);
        assert.isTrue(decisions.length > 0);
        assert.isTrue(decisions.every(d => d.type === TroopType.Archer));
        assert.equals(0.35, GAME_CONFIG.AI_COUNTER_STRATEGY_CHANCE);
    });

    return suite;
}
