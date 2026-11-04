public checkDeployable(generalId: string): DeployCheck {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general) {
            return { eligible: false, reasons: [] };
        }
        return checkDeployable(general, { nurturingIds: this._nurturingIds() });
    }
