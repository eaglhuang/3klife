public async setRivals(world: RivalWorld): Promise<void> {
        this._rivals = normalizeRivalWorld(world);
        if (this._save) {
            await this.save();
        }
    }