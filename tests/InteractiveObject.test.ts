/**
 * InteractiveObject — 戰場互動物件狀態機（doc_spec_0350；PROG-2-2036）
 */
import { assert, TestSuite } from './TestRunner';
import {
    BATTLE_RENDER_LAYERS, InteractiveObjectType, ObjectLifecycleState, createInteractiveObject, damageInteractiveObject, triggerInteractiveObject,
} from '../assets/scripts/battle/shared/InteractiveObject';

const at = { x: 3, y: 4 };

export function createInteractiveObjectSuite(): TestSuite {
    const suite = new TestSuite('InteractiveObject (互動物件 doc_spec_0350 PROG-2-2036)');

    suite.test('§4-2 糧倉 HP 歸零即 Damaged → Destroyed 並發日誌事件', () => {
        let camp = createInteractiveObject('camp1', InteractiveObjectType.CampTarget, at);
        assert.equals(2000, camp.maxHp);
        const hit = damageInteractiveObject(camp, 1500);
        assert.equals(ObjectLifecycleState.Damaged, hit.entity.state);
        assert.equals(null, hit.outcome);
        camp = hit.entity;
        const kill = damageInteractiveObject(camp, 9999);
        assert.equals(ObjectLifecycleState.Destroyed, kill.entity.state);
        assert.isTrue(kill.outcome?.kind === 'camp-destroyed');
        if (kill.outcome?.kind === 'camp-destroyed') {
            assert.equals(-20, kill.outcome.enemyMoraleDelta);
            assert.equals(500, kill.outcome.salvageGrain);
            assert.equals('camp-target-destroyed', kill.outcome.logEvent);
        }
        assert.equals(null, damageInteractiveObject(kill.entity, 10).outcome);
    });

    suite.test('§4-3 落石與水閘擊破產生地格效果', () => {
        const rock = damageInteractiveObject(createInteractiveObject('r', InteractiveObjectType.Rockfall, at), 800);
        assert.equals(ObjectLifecycleState.Triggered, rock.entity.state);
        assert.isTrue(rock.outcome?.kind === 'tile-effect' && rock.outcome.tiles === 3 && rock.outcome.durationTurns === 2);
        const gate = triggerInteractiveObject(createInteractiveObject('g', InteractiveObjectType.Floodgate, at, 'ForceMove(Water)'));
        assert.isTrue(gate.outcome?.kind === 'tile-effect' && gate.outcome.pushTiles === 4);
    });

    suite.test('§4-3 陷阱踏入立即觸發一次', () => {
        const trap = triggerInteractiveObject(createInteractiveObject('t', InteractiveObjectType.TrapCluster, at));
        assert.isTrue(trap.outcome?.kind === 'trap-sprung' && trap.outcome.troopLossRatio === 0.15 && trap.outcome.rootTurns === 1);
        assert.equals(null, triggerInteractiveObject(trap.entity).outcome);
    });

    suite.test('§1 四層 Z 值由低到高', () => {
        assert.isTrue(BATTLE_RENDER_LAYERS.background.max < BATTLE_RENDER_LAYERS.decal.min);
        assert.isTrue(BATTLE_RENDER_LAYERS.decal.max < BATTLE_RENDER_LAYERS.standee.min);
        assert.isTrue(BATTLE_RENDER_LAYERS.standee.max < BATTLE_RENDER_LAYERS.hud.min);
    });

    return suite;
}
