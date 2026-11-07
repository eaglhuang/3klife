/**
 * MirrorLoadingRotation — 命鏡 Loading 輪播名單與 state 套用（BML-05；PROG-2-2069）
 */
import * as fs from 'fs';
import * as path from 'path';
import { Node } from 'cc';
import { assert, TestSuite } from './TestRunner';
import { buildMirrorLoadingRotation, type MirrorLoadingCandidate } from '../assets/scripts/core/systems/MirrorLoadingRotation';
import {
    BLOODLINE_MIRROR_CONTRACT_REF,
    BLOODLINE_MIRROR_LOADING_SCREEN_ID,
    MirrorLoadingCarousel,
    applyMirrorLoadingEntry,
    type BloodlineMirrorStatesContent,
} from '../assets/scripts/ui/core/UIBloodlineMirrorLoading';
import type { ContentContractSchema, UIContentBinder } from '../assets/scripts/ui/core/UIContentBinder';
import type { UITemplateBinder } from '../assets/scripts/ui/core/UITemplateBinder';

const UI_SPEC_DIR = path.resolve(__dirname, '../assets/resources/ui-spec');

function readJson<T>(relative: string): T {
    return JSON.parse(fs.readFileSync(path.join(UI_SPEC_DIR, relative), 'utf8')) as T;
}

const g = (id: string): MirrorLoadingCandidate => ({ id, name: `名-${id}` });

/** 記錄 setTexts 與依路徑寫入的 label；非 label 節點一律找不到 */
function fakeBinder(texts: Record<string, string>, labels: Record<string, { string: string }> = {}): UITemplateBinder {
    return {
        getLabelByPath: (p: string) => (labels[p] ??= { string: '' }),
        getNodeByPath: () => null as Node | null,
        setTexts: (map: Record<string, string>) => Object.assign(texts, map),
    } as unknown as UITemplateBinder;
}

export function createMirrorLoadingRotationSuite(): TestSuite {
    const suite = new TestSuite('MirrorLoadingRotation (命鏡 Loading 輪播 BML-05 PROG-2-2069)');
    const noShuffle = () => 0.999;

    suite.test('每 3 格放一位未持有武將，其餘放已持有', () => {
        const owned = [g('a'), g('b'), g('c'), g('d')];
        const all = [...owned, g('x'), g('y')];
        const list = buildMirrorLoadingRotation(owned, all, noShuffle);
        assert.equals('a,b,x,c,d,y', list.map((e) => e.id).join(','));
        assert.equals('loading,loading,unowned-preview,loading,loading,unowned-preview', list.map((e) => e.stateId).join(','));
        assert.equals('名-x', list[2].name);
    });

    suite.test('一邊用完由另一邊補位；兩邊都空時回傳空名單；重複 id 只算一次', () => {
        assert.equals('x,y,z', buildMirrorLoadingRotation([], [g('x'), g('y'), g('z')], noShuffle).map((e) => e.id).join(','));
        assert.equals('a,b,c', buildMirrorLoadingRotation([g('a'), g('b'), g('a'), g('c')], [g('a')], noShuffle).map((e) => e.id).join(','));
        assert.equals(0, buildMirrorLoadingRotation([], []).length);
    });

    suite.test('命鏡 Loading screen 與契約對得上；輪播用到的 state 都在 content', () => {
        const screen = readJson<{ id: string; contentRequirements: { schemaId: string; familyId: string } }>(`screens/${BLOODLINE_MIRROR_LOADING_SCREEN_ID}.json`);
        assert.equals(BLOODLINE_MIRROR_CONTRACT_REF.schemaId, screen.contentRequirements.schemaId);
        assert.equals(BLOODLINE_MIRROR_CONTRACT_REF.familyId, screen.contentRequirements.familyId);
        const content = readJson<BloodlineMirrorStatesContent>('content/bloodline-mirror-states-v1.json');
        for (const id of ['loading', 'unowned-preview']) assert.isTrue(!!content.states[id], id);
    });

    suite.test('套用：state 文案綁上、標題換成武將名；缺 state 不動畫面', () => {
        const content = readJson<BloodlineMirrorStatesContent>('content/bloodline-mirror-states-v1.json');
        const schema = readJson<ContentContractSchema>('contracts/bloodline-mirror-state-content.schema.json');
        const texts: Record<string, string> = {};
        const labels: Record<string, { string: string }> = {};
        const entry = { id: 'x', name: '名-x', owned: false, stateId: 'unowned-preview' as const };
        assert.isTrue(applyMirrorLoadingEntry(fakeBinder(texts, labels), content, schema, entry));
        assert.equals('名-x', texts.HeaderTitle);
        assert.equals(String(content.states['unowned-preview'].phaseLabel), labels['MirrorChrome/MirrorMetaRow/PhaseLabel'].string);
        const untouched: Record<string, string> = {};
        assert.equals(false, applyMirrorLoadingEntry(fakeBinder(untouched), { states: {} }, schema, entry));
        assert.equals(0, Object.keys(untouched).length);
    });

    suite.test('輪播：依序切換、尾端接回開頭；空名單回傳 null', async () => {
        const content = readJson<BloodlineMirrorStatesContent>('content/bloodline-mirror-states-v1.json');
        const contentBinder = { preloadSchema: async () => null, bindWithSchema: () => undefined } as unknown as UIContentBinder;
        const texts: Record<string, string> = {};
        const entries = buildMirrorLoadingRotation([g('a')], [g('a'), g('x')], noShuffle, { length: 3, unownedEvery: 2, intervalSec: 1 });
        const carousel = await MirrorLoadingCarousel.create(fakeBinder(texts), content, entries, contentBinder);
        const seen = [carousel.next(), carousel.next(), carousel.next()].map((e) => e?.id).join(',');
        assert.equals('a,x,a', seen);
        assert.equals('名-a', texts.HeaderTitle);
        const empty = await MirrorLoadingCarousel.create(fakeBinder({}), content, [], contentBinder);
        assert.equals(null, empty.next());
    });

    return suite;
}
