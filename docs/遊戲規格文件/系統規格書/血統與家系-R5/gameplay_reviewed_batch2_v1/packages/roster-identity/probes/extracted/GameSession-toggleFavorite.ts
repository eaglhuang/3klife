public async toggleFavorite(generalId: string): Promise<{ ok: boolean; favorite: boolean }> {
        if (!this._roster.getAll().some((g) => g.id === generalId)) {
            return { ok: false, favorite: this._favoriteGeneralIds.includes(generalId) };
        }
        const favorite = !this._favoriteGeneralIds.includes(generalId);
        this._favoriteGeneralIds = favorite
            ? normalizeFavoriteGeneralIds([...this._favoriteGeneralIds, generalId])
            : this._favoriteGeneralIds.filter((id) => id !== generalId);
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { ok: true, favorite };
    }
