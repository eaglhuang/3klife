/**
 * AcademyGraduationUi.test.ts — 學府結業結算畫面（PROG-2-1956）：檢視文字與控制器
 */
import { TestSuite, assert } from './TestRunner';
import { academyGraduationTexts } from '../assets/scripts/ui/core/AcademyGraduationView';
import { AcademyGraduationController } from '../assets/scripts/ui/core/AcademyGraduationController';
import type { MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';
import type { AcademyGraduationResult } from '../assets/scripts/core/systems/nurture/AcademyGraduation';
import type { AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function resultOf(patch: Partial<AcademyGraduationResult> = {}): AcademyGraduationResult {
    return {
        general: { id: 'g1', name: '小曹' } as unknown as GeneralConfig,
        grade: 'A',
        statTotal: 742,
        newTactics: ['TAC_A', 'TAC_B'],
        traits: ['TRT_X'],
        ...patch,
    };
}

function fakeHost() {
    const texts: Record<string, string> = {};
    const host = {
        node: { active: true },
        binder: {
            setTexts: (t: Record<string, string>) => { Object.assign(texts, t); },
            setActives: () => undefined,
        },
    };
    return { host, texts };
}

const SNAPSHOT = { graduated: true, childId: 'g1' } as unknown as AcademyStateSnapshot;

export function createAcademyGraduationUiSuite(): TestSuite {
    const suite = new TestSuite('AcademyGraduationUi (學府結業結算 PROG-2-1956)');

    suite.test('檢視文字：評級、總和、戰法名稱查表、特質退回 id', () => {
        const t = academyGraduationTexts(resultOf(), { tacticName: (id) => (id === 'TAC_A' ? '火攻' : undefined), generalName: '小曹' });
        assert.equals('學府結業　小曹', t.academyGradTitle);
        assert.equals('評級 A', t.academyGradGrade);
        assert.equals('五維總和 742', t.academyGradStatTotal);
        assert.equals('新學戰法：火攻、TAC_B', t.academyGradTactics);
        assert.equals('新解鎖特質：TRT_X', t.academyGradTraits);
    });

    suite.test('檢視文字：沒有新戰法與特質顯示「無」；語系表可覆蓋文案', () => {
        const t = academyGraduationTexts(resultOf({ newTactics: [], traits: [] }), {
            lookup: (key) => (key === 'ui.academy.graduation.grade' ? `Grade {0}` : key),
        });
        assert.equals('Grade A', t.academyGradGrade);
        assert.equals('新學戰法：無', t.academyGradTactics);
        assert.equals('新解鎖特質：無', t.academyGradTraits);
        assert.equals('學府結業', t.academyGradTitle);
    });

    suite.test('控制器：掛載隱藏；結業成功後顯示結算並可關閉', async () => {
        let bindings: MentorHoldingsButtonBinding[] = [];
        const { host, texts } = fakeHost();
        const calls: string[] = [];
        const ctrl = new AcademyGraduationController({
            mountHost: async (b) => { bindings = b; return host; },
            graduate: async (id) => { calls.push(id); return resultOf(); },
            view: () => ({}),
            toast: () => { throw new Error('不應提示'); },
        });
        await ctrl.mount();
        assert.isFalse(host.node.active);
        const result = await ctrl.show('g1', SNAPSHOT);
        assert.equals('A', result?.grade);
        assert.equals('g1', calls[0]);
        assert.isTrue(host.node.active);
        assert.equals('學府結業　小曹', texts.academyGradTitle);
        assert.equals('新學戰法：TAC_A、TAC_B', texts.academyGradTactics);
        bindings.find((b) => b.buttonId === 'btnAcademyGradClose')?.handler();
        assert.isFalse(host.node.active);
    });

    suite.test('控制器：查無武將或拋錯時提示且不開窗', async () => {
        for (const graduate of [
            async () => null,
            async (): Promise<AcademyGraduationResult | null> => { throw new Error('學府尚未結業'); },
        ]) {
            const { host } = fakeHost();
            const toasts: string[] = [];
            const ctrl = new AcademyGraduationController({
                mountHost: async () => host,
                graduate,
                view: () => ({}),
                toast: (m) => { toasts.push(m); },
            });
            await ctrl.mount();
            assert.equals(null, await ctrl.show('g1', SNAPSHOT));
            assert.isFalse(host.node.active);
            assert.equals(1, toasts.length);
        }
    });

    return suite;
}
