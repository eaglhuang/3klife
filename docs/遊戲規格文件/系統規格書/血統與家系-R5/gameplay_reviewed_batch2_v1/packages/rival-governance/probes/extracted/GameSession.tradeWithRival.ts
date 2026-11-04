public async tradeWithRival(nationId: string, routeId: string, amount: number, wallet: { gold: number; spend: (n: number) => void; grant: (n: number) => void }): Promise<TradeResult> {
        const stock = { food: this._military.food, gold: wallet.gold, troops: this._military.cityTroops, fame: this._fame };
        const result = tradeWithRivalPure(this._rivals, nationId, routeId, amount, stock, this._clock.state.totalSeasonsElapsed);
        if (!result.ok || !result.give || !result.get) return result;
        const caps = { food: this._military.foodCap, gold: Infinity, troops: this._military.cityTroopsCap, fame: BASE_RESOURCE_CAPS.fame };
        const after = { ...stock, [result.give.resource]: stock[result.give.resource] - result.give.amount };
        after[result.get.resource] += result.get.amount;
        if (after[result.get.resource] > caps[result.get.resource]) {
            return { ok: false, world: this._rivals, message: `${TRADE_RESOURCE_NAMES[result.get.resource]}倉庫已滿，無法收下` };
        }
        this._military = { ...this._military, food: after.food, cityTroops: after.troops };
        this._fame = after.fame;
        if (result.give.resource === 'gold') wallet.spend(result.give.amount);
        if (result.get.resource === 'gold') wallet.grant(result.get.amount);
        this._rivals = result.world;
        if (this._autoSave && this._save) await this.save();
        return result;
    }