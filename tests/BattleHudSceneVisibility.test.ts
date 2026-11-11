// @spec-source → Issue #2086；PROG-2-2233（防禦性場景防護）
import { TestSuite, assert } from './TestRunner';
import { SceneName } from '../assets/scripts/core/config/Constants';
const { Node, director } = require('cc');
const { BattleHUDComposite } = require('../assets/scripts/ui/components/BattleHUDComposite');

export function createBattleHudSceneVisibilitySuite(): TestSuite {
    const suite = new TestSuite('BattleHudSceneVisibility');
    suite.test('開場／載入場景不得自動掛載或顯示戰鬥 HUD', async () => {
        const old = director.getScene;
        try {
            for (const name of [SceneName.Login, SceneName.Loading, SceneName.Lobby]) {
                const scene = { name }; director.getScene = () => scene;
                const hud = new Node('HUD').addComponent(BattleHUDComposite); hud.node.scene = scene;
                let mounts = 0; hud.mount = async () => { mounts++; };
                await hud.show(); assert.equals(0, mounts); assert.isFalse(hud.node.active);
            }
        } finally { director.getScene = old; }
    });
    suite.test('活動戰場並行 show 只建一次；離場後遲到的 mount 不可重新啟用', async () => {
        const old = director.getScene;
        try {
            const scene = { name: SceneName.Battle }; director.getScene = () => scene;
            const hud = new Node('HUD').addComponent(BattleHUDComposite); hud.node.scene = scene;
            let mounts = 0, subscriptions = 0, finish!: () => void;
            hud.mount = () => { mounts++; return new Promise<void>(resolve => { finish = resolve; }); };
            hud['_subscribeEvents'] = () => { subscriptions++; }; hud['_replayPendingCalls'] = () => undefined;
            const a = hud.show(), b = hud.show();
            assert.equals(1, mounts); assert.isFalse(hud.node.active);
            hud['_hideForSceneLeave'](); finish(); await Promise.all([a, b]);
            assert.isFalse(hud.node.active); assert.equals(0, subscriptions);
        } finally { director.getScene = old; }
    });
    suite.test('活動戰場完成掛載才顯示；同名的非活動場景也不得顯示', async () => {
        const old = director.getScene;
        try {
            const scene = { name: SceneName.Battle }; director.getScene = () => scene;
            const hud = new Node('HUD').addComponent(BattleHUDComposite); hud.node.scene = scene;
            hud.mount = async () => undefined; hud['_subscribeEvents'] = () => undefined; hud['_replayPendingCalls'] = () => undefined;
            await hud.show(); assert.isTrue(hud.node.active);
            director.getScene = () => ({ name: SceneName.Battle });
            await hud.show(); assert.isFalse(hud.node.active);
        } finally { director.getScene = old; }
    });
    return suite;
}
