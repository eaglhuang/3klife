// @spec-source → issue #2238；PROG-2-9403
import { assert, TestSuite } from './TestRunner';
import { EVENT_NAMES, Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { buildUltimateSkills } from '../assets/scripts/battle/views/BattleSceneLoader';
import { generalSpineConfig } from '../assets/scripts/battle/shared/UnitPresentationConfig';
import { needsStandeeFallback, standeeArtCandidates } from '../assets/scripts/battle/views/GeneralPortraitStandee';

const Module = require('module');
const _origLoad = Module._load;
Module._load = function (request: string, parent: unknown, isMain: boolean) {
    if (request === 'cc/env') return { EDITOR: false, PREVIEW: false };
    return _origLoad.call(this, request, parent, isMain);
};
const { UltimateSelectPopup } = require('../assets/scripts/ui/components/UltimateSelectPopup');

export function createIssue2238UltimatePopupAndStandeeSuite(): TestSuite {
    const suite = new TestSuite('Issue2238UltimatePopupAndStandee (奧義面板首開不空白、主將不退回藍色棋子)');

    suite.test('奧義小窗建置完成前 show()：只暫存技能並啟動建置，不先顯示空面板', () => {
        let built = 0;
        const node = { active: false };
        const fake = { _binder: null, _isBuilt: false, _pendingSkills: null as unknown, node, _build: () => { built += 1; } };
        const skills = [{ skillId: 'sun-ce-conqueror', label: '小霸王之威', costSp: 100 }];
        UltimateSelectPopup.prototype.show.call(fake, skills);
        assert.equals(false, node.active);          // 技能列還沒建好時不可顯示
        assert.equals(skills, fake._pendingSkills);  // 暫存，onReady 後重播
        assert.equals(1, built);                     // 不依賴 Cocos 自動 onLoad
    });

    suite.test('奧義小窗範本載入失敗後再 show()：提示玩家，不靜默無反應', () => {
        services().initialize();
        const toasts: string[] = [];
        const off = services().event.on(EVENT_NAMES.ShowToast, (d: { text: string }) => toasts.push(d.text));
        const fake = { _binder: null, _isBuilt: true, _pendingSkills: null as unknown, node: { active: false }, _build: () => undefined };
        UltimateSelectPopup.prototype.show.call(fake, [{ skillId: 'x', label: 'x', costSp: 1 }]);
        if (typeof off === 'function') off();
        assert.equals(1, toasts.length);
        assert.equals(false, fake.node.active);
    });

    suite.test('第 1 回合（未轉生）孫策、甘寧等主將的奧義清單不是空的', () => {
        services().initialize();
        const make = (id: string, skillId: string | null) => new GeneralUnit({
            id, name: id, faction: Faction.Player, skillId, ultimateSlots: [], maxSp: 100, rebirthCount: 0,
        } as unknown as GeneralConfig);
        assert.isTrue(buildUltimateSkills(make('sun-ce', 'sun-ce-conqueror')).length > 0);
        assert.isTrue(buildUltimateSkills(make('gan-ning', null)).length > 0);   // 沒有技能也有通用奧義
    });

    suite.test('沒有 Spine 的主將（孫策）一定走立繪站牌；有 Spine 且素材正常者不走', () => {
        const sunCe = generalSpineConfig('sun-ce');
        assert.equals(null, sunCe);
        assert.isTrue(needsStandeeFallback(sunCe?.path, () => false));
        const luBu = generalSpineConfig('lu-bu');
        assert.isTrue(luBu !== null);
        assert.equals(false, needsStandeeFallback(luBu!.path, () => false));
    });

    suite.test('Spine 素材載不起來的主將也退回立繪站牌，不是藍色棋子', () => {
        const luBu = generalSpineConfig('lu-bu')!;
        assert.isTrue(needsStandeeFallback(luBu.path, (p) => p === luBu.path));
    });

    suite.test('站牌圖片順序：Q 版戰鬥圖 → 立繪 → 頭像', () => {
        const list = standeeArtCandidates('sun-ce');
        const battleAt = list.findIndex((p) => p.endsWith('sun_ce_battle'));
        const portraitAt = list.findIndex((p) => p.endsWith('sun_ce_portrait'));
        const avatarAt = list.findIndex((p) => p.endsWith('sun_ce_avatar'));
        assert.isTrue(battleAt >= 0 && battleAt < portraitAt && portraitAt < avatarAt);
    });

    return suite;
}
