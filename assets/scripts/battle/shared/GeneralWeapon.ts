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
