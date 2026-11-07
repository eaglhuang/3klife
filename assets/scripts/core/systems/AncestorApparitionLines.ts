// @spec-source → 名士預言系統 §K 祖輩顯靈與認同感設計；結緣系統 shard-d 祖輩顯靈彩蛋（ORAC-08，PROG-2-1967）
/**
 * AncestorApparitionLines — 名士批語旁的祖輩顯靈補充台詞（純邏輯，不依賴 cc）。
 *
 * - 結緣預覽時，父母血統矩陣中若有祖先帶「顯靈標籤」（兵種適性、人格傾向、戰法種子），附加一句顯靈台詞。
 * - 只挑一位：世代最遠者優先，同世代取先出現的；每位祖先只用第一個標籤。
 * - 台詞只是敘事包裝：本檔只回傳字串，不讀也不改名士的準確率或預測結果。
 *
 * 暫定：哪些祖先帶什麼標籤由呼叫端提供（規格未列清單）；文案為初稿，待企劃潤稿。
 * 出生時的顯靈句另見 BloodlineBirthLines.ancestorGhostLine，兩者不重複觸發由呼叫端決定。
 * Unity 對照：像把 Tag 對到台詞表的 Formatter，命中才多印一行。
 */

export type ApparitionTag =
    | { kind: 'TROOP'; value: string }
    | { kind: 'PERSONALITY'; value: string }
    | { kind: 'SKILL_SEED'; value: string };

export interface ApparitionAncestor {
    name: string;
    /** 距子嗣幾代：祖父母 = 2、曾祖 = 3…… */
    generation: number;
    tags: readonly ApparitionTag[];
}

export interface ApparitionLine {
    ancestorName: string;
    tag: ApparitionTag;
    text: string;
}

const TEMPLATE: Readonly<Record<ApparitionTag['kind'], (name: string, value: string) => string>> = {
    TROOP: (name, value) => `${name}虛影低語：「此子筋骨，當善${value}。」`,
    PERSONALITY: (name, value) => `${name}虛影一笑：「這份${value}，像極了我。」`,
    SKILL_SEED: (name, value) => `${name}虛影現身：「${value}之法，或可傳於此子。」`,
};

/** 套用模板；名字或內容空白時回傳 null。 */
export function apparitionText(name: string, tag: ApparitionTag): string | null {
    const n = name.trim();
    const v = tag.value.trim();
    if (!n || !v) return null;
    return TEMPLATE[tag.kind](n, v);
}

/** 從父母雙方祖先挑一位顯靈；沒有命中標籤回傳 null。 */
export function pickAncestorApparition(ancestors: readonly ApparitionAncestor[]): ApparitionLine | null {
    let best: ApparitionLine | null = null;
    let bestGeneration = -Infinity;
    for (const ancestor of ancestors) {
        if (!(ancestor.generation > bestGeneration)) continue;
        for (const tag of ancestor.tags) {
            const text = apparitionText(ancestor.name, tag);
            if (!text) continue;
            best = { ancestorName: ancestor.name.trim(), tag, text };
            bestGeneration = ancestor.generation;
            break;
        }
    }
    return best;
}

/** 名士批語後附加顯靈句；沒有命中時原樣回傳。 */
export function appendApparitionLine(remarks: readonly string[], apparition: ApparitionLine | null): string[] {
    return apparition ? [...remarks, apparition.text] : remarks.slice();
}
