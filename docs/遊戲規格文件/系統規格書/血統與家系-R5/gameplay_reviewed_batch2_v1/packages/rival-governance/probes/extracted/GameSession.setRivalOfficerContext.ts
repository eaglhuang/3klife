public setRivalOfficerContext(rosters: Readonly<Record<string, RivalNationRoster>>, context: RivalPowerContext): void {
        this._rivalOfficers = { rosters, context };
        this._rivals = this._withRivalOfficers(this._rivals);
    }