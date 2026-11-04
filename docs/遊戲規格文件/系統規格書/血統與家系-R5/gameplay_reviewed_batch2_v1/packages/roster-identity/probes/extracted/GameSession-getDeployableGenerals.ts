public getDeployableGenerals(): GeneralConfig[] {
        return listDeployable(this._roster.getAll(), { nurturingIds: this._nurturingIds() });
    }
