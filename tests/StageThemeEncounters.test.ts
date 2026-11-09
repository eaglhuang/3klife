/**
 * StageThemeEncounters — 四主題關卡內容（LVL-10，PROG-2-2131）
 * 用 encounters.json 的真實資料跑真實回合流程，確認四關可玩、主要互動物件有上棋盤。
 */
import * as fs from 'fs';
import { BattleTactic, Faction } from '../assets/scripts/core/config/Constants';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import type { BattleState } from '../assets/scripts/battle/models/BattleState';
import { STAGE_THEME_CONFIGS, type StageThemeId } from '../assets/scripts/battle/shared/StageThemeSalvage';
import { AMBUSH_TRAP_TILE_NOTE } from '../assets/scripts/battle/shared/BattleTacticBehavior';
import { ROCK_SLIDE_TILE_NOTE, FLOODGATE_TILE_NOTE } from '../assets/scripts/battle/shared/StageSalvage';
import { buildStageChainNodes, validateStageChainNodes } from '../assets/scripts/core/systems/StageChainNodes';
import { STAGE_THEME_INTEL, stageThemeMechanicNotes } from '../assets/scripts/core/systems/StageThemeIntel';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { buildLobbyScout } from '../assets/scripts/ui/core/ScoutPanelController';
import type { EncounterConfig } from '../assets/scripts/shared/BattleEntryParams';
import { TestSuite, assert } from './TestRunner';

const CHAIN_ID = 'four-themes-chain';
const THEME_IDS = Object.keys(STAGE_THEME_CONFIGS) as StageThemeId[];
const MAX_TURNS = 40;

const THEME_TACTIC: Readonly<Record<StageThemeId, BattleTactic>> = {
    Canyon: BattleTactic.RockSlide,
    Floodgate: BattleTactic.FloodAttack,
    Night_Raid: BattleTactic.NightRaid,
    Ambush: BattleTactic.AmbushAttack,
};

function readJson<T>(path: string): T {
    return JSON.parse(fs.readFileSync(`assets/resources/data/${path}`, 'utf8')) as T;
}

function themeEncounters(): EncounterConfig[] {
    return readJson<{ encounters: EncounterConfig[] }>('encounters.json').encounters
        .filter((encounter) => encounter.chainId === CHAIN_ID);
}

function encounterOf(themeId: StageThemeId): EncounterConfig {
    return themeEncounters().find((encounter) => encounter.stageThemeId === themeId)!;
}

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 3000, maxSp: 100, initialSp: 0, str: 70, int: 70, lea: 70,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics', tacticSlots: [],
    });
}

function startBattle(encounter: EncounterConfig): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.1);
    const ctrl = new BattleController();
    ctrl.initBattle(
        general(encounter.playerGeneralId, Faction.Player),
        general(encounter.enemyGeneralId, Faction.Enemy),
        encounter.terrain,
        encounter.weather as never,
        encounter.battleTactic,
    );
    return ctrl;
}

function countEffects(state: BattleState, match: (notes: string | undefined, tileState: string) => boolean): number {
    let count = 0;
    state.tileEffects.forEach((effect) => {
        if (match(effect.notes, effect.state)) count++;
    });
    return count;
}

const KEY_OBJECT_MATCH: Readonly<Record<StageThemeId, (notes: string | undefined, tileState: string) => boolean>> = {
    Canyon: (notes) => notes === ROCK_SLIDE_TILE_NOTE,
    Floodgate: (notes) => notes === FLOODGATE_TILE_NOTE,
    Night_Raid: (_, tileState) => tileState === 'scene-camp',
    Ambush: (notes) => notes === AMBUSH_TRAP_TILE_NOTE,
};

export function createStageThemeEncountersSuite(): TestSuite {
    const suite = new TestSuite('StageThemeEncounters (四主題關卡內容 LVL-10 PROG-2-2131)');

    suite.test('四主題各一關，主鏈順序連續，戰法對應主題', () => {
        const encounters = themeEncounters();
        assert.equals(encounters.length, THEME_IDS.length);
        for (const themeId of THEME_IDS) {
            assert.equals(encounterOf(themeId).battleTactic, THEME_TACTIC[themeId], themeId);
        }
        const nodes = buildStageChainNodes(encounters as never, (id) => id);
        assert.equals(validateStageChainNodes(nodes).length, 0, '主鏈驗證');
    });

    suite.test('資料參照都存在：武將、背景、對策標籤；地形為 5×8', () => {
        const raw = readJson<unknown>('generals.json');
        const list = (Array.isArray(raw) ? raw : (raw as { generals: unknown[] }).generals) as Array<{ id: string }>;
        const generalIds = new Set(list.map((item) => item.id));
        const backgrounds = fs.readFileSync('assets/resources/data/scene-backgrounds.json', 'utf8');
        const tags = fs.readFileSync('assets/resources/data/tactic-counter-tags.json', 'utf8');
        for (const encounter of themeEncounters()) {
            assert.isTrue(generalIds.has(encounter.playerGeneralId), encounter.playerGeneralId);
            assert.isTrue(generalIds.has(encounter.enemyGeneralId), encounter.enemyGeneralId);
            assert.isTrue(backgrounds.includes(`"${encounter.backgroundId}"`), `背景 ${encounter.backgroundId}`);
            for (const tag of [...(encounter.requiredLoadout ?? []), ...(encounter.highlyRecommendedLoadout ?? [])]) {
                assert.isTrue(tags.includes(`"${tag}"`), `標籤 ${tag}`);
            }
            assert.equals(encounter.terrain!.length, 5, '路數');
            assert.isTrue(encounter.terrain!.every((row) => row.length === 8), '縱深');
        }
    });

    suite.test('情資表的關鍵物件與主題設定一致', () => {
        assert.equals(Object.keys(STAGE_THEME_INTEL).length, THEME_IDS.length);
        for (const themeId of THEME_IDS) {
            assert.equals(STAGE_THEME_INTEL[themeId].keyObject, STAGE_THEME_CONFIGS[themeId].keyObjectType, themeId);
        }
    });

    suite.test('開戰後主要互動物件都在棋盤上', () => {
        for (const themeId of THEME_IDS) {
            const ctrl = startBattle(encounterOf(themeId));
            assert.isTrue(countEffects(ctrl.state, KEY_OBJECT_MATCH[themeId]) > 0, `${themeId} 缺關鍵物件`);
        }
    });

    suite.test('四關都能跑完真實回合流程，不丟例外', () => {
        for (const themeId of THEME_IDS) {
            const ctrl = startBattle(encounterOf(themeId));
            for (let turn = 0; turn < MAX_TURNS; turn++) {
                if (ctrl.resolvePlayerTurn() !== 'ongoing') break;
                if (ctrl.resolveEnemyTurn() !== 'ongoing') break;
            }
            assert.isTrue(ctrl.state.units.size > 0, `${themeId} 有部隊上場`);
        }
    });

    suite.test('偵查面板標示主要互動物件與可回收收益', () => {
        const scout = buildLobbyScout(encounterOf('Canyon'), null, [], {});
        assert.isTrue(scout.intel.coreMechanics.includes('峽谷落石'), '主題');
        assert.isTrue(scout.intel.coreMechanics.includes('關鍵物件：落石機關'), '物件');
        assert.isTrue(scout.intel.coreMechanics.includes('可回收：石材／情報'), '收益');
    });

    suite.test('不是四主題的關卡不加補充文字', () => {
        assert.equals(stageThemeMechanicNotes(undefined).length, 0);
        assert.equals(stageThemeMechanicNotes('未知').length, 0);
    });

    return suite;
}
