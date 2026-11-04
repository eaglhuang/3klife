public async advanceSeason(): Promise<SeasonAdvancedPayload> {
        const advance = this._clock.advanceSeason();
        this._tickTravel();
        // 動態關係每季衰退（KIN-10）：親密度歸 0 只是加成歸零，關係保留
        this.dynamicRelations.decaySeason();
        const beforeRoster = this._roster.getAll();
        // 主動扣壽命致死的武將在 beforeRoster 已是陣亡；虎符結算要用扣壽命之前的名冊才認得出「這次才死」
        const deathBaseline = this._preLifespanRoster ?? beforeRoster;
        this._preLifespanRoster = null;
        const aging = ageGeneralsOneSeason(beforeRoster, this._random);
        const agingEvents = [...this._pendingLifespanEvents, ...aging.events];
        this._pendingLifespanEvents = [];
        const unveil = unveilDueGenerals(aging.roster as UnveilingGeneral[], {
            season: advance.current.totalSeasonsElapsed,
            dictionary: this._factorDictionary,
        });
        const recovered = recoverVitalityOneSeason(unveil.roster, advance.current.totalSeasonsElapsed - 1);
        let roster: GeneralConfig[] = advanceBreedingSeason(holdPregnancyVigor(unveil.roster, recovered)).generals;
        let lifecycle: LifecycleSettlement | undefined;
        // 季結會把死者從名冊移除，所以陣亡虎符要用移除前的名冊結算，否則真實 lifecycle 下一個都抓不到
        const rosterBeforeLifecycle = roster;
        if (this._lifecycle) {
            const settled = await this._lifecycle.settleSeason(roster, advance, agingEvents);
            roster = settled.roster;
            lifecycle = settled.settlement;
        }
        this._roster.replaceAll(roster);
        this._clearLeadIfGone();
        this._releaseGearOfInactiveGenerals();
        this._settleOpenHallAssigns(formatSeasonLabel(advance.previous));
        this._settleDeaths(deathBaseline, rosterBeforeLifecycle, advance.current.totalSeasonsElapsed);
        // 陣亡或退休的武將不再佔著內政任務格
        this._governance = this._governance.filter((a) => roster.some((general) => general.id === a.generalUid && general.status !== 'dead'));
        if (this._autoGovernance) this._fillAutoGovernance();
        if (this._magistrateUid && !roster.some((general) => general.id === this._magistrateUid && general.status !== 'dead')) this._magistrateUid = null;
        this._recordSoulFragmentsFor(beforeRoster, agingEvents);
        const beforeTokens = this._inventory;
        const tokens = grantSeasonalOracleTokens(this._inventory);
        this._inventory = tokens.inventory;
        this._recordGain(beforeTokens, 'EVENT');
        this._tallyFoodDiscountArmed = this._military.food < TALLY_SHORTAGE_FOOD_THRESHOLD;
        // 三國日報素材：缺糧（與虎符缺糧同一門檻，暫定）
        // 缺口 = 門檻 − 目前糧草（RET-05 復仇取回的基數，暫定）
        if (this._tallyFoodDiscountArmed) this.recordPlayerLog('RESOURCE_LOW', '糧草', undefined, TALLY_SHORTAGE_FOOD_THRESHOLD - this._military.food);
        this._military = regenMilitaryOneSeason(this._military, 1, seasonModifiersOf(advance.previous.currentSeason).foodMultiplier);
        // 監獄產出：情報累積；資源暫定折成糧草（不超過糧草上限）
        const prisonYield = prisonYieldOneSeason(this._prison.prisoners);
        this._prison = { ...this._prison, intel: this._prison.intel + prisonYield.intel };
        this._military = { ...this._military, food: Math.min(this._military.foodCap, this._military.food + prisonYield.resource) };
        // 無期徒刑傳家寶物掉落（EQP-09，機率暫定）
        const treasures = rollPrisonTreasures(this._prison.prisoners, this._random);
        if (treasures > 0) {
            const beforeTreasure = this._inventory;
            this._inventory = addItem(this._inventory, ITEM_TREASURE, treasures);
            this._recordGain(beforeTreasure, 'DROP');
        }
        // 放走俘虜的未來來投（5%）：依 uid 查配置以初始狀態入冊；查不到配置就略過並記警告
        const futureReturns = rollFutureReturns(this._prison, advance.current.totalSeasonsElapsed, this._random);
        this._prison = futureReturns.state;
        const returning: GeneralConfig[] = [];
        for (const entry of futureReturns.returned) {
            const template = this._generalTemplates.find((general) => general.id === entry.targetUid);
            if (template) returning.push({ ...template });
            else console.warn(`[prison] 來投武將 ${entry.targetUid} 查無配置，略過`);
        }
        if (returning.length > 0) this.enrollGenerals(returning);

        this._yearAgingEvents.push(...agingEvents);
        let yearReport: YearReport | undefined;
        if (advance.yearEnded) {
            yearReport = buildYearReport(advance.previous.currentYear, this._yearAgingEvents);
            this._yearAgingEvents = [];
        }
        this.applyPendingTerritoryUpgrade();
        const quarterlyReports = buildQuarterlyBattleReportRows(this._roster.getAll());
        this.recordSeasonJournal(advance.previous, quarterlyReports);
        const rivalBattles = this._tickRivals();
        // MVP 定案：一季＝傭兵一日（PROG-2-1154，使用者裁定）
        const departedUids = this._tickMercenaryDay().events.filter((e) => e.type === 'departed').map((e) => e.uid);
        const payload: SeasonAdvancedPayload = { advance, agingEvents, unveilings: unveil.events, lifecycle, oracleTokensGranted: tokens.granted, yearReport, quarterlyReports, ...(rivalBattles.length > 0 ? { rivalBattles } : {}), ...(departedUids.length > 0 ? { mercenaryDepartures: departedUids } : {}) };
        if (this._autoSave && this._save) {
            await this.save();
        }

        this._emit(GAME_SESSION_EVENTS.SeasonAdvanced, payload);
        const eraReset = buildEraResetEvent(advance.current.totalSeasonsElapsed);
        if (eraReset) {
            // 天下大亂：官職階位、經驗與解鎖歷史保留（OFC-09，F-3）
            this._officerState = applyEraShiftToOfficerState(this._officerState);
            this._recordSandtableUnlockReached();
            this._emit(GAME_SESSION_EVENTS.EraReset, eraReset);
        }
        for (const event of unveil.events) {
            this._emit(GAME_SESSION_EVENTS.GeneralUnveiled, event);
        }
        for (const event of aging.events) {
            this._emit(agingEventChannel(event), event);
        }
        for (const card of lifecycle?.spiritCards ?? []) {
            this._emit(GAME_SESSION_EVENTS.SpiritCardCreated, card);
        }
        if (yearReport) {
            this._emit(GAME_SESSION_EVENTS.YearEnded, yearReport);
        }
        return payload;
    }