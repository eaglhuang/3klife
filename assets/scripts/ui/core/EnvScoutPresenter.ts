// @spec-source → 戰場適性系統.md §J 名詞定義「環境偵察」；PROG-2-0403（WBS APT-12 畫面接線）
/**
 * EnvScoutPresenter — 環境偵察面板的文字（純邏輯，不依賴 cc）
 *
 * 把 BattlefieldRecon（PROG-2-0404）轉成兩行文字：地形格數、天氣預報。
 * 只產生字串，不碰節點；節點由 LobbyMissionDetailDialogComposite 綁定。
 *
 * Unity 對照：Presenter 把 Model 轉成 Label 的字串，View 只負責 SetText。
 */
import { TerrainType } from '../../shared/CommonEnums';
import { WEATHER_LABEL } from '../../shared/BattleEntryParams';
import type { BattlefieldRecon } from '../../core/systems/BattlefieldRecon';

export const TERRAIN_LABEL: Readonly<Record<TerrainType, string>> = {
    [TerrainType.Plain]: '平原',
    [TerrainType.River]: '水域',
    [TerrainType.Mountain]: '山地',
    [TerrainType.Fortress]: '關隘',
    [TerrainType.Desert]: '沙漠',
    [TerrainType.Forest]: '林地',
};

export interface EnvScoutLines {
    terrainLine: string;
    weatherLine: string;
}

/** 地形行：只列出有格數的地形，例如「地形 5×8：平原 30、山地 6」 */
function buildTerrainLine(recon: BattlefieldRecon): string {
    const { lanes, depth, counts } = recon.terrain;
    const parts = (Object.values(TerrainType) as TerrainType[])
        .filter((type) => counts[type] > 0)
        .map((type) => `${TERRAIN_LABEL[type]} ${counts[type]}`);
    return `地形 ${lanes}×${depth}：${parts.join('、')}`;
}

/** 天氣行：逐回合列出預報，並標出變化的回合；整段不變時明說 */
function buildWeatherLine(recon: BattlefieldRecon): string {
    const { forecast, changes } = recon.weather;
    if (forecast.length === 0) return '天氣預報：無';
    const days = forecast.map((item) => WEATHER_LABEL[item.weather] ?? item.weather).join('、');
    const change = changes.length > 0
        ? `；變化於第${changes.map((item) => item.turn).join('、')}回合`
        : '；整段不變';
    return `天氣預報（${forecast.length} 回合）：${days}${change}`;
}

export function buildEnvScoutLines(recon: BattlefieldRecon): EnvScoutLines {
    return {
        terrainLine: buildTerrainLine(recon),
        weatherLine: buildWeatherLine(recon),
    };
}
