import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { ONBOARDING_ACTIONS } from '../assets/scripts/ui/core/OnboardingFlowController';
import {
    ONBOARDING_HALL_TARGETS,
    onboardingActionIdAt,
    resolveTutorialTargets,
    type TutorialTargetNode,
} from '../assets/scripts/ui/core/OnboardingTargetResolver';
import { findUcufNode } from '../assets/scripts/ui/core/UcufNodeLookup';

interface FakeNode extends TutorialTargetNode {
    name: string;
    _ucufId?: string;
    parent: FakeNode | null;
    children: FakeNode[];
    activeInHierarchy: boolean;
}

const node = (name: string, ucufId?: string, children: FakeNode[] = [], active = true): FakeNode => {
    const n: FakeNode = { name, _ucufId: ucufId, parent: null, children, activeInHierarchy: active };
    for (const child of children) child.parent = n;
    return n;
};

/** 依 lobby-hall-screen 實際結構縮小：頂列 金玉糧兵＋返回、底列 dock */
const buildHall = (active = true): FakeNode => node('LobbyHallScreen', undefined, [
    node('topbar', 'lobby-hall-screen.topbar', [
        node('res', undefined, [node('gold'), node('jade'), node('grain'), node('troops'), node('back', 'lobby-hall-screen.back')]),
    ]),
    node('dock', undefined, [
        node('sortie', 'lobby-hall-screen.dock-sortie'),
        node('generals', 'lobby-hall-screen.dock-generals'),
    ]),
], active);

const city: Record<string, FakeNode> = {
    ResourceBar: node('ResourceBar'),
    btnCatSortie: node('btnCatSortie'),
    btnCatGenerals: node('btnCatGenerals'),
};
const cityTarget = (name: string): FakeNode | null => city[name] ?? null;
const names = (nodes: FakeNode[]): string => nodes.map(n => n.name).join(',');

export function createOnboardingTargetResolverSuite(): TestSuite {
    const suite = new TestSuite('新手引導目標不被幕府大堂遮住 PROG-2-2226');

    suite.test('大堂沒開時維持指向城市畫面的資源列與底列按鈕', () => {
        assert.equals('ResourceBar', names(resolveTutorialTargets('fate', { hallRoot: null, cityTarget })));
        assert.equals('btnCatSortie', names(resolveTutorialTargets('growth', { hallRoot: null, cityTarget })));
        assert.equals('btnCatGenerals', names(resolveTutorialTargets('legacy', { hallRoot: null, cityTarget })));
    });

    suite.test('大堂開著時改框大堂上的同功能入口，不再指向被蓋住的城市按鈕', () => {
        const hallRoot = buildHall();
        assert.equals('gold,jade,grain,troops', names(resolveTutorialTargets('fate', { hallRoot, cityTarget })));
        assert.equals('sortie', names(resolveTutorialTargets('growth', { hallRoot, cityTarget })));
        assert.equals('generals', names(resolveTutorialTargets('legacy', { hallRoot, cityTarget })));
    });

    suite.test('大堂節點存在但未啟用時視同沒開', () => {
        assert.equals('btnCatSortie', names(resolveTutorialTargets('growth', { hallRoot: buildHall(false), cityTarget })));
    });

    suite.test('大堂上找不到對應入口時不畫框，也不回頭指向城市畫面', () => {
        const bare = node('LobbyHallScreen', undefined, [node('empty')]);
        assert.equals(0, resolveTutorialTargets('legacy', { hallRoot: bare, cityTarget }).length);
    });

    suite.test('隱藏中的資源格不列入合併框', () => {
        const hallRoot = buildHall();
        const back = findUcufNode(hallRoot, 'lobby-hall-screen.back') as FakeNode;
        back.parent!.children[3].activeInHierarchy = false;
        assert.equals('gold,jade,grain', names(resolveTutorialTargets('fate', { hallRoot, cityTarget })));
    });

    suite.test('步驟序號依 ONBOARDING_ACTIONS 順序對應，超出範圍回傳 null', () => {
        assert.equals('fate', onboardingActionIdAt(0));
        assert.equals('growth', onboardingActionIdAt(1));
        assert.equals('legacy', onboardingActionIdAt(2));
        assert.equals(null, onboardingActionIdAt(3));
        assert.equals(Object.keys(ONBOARDING_ACTIONS).join(','), Object.keys(ONBOARDING_HALL_TARGETS).join(','));
    });

    suite.test('大堂對應錨點都存在於 lobby-hall-screen 版面，資源錨點與金玉糧兵同列', () => {
        const layout = JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/ui-spec/layouts/lobby-hall-screen.json'), 'utf8'));
        type LayoutNode = { _ucufId?: string; children?: LayoutNode[]; text?: string };
        const find = (n: LayoutNode, id: string, parent: LayoutNode | null = null): { hit: LayoutNode; parent: LayoutNode | null } | null => {
            if (n._ucufId === id) return { hit: n, parent };
            for (const c of n.children ?? []) { const r = find(c, id, n); if (r) return r; }
            return null;
        };
        for (const spec of Object.values(ONBOARDING_HALL_TARGETS)) assert.isTrue(!!find(layout.root, spec.anchor), spec.anchor);
        const back = find(layout.root, ONBOARDING_HALL_TARGETS.fate.anchor)!;
        const labels = (back.parent?.children ?? []).filter(c => c !== back.hit).map(c => c.children?.[0]?.text ?? '').join('');
        assert.equals('金玉糧兵', labels);
    });

    suite.test('LobbyScene 經由解析器定位，大堂開啟後下一幀再定位一次', () => {
        const src = readFileSync(join(__dirname, '..', 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.contains(src, 'resolveTutorialTargets(actionId');
        assert.contains(src, 'this.scheduleOnce(() => { this._openingPanels?.refreshOnboarding(); }, 0);');
    });

    suite.test('開場結束時先開城市層再開大堂，大堂不被城市畫面蓋住（與 start() 同順序）', () => {
        const src = readFileSync(join(__dirname, '..', 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        const branch = src.slice(src.indexOf('} else if (wasInProgress && !this._isOpeningInProgress()) {'));
        const end = branch.indexOf('} else {');
        const body = branch.slice(0, end);
        const openMain = body.indexOf('services().ui.open(UIID.LobbyMain).then(');
        const openHall = body.indexOf('this._openLobbyHall()');
        assert.isTrue(openMain >= 0 && openHall > openMain, '大堂要在 LobbyMain 開完之後才開');
        const start = src.slice(src.indexOf('await services().ui.open(UIID.LobbyMain);'));
        assert.isTrue(start.indexOf('if (!this._isOpeningInProgress()) this._openLobbyHall();') > 0, 'start() 也是先 LobbyMain 後大堂');
    });

    return suite;
}
