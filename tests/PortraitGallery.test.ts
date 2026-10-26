/**
 * PortraitGallery.test.ts — 一頁六框立繪（PROG-2-1126）headless 測試
 *
 * 驗證：分頁與選取、臉部標記對齊（臉高一致、眼睛同高、臉置中）、
 * 紅顏展示與招賢館兩份 layout 都有共用節點、紅顏六框 FlowView。
 */
import { TestSuite, assert } from './TestRunner';
import { PORTRAIT_GALLERY_PAGE_SIZE, PortraitGallery } from '../assets/scripts/ui/core/PortraitGallery';
import { PORTRAIT_FRAME_SPEC, fitPortraitInFrame } from '../assets/scripts/ui/core/PortraitFrameFit';
import { RedFaceGalleryController } from '../assets/scripts/ui/core/RedFaceShowcaseController';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

function layoutIds(rel: string): Set<string> {
    const ids = new Set<string>();
    const walk = (n: { id?: string; children?: unknown[] }): void => {
        if (n.id) ids.add(n.id);
        for (const c of n.children ?? []) walk(c as { id?: string; children?: unknown[] });
    };
    walk(readJson(rel).root);
    return ids;
}

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `g${i}`, name: `將${i}`, sub: '', portraitKey: `g${i}`, tag: i === 0 ? '核心' : '' }));

export function createPortraitGallerySuite(): TestSuite {
    const suite = new TestSuite('PortraitGallery (一頁六框立繪 PROG-2-1126)');

    suite.test('8 位分 2 頁；第 2 頁只開 2 框、上一頁可按', () => {
        const gallery = new PortraitGallery(() => items(8));
        assert.equals(2, gallery.pageCount);
        gallery.next();
        const view = gallery.getView();
        assert.equals('2 / 2', view.texts.pageLabel);
        assert.isTrue(view.actives.btnFrame1);
        assert.equals(false, view.actives.btnFrame2);
        assert.isTrue(view.enabled.btnPrev);
        assert.equals(false, view.enabled.btnNext);
    });

    suite.test('點框選取，選中框亮金框；核心徽章只在有 tag 時顯示', () => {
        const gallery = new PortraitGallery(() => items(6));
        assert.isTrue(gallery.getView().actives.frame0Sel, '預設選第一位');
        gallery.select(3);
        const view = gallery.getView();
        assert.equals('g3', gallery.selected()!.id);
        assert.isTrue(view.actives.frame3Sel);
        assert.equals(false, view.actives.frame0Sel);
        assert.isTrue(view.actives.frame0Tag);
        assert.equals(false, view.actives.frame1Tag);
        gallery.select(99);
        assert.equals('g3', gallery.selected()!.id, '空框忽略');
    });

    suite.test('臉部標記對齊：不同原圖臉高一致、眼睛同高、臉置中', () => {
        const spec = PORTRAIT_FRAME_SPEC;
        const eyeTarget = spec.frameHeight / 2 - spec.eyeFromTop;
        for (const [w, h, face] of [
            [720, 1280, { top: 58, chin: 122, eyeY: 85, cx: 278 }],
            [1024, 1024, { top: 240, chin: 300, eyeY: 268, cx: 283 }],
        ] as const) {
            const place = fitPortraitInFrame(w, h, face);
            const scale = place.width / w;
            assert.isTrue(Math.abs((face.chin - face.top) * scale - spec.faceHeight) < 1e-6, '臉高一致');
            assert.isTrue(Math.abs(place.y + (h / 2 - face.eyeY) * scale - eyeTarget) < 1e-6, '眼睛同高');
            assert.isTrue(Math.abs(place.x + (face.cx - w / 2) * scale) < 1e-6, '臉在框中線');
        }
        const est = fitPortraitInFrame(500, 1000, null);
        assert.isTrue(est.width > 0 && est.height > spec.frameHeight, '無標記時退回估算');
        const stale = fitPortraitInFrame(512, 768, { top: 162, chin: 287, eyeY: 227, cx: 642 });
        const fresh = fitPortraitInFrame(512, 768, null);
        assert.equals(fresh.x, stale.x, '標記超出圖寬（舊圖量的）改用估算');
    });

    suite.test('紅顏展示與招賢館 layout 都有共用六框節點', () => {
        for (const rel of ['assets/resources/ui-spec/layouts/red-face-showcase-main.json', 'assets/resources/ui-spec/layouts/recruit-hall-main.json']) {
            const ids = layoutIds(rel);
            for (const key of ['btnPrev', 'btnNext', 'pageLabel', 'detailName', 'detailMeta', 'btnClose']) assert.isTrue(ids.has(key), `${rel} 缺 ${key}`);
            for (let i = 0; i < PORTRAIT_GALLERY_PAGE_SIZE; i++) {
                for (const key of [`btnFrame${i}`, `frame${i}Mask`, `frame${i}Portrait`, `frame${i}Name`, `frame${i}Sub`, `frame${i}Tag`, `frame${i}TagLabel`, `frame${i}Sel`]) {
                    assert.isTrue(ids.has(key), `${rel} 缺 ${key}`);
                }
            }
        }
    });

    suite.test('紅顏六框：不截 5 位、核心置頂、詳情標籤中文、key 都在 layout', () => {
        const ids = layoutIds('assets/resources/ui-spec/layouts/red-face-showcase-main.json');
        const cards = Array.from({ length: 7 }, (_, i) => ({ id: i === 0 ? 'da-qiao' : `rf${i}`, name: i === 0 ? '大喬' : `紅${i}`, effectTags: ['morale-aura'], previewLine: '台詞' }));
        const controller = new RedFaceGalleryController({
            pool: () => ({ candidateIds: cards.map((c) => c.id) }),
            cards: () => cards,
            generalPoolIds: () => [],
        });
        const view = controller.getFlowView();
        assert.equals('1 / 2', view.texts.pageLabel);
        assert.equals('大喬', view.texts.frame0Name);
        assert.equals('士氣光環', view.texts.detailMeta);
        assert.equals('「台詞」', view.texts.detailLine);
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.enabled), ...Object.keys(view.actives)]) {
            assert.isTrue(ids.has(key), `${key} 要在 layout 裡`);
        }
    });

    return suite;
}
