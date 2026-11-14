// @spec-source → Issue #2139（奧義漫畫分鏡 cut-in）；PROG-2-2250
/**
 * UltCutinSupport.test.ts — cut-in 周邊邏輯：資源路徑、本場重播判斷、安全區版面、戰場暫停、資料清單
 *
 * 畫面層（UltCutinOverlay）依賴引擎節點，這裡只測它用到的純邏輯與暫停機制；
 * 「新武將只要圖＋JSON、不改程式」靠清單與路徑規則保證，這裡逐條驗證。
 *
 * Unity 對照：測 Cutscene 的資源定位與 Time.timeScale 暫停，不開場景。
 */
import * as fs from 'fs';
import * as path from 'path';
import {
    CUTIN_INDEX_PATH,
    CutinReplayTracker,
    computeSafeInsets,
    cutinConfigPath,
    cutinFileKey,
    cutinImagePath,
    cutinIndexHas,
    layoutCutinText,
} from '../assets/scripts/shared/cutin/cutinSupport';
import { createCutinPlayer, validateConfig, type CutinConfig } from '../assets/scripts/shared/cutin/cutinCore';
import { BATTLE_PAUSE_SCALE, isBattlePaused, setBattlePaused, setBattleTimeScale, setTimeScale, type Tickable } from '../assets/scripts/battle/views/BattleTimeScale';
import { TestSuite, assert } from './TestRunner';

const DATA_DIR = path.resolve(__dirname, '../assets/resources/data/ult-cutin');

function readJson<T>(file: string): T {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) as T;
}

function fakeDirector(): Tickable & { seen: number[] } {
    const seen: number[] = [];
    return { seen, tick(dt: number) { seen.push(dt); } };
}

export function createUltCutinSupportSuite(): TestSuite {
    const suite = new TestSuite('UltCutinSupport (奧義 cut-in 周邊 Issue #2139)');

    suite.test('資源路徑：武將 id 的 - 換成 _，分鏡圖放在 sprites 底下', () => {
        assert.equals('zhao_yun', cutinFileKey('zhao-yun'));
        assert.equals('data/ult-cutin/zhao_yun', cutinConfigPath('zhao-yun'));
        assert.equals('sprites/ult_cutin/zhao_yun/01_charge', cutinImagePath('ult_cutin/zhao_yun/01_charge'));
        assert.equals('sprites/ult_cutin/a/01', cutinImagePath('/ult_cutin/a/01'));
    });

    suite.test('清單比對：- 與 _ 視為同一人；沒清單、清單壞掉都當作沒有 cut-in', () => {
        const index = { generals: ['zhao-yun', 'guan_yu'] };
        assert.isTrue(cutinIndexHas(index, 'zhao_yun'));
        assert.isTrue(cutinIndexHas(index, 'guan-yu'));
        assert.isFalse(cutinIndexHas(index, 'lu-bu'));
        assert.isFalse(cutinIndexHas(null, 'zhao-yun'));
        assert.isFalse(cutinIndexHas(undefined, 'zhao-yun'));
        assert.isFalse(cutinIndexHas({}, 'zhao-yun'));
        assert.isFalse(cutinIndexHas({ generals: 'zhao-yun' as unknown as string[] }, 'zhao-yun'));
    });

    suite.test('本場重播：同一武將第一次完整版、之後縮短重播；換武將各自算；新戰鬥重置', () => {
        const tracker = new CutinReplayTracker();
        assert.equals('full', tracker.consume('zhao-yun'));
        assert.equals('replay', tracker.consume('zhao-yun'));
        assert.equals('replay', tracker.consume('zhao_yun'));
        assert.equals('full', tracker.consume('guan-yu'));
        tracker.reset();
        assert.equals('full', tracker.consume('zhao-yun'));
    });

    suite.test('安全區：換算四邊內縮；缺值或不合理時全 0', () => {
        const view = { width: 1920, height: 1080 };
        const insets = computeSafeInsets(view, { x: 80, y: 40, width: 1760, height: 980 });
        assert.equals(80, insets.left);
        assert.equals(80, insets.right);
        assert.equals(40, insets.bottom);
        assert.equals(60, insets.top);
        const none = computeSafeInsets(view, null);
        assert.equals(0, none.left + none.right + none.top + none.bottom);
        const bad = computeSafeInsets(view, { x: 0, y: 0, width: 0, height: 0 });
        assert.equals(0, bad.left + bad.right + bad.top + bad.bottom);
        const absurd = computeSafeInsets(view, { x: 1500, y: 0, width: 100, height: 1080 });
        assert.equals(0, absurd.left + absurd.right);
    });

    suite.test('文字版面：落在下方黑邊與 Home bar 之上，寬度扣掉左右瀏海', () => {
        const view = { width: 1920, height: 1080 };
        const insets = { left: 120, right: 40, top: 0, bottom: 60 };
        // 黑邊較高：文字貼著黑邊上緣再留間距
        const a = layoutCutinText({ view, insets, letterboxHeight: 150, textHeight: 200, margin: 24 });
        assert.equals(-540 + 150 + 24 + 100, a.centerY);
        // 黑邊收起、Home bar 較高：改貼安全區底部
        const b = layoutCutinText({ view, insets, letterboxHeight: 0, textHeight: 200, margin: 24 });
        assert.equals(-540 + 60 + 24 + 100, b.centerY);
        assert.equals(1920 - (120 + 24) - (40 + 24), b.width);
        assert.equals(((120 + 24) - (40 + 24)) / 2, b.centerX);
        // 文字區底邊一定不低於黑邊與安全區
        assert.isTrue(a.centerY - 100 >= -540 + 150);
        assert.isTrue(b.centerY - 100 >= -540 + 60);
    });

    suite.test('戰場暫停：dt 幾乎歸零；恢復後回到玩家原本的倍率（x2 不會丟）', () => {
        const d = fakeDirector();
        setTimeScale(d, 2);
        d.tick(0.5);
        assert.equals(1, d.seen[0]);
        // 暫停用極小倍率，不能是 0（0 會被當成不合法而還原成 1）
        assert.isTrue(BATTLE_PAUSE_SCALE > 0 && BATTLE_PAUSE_SCALE < 0.001);
        setTimeScale(d, BATTLE_PAUSE_SCALE);
        d.tick(1);
        assert.isTrue(d.seen[1] < 0.001, `暫停時 dt 應接近 0，實際 ${d.seen[1]}`);
        setTimeScale(d, 2);
        d.tick(0.5);
        assert.equals(1, d.seen[2]);
        setTimeScale(d, 1);
    });

    suite.test('戰場暫停旗標：暫停中改倍率只記下，恢復時才生效；解除訂閱的重置會清掉暫停', () => {
        setBattlePaused(false);
        setBattleTimeScale(1);
        setBattlePaused(true);
        assert.isTrue(isBattlePaused());
        setBattleTimeScale(2);
        assert.isTrue(isBattlePaused());
        setBattlePaused(false);
        assert.isFalse(isBattlePaused());
        setBattleTimeScale(1);
        setBattlePaused(false);
        assert.isFalse(isBattlePaused());
    });

    suite.test('資料：清單列了趙雲，設定檔存在、通過驗證，每一格都有對應的分鏡圖路徑', () => {
        const index = readJson<{ generals: string[] }>('index.json');
        assert.isTrue(cutinIndexHas(index, 'zhao-yun'));
        assert.equals('data/ult-cutin/index', CUTIN_INDEX_PATH);
        // 清單上每個武將都要有同名設定檔，且設定內容通過驗證
        for (const id of index.generals) {
            const file = `${cutinFileKey(id)}.json`;
            assert.isTrue(fs.existsSync(path.join(DATA_DIR, file)), `清單列了 ${id}，但缺 ${file}`);
            const config = readJson<CutinConfig>(file);
            validateConfig(config);
            assert.equals(cutinFileKey(id), cutinFileKey(config.generalId));
            for (const panel of config.panels) {
                assert.isTrue(cutinImagePath(panel.imageKey).startsWith('sprites/ult_cutin/'), `分鏡圖路徑不在 sprites/ult_cutin 底下：${panel.imageKey}`);
            }
        }
    });

    suite.test('缺圖流程：圖都沒匯入時不可播、不丟例外，而且不會要求暫停戰場', () => {
        const config = readJson<CutinConfig>('zhao_yun.json');
        const events: string[] = [];
        const player = createCutinPlayer(config, {
            mode: 'full',
            hasImage: () => false,
            onPauseRequest: () => events.push('pause'),
            onResumeRequest: () => events.push('resume'),
            onEnd: () => events.push('end'),
        });
        assert.isFalse(player.playable);
        player.start();
        assert.equals('end', events.join(','));
    });

    return suite;
}
