/**
 * BloodlineMirrorScreenRoutes — 命鏡各 state 的獨立 screen 與路由（BML-04；PROG-2-2066）
 *
 * 規格：升星／二轉（ascension）與未持有預覽（unowned-preview）可由 screen 路由進入。
 * 檢查 content 每個掛了 screenIds 的 state，都有一個 screen 用同一個 uiId 並讀這個 state，
 * 該 screen 在 runtime-state-registry 登記、預設 state 一致，且 UIConfig 有對應 UIID。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { UIConfig, UIID } from '../assets/scripts/core/config/UIConfig';

const UI_SPEC_DIR = path.resolve(__dirname, '../assets/resources/ui-spec');
const CONTENT_SOURCE = 'bloodline-mirror-states-v1';

interface Screen {
    id: string;
    uiId: string;
    content?: { source: string; state: string };
}

function readJson<T>(relative: string): T {
    return JSON.parse(fs.readFileSync(path.join(UI_SPEC_DIR, relative), 'utf8')) as T;
}

function mirrorScreens(): Screen[] {
    return fs.readdirSync(path.join(UI_SPEC_DIR, 'screens'))
        .filter((name) => name.endsWith('.json'))
        .map((name) => readJson<Screen>(`screens/${name}`))
        .filter((screen) => screen.content?.source === CONTENT_SOURCE);
}

export function createBloodlineMirrorScreenRoutesSuite(): TestSuite {
    const suite = new TestSuite('BloodlineMirrorScreenRoutes (命鏡 state 獨立 screen BML-04 PROG-2-2066)');
    const states = readJson<{ states: Record<string, { screenIds: string[] }> }>(`content/${CONTENT_SOURCE}.json`).states;
    const routes = readJson<{ routes: Array<{ screenId: string; contentSource: string; defaultState: string }> }>('runtime-state-registry.json').routes;

    suite.test('升星與未持有預覽各有獨立 screen', () => {
        assert.equals('BloodlineMirrorAscension', states.ascension.screenIds.join(','));
        assert.equals('BloodlineMirrorUnowned', states['unowned-preview'].screenIds.join(','));
    });

    suite.test('state 的 screenIds 都對到讀同一 state 的 screen，UIConfig 有對應 UIID', () => {
        const screens = mirrorScreens();
        for (const [state, def] of Object.entries(states)) {
            for (const uiId of def.screenIds) {
                const screen = screens.find((s) => s.uiId === uiId);
                assert.isTrue(!!screen, `${state} -> ${uiId} 沒有 screen`);
                assert.equals(state, screen!.content!.state, uiId);
                assert.isTrue(!!UIConfig[uiId as UIID], `UIConfig 缺 ${uiId}`);
            }
        }
    });

    suite.test('命鏡 screen 都在 runtime-state-registry 登記，預設 state 與 screen 一致', () => {
        for (const screen of mirrorScreens()) {
            const route = routes.find((r) => r.screenId === screen.id);
            assert.isTrue(!!route, `${screen.id} 未登記`);
            assert.equals(CONTENT_SOURCE, route!.contentSource, screen.id);
            assert.equals(screen.content!.state, route!.defaultState, screen.id);
        }
    });

    return suite;
}
