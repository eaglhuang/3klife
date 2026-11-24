// 武將武器推算（純函式、不依賴引擎，供單元測試；畫面特效與音效共用這一份）。
// generals.json 沒有 weapon 欄位，這裡只用現有欄位推算：角色、兵種適性。等總PM定表後改讀欄位即可。

/** 推算所需的武將欄位（GeneralUnit 皆有） */
export interface GeneralWeaponInfo {
  role?: string;
  troopAptitude?: Readonly<Record<string, string>>;
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
 * 適性推算：弓兵適性為最高（並列也算）且不低於 bowMinGrade → 'bow'；
 * 步兵適性為最高（並列也算）→ 'sword'（步兵符號即劍，見兵種符號裁決）；其餘回 null。
 */
export function weaponByAptitude(rule: AptitudeWeaponRule | undefined, apt: Readonly<Record<string, string>> | undefined): string | null {
  if (!rule || !apt) return null;
  const keys = Object.keys(apt);
  if (keys.length === 0) return null;
  const best = Math.max(...keys.map(k => gradeOf(apt, k)));
  if (best <= 0) return null;
  if (gradeOf(apt, 'ARCHER') === best && gradeOf(apt, 'ARCHER') >= (APT_GRADE[rule.bowMinGrade] ?? 0)) return 'bow';
  if (gradeOf(apt, 'INFANTRY') === best) return 'sword';
  return null;
}

/**
 * 武將武器（模板名：blade／spear／sword／bow／cast）。順序：
 * 1. 支援型（skipRoles）→ 直接走角色預設（法術）；
 * 2. 兵種適性推算（弓／劍）；
 * 3. 角色預設（weaponByRole，例如戰將為刀）；仍無則 defaultWeapon。
 * 個別武將的 profile（如關羽刀、呂布槍）由呼叫端先行處理，不在這裡。
 */
export function weaponOfGeneral(
  fb: { weaponByRole: Readonly<Record<string, string>>; defaultWeapon: string; aptitudeRule?: AptitudeWeaponRule },
  g: GeneralWeaponInfo,
): string {
  const skip = !!g.role && (fb.aptitudeRule?.skipRoles ?? []).includes(g.role);
  if (!skip) {
    const byApt = weaponByAptitude(fb.aptitudeRule, g.troopAptitude);
    if (byApt) return byApt;
  }
  return (g.role && fb.weaponByRole[g.role]) || fb.defaultWeapon;
}
