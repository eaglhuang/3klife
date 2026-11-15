import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { planHallStage, type HallStageLayout } from '../assets/scripts/core/systems/HallStagePlanner';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { computeSubMenuCenterX } = require('../assets/scripts/ui/core/LobbyHallScreenBinder') as {
    computeSubMenuCenterX: (dockCenterX: number, hallWidth: number, menuWidth: number, margin?: number) => number;
};

export function createPlaytestRound3FixesSuite(): TestSuite {
    const suite = new TestSuite('PlaytestRound3Fixes (PROG-2-9041)');

    suite.test('computeSubMenuCenterX 對齊觸發底欄按鈕且受螢幕安全邊界限制', () => {
        // 中央按鈕
        assert.equals(0, computeSubMenuCenterX(0, 1920, 540, 24));
        // 左側與右側正常對齊
        assert.equals(-420, computeSubMenuCenterX(-420, 1920, 540, 24));
        assert.equals(420, computeSubMenuCenterX(420, 1920, 540, 24));
        // 極端邊界 clamp：1920/2 - 540/2 - 24 = 666
        assert.equals(-666, computeSubMenuCenterX(-900, 1920, 540, 24));
        assert.equals(666, computeSubMenuCenterX(900, 1920, 540, 24));
        // 非法值安全 fallback 為 0
        assert.equals(0, computeSubMenuCenterX(Number.NaN, 1920, 540));
        assert.equals(0, computeSubMenuCenterX(200, 0, 540));
    });

    suite.test('hall-stage-spots.json 所有點位頭頂與腳底留有安全空間，避免重疊天下勢力圖與底欄', () => {
        const spotsPath = path.resolve(__dirname, '../assets/resources/data/hall-map/hall-stage-spots.json');
        const layout = JSON.parse(fs.readFileSync(spotsPath, 'utf8')) as HallStageLayout;

        const placements = planHallStage(
            [
                { id: 'meng-huo', name: '孟獲' },
                { id: 'wu-ban', name: '吳班' },
                { id: 'zhang-nan', name: '張南' },
            ],
            layout,
        );
        assert.equals(3, placements.length);

        for (const spot of layout.spots) {
            const headY = spot.footY - spot.height;
            assert.isTrue(headY >= 640, `${spot.id} 頭頂 Y=${headY} 過高，可能與天下勢力圖重疊`);
            assert.isTrue(spot.footY <= 965, `${spot.id} 腳底 Y=${spot.footY} 過低，可能被底欄遮擋`);
        }
    });

    suite.test('UIPreviewBuilder._postBuildPass 先完成 Widget 對齊再執行 Layout 分佈', () => {
        const builderPath = path.resolve(__dirname, '../assets/scripts/ui/core/UIPreviewBuilder.ts');
        const src = fs.readFileSync(builderPath, 'utf8');
        const passIdx = src.indexOf('protected _postBuildPass(');
        assert.isTrue(passIdx !== -1, '找不到 _postBuildPass 函式');
        const body = src.slice(passIdx, passIdx + 600);
        const firstRealign = body.indexOf('this._realignAllWidgets(root)');
        const applyLayout = body.indexOf('this.layoutBuilder.applyPostLayoutAlignment(root)');
        const secondRealign = body.indexOf('this._realignAllWidgets(root)', applyLayout);
        assert.isTrue(firstRealign >= 0 && applyLayout > firstRealign, '應先執行 _realignAllWidgets 再執行 applyPostLayoutAlignment');
        assert.isTrue(secondRealign > applyLayout, '應在 applyPostLayoutAlignment 後再重算葉節點 Widget');
    });

    suite.test('LobbyScene 彈窗 host 與子選單皆具備 BlockInputEvents 與對齊處理', () => {
        const lobbyPath = path.resolve(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts');
        const src = fs.readFileSync(lobbyPath, 'utf8');
        assert.isTrue(src.includes('nonBlockingHosts'), '_mountPreviewScreenHost 應設定 nonBlockingHosts 並為彈窗掛載 BlockInputEvents');
        assert.isTrue(src.includes('computeSubMenuCenterX('), '_syncCityHubSubMenuLayer 應呼叫 computeSubMenuCenterX 對齊底欄按鈕');
        assert.isTrue(src.includes('getDockButtonCenterX('), '_syncCityHubSubMenuLayer 應查詢底欄按鈕中心座標');
    });

    return suite;
}
