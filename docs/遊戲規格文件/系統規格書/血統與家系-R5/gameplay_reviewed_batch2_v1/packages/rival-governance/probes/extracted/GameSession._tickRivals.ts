private _tickRivals(): AutoBattleResult[] {
        // 玩家金幣不在 GameSession 內（錢包由呼叫端持有），RAI-05 暫傳 0（暫定）
        const holdersOf = (w: typeof this._rivals) => [...w.nations.map((n) => ({ id: n.id, territories: n.territories })), { id: 'player', territories: this._territories.length }];
        const beforeHolders = holdersOf(this._rivals);
        const tick = advanceRivalSeason(this._rivals, this._random, { troops: this._military.cityTroops, food: this._military.food, gold: 0, territories: this._territories.length }, this._rivalOfficers?.context);
        let world = tick.world;
        const battles: AutoBattleResult[] = [];
        for (const event of tick.events) {
            const squad = this.rivalBattleSquad();
            const battle = autoResolveBattle(world, event.nationId, squad, this._random);
            world = battle.world;
            battles.push(battle);
            this._recordOfflineBattle(squad, event.nationId, battle, battles.length);
        }
        if (tick.events.length > 0) {
            const payload: RivalSeasonEventsPayload = {
                events: tick.events.map((event, i) => ({ nationId: event.nationId, kind: event.kind, playerWon: battles[i].win })),
            };
            this._emit(GAME_SESSION_EVENTS.RivalSeasonEvents, payload);
        }
        // RAI-12：年度天下大亂評估；玩家領土數取守城領地清單長度
        this._rivals = applyEraShift(world, this._clock.state.totalSeasonsElapsed, this._territories.length);
        const risen = newAiHegemonOf(beforeHolders, holdersOf(this._rivals), 'player');
        if (risen) this._emit(GAME_SESSION_EVENTS.RivalHegemonRose, { nationId: risen });
        return battles;
    }