function loadoutIds(loadout: SortieLoadout): string[] {
    return [loadout.commanderUid, loadout.strategistUid, loadout.deputyUid].filter((id): id is string => typeof id === 'string' && id.length > 0);
}
