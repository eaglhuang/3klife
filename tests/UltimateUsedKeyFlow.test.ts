/**
 * UltimateUsedKeyFlow.test.ts — 奧義選單「已用」以 ultimateId 為準（QA，PROG-2-1483）
 *
 * 同一武將的多個奧義共用同一個 battleSkillId（master 資料如此），戰場端 E-9 限用 key 是 ultimateId；
 * 選單灰化若只比 skillId，施放其中一個會把全部奧義灰化。這裡走真實施放 → 事件 → 選單標記。
 *
 * Unity 對照：技能欄的冷卻要綁「技能槽 id」，不能綁共用的 Ability 資產，否則同資產的槽會一起進冷卻。
 */
import { EVENT_NAMES, Faction } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { buildUltimateSkills, seedUltimateDataForHeadless } from '../assets/scripts/battle/views/BattleSceneLoader';
import { markUsedUltimates, ultimateUsageKey } from '../assets/scripts/ui/core/UltimateUsage';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

const SHARED_SKILL = 'cao-cao-revelry';
const ULT_A = 'test-ult-a';
const ULT_B = 'test-ult-b';

function player(): GeneralUnit {
    return new GeneralUnit({
        id: 'p', name: 'p', faction: Faction.Player, hp: 100000, maxSp: 100, initialSp: 100, str: 60, int: 60, lea: 60,
        skillId: SHARED_SKILL, battlePrimarySkillId: SHARED_SKILL, tacticSlots: [],
        ultimateSlots: [
            { slot: 1, ultimateId: ULT_A, unlockReincarnation: 1 },
            { slot: 2, ultimateId: ULT_B, unlockReincarnation: 1 },
        ],
        rebirthCount: 1,
    });
}

export function createUltimateUsedKeyFlowSuite(): TestSuite {
    const suite = new TestSuite('UltimateUsedKeyFlow (奧義已用以 ultimateId 為準 PROG-2-1483)');

    suite.test('兩個奧義共用同一戰法：施放 A 後只有 A 標為已用，B 仍可點', () => {
        seedUltimateDataForHeadless([
            { id: ULT_A, name: 'A', slot: 1, unlockReincarnation: 1, battleSkillId: SHARED_SKILL },
            { id: ULT_B, name: 'B', slot: 2, unlockReincarnation: 1, battleSkillId: SHARED_SKILL },
        ], {});
        services().initialize();
        services().session.setRandomSource(() => 0.99);
        const hero = player();
        const ctrl = new BattleController();
        ctrl.initBattle(hero, new GeneralUnit({
            id: 'e', name: 'e', faction: Faction.Enemy, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60,
            tacticSlots: [], ultimateSlots: [], rebirthCount: 1,
        }));
        ctrl.placeGeneralOnBoard(2, 2);
        hero.currentSp = 100;

        const used = new Set<string>();
        const off = services().event.on(EVENT_NAMES.GeneralSkillUsed, (d?: { faction: Faction; skillId?: string; ultimateId?: string; sourceType?: SkillSourceType }) => {
            if (d?.faction === Faction.Player && d.sourceType === SkillSourceType.Ultimate && d.skillId) {
                used.add(ultimateUsageKey({ skillId: d.skillId, ultimateId: d.ultimateId }));
            }
        }) as () => void;
        const items = buildUltimateSkills(hero);
        assert.equals(2, items.length);
        assert.equals(items[0].skillId, items[1].skillId, '兩個奧義共用同一個戰法');

        assert.isTrue(ctrl.triggerPlayerBattleSkill(SHARED_SKILL, SkillSourceType.Ultimate, { ultimateId: ULT_A }));
        off();

        const marked = markUsedUltimates(items, used);
        assert.isTrue(marked.find((m) => m.ultimateId === ULT_A)!.used, 'A 已用');
        assert.isFalse(marked.find((m) => m.ultimateId === ULT_B)!.used, 'B 仍可點');
    });

    suite.test('沒有 ultimateId 的項目退回以 skillId 比對（舊路徑不變）', () => {
        const marked = markUsedUltimates([{ skillId: 'x' }, { skillId: 'y' }], new Set(['x']));
        assert.isTrue(marked[0].used);
        assert.isFalse(marked[1].used);
    });

    return suite;
}
