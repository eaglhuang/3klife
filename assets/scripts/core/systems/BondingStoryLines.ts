// @spec-source → 血統傳承 G2 §G 門風連攜觸發；G3 §G 外戚表親純化預警、外婚復壯提示、世交合譜大禮（PROG-2-1828）
/**
 * BondingStoryLines — 結緣流程的劇本演出句（純邏輯，不依賴 cc）
 *
 * 規格的句子把「少主、表妹、少夫人、外祖、3×3」寫死，實際配對不一定是這種關係，
 * 這裡改放雙親姓名與共祖姓名；合巹句的天賦名取因子名，因子目前沒有對應五維的資料。
 *
 * Unity 對照：像一個把結算結果轉成對白的靜態 Formatter。
 */

export function kinWarningLine(fatherName: string, motherName: string, ancestorName: string): string {
    return `譜牒官展開二十八席朱砂譜系：「稟主公，${fatherName}與${motherName}皆承自【${ancestorName}】之血脈（外戚共祖）。若結秦晉之好，可藉【血脈純化】將該先祖天賦上限推至五星極境！然多樣性折損，且血脈轉為【微躁】，請主公明斷！」`;
}

/** 規格的累世通家以 K 滿額為前提，未滿額只留合譜本身 */
export function compactCeremonyLine(factorName: string, synergyFull: boolean): string {
    const lineage = synergyFull ? '我兩族累世通家，近八代聯姻子弟皆為國器！' : '';
    return `兩家宗老於祠堂合對金匱譜牒：「${lineage}今行【世交合譜】，必使兩家共有之【${factorName}】代代相傳，永不墜失！」`;
}

export function synergyWeddingLine(factorName: string): string {
    return `成婚合巹時瑞氣盈門：「夫妻俱懷【${factorName}】，雙家門風連攜！此胎子嗣之【${factorName}】天賦上限突破至四星！」`;
}

/** carriers：帶微躁的親代姓名；partner：另一方姓名，雙親都帶時為 null */
export function outcrossMedicLine(carriers: string, partner: string | null): string {
    const clean = partner ? `${partner}乃異姓清流` : '兩家乃異姓清流';
    return `醫官把脈賀喜：「主公寬心！雖${carriers}帶有先代血脈微躁之象，然${clean}（無三代共祖），此胎得【異姓復壯】之利，胎象康健無虞（病弱風險僅 1%），且子嗣血脈將滌清一階！」`;
}
