function isUngraduatedOffspring(general: BattleRosterGeneral): boolean {
    if (general.graduationRating) return false;
    return Boolean(general.fate) || general.status === CHILD_STATUS_MYSTERY || (general.hiddenFlags ?? []).includes('mystery-phase');
}
