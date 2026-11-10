import { readFileSync } from 'fs';
import { join } from 'path';
import { TestSuite, assert } from './TestRunner';

export function createLobbyPortraitContractSuite(): TestSuite {
    const suite = new TestSuite('LobbyPortraitContract');
    for (const file of ['lobby-main-screen.layout.json', 'lobby-main-screen.json']) {
        suite.test(`${file} 主將圖層保留控制器需要的專用宿主，不留靜態關羽副本`, () => {
            const layout = JSON.parse(readFileSync(join(__dirname, '../assets/resources/ui-spec/layouts', file), 'utf8'));
            const owners: any[] = [];
            const walk = (n: any): void => {
                if (n.skinLayers?.some((l: any) => l.layerId === 'LobbyMainScreen_div_21_LobbyMainScreen_img_2')) owners.push(n);
                for (const child of n.children ?? []) walk(child);
            };
            walk(layout.root);
            assert.equals(1, owners.length);
            assert.equals('LobbyMainScreen_div_21', owners[0].name);
            assert.equals(402, owners[0].width);
            assert.equals(720, owners[0].height);
        });
    }
    return suite;
}
