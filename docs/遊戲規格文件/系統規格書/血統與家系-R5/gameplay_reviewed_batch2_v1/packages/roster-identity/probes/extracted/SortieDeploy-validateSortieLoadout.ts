export function validateSortieLoadout(loadout: SortieLoadout, members?: readonly SortieMember[]): SortieLoadoutCheck {
    const issues: SortieLoadoutIssue[] = [];
    if (!loadout.commanderUid) issues.push('MISSING_COMMANDER');
    const ids = loadoutIds(loadout);
    if (new Set(ids).size !== ids.length) issues.push('ROLE_LOCK');
    if (members) {
        const byId = new Map(members.map((m) => [m.id, m]));
        if (ids.some((id) => !byId.has(id))) issues.push('UNKNOWN_GENERAL');
        const bloodlines = Array.from(new Set(ids)).map((id) => byId.get(id)?.bloodlineId).filter((b): b is string => Boolean(b));
        if (new Set(bloodlines).size !== bloodlines.length) issues.push('SAME_BLOODLINE');
    }
    return { ok: issues.length === 0, issues };
}
