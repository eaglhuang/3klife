export function checkFormationBloodlines(bloodlineIds: readonly (string | undefined)[]): SortieLoadoutCheck {
    const present = bloodlineIds.filter((b): b is string => typeof b === 'string' && b.length > 0);
    const unique = new Set(present).size === present.length;
    return { ok: unique, issues: unique ? [] : ['SAME_BLOODLINE'] };
}
