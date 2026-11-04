public async startNewGameWithStarters(seed: number, generals: readonly GeneralConfig[], options: StarterRosterOptions = {}): Promise<void> {
        const starters = buildStarterRoster(generals, options);
        const coreId = options.coreGeneralId ?? STARTER_CORE_GENERAL_ID;
        const core = starters.find(general => general.id === coreId)!;
        if (!checkDeployable(core, { nurturingIds: this._nurturingIds() }).eligible) throw new Error('[GameSession] 初始核心主將不可出戰');
        this.startNewGame(seed);
        this._roster.replaceAll(normalizeRosterRoles(starters));
        if (!await this.setLeadGeneral(coreId)) throw new Error('[GameSession] 無法設定初始核心主將');
        this._emit(GAME_SESSION_EVENTS.RosterChanged, this.roster);
    }
