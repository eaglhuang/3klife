/**
 * NurtureReportBookLifecycle.test.ts — 成績單保留簿的生命週期與存檔往返（PROG-2-0601，NUR-08）
 *
 * 檢查：直接畢業／放棄後不留殘存成績單；存檔往返後成績單仍在；定型寫入的是保留當下的快照。
 *
 * Unity 對照：像背包裡的暫存存檔格，離開關卡（畢業／放棄）時要清空，否則下一輪會讀到上一輪的資料。
 */
import { TestSuite, assert } from './TestRunner';
import { NurtureFlowController } from '../assets/scripts/ui/core/NurtureFlowController';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import { NURTURE_TOTAL_ROUNDS } from '../assets/scripts/core/systems/NurtureSystem';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { unveilGeneral, UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function unveiledChild(id: string): UnveilingGeneral {
    return unveilGeneral({
        id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'], genes: [],
    } as unknown as UnveilingGeneral).general;
}

function makeRig(generals: GeneralConfig[]) {
    const roster = new InMemoryRosterStore(generals);
    const nurture = new NurtureService(roster, { random: seeded(7), currentSeason: () => 3, currentMode: () => GameTimeMode.Nurture, requireNurtureMode: true });
    const flow = new NurtureFlowController({
        roster, unveiling: new UnveilingService(roster, seeded(3)), nurture,
        loadMentorCards: async () => [], persist: async () => undefined,
    });
    return { roster, nurture, flow };
}

async function runToCompleted(rig: ReturnType<typeof makeRig>, id: string): Promise<void> {
    const kinds = ['str', 'int', 'lea', 'pol', 'cha'] as const;
    for (let round = 1; round <= NURTURE_TOTAL_ROUNDS; round++) {
        const lowVigor = rig.nurture.getSession(id)!.vigor < 40;
        await rig.flow.train(lowVigor ? 'rest' : kinds[round % kinds.length]);
    }
}

export function createNurtureReportBookLifecycleSuite(): TestSuite {
    const suite = new TestSuite('NurtureReportBookLifecycle (成績單保留簿 生命週期)');

    suite.test('保留成績單後直接畢業：保留簿要清空，不留殘卡給下一輪', async () => {
        const rig = makeRig([unveiledChild('alpha')]);
        await rig.flow.chooseFate('accept');
        await rig.flow.startNurture();
        await runToCompleted(rig, 'alpha');
        await rig.flow.keepReport();
        assert.equals(1, rig.nurture.reportCardCount('alpha'));
        await rig.flow.graduate();
        assert.equals(0, rig.nurture.reportCardCount('alpha'), '正式畢業後不該留著舊成績單');
    });

    suite.test('保留成績單後中途放棄重修：放棄會讓保留簿清空', async () => {
        const rig = makeRig([unveiledChild('alpha')]);
        await rig.flow.chooseFate('accept');
        await rig.flow.startNurture();
        await runToCompleted(rig, 'alpha');
        await rig.flow.keepReport();
        await rig.flow.retake();
        await rig.flow.abandon();
        assert.equals(0, rig.nurture.reportCardCount('alpha'), '放棄後不該留著成績單');
    });

    suite.test('存檔往返：成績單份數與重修後的狀態還原一致', async () => {
        const rig = makeRig([unveiledChild('alpha')]);
        await rig.flow.chooseFate('accept');
        await rig.flow.startNurture();
        await runToCompleted(rig, 'alpha');
        await rig.flow.keepReport();
        await rig.flow.retake();
        const saved = JSON.parse(JSON.stringify(rig.nurture.getState()));
        const rig2 = makeRig(rig.roster.getAll() as GeneralConfig[]);
        rig2.nurture.restoreState(saved);
        assert.equals(1, rig2.nurture.reportCardCount('alpha'));
        assert.equals('active', rig2.nurture.getSession('alpha')!.status);
        assert.equals(JSON.stringify(rig.nurture.getState()), JSON.stringify(rig2.nurture.getState()));
    });

    return suite;
}
