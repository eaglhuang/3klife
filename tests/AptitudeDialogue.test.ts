/**
 * AptitudeDialogue.test.ts — 適性台詞選擇與 {Name} 替換 headless 測試（APT-14 台詞 / PROG-2-1308）
 *
 * 鎖住：水戰 S、山地 S、大霧 S、夜戰 S 各自命中對應台詞；天氣剛變為大風時優先播風向台詞；
 * 地形或天氣為 D 播適性不足；都不命中回傳 null；{Name} 全部替換。
 *
 * Unity 對照：像 Dialogue 觸發器按 Priority 排序，命中第一條就播，文字由 Localization Table 取。
 */
import { assert, TestSuite } from './TestRunner';
import {
    aptitudeDialogueKindOf,
    aptitudeDialogueLine,
    AptitudeDialogueInput,
    fillAptitudeName,
} from '../assets/scripts/core/systems/AptitudeDialogue';

const CALM: AptitudeDialogueInput = {
    terrain: 'PLAIN',
    weather: 'SUNNY',
    terrainGrade: 'B',
    weatherGrade: 'B',
    weatherChanged: false,
};

function withInput(patch: Partial<AptitudeDialogueInput>): AptitudeDialogueInput {
    return { ...CALM, ...patch };
}

export function createAptitudeDialogueSuite(): TestSuite {
    const suite = new TestSuite('AptitudeDialogue (適性台詞選擇 APT-14 / PROG-2-1308)');

    suite.test('水戰 S、山地 S 各自命中對應台詞', () => {
        assert.equals('water-s', aptitudeDialogueKindOf(withInput({ terrain: 'WATER', terrainGrade: 'S' }))!);
        assert.equals('mountain-s', aptitudeDialogueKindOf(withInput({ terrain: 'MOUNTAIN', terrainGrade: 'S' }))!);
        assert.isTrue(aptitudeDialogueKindOf(withInput({ terrain: 'WATER', terrainGrade: 'A' })) === null);
        assert.equals('water-s', aptitudeDialogueKindOf(withInput({ terrain: 'river', terrainGrade: 'S' }))!);
    });

    suite.test('大霧、夜戰需 S 才命中；天氣剛變為大風時優先播風向台詞', () => {
        assert.equals('fog', aptitudeDialogueKindOf(withInput({ weather: 'FOG', weatherGrade: 'S' }))!);
        assert.equals('night', aptitudeDialogueKindOf(withInput({ weather: 'NIGHT', weatherGrade: 'S' }))!);
        assert.isTrue(aptitudeDialogueKindOf(withInput({ weather: 'FOG', weatherGrade: 'A' })) === null);
        const wind = withInput({ terrain: 'WATER', terrainGrade: 'S', weather: 'WINDY', weatherChanged: true });
        assert.equals('wind', aptitudeDialogueKindOf(wind)!);
    });

    suite.test('地形或天氣為 D 播適性不足；都不命中回傳 null', () => {
        assert.equals('insufficient', aptitudeDialogueKindOf(withInput({ terrainGrade: 'D' }))!);
        assert.equals('insufficient', aptitudeDialogueKindOf(withInput({ weatherGrade: 'D' }))!);
        assert.isTrue(aptitudeDialogueKindOf(CALM) === null);
    });

    suite.test('{Name} 全部替換為武將名；沒有命中時不組字', () => {
        assert.equals('趙雲 如魚得水，趙雲！', fillAptitudeName('{Name} 如魚得水，{Name}！', '趙雲'));
        assert.equals('沒有佔位', fillAptitudeName('沒有佔位', '趙雲'));
        const lines: Record<string, string> = { 'battle.aptitude.line.water-s': '{Name} 如魚得水——水面之上，無人能敵！' };
        const line = aptitudeDialogueLine(withInput({ terrain: 'WATER', terrainGrade: 'S' }), '趙雲', (k) => lines[k] ?? k);
        assert.equals('趙雲 如魚得水——水面之上，無人能敵！', line!);
        assert.isTrue(aptitudeDialogueLine(CALM, '趙雲', (k) => k) === null);
    });

    return suite;
}
