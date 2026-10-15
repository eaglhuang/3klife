import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { UIValidationRunner, ValidationResult } from '../assets/scripts/ui/core/UIValidationRunner';
import type { UILayoutSpec, UISkinManifest } from '../assets/scripts/ui/core/UISpecTypes';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

function layoutOf(root: Record<string, unknown>): UILayoutSpec {
    return { id: 'test-layout', version: '1', canvas: { designWidth: 1920, designHeight: 1080 }, root } as unknown as UILayoutSpec;
}

function skinOf(slots: Record<string, unknown> = {}): UISkinManifest {
    return { id: 'test-skin', version: '1', bundle: 'test', atlasPolicy: 'none', slots } as unknown as UISkinManifest;
}

function run(root: Record<string, unknown>, slots: Record<string, unknown> = {}): ValidationResult {
    return new UIValidationRunner().validate(layoutOf(root), skinOf(slots));
}

function messagesOf(result: ValidationResult): string[] {
    return result.issues.map(issue => issue.message);
}

export function createUIValidationRunnerSuite(): TestSuite {
    const suite = new TestSuite('UIValidationRunner (REV-05 UI 驗證器)');

    suite.test('乾淨的節點樹無問題，節點計數含子節點', () => {
        const result = run({
            name: 'Root', type: 'panel', width: 1920, height: 1080,
            children: [
                { name: 'Title', type: 'label', width: 400, height: 60, textKey: 'x' },
                { name: 'Ok', type: 'button', width: 200, height: 60 },
            ],
        });
        assert.isTrue(result.passed);
        assert.equals(0, result.issues.length);
        assert.equals(3, result.stats.totalNodes);
    });

    suite.test('九宮格 border 非整數時報 error，並給出四捨五入建議', () => {
        const result = run(
            { name: 'Root', type: 'panel', width: 100, height: 100 },
            { 'bg.card': { kind: 'sprite-frame', border: [4.5, 4, 4, 4] } },
        );
        assert.isFalse(result.passed);
        const issue = result.issues.find(i => i.severity === 'error');
        assert.equals('skin.bg.card', issue!.path);
        assert.equals('改為 5', issue!.suggestion);
    });

    suite.test('按鈕小於 44×44 只報 warning，不影響通過', () => {
        const result = run({
            name: 'Root', type: 'panel', width: 300, height: 300,
            children: [{ name: 'Tiny', type: 'button', width: 40, height: 60 }],
        });
        assert.isTrue(result.passed);
        assert.equals(1, result.stats.warnings);
        assert.isTrue(messagesOf(result)[0].includes('小於最小觸控目標 44×44px'));
    });

    suite.test('水平容器子節點百分比寬度加總超過 100% 時報 error', () => {
        const result = run({
            name: 'Row', type: 'panel', width: 800, height: 100,
            layout: { type: 'horizontal' },
            children: [
                { name: 'A', type: 'panel', width: '60%', height: 100 },
                { name: 'B', type: 'panel', width: '50%', height: 100 },
            ],
        });
        assert.isFalse(result.passed);
        assert.isTrue(messagesOf(result).some(m => m.includes('110% 超過 100%')));
    });

    suite.test('skinSlot 不存在報 warning；styleSlot 不存在報 info', () => {
        const result = run({
            name: 'Root', type: 'panel', width: 300, height: 300,
            children: [
                { name: 'Icon', type: 'panel', width: 50, height: 50, skinSlot: 'missing.bg' },
                { name: 'Text', type: 'label', width: 200, height: 40, textKey: 'x', styleSlot: 'missing.style' },
            ],
        });
        assert.isTrue(result.passed);
        assert.isTrue(result.issues.some(i => i.severity === 'warning' && i.message.includes('missing.bg')));
        assert.isTrue(result.issues.some(i => i.severity === 'info' && i.message.includes('missing.style')));
    });

    suite.test('垂直容器子節點總高超出可用空間時報 error，並計入間距與 padding', () => {
        const result = run({
            name: 'Col', type: 'panel', width: 300, height: 200,
            layout: { type: 'vertical', spacing: 10, paddingTop: 10, paddingBottom: 10 },
            children: [
                { name: 'R1', type: 'panel', width: 100, height: 100 },
                { name: 'R2', type: 'panel', width: 100, height: 100 },
            ],
        });
        assert.isFalse(result.passed);
        // 可用 200 - 20 = 180；需求 200 + 間距 10 = 210；溢出 30
        assert.isTrue(messagesOf(result).some(m => m.includes('溢出 30px')));
    });

    suite.test('真實 warehouse 面板 layout 與 skin 跑驗證無 error', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/warehouse-panel-main.json') as UILayoutSpec;
        const skin = readJson('assets/resources/ui-spec/skins/warehouse-panel-screen.skin.json') as UISkinManifest;
        const result = new UIValidationRunner().validate(layout, skin);
        const errors = result.issues.filter(i => i.severity === 'error').map(i => i.message);
        assert.equals(0, errors.length, errors.join('；'));
        assert.isTrue(result.stats.totalNodes > 1);
    });

    suite.test('formatReport 輸出標題、統計與每條問題的表格列', () => {
        const result = run({
            name: 'Root', type: 'panel', width: 300, height: 300,
            children: [{ name: 'Tiny', type: 'button', width: 40, height: 40 }],
        });
        const report = UIValidationRunner.formatReport(result);
        assert.isTrue(report.startsWith('## UI 驗證報告'));
        assert.isTrue(report.includes('- 結果：✅ 通過'));
        assert.isTrue(report.includes('| 🟡 warning | Root > Tiny |'));
    });

    return suite;
}
