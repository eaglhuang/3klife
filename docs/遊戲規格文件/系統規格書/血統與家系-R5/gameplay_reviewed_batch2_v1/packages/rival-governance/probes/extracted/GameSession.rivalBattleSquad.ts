public rivalBattleSquad(): BattleGeneral[] {
        return this._roster.getAll()
            .filter((g) => g.status !== 'dead')
            .map((g) => ({ name: g.name, str: g.str ?? 0, int: g.int ?? 0, lea: g.lea ?? 0 }))
            .sort((a, b) => generalPower(b) - generalPower(a))
            .slice(0, 3);
    }