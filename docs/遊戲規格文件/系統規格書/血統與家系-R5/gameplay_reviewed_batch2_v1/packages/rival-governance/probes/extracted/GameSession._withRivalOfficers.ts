private _withRivalOfficers(world: RivalWorld): RivalWorld {
        return this._rivalOfficers ? attachRivalOfficers(world, this._rivalOfficers.rosters, this._rivalOfficers.context) : world;
    }