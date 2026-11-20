/**
 * GachaShowcaseBanner.test.ts — 轉蛋展示到誰才跳誰的提示橫幅（PROG-2-9143）
 */
import { TestSuite, assert } from './TestRunner';
import { showcaseBannerLines, showcaseDesc, shouldSwitchShowcase } from '../assets/scripts/ui/core/GachaShowcaseBanner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

export function createGachaShowcaseBannerSuite(): TestSuite {
    const suite = new TestSuite('GachaShowcaseBanner (展示誰才跳誰 PROG-2-9143)');
    const lingqi = { id: 'lu_ling_qi', name: '呂玲綺', gender: '女' };
    const menghuo = { id: 'meng_huo', name: '孟獲', gender: '男' };

    const ctx = (added: string[], rebirths: Array<{ id: string; overflow: boolean; rebirthCount: number; attributeCap: number }> = []) => ({
        addedIds: new Set(added),
        rebirths,
        generalOf: (id: string) => ({ lu_ling_qi: lingqi, meng_huo: menghuo, liu_feng: { id: 'liu_feng', name: '劉封' } } as Record<string, { id: string; name: string }>)[id],
        ultimateNameOf: () => undefined,
    });

    suite.test('只有展示到那位新入名冊的女將才有她的提示；展示孟獲不會出現呂玲綺', () => {
        const c = ctx(['lu_ling_qi', 'meng_huo']);
        assert.equals(0, showcaseBannerLines(menghuo, c).filter((line) => line.includes('呂玲綺')).length);
        assert.isTrue(showcaseBannerLines(lingqi, c).some((line) => line.startsWith('呂玲綺 應召而來')));
    });

    suite.test('沒新入名冊（重複持有）不說應召而來', () => {
        assert.equals(0, showcaseBannerLines(lingqi, ctx([])).length);
    });

    suite.test('轉生台詞與突破只跟轉生的那位走，展示別人不會出現', () => {
        const c = ctx([], [{ id: 'liu_feng', overflow: false, rebirthCount: 2, attributeCap: 1100 }]);
        const liuFeng = { id: 'liu_feng', name: '劉封' };
        const own = showcaseBannerLines(liuFeng, c);
        assert.isTrue(own.some((line) => line.startsWith('劉封再臨')));
        assert.isTrue(own.some((line) => line.includes('屬性上限突破')));
        assert.equals(0, showcaseBannerLines(menghuo, c).length);
    });

    suite.test('同一位不重複切換，換人才切換', () => {
        assert.isFalse(shouldSwitchShowcase('meng_huo', 'meng_huo'));
        assert.isTrue(shouldSwitchShowcase('meng_huo', 'lu_ling_qi'));
        assert.isTrue(shouldSwitchShowcase(null, 'meng_huo'));
    });

    suite.test('下方台詞：有表用表，沒有退描述，再沒有用通用句', () => {
        assert.equals('「心服口服」', showcaseDesc(menghuo, { meng_huo: '心服口服' }));
        assert.equals('蠻王', showcaseDesc({ ...menghuo, description: '蠻王' }, {}));
        assert.isTrue(showcaseDesc(menghuo, {}).length > 0);
    });

    suite.test('入冊後不再整批丟武將提示：LobbyScene 不再呼叫 gachaFemaleLines／rebirthVoiceLines', () => {
        const lobby = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isFalse(lobby.includes('gachaFemaleLines(') || lobby.includes('rebirthVoiceLines('));
    });

    return suite;
}
