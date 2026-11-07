// @spec-source → 數值常數庫與公式註冊中心規格書.md (doc_spec_0338) §1.3 缺鍵安全回退、§3 FormulaRegistry 執行期、§4 凍結與熱更新（PROG-2-2023）
/**
 * FormulaRuntime — 公式註冊中心的執行期實作。資料結構與檔案解析見 NumericalConfig.ts。
 * 以實例（createFormulaRuntime）取代規格範例的 static 類別，方便測試與多份設定並存。
 */

export type FormulaConfig = Readonly<Record<string, unknown>>;

export interface IFormula<TInput = Record<string, unknown>, TOutput = number> {
    readonly id: string;
    readonly description: string;
    calculate(input: TInput, config: FormulaConfig): TOutput;
}

export interface FormulaRuntime {
    register<TInput, TOutput>(formula: IFormula<TInput, TOutput>): void;
    has(formulaId: string): boolean;
    /** §4.3：重新載入即替換係數，之後的 execute 立即生效。設定會被深度凍結。 */
    loadConfig(config: Record<string, unknown>): void;
    config(): FormulaConfig;
    /** 未註冊的公式丟錯（§3.1 契約）。 */
    execute<TInput, TOutput>(formulaId: string, input: TInput): TOutput;
    /** §1.3：依點號路徑讀常數；缺值或型別不同時回傳 baseline 並記警告。 */
    readNumber(path: string, baseline: number): number;
}

export function deepFreeze<T>(value: T): T {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const key of Object.keys(value as object)) deepFreeze((value as Record<string, unknown>)[key]);
    }
    return value;
}

function cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

export function createFormulaRuntime(warn: (message: string) => void = () => undefined): FormulaRuntime {
    const formulas = new Map<string, IFormula<any, any>>();
    let cache: FormulaConfig = deepFreeze({});
    return {
        register(formula) {
            formulas.set(formula.id, formula);
        },
        has(formulaId) {
            return formulas.has(formulaId);
        },
        loadConfig(config) {
            cache = deepFreeze(cloneJson(config));
        },
        config() {
            return cache;
        },
        execute<TInput, TOutput>(formulaId: string, input: TInput): TOutput {
            const formula = formulas.get(formulaId);
            if (!formula) throw new Error(`[FormulaRegistry] Formula ${formulaId} not registered!`);
            return formula.calculate(input, cache) as TOutput;
        },
        readNumber(path, baseline) {
            let node: unknown = cache;
            for (const key of path.split('.')) {
                node = node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined;
            }
            if (typeof node === 'number' && Number.isFinite(node)) return node;
            warn(`[NumericalConfig] 缺少 ${path}，改用基準值 ${baseline}`);
            return baseline;
        },
    };
}
