private async _mountRivalDiplomacy(): Promise<void> {
        const gacha = this._localGachaService;
        const rival = new RivalDiplomacyController({
            world: () => services().session.rivals,
            setWorld: (world) => services().session.setRivals(world),
            squad: () => services().session.rivalBattleSquad(),
            gold: () => gacha.getCurrencyAmount('gold'),
            spendGold: (amount) => gacha.spendCurrency('gold', amount),
            grantGold: (amount) => { gacha.grantCurrency('gold', amount); },
            random: Math.random,
            leaderName: (id) => this._generals.find((g) => g.id === id)?.name,
            recordBattle: (squad, nationId, battle) => { services().session.recordRivalCampaign(squad, nationId, battle); },
        });
        this._rival = rival;
        const act = (run: () => Promise<void>): void => {
            void run().catch((error) => {
                UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 外交指令失敗', error);
            }).finally(() => { this._refreshRivalDiplomacy(); });
        };
        const nationButtons = Array.from({ length: RIVAL_NATION_SLOTS }, (_, i) => ({
            buttonId: `btnNation${i}`,
            handler: () => { rival.select(i); this._refreshRivalDiplomacy(); },
        }));
        this._rivalHost = await this._mountPreviewScreenHost('RivalDiplomacyHost', 'rival-diplomacy-screen', [
            { buttonId: 'btnClose', handler: () => { if (this._rivalHost) this._rivalHost.node.active = false; } },
            ...nationButtons,
            { buttonId: 'btnGift', handler: () => { act(() => rival.gift()); } },
            { buttonId: 'btnAlliance', handler: () => { act(() => rival.alliance()); } },
            { buttonId: 'btnWar', handler: () => { act(() => rival.war()); } },
            { buttonId: 'btnCampaign', handler: () => { act(() => rival.campaign()); } },
        ]);
        this._rivalHost.node.active = false;
        this._sessionEventUnsubscribers.push(
            services().event.on(GAME_SESSION_EVENTS.SeasonAdvanced, (payload: SeasonAdvancedPayload) => {
                // 換季開場提示（遊戲時間系統 §G，PROG-2-1718）：先於來犯、離隊提示
                if (payload?.advance) {
                    const message = seasonStartText((key, ...args) => services().i18n.t(key, ...args), payload.advance.current);
                    services().event.emit('SHOW_TOAST', { message, duration: 3 });
                }
                for (const battle of payload?.rivalBattles ?? []) {
                    if (battle.goldReward > 0) gacha.grantCurrency('gold', battle.goldReward);
                    services().event.emit('SHOW_TOAST', { message: `敵軍來犯！${battle.lines[2]}`, duration: 3 });
                }
                this._refreshRivalDiplomacy();
                // 傭兵試用期滿離隊告別（傭兵規格 UI_MERC_FAREWELL，PROG-2-1154）
                for (const uid of payload?.mercenaryDepartures ?? []) {
                    const merc = services().session.mercenaries.mercenaries.find((m) => m.uid === uid);
                    const name = this._generals.find((g) => g.id === merc?.generalId)?.name ?? '傭兵';
                    services().event.emit('SHOW_TOAST', { message: `${name} 已離隊。六日情緣，且作追憶。`, duration: 3 });
                }
                this._refreshMercenaryPanel();
            }),
        );
    }