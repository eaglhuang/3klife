public async addGenerals(generals: GeneralConfig[], options: AddGeneralsOptions = {}): Promise<AddGeneralsResult> {
        const result = this.enrollGenerals(generals, options);
        if (result.added.length > 0 || result.rebirths.length > 0) {
            if (this._autoSave && this._save) {
                await this.save();
            }
        }
        return result;
    }
