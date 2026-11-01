import { TestSuite, assert } from './TestRunner';
import { placeDs3BarFill } from '../assets/scripts/ui/components/character-ds3/Ds3BarFill';

export function createDs3BarFillSuite(): TestSuite {
    const suite = new TestSuite('Ds3BarFill');

    suite.test('中央錨點：填色左緣貼齊軌道左緣', () => {
        const p = placeDs3BarFill(200, 0.5, 0.5, 0.5);
        assert.equals(100, p.width);
        assert.equals(-50, p.x);
    });

    suite.test('左錨點填色', () => {
        assert.equals(-100, placeDs3BarFill(200, 0.5, 0, 0.3).x);
    });

    suite.test('比例超界夾到 0～1', () => {
        assert.equals(200, placeDs3BarFill(200, 0.5, 0.5, 1.5).width);
        assert.equals(0, placeDs3BarFill(200, 0.5, 0.5, NaN).width);
    });

    return suite;
}
