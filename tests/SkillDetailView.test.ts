/**
 * SkillDetailView.test.ts — 戰法／奧義詳情子視窗的說明文字組裝（純函式）
 *
 * 鎖住：四種狀態標籤與原因；缺欄位不產生列（不補假資料）；數值由資料傳入不寫死；
 * 英文代碼轉中文，查無對照時原樣顯示；pendingEffect 顯示不可施放。
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildSkillDetailView,
    formatSkillDetailText,
    type SkillDetailSource,
} from '../assets/scripts/core/systems/SkillDetailView';

function labelsOf(source: SkillDetailSource, state: Parameters<typeof buildSkillDetailView>[1]['state'], reason?: string | null): string {
    return buildSkillDetailView(source, { state, reason }).rows.map((r) => r.label).join(',');
}

export function createSkillDetailViewSuite(): TestSuite {
    const suite = new TestSuite('SkillDetailView (戰法詳情子視窗文字)');

    suite.test('戰法列含效果類型、係數、TP、目標與時機，數值來自資料', () => {
        const view = buildSkillDetailView({
            kind: 'tactic',
            name: '騎軍衝鋒',
            category: '衝鋒',
            tpCost: 30,
            effectKind: 'damage',
            coefficient: 1.5,
            scalingStat: 'str',
            targetMode: 'line',
            timing: 'active-cast',
            maxTargets: 3,
        }, { state: 'learned' });
        assert.equals('騎軍衝鋒', view.title);
        assert.equals('戰法', view.kindLabel);
        assert.equals(
            '狀態：已習得\n類型：衝鋒\n效果類型：傷害\n效果係數：×1.5\n成長屬性：武力\n目標範圍：直線\n發動時機：主動施放\n目標數上限：3 個\nTP 消耗：30',
            formatSkillDetailText(view),
        );
    });

    suite.test('奧義顯示效果說明、精力與解鎖轉數；戰法沒有說明時不出現效果說明列', () => {
        const ult = buildSkillDetailView({
            kind: 'ultimate',
            name: '萬箭齊發',
            description: '對敵方全體造成傷害',
            vitalityCostPct: 50,
            unlockReincarnation: 3,
        }, { state: 'learned' });
        assert.equals('奧義', ult.kindLabel);
        assert.equals('狀態,效果說明,精力消耗,解鎖轉數', ult.rows.map((r) => r.label).join(','));
        assert.equals('對敵方全體造成傷害', ult.rows.find((r) => r.label === '效果說明')?.value ?? '');
        assert.equals('50%', ult.rows.find((r) => r.label === '精力消耗')?.value ?? '');
        assert.equals('3 轉', ult.rows.find((r) => r.label === '解鎖轉數')?.value ?? '');
        assert.equals(false, labelsOf({ kind: 'tactic', name: 'y' }, 'learned').includes('效果說明'));
    });

    suite.test('缺欄位（null、undefined、空字串）整列略過，不編造數值', () => {
        const view = buildSkillDetailView({
            kind: 'tactic',
            name: '空白戰法',
            category: '',
            tpCost: null,
            coefficient: undefined,
            effectKind: '  ',
        }, { state: 'learned' });
        assert.equals('狀態', view.rows.map((r) => r.label).join(','));
    });

    suite.test('四種狀態標籤與主戰法、未啟發、無法習得原因', () => {
        const src: SkillDetailSource = { kind: 'tactic', name: 'T' };
        assert.equals('已習得（主戰法）', buildSkillDetailView(src, { state: 'main' }).rows[0].value);
        assert.equals('主戰法', buildSkillDetailView(src, { state: 'main' }).kindLabel);
        assert.equals('已習得', buildSkillDetailView(src, { state: 'learned' }).rows[0].value);
        assert.equals('可習得（未啟發）', buildSkillDetailView(src, { state: 'inspired' }).rows[0].value);
        assert.equals('無法習得（待解鎖）', buildSkillDetailView(src, { state: 'locked', reason: '待解鎖' }).rows[0].value);
        assert.equals('無法習得', buildSkillDetailView(src, { state: 'locked', reason: '  ' }).rows[0].value);
    });

    suite.test('未知代碼原樣顯示；pendingEffect 顯示不可施放', () => {
        const view = buildSkillDetailView({
            kind: 'tactic',
            name: 'N',
            effectKind: 'mystery-kind',
            targetMode: 'ally-single',
            pendingEffect: true,
        }, { state: 'learned' });
        assert.equals('mystery-kind', view.rows.find((r) => r.label === '效果類型')?.value ?? '');
        assert.equals('友方單體', view.rows.find((r) => r.label === '目標範圍')?.value ?? '');
        assert.equals('尚未實作，目前不可施放', view.rows.find((r) => r.label === '效果狀態')?.value ?? '');
    });

    return suite;
}
