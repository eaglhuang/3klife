public get governanceAssignments(): GovernanceAssignment[] {
        return this._governance.map(a => ({ ...a }));
    }