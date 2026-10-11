// @spec-source → 名士預言系統.md (doc_spec_0006) §E #1 #2 #7、§G 劇本、§H 字串；因子解鎖系統.md (doc_spec_0009) §A 名士占卜途徑
/**
 * SageOracleController — 名士占卜畫面的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 列出名冊中還有鎖定因子的在世武將，上一位 / 下一位循環挑選（從結緣畫面開啟時預選父方）
 *   - 切換名士，顯示偏好面向與準確率
 *   - 顯示求籤令數量；沒有求籤令或沒有可占卜的因子時不能占卜
 *   - 占卜 → GameSession.divineFactor() → 把名士批語與覺醒結果寫進提示
 *   - 從結緣畫面帶入父母時可「預言子嗣」→ BreedingService.previewFactorPool() + GameSession.predictOffspring()，
 *     顯示批語 + 色彩傾向 + 關鍵詞（不顯示是否扭曲）；兩位名士對同一對父母色彩傾向不同時提示意見相左
 *   - 名士依累計占卜次數解鎖，未解鎖時顯示解鎖條件且不能占卜
 *
 * 所有 texts / actives / enabled 的 key 都等於 sage-oracle-main.json 的節點 id，
 * tests/SageOracle.test.ts 會逐一比對。
 *
 * 暫定（規格沒寫，PROG-2-0053）：名士批語模板依 §G 語氣改寫成「覺醒已存在武將」的版本。
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 CycleTarget / CycleSage / Divine / Predict，
 * 畫面層拿 GetView() 的 ViewModel 一次刷新 Text 與 Button.interactable。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { listAwakeningCandidates } from '../../core/systems/FactorAwakening';
import type { FactorColor } from '../../core/systems/FactorInheritance';
import { GENERAL_STATUS_DEAD } from '../../core/systems/GeneralAging';
import { ITEM_DISPLAY_NAMES, ITEM_ORACLE_TOKEN } from '../../core/systems/PlayerInventory';
import type { FactorPoolEntry } from '../../core/systems/BreedingSystem';
import { ProphecyResult, SAGES, SageDefinition, SageDivinationResult, SageId } from '../../core/systems/SageDivination';

export const SAGE_ORDER: readonly SageId[] = ['zhuge-liang', 'pang-tong', 'hua-tuo', 'xu-shao', 'sima-hui', 'zuo-ci'];

const TOKEN_NAME = ITEM_DISPLAY_NAMES[ITEM_ORACLE_TOKEN];

const COLOR_HINT: Record<FactorColor, string> = {
    blue: '屬性',
    pink: '適性',
    green: '戰法',
    purple: '天命',
    white: '天賦',
    red: '體魄',
};

/** 準確時的批語；{Gene} 換成覺醒的因子名 */
const AWAKENED_COMMENT: Record<SageId, string> = {
    'zhuge-liang': '觀其星盤，經緯之才暗藏，{Gene}今已顯現。',
    'pang-tong': '兵者詭道，此人{Gene}正合其用。',
    'hua-tuo': '此人精氣十足，筋骨若鐵，{Gene}已然甦醒。',
    'xu-shao': '月旦評曰：{Gene}，乃此人本色。',
    'sima-hui': '好，好。{Gene}，不錯。',
    'zuo-ci': '天機不可盡洩…{Gene}…嘿嘿嘿…',
};

/** 扭曲時的批語；{Hint} 換成名士偏見方向 */
const DISTORTED_COMMENT: Record<SageId, string> = {
    'zhuge-liang': '此人似有{Hint}之才，然星象未明。',
    'pang-tong': '此人{Hint}之兆隱隱，尚待沙場驗證。',
    'hua-tuo': '脈象顯示{Hint}有異，再觀數年方知。',
    'xu-shao': '此人{Hint}難以品評，留待後觀。',
    'sima-hui': '此人前程，尚難斷言。',
    'zuo-ci': '{Hint}…天意…嘿嘿…',
};

/** 子嗣預言的批語；{Color} 換成色彩傾向，{Keyword} 換成關鍵詞片段 */
const PROPHECY_COMMENT: Record<SageId, string> = {
    'zhuge-liang': '觀此子星盤，{Color}之才盡得祖脈{Keyword}。',
    'pang-tong': '此子將來，{Color}之道可期{Keyword}。',
    'hua-tuo': '此子{Color}之氣旺盛{Keyword}。',
    'xu-shao': '此子日後，當以{Color}見長{Keyword}。',
    'sima-hui': '此子……{Color}，好，好{Keyword}。',
    'zuo-ci': '天機…{Color}…嘿嘿{Keyword}…',
};

export const ORACLE_CONFLICT_TEXT = '兩位名士意見相左，真相待子嗣 5 歲揭曉。';

export interface OracleCouple {
    fatherId: string;
    motherId: string;
}

export interface SageOracleView {
    targetId: string | null;
    sageId: SageId;
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface SageOracleDeps {
    roster: { getAll(): GeneralConfig[] };
    session: {
        readonly discoveryLevel: number;
        readonly oracleCount: number;
        itemCount(itemId: string): number;
        isSageUnlocked(sageId: string): boolean;
        divineFactor(generalId: string, sageId: string): Promise<SageDivinationResult>;
        predictOffspring(pool: readonly FactorPoolEntry[], sageId: string): Promise<ProphecyResult>;
    };
    /** 預言子嗣用；沒有時預言按鈕永遠不能按 */
    breeding?: { previewFactorPool(fatherId: string, motherId: string): FactorPoolEntry[] };
}

export class SageOracleController {
    private _targetId: string | null = null;
    private _sageIndex = 0;
    private _notice = '';
    private _couple: OracleCouple | null = null;
    /** 每對父母最近一次預言：名士 → 色彩傾向（判斷意見相左） */
    private readonly _prophecies = new Map<string, Map<SageId, FactorColor>>();

    constructor(private readonly _deps: SageOracleDeps) {}

    /** 可占卜的對象：在世、非教官、還有鎖定因子 */
    targets(): GeneralConfig[] {
        return this._deps.roster.getAll().filter((g) =>
            (g.status ?? '').toLowerCase() !== GENERAL_STATUS_DEAD
            && !(g as { isMentorCard?: boolean }).isMentorCard
            && (g.genes ?? []).some((gene) => gene.isLocked !== false && typeof gene.id === 'string'));
    }

    get targetId(): string | null {
        return this._resolveTarget()?.id ?? null;
    }

    get sage(): SageDefinition {
        return SAGES[SAGE_ORDER[this._sageIndex]];
    }

    /** 開畫面：可指定預選對象（例如結緣畫面目前的父方）與要預言的父母；對象不在清單內就退回第一位 */
    open(preferredTargetId?: string | null, couple?: OracleCouple | null): void {
        if (preferredTargetId) this._targetId = preferredTargetId;
        this._couple = couple ?? null;
        this._notice = '';
    }

    cycleTarget(step = 1): void {
        const list = this.targets();
        if (list.length === 0) return;
        const current = list.findIndex((g) => g.id === this.targetId);
        const base = current < 0 ? 0 : current;
        this._targetId = list[(((base + step) % list.length) + list.length) % list.length].id;
        this._notice = '';
    }

    cycleSage(step = 1): void {
        this._sageIndex = (((this._sageIndex + step) % SAGE_ORDER.length) + SAGE_ORDER.length) % SAGE_ORDER.length;
        this._notice = '';
    }

    /** 預言子嗣；沒有帶入父母或缺少 breeding 時回傳 null */
    async predict(): Promise<ProphecyResult | null> {
        const couple = this._resolveCouple();
        if (!couple || !this._deps.breeding) return null;
        const sage = this.sage;
        const pool = this._deps.breeding.previewFactorPool(couple.father.id, couple.mother.id);
        const result = await this._deps.session.predictOffspring(pool, sage.id);
        this._notice = this._describeProphecy(sage, couple.father, couple.mother, result);
        return result;
    }

    async divine(): Promise<SageDivinationResult | null> {
        const target = this._resolveTarget();
        if (!target) return null;
        const sage = this.sage;
        const result = await this._deps.session.divineFactor(target.id, sage.id);
        this._notice = this._describe(sage, target, result);
        return result;
    }

    getView(): SageOracleView {
        const list = this.targets();
        const target = this._resolveTarget();
        const sage = this.sage;
        const tokens = this._deps.session.itemCount(ITEM_ORACLE_TOKEN);

        const unlocked = this._deps.session.isSageUnlocked(sage.id);
        const couple = this._resolveCouple();
        const lockText = `此名士尚未解鎖（需累計占卜 ${sage.unlockDivinations} 次，目前 ${this._deps.session.oracleCount} 次）`;
        const texts: Record<string, string> = {
            oracleTitle: '名士占卜',
            oracleNotice: this._notice,
            oracleEmptyHint: '名冊中沒有尚有鎖定因子的武將，暫時無需占卜。',
            sageName: unlocked ? sage.name : `${sage.name}（未解鎖）`,
            sageInfo: unlocked ? `偏好：${sage.focus} · 準確率 ${Math.round(sage.accuracy * 100)}%` : lockText,
            coupleLabel: couple
                ? `預言子嗣：${couple.father.name} × ${couple.mother.name}（批語未必準確）`
                : '從結緣畫面選好父母後，可請名士預言子嗣',
            sagePager: `${this._sageIndex + 1} / ${SAGE_ORDER.length}`,
            tokenLabel: `${TOKEN_NAME} ×${tokens}`,
            targetPager: target ? `${list.findIndex((g) => g.id === target.id) + 1} / ${list.length}` : '0 / 0',
            targetName: target ? `占卜對象：${target.name}` : '占卜對象：無人可選',
            targetInfo: '',
            costLabel: `消耗${TOKEN_NAME} ×1`,
        };
        const actives: Record<string, boolean> = {
            oraclePanel: target !== null || couple !== null,
            oracleEmptyHint: target === null && couple === null,
        };
        const enabled: Record<string, boolean> = {
            btnCloseOracle: true,
            btnPrevTarget: list.length > 1,
            btnNextTarget: list.length > 1,
            btnPrevSage: true,
            btnNextSage: true,
            btnDivine: false,
            btnPredict: unlocked && couple !== null && this._deps.breeding !== undefined && tokens >= 1,
        };
        if (!target) {
            return { targetId: null, sageId: sage.id, texts, actives, enabled };
        }

        const locked = (target.genes ?? []).filter((gene) => gene.isLocked !== false).length;
        const ready = listAwakeningCandidates(target, ['sage'], this._deps.session.discoveryLevel).length;
        texts.targetInfo = `鎖定因子 ${locked} 個 · 目前可占卜 ${ready} 個（覺醒等級 ${this._deps.session.discoveryLevel}）`;
        if (!unlocked) {
            texts.costLabel = lockText;
        } else if (tokens < 1) {
            texts.costLabel = `${TOKEN_NAME}不足，推進季度可免費領取`;
        } else if (ready === 0) {
            texts.costLabel = '覺醒等級不足，暫無可占卜的因子';
        }
        enabled.btnDivine = unlocked && tokens >= 1 && ready > 0;
        return { targetId: target.id, sageId: sage.id, texts, actives, enabled };
    }

    // ── 內部 ───────────────────────────────────────────────────────────────

    private _resolveTarget(): GeneralConfig | null {
        const list = this.targets();
        if (list.length === 0) return null;
        const found = list.find((g) => g.id === this._targetId);
        if (found) return found;
        this._targetId = list[0].id;
        return list[0];
    }

    private _resolveCouple(): { father: GeneralConfig; mother: GeneralConfig } | null {
        if (!this._couple) return null;
        const roster = this._deps.roster.getAll();
        const father = roster.find((g) => g.id === this._couple!.fatherId);
        const mother = roster.find((g) => g.id === this._couple!.motherId);
        return father && mother ? { father, mother } : null;
    }

    private _describeProphecy(sage: SageDefinition, father: GeneralConfig, mother: GeneralConfig, result: ProphecyResult): string {
        switch (result.outcome) {
            case 'predicted': {
                const prophecy = result.prophecy!;
                const color = COLOR_HINT[prophecy.color];
                const keywordPart = prophecy.keyword ? `，或有「${prophecy.keyword}」之象` : '';
                const comment = PROPHECY_COMMENT[sage.id].replace('{Color}', color).replace('{Keyword}', keywordPart);
                const parts = [`${sage.name}：『${comment}』`, `色彩傾向：${color}`];
                if (prophecy.keyword) parts.push(`關鍵詞：${prophecy.keyword}`);

                const key = `${father.id}|${mother.id}`;
                const seen = this._prophecies.get(key) ?? new Map<SageId, FactorColor>();
                const conflict = Array.from(seen.entries()).some(([other, c]) => other !== sage.id && c !== prophecy.color);
                seen.set(sage.id, prophecy.color);
                this._prophecies.set(key, seen);
                return conflict ? `${parts.join(' · ')}　${ORACLE_CONFLICT_TEXT}` : parts.join(' · ');
            }
            case 'no-token':
                return `${TOKEN_NAME}不足，無法預言`;
            case 'sage-locked':
                return `${sage.name}尚未解鎖`;
            case 'no-candidate':
                return `${father.name} 與 ${mother.name} 的祖譜沒有可預言的因子（未消耗${TOKEN_NAME}）`;
            default:
                return '預言失敗，請重新選擇';
        }
    }

    private _describe(sage: SageDefinition, target: GeneralConfig, result: SageDivinationResult): string {
        switch (result.outcome) {
            case 'awakened': {
                const gene = result.event?.displayName ?? result.event?.factorId ?? '';
                const comment = AWAKENED_COMMENT[sage.id].replace('{Gene}', gene);
                return `${sage.name}：『${comment}』【覺醒】${target.name} 的 ${gene}！`;
            }
            case 'distorted': {
                const hint = result.hintColor ? COLOR_HINT[result.hintColor] : '';
                const comment = DISTORTED_COMMENT[sage.id].replace('{Hint}', hint);
                return `${sage.name}：『${comment}』（預言模糊，因子未覺醒，已消耗${TOKEN_NAME} ×1）`;
            }
            case 'no-token':
                return `${TOKEN_NAME}不足，無法占卜`;
            case 'sage-locked':
                return `${sage.name}尚未解鎖`;
            case 'no-candidate':
                return `${target.name} 目前沒有可占卜的因子（未消耗${TOKEN_NAME}）`;
            default:
                return '占卜失敗，請重新選擇';
        }
    }
}
