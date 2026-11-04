// @spec-source → 兵種（虎符）系統.md (doc_spec_0012) §G 劇本相關；PROG-2-1768
/**
 * TallyScripts — 虎符產出、升星與傳奇部隊部署時顯示的文字（純邏輯，不依賴 cc）。
 *
 * Unity 對照：像一份 Localization Table 的格式化函式，畫面只拿結果字串。
 */
import { resolveTallyTemplateId } from '../config/TigerTallySpecTactics';

const TALLY_NAME_PREFIX = '虎符：';

const LEGEND_DEPLOY_LINES: Readonly<Record<string, string>> = {
    'tiger-tally-bai-ma': '白馬如雪、銀槍似霜——白馬義從，天下無敵！',
    'tiger-tally-bai-ma-yi-cong': '白馬如雪、銀槍似霜——白馬義從，天下無敵！',
    'tiger-tally-xian-zhen': '陷陣之志，有死無生——高順的鐵軍重現人間！',
};

/** 規格句已帶「虎符：」前綴，名稱本身有前綴時不重複 */
export function tallyProducedLine(generalName: string, tallyName: string): string {
    const bare = tallyName.startsWith(TALLY_NAME_PREFIX) ? tallyName.slice(TALLY_NAME_PREFIX.length) : tallyName;
    return `${generalName} 殞落沙場後留下了【${TALLY_NAME_PREFIX}${bare}】，精銳永存！`;
}

export function tallyStarUpLine(tallyName: string, star: number, troopName: string): string {
    return `【${tallyName}】升至 ${star}★！${troopName} 戰力大幅提升！`;
}

/** 傳奇部隊部署句；其他虎符回 null */
export function tallyLegendDeployLine(templateId: string | null | undefined): string | null {
    if (!templateId) return null;
    return LEGEND_DEPLOY_LINES[templateId] ?? LEGEND_DEPLOY_LINES[resolveTallyTemplateId(templateId)] ?? null;
}
