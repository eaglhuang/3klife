// PROG-2-9955：武將武器（武器模板鍵）解析。純函式、不依賴引擎，供 AttackVfxPlayer 與單元測試共用。
// 優先序：generals.json 的 weapon 欄位 → attack-vfx.json 的 generalProfiles → 角色推算（weaponByRole）→ defaultWeapon。
// 只接受武器模板表內已存在的鍵；不認得的值視為缺欄位，逐級退回，不會讓特效整段播不出來。

export interface WeaponFallback {
  weaponByRole: Readonly<Record<string, string>>;
  defaultWeapon: string;
}

export interface GeneralWeaponInput {
  /** generals.json 的 weapon 欄位 */
  weapon?: string | null;
  /** attack-vfx.json generalProfiles[id].weapon */
  profileWeapon?: string | null;
  /** 兵種適性推算出的武器模板（弓／劍；見 weaponByAptitude） */
  aptitudeWeapon?: string | null;
  /** 武將 role（Combat／Support…） */
  role?: string | null;
}

/** 武器模板鍵清單（去掉 _comment 等說明欄）。 */
export function weaponTemplateKeys(generalTemplates: Readonly<Record<string, unknown>>): string[] {
  return Object.keys(generalTemplates).filter(k => !k.startsWith('_'));
}

/** 依優先序解出武器模板鍵；結果必定落在 templateKeys 內（若 defaultWeapon 也不認得，原樣回傳由呼叫端判斷）。 */
export function resolveGeneralWeapon(input: GeneralWeaponInput, fallback: WeaponFallback, templateKeys: readonly string[]): string {
  const known = (w: string | null | undefined): w is string => !!w && templateKeys.includes(w);
  if (known(input.weapon)) return input.weapon;
  if (known(input.profileWeapon)) return input.profileWeapon;
  if (known(input.aptitudeWeapon)) return input.aptitudeWeapon;
  const byRole = input.role ? fallback.weaponByRole[input.role] : undefined;
  if (known(byRole)) return byRole;
  return fallback.defaultWeapon;
}

/** 從 generals.json 陣列建立 id → weapon 表；缺欄位或值不在模板表內者略過。 */
export function buildGeneralWeaponTable(
  list: ReadonlyArray<{ id?: string; weapon?: string | null }>,
  templateKeys: readonly string[],
): Map<string, string> {
  const table = new Map<string, string>();
  for (const g of list) {
    if (g.id && g.weapon && templateKeys.includes(g.weapon)) table.set(g.id, g.weapon);
  }
  return table;
}

/** 推算規則（attack-vfx.json fallback.aptitudeRule）：支援型不看適性；弓兵適性最高且不低於 bowMinGrade → 弓 */
export interface AptitudeWeaponRule {
  skipRoles: readonly string[];
  bowMinGrade: string;
}

/** 適性等級數值（越大越好）；未知等級視為 0 */
const APT_GRADE: Readonly<Record<string, number>> = { 'S+': 10, S: 9, 'S-': 8, 'A+': 7, A: 6, 'A-': 5, 'B+': 4, B: 3, C: 2, D: 1 };

function gradeOf(apt: Readonly<Record<string, string>>, troop: string): number {
  return APT_GRADE[apt[troop] ?? ''] ?? 0;
}

/**
 * 適性推算（generals.json 無 weapon 欄位的武將用）：弓兵適性為最高（並列也算）且不低於 bowMinGrade → 'bow'；
 * 步兵適性為最高（並列也算）→ 'sword'（步兵符號即劍，見兵種符號裁決）；其餘回 null。
 * 呼叫端先判斷 skipRoles（支援型不套用）。
 */
export function weaponByAptitude(rule: AptitudeWeaponRule | undefined, apt: Readonly<Record<string, string>> | undefined): string | null {
  if (!rule || !apt) return null;
  const keys = Object.keys(apt);
  if (keys.length === 0) return null;
  const best = Math.max(...keys.map(k => gradeOf(apt, k)));
  if (best < (APT_GRADE.C ?? 0)) return null; // 最高適性低於 C（僅 D）不推算，避免把弱將誤判為劍／弓
  if (gradeOf(apt, 'ARCHER') === best && gradeOf(apt, 'ARCHER') >= (APT_GRADE[rule.bowMinGrade] ?? 0)) return 'bow';
  if (gradeOf(apt, 'INFANTRY') === best) return 'sword';
  return null;
}
