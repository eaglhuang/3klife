function vitalityOf(general: BattleRosterGeneral): number {
    return general.vitality ?? general.maxVitality ?? baseVitalityMaxOf(general.gender);
}
