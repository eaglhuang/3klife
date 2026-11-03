// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（每 60 秒輪換在場武將）；UI-2-0139（UI-2-0123 子項）
/**
 * HallStageDirector — 大廳舞台的變動偵測，純 TS，不依賴 cc。
 *
 * 點位 60 秒輪換由 HallCharacterPresenter 管，畫面可以每幀或定時把最新的在場名單丟進來；
 * 這裡記住上一次的名單、順序、姓名官職與任務標記，只有變動時才回傳新站位（planHallStage），
 * 沒變就回傳 null，讓 HallStageCrowd 不必重建節點、idle 動畫不會被打斷。
 * Unity 對照：像 ViewModel 的 dirty flag，資料沒變就不觸發 OnChanged。
 */
import { HallStageGeneral, HallStageLayout, HallStagePlacement, planHallStage } from './HallStagePlanner';

export interface HallStageCast {
    generals: readonly HallStageGeneral[];
    taskMarkIds: ReadonlySet<string>;
}

export class HallStageDirector {
    private _signature: string | null = null;

    constructor(private readonly _layout: Readonly<HallStageLayout>) {}

    /** 名單或標記有變才回傳新站位；與上次相同回傳 null。 */
    public update(cast: Readonly<HallStageCast>): HallStagePlacement[] | null {
        const signature = castSignature(cast);
        if (signature === this._signature) return null;
        this._signature = signature;
        return planHallStage(cast.generals, this._layout, cast.taskMarkIds);
    }

    /** 畫面重新開啟時呼叫，下一次 update 必定回傳站位。 */
    public reset(): void {
        this._signature = null;
    }
}

function castSignature(cast: Readonly<HallStageCast>): string {
    return JSON.stringify(cast.generals.map(g => [g.id, g.name, g.title ?? '', cast.taskMarkIds.has(g.id)]));
}
