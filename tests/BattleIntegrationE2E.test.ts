/**
 * BattleIntegrationE2E.test.ts — 戰場整合流程（QA，PROG-2-0699）
 * 連勝累積（AIS-11）→ 難度表倍率（AIS-12）→ 多回合戰鬥中敵方奧義（AIS-07）與關係事件 → 戰後存讀檔。
 */
import * as fs from 'fs';
import * as path from 'path';
import { EVENT_NAMES, Faction, SP_PER_KILL, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { aiDifficultyEntryOf, parseAiDifficultyTable, type AiDifficultyEntry } from '../assets/scripts/core/systems/AiDifficultyTable';
import { adaptiveScaleOf } from '../assets/scripts/core/systems/AiAdaptiveDifficulty';
import { aiSpGainPerKill } from '../assets/scripts/core/systems/AiSpCharge';
import { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import type { RelationEventHit } from '../assets/scripts/core/systems/RelationEvents';
import type { TallyBattleInfo } from '../assets/scripts/core/systems/TigerTallyStar';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { sys } from 'cc';

const DIFFICULTY_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json');
const SKILL_ID = 'cao-cao-tactics';
const ULTIMATE_ID = 'test-ultimate';
const TABLE = HistoricalPairTable.load({
    relations: [{ relationId: 'T_SWORN', templateA: 'liu-bei', templateB: 'guan-yu', type: 'SWORN', epBonus: 15, extraEffects: {}, loreKey: 'LORE_T' }],
}).table;

function entryOf(difficulty: 'easy' | 'normal' | 'hard'): AiDifficultyEntry {
    const { table } = parseAiDifficultyTable(JSON.parse(fs.readFileSync(DIFFICULTY_PATH, 'utf8')));
    return aiDifficultyEntryOf(table!, difficulty);
}

function hero(id: string, faction: Faction, ultimate: boolean): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 100, str: 60, int: 90, lea: 90,
        skillId: SKILL_ID, battlePrimarySkillId: SKILL_ID, tacticSlots: [],
        ultimateSlots: ultimate ? [{ slot: 1, ultimateId: ULTIMATE_ID, unlockReincarnation: 1 }] : [],
        rebirthCount: 1,
    });
}

function troop(id: string, faction: Faction, lane: number, row: number, tallyId: string | null = null): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100000, attack: 1, defense: 1, moveRange: 0, attackRange: 0 });
    unit.moveTo(lane, row);
    unit.tallyId = tallyId;
    return unit;
}

function build(adapter: MemoryStorageAdapter): GameSession {
    const s = new GameSession(7);
    s.setRosterStore(new InMemoryRosterStore([]));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

/** 開一場戰役：敵方帶奧義、精力滿；關係事件帳本綁在 session 上 */
function openBattle(session: GameSession, stageId: string, entry: AiDifficultyEntry): { ctrl: BattleController; enemy: GeneralUnit } {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const enemy = hero('e', Faction.Enemy, true);
    const ctrl = new BattleController();
    ctrl.initBattle(hero('p', Faction.Player, false), enemy);
    ctrl.configureAiDifficulty(entry);
    ctrl.bindRelationEvents(`battle:${stageId}`, session.relationEvents);
    ctrl.historicalPairs = TABLE;
    ctrl.tallyInfoOf = (tallyId) => ({ sourceTemplateId: tallyId, star: 1, templateId: null } as unknown as TallyBattleInfo);
    ctrl.placeGeneralOnBoard(2, 2);
    enemy.currentSp = enemy.maxSp;
    return { ctrl, enemy };
}

function runTurn(ctrl: BattleController): void {
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 100000;
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

export function createBattleIntegrationE2ESuite(): TestSuite {
    const suite = new TestSuite('BattleIntegrationE2E (戰場整合流程 PROG-2-0699)');

    suite.test('連勝→倍率→多回合奧義與關係事件→戰後存讀檔，下一場延續', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const session = build(adapter);
        session.startNewGame(5);
        const hard = entryOf('normal'); // 奧義（MEDIUM）以我方存活 >3 支為條件，用 NORMAL 才看得到施放

        // 1. 兩場勝利還沒達門檻：倍率維持基礎值
        await session.recordBattle([], 'player-win', { stageId: 'stage-a' });
        await session.recordBattle([], 'player-win', { stageId: 'stage-b' });
        assert.equals(hard.statScale, adaptiveScaleOf(hard.statScale, session.aiAdaptiveStreak), '2 連勝不調整');
        await session.recordBattle([], 'player-win', { stageId: 'stage-c' });
        const boosted = adaptiveScaleOf(hard.statScale, session.aiAdaptiveStreak);
        assert.equals(Math.round((hard.statScale + 0.1) * 100) / 100, boosted, '3 連勝上調 0.1');

        // 2. 難度表的擊殺能量倍率進戰場，HARD 比 EASY 多
        const { ctrl, enemy } = openBattle(session, 'stage-d', hard);
        assert.equals(hard.spGainModifier, ctrl.state.aiSpGainModifier);
        assert.equals(Math.floor(SP_PER_KILL * hard.spGainModifier), aiSpGainPerKill(ctrl.state.aiSpGainModifier));
        assert.isTrue(aiSpGainPerKill(entryOf('hard').spGainModifier) > aiSpGainPerKill(entryOf('easy').spGainModifier), 'HARD 擊殺充能高於 EASY');

        // 3. 多回合：每回合部署一支，第 2 回合湊成義兄弟；敵方奧義只在精力滿時放一次
        let ultimates = 0;
        const hits: RelationEventHit[] = [];
        const offSkill = services().event.on(EVENT_NAMES.GeneralSkillUsed, (d?: { faction?: Faction; sourceType?: SkillSourceType }) => {
            if (d?.faction === Faction.Enemy && d.sourceType === SkillSourceType.Ultimate) ultimates++;
        }) as () => void;
        const offRel = services().event.on(EVENT_NAMES.RelationEventTriggered, (d?: { hit: RelationEventHit }) => { if (d) hits.push(d.hit); }) as () => void;
        const plan: Array<Array<[string, number, string | null]>> = [
            [['p1', 0, 'liu-bei'], ['p3', 3, null], ['p4', 4, null]],
            [['p2', 1, 'guan-yu']],
            [],
            [],
        ];
        const ultimatesAfter: number[] = [];
        for (let turn = 0; turn < plan.length; turn++) {
            for (const [id, lane, tally] of plan[turn]) ctrl.state.addUnit(troop(id, Faction.Player, lane, 1, tally));
            ctrl.checkBattleRelationEvents();
            if (turn === 1) enemy.currentSp = enemy.maxSp; // 第 1 回合戰法已用掉精力；第 2 回合假設充滿（擊殺充能）
            runTurn(ctrl);
            ultimatesAfter.push(ultimates);
            if (turn === 0) assert.equals(0, hits.length, '第 1 回合只有劉備，沒有關係事件');
            if (turn === 1) assert.equals(1, hits.length, '第 2 回合關羽到場，湊成義兄弟');
        }
        offSkill();
        offRel();
        assert.equals(1, hits.length, '關係事件整場只一次');
        assert.equals(0, ultimatesAfter[0], '第 1 回合我方存活 3 支（邊界不成立），不放奧義');
        assert.equals(1, ultimatesAfter[1], '第 2 回合存活 4 支，放一次奧義');
        assert.equals(1, ultimatesAfter[3], '之後精力已用掉，不再重複放');
        assert.isTrue(enemy.currentSp <= enemy.maxSp);

        // 4. 戰後結算：第 4 場勝利，存讀檔
        await session.recordBattle([], 'player-win', { stageId: 'stage-d' });
        assert.equals(4, session.aiAdaptiveStreak.consecutiveWins);
        await session.save();
        const restored = build(adapter);
        assert.isTrue(await restored.load());
        assert.equals(4, restored.aiAdaptiveStreak.consecutiveWins, '讀檔後連勝延續');
        assert.equals(boosted, adaptiveScaleOf(hard.statScale, restored.aiAdaptiveStreak), '下一場倍率延續');

        // 5. 讀檔後重進同一關：義兄弟事件不重播；失敗一場後連勝歸零、倍率回基礎
        const again = openBattle(restored, 'stage-d', hard);
        again.ctrl.state.addUnit(troop('q1', Faction.Player, 0, 1, 'liu-bei'));
        again.ctrl.state.addUnit(troop('q2', Faction.Player, 1, 1, 'guan-yu'));
        assert.equals(0, again.ctrl.checkBattleRelationEvents().length, '讀檔後同一關不重播');
        await restored.recordBattle([], 'enemy-win', { stageId: 'stage-e' });
        assert.equals(hard.statScale, adaptiveScaleOf(hard.statScale, restored.aiAdaptiveStreak), '失敗後倍率回基礎');
    });

    return suite;
}
