// @spec-source → 結緣系統（配種）.md (doc_spec_0028) §E #1~#4 #9 #10 #11、§H 字串、MVP遊戲驗證規格書.md (doc_spec_0045) §E #6 #7、UI 規格書.md 結緣系統列、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) BondingSetup
/**
 * BondingSetupController — 結緣配置畫面的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 從名冊列出可當父方 / 母方的武將（存活、滿 20 歲、未卡片化），上一位 / 下一位循環挑選
 *   - 顯示雙方年齡、精力、親傳次數、待產狀態；模式摘要（一般 / 和平血統線）
 *   - 顯示資格檢查結果、近親警告、受孕率、EP 預估與明細
 *   - 確認結緣 → 呼叫 BreedingService.breed() → 存檔 → 把結果寫進提示
 *
 * 所有 texts / actives / enabled 的 key 都等於 bonding-setup-main.json 的節點 id，
 * tests/BondingSetup.test.ts 會逐一比對。
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 SelectFather / SelectMother / Confirm，
 * 畫面層拿 GetView() 的 ViewModel 一次刷新 Text 與 Button.interactable。
 */
import { getSage } from '../../core/systems/SageDivination';
import { OMEN_LABEL, pickOmen, type OmenKind, type SageRemark } from '../../core/systems/SageRemarks';
import { buildBreedingBirthRecord, type BreedingBirthRecord } from '../../core/systems/BreedingBirthRecord';
import type { FactorColor } from '../../core/systems/FactorInheritance';
import { buildBreedingPreviewLines } from './BreedingPreviewPresenter';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { factorMaskLabels } from '../../core/systems/FactorMask';
import { factorStageText } from '../../core/systems/FactorVisibility';
import type { BreedingService } from '../../core/services/BreedingService';
import { type BreedTextLookup, fallbackBreedText } from './BreedingTexts';
import { VITALITY_SCRIPT_KEYS, vitalityScriptText } from './VitalityScriptTexts';
import {
    BREEDING_MIN_AGE,
    BreedingBlockReason,
    BreedingGeneral,
    BreedingResult,
    conceptionRate,
    FATHER_VIGOR_COST,
    isFemale,
    isMale,
    INBREEDING_VITALITY_MULTIPLIER,
    isSameBloodline,
    lifetimeBreedingCap,
    MOTHER_VIGOR_COST,
    PREGNANCY_LOCK_SEASONS,
} from '../../core/systems/BreedingSystem';
import { GENERAL_STATUS_DEAD, RETIREMENT_AGE } from '../../core/systems/GeneralAging';

export const BLOCK_REASON_TEXT: Record<BreedingBlockReason, string> = {
    'same-general': '父母不可為同一人',
    'father-not-male': '父方需為男性',
    'mother-not-female': '母方需為女性',
    'father-underage': `父方未滿 ${BREEDING_MIN_AGE} 歲`,
    'mother-underage': `母方未滿 ${BREEDING_MIN_AGE} 歲`,
    'father-dead': '父方已離世',
    'mother-dead': '母方已離世',
    'father-mentor-card': '父方已轉為教官，不再親傳',
    'mother-mentor-card': '母方已轉為教官，不再親傳',
    'father-low-vigor': `父方精力不足 ${FATHER_VIGOR_COST}`,
    'mother-low-vigor': `母方精力不足 ${MOTHER_VIGOR_COST}`,
    'father-breeding-cap': '父方已達一生親傳上限',
    'mother-breeding-cap': '母方已達一生親傳上限',
    'mother-pregnant': '母方待產中',
    inbreeding: '同源血脈過於濃厚，後裔恐有天殤之虞！',
};

/** Breeding_Mode：退役年齡後仍為活體武將的結緣視為和平血統線（只做摘要，不另開系統） */
export type BondingMode = 'Standard' | 'Peace_Lineage';

/** 批語面板用的色系中文名 */
const FACTOR_COLOR_NAME: Record<FactorColor, string> = { blue: '藍', pink: '粉', green: '綠', purple: '紫', white: '白', red: '紅' };

export interface BondingView {
    fatherId: string | null;
    motherId: string | null;
    mode: BondingMode | null;
    /** layout 節點 id → 文字 */
    texts: Record<string, string>;
    /** layout 節點 id → 顯示 / 隱藏 */
    actives: Record<string, boolean>;
    /** 按鈕 id → 是否可按 */
    enabled: Record<string, boolean>;
}

export interface BondingSetupDeps {
    roster: { getAll(): GeneralConfig[] };
    /** 名士批語（BRD-09）：已解鎖名士的方向性批語；未提供時不顯示批語 */
    sageRemarks?: (fatherId: string, motherId: string) => SageRemark[];
    breeding: Pick<BreedingService, 'checkEligibility' | 'previewEp' | 'breed'>;
    /** 開畫面前的準備（載入血統圖、補回已出生子嗣）；失敗只提示，不擋畫面 */
    prepare?: () => Promise<unknown>;
    /** 結緣後存檔；失敗只回報，不回滾 */
    persist?: () => Promise<unknown>;
    /** 結緣的壽命消耗（6 月，父母各扣）；正式環境接 GameSession.spendLifespan */
    spendLifespan?: (generalId: string, command: 'breeding') => { events: readonly { type: string }[] } | null;
    /** 玩家發現等級，決定父母因子是否顯示名稱；未提供時視為 1（只看得到藍粉） */
    playerDiscoveryLevel?: () => number;
    /** 天象異變的存檔亂數種子（PROG-2-0823）；未提供時視為 0 */
    omenSeed?: () => number;
    /** 結緣成功時記下本機子嗣紀錄（BRD-12）；正式環境接 GameSession.recordBreedingBirth，不送 server */
    recordBreeding?: (record: BreedingBirthRecord) => void;
    /** 結緣畫面文案查詢（ui.breed.*）；正式環境接 i18n.t，未提供時用 zh-TW 預設文案 */
    text?: BreedTextLookup;
}

export class BondingSetupController {
    private _fatherId: string | null = null;
    private _motherId: string | null = null;
    private _notice = '';

    constructor(private readonly _deps: BondingSetupDeps) {}

    private _t(key: string, ...args: string[]): string {
        return (this._deps.text ?? fallbackBreedText)(key, ...args);
    }

    private _sageRemarkText(fatherId: string, motherId: string): string {
        if (!this._deps.sageRemarks) return '';
        const remarks = this._deps.sageRemarks(fatherId, motherId);
        if (remarks.length === 0) return '名士批語：需先解鎖 2 位名士';
        return remarks
            .map((remark) => `${getSage(remark.sageId)?.name ?? remark.sageId}：${FACTOR_COLOR_NAME[remark.color]}${remark.keyword ? `（${remark.keyword}）` : ''}`)
            .join('\n');
    }

    // ── 清單 ───────────────────────────────────────────────────────────────

    /** 可放進父方欄位的武將；精力不足等暫時狀態仍列出，由資格檢查說明原因 */
    fathers(): BreedingGeneral[] {
        return this._parents().filter((g) => isMale(g));
    }

    /** 結緣畫面：目前選中的母方待產中時回傳劇本句（PROG-2-0732，ui.vit.script.pregnancy_lock）；否則 null */
    pregnantMotherHint(): string | null {
        const mother = this.mothers().find((g) => g.id === this._motherId);
        if (!mother || (mother.pregnancySeasonsLeft ?? 0) <= 0) return null;
        return vitalityScriptText(this._deps.text ?? fallbackBreedText, VITALITY_SCRIPT_KEYS.pregnancyLock, mother.name);
    }

    mothers(): BreedingGeneral[] {
        return this._parents().filter((g) => isFemale(g));
    }

    get fatherId(): string | null {
        this._ensureDefaultPair();
        return this._fatherId;
    }

    get motherId(): string | null {
        this._ensureDefaultPair();
        return this._motherId;
    }

    selectFather(id: string): void {
        this._fatherId = id;
        this._notice = '';
    }

    selectMother(id: string): void {
        this._motherId = id;
        this._notice = '';
    }

    cycleFather(step = 1): void {
        this._fatherId = cycle(this.fathers(), this.fatherId, step);
        this._notice = '';
    }

    cycleMother(step = 1): void {
        this._motherId = cycle(this.mothers(), this.motherId, step);
        this._notice = '';
    }

    // ── 動作 ───────────────────────────────────────────────────────────────

    async open(): Promise<void> {
        this._notice = '';
        try {
            await this._deps.prepare?.();
        } catch {
            this._notice = '血統資料載入失敗，EP 預估可能偏低';
        }
    }

    /** 確認結緣；精力無論成敗都會扣，受孕成功時子嗣以 0 歲加入名冊 */
    async confirm(): Promise<BreedingResult> {
        const fatherId = this.fatherId;
        const motherId = this.motherId;
        if (!fatherId || !motherId) throw new Error('[BondingSetup] 請先選好父方與母方');

        const result = this._deps.breeding.breed(fatherId, motherId);
        if (result.outcome === 'blocked') {
            this._notice = `無法結緣：${result.reasons.map((r) => BLOCK_REASON_TEXT[r]).join('、')}`;
            return result;
        }
        const fatherLifespan = this._deps.spendLifespan?.(fatherId, 'breeding');
        const motherLifespan = this._deps.spendLifespan?.(motherId, 'breeding');
        if (result.outcome === 'failed') {
            this._notice = `${result.father.name} 與 ${result.mother.name} 此番未能結緣受孕，精力已消耗`;
        } else {
            const child = result.child!;
            const gender = child.gender === '女' ? '千金' : '麟兒';
            const omen: OmenKind = pickOmen(child.birthSeason ?? 0, this._deps.omenSeed?.() ?? 0);
            this._notice = this._t('ui.breed.child_born', result.father.name, result.mother.name, gender)
                + `子嗣名為「${child.name}」。`
                + this._t('ui.breed.preg_status', result.mother.name, String(PREGNANCY_LOCK_SEASONS))
                + `天象異變：${OMEN_LABEL[omen]}。`;
            // 驗證通過才記錄；驗證失敗不影響結緣結果（BRD-12 暫定）
            const built = buildBreedingBirthRecord(result, omen);
            if (built?.record) this._deps.recordBreeding?.(built.record);
        }
        // 父母壽命耗盡時提示，與培育回合的「壽命耗盡，武將已故」一致（QA 回報，PROG-2-0224）
        const deceased = [
            fatherLifespan?.events.some((event) => event.type === 'died') ? result.father.name : null,
            motherLifespan?.events.some((event) => event.type === 'died') ? result.mother.name : null,
        ].filter((name): name is string => name !== null);
        if (deceased.length > 0) {
            this._notice += `　${deceased.join('、')}壽命耗盡，已故`;
        }
        await this._persist();
        return result;
    }

    // ── 視圖 ───────────────────────────────────────────────────────────────

    getView(): BondingView {
        const fathers = this.fathers();
        const mothers = this.mothers();
        this._ensureDefaultPair();
        const father = fathers.find((g) => g.id === this._fatherId) ?? null;
        const mother = mothers.find((g) => g.id === this._motherId) ?? null;

        const texts: Record<string, string> = {
            bondTitle: '結緣配置',
            bondNotice: this._notice,
            bondEmptyHint: `名冊中需要至少一位滿 ${BREEDING_MIN_AGE} 歲的男性與女性武將才能結緣。可先到轉蛋招募，或推進季度讓子嗣長大。`,
            fatherPager: pagerText(fathers, father),
            motherPager: pagerText(mothers, mother),
        };
        const actives: Record<string, boolean> = {
            bondPanel: false,
            bondEmptyHint: false,
        };
        const enabled: Record<string, boolean> = {
            btnCloseBond: true,
            btnPrevFather: fathers.length > 1,
            btnNextFather: fathers.length > 1,
            btnPrevMother: mothers.length > 1,
            btnNextMother: mothers.length > 1,
            btnConfirmBond: false,
        };

        const level = this._deps.playerDiscoveryLevel?.() ?? 1;
        texts.factorStage = factorStageText(level);

        if (!father || !mother) {
            actives.bondEmptyHint = true;
            Object.assign(texts, parentTexts('father', father, level), parentTexts('mother', mother, level));
            return { fatherId: father?.id ?? null, motherId: mother?.id ?? null, mode: null, texts, actives, enabled };
        }

        actives.bondPanel = true;
        Object.assign(texts, parentTexts('father', father, level), parentTexts('mother', mother, level));

        const mode: BondingMode = (father.age ?? 0) >= RETIREMENT_AGE || (mother.age ?? 0) >= RETIREMENT_AGE ? 'Peace_Lineage' : 'Standard';
        texts.modeChip = mode === 'Peace_Lineage'
            ? '模式：和平血統線（保種）· 退役年齡仍可親傳，轉為教官後即失去資格'
            : '模式：一般結緣 · 雙方仍具親傳資格';

        const eligibility = this._deps.breeding.checkEligibility(father.id, mother.id);
        const ep = this._deps.breeding.previewEp(father.id, mother.id);
        texts.epEstimate = this._t('ui.breed.ep_display', String(ep.ep), ep.rating);
        const preview = buildBreedingPreviewLines(ep);
        texts.epDetail = ['基礎 50', preview.breakdownLine, preview.tagLine].join(' · ');
        texts.conceptionLabel = `受孕率 ${Math.round(conceptionRate(father, mother) * 100)}%`;
        texts.sageRemarkLines = this._sageRemarkText(father.id, mother.id);
        texts.costLabel = this._t('ui.breed.confirm', father.name, String(FATHER_VIGOR_COST), mother.name, String(MOTHER_VIGOR_COST));
        texts.eligibilityLabel = eligibility.ok
            ? `${father.name} 與 ${mother.name} 良緣天成，可以結緣`
            : `無法結緣：${eligibility.reasons.map((r) => BLOCK_REASON_TEXT[r]).join('、')}`;
        const inbred = isSameBloodline(father, mother);
        texts.inbreedingLabel = eligibility.commonAncestorDistance !== null
            ? `近親警告：${eligibility.commonAncestorDistance} 代內有共同祖先`
            : inbred
                ? `${BLOCK_REASON_TEXT.inbreeding}子嗣精力上限 ×${INBREEDING_VITALITY_MULTIPLIER}`
                : '血緣：3 代內無共同祖先';
        enabled.btnConfirmBond = eligibility.ok;

        return { fatherId: father.id, motherId: mother.id, mode, texts, actives, enabled };
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    private _parents(): BreedingGeneral[] {
        return (this._deps.roster.getAll() as BreedingGeneral[]).filter((g) =>
            (g.status ?? '').toLowerCase() !== GENERAL_STATUS_DEAD
            && !g.isMentorCard
            && (g.age ?? 0) >= BREEDING_MIN_AGE);
    }

    /**
     * 預設配對：雙方都沒選或選的已不在清單時，挑第一組「可結緣」的配對（親傳次數用完、精力不足等會被略過）。
     * 只有一方已選時，另一方挑第一位可與它結緣者。全部不合格時才退回清單第一位，由資格檢查顯示原因。
     */
    private _ensureDefaultPair(): void {
        const fathers = this.fathers();
        const mothers = this.mothers();
        const fatherValid = fathers.some((g) => g.id === this._fatherId);
        const motherValid = mothers.some((g) => g.id === this._motherId);
        if (fatherValid && motherValid) return;

        const pair = this._firstEligiblePair(fathers, mothers, fatherValid ? this._fatherId : null, motherValid ? this._motherId : null);
        if (pair) {
            this._fatherId = pair.father;
            this._motherId = pair.mother;
            return;
        }
        if (!fatherValid) this._fatherId = fathers[0]?.id ?? null;
        if (!motherValid) this._motherId = mothers[0]?.id ?? null;
    }

    private _firstEligiblePair(
        fathers: BreedingGeneral[],
        mothers: BreedingGeneral[],
        lockedFather: string | null,
        lockedMother: string | null,
    ): { father: string; mother: string } | null {
        for (const father of fathers) {
            if (lockedFather !== null && father.id !== lockedFather) continue;
            for (const mother of mothers) {
                if (lockedMother !== null && mother.id !== lockedMother) continue;
                if (this._deps.breeding.checkEligibility(father.id, mother.id).ok) {
                    return { father: father.id, mother: mother.id };
                }
            }
        }
        return null;
    }

    private async _persist(): Promise<void> {
        try {
            await this._deps.persist?.();
        } catch {
            // 存檔失敗不回滾結緣結果；下一次動作會再存
            this._notice = `${this._notice}（存檔失敗）`;
        }
    }
}

// ── 文字整理 ───────────────────────────────────────────────────────────────

function cycle(list: BreedingGeneral[], currentId: string | null, step: number): string | null {
    if (list.length === 0) return null;
    const current = list.findIndex((g) => g.id === currentId);
    const base = current < 0 ? 0 : current;
    return list[(((base + step) % list.length) + list.length) % list.length].id;
}

function pagerText(list: BreedingGeneral[], selected: BreedingGeneral | null): string {
    if (!selected) return '0 / 0';
    return `${list.findIndex((g) => g.id === selected.id) + 1} / ${list.length}`;
}

/** 父母因子的遮罩文字；沒有因子時顯示「無因子」 */
function factorLine(general: BreedingGeneral, playerLevel: number): string {
    const labels = factorMaskLabels(general.genes ?? [], playerLevel);
    return labels.length > 0 ? `因子：${labels.join(' · ')}` : '因子：無';
}

function parentTexts(side: 'father' | 'mother', general: BreedingGeneral | null, playerLevel: number): Record<string, string> {
    if (!general) {
        return {
            [`${side}Name`]: side === 'father' ? '父方：無人可選' : '母方：無人可選',
            [`${side}Info`]: '',
        };
    }
    const vigor = general.vitality ?? general.maxVitality ?? 100;
    const maxVigor = general.maxVitality ?? general.vitality ?? 100;
    const parts = [
        `${Math.floor(general.age ?? 0)} 歲`,
        `精力 ${vigor} / ${maxVigor}`,
        `親傳 ${general.breedingCount ?? 0} / ${lifetimeBreedingCap(general)}`,
    ];
    if ((general.pregnancySeasonsLeft ?? 0) > 0) parts.push(`待產 ${general.pregnancySeasonsLeft} 季`);
    return {
        [`${side}Name`]: `${side === 'father' ? '父方' : '母方'}：${general.name}`,
        [`${side}Info`]: parts.join(' · '),
        [`${side}Factors`]: factorLine(general, playerLevel),
    };
}
