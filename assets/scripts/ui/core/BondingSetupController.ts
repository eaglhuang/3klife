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
import { bloodFatigueForecast } from '../../core/systems/BloodFatigue';
import { DIVERSITY_HINT } from '../../core/systems/DiversityFactor';
import { HIDDEN_LINEAGE_COST, hiddenLineageLine, PEDIGREE_PROBE_COST, pedigreeProbeLine } from '../../core/systems/PedigreeProbe';
import { getSage } from '../../core/systems/SageDivination';
import { OMEN_LABEL, pickOmen, type OmenKind, type SageRemark } from '../../core/systems/SageRemarks';
import { buildBreedingBirthRecord, type BreedingBirthRecord } from '../../core/systems/BreedingBirthRecord';
import type { FactorColor } from '../../core/systems/FactorInheritance';
import { buildBreedingPreviewLines } from './BreedingPreviewPresenter';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { factorMaskLabels } from '../../core/systems/FactorMask';
import { factorStageText } from '../../core/systems/FactorVisibility';
import { matchRumorLine, sameSurnameNote, matchesRumorRoute, nextRumorRoute, RumorRoute, rumorRouteFiltered, rumorRouteName } from '../../core/systems/MatchRumor';
import { yuedanFiltered, yuedanList, yuedanRevealLine } from '../../core/systems/YuedanReview';
import { centuryAllianceTag, synergyWindowLine, type FamilySynergyLedger } from '../../core/systems/FamilySynergy';
import { compactCeremonyLine, kinWarningLine } from '../../core/systems/BondingStoryLines';
import { compactCostFor, compactFamilyOf, compactSynergyFull, heritageFactorsOf, sharedFactorsOf } from '../../core/systems/FamilyCompact';
import { epContribLine } from '../../core/systems/EpLegacyBonus';
import { bondingSeatText } from '../../core/systems/BloodlineTreeSlots';
import { blueFactorCapLine, blueFactorCaps, lineageSynergyHint, lineageSynergyLine, sharedBlueGenesOf } from '../../core/systems/LineageSynergy';
import { kinPurificationHint, kinPurificationLine } from '../../core/systems/KinPurification';
import type { GeneralGeneConfig } from '../../core/models/GeneralUnit';
import type { FactorDictionary } from '../../core/systems/FactorInheritance';
import type { BreedingService } from '../../core/services/BreedingService';
import { type BreedTextLookup, fallbackBreedText } from './BreedingTexts';
import { relationLoreText, withRelationFallback } from './RelationTexts';
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
    statOf,
    EP_BASE,
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
    // G3 §H UI_G3_SAME_SURNAME_BLOCK
    'same-clan': '禮法森嚴：同宗同姓直系與堂親禁止聯姻。唯外戚表親（姑表、姨表、隔代外姻）可進行聯姻並觸發【血脈純化】。',
};

/** Breeding_Mode：退役年齡後仍為活體武將的結緣視為和平血統線（只做摘要，不另開系統） */
export type BondingMode = 'Standard' | 'Peace_Lineage';

/** 批語面板用的色系中文名 */
/** 結緣面板名士批語列數（layout SageRow0~2） */
export const SAGE_LINE_COUNT = 3;

const FACTOR_COLOR_NAME: Record<FactorColor, string> = { blue: '藍', pink: '粉', green: '綠', purple: '紫', white: '白', red: '紅' };

/** 求籤令數量標籤（ORAC-05）：負數與非有限數當 0，小數無條件捨去 */
export function oracleTokenText(count: number): string {
    const safe = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
    return `求籤令 ×${safe}`;
}

export interface BondingView {
    fatherId: string | null;
    motherId: string | null;
    mode: BondingMode | null;
    /** 名士批語各列對應的名士 id（sageLine0~2 的小頭像用） */
    sageIds: string[];
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
    /** 求籤令數量（ORAC-05）；未提供時顯示 ×0 */
    oracleTokens?: () => number;
    breeding: Pick<BreedingService, 'checkEligibility' | 'previewEp' | 'breed'> & Partial<Pick<BreedingService, 'ancestorSeats' | 'diversityOf' | 'kinPurificationTargets' | 'pedigreeProbe' | 'hiddenLineage'>>;
    /** 譜牒密考（G4 §F-2 Layer 3）；未提供時不能密考 */
    isPedigreeProbed?: (fatherId: string, motherId: string) => boolean;
    probePedigree?: (fatherId: string, motherId: string) => Promise<boolean>;
    isHiddenLineageProbed?: (fatherId: string, motherId: string) => boolean;
    probeHiddenLineage?: (fatherId: string, motherId: string) => Promise<boolean>;
    /** 開畫面前的準備（載入血統圖、補回已出生子嗣）；失敗只提示，不擋畫面 */
    prepare?: () => Promise<unknown>;
    /** 結緣後存檔；失敗只回報，不回滾 */
    persist?: () => Promise<unknown>;
    /** 結緣的壽命消耗（6 月，父母各扣）；正式環境接 GameSession.spendLifespan */
    spendLifespan?: (generalId: string, command: 'breeding') => { events: readonly { type: string }[] } | null;
    /** 玩家發現等級，決定父母因子是否顯示名稱；未提供時視為 1（只看得到藍粉） */
    playerDiscoveryLevel?: () => number;
    /** 月旦評揭露因子名稱用；正式環境接 GameSession.factorDictionary */
    factorDictionary?: () => FactorDictionary | undefined;
    /** 天象異變的存檔亂數種子（PROG-2-0823）；未提供時視為 0 */
    omenSeed?: () => number;
    /** 結緣成功時記下本機子嗣紀錄（BRD-12）；正式環境接 GameSession.recordBreedingBirth，不送 server */
    recordBreeding?: (record: BreedingBirthRecord) => void;
    /** 劇本演出句（G2／G3 §G）；通知欄只有一行，正式環境接 toast，未提供時不演出 */
    announce?: (line: string) => void;
    /** 世交相性 K 的滑動窗（G3 §F-2）；未提供時不顯示 */
    familySynergy?: () => FamilySynergyLedger;
    /** 世交合譜收的黃金（G3 §F-3）；未提供時不能合譜 */
    gold?: () => number;
    spendGold?: (amount: number) => boolean;
    /** 共鳴標籤 id 換顯示名稱；正式環境查因子字典，未提供時顯示原值 */
    tagName?: (tag: string) => string | null | undefined;
    /** 結緣畫面文案查詢（ui.breed.*）；正式環境接 i18n.t，未提供時用 zh-TW 預設文案 */
    text?: BreedTextLookup;
}

type HeritageSlotKind = 'compact' | 'heritage';

export class BondingSetupController {
    private _fatherId: string | null = null;
    private _motherId: string | null = null;
    private _notice = '';
    private _warnedPair = '';
    private _pairWarningReady = false;
    /** 只看月旦評榜上人物（G4 §H）；只影響清單，不寫存檔 */
    private _yuedanOnly = false;
    /** 鄉評路線篩選（G4 §F-2 Layer 1）；只影響清單，不寫存檔 */
    private _route: RumorRoute = null;
    /** 主門風承襲槽選了什麼（合譜或家傳）；受孕成功後清掉，不寫存檔 */
    private _slotPick: { kind: HeritageSlotKind; id: string } | null = null;

    constructor(private readonly _deps: BondingSetupDeps) {}

    private _t(key: string, ...args: string[]): string {
        return (this._deps.text ?? fallbackBreedText)(key, ...args);
    }

    /** 名士批語：最多三列，各列一位名士；未解鎖足夠名士時只回提示句 */
    /** G2 §E #1：雙親各 14 席的格位文字 */
    private _seatTexts(prefix: string, generalId: string): Record<string, string> {
        const seats = this._deps.breeding.ancestorSeats?.(generalId) ?? [];
        const texts: Record<string, string> = {};
        seats.forEach((person, i) => { texts[`${prefix}${i}`] = bondingSeatText(i, person); });
        return texts;
    }

    private _sageRemarks(fatherId: string, motherId: string): { ids: string[]; lines: string[]; hint: string } {
        if (!this._deps.sageRemarks) return { ids: [], lines: [], hint: '' };
        const remarks = this._deps.sageRemarks(fatherId, motherId).slice(0, SAGE_LINE_COUNT);
        if (remarks.length === 0) return { ids: [], lines: [], hint: '名士批語：需先解鎖 2 位名士' };
        return {
            ids: remarks.map((remark) => remark.sageId),
            lines: remarks.map((remark) => `${getSage(remark.sageId)?.name ?? remark.sageId}：${FACTOR_COLOR_NAME[remark.color]}${remark.keyword ? `（${remark.keyword}）` : ''}`),
            hint: '',
        };
    }

    // ── 清單 ───────────────────────────────────────────────────────────────

    /** 可放進父方欄位的武將；精力不足等暫時狀態仍列出，由資格檢查說明原因 */
    fathers(): BreedingGeneral[] {
        return this._applyFilters(this._parents().filter((g) => isMale(g)));
    }

    /** 結緣畫面：目前選中的母方待產中時回傳劇本句（PROG-2-0732，ui.vit.script.pregnancy_lock）；否則 null */
    pregnantMotherHint(): string | null {
        const mother = this.mothers().find((g) => g.id === this._motherId);
        if (!mother || (mother.pregnancySeasonsLeft ?? 0) <= 0) return null;
        return vitalityScriptText(this._deps.text ?? fallbackBreedText, VITALITY_SCRIPT_KEYS.pregnancyLock, mother.name);
    }

    mothers(): BreedingGeneral[] {
        return this._applyFilters(this._parents().filter((g) => isFemale(g)));
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

    /** 切換只看月旦評；目前選的人不在清單裡時，getView 會改挑清單內的預設配對 */
    toggleYuedanFilter(): void {
        this._yuedanOnly = !this._yuedanOnly;
        const listed = this._yuedanIds();
        const parents = this._parents();
        const missing = [
            parents.some((g) => isMale(g) && listed.indexOf(g.id) >= 0) ? '' : '父方',
            parents.some((g) => isFemale(g) && listed.indexOf(g.id) >= 0) ? '' : '母方',
        ].filter((side) => !!side);
        this._notice = this._yuedanOnly && missing.length > 0 ? `月旦評榜上沒有${missing.join('、')}人選，這邊仍顯示全部。` : '';
    }

    /** 切換鄉評路線；目前選的人不在清單裡時，getView 會改挑清單內的預設配對 */
    cycleRumorRoute(): void {
        this._route = nextRumorRoute(this._route);
        const route = this._route;
        const parents = this._parents();
        const hasMatch = (side: BreedingGeneral[]): boolean => this._applyYuedanFilter(side).some((g) => matchesRumorRoute(g, route));
        const missing = [
            hasMatch(parents.filter((g) => isMale(g))) ? '' : '父方',
            hasMatch(parents.filter((g) => isFemale(g))) ? '' : '母方',
        ].filter((side) => !!side);
        this._notice = missing.length > 0 ? `沒有${rumorRouteName(route)}路線的${missing.join('、')}人選，這邊不篩路線。` : '';
    }

    /** 不用 → 合譜各因子 → 家傳各因子 → 不用；同一胎只能選一項 */
    cycleCompact(): void {
        const options = this._slotOptions();
        const current = this._selectedSlot();
        const next = current ? options.findIndex((option) => option.kind === current.kind && option.gene.id === current.gene.id) + 1 : 0;
        const picked = options[next];
        this._slotPick = picked ? { kind: picked.kind, id: picked.gene.id ?? '' } : null;
        this._notice = '';
    }

    /** 譜牒官預警（G3 §G）；畫面刷新時呼叫，同一對連續刷新只提一次；血統圖載入前查不到共祖，先不判 */
    announcePairWarning(): void {
        if (!this._pairWarningReady) return;
        const pair = this._currentPair();
        const key = pair ? `${pair.father.id}|${pair.mother.id}` : '';
        if (key === this._warnedPair) return;
        this._warnedPair = key;
        if (!pair) return;
        const level = this._deps.playerDiscoveryLevel?.() ?? 1;
        const target = (this._deps.breeding.kinPurificationTargets?.(pair.father.id, pair.mother.id) ?? []).find((item) => (item.gene.discoveryLevel ?? 1) <= level);
        if (target) this._deps.announce?.(kinWarningLine(pair.father.name, pair.mother.name, target.ancestorName));
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
        this._pairWarningReady = false;
        try {
            await this._deps.prepare?.();
        } catch {
            this._notice = '血統資料載入失敗，EP 預估可能偏低';
        }
        this._warnedPair = '';
        this._pairWarningReady = true;
    }

    /** 確認結緣；精力無論成敗都會扣，受孕成功時子嗣以 0 歲加入名冊 */
    async confirm(): Promise<BreedingResult> {
        const fatherId = this.fatherId;
        const motherId = this.motherId;
        if (!fatherId || !motherId) throw new Error('[BondingSetup] 請先選好父方與母方');

        const compact = this._selectedCompact();
        const cost = compact ? this._compactCost() : 0;
        const canPay = !!compact && (this._deps.gold?.() ?? 0) >= cost;
        const heritage = this._selectedHeritage();
        const result = this._deps.breeding.breed(fatherId, motherId, undefined, canPay ? compact?.id : undefined, heritage?.id);
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
                + `。天象異變：${OMEN_LABEL[omen]}。`;
            // 驗證通過才記錄；驗證失敗不影響結緣結果（BRD-12 暫定）
            const built = buildBreedingBirthRecord(result, omen);
            if (built?.record) this._deps.recordBreeding?.(built.record);
            const compactFamily = compact && canPay ? compactFamilyOf(result.father, result.mother) : null;
            if (compact && compactFamily) this._deps.announce?.(compactCeremonyLine(compact.displayName ?? compact.id ?? '', compactSynergyFull(compactFamily, this._deps.familySynergy?.())));
            if (compact && !canPay) {
                this._notice += '　黃金不足，這胎未行世交合譜。';
            } else if (compact && result.compactRescued && this._deps.spendGold?.(cost)) {
                this._notice += `　世交合譜：保住了 ${compact.displayName ?? compact.id}，耗黃金 ${cost}。`;
            } else if (compact) {
                this._notice += `　世交合譜：${compact.displayName ?? compact.id} 本就傳下，未耗黃金。`;
            }
            if (heritage) {
                this._notice += result.heritageRescued
                    ? `　父系家傳：保住了 ${heritage.displayName ?? heritage.id}。`
                    : `　父系家傳：${heritage.displayName ?? heritage.id} 本就傳下。`;
            }
            // 字典沒收錄的因子，子嗣身上的名稱只有 id，所以取父親的
            const synergyGene = result.father.genes?.find((gene) => gene.id === result.lineageSynergyFactorId);
            if (synergyGene) this._notice += `　${lineageSynergyLine(synergyGene.displayName ?? synergyGene.id ?? '')}`;
            if (result.kinPurification) this._notice += `　${kinPurificationLine(result.kinPurification)}`;
            this._slotPick = null;
        }
        // 父母壽命耗盡時提示，與培育回合的「壽命耗盡，武將已故」一致（QA 回報，PROG-2-0224）
        const deceased = [
            fatherLifespan?.events.some((event) => event.type === 'died') ? result.father.name : null,
            motherLifespan?.events.some((event) => event.type === 'died') ? result.mother.name : null,
        ].filter((name): name is string => name !== null);
        if (deceased.length > 0) {
            this._notice += `　${deceased.join('、')}壽命耗盡，已故`;
        }
        // 宿敵等關係事件的劇本台詞（PROG-2-1406）：同季同對只在第一次結緣時出現
        const lookup = withRelationFallback(this._deps.text ?? fallbackBreedText);
        for (const hit of result.relationEvents ?? []) {
            this._notice += `　${relationLoreText(hit.loreKey, [], lookup)}`;
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
            yuedanFilterLabel: this._yuedanOnly ? '顯示全部' : '只看月旦評',
            rumorRouteLabel: `路線：${rumorRouteName(this._route)}`,
            compactLabel: this._slotLabel(),
            bondNotice: this._notice,
            bondEmptyHint: `名冊中需要至少一位滿 ${BREEDING_MIN_AGE} 歲的男性與女性武將才能結緣。可先到轉蛋招募，或推進季度讓子嗣長大。`,
            fatherPager: pagerText(fathers, father),
            motherPager: pagerText(mothers, mother),
        };
        const actives: Record<string, boolean> = {
            bondPanel: false,
            bondEmptyHint: false,
        };
        for (let i = 0; i < SAGE_LINE_COUNT; i++) actives[`sageRow${i}`] = false;
        const enabled: Record<string, boolean> = {
            btnCloseBond: true,
            btnYuedanFilter: this._yuedanIds().length > 0,
            btnRumorRoute: this._parents().length > 0,
            btnCompact: this._slotOptions().length > 0,
            btnPrevFather: fathers.length > 1,
            btnNextFather: fathers.length > 1,
            btnPrevMother: mothers.length > 1,
            btnNextMother: mothers.length > 1,
            btnConfirmBond: false,
            btnProbePedigree: false,
        };

        const level = this._deps.playerDiscoveryLevel?.() ?? 1;
        texts.factorStage = factorStageText(level);
        const dictionary = this._deps.factorDictionary?.();
        const yuedanIds = this._yuedanIds();
        const yuedan = (general: BreedingGeneral): string | null => (yuedanIds.indexOf(general.id) >= 0 ? yuedanRevealLine(general, dictionary) : null);

        if (!father || !mother) {
            actives.bondEmptyHint = true;
            Object.assign(texts, parentTexts('father', father, level, yuedan), parentTexts('mother', mother, level, yuedan));
            return { fatherId: father?.id ?? null, motherId: mother?.id ?? null, mode: null, sageIds: [], texts, actives, enabled };
        }

        actives.bondPanel = true;
        Object.assign(texts, parentTexts('father', father, level, yuedan), parentTexts('mother', mother, level, yuedan));

        const mode: BondingMode = (father.age ?? 0) >= RETIREMENT_AGE || (mother.age ?? 0) >= RETIREMENT_AGE ? 'Peace_Lineage' : 'Standard';
        texts.modeChip = mode === 'Peace_Lineage'
            ? '模式：和平血統線（保種）· 退役年齡仍可親傳，轉為教官後即失去資格'
            : '模式：一般結緣 · 雙方仍具親傳資格';

        Object.assign(texts, this._seatTexts('fatherTree', father.id), this._seatTexts('motherTree', mother.id));

        const eligibility = this._deps.breeding.checkEligibility(father.id, mother.id);
        const ep = this._deps.breeding.previewEp(father.id, mother.id);
        texts.epEstimate = this._t('ui.breed.ep_display', String(ep.ep), ep.rating);
        const preview = buildBreedingPreviewLines(ep, this._deps.tagName);
        // 只揭露玩家已看得到的因子，同血脈走近親純化不算連攜
        const synergyHint = isSameBloodline(father, mother) ? null : lineageSynergyHint(sharedBlueGenesOf(father, mother, this._deps.factorDictionary?.()).filter((gene) => (gene.discoveryLevel ?? 1) <= level));
        texts.epDetail = ['基礎 50', preview.breakdownLine, preview.tagLine, ...(synergyHint ? [synergyHint] : [])].join(' · ');
        texts.conceptionLabel = `受孕率 ${Math.round(conceptionRate(father, mother) * 100)}%`;
        const ledger = this._deps.familySynergy?.();
        const synergyLine = ledger ? synergyWindowLine(father as { familyUid?: string }, mother as { familyUid?: string }, ledger) : null;
        if (synergyLine) texts.conceptionLabel += `｜${synergyLine}`;
        texts.conceptionLabel += `｜${epContribLine(father.ep ?? EP_BASE, mother.ep ?? EP_BASE)}`;
        const sage = this._sageRemarks(father.id, mother.id);
        texts.sageRemarkLines = sage.hint;
        sage.lines.forEach((line, i) => { texts[`sageLine${i}`] = line; actives[`sageRow${i}`] = true; });
        const tokens = this._deps.oracleTokens?.() ?? 0;
        texts.oracleTokenLabel = oracleTokenText(tokens);
        const probed = this._deps.isPedigreeProbed?.(father.id, mother.id) ?? false;
        const probeReport = probed ? this._deps.breeding.pedigreeProbe?.(father.id, mother.id) : null;
        texts.probePedigreeLabel = probed ? '已密考' : `譜牒密考（${PEDIGREE_PROBE_COST} 券）`;
        texts.pedigreeProbeLine = probeReport ? pedigreeProbeLine(probeReport) : '';
        enabled.btnProbePedigree = !probed && !!this._deps.probePedigree && tokens >= PEDIGREE_PROBE_COST;
        const lineageProbed = this._deps.isHiddenLineageProbed?.(father.id, mother.id) ?? false;
        const lineageReport = lineageProbed ? this._deps.breeding.hiddenLineage?.(father.id, mother.id, this._deps.playerDiscoveryLevel?.() ?? 1) : null;
        texts.probeHiddenLabel = lineageProbed ? '已查隱藏血脈' : `隱藏血脈（${HIDDEN_LINEAGE_COST} 券）`;
        texts.hiddenLineageLine = lineageReport ? hiddenLineageLine(lineageReport) : '';
        enabled.btnProbeHidden = !lineageProbed && !!this._deps.probeHiddenLineage && tokens >= HIDDEN_LINEAGE_COST;
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
        const fatigueForecast = bloodFatigueForecast((father as BreedingGeneral).bloodFatigue, (mother as BreedingGeneral).bloodFatigue, eligibility.inbred);
        if (fatigueForecast) texts.inbreedingLabel += `｜${fatigueForecast}`;
        const diversity = this._deps.breeding.diversityOf?.(father.id, mother.id) ?? 1;
        if (diversity < 1) texts.inbreedingLabel += `｜${DIVERSITY_HINT}`;
        const allianceTag = ledger ? centuryAllianceTag(father as { familyUid?: string }, mother as { familyUid?: string }, ledger) : null;
        if (allianceTag) texts.inbreedingLabel += `｜${allianceTag}`;
        const kinTargets = (this._deps.breeding.kinPurificationTargets?.(father.id, mother.id) ?? []).filter((target) => (target.gene.discoveryLevel ?? 1) <= level);
        const kinHint = kinPurificationHint(kinTargets);
        // 通知欄與上限列在同一位置，有通知時先讓位
        texts.factorCapLabel = this._notice ? '' : blueFactorCapLine(blueFactorCaps(father, mother, {
            dictionary: this._deps.factorDictionary?.(),
            synergyAllowed: !isSameBloodline(father, mother),
            purifyIds: kinTargets.map((target) => target.gene.id ?? ''),
            isVisible: (gene) => (gene.discoveryLevel ?? 1) <= level,
        }));
        if (kinHint) texts.inbreedingLabel += `｜${kinHint}`;
        const surnameNote = sameSurnameNote(father.name, mother.name);
        if (surnameNote) texts.inbreedingLabel += `｜${surnameNote}`;
        const compact = this._selectedCompact();
        if (compact) {
            const cost = this._compactCost();
            texts.inbreedingLabel += `｜世交合譜：鎖定 ${compact.displayName ?? compact.id}，被擠掉時才耗黃金 ${cost}${(this._deps.gold?.() ?? 0) < cost ? '（不足）' : ''}`;
        }
        const heritage = this._selectedHeritage();
        if (heritage) texts.inbreedingLabel += `｜父系家傳：保 ${heritage.displayName ?? heritage.id} 傳給子嗣，不另收費`;
        enabled.btnConfirmBond = eligibility.ok;

        return { fatherId: father.id, motherId: mother.id, mode, sageIds: sage.ids, texts, actives, enabled };
    }

    async probePedigree(): Promise<boolean> {
        const pair = this._currentPair();
        if (!pair || !this._deps.probePedigree) return false;
        return this._deps.probePedigree(pair.father.id, pair.mother.id);
    }

    async probeHiddenLineage(): Promise<boolean> {
        const pair = this._currentPair();
        if (!pair || !this._deps.probeHiddenLineage) return false;
        return this._deps.probeHiddenLineage(pair.father.id, pair.mother.id);
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    private _currentPair(): { father: BreedingGeneral; mother: BreedingGeneral } | null {
        const father = this.fathers().find((g) => g.id === this.fatherId);
        const mother = this.mothers().find((g) => g.id === this.motherId);
        return father && mother ? { father, mother } : null;
    }

    /** 雙親之一來自聯姻名門才能合譜；看不到的因子不列出 */
    private _compactOptions(): GeneralGeneConfig[] {
        const pair = this._currentPair();
        if (!pair || !this._deps.spendGold || !compactFamilyOf(pair.father, pair.mother)) return [];
        const level = this._deps.playerDiscoveryLevel?.() ?? 1;
        return sharedFactorsOf(pair.father, pair.mother).filter((gene) => (gene.discoveryLevel ?? 1) <= level);
    }

    /** 父親的核心因子；看不到的不列出 */
    private _heritageOptions(): GeneralGeneConfig[] {
        const pair = this._currentPair();
        if (!pair) return [];
        const level = this._deps.playerDiscoveryLevel?.() ?? 1;
        return heritageFactorsOf(pair.father, this._deps.factorDictionary?.()).filter((gene) => (gene.discoveryLevel ?? 1) <= level);
    }

    private _slotOptions(): { kind: HeritageSlotKind; gene: GeneralGeneConfig }[] {
        return [
            ...this._compactOptions().map((gene) => ({ kind: 'compact' as const, gene })),
            ...this._heritageOptions().map((gene) => ({ kind: 'heritage' as const, gene })),
        ];
    }

    /** 換配對後原本選的因子可能已不可選，這裡一併視為沒選 */
    private _selectedSlot(): { kind: HeritageSlotKind; gene: GeneralGeneConfig } | null {
        const pick = this._slotPick;
        if (!pick) return null;
        return this._slotOptions().find((option) => option.kind === pick.kind && option.gene.id === pick.id) ?? null;
    }

    private _selectedCompact(): GeneralGeneConfig | null {
        const slot = this._selectedSlot();
        return slot?.kind === 'compact' ? slot.gene : null;
    }

    private _selectedHeritage(): GeneralGeneConfig | null {
        const slot = this._selectedSlot();
        return slot?.kind === 'heritage' ? slot.gene : null;
    }

    private _slotLabel(): string {
        const slot = this._selectedSlot();
        if (!slot) return '門風：不用';
        return `${slot.kind === 'compact' ? '合譜' : '家傳'}：${slot.gene.displayName ?? slot.gene.id}`;
    }

    private _compactCost(): number {
        const pair = this._currentPair();
        const family = pair ? compactFamilyOf(pair.father, pair.mother) : null;
        return family ? compactCostFor(family, this._deps.familySynergy?.()) : 0;
    }

    private _yuedanIds(): string[] {
        return yuedanList(this._deps.roster.getAll() as BreedingGeneral[]).map((g) => g.id);
    }

    private _applyYuedanFilter(candidates: BreedingGeneral[]): BreedingGeneral[] {
        return this._yuedanOnly ? yuedanFiltered(candidates, this._yuedanIds()) : candidates;
    }

    private _applyFilters(candidates: BreedingGeneral[]): BreedingGeneral[] {
        return rumorRouteFiltered(this._applyYuedanFilter(candidates), this._route);
    }

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

function parentTexts(side: 'father' | 'mother', general: BreedingGeneral | null, playerLevel: number, yuedan: (general: BreedingGeneral) => string | null): Record<string, string> {
    if (!general) {
        return {
            [`${side}Name`]: side === 'father' ? '父方：無人可選' : '母方：無人可選',
            [`${side}Info`]: '',
            [`${side}Rumor`]: '',
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
        [`${side}Rumor`]: yuedan(general) ?? matchRumorLine({
            str: statOf(general, 'str'),
            int: statOf(general, 'int'),
            lea: statOf(general, 'lea'),
            pol: statOf(general, 'pol'),
            cha: statOf(general, 'cha'),
        }),
    };
}
