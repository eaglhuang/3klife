import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

export function createSceneCampRenderSuite(): TestSuite {
    const suite = new TestSuite('SceneCampRender (營帳 cc 接線 PROG-2-0591)');

    suite.test('BoardRenderer 為 scene-camp 格套用營帳底色', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/battle/views/BoardRenderer.ts'), 'utf8');
        assert.isTrue(source.includes("case 'scene-camp':"), 'resolveSceneEffectMaterial 沒有 scene-camp 分支');
        assert.isTrue(source.includes('return { primary: this.sceneEffectCampFillMaterial, accent: null };'), '營帳沒有使用營帳底色');
    });

    return suite;
}
