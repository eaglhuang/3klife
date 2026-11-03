/**
 * DuelAttackInjectedFormula — 單挑攻擊力走注入的 svc.formula（PROG-2-1554）
 *
 * 單挑結算函式收到 svc 參數，骰子走 svc.formula；武將沒有化身單位時，攻擊力也必須走同一個 svc，
 * 不能偷偷回頭用全域 services().formula。
 *
 * Unity 對照：像元件透過 [SerializeField] 注入依賴，卻在方法裡又 GetComponent 抓另一份，注入等於擺設。
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleGeneralDuelFlow } from '../assets/scripts/battle/runtime/BattleGeneralDuelFlow';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

const STUB_ATTACK = 77;

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 80, int: 80, lea: 80,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

export function createDuelAttackInjectedFormulaSuite(): TestSuite {
    const suite = new TestSuite('DuelAttackInjectedFormula (單挑攻擊力走注入 formula PROG-2-1554)');

    suite.test('單挑無化身單位時，攻擊力只走注入的 svc.formula，不碰全域 services().formula', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('challenger', Faction.Player), general('defender', Faction.Enemy));

        const flow = new BattleGeneralDuelFlow({ state: ctrl.state, onUnitKilled: () => {} });
        const globalFormula = services().formula;
        const originalCalc = globalFormula.calculateGeneralAttack;
        let globalCalls = 0;
        globalFormula.calculateGeneralAttack = (...args) => {
            globalCalls += 1;
            return originalCalc.apply(globalFormula, args);
        };

        const injectedCalls: unknown[] = [];
        const injected = {
            ...services(),
            formula: {
                calculateGeneralAttack: (params: unknown) => {
                    injectedCalls.push(params);
                    return STUB_ATTACK;
                },
                rollDodge: () => false,
                rollCrit: () => false,
            },
        } as unknown as ReturnType<typeof services>;

        try {
            // 私有方法：透過 bracket 存取，直接以注入的 svc 結算單挑。
            flow['resolveAcceptedGeneralDuel'](Faction.Player, Faction.Enemy, injected);
        } finally {
            globalFormula.calculateGeneralAttack = originalCalc;
        }

        assert.isTrue(injectedCalls.length > 0, '注入的 formula 應被用來算攻擊力');
        assert.equals(0, globalCalls, '全域 services().formula 不應被用來算單挑攻擊力');
    });

    return suite;
}
