public recordRivalCampaign(squad: readonly unknown[], nationId: string, battle: AutoBattleResult): OfflineBattleSnapshot {
        const clock = this._clock.state;
        const rule = battle.win ? CAMPAIGN_BATTLE_JOURNAL.win : CAMPAIGN_BATTLE_JOURNAL.lose;
        return this.recordAutoResolveBattle({
            battleType: 'AUTO_RESOLVE',
            seed: `${clock.currentYear}-${clock.currentSeason}-C${nationId}`,
            lineup: squad,
            tileState: { nationId },
            tactics: [],
            win: battle.win,
            playerStrength: battle.playerStrength,
            enemyStrength: battle.enemyStrength,
        }, { priority: rule.priority, summary: rule.summary.replace('{Nation}', nationDef(nationId)?.name ?? nationId) }, []);
    }