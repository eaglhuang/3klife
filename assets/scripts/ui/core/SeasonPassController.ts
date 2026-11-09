// @spec-source → 季度通行證軍功任務追蹤與雙軌獎勵階梯規格書.md (doc_spec_0627) §4、§5；裁決 11/09 第 12 題；PROG-2-2197
/**
 * SeasonPassController — 通行證面板（Mock）
 *
 * 一次看一級，左右切換 1~30 級；一鍵領取走宿主注入的 session。掛載、套 view 與提示都由宿主注入。
 */
import {
    SEASON_PASS_EXP_PER_LEVEL,
    SEASON_PASS_MOCK_MAX_LEVEL,
    seasonPassLevel,
    seasonPassRewardStatus,
    seasonPassTier,
    type SeasonPassReward,
    type SeasonPassRewardStatus,
    type SeasonPassState,
    type SeasonPassTrack,
} from '../../core/systems/SeasonPass';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface SeasonPassView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

const STATUS_TEXT: Readonly<Record<SeasonPassRewardStatus, string>> = {
    locked: '未達等級',
    claimable: '可領取',
    claimed: '已領取',
    needPremium: '需黃金戰令',
};

function rewardLine(state: SeasonPassState, level: number, track: SeasonPassTrack): string {
    const tier = seasonPassTier(level);
    const reward = track === 'free' ? tier.free : tier.premium;
    const note = reward.itemId === null ? '（Mock 只記錄）' : '';
    return `${track === 'free' ? '白銀' : '黃金'}：${reward.label}${note}　${STATUS_TEXT[seasonPassRewardStatus(state, level, track)]}`;
}

function hasClaimable(state: SeasonPassState): boolean {
    for (let level = 1; level <= seasonPassLevel(state); level += 1) {
        if (seasonPassRewardStatus(state, level, 'free') === 'claimable') return true;
        if (seasonPassRewardStatus(state, level, 'premium') === 'claimable') return true;
    }
    return false;
}

export function seasonPassView(state: SeasonPassState, page: number): SeasonPassView {
    const level = seasonPassLevel(state);
    const atMax = level >= SEASON_PASS_MOCK_MAX_LEVEL;
    const remain = atMax ? 0 : SEASON_PASS_EXP_PER_LEVEL - (state.exp % SEASON_PASS_EXP_PER_LEVEL);
    return {
        texts: {
            passTitle: '季度通行證',
            passLevel: `目前 ${level} 級 / ${SEASON_PASS_MOCK_MAX_LEVEL} 級　軍功 ${state.exp}${atMax ? '' : `（再 ${remain} 升級）`}　${state.premium ? '已解鎖黃金戰令' : '未解鎖黃金戰令'}`,
            passTierTitle: `第 ${page} 級${seasonPassTier(page).isMilestone ? '・里程碑' : ''}`,
            passFree: rewardLine(state, page, 'free'),
            passPremium: rewardLine(state, page, 'premium'),
            passMockNote: 'Mock：軍功任務與付費尚未接上，以下兩個按鈕僅供模擬',
            prevPassLabel: '上一級',
            nextPassLabel: '下一級',
            claimPassLabel: '一鍵領取',
            mockLevelLabel: '模擬升 1 級',
            mockPremiumLabel: state.premium ? '黃金戰令已解鎖' : '模擬解鎖黃金戰令',
            closePassLabel: '關閉',
        },
        actives: {},
        enabled: {
            btnPrevPassTier: page > 1,
            btnNextPassTier: page < SEASON_PASS_MOCK_MAX_LEVEL,
            btnClaimPass: hasClaimable(state),
            btnMockPassLevel: !atMax,
            btnMockPassPremium: !state.premium,
            btnClosePass: true,
        },
    };
}

export interface SeasonPassDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    apply(host: H, view: SeasonPassView): void;
    state(): SeasonPassState;
    levelUp(): Promise<void>;
    unlockPremium(): Promise<void>;
    claimAll(): Promise<SeasonPassReward[]>;
    toast(message: string): void;
}

export class SeasonPassController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _page = 1;

    constructor(private readonly _deps: SeasonPassDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnClosePass', handler: () => this.setOpen(false) },
            { buttonId: 'btnPrevPassTier', handler: () => this.turn(-1) },
            { buttonId: 'btnNextPassTier', handler: () => this.turn(1) },
            { buttonId: 'btnClaimPass', handler: () => { void this.claimAll(); } },
            { buttonId: 'btnMockPassLevel', handler: () => { void this.levelUp(); } },
            { buttonId: 'btnMockPassPremium', handler: () => { void this.unlockPremium(); } },
        ]);
        this.setOpen(false);
    }

    public get host(): H | null {
        return this._host;
    }

    public get page(): number {
        return this._page;
    }

    /** 開窗時停在目前等級 */
    public setOpen(open: boolean): void {
        if (open) {
            this._page = Math.max(1, seasonPassLevel(this._deps.state()));
            this.refresh();
        }
        if (this._host) this._host.node.active = open;
    }

    public refresh(): void {
        if (this._host) this._deps.apply(this._host, seasonPassView(this._deps.state(), this._page));
    }

    public turn(delta: number): void {
        this._page = Math.min(SEASON_PASS_MOCK_MAX_LEVEL, Math.max(1, this._page + delta));
        this.refresh();
    }

    public async levelUp(): Promise<void> {
        await this._deps.levelUp();
        this._page = Math.max(1, seasonPassLevel(this._deps.state()));
        this.refresh();
    }

    public async unlockPremium(): Promise<void> {
        await this._deps.unlockPremium();
        this.refresh();
    }

    public async claimAll(): Promise<SeasonPassReward[]> {
        const rewards = await this._deps.claimAll();
        this._deps.toast(rewards.length > 0 ? `通行證：領取 ${rewards.length} 項獎勵` : '沒有可領取的獎勵');
        this.refresh();
        return rewards;
    }
}
