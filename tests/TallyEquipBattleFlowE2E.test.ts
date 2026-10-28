/**
 * TallyEquipBattleFlowE2E.test.ts — 插虎符→出戰→存讀檔流程（QA，PROG-2-1480）
 * 登記白馬虎符、裝到武將（發出插卡事件）→ 出陣綁定被動（射程 2、移動 +1）→ 多回合效果不消失
 * → 戰後經驗結算 → 存檔、換新 Session 讀檔 → 持有還在，重開一場被動依舊生效。
 */
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { tallyBattleInfoOf } from '../assets/scripts/core/systems/TigerTallyStar';
import { TestSuite, assert } from './TestRunner';
import { sys } from 'cc';

const TEMPLATE = 'tiger-tally-bai-ma';

function card(): TigerTallyCard {
    return { uid: 'tally-1', templateId: TEMPLATE, sourceGeneralUid: 'src', quality: 'SR', score: 0, source: 'reward', producedSeason: 1, troopType: 'cavalry' };
}

function build(adapter: MemoryStorageAdapter): GameSession {
    const s = new GameSession(7);
    s.setRosterStore(new InMemoryRosterStore([{ id: 'g-a', name: 'g-a', status: 'alive' } as unknown as GeneralConfig]));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

function hero(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics', tacticSlots: [], ultimateSlots: [], rebirthCount: 0,
    });
}

function openBattle(session: GameSession): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(hero('p', Faction.Player), hero('e', Faction.Enemy));
    ctrl.tallyInfoOf = (uid) => {
        const c = session.tallyCards[uid];
        return c ? tallyBattleInfoOf(c) : null;
    };
    ctrl.placeGeneralOnBoard(2, 2);
    return ctrl;
}

function runTurn(ctrl: BattleController): void {
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 100000;
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

export function createTallyEquipBattleFlowE2ESuite(): TestSuite {
    const suite = new TestSuite('TallyEquipBattleFlowE2E (插虎符出戰流程 PROG-2-1480)');

    suite.test('插卡→出陣被動生效（多回合）→戰後結算→存讀檔後持有與被動仍在', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const session = build(adapter);
        session.startNewGame(5);

        // 1. 登記、插卡：發出插卡事件，持有者寫入
        await session.registerTallyCards([card()]);
        const inserted: Array<{ cardUid: string; generalId: string }> = [];
        const off = services().event.on(EVENT_NAMES.TallySpiritInserted, (d?: { cardUid: string; generalId: string }) => { if (d) inserted.push(d); }) as () => void;
        const equipped = await session.equipTally('tally-1', 'g-a');
        off();
        assert.isTrue(equipped?.ok === true, '插卡成功');
        assert.equals(1, inserted.length, '插卡事件只發一次');
        assert.equals('g-a', session.tallyOf('g-a') ? 'g-a' : '', '武將持有虎符');
        assert.equals('tally-1', session.tallyOf('g-a') ?? '');

        // 2. 出陣：被動綁上（對照沒帶虎符的騎兵）
        const ctrl = openBattle(session);
        const plain = ctrl.tryDeployTroop(TroopType.Cavalry, 0);
        assert.isTrue(plain.ok, '一般騎兵出陣：' + String(plain.reason));
        runTurn(ctrl); // 每回合只能出陣一隊
        const withTally = ctrl.tryDeployTroop(TroopType.Cavalry, 1, undefined, { tally: { cardUid: 'tally-1', templateId: TEMPLATE } });
        assert.isTrue(withTally.ok, '虎符騎兵出陣：' + String(withTally.reason));
        const bare = plain.unit!;
        const unit = withTally.unit!;
        assert.equals('tally-1', unit.tallyId ?? '');
        assert.equals(TEMPLATE, unit.tallyTemplateId ?? '');
        assert.equals(2, unit.attackRange, '騎射合一：射程 2');
        assert.isTrue(bare.attackRange < 2, '對照組射程低於 2');
        assert.equals(bare.getEffectiveMoveRange() + 1, unit.getEffectiveMoveRange(), '移動力 +1');
        assert.equals(1, ctrl.deployedTallyIds.length);

        // 3. 多回合：被動不會在回合結算中消失
        for (let turn = 0; turn < 3; turn++) {
            runTurn(ctrl);
            const alive = ctrl.state.units.get(unit.id);
            if (!alive || alive.currentHp <= 0) break;
            assert.equals(2, alive.attackRange, `第 ${turn + 1} 回合後射程仍為 2`);
            assert.equals('tally-1', alive.tallyId ?? '');
        }

        // 4. 戰後結算虎符經驗並存檔
        await session.recordBattle([], 'player-win', { stageId: 'stage-t', deployedTallyIds: ctrl.deployedTallyIds });
        const expAfter = session.tallyCards['tally-1'].battleExp ?? 0;
        assert.isTrue(expAfter > 0, '勝利後虎符累積經驗');
        await session.save();

        // 5. 換新 Session 讀檔：持有、經驗還在，重開一場被動依舊
        const restored = build(adapter);
        assert.isTrue(await restored.load());
        assert.equals('tally-1', restored.tallyOf('g-a') ?? '', '讀檔後持有仍在');
        assert.equals(expAfter, restored.tallyCards['tally-1'].battleExp ?? 0, '讀檔後經驗延續');
        const ctrl2 = openBattle(restored);
        const again = ctrl2.tryDeployTroop(TroopType.Cavalry, 1, undefined, { tally: { cardUid: 'tally-1', templateId: TEMPLATE } });
        assert.isTrue(again.ok);
        assert.equals(2, again.unit!.attackRange, '讀檔後重開一場，射程仍為 2');
        assert.equals(TEMPLATE, again.unit!.tallyTemplateId ?? '');
    });

    return suite;
}
