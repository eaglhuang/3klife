// PROG-2-9411：棋盤 buff 格顯示（與頭頂狀態圖示同一套）的純邏輯測試
import {
    sampleTileBuffPickup,
    tileBuffBadgeOf,
    tileBuffDeltaText,
    tileBuffPickupIsDebuff,
    tileBuffPickupLogLine,
    tileBuffSourceFromDelta,
} from '../assets/scripts/battle/shared/TileBuffBadge';
import { STATUS_ICON_DEFS } from '../assets/scripts/battle/shared/UnitStatusIcons';
import { BATTLE_AUDIO_CLIP_MAP, BATTLE_AUDIO_CUE } from '../assets/scripts/battle/shared/BattleAudio';
import { TestSuite, assert } from './TestRunner';

export function createTileBuffBadgeSuite(): TestSuite {
    const suite = new TestSuite('TileBuffBadge');

    suite.test('四種格子對應頭頂同一個圖示與字', () => {
        const atkUp = tileBuffBadgeOf({ stat: 'attack', op: 'mul', factor: 3, rarity: 'normal' });
        assert.isTrue(atkUp.kind === 'attack-up' && atkUp.glyph === STATUS_ICON_DEFS['attack-up'].glyph && !atkUp.isDebuff);
        const hpUp = tileBuffBadgeOf({ stat: 'hp', op: 'mul', factor: 4, rarity: 'normal' });
        assert.isTrue(hpUp.kind === 'hp-up' && hpUp.glyph === '命');
        const atkDown = tileBuffBadgeOf({ stat: 'attack', op: 'div', factor: 5, rarity: 'rare' });
        assert.isTrue(atkDown.kind === 'attack-down' && atkDown.isDebuff && atkDown.rare);
        const hpDown = tileBuffBadgeOf({ stat: 'hp', op: 'div', factor: 2, rarity: 'normal' });
        assert.isTrue(hpDown.kind === 'hp-down' && hpDown.isDebuff && !hpDown.rare);
    });

    suite.test('倍數文字：乘寫 ×、除寫 ÷，小數最多一位', () => {
        assert.isTrue(tileBuffBadgeOf({ stat: 'attack', op: 'mul', factor: 3, rarity: 'normal' }).amountText === '×3');
        assert.isTrue(tileBuffBadgeOf({ stat: 'hp', op: 'div', factor: 5, rarity: 'normal' }).amountText === '÷5');
        assert.isTrue(tileBuffBadgeOf({ stat: 'hp', op: 'mul', factor: 2.25, rarity: 'normal' }).amountText === '×2.3');
        assert.isTrue(tileBuffBadgeOf({ stat: 'hp', op: 'mul', factor: NaN, rarity: 'normal' }).amountText === '×1');
    });

    suite.test('減益判定：都沒變好且至少一項變差才算減益', () => {
        assert.isTrue(tileBuffPickupIsDebuff(-10, 0));
        assert.isTrue(tileBuffPickupIsDebuff(0, -50));
        assert.isTrue(!tileBuffPickupIsDebuff(10, 0));
        assert.isTrue(!tileBuffPickupIsDebuff(10, -50));
        assert.isTrue(!tileBuffPickupIsDebuff(0, 0));
    });

    suite.test('戰報：減益格不再寫「吃到增益」', () => {
        assert.isTrue(tileBuffPickupLogLine({ isPlayer: true, buffText: '攻擊 x 3', attackDelta: 40, hpDelta: 0 }) === '我方吃到增益：攻擊 x 3 攻擊 +40');
        assert.isTrue(tileBuffPickupLogLine({ isPlayer: false, buffText: '生命 / 5', attackDelta: 0, hpDelta: -96 }) === '敵方吃到減益：生命 / 5 生命 -96');
        assert.isTrue(tileBuffPickupLogLine({ isPlayer: true, buffText: '生命 x 2', attackDelta: 0, hpDelta: 0 }) === '我方吃到增益：生命 x 2');
        assert.isTrue(tileBuffDeltaText(5, -3) === '攻擊 +5 生命 -3');
    });

    suite.test('由增減量反推飛行圖示：攻擊優先，變差算減益', () => {
        assert.isTrue(tileBuffBadgeOf(tileBuffSourceFromDelta(-12, 0)).kind === 'attack-down');
        assert.isTrue(tileBuffBadgeOf(tileBuffSourceFromDelta(0, 80)).kind === 'hp-up');
        assert.isTrue(tileBuffBadgeOf(tileBuffSourceFromDelta(0, -80)).kind === 'hp-down');
    });

    suite.test('拾取飛入：從格子出發、準確落在頭頂，途中往上拱', () => {
        const from = { x: 0, y: 0 }, to = { x: 100, y: 200 };
        const start = sampleTileBuffPickup(0, from, to), end = sampleTileBuffPickup(1, from, to), mid = sampleTileBuffPickup(0.5, from, to);
        assert.isTrue(start.x === 0 && start.y === 0);
        assert.isTrue(Math.abs(end.x - 100) < 1e-9 && Math.abs(end.y - 200) < 1e-9);
        assert.isTrue(mid.y > from.y + (to.y - from.y) * 0.75, `${mid.y}`);
        assert.isTrue(sampleTileBuffPickup(2, from, to).x === end.x && sampleTileBuffPickup(-1, from, to).x === 0);
        assert.isTrue(end.scale < 1 && sampleTileBuffPickup(0.25, from, to).scale > 1);
    });

    suite.test('減益格有自己的音效代號，且有對應音檔', () => {
        assert.isTrue((BATTLE_AUDIO_CUE.debuffGained as string) !== BATTLE_AUDIO_CUE.buffGained);
        assert.isTrue(!!BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.debuffGained]);
        assert.isTrue(BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.debuffGained] !== BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.buffGained]);
    });

    return suite;
}
