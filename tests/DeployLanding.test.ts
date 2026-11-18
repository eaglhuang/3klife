// PROG-2-9409：部署落地演出的純邏輯測試
import { TroopType } from '../assets/scripts/shared/CommonEnums';
import {
    DEPLOY_LANDING_PUFFS,
    DEPLOY_LANDING_TUNING,
    deployLandingDust,
    deployLandingThud,
    deployLandingTotalSec,
    landingCrossed,
    memberDeployDelay,
    sampleDeployLanding,
} from '../assets/scripts/battle/shared/DeployLanding';
import { MOVE_FOOTSTEP_MAX_VOLUME, moveDustFor, moveFootstepFor } from '../assets/scripts/battle/shared/MoveFeedback';
import { TestSuite, assert } from './TestRunner';

export function createDeployLandingSuite(): TestSuite {
    const suite = new TestSuite('DeployLanding');
    const T = DEPLOY_LANDING_TUNING;
    const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

    suite.test('還沒輪到的隊員藏起來、從頂上開始落', () => {
        const before = sampleDeployLanding(-0.01);
        assert.isTrue(!before.visible && before.dy === T.dropPx);
        const start = sampleDeployLanding(0);
        assert.isTrue(start.visible && near(start.dy, T.dropPx));
    });

    suite.test('下落是加速的（後半段落得比前半段多），落地時剛好在地上', () => {
        const q1 = sampleDeployLanding(T.dropSec * 0.25).dy, mid = sampleDeployLanding(T.dropSec * 0.5).dy, q3 = sampleDeployLanding(T.dropSec * 0.75).dy;
        assert.isTrue(T.dropPx - q1 < q1 - mid && q1 - mid < mid - q3, `${q1} ${mid} ${q3}`);
        assert.isTrue(sampleDeployLanding(T.dropSec).dy === 0);
        assert.isTrue(sampleDeployLanding(T.dropSec * 0.9).scaleY > 1, '下落時略微拉長');
    });

    suite.test('落地壓扁再回彈：中段最扁、結束回到原本大小', () => {
        const squashed = sampleDeployLanding(T.dropSec + T.squashSec / 2);
        assert.isTrue(near(squashed.scaleY, 1 - T.squash) && near(squashed.scaleX, 1 + T.squash * 0.6));
        assert.isTrue(squashed.dy === 0, '壓扁時腳不離地');
        const rest = sampleDeployLanding(T.dropSec + T.squashSec + 0.01);
        assert.isTrue(rest.visible && rest.dy === 0 && rest.scaleX === 1 && rest.scaleY === 1);
    });

    suite.test('壞值當作已落地，不會把單位藏起來', () => {
        for (const t of [NaN, Infinity, -Infinity]) {
            const s = sampleDeployLanding(t);
            assert.isTrue(s.visible && s.dy === 0 && s.scaleY === 1, `${t}`);
        }
    });

    suite.test('隊員依序落下，整隊時間含最後一名的壓扁回彈', () => {
        assert.isTrue(memberDeployDelay(0) === 0 && near(memberDeployDelay(2), T.memberStaggerSec * 2));
        assert.isTrue(memberDeployDelay(-3) === 0);
        assert.isTrue(near(deployLandingTotalSec(3), T.memberStaggerSec * 2 + T.dropSec + T.squashSec));
        assert.isTrue(near(deployLandingTotalSec(0), T.dropSec + T.squashSec));
        assert.isTrue(deployLandingTotalSec(3) < 0.7, '整隊落完不超過 0.7 秒，不拖節奏');
    });

    suite.test('落地瞬間只觸發一次', () => {
        let count = 0;
        for (let i = 0; i < 40; i++) if (landingCrossed(i * 0.016, (i + 1) * 0.016)) count++;
        assert.isTrue(count === 1, `觸發 ${count} 次`);
        assert.isTrue(landingCrossed(0, 10), '一幀跨過整段也算');
        assert.isTrue(!landingCrossed(T.dropSec, T.dropSec + 0.1));
    });

    suite.test('落地塵粒比走路大、往兩側吹開，水軍照樣不出塵', () => {
        const walk = moveDustFor(TroopType.Infantry);
        const land = deployLandingDust(walk);
        assert.isTrue(land.kind === 'dust' && land.scale > walk.scale && land.particleMin === walk.particleMin);
        assert.isTrue(deployLandingDust(moveDustFor(TroopType.Cavalry)).scale > land.scale, '騎兵塵更大');
        assert.isTrue(deployLandingDust(moveDustFor(TroopType.Navy)).kind === 'none');
        assert.isTrue(walk.scale === moveDustFor(TroopType.Infantry).scale, '不改到原本的表');
        // 左邊的團往左吹（面向 +1 時塵往左飄）、右邊的往右吹，兩側都有
        assert.isTrue(DEPLOY_LANDING_PUFFS.every(p => (p.dx < 0) === (p.driftFacing === 1)));
        assert.isTrue(DEPLOY_LANDING_PUFFS.some(p => p.dx < 0) && DEPLOY_LANDING_PUFFS.some(p => p.dx > 0));
    });

    suite.test('落地聲比腳步大聲但不超過上限，騎兵兩聲', () => {
        for (const t of Object.values(TroopType) as TroopType[]) {
            const step = moveFootstepFor(t);
            const thud = deployLandingThud(step, t);
            assert.isTrue(thud.volume >= step.volume && thud.volume <= MOVE_FOOTSTEP_MAX_VOLUME, `${t} ${thud.volume}`);
            assert.isTrue(thud.cue === step.cue);
        }
        assert.isTrue(deployLandingThud(moveFootstepFor(TroopType.Cavalry), TroopType.Cavalry).beats >= 2);
        assert.isTrue(deployLandingThud(moveFootstepFor(TroopType.Infantry), TroopType.Infantry).beats === 1);
    });

    return suite;
}
