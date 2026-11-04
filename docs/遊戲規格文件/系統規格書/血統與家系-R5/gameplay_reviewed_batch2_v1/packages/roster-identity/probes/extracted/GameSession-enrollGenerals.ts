public enrollGenerals(generals: GeneralConfig[], options: AddGeneralsOptions = {}): AddGeneralsResult {
        const owned = new Set(this._roster.getAll().map((general) => general.id));
        const added: GeneralConfig[] = [];
        const duplicates: GeneralConfig[] = [];
        const rebirths: Array<RebirthPullResult & { id: string }> = [];
        let bondPointsGained = 0;
        for (const general of normalizeRosterRoles(generals)) {
            if (!general || typeof general.id !== 'string') {
                continue;
            }
            if (owned.has(general.id)) {
                duplicates.push(general);
                continue;
            }
            owned.add(general.id);
            added.push(options.rebirthOnDuplicate ? this._withPulledTactics({ ...general }) : { ...general });
        }

        if (options.rebirthOnDuplicate && duplicates.length > 0) {
            // 同一批可能抽到同名多次，逐筆依序累加轉數
            // 同一批先抽到的新武將還在 added 裡、尚未進名冊，批內第二張也要算重複（與跨批一致）
            const roster = this._roster.getAll();
            const byId = new Map([...roster, ...added].map((general) => [general.id, general]));
            for (const duplicate of duplicates) {
                const target = byId.get(duplicate.id);
                if (!target) continue;
                const pull = applyDuplicatePull(target.rebirthCount);
                byId.set(duplicate.id, {
                    ...this._withPulledTactics(target),
                    rebirthCount: pull.rebirthCount,
                    ultimateSlots: withUltimateUnlockState(target.ultimateSlots ?? [], pull.rebirthCount),
                });
                rebirths.push({ id: duplicate.id, ...pull });
                if (pull.overflow) {
                    bondPointsGained += overflowBondPoints(overflowRarityOf(target));
                }
            }
            if (rebirths.length > 0) {
                this._roster.replaceAll(roster.map((general) => byId.get(general.id) ?? general));
                for (let i = 0; i < added.length; i++) added[i] = byId.get(added[i].id) ?? added[i];
            }
            this._bondPoints += bondPointsGained;
        }

        if (options.fromGacha) {
            for (const general of added) {
                if (this._tallyLoyalty[general.id]) continue;
                this._tallyLoyalty = { ...this._tallyLoyalty, [general.id]: createTallyLoyaltyState(TALLY_LOYALTY_INITIAL, true) };
            }
        }
        if (added.length > 0) {
            this._roster.replaceAll([...this._roster.getAll(), ...added]);
        }
        if (added.length > 0) {
            this._emit(GAME_SESSION_EVENTS.RosterChanged, added);
        }
        // 三國日報素材（暫定判定）：轉蛋抽到新武將算成功，全是重複算失敗
        if (options.rebirthOnDuplicate && (added.length > 0 || duplicates.length > 0)) {
            this.recordPlayerLog(added.length > 0 ? 'GACHA_SUCCESS' : 'GACHA_FAIL');
        }
        return { added, duplicates, rebirths, bondPointsGained };
    }
