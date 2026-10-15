import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { parseNumericalConfig } from '../assets/scripts/core/config/NumericalConfig';
import { COUNTER_MULTIPLIER, SP_PER_KILL } from '../assets/scripts/core/config/Constants';

function readRaw(): any {
    const path = join(__dirname, '..', 'assets/resources/data/numerical-config.json');
    return JSON.parse(readFileSync(path, 'utf8'));
}

function expectOk(raw: unknown): any {
    const result = parseNumericalConfig(raw);
    if (!result.ok) {
        throw new Error(`解析失敗：${result.errors.join('；')}`);
    }
    return result.config;
}

function errorsOf(raw: unknown): string[] {
    const result = parseNumericalConfig(raw);
    assert.isFalse(result.ok);
    return result.ok ? [] : result.errors;
}

export function createNumericalConfigSuite(): TestSuite {
    const suite = new TestSuite('NumericalConfig (NUM-04 數值常數集中化)');

    suite.test('真實 numerical-config.json 解析成功，回傳同一份物件不複製', () => {
        const raw = readRaw();
        const config = expectOk(raw);
        assert.isTrue(config === raw);
    });

    suite.test('抽樣比對規格數值：剋制 1.3、適性 S=1.2、奧義 lv5=700、轉生上限 lv5=1500', () => {
        const { NumericalConfig: num } = expectOk(readRaw());
        assert.equals(1.3, num.Counter_Table.CAVALRY_vs_SHIELD);
        assert.equals(0.67, num.Counter_Table.MECHANICAL_vs_MELEE);
        assert.equals(1.2, num.Aptitude_Efficiency.S);
        assert.equals(0.20, num.Aptitude_Stat_Mod.S.atk_def);
        assert.equals(-2, num.Aptitude_Stat_Mod.D.move);
        assert.equals(0.5, num.Age_Modifier.Over);
        assert.equals(700, num.Ult_Base_Power['5']);
        assert.equals(1500, num.Reincarnation_Cap['5']);
        assert.equals(50, num.Vitality_Cost.Bond_Male);
        assert.equals(100, num.Vitality_Cost.Bond_Female);
        assert.equals(1.5, num.Crit_Multiplier);
    });

    suite.test('與 Constants.ts 交叉比對：剋制倍率與每殺 SP 一致，避免兩處各自漂移', () => {
        const { NumericalConfig: num } = expectOk(readRaw());
        assert.equals(COUNTER_MULTIPLIER, num.Counter_Table.CAVALRY_vs_SHIELD);
        assert.equals(SP_PER_KILL, num.SP_Per_Kill);
    });

    suite.test('FormulaRegistry 公式 ID 唯一且涵蓋 16 條規格公式', () => {
        const { FormulaRegistry: registry } = expectOk(readRaw());
        const ids = registry.Formulas.map((formula: { ID: string }) => formula.ID);
        assert.equals(16, ids.length);
        assert.equals(ids.length, new Set(ids).size);
        assert.isTrue(ids.includes('FML_DAMAGE'));
        assert.isTrue(ids.includes('FML_TALLY_LOYALTY'));
    });

    suite.test('缺少 NumericalConfig 區段時回報錯誤，不丟例外', () => {
        const raw = readRaw();
        delete raw.NumericalConfig;
        const errors = errorsOf(raw);
        assert.isTrue(errors.includes('缺少 NumericalConfig 區段'));
    });

    suite.test('數值欄位為非數字或 NaN 時逐條回報路徑', () => {
        const raw = readRaw();
        raw.NumericalConfig.SP_Per_Kill = 'twenty';
        raw.NumericalConfig.Counter_Table.DEFAULT = Number.NaN;
        const errors = errorsOf(raw);
        assert.isTrue(errors.includes('NumericalConfig.SP_Per_Kill 必須是有限數字'));
        assert.isTrue(errors.includes('NumericalConfig.Counter_Table.DEFAULT 必須是有限數字'));
    });

    suite.test('適性修正缺欄位時回報到欄位層級', () => {
        const raw = readRaw();
        delete raw.NumericalConfig.Aptitude_Stat_Mod.C.acc;
        const errors = errorsOf(raw);
        assert.isTrue(errors.includes('NumericalConfig.Aptitude_Stat_Mod.C.acc 必須是有限數字'));
    });

    suite.test('公式清單 ID 重複或欄位空白時回報', () => {
        const raw = readRaw();
        raw.FormulaRegistry.Formulas.push({ ID: 'FML_DAMAGE', Name: '', Category: 'Battle' });
        const errors = errorsOf(raw);
        assert.isTrue(errors.includes('FormulaRegistry 公式 ID 重複：FML_DAMAGE'));
        assert.isTrue(errors.includes('FormulaRegistry.Formulas[16].Name 必須是非空字串'));
    });

    suite.test('根節點不是物件時直接失敗', () => {
        assert.equals('根節點必須是物件', errorsOf(null)[0]);
        assert.equals('根節點必須是物件', errorsOf([])[0]);
    });

    return suite;
}
