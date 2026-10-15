import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

export function createTacticWeatherClickThroughSuite(): TestSuite {
    const suite = new TestSuite('TacticWeatherClickThrough (天氣禁用計謀可點擊 APT-07 / PROG-2-0597)');

    suite.test('天氣禁用時計謀按鈕保持可點，其他原因仍不可點', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/ui/components/ActionCommandComposite.ts'), 'utf8');
        assert.isTrue(
            source.includes('this._tacticClickable = this._tacticEnabled || reason === TACTIC_REASON_WEATHER;'),
            '天氣禁用沒有保留點擊',
        );
        assert.isTrue(source.includes('if (!this._tacticClickable) return;'), '點擊沒有改用可點擊旗標');
    });

    suite.test('天氣禁用時按鈕仍變灰（字色沿用 _tacticEnabled）', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/ui/components/ActionCommandComposite.ts'), 'utf8');
        assert.isTrue(source.includes('this._tacticsLabel.color = this._tacticEnabled'), '字色沒有依 _tacticEnabled 變灰');
    });

    return suite;
}
