public get officerPermissions(): Readonly<OfficerPermissions> {
        return officerPermissionsOf(this._officerState);
    }