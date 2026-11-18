// PROG-2-9406：移動揚塵與腳步聲設定的純邏輯測試
import { TerrainType, TroopType } from '../assets/scripts/shared/CommonEnums';
import {
    MOVE_FOOTSTEP_MAX_VOLUME,
    MOVE_FOOTSTEP_TABLE,
    createMoveSfxThrottleState,
    moveDustFor,
    moveFootstepFor,
    tryAcquireMoveSfx,
} from '../assets/scripts/battle/shared/MoveFeedback';
import { TestSuite, assert } from './TestRunner';

export function createMoveFeedbackSuite(): TestSuite {
    const suite = new TestSuite('MoveFeedback');
    const allTroops = Object.values(TroopType) as TroopType[];

    suite.test('每個兵種都有腳步設定，音量小（<=0.4）且拍數至少 1', () => {
        for (const t of allTroops) {
            const s = moveFootstepFor(t);
            assert.isTrue(s.volume > 0 && s.volume <= MOVE_FOOTSTEP_MAX_VOLUME, `${t} 音量 ${s.volume}`);
            assert.isTrue(s.beats >= 1, `${t} 拍數`);
        }
    });

    suite.test('資料表每列都有 cue 與音高，重甲偏低、騎兵偏高且在 ±10% 內', () => {
        for (const t of allTroops) {
            const s = MOVE_FOOTSTEP_TABLE[t];
            assert.isTrue(!!s.cue, `${t} cue`);
            assert.isTrue(s.pitch >= 0.9 && s.pitch <= 1.1, `${t} pitch ${s.pitch}`);
        }
        assert.isTrue(MOVE_FOOTSTEP_TABLE[TroopType.Shield].pitch < 1);
        assert.isTrue(MOVE_FOOTSTEP_TABLE[TroopType.Cavalry].pitch > 1);
    });

    suite.test('騎兵拍數多於步兵；盾兵 1 拍；未知兵種退回步兵', () => {
        assert.isTrue(moveFootstepFor(TroopType.Cavalry).beats > moveFootstepFor(TroopType.Infantry).beats);
        assert.equals(1, moveFootstepFor(TroopType.Shield).beats);
        assert.equals(moveFootstepFor(TroopType.Infantry).beats, moveFootstepFor('unknown').beats);
        assert.equals(moveFootstepFor(TroopType.Infantry).volume, moveFootstepFor(null).volume);
    });

    suite.test('水軍水陸不出塵；河流格任何兵種都不出塵', () => {
        assert.equals('none', moveDustFor(TroopType.Navy).kind);
        for (const t of allTroops) {
            assert.equals('none', moveDustFor(t, TerrainType.River).kind);
        }
    });

    suite.test('陸上兵種出塵，騎兵比步兵大且團數不少；沙漠大、森林小', () => {
        const cav = moveDustFor(TroopType.Cavalry, TerrainType.Plain);
        const inf = moveDustFor(TroopType.Infantry, TerrainType.Plain);
        assert.equals('dust', inf.kind);
        assert.isTrue(cav.scale > inf.scale);
        assert.isTrue(cav.puffCount >= inf.puffCount);
        assert.isTrue(moveDustFor(TroopType.Infantry, TerrainType.Desert).scale > inf.scale);
        assert.isTrue(moveDustFor(TroopType.Infantry, TerrainType.Forest).scale < inf.scale);
    });

    suite.test('節流：視窗內超過上限就合併，視窗過後恢復', () => {
        const st = createMoveSfxThrottleState();
        assert.isTrue(tryAcquireMoveSfx(st, 1000, 120, 3));
        assert.isTrue(tryAcquireMoveSfx(st, 1010, 120, 3));
        assert.isTrue(tryAcquireMoveSfx(st, 1020, 120, 3));
        assert.isFalse(tryAcquireMoveSfx(st, 1030, 120, 3));
        assert.isFalse(tryAcquireMoveSfx(st, 1119, 120, 3));
        assert.isTrue(tryAcquireMoveSfx(st, 1120, 120, 3));
    });

    return suite;
}
