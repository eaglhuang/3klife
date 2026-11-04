public recordAutoResolveBattle(input: Readonly<OfflineBattleInput>, journal: Readonly<OfflineBattleJournal>, relatedGeneralUids: readonly string[]): OfflineBattleSnapshot {
        const id = nextOfflineBattleSnapshotId(this._offlineBattleSnapshots);
        const appended = appendOfflineBattleSnapshot(this._offlineBattleSnapshots, id, input);
        this._offlineBattleSnapshots = appended.snapshots;
        this.recordJournal({
            entryId: `OFFLINE_BATTLE-${this._journal.entries.length + 1}`,
            timestamp: seasonJournalTimestamp(this._clock.state),
            category: 'BATTLE',
            relatedGeneralUids: Array.from(relatedGeneralUids),
            priority: journal.priority,
            summary: journal.summary,
            ...(journal.summaryKey !== undefined ? { summaryKey: journal.summaryKey } : {}),
            ...(journal.summaryArgs !== undefined ? { summaryArgs: [...journal.summaryArgs] } : {}),
            snapshotRef: appended.snapshot.snapshotId,
        });
        return { ...appended.snapshot };
    }