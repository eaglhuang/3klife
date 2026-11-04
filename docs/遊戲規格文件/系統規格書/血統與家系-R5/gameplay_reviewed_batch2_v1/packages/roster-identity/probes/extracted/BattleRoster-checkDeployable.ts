export function checkDeployable(general: GeneralConfig, options: DeployOptions = {}): DeployCheck {
    const g = general as BattleRosterGeneral;
    const reasons: DeployBlockReason[] = [];
    if (g.status === GENERAL_STATUS_DEAD) reasons.push('dead');
    if (g.isMentorCard) reasons.push('retired-mentor');
    if (isUngraduatedOffspring(g)) reasons.push('not-graduated');
    if (vitalityOf(g) < BATTLE_MIN_VITALITY) reasons.push('low-vitality');
    if (options.nurturingIds?.includes(g.id)) reasons.push('in-nurture');
    return { eligible: reasons.length === 0, reasons };
}
