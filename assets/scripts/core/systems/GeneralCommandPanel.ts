// @spec-source → 武將人物介面規格書 §4（將頁 Overview：名聲與官職、統領軍勢）；WBS TSK-06；PROG-2-1213
/**
 * GeneralCommandPanel — 將頁「名聲 / 官職 / 統領軍勢」區塊的列資料（純邏輯，不依賴 cc）
 *
 * 把 General_Fame、官職名稱、Command_Capacity、可用城市兵源整理成列，
 * 並用 computeSortiePoolMax 推出預估出征軍勢（= min(帶兵上限, 城市兵源, 關卡上限)）。
 * 資料缺項傳 null，對應列顯示 "—"，畫面不需要自己判斷。
 * 字串與「官職名稱」來源為暫定，待 P0 UI_ 字串表與官職命名定案。
 *
 * Unity 對照：像 Inspector 的一組唯讀欄位，資料沒綁到就顯示 "—"，綁到才寫入文字。
 */
import { computeSortiePoolMax, DEFAULT_STAGE_SORTIE_CAP } from './SortieDeploy';

export interface GeneralCommandPanelInput {
    /** General_Fame；尚無資料時為 null */
    fame: number | null;
    /** 官職名稱；命名未定時為 null */
    officialTitle: string | null;
    /** Command_Capacity（帶兵上限）；尚無資料時為 null */
    commandCapacity: number | null;
    /** 可用城市兵源；尚無資料時為 null */
    cityTroops: number | null;
    /** 關卡出征上限；省略時用預設值 */
    stageSortieCap?: number;
}

export interface GeneralCommandRow {
    key: 'fame' | 'official' | 'commandCapacity' | 'cityTroops' | 'sortiePool';
    label: string;
    value: string;
}

const EMPTY_VALUE = '—';

function numberOrEmpty(value: number | null): string {
    return value === null ? EMPTY_VALUE : `${value}`;
}

/** 將頁統領區塊的五列：名聲、官職、帶兵上限、可用城市兵源、預估出征軍勢 */
export function buildGeneralCommandRows(input: GeneralCommandPanelInput): GeneralCommandRow[] {
    const { commandCapacity, cityTroops } = input;
    const sortiePool = commandCapacity === null || cityTroops === null
        ? null
        : computeSortiePoolMax(commandCapacity, cityTroops, input.stageSortieCap ?? DEFAULT_STAGE_SORTIE_CAP);
    return [
        { key: 'fame', label: '名聲', value: numberOrEmpty(input.fame) },
        { key: 'official', label: '官職', value: input.officialTitle ?? EMPTY_VALUE },
        { key: 'commandCapacity', label: '帶兵上限', value: numberOrEmpty(commandCapacity) },
        { key: 'cityTroops', label: '可用城市兵源', value: numberOrEmpty(cityTroops) },
        { key: 'sortiePool', label: '預估出征軍勢', value: numberOrEmpty(sortiePool) },
    ];
}
