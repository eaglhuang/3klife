// @spec-source → 名士預言系統.md (doc_spec_0006) §E #1 #2 #7、§G 劇本、§H 字串；因子解鎖系統.md (doc_spec_0009) §A 名士占卜途徑
/**
 * SageOracleController — 名士占卜畫面的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 列出名冊中還有鎖定因子的在世武將，上一位 / 下一位循環挑選（從結緣畫面開啟時預選父方）
 *   - 切換名士，顯示偏好面向與準確率
 *   - 顯示求籤令數量；沒有求籤令或沒有可占卜的因子時不能占卜
 *   - 占卜 → GameSession.divineFactor() → 把名士批語與覺醒結果寫進提示
 *
 * 所有 texts / actives / enabled 的 key 都等於 sage-oracle-main.json 的節點 id，
 * tests/SageOracle.test.ts 會逐一比對。
 *
 * 暫定（規格沒寫，PROG-2-0053）：名士批語模板依 §G 語氣改寫成「覺醒已存在武將」的版本。
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 CycleTarget / CycleSage / Divine，
 * 畫面層拿 GetView() 的 ViewModel 一次刷新 Text 與 Button.interactable。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { listAwakeningCandidates } from '../../core/systems/FactorAwakening';
import type { FactorColor } from '../../core/systems/FactorInheritance';
import { GENERAL_STATUS_DEAD } from '../../core/systems/GeneralAging';
import { ITEM_DISPLAY_NAMES, ITEM_ORACLE_TOKEN } from '../../core/systems/PlayerInventory';
import { SAGES, SageDefinition, SageDivinationResult, SageId } from '../../core/systems/SageDivination';

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
        itemCount(itemId: string): number;
        divineFactor(generalId: string, sageId: string): Promise<SageDivinationResult>;
    };
}

export class SageOracleController {
    private _targetId: string | null = null;
    private _sageIndex = 0;
    private _notice = '';

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

    /** 開畫面：可指定預選對象（例如結緣畫面目前的父方），不在清單內就退回第一位 */
    open(preferredTargetId?: string | null): void {
        if (preferredTargetId) this._targetId = preferredTargetId;
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

        const texts: Record<string, string> = {
            oracleTitle: '名士占卜',
            oracleNotice: this._notice,
            oracleEmptyHint: '名冊中沒有尚有鎖定因子的武將，暫時無需占卜。',
            sageName: sage.name,
            sageInfo: `偏好：${sage.focus} · 準確率 ${Math.round(sage.accuracy * 100)}%`,
            sagePager: `${this._sageIndex + 1} / ${SAGE_ORDER.length}`,
            tokenLabel: `${TOKEN_NAME} ×${tokens}`,
            targetPager: target ? `${list.findIndex((g) => g.id === target.id) + 1} / ${list.length}` : '0 / 0',
            targetName: target ? `占卜對象：${target.name}` : '占卜對象：無人可選',
            targetInfo: '',
            costLabel: `消耗${TOKEN_NAME} ×1`,
        };
        const actives: Record<string, boolean> = {
            oraclePanel: target !== null,
            oracleEmptyHint: target === null,
        };
        const enabled: Record<string, boolean> = {
            btnCloseOracle: true,
            btnPrevTarget: list.length > 1,
            btnNextTarget: list.length > 1,
            btnPrevSage: true,
            btnNextSage: true,
            btnDivine: false,
        };
        if (!target) {
            return { targetId: null, sageId: sage.id, texts, actives, enabled };
        }

        const locked = (target.genes ?? []).filter((gene) => gene.isLocked !== false).length;
        const ready = listAwakeningCandidates(target, ['sage'], this._deps.session.discoveryLevel).length;
        texts.targetInfo = `鎖定因子 ${locked} 個 · 目前可占卜 ${ready} 個（覺醒等級 ${this._deps.session.discoveryLevel}）`;
        if (tokens < 1) {
            texts.costLabel = `${TOKEN_NAME}不足，推進季度可免費領取`;
        } else if (ready === 0) {
            texts.costLabel = '覺醒等級不足，暫無可占卜的因子';
        }
        enabled.btnDivine = tokens >= 1 && ready > 0;
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
            case 'no-candidate':
                return `${target.name} 目前沒有可占卜的因子（未消耗${TOKEN_NAME}）`;
            default:
                return '占卜失敗，請重新選擇';
        }
    }
}
