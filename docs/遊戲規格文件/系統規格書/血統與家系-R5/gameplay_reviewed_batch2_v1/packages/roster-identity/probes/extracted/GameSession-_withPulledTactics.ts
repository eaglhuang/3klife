private _withPulledTactics(general: GeneralConfig): GeneralConfig {
        const pulled = randomizePulledTactics(general, this._random);
        return { ...general, tacticSlots: pulled.tacticSlots, tacticExp: pulled.tacticExp };
    }
