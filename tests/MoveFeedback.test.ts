// PROG-2-9406：移動揚塵與腳步聲設定的純邏輯測試
import { TerrainType, TroopType } from '../assets/scripts/shared/CommonEnums';
import {
    DUST_COLOR_DARK,
    DUST_COLOR_LIGHT,
    DUST_PARTICLE_RANGES,
    FOOTFALL_INTERVAL_SEC,
    MOVE_FOOTSTEP_MAX_VOLUME,
    MOVE_FOOTSTEP_TABLE,
    MOVE_GAIT_TUNING,
    createMoveSfxThrottleState,
    dustBeatsFor,
    dustCountFor,
    moveDustFor,
    moveBeatFor,
    moveFootstepFor,
    rollDustParticle,
    stepBobOffset,
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

    suite.test('陸上兵種出塵：步兵 8～12 顆、騎兵 12～16 顆且塵粒較大；沙漠多大、森林少小', () => {
        const cav = moveDustFor(TroopType.Cavalry, TerrainType.Plain);
        const inf = moveDustFor(TroopType.Infantry, TerrainType.Plain);
        assert.equals('dust', inf.kind);
        assert.equals(8, inf.particleMin);
        assert.equals(12, inf.particleMax);
        assert.equals(12, cav.particleMin);
        assert.equals(16, cav.particleMax);
        assert.isTrue(cav.scale > inf.scale);
        const desert = moveDustFor(TroopType.Infantry, TerrainType.Desert);
        const forest = moveDustFor(TroopType.Infantry, TerrainType.Forest);
        assert.isTrue(desert.scale > inf.scale && desert.particleMax > inf.particleMax);
        assert.isTrue(forest.scale < inf.scale && forest.particleMax < inf.particleMax && forest.particleMin >= 2);
    });

    suite.test('每次落腳的粒子數落在區間內；隊員減量但至少 2 顆；不出塵為 0', () => {
        const inf = moveDustFor(TroopType.Infantry, TerrainType.Plain);
        assert.equals(8, dustCountFor(inf, true, () => 0));
        assert.equals(12, dustCountFor(inf, true, () => 0.999));
        const member = dustCountFor(inf, false, () => 0.999);
        assert.isTrue(member >= 2 && member < 12, `隊員 ${member}`);
        assert.equals(4, dustCountFor(inf, false, () => 0));
        assert.equals(0, dustCountFor(moveDustFor(TroopType.Navy), true));
        const cav = moveDustFor(TroopType.Cavalry, TerrainType.Plain);
        assert.isTrue(dustCountFor(cav, true, () => 0) >= 12);
    });

    suite.test('落腳節奏：每 0.4 動畫秒一次，倍率越高越密；停住或無效輸入不發', () => {
        // 倍率 1、每幀 0.1 秒：0.4 秒時第一次落腳
        let clock = 0;
        let beats = 0;
        for (let i = 0; i < 8; i++) {
            beats += dustBeatsFor(clock, 1, 0.125);
            clock += 0.125;
        }
        assert.equals(2, beats);
        // 倍率 2：同樣 1 秒內動畫走 2 秒，5 次落腳
        clock = 0; beats = 0;
        for (let i = 0; i < 8; i++) { beats += dustBeatsFor(clock, 2, 0.125); clock += 0.25; }
        assert.equals(5, beats);
        assert.equals(0, dustBeatsFor(0, 0, 0.1));
        assert.equals(0, dustBeatsFor(0, 1, 0));
        assert.equals(0, dustBeatsFor(-1, 1, 0.1));
        assert.equals(0, dustBeatsFor(0, 1, 0.1));
        assert.equals(1, dustBeatsFor(FOOTFALL_INTERVAL_SEC - 0.05, 1, 0.1));
    });

    suite.test('隊員相位偏移：和帶頭者落腳時間錯開', () => {
        // 偏移 0.28 動畫秒（相位 0.35 × 0.8）：時鐘 0.1 → 0.2 之間跨過 0.4
        assert.equals(0, dustBeatsFor(0.1, 1, 0.1, 0));
        assert.equals(1, dustBeatsFor(0.1, 1, 0.1, 0.28));
    });

    suite.test('塵粒參數落在規格內：土黃色、粒徑、放大倍率、上飄、散開、壽命', () => {
        const spec = moveDustFor(TroopType.Infantry, TerrainType.Plain);
        for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
            const p = rollDustParticle(spec, () => r);
            const R = DUST_PARTICLE_RANGES;
            assert.isTrue(p.startSize >= R.startSize[0] && p.startSize <= R.startSize[1], `粒徑 ${p.startSize}`);
            assert.isTrue(p.endScale >= R.endScale[0] && p.endScale <= R.endScale[1]);
            assert.isTrue(p.rise >= R.rise[0] && p.rise <= R.rise[1]);
            assert.isTrue(p.drift >= R.drift[0] && p.drift <= R.drift[1]);
            assert.isTrue(p.lifeSec >= R.lifeSec[0] && p.lifeSec <= R.lifeSec[1]);
            // 單顆終端大小（粒徑 × 放大）要小於 1 倍粒徑上限的 2 倍，避免又糊成一整塊
            assert.isTrue(p.startSize * p.endScale <= R.startSize[1] * R.endScale[1] + 1e-6, '終端粒徑不得過大');
            assert.isTrue(R.startSize[1] * R.endScale[1] <= 22, '單顆終端粒徑要小，粒子才不糊成團');
            assert.isTrue(R.jitterX >= 40 && R.drift[1] >= 80, '散布要寬，粒子間才有空隙');
            assert.isTrue(p.color.r <= DUST_COLOR_LIGHT.r && p.color.r >= DUST_COLOR_DARK.r);
            assert.isTrue(p.color.g <= DUST_COLOR_LIGHT.g && p.color.g >= DUST_COLOR_DARK.g);
            assert.isTrue(p.color.b <= DUST_COLOR_LIGHT.b && p.color.b >= DUST_COLOR_DARK.b);
        }
        assert.isTrue(rollDustParticle(moveDustFor(TroopType.Cavalry, TerrainType.Plain), () => 0.5).startSize > rollDustParticle(spec, () => 0.5).startSize);
    });

    suite.test('聲音與揚塵共用同一個拍點；騎兵每次落腳 2 聲、步兵 1 聲，聲間隔小於最短步距', () => {
        const beat = moveBeatFor(TroopType.Cavalry, TerrainType.Desert);
        assert.equals(moveFootstepFor(TroopType.Cavalry).beats, beat.footstep.beats);
        assert.equals(moveDustFor(TroopType.Cavalry, TerrainType.Desert).particleMax, beat.dust.particleMax);
        assert.equals(1, moveBeatFor(TroopType.Infantry).footstep.beats);
        for (const t of allTroops) {
            const s = MOVE_FOOTSTEP_TABLE[t];
            // 步態倍率上限 1.6 時最短步距 0.25 秒
            assert.isTrue((s.beats - 1) * s.intervalMs < 250, `${t} 聲間隔`);
        }
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

    suite.test('走路起伏：落腳時 0、兩步中間到頂、隊員錯開相位', () => {
        const half = FOOTFALL_INTERVAL_SEC / 2;
        assert.isTrue(Math.abs(stepBobOffset(0)) < 1e-9);
        assert.isTrue(Math.abs(stepBobOffset(FOOTFALL_INTERVAL_SEC)) < 1e-9);
        assert.isTrue(Math.abs(stepBobOffset(half) - MOVE_GAIT_TUNING.bobPx) < 1e-9);
        assert.isTrue(Math.abs(stepBobOffset(0, half) - MOVE_GAIT_TUNING.bobPx) < 1e-9);
        assert.isTrue(MOVE_GAIT_TUNING.bobPx >= 3 && MOVE_GAIT_TUNING.bobPx <= 4);
        assert.isTrue(stepBobOffset(-1) === 0 && stepBobOffset(NaN) === 0);
    });

    suite.test('落腳間隔可依兵種設定（騎兵 trot 半週期）、起伏可關掉', () => {
        let beats = 0; let clock = 0;
        for (let i = 0; i < 20; i++) { clock = i * 0.05; beats += dustBeatsFor(clock + 0.001, 1, 0.05, 0, 0.3); }
        assert.isTrue(beats === 3, `拍數 ${beats}`);
        assert.isTrue(stepBobOffset(0.15, 0, 0, 0.3) === 0);
        assert.isTrue(Math.abs(stepBobOffset(0.15, 0, 4, 0.3) - 4) < 1e-9);
        assert.isTrue(dustBeatsFor(0, 1, 0.5, 0, 0) === 0);
    });

    suite.test('步態倍率上限 2.2（總PM 定案，不到 2.5）', () => {
        assert.isTrue(MOVE_GAIT_TUNING.maxAnimationSpeed === 2.2);
    });

    return suite;
}
