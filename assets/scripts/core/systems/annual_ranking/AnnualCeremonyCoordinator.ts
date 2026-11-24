// @spec-source → 史境天下風雲榜系統規格書 (doc_spec_1285) §5~§6；PROG-2-9955
/**
 * AnnualCeremonyCoordinator — 年終頒獎典禮演出協調器
 *
 * 遵循總 PM 裁決：
 * 1. 年度結算後回到大廳時自動彈出一次，播完或跳過寫入年度已閱旗標，不重複彈出。
 * 2. 透過 StoryPresentation（IStoryPlayer）單一佇列排隊播放，不與晉升彈窗或其他年終彈窗疊在一起。
 * 3. 支援「跳過／快轉」與看板內的「重播典禮」。
 */
import type { IStoryPlayer, StoryPlayView } from '../../../shared/story/StoryPresentation';
import { CeremonyScriptAssembler, type CeremonyScriptAssemblyInput, type CeremonyStoryCue } from './CeremonyScriptAssembler';

export interface CeremonyPlaybackState {
    readonly year: number;
    readonly currentIndex: number;
    readonly totalCues: number;
    readonly fastForward: boolean;
    readonly skipped: boolean;
    readonly cues: readonly CeremonyStoryCue[];
}

export class AnnualCeremonyCoordinator {
    private readonly _seenYears = new Set<number>();

    /** 載入或重設已看過的典禮年度清單 */
    public hydrateSeenYears(years: readonly number[]): void {
        this._seenYears.clear();
        for (const y of years) {
            if (Number.isFinite(y) && y > 0) this._seenYears.add(Math.floor(y));
        }
    }

    public getSeenYears(): number[] {
        return Array.from(this._seenYears).sort((a, b) => a - b);
    }

    public hasSeenYear(year: number): boolean {
        return this._seenYears.has(year);
    }

    public markYearSeen(year: number): void {
        if (Number.isFinite(year) && year > 0) {
            this._seenYears.add(Math.floor(year));
        }
    }

    /** 年度結算後回到大廳時是否應自動彈出典禮 */
    public shouldAutoTrigger(year: number, yearEndSettled: boolean): boolean {
        return yearEndSettled && Number.isFinite(year) && year > 0 && !this._seenYears.has(Math.floor(year));
    }

    /**
     * 將年終頒獎典禮排入 StoryPlayer 單一佇列（與晉升彈窗等共用佇列不重疊）。
     * 完成或跳過時自動標記該年度已閱。
     */
    public async enqueueCeremony(
        player: IStoryPlayer,
        input: CeremonyScriptAssemblyInput,
        options: { priority?: number; isReplay?: boolean } = {},
    ): Promise<{ played: boolean; year: number; cueCount: number }> {
        const isReplay = options.isReplay === true;
        if (!isReplay && this._seenYears.has(input.year)) {
            return { played: false, year: input.year, cueCount: 0 };
        }

        const script = CeremonyScriptAssembler.assembleCeremony(input);
        const view: StoryPlayView = {
            storyId: `annual_ceremony_${input.year}`,
            instanceId: `annual_ceremony_${input.year}_${isReplay ? 'replay' : 'auto'}`,
            cues: [
                {
                    cue: 'annual_ceremony',
                    year: input.year,
                    hosts: script.hosts,
                    ceremonyCues: script.cues,
                    photoBackdropDto: script.photoBackdropDto,
                } as any,
            ],
            choice: null,
            skippable: true,
        };

        await player.enqueue(view, options.priority ?? 50);
        this.markYearSeen(input.year);
        return { played: true, year: input.year, cueCount: script.cues.length };
    }
}
