// @spec-source → 獎勵系統 Base 框架規格書 (doc_spec_1186) §3.4 演出綁定、§4 IPresentationRegistry 與規則 1／6；PROG-2-9205
/**
 * RewardPresentation — 給獎演出 adapter 介面與註冊表（零依賴；播放本體由客戶端 UI 實作）。
 *
 * 分工：獎勵內容層決定「給什麼、用哪種演出」，入帳在權威端先完成；這裡只是「回放已定結果」，
 * 所以演出被跳過、中斷、閃退重進都不影響帳目。新增一種演出（藏寶圖、骰子、轉盤、寶路…）
 * ＝ 寫一個 GrantPresentationModule 並 register，不動獎池設定、不動結算。
 *
 * 缺少實作的演出類型一律退回 instant 並記 log，不得吞掉獎勵（規格 §4 規則 6）。
 *
 * Unity 對照：像 Timeline 的 PlayableBehaviour 註冊表，依 type 字串找對應的播放器。
 */
import type { RewardGrantResult, RewardPlanLine } from '../api/ApiCommands';

/** 給演出模組的請求：結果已入帳，這裡只含顯示所需資料 */
export interface GrantPresentationRequest {
    grantId: string;
    type: string;
    args: Record<string, unknown>;
    skippable: boolean;
    /** 要揭示的內容，順序即揭示順序 */
    lines: RewardPlanLine[];
}

export interface GrantPresentationModule {
    /** 播放完（或被玩家跳過）才 resolve；不得拋出會影響呼叫端的例外 */
    play(request: GrantPresentationRequest): Promise<void>;
}

/** 最簡 UI 出口：instant／chest 的實際畫面由場景提供（彈窗、toast…），此介面讓演出模組不依賴 cc */
export interface GrantPresentationSink {
    showRewardList(request: GrantPresentationRequest): Promise<void>;
    showChest(request: GrantPresentationRequest, skin: string): Promise<void>;
}

export interface IPresentationRegistry {
    register(type: string, module: GrantPresentationModule): void;
    has(type: string): boolean;
    get(type: string): GrantPresentationModule | undefined;
}

export class PresentationRegistry implements IPresentationRegistry {
    private readonly _modules = new Map<string, GrantPresentationModule>();

    public register(type: string, module: GrantPresentationModule): void { this._modules.set(type, module); }
    public has(type: string): boolean { return this._modules.has(type); }
    public get(type: string): GrantPresentationModule | undefined { return this._modules.get(type); }
}

/** 內建 instant：直接列出獲得清單（最省，預設） */
export function createInstantPresentation(sink: GrantPresentationSink): GrantPresentationModule {
    return { play: (request) => sink.showRewardList(request) };
}

/** 內建 chest：開寶箱逐件揭示；皮膚由 args.skin 決定，缺值用 wood */
export function createChestPresentation(sink: GrantPresentationSink): GrantPresentationModule {
    return { play: (request) => sink.showChest(request, typeof request.args.skin === 'string' ? request.args.skin : 'wood') };
}

/** 註冊 MVP 的兩個內建演出（instant、chest）；其他演出由各玩法自行 register */
export function registerBuiltinPresentations(registry: IPresentationRegistry, sink: GrantPresentationSink): void {
    registry.register('instant', createInstantPresentation(sink));
    registry.register('chest', createChestPresentation(sink));
}

/**
 * 播放一筆已入帳的給獎結果。override 可由客戶端畫面設定降級（例如玩家選「一律快速」→ instant），
 * 但只改演出、不改結果。找不到演出模組退回 instant；連 instant 都沒有就只記 log，帳目早已入帳。
 */
export async function presentGrant(
    result: Pick<RewardGrantResult, 'grantId' | 'plan' | 'presentation'>,
    registry: IPresentationRegistry,
    options: { override?: string; log?: (message: string) => void } = {},
): Promise<void> {
    const log = options.log ?? ((message: string): void => { console.warn(message); });
    const wanted = options.override ?? result.presentation.type;
    let type = wanted;
    if (!registry.has(type)) {
        log(`[Reward] 演出 ${wanted} 未註冊，退回 instant（grant ${result.grantId}）`);
        type = 'instant';
    }
    const module = registry.get(type);
    if (!module) {
        log(`[Reward] 連 instant 演出也未註冊，略過播放（grant ${result.grantId}，獎勵已入帳）`);
        return;
    }
    try {
        await module.play({
            grantId: result.grantId,
            type,
            args: result.presentation.args,
            skippable: result.presentation.skippable,
            lines: result.plan,
        });
    } catch (error) {
        log(`[Reward] 演出 ${type} 播放失敗（獎勵已入帳）：${error instanceof Error ? error.message : String(error)}`);
    }
}
