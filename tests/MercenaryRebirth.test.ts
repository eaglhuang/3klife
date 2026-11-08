import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    bondedMercenaryGeneralIds, duplicatePopupGeneralIds, mercenaryRebirthCapBonus, mercenaryRebirthStatCap,
} from '../assets/scripts/core/systems/MercenaryRebirth';
import { rebirthBreakthroughLine } from '../assets/scripts/core/systems/NumericalScriptLines';

const general = (id: string): GeneralConfig => ({ id, name: id, faction: 'shu', hp: 100 }) as unknown as GeneralConfig;

function sessionWithBonded(): GameSession {
    const session = new GameSession(1);
    session.setMercenaries({
        mercenaries: [
            { uid: 'm1', daysLeft: 0, bond: 6, status: 'Bonded', generalId: 'gen-merc' },
            { uid: 'm2', daysLeft: 2, bond: 1, status: 'Trial', generalId: 'gen-trial' },
        ],
        upkeep: [],
        cooldowns: [],
    });
    return session;
}

export function createMercenaryRebirthSuite(): TestSuite {
    const suite = new TestSuite('MercenaryRebirth (MERC-09 結義傭兵自動二轉)');

    suite.test('只有已結義傭兵算數，試用與沒有武將 id 的不算', () => {
        const ids = bondedMercenaryGeneralIds([
            { status: 'Bonded', generalId: 'a' }, { status: 'Trial', generalId: 'b' }, { status: 'Bonded' }, { status: 'Expired', generalId: 'c' },
        ]);
        assert.equals('a', [...ids].join());
    });

    suite.test('每轉上限 +5，五轉 125（+25%），超出與缺值夾回', () => {
        assert.equals(110, mercenaryRebirthStatCap(2));
        assert.equals(125, mercenaryRebirthStatCap(5));
        assert.equals(125, mercenaryRebirthStatCap(9));
        assert.equals(105, mercenaryRebirthStatCap(undefined));
        assert.equals(0.25, mercenaryRebirthCapBonus(5));
        assert.equals(0.05, mercenaryRebirthCapBonus(2) - mercenaryRebirthCapBonus(1));
    });

    suite.test('分流彈窗名單排除已結義傭兵', () => {
        const ids = duplicatePopupGeneralIds(['a', 'b'], new Set(['a']));
        assert.equals('b', [...ids].join());
    });

    suite.test('會話：結義傭兵再抽到同名自動轉生並帶新上限，一般武將不帶', async () => {
        const session = sessionWithBonded();
        await session.addGenerals([general('gen-merc'), general('gen-other')]);
        assert.equals('gen-other', [...session.duplicatePopupOwnedIds()].join());
        const result = session.enrollGenerals([general('gen-merc'), general('gen-other')], { rebirthOnDuplicate: true });
        const merc = result.rebirths.find((entry) => entry.id === 'gen-merc')!;
        const other = result.rebirths.find((entry) => entry.id === 'gen-other')!;
        assert.equals(2, merc.rebirthCount);
        assert.equals(110, merc.mercenaryStatCap!);
        assert.equals(2, other.rebirthCount);
        assert.isTrue(other.mercenaryStatCap === undefined);
        assert.equals(2, session.roster.find((entry) => entry.id === 'gen-merc')!.rebirthCount!);
    });

    suite.test('突破台詞：結義傭兵顯示新上限，一般武將維持原本的表', () => {
        assert.equals('第 1 次轉生！屬性上限突破至 110！', rebirthBreakthroughLine([{ overflow: false, rebirthCount: 2, attributeCap: 1100, mercenaryStatCap: 110 }]));
        assert.equals('第 1 次轉生！屬性上限突破至 1100！', rebirthBreakthroughLine([{ overflow: false, rebirthCount: 2, attributeCap: 1100 }]));
    });

    return suite;
}
