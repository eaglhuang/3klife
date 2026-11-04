/**
 * PortraitFrameFit.test.ts — 立繪依臉部標記擺進框（PROG-2-1126 規格；UI-2-0160 名將登場框）
 */
import { assert, TestSuite } from './TestRunner';
import { PORTRAIT_FRAME_SPEC, SHOWCASE_PORTRAIT_SPEC, fitPortraitInFrame } from '../assets/scripts/ui/core/PortraitFrameFit';

const FACE = { top: 100, chin: 200, eyeY: 150, cx: 400 };

export function createPortraitFrameFitSuite(): TestSuite {
    const suite = new TestSuite('PortraitFrameFit');

    suite.test('臉高縮放到規格、臉置中、眼睛落在框頂下 eyeFromTop', () => {
        const spec = SHOWCASE_PORTRAIT_SPEC;
        const place = fitPortraitInFrame(800, 1600, FACE, spec);
        const scale = spec.faceHeight / 100;
        assert.equals(place.height, 1600 * scale, '等比縮放');
        assert.equals(place.x, 0, '臉在圖中線，水平置中');
        // 眼睛的框內座標（框中心為原點，y 向上）
        const eyeY = place.y + (1600 / 2 - FACE.eyeY) * scale;
        assert.equals(eyeY, spec.frameHeight / 2 - spec.eyeFromTop, '眼睛高度');
    });

    suite.test('名將登場框的臉比六框大，框也較寬', () => {
        assert.equals(SHOWCASE_PORTRAIT_SPEC.faceHeight > PORTRAIT_FRAME_SPEC.faceHeight, true, '臉較大');
        assert.equals(SHOWCASE_PORTRAIT_SPEC.frameWidth > PORTRAIT_FRAME_SPEC.frameWidth, true, '框較寬');
    });

    suite.test('標記超出圖範圍時改用估算，不會用到錯的標記', () => {
        const place = fitPortraitInFrame(800, 1600, { top: 100, chin: 2000, eyeY: 150, cx: 400 }, SHOWCASE_PORTRAIT_SPEC);
        assert.equals(place.x, 0, '估算臉在中線');
        assert.equals(Math.round(place.height), Math.round(1600 * (90 / (1600 * 0.065))), '依估算臉高縮放');
    });

    return suite;
}
