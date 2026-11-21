// @spec-source → 獎勵系統 Base 框架規格書 (doc_spec_1186) §12.4 機率公開；學府支援卡與教官池規格書 (doc_spec_1264) §23 TC-SUP-14；SUP-10（PROG-2-9243）
/**
 * GachaRateTable — 轉蛋「機率說明」的完整機率表（純函式，不依賴 cc）。
 *
 * 數字全部來自 reward.pools 的視圖（與抽樣同一份資料），這裡只把視圖排成幾列文字；
 * 畫面不寫任何機率常數。卡名由呼叫端傳入的 nameOf 解析（武將名冊、支援卡表各自提供）。
 */
import type { RewardPoolEntryView, RewardPoolView } from '../../shared/api/ApiCommands';

/** 稀有度由高到低；不在表內的等階排最後 */
const TIER_ORDER: readonly string[] = ['SSR', 'SR', 'R'];

export interface GachaRateRow { title: string; detail: string }

/** 機率以百分比顯示：整數、一位、兩位、三位小數都不補多餘的 0（例：3%、1.5%、0.25%、0.756%） */
export function formatRatePercent(rate: number): string {
    const pct = Math.round(rate * 100000) / 1000;
    return `${pct}%`;
}

function entryText(e: RewardPoolEntryView, nameOf: (nameKey: string | null, entryId: string) => string): string {
    return `${nameOf(e.nameKey, e.entryId)} ${formatRatePercent(e.rate)}`;
}

/** 每列最多放幾張卡（列高固定，太長會被裁；超過就續到下一列） */
export const RATE_ROW_CARDS = 4;

/** 完整機率表：每個稀有度的 UP 與一般各自成列（一列最多 RATE_ROW_CARDS 張，逐張機率），再加保底與版本列 */
export function buildRateTableRows(view: RewardPoolView, nameOf: (nameKey: string | null, entryId: string) => string): GachaRateRow[] {
    const rows: GachaRateRow[] = [];
    const rank = (t: string): number => { const i = TIER_ORDER.indexOf(t); return i < 0 ? TIER_ORDER.length : i; };
    const ordered = [...view.tiers].sort((a, b) => rank(a.tier) - rank(b.tier));
    for (const tier of ordered) {
        const head = `${tier.tier} 共 ${formatRatePercent(tier.baseRate)}`;
        if (!view.public) { rows.push({ title: head, detail: '本池未公開逐張機率' }); continue; }
        const groups: Array<{ label: string; list: RewardPoolEntryView[] }> = [
            { label: 'UP', list: tier.entries.filter((e) => e.isUp) },
            { label: tier.entries.some((e) => e.isUp) ? '一般' : '全部', list: tier.entries.filter((e) => !e.isUp) },
        ];
        for (const g of groups) {
            for (let i = 0; i < g.list.length; i += RATE_ROW_CARDS) {
                const chunk = g.list.slice(i, i + RATE_ROW_CARDS);
                rows.push({
                    title: `${head}　${g.label}（${g.list.length} 張）${i > 0 ? ' 續' : ''}`,
                    detail: chunk.map((e) => entryText(e, nameOf)).join('　'),
                });
            }
        }
    }
    for (const p of view.pities) {
        const soft = p.softStartAt !== null ? `第 ${p.softStartAt} 抽起機率漸升，` : '';
        rows.push({ title: `${p.tier === 'SSR' ? 'SSR' : `${p.tier} 以上`} 保底`, detail: `${soft}第 ${p.hardAt} 抽必出（目前 ${p.counter} 抽，下一抽 ${formatRatePercent(p.nextPullRate)}）` });
    }
    if (view.disclosureVersion) rows.push({ title: '公開版本', detail: `${view.disclosureVersion}（機率與抽獎共用同一份資料）` });
    return rows;
}
